import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const triageLevel = searchParams.get("triage_level");

  const client = getSupabaseClient();
  let query = client
    .from("papers")
    .select("*")
    .eq("project_id", projectId)
    .order("relevance_score", { ascending: false });

  if (triageLevel) {
    query = query.eq("triage_level", triageLevel);
  }

  const { data, error } = await query;
  if (error) throw new Error(`查询失败: ${error.message}`);

  return NextResponse.json({ papers: data || [] });
}
