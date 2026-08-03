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
  const { query, mode, boolean_query } = body;

  if (!query?.trim()) {
    return NextResponse.json({ error: "检索查询不能为空" }, { status: 400 });
  }

  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const config = new Config();

  // Step 1: Query Understanding & Expansion (AI)
  const llmClient = new LLMClient(config, customHeaders);
  const expandMessages = [
    {
      role: "system" as const,
      content: `你是一个科研文献检索专家。用户会给你一个研究问题，你需要：
1. 拆解研究意图（主题、对象、任务、边界）
2. 生成3-5个同义词/相关术语扩展
3. 如果是布尔检索模式，生成一个布尔检索表达式（使用AND/OR/NOT）
4. 生成适合学术搜索的英文关键词

请以JSON格式返回：
{
  "intent": { "topic": "", "object": "", "task": "", "boundary": "" },
  "expanded_queries": ["query1", "query2", "query3"],
  "boolean_query": "keyword1 AND keyword2 OR keyword3 NOT keyword4",
  "english_keywords": ["keyword1", "keyword2"]
}`,
    },
    { role: "user" as const, content: query },
  ];

  const expandResponse = await llmClient.invoke(expandMessages, {
    temperature: 0.3,
    model: "doubao-seed-2-0-lite-260215",
  });

  let expandedData: {
    intent?: { topic?: string; object?: string; task?: string; boundary?: string };
    expanded_queries?: string[];
    boolean_query?: string;
    english_keywords?: string[];
  } = {};
  try {
    const jsonMatch = expandResponse.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      expandedData = JSON.parse(jsonMatch[0]);
    }
  } catch {
    expandedData = { expanded_queries: [query], english_keywords: [query] };
  }

  // Step 2: Execute Search (Web Search + Semantic Scholar simulation)
  const searchClient = new SearchClient(config, customHeaders);
  const searchQueries = mode === "boolean"
    ? [boolean_query || expandedData.boolean_query || query]
    : [
        query,
        ...(expandedData.expanded_queries?.slice(0, 2) || []),
        ...(expandedData.english_keywords?.slice(0, 1) || []),
      ];

  const allResults: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
    authors?: string;
    year?: number;
    doi?: string;
  }> = [];

  // Execute searches
  for (const sq of searchQueries.slice(0, 3)) {
    try {
      const response = await searchClient.advancedSearch(sq, {
        count: 8,
        needSummary: false,
        sites: "arxiv.org,scholar.google.com,semanticscholar.org,pubmed.ncbi.nlm.nih.gov",
      });

      if (response.web_items) {
        for (const item of response.web_items) {
          allResults.push({
            title: item.title,
            url: item.url || "",
            snippet: item.snippet || "",
            source: item.site_name || "web",
          });
        }
      }
    } catch {
      // Continue with other queries
    }
  }

  // Deduplicate by title similarity
  const seen = new Set<string>();
  const uniqueResults = allResults.filter((r) => {
    const key = r.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "").slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Step 3: AI Triage - Score and classify each paper
  const triageMessages = [
    {
      role: "system" as const,
      content: `你是一个科研文献分诊专家（类似医院分诊）。根据研究问题，对每篇文献进行：
1. 相关性评分 (0-100)
2. 质量评分 (0-100)
3. 分诊级别：priority_read（优先精读）、quick_browse（快速浏览）、skip（暂不纳入）
4. 分诊理由（一句话说明为什么这样分类）
5. 置信度：high/medium/low

研究问题：${query}

请以JSON数组格式返回，每个元素：
{ "index": 0, "relevance_score": 85, "quality_score": 70, "triage_level": "priority_read", "triage_reason": "直接回答了研究问题中的核心挑战", "confidence": "high" }

文献列表：
${uniqueResults.slice(0, 15).map((r, i) => `${i}. ${r.title}\n   摘要: ${r.snippet.slice(0, 200)}`).join("\n\n")}`,
    },
    { role: "user" as const, content: "请对上述文献进行分诊评估" },
  ];

  const triageResponse = await llmClient.invoke(triageMessages, {
    temperature: 0.2,
    model: "doubao-seed-2-0-lite-260215",
  });

  let triageResults: Array<{
    index: number;
    relevance_score: number;
    quality_score: number;
    triage_level: string;
    triage_reason: string;
    confidence: string;
  }> = [];
  try {
    const jsonMatch = triageResponse.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      triageResults = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback: assign default scores
    triageResults = uniqueResults.slice(0, 15).map((_, i) => ({
      index: i,
      relevance_score: 50,
      quality_score: 50,
      triage_level: i < 3 ? "priority_read" : i < 8 ? "quick_browse" : "skip",
      triage_reason: "自动评分（AI分析异常，请人工确认）",
      confidence: "low",
    }));
  }

  // Step 4: Save to database
  const client = getSupabaseClient();

  // Create search session
  const { data: session } = await client
    .from("search_sessions")
    .insert({
      project_id: projectId,
      query_text: query,
      expanded_queries: expandedData,
      search_mode: mode || "hybrid",
      boolean_query: boolean_query || expandedData.boolean_query || null,
      result_count: uniqueResults.length,
      stage: "discovery",
    })
    .select()
    .single();

  // Save papers with triage results
  const papersToInsert = uniqueResults.slice(0, 15).map((r, i) => {
    const triage = triageResults.find((t) => t.index === i);
    return {
      project_id: projectId,
      title: r.title,
      url: r.url,
      abstract: r.snippet,
      source: r.source,
      search_session_id: session?.id || null,
      triage_level: triage?.triage_level || "quick_browse",
      triage_reason: triage?.triage_reason || null,
      relevance_score: triage?.relevance_score || 50,
      quality_score: triage?.quality_score || 50,
      confidence: triage?.confidence || "medium",
    };
  });

  if (papersToInsert.length > 0) {
    await client.from("papers").insert(papersToInsert);
  }

  return NextResponse.json({
    session_id: session?.id,
    query_expansion: expandedData,
    total_found: uniqueResults.length,
    triage_summary: {
      priority_read: triageResults.filter((t) => t.triage_level === "priority_read").length,
      quick_browse: triageResults.filter((t) => t.triage_level === "quick_browse").length,
      skip: triageResults.filter((t) => t.triage_level === "skip").length,
    },
    papers: papersToInsert,
  });
}
