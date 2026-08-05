import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { S3Storage, FetchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import Busboy from "busboy";

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

// Sanitize filename — keep only safe chars, limit length
function sanitizeFileName(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g, "_")
    .slice(0, 100);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// Convert Web ReadableStream to Node.js Readable
function webStreamToNodeReadable(webStream: ReadableStream<Uint8Array>): Readable {
  const reader = webStream.getReader();
  return new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      } catch (err) {
        this.destroy(err as Error);
      }
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  // Initialize S3 storage (best-effort)
  let storage: S3Storage | null = null;
  let fetchClient: FetchClient | null = null;
  try {
    storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL!,
      accessKey: process.env.COZE_BUCKET_ACCESS_KEY!,
      secretKey: process.env.COZE_BUCKET_SECRET_KEY!,
      bucketName: process.env.COZE_BUCKET_NAME!,
      region: "cn-beijing",
    });
    const forwardHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const fetchConfig = new Config();
    fetchClient = new FetchClient(fetchConfig, forwardHeaders);
  } catch (initErr) {
    console.error("S3/FetchClient init failed (will store without S3):", initErr);
  }

  const supabase = getSupabaseClient();
  const results: any[] = [];
  const errors: { fileName: string; error: string }[] = [];

  // Parse multipart form data using busboy
  return new Promise<Response>((resolve) => {
    const contentType = request.headers.get("content-type") || "";
    let fileCount = 0;
    let processedCount = 0;
    let hasError = false;

    const nodeStream = request.body
      ? webStreamToNodeReadable(request.body)
      : new Readable({ read() { this.push(null); } });

    const bb = Busboy({
      headers: Object.fromEntries(request.headers.entries()),
      limits: { fileSize: MAX_FILE_SIZE, files: 20 },
    });

    bb.on("file", async (fieldname: string, fileStream: Readable, info: { filename: string; encoding: string; mimeType: string }) => {
      const { filename, mimeType } = info;
      fileCount++;

      // Validate file type
      if (!filename.toLowerCase().endsWith(".pdf")) {
        errors.push({ fileName: filename, error: "仅支持 PDF 文件" });
        fileStream.resume();
        processedCount++;
        return;
      }

      // Read file chunks
      const chunks: Buffer[] = [];
      fileStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        // Check file size early
        const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
        if (totalSize > MAX_FILE_SIZE) {
          fileStream.destroy(new Error(`文件过大 (最大 200MB): ${filename}`));
        }
      });

      fileStream.on("limit", () => {
        errors.push({ fileName: filename, error: `文件过大 (最大 200MB)` });
        processedCount++;
      });

      fileStream.on("error", (err: Error) => {
        errors.push({ fileName: filename, error: err.message });
        processedCount++;
      });

      fileStream.on("end", async () => {
        try {
          const fileBuffer = Buffer.concat(chunks);
          const fileSizeKB = (fileBuffer.length / 1024).toFixed(1);

          // Upload to S3 (best-effort)
          let s3Key: string | null = null;
          let parsedAbstract = "";
          const timestamp = Date.now();

          if (storage) {
            try {
              const sanitizedFileName = sanitizeFileName(filename);
              const key = `papers/${projectId}/${timestamp}_${sanitizedFileName}_${Math.random().toString(36).slice(2, 10)}.pdf`;
              const uploadedKey = await withTimeout(
                storage.uploadFile({
                  fileContent: fileBuffer,
                  fileName: sanitizedFileName,
                  contentType: mimeType || "application/pdf",
                }),
                30_000,
                "S3 upload"
              );
              s3Key = typeof uploadedKey === "string" ? uploadedKey : key;

              // Try to parse PDF content via FetchClient (best-effort, with timeout)
              if (fetchClient && s3Key) {
                try {
                  const presignedUrl = await withTimeout(
                    storage.generatePresignedUrl({ key: s3Key, expireTime: 3600 }),
                    10_000,
                    "Presigned URL"
                  );
                  const fetchResponse = await withTimeout(
                    fetchClient.fetch(presignedUrl),
                    15_000,
                    "FetchClient PDF parsing"
                  );
                  const contentItems = (fetchResponse as any)?.content;
                  if (contentItems && Array.isArray(contentItems) && contentItems.length > 0) {
                    const fullText = contentItems.map((item: any) => item.text || "").join("\n");
                    if (fullText) {
                      parsedAbstract = fullText.slice(0, 2000);
                    }
                  }
                } catch (parseErr) {
                  console.warn(`PDF parsing skipped for ${filename}:`, (parseErr as Error).message);
                }
              }
            } catch (s3Err) {
              console.error(`S3 upload failed for ${filename}:`, (s3Err as Error).message);
              // Continue without S3 — save to DB only
            }
          }

          const abstract = parsedAbstract ||
            `上传的PDF文件: ${filename} (${fileSizeKB} KB)${s3Key ? "" : "（文件存储失败，仅保存记录）"}。`;

          // Save to database
          const insertData = {
            project_id: projectId,
            title: filename.replace(/\.pdf$/i, ""),
            url: s3Key || `upload://${filename}`,
            abstract,
            source: "用户上传",
            triage_level: "quick_browse",
            relevance_score: 70,
            quality_score: 70,
            confidence: "medium",
            processing_status: parsedAbstract ? "processed" : (s3Key ? "pending" : "failed"),
          };

          const { data: paperData, error: dbError } = await supabase
            .from("papers")
            .insert(insertData)
            .select()
            .single();

          if (dbError) {
            console.error("Upload DB error:", dbError);
            errors.push({ fileName: filename, error: `保存文献记录失败: ${dbError.message}` });
          } else if (paperData) {
            results.push({
              id: paperData.id,
              title: paperData.title,
              abstract: paperData.abstract,
              source: paperData.source,
              sourceType: "upload",
              triageLevel: paperData.triage_level,
              summary: paperData.summary,
              year: paperData.year,
              authors: paperData.authors,
              journal: paperData.journal,
            });
          }
        } catch (err) {
          console.error(`Upload process error for ${filename}:`, err);
          errors.push({ fileName: filename, error: (err as Error).message });
        }

        processedCount++;
        if (processedCount === fileCount) {
          // All files processed
          if (results.length === 0 && errors.length > 0) {
            resolve(
              NextResponse.json(
                {
                  error: "所有文件上传失败",
                  details: errors.map((e) => `${e.fileName}: ${e.error}`).join("; "),
                  errors,
                },
                { status: 500 }
              )
            );
          } else {
            resolve(
              NextResponse.json({
                papers: results,
                errors: errors.length > 0 ? errors : undefined,
                summary: `成功上传 ${results.length} 篇文献${errors.length > 0 ? `，${errors.length} 篇失败` : ""}`,
              })
            );
          }
        }
      });
    });

    bb.on("error", (err: Error) => {
      console.error("Busboy error:", err);
      if (!hasError) {
        hasError = true;
        resolve(
          NextResponse.json(
            { error: "上传处理失败", details: err.message },
            { status: 500 }
          )
        );
      }
    });

    bb.on("finish", () => {
      if (fileCount === 0) {
        resolve(
          NextResponse.json({ error: "未找到文件" }, { status: 400 })
        );
      }
    });

    // Pipe the request stream into busboy
    nodeStream.pipe(bb);
  });
}