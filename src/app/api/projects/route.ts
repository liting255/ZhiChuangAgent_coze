import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET() {
  const client = getSupabaseClient();
  const { data: projects, error } = await client
    .from("projects")
    .select("id, name, description, research_question, status, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`查询失败: ${error.message}`);

  // Get paper counts for each project
  const projectsWithCounts = await Promise.all(
    (projects || []).map(async (p: { id: string }) => {
      const { count } = await client
        .from("papers")
        .select("*", { count: "exact", head: true })
        .eq("project_id", p.id);
      return { ...p, paper_count: count || 0 };
    })
  );

  return NextResponse.json({ projects: projectsWithCounts });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, research_question, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "项目名称不能为空" }, { status: 400 });
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("projects")
    .insert({
      name: name.trim(),
      research_question: research_question?.trim() || null,
      description: description?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(`创建失败: ${error.message}`);

  return NextResponse.json({ project: data });
}
