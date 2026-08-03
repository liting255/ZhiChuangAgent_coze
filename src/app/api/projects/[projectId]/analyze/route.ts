import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await request.json();
  const { paper_id, action } = body;

  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const config = new Config();
  const client = getSupabaseClient();

  if (action === "generate_tags") {
    // Generate tags for all papers in the project
    const { data: papers } = await client
      .from("papers")
      .select("id, title, abstract")
      .eq("project_id", projectId)
      .is("tags", null)
      .limit(20);

    if (!papers || papers.length === 0) {
      return NextResponse.json({ message: "没有需要分类的文献" });
    }

    const llmClient = new LLMClient(config, customHeaders);
    const messages = [
      {
        role: "system" as const,
        content: `你是一个科研文献分类专家。根据论文标题和摘要，为每篇论文生成标签。
标签维度：任务(task)、方法(method)、数据(data)、场景(scenario)
每个维度1-3个标签，支持多标签。

请以JSON数组格式返回：
[{ "index": 0, "tags": {"task": ["tag1"], "method": ["tag2"], "data": ["tag3"], "scenario": ["tag4"]} }]

论文列表：
${papers.map((p: { id: string; title: string; abstract: string | null }, i: number) => `${i}. ${p.title}\n   摘要: ${(p.abstract || "").slice(0, 150)}`).join("\n\n")}`,
      },
      { role: "user" as const, content: "请为上述论文生成分类标签" },
    ];

    const response = await llmClient.invoke(messages, {
      temperature: 0.2,
      model: "doubao-seed-2-0-mini-260215",
    });

    let tagResults: Array<{ index: number; tags: Record<string, string[]> }> = [];
    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        tagResults = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // fallback
    }

    // Update papers with tags
    for (const result of tagResults) {
      if (papers[result.index]) {
        await client
          .from("papers")
          .update({ tags: result.tags })
          .eq("id", papers[result.index].id);
      }
    }

    return NextResponse.json({ tagged: tagResults.length });
  }

  if (action === "confirm" && paper_id) {
    // Human confirms the triage result
    const { data } = await client
      .from("papers")
      .update({ human_confirmed: true })
      .eq("id", paper_id)
      .select()
      .single();

    return NextResponse.json({ paper: data });
  }

  if (action === "adjust_triage" && paper_id) {
    // Human adjusts the triage level
    const { new_triage_level } = body;
    const { data } = await client
      .from("papers")
      .update({ triage_level: new_triage_level, human_confirmed: true })
      .eq("id", paper_id)
      .select()
      .single();

    return NextResponse.json({ paper: data });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}
