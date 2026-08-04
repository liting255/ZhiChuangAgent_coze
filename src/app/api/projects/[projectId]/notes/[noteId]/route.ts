import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> }
) {
  const { noteId } = await params;
  const client = getSupabaseClient();

  const { error } = await client
    .from("research_notes")
    .delete()
    .eq("id", noteId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> }
) {
  const { noteId } = await params;
  const body = await request.json();
  const { title, content } = body;

  const client = getSupabaseClient();

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from("research_notes")
    .update(updates)
    .eq("id", noteId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: data });
}