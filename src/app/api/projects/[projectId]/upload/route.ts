import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { S3Storage, FetchClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

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
          { error: `文件过大 (最大 50MB): ${file.name}` },
          { status: 400 }
        );
      }
    }

    // Initialize S3 storage
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: "",
      secretKey: "",
      bucketName: process.env.COZE_BUCKET_NAME,
      region: "cn-beijing",
    });

    // Initialize FetchClient for PDF parsing
    const forwardHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const fetchConfig = new Config();
    const fetchClient = new FetchClient(fetchConfig, forwardHeaders);

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

        // Sanitize filename for S3 key
        const safeName = sanitizeFileName(file.name);
        const s3Key = `papers/${projectId}/${Date.now()}_${safeName}`;

        // Upload to S3 object storage
        const actualKey = await storage.uploadFile({
          fileContent: buffer,
          fileName: s3Key,
          contentType: "application/pdf",
        });

        // Try to parse PDF content via FetchClient
        let parsedAbstract = "";
        try {
          // Generate a presigned URL for the FetchClient to read
          const presignedUrl = await storage.generatePresignedUrl({
            key: actualKey,
            expireTime: 3600, // 1 hour for parsing
          });

          const fetchResponse = await fetchClient.fetch(presignedUrl);

          if (fetchResponse.status_code === 0) {
            // Extract text content from the parsed PDF
            const textContent = fetchResponse.content
              .filter((item) => item.type === "text")
              .map((item) => item.text)
              .join("\n");

            parsedAbstract = extractAbstract(textContent, 800);
          }
        } catch {
          // PDF parsing is best-effort; fall back to file info
          console.warn(`Failed to parse PDF content for: ${file.name}`);
        }

        const abstract =
          parsedAbstract ||
          `上传的PDF文件: ${file.name} (${(buffer.length / 1024).toFixed(1)} KB)。点击下载查看完整内容。`;

        // Insert paper record into database
        const { data, error } = await supabase
          .from("papers")
          .insert({
            project_id: projectId,
            title: file.name.replace(/\.pdf$/i, ""),
            url: actualKey, // Store the S3 object key
            abstract,
            source: "用户上传",
            triage_level: "quick_browse",
            relevance_score: 70,
            quality_score: 70,
            confidence: "medium",
            processing_status: parsedAbstract ? "processed" : "pending",
          })
          .select()
          .single();

        if (error) {
          console.error("Upload DB error:", error);
          errors.push({ fileName: file.name, error: "保存文献记录失败" });
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
    return NextResponse.json({ error: "上传处理失败" }, { status: 500 });
  }
}