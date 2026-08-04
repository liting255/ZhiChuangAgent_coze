import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> }
) {
  const { noteId } = await params;
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("research_notes")
    .select("*")
    .eq("id", noteId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
  }

  const note = data as Record<string, unknown>;
  const markdown = `# ${note.title || "未命名笔记"}

${note.content || ""}

---

**参考来源:**
${((note.source_paper_titles as string[]) || []).map((t: string) => `- ${t}`).join("\n")}

**创建时间:** ${note.created_at}
**更新时间:** ${note.updated_at}
`;

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="note-${noteId}.md"`,
    },
  });
}