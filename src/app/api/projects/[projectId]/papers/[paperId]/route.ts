import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; paperId: string }> }
) {
  const { paperId } = await params;
  const client = getSupabaseClient();

  const { data: paper, error } = await client
    .from("papers")
    .select("*")
    .eq("id", paperId)
    .single();

  if (error) throw new Error(`查询失败: ${error.message}`);

  const { data: terms } = await client
    .from("paper_terms")
    .select("*")
    .eq("paper_id", paperId);

  const { data: notes } = await client
    .from("paper_notes")
    .select("*")
    .eq("paper_id", paperId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ paper, terms: terms || [], notes: notes || [] });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; paperId: string }> }
) {
  const { paperId } = await params;
  const body = await request.json();
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("papers")
    .update(body)
    .eq("id", paperId)
    .select()
    .single();

  if (error) throw new Error(`更新失败: ${error.message}`);
  return NextResponse.json({ paper: data });
}
