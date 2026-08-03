import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await request.json();
  const { format } = body;

  const client = getSupabaseClient();

  // Get project info
  const { data: project } = await client
    .from("projects")
    .select("name, research_question, description")
    .eq("id", projectId)
    .single();

  // Get all papers
  const { data: papers } = await client
    .from("papers")
    .select("*")
    .eq("project_id", projectId)
    .order("relevance_score", { ascending: false });

  // Get terms for all papers
  const paperIds = (papers || []).map((p: { id: string }) => p.id);
  const { data: allTerms } = await client
    .from("paper_terms")
    .select("*")
    .in("paper_id", paperIds);

  if (format === "json") {
    return NextResponse.json({
      project,
      papers,
      terms: allTerms,
      exported_at: new Date().toISOString(),
    });
  }

  // Markdown export
  const triageLabels: Record<string, string> = {
    priority_read: "优先精读",
    quick_browse: "快速浏览",
    skip: "暂不纳入",
  };

  let md = `# ${project?.name || "研究报告"}\n\n`;
  md += `> ${project?.research_question || ""}\n\n`;
  md += `导出时间: ${new Date().toLocaleString("zh-CN")}\n\n`;
  md += `---\n\n`;

  // Group by triage level
  const priorityRead = (papers || []).filter((p: { triage_level: string }) => p.triage_level === "priority_read");
  const quickBrowse = (papers || []).filter((p: { triage_level: string }) => p.triage_level === "quick_browse");
  const skip = (papers || []).filter((p: { triage_level: string }) => p.triage_level === "skip");

  const renderPaperSection = (p: Record<string, unknown>) => {
    let section = `### ${p.title}\n\n`;
    if (p.url) section += `链接: ${p.url}\n\n`;
    section += `**相关性**: ${p.relevance_score} | **质量**: ${p.quality_score} | **置信度**: ${p.confidence}\n\n`;
    if (p.ai_summary) section += `**AI摘要**: ${p.ai_summary}\n\n`;
    if (p.triage_reason) section += `**分诊理由**: ${p.triage_reason}\n\n`;
    if (p.evidence) {
      const ev = p.evidence as Record<string, string>;
      if (ev.method) section += `**方法**: ${ev.method}\n\n`;
      if (ev.conclusion) section += `**结论**: ${ev.conclusion}\n\n`;
      if (ev.limitation) section += `**局限**: ${ev.limitation}\n\n`;
    }
    // Terms
    const paperTerms = (allTerms || []).filter((t: { paper_id: string }) => t.paper_id === p.id);
    if (paperTerms.length > 0) {
      section += `**术语**:\n`;
      for (const t of paperTerms) {
        section += `- ${t.term}${t.translation ? ` (${t.translation})` : ""}: ${t.explanation || ""}\n`;
      }
      section += "\n";
    }
    section += "---\n\n";
    return section;
  };

  if (priorityRead.length > 0) {
    md += `## 优先精读 (${priorityRead.length} 篇)\n\n`;
    for (const p of priorityRead) md += renderPaperSection(p);
  }
  if (quickBrowse.length > 0) {
    md += `## 快速浏览 (${quickBrowse.length} 篇)\n\n`;
    for (const p of quickBrowse) md += renderPaperSection(p);
  }
  if (skip.length > 0) {
    md += `## 暂不纳入 (${skip.length} 篇)\n\n`;
    for (const p of skip) md += renderPaperSection(p);
  }

  return NextResponse.json({ content: md, format: "markdown" });
}
