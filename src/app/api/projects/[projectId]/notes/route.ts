import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("research_notes")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notes = (data || []).map((n: Record<string, unknown>) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    sourcePaperIds: n.source_paper_ids || [],
    sourcePaperTitles: n.source_paper_titles || [],
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }));

  return NextResponse.json({ notes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await request.json();
  const { title, content, sourcePaperIds } = body;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json(
      { error: "标题和内容不能为空" },
      { status: 400 }
    );
  }

  const client = getSupabaseClient();

  // Get source paper titles
  let sourcePaperTitles: string[] = [];
  if (sourcePaperIds && sourcePaperIds.length > 0) {
    const { data: papers } = await client
      .from("papers")
      .select("title")
      .in("id", sourcePaperIds);
    sourcePaperTitles = (papers || []).map((p: Record<string, unknown>) => p.title as string);
  }

  const { data, error } = await client
    .from("research_notes")
    .insert({
      project_id: projectId,
      title: title.trim(),
      content: content.trim(),
      source_paper_ids: sourcePaperIds || [],
      source_paper_titles: sourcePaperTitles,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const note = {
    id: data.id,
    title: data.title,
    content: data.content,
    sourcePaperIds: data.source_paper_ids || [],
    sourcePaperTitles: data.source_paper_titles || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return NextResponse.json({ note });
}