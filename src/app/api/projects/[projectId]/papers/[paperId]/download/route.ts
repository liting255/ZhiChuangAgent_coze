import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { S3Storage } from "coze-coding-dev-sdk";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; paperId: string }> }
) {
  const { paperId } = await params;

  try {
    const client = getSupabaseClient();

    const { data: paper, error } = await client
      .from("papers")
      .select("id, url, title")
      .eq("id", paperId)
      .single();

    if (error || !paper) {
      return NextResponse.json({ error: "文献不存在" }, { status: 404 });
    }

    const objectKey = paper.url;
    if (!objectKey || !objectKey.includes("/")) {
      return NextResponse.json(
        { error: "该文献没有关联的文件" },
        { status: 404 }
      );
    }

    // Initialize S3 storage
    const storage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: "",
      secretKey: "",
      bucketName: process.env.COZE_BUCKET_NAME,
      region: "cn-beijing",
    });

    // Generate a presigned URL (valid for 1 hour)
    const downloadUrl = await storage.generatePresignedUrl({
      key: objectKey,
      expireTime: 3600,
    });

    return NextResponse.json({
      downloadUrl,
      fileName: paper.title
        ? `${paper.title}.pdf`
        : "document.pdf",
    });
  } catch (err) {
    console.error("Download URL generation error:", err);
    return NextResponse.json(
      { error: "生成下载链接失败" },
      { status: 500 }
    );
  }
}