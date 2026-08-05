import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { S3Storage, FetchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// Maximum file size: 200MB
const MAX_FILE_SIZE = 200 * 1024 * 1024;

// PDF parsing timeout: 15 seconds
const PDF_PARSE_TIMEOUT = 15_000;

// Sanitize filename: keep only safe chars, replace spaces with underscores
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._\-/]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

// Extract first N characters of text as abstract
function extractAbstract(text: string, maxLength = 800): string {
  if (!text) return "";
  return text.length > maxLength
    ? text.slice(0, maxLength) + "..."
    : text;
}

// Wrap a promise with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const formData = await request.formData();

    // Support both single file ("file") and batch ("files")
    const singleFile = formData.get("file") as File | null;
    const batchFiles = formData.getAll("files") as File[];

    const files: File[] = [];
    if (singleFile) {
      files.push(singleFile);
    }
    if (batchFiles.length > 0) {
      files.push(...batchFiles);
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "未找到文件" }, { status: 400 });
    }

    // Validate all files are PDFs and within size limit
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: `仅支持 PDF 文件: ${file.name}` },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `文件过大 (最大 200MB): ${file.name}` },
          { status: 400 }
        );
      }
    }

    // Try to initialize S3 storage (may not be available in all environments)
    let storage: S3Storage | null = null;
    try {
      storage = new S3Storage({
        endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
        accessKey: "",
        secretKey: "",
        bucketName: process.env.COZE_BUCKET_NAME,
        region: "cn-beijing",
      });
    } catch {
      console.warn("S3 storage initialization failed, files will be stored as references only");
    }

    // Try to initialize FetchClient for PDF parsing
    let fetchClient: FetchClient | null = null;
    try {
      const forwardHeaders = HeaderUtils.extractForwardHeaders(request.headers);
      const fetchConfig = new Config();
      fetchClient = new FetchClient(fetchConfig, forwardHeaders);
    } catch {
      console.warn("FetchClient initialization failed, PDF parsing will be skipped");
    }

    const supabase = getSupabaseClient();
    const results: Array<{
      id: string;
      title: string;
      abstract: string;
      source: string;
      sourceType: "upload";
      triageLevel: string;
      summary: string | null;
      year: number | null;
      authors: string | null;
      journal: string | null;
    }> = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    // Process each file
    for (const file of files) {
      try {
        // Read file content
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileSizeKB = (buffer.length / 1024).toFixed(1);

        // Upload to S3 object storage (with fallback)
        let s3Key: string | null = null;
        if (storage) {
          try {
            const safeName = sanitizeFileName(file.name);
            const s3Path = `papers/${projectId}/${Date.now()}_${safeName}`;
            s3Key = await withTimeout(
              storage.uploadFile({
                fileContent: buffer,
                fileName: s3Path,
                contentType: "application/pdf",
              }),
              30_000,
              "S3 upload"
            );
          } catch (s3Err) {
            console.error(`S3 upload failed for ${file.name}:`, s3Err);
            s3Key = null; // Fall through to database-only storage
          }
        }

        // Try to parse PDF content via FetchClient (best-effort, with timeout)
        let parsedAbstract = "";
        if (fetchClient && s3Key) {
          try {
            const presignedUrl = await withTimeout(
              storage!.generatePresignedUrl({
                key: s3Key,
                expireTime: 3600,
              }),
              10_000,
              "Presigned URL generation"
            );

            const fetchResponse = await withTimeout(
              fetchClient.fetch(presignedUrl),
              PDF_PARSE_TIMEOUT,
              "PDF parsing"
            );

            if (fetchResponse.status_code === 0 && fetchResponse.content) {
              const textContent = fetchResponse.content
                .filter((item) => item.type === "text")
                .map((item) => item.text)
                .join("\n");

              parsedAbstract = extractAbstract(textContent, 800);
            }
          } catch (parseErr) {
            // PDF parsing is best-effort; fall back to file info
            console.warn(`PDF parsing skipped for ${file.name}:`, parseErr instanceof Error ? parseErr.message : parseErr);
          }
        }

        const abstract =
          parsedAbstract ||
          `上传的PDF文件: ${file.name} (${fileSizeKB} KB)${s3Key ? "" : "（文件存储失败，仅保存记录）"}。`;

        // Insert paper record into database
        // If S3 upload succeeded, store the S3 key; otherwise store a reference
        const insertData: Record<string, unknown> = {
          project_id: projectId,
          title: file.name.replace(/\.pdf$/i, ""),
          url: s3Key || `upload://${file.name}`,
          abstract,
          source: "用户上传",
          triage_level: "quick_browse",
          relevance_score: 70,
          quality_score: 70,
          confidence: "medium",
          processing_status: parsedAbstract ? "processed" : (s3Key ? "pending" : "failed"),
        };

        const { data, error } = await supabase
          .from("papers")
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error("Upload DB error:", error);
          errors.push({ fileName: file.name, error: `保存文献记录失败: ${error.message}` });
          continue;
        }

        results.push({
          id: data.id,
          title: data.title,
          abstract: data.abstract,
          source: data.source,
          sourceType: "upload",
          triageLevel: data.triage_level || "quick_browse",
          summary: data.ai_summary || null,
          year: data.publish_year || null,
          authors: data.authors || null,
          journal: null,
        });
      } catch (err) {
        console.error(`Upload error for ${file.name}:`, err);
        errors.push({
          fileName: file.name,
          error: err instanceof Error ? err.message : "上传处理失败",
        });
      }
    }

    // Return results
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
    console.error("Upload error:", err);
    return NextResponse.json(
      {
        error: "上传处理失败",
        details: err instanceof Error ? err.message : "未知错误",
      },
      { status: 500 }
    );
  }
}