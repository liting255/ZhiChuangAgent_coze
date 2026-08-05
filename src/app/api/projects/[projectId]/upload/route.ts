import { NextRequest, NextResponse } from "next/server";
import { S3Storage, FetchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Increase body size limit to 200MB for this route
export const maxDuration = 60;

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  console.log(`[Upload] Starting upload for project: ${projectId}`);

  // Initialize S3 storage (best-effort)
  let storage: S3Storage | null = null;
  let fetchClient: FetchClient | null = null;
  try {
    storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL!,
      accessKey: process.env.COZE_BUCKET_ACCESS_KEY || "",
      secretKey: process.env.COZE_BUCKET_SECRET_KEY || "",
      bucketName: process.env.COZE_BUCKET_NAME!,
      region: "cn-beijing",
    });
    const forwardHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const fetchConfig = new Config();
    fetchClient = new FetchClient(fetchConfig, forwardHeaders);
    console.log("[Upload] S3Storage and FetchClient initialized successfully");
  } catch (initErr) {
    console.error("[Upload] S3/FetchClient init failed:", initErr);
  }

  const supabase = getSupabaseClient();
  const results: any[] = [];
  const errors: { fileName: string; error: string }[] = [];

  try {
    console.log("[Upload] Parsing form data...");
    const formData = await request.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    console.log(`[Upload] Received ${files.length} file(s)`);

    if (files.length === 0) {
      return NextResponse.json({ error: "未找到文件" }, { status: 400 });
    }

    for (const file of files) {
      const filename = file.name || "unnamed.pdf";
      console.log(`[Upload] Processing: ${filename}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${file.type}`);

      // Validate file type
      if (!filename.toLowerCase().endsWith(".pdf")) {
        errors.push({ fileName: filename, error: "仅支持 PDF 文件" });
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push({ fileName: filename, error: `文件过大 (最大 200MB)` });
        continue;
      }

      if (file.size === 0) {
        errors.push({ fileName: filename, error: "文件为空" });
        continue;
      }

      try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileSizeKB = (fileBuffer.length / 1024).toFixed(1);
        console.log(`[Upload] File read into buffer: ${fileSizeKB} KB`);

        // Upload to S3 (best-effort)
        let s3Key: string | null = null;
        let parsedAbstract = "";
        const timestamp = Date.now();

        if (storage) {
          try {
            const sanitizedFileName = sanitizeFileName(filename);
            const key = `papers/${projectId}/${timestamp}_${sanitizedFileName}_${Math.random().toString(36).slice(2, 10)}.pdf`;
            console.log(`[Upload] Uploading to S3 with key: ${key}`);

            const uploadedKey = await withTimeout(
              storage.uploadFile({
                fileContent: fileBuffer,
                fileName: sanitizedFileName,
                contentType: file.type || "application/pdf",
              }),
              60_000, // 60s for S3 upload
              "S3 upload"
            );
            s3Key = typeof uploadedKey === "string" ? uploadedKey : key;
            console.log(`[Upload] S3 upload successful, key: ${s3Key}`);

            // Try to parse PDF content via FetchClient (best-effort, with timeout)
            if (fetchClient && s3Key) {
              try {
                console.log(`[Upload] Generating presigned URL for PDF parsing...`);
                const presignedUrl = await withTimeout(
                  storage.generatePresignedUrl({ key: s3Key, expireTime: 3600 }),
                  10_000,
                  "Presigned URL"
                );
                console.log(`[Upload] FetchClient parsing PDF content...`);
                const fetchResponse = await withTimeout(
                  fetchClient.fetch(presignedUrl),
                  30_000, // 30s for PDF parsing
                  "FetchClient PDF parsing"
                );
                const contentItems = (fetchResponse as any)?.content;
                if (contentItems && Array.isArray(contentItems) && contentItems.length > 0) {
                  const fullText = contentItems.map((item: any) => item.text || "").join("\n");
                  if (fullText && fullText.length > 50) {
                    parsedAbstract = fullText.slice(0, 2000);
                    console.log(`[Upload] PDF parsed, abstract length: ${parsedAbstract.length}`);
                  }
                }
              } catch (parseErr) {
                console.warn(`[Upload] PDF parsing skipped for ${filename}:`, (parseErr as Error).message);
              }
            }
          } catch (s3Err) {
            console.error(`[Upload] S3 upload failed for ${filename}:`, (s3Err as Error).message);
            // Continue without S3 — save to DB only
          }
        }

        const abstract = parsedAbstract ||
          `上传的PDF文件: ${filename} (${fileSizeKB} KB)${s3Key ? "" : "（文件存储失败，仅保存记录）"}。`;

        // Save to database
        console.log(`[Upload] Saving to database...`);
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
          console.error("[Upload] DB error:", dbError);
          errors.push({ fileName: filename, error: `保存文献记录失败: ${dbError.message}` });
        } else if (paperData) {
          console.log(`[Upload] Successfully saved paper: ${paperData.id}`);
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
            journal: null,
          });
        }
      } catch (err) {
        console.error(`[Upload] Process error for ${filename}:`, err);
        errors.push({ fileName: filename, error: (err as Error).message });
      }
    }

    console.log(`[Upload] Complete. Success: ${results.length}, Errors: ${errors.length}`);

    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          error: "所有文件上传失败",
          details: errors.map((e) => `${e.fileName}: ${e.error}`).join("; "),
          errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      papers: results,
      errors: errors.length > 0 ? errors : undefined,
      summary: `成功上传 ${results.length} 篇文献${errors.length > 0 ? `，${errors.length} 篇失败` : ""}`,
    });
  } catch (err) {
    console.error("[Upload] Fatal error:", err);
    return NextResponse.json(
      {
        error: "上传处理失败",
        details: (err as Error).message,
      },
      { status: 500 }
    );
  }
}
