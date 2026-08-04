import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await request.json();
  const { query, paperIds, history } = body;

  if (!query?.trim()) {
    return NextResponse.json({ error: "查询不能为空" }, { status: 400 });
  }

  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const config = new Config();
  const client = getSupabaseClient();

  // Fetch selected papers for context
  let paperContext = "";
  if (paperIds && paperIds.length > 0) {
    const { data: papers } = await client
      .from("papers")
      .select("id, title, abstract, triage_level, tags")
      .in("id", paperIds)
      .limit(50);

    if (papers && papers.length > 0) {
      paperContext = papers
        .map(
          (p: Record<string, unknown>, i: number) =>
            `[文献${i + 1}] 标题: ${p.title}\n摘要: ${(p.abstract as string)?.slice(0, 500) || "无"}\n标签: ${(p.tags as string[])?.join(", ") || "无"}`
        )
        .join("\n\n");
    }
  }

  // Build messages
  const systemPrompt = paperContext
    ? `你是一个科研文献研究助手。用户选择了以下文献作为参考上下文，请基于这些文献内容回答用户的问题。如果用户的问题超出文献范围，请基于你的知识进行补充，但要明确说明哪些来自文献，哪些来自你的知识。

## 参考文献

${paperContext}

## 回答要求
1. 优先基于上述文献内容回答
2. 引用文献时使用 [文献N] 标注
3. 回答要结构清晰，使用标题和列表组织
4. 如果用户输入 /save，请将之前的重要结论总结为一份结构化的研究笔记
5. 如果用户要求"沉淀为文档"，请生成一份完整的文档，包含标题、摘要、关键发现、方法对比、结论等部分`
    : `你是一个科研文献研究助手。用户还没有选择文献，请引导用户先在左侧面板选择文献，或直接回答用户的问题。`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(history || []).map((h: { role: string; content: string }) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user" as const, content: query },
  ];

  // Use streaming response
  const llmClient = new LLMClient(config, customHeaders);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const llmStream = llmClient.stream(messages, {
          model: "doubao-seed-2-0-lite-260215",
          temperature: 0.7,
        });

        for await (const chunk of llmStream) {
          if (chunk.content) {
            const content = chunk.content.toString();
            const sseData = `data: ${JSON.stringify({ content })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        console.error("Chat stream error:", error);
        const errorData = `data: ${JSON.stringify({ error: "对话生成失败，请重试" })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Transfer-Encoding": "chunked",
    },
  });
}