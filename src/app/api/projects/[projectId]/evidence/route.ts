import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { SearchClient } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await request.json();
  const { action, evidence_query, constraints } = body;

  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const config = new Config();
  const client = getSupabaseClient();

  if (action === "process_papers") {
    // Process all included papers: extract evidence, generate summary
    const { data: papers } = await client
      .from("papers")
      .select("id, title, abstract")
      .eq("project_id", projectId)
      .neq("triage_level", "skip")
      .neq("processing_status", "processed")
      .limit(10);

    if (!papers || papers.length === 0) {
      return NextResponse.json({ message: "没有需要处理的文献", processed: 0 });
    }

    const llmClient = new LLMClient(config, customHeaders);

    for (const paper of papers) {
      // Extract evidence: method, data, conclusion, limitation
      const messages = [
        {
          role: "system" as const,
          content: `你是一个科研文献分析专家。根据论文标题和摘要，提取以下结构化证据：
1. method: 研究方法
2. data: 使用的数据集/数据
3. conclusion: 主要结论
4. limitation: 局限性

同时生成：
- ai_summary: 一段话的通俗化摘要
- key_terms: 关键术语列表 [{term, translation, explanation}]

请以JSON格式返回：
{
  "method": "",
  "data": "",
  "conclusion": "",
  "limitation": "",
  "ai_summary": "",
  "key_terms": [{"term": "", "translation": "", "explanation": ""}]
}

论文：${paper.title}
摘要：${paper.abstract || "无摘要"}`,
        },
        { role: "user" as const, content: "请分析这篇论文" },
      ];

      try {
        const response = await llmClient.invoke(messages, {
          temperature: 0.2,
          model: "doubao-seed-2-0-mini-260215",
        });

        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const evidence = JSON.parse(jsonMatch[0]);

          // Update paper
          await client
            .from("papers")
            .update({
              ai_summary: evidence.ai_summary || null,
              evidence: {
                method: evidence.method,
                data: evidence.data,
                conclusion: evidence.conclusion,
                limitation: evidence.limitation,
              },
              processing_status: "processed",
            })
            .eq("id", paper.id);

          // Save key terms
          if (evidence.key_terms && Array.isArray(evidence.key_terms)) {
            const termsToInsert = evidence.key_terms.map((t: { term: string; translation: string; explanation: string }) => ({
              paper_id: paper.id,
              term: t.term,
              translation: t.translation,
              explanation: t.explanation,
            }));
            if (termsToInsert.length > 0) {
              await client.from("paper_terms").insert(termsToInsert);
            }
          }
        }
      } catch {
        // Mark as processed even if extraction fails
        await client
          .from("papers")
          .update({ processing_status: "processed" })
          .eq("id", paper.id);
      }
    }

    return NextResponse.json({ processed: papers.length });
  }

  if (action === "evidence_search") {
    // Stage 04: Secondary search + evidence synthesis
    if (!evidence_query?.trim()) {
      return NextResponse.json({ error: "请输入具体的证据需求" }, { status: 400 });
    }

    // Get project context
    const { data: project } = await client
      .from("projects")
      .select("name, research_question")
      .eq("id", projectId)
      .single();

    // Get processed papers from knowledge base
    const { data: kbPapers } = await client
      .from("papers")
      .select("id, title, abstract, ai_summary, evidence, tags")
      .eq("project_id", projectId)
      .eq("processing_status", "processed");

    // Need parsing & scene constraints
    const llmClient = new LLMClient(config, customHeaders);
    const parseMessages = [
      {
        role: "system" as const,
        content: `你是一个科研需求解析专家。将用户的具体需求解析为结构化约束：
- object: 研究对象
- time_range: 时间范围
- method_focus: 方法关注点
- output_format: 期望输出形式

请以JSON返回：
{ "object": "", "time_range": "", "method_focus": "", "output_format": "" }

用户需求：${evidence_query}`,
      },
      { role: "user" as const, content: "请解析需求" },
    ];

    const parseResponse = await llmClient.invoke(parseMessages, {
      temperature: 0.2,
      model: "doubao-seed-2-0-mini-260215",
    });

    let parsedConstraints: Record<string, string> = {};
    try {
      const jsonMatch = parseResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsedConstraints = JSON.parse(jsonMatch[0]);
    } catch {
      parsedConstraints = { object: evidence_query };
    }

    // Secondary search: use web search for additional evidence
    const searchClient = new SearchClient(config, customHeaders);
    let additionalResults: Array<{ title: string; url: string; snippet: string }> = [];
    try {
      const searchRes = await searchClient.advancedSearch(evidence_query, {
        count: 5,
        needSummary: false,
      });
      if (searchRes.web_items) {
        additionalResults = searchRes.web_items.map((item) => ({
          title: item.title,
          url: item.url || "",
          snippet: item.snippet || "",
        }));
      }
    } catch {
      // Continue without additional results
    }

    // Evidence synthesis: combine KB papers + additional results
    const kbContext = (kbPapers || [])
      .map((p: { title: string; ai_summary: string | null; abstract: string | null; evidence: unknown }, i: number) =>
        `${i + 1}. ${p.title}\n   摘要: ${p.ai_summary || p.abstract || ""}\n   证据: ${JSON.stringify(p.evidence || {})}`
      )
      .join("\n\n");

    const additionalContext = additionalResults
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet.slice(0, 200)}`)
      .join("\n\n");

    const synthesisMessages = [
      {
        role: "system" as const,
        content: `你是一个科研证据综合专家。基于已有知识库文献和新检索结果，针对用户的具体需求进行证据综合。

需要完成：
1. 比较不同论文的方法和结果
2. 归纳共识和分歧
3. 指出冲突和矛盾
4. 评估证据充分性（sufficient/insufficient）
5. 如果证据不充分，建议如何调整检索策略
6. 生成推荐阅读路径

用户需求：${evidence_query}
需求约束：${JSON.stringify(parsedConstraints)}
研究项目：${project?.name || ""}

已有知识库文献：
${kbContext || "无"}

新检索结果：
${additionalContext || "无"}

请以JSON格式返回：
{
  "synthesis": "综合论述（带引用标记如[1][2]）",
  "comparison_matrix": [{"paper": "论文标题", "method": "方法", "result": "结果", "limitation": "局限"}],
  "consensus": "共识点",
  "conflicts": "分歧/冲突",
  "evidence_sufficient": true/false,
  "suggestions": "如果不充分，建议的调整策略",
  "reading_path": ["推荐阅读顺序的论文标题"]
}`,
      },
      { role: "user" as const, content: "请进行证据综合" },
    ];

    const synthesisResponse = await llmClient.invoke(synthesisMessages, {
      temperature: 0.3,
      model: "doubao-seed-2-0-lite-260215",
    });

    let synthesisResult: Record<string, unknown> = {};
    try {
      const jsonMatch = synthesisResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) synthesisResult = JSON.parse(jsonMatch[0]);
    } catch {
      synthesisResult = {
        synthesis: synthesisResponse.content,
        evidence_sufficient: true,
        comparison_matrix: [],
        reading_path: [],
      };
    }

    return NextResponse.json({
      constraints: parsedConstraints,
      additional_results: additionalResults,
      synthesis: synthesisResult,
      kb_paper_count: (kbPapers || []).length,
    });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}
