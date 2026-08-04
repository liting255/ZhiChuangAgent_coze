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
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map DB fields to frontend expected format
  const papers = (data || []).map((p: Record<string, unknown>) => ({
    id: p.id,
    title: p.title,
    abstract: p.abstract || "",
    source: p.source || "未知来源",
    sourceType: p.url && String(p.url).startsWith("upload://") ? "upload" : "search",
    triageLevel: p.triage_level || "quick_browse",
    triageReason: p.triage_reason || null,
    relevanceScore: p.relevance_score || 50,
    qualityScore: p.quality_score || 50,
    confidence: p.confidence || "medium",
    tags: p.tags || [],
    summary: p.ai_summary || null,
    year: p.publish_year || null,
    authors: p.authors || null,
    journal: null,
    url: p.url || null,
    doi: p.doi || null,
    isConfirmed: p.is_confirmed || false,
    createdAt: p.created_at,
  }));

  return NextResponse.json({ papers });
}