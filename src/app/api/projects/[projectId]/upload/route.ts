import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未找到文件" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "仅支持 PDF 文件" },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // For now, store the file reference in the database
    // In production, you'd upload to S3/object storage
    const client = getSupabaseClient();

    const { data, error } = await client
      .from("papers")
      .insert({
        project_id: projectId,
        title: file.name.replace(/\.pdf$/i, ""),
        url: `upload://${file.name}`,
        abstract: `上传的PDF文件: ${file.name} (${(buffer.length / 1024).toFixed(1)} KB)。请使用AI解析功能提取内容。`,
        source: "用户上传",
        triage_level: "quick_browse",
        relevance_score: 70,
        quality_score: 70,
        confidence: "medium",
      })
      .select()
      .single();

    if (error) {
      console.error("Upload DB error:", error);
      return NextResponse.json(
        { error: "保存文献记录失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      paper: {
        id: data.id,
        title: data.title,
        abstract: data.abstract,
        source: data.source,
        sourceType: "upload",
        triageLevel: data.triage_level,
        summary: null,
        year: null,
        authors: null,
        journal: null,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "上传处理失败" }, { status: 500 });
  }
}