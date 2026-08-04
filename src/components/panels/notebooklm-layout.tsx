"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { Panel, Group, Separator } from "react-resizable-panels";
import { SourcePanel } from "@/components/panels/source-panel";
import { ChatPanel } from "@/components/panels/chat-panel";
import { NotesPanel } from "@/components/panels/notes-panel";
import { SourcePaper } from "@/components/panels/source-card";
import { NoteData } from "@/components/panels/note-card";
import { Button } from "@/components/ui/button";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ArrowLeft,
  Brain,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NotebookLMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // Panel visibility
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Source panel state
  const [papers, setPapers] = useState<SourcePaper[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Notes panel state
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Fetch papers on mount
  useEffect(() => {
    fetchPapers();
    fetchNotes();
  }, [projectId]);

  const fetchPapers = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/papers`);
      const data = await res.json();
      const mapped: SourcePaper[] = (data.papers || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        title: (p.title as string) || "Untitled",
        abstract: (p.abstract as string) || "",
        source: (p.source as string) || "未知来源",
        sourceType: (p.sourceType as "search" | "upload") || "search",
        triageLevel: (p.triageLevel as "priority_read" | "quick_browse" | "skip") || "quick_browse",
        tags: (p.tags as string[]) || [],
        summary: (p.summary as string) || null,
        year: (p.year as number) || null,
        authors: (p.authors as string) || null,
        journal: (p.journal as string) || null,
      }));
      setPapers(mapped);
    } catch (err) {
      console.error("Failed to fetch papers:", err);
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/notes`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    }
  };

  // Source handlers
  const handleTogglePaper = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(papers.map((p) => p.id));
  }, [papers]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, mode: "hybrid" }),
        });
        const data = await res.json();
        const newPapers: SourcePaper[] = (data.papers || []).map(
          (p: Record<string, unknown>) => ({
            id: (p.id as string) || `temp-${Date.now()}`,
            title: (p.title as string) || "Untitled",
            abstract: (p.abstract as string) || "",
            source: (p.source as string) || "网络检索",
            sourceType: "search" as const,
            triageLevel:
              (p.triage_level as "priority_read" | "quick_browse" | "skip") ||
              "quick_browse",
            tags: [],
            summary: null,
            year: null,
            authors: null,
            journal: null,
          })
        );
        setPapers((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = newPapers.filter((p) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
        toast.success(`检索完成，新增 ${newPapers.length} 篇文献`);
      } catch (err) {
        console.error("Search failed:", err);
        toast.error("检索失败，请重试");
      } finally {
        setSearchLoading(false);
      }
    },
    [projectId]
  );

  const handleUpload = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch(`/api/projects/${projectId}/upload`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();

          if (data.paper) {
            const newPaper: SourcePaper = {
              id: data.paper.id as string,
              title: (data.paper.title as string) || file.name,
              abstract: (data.paper.abstract as string) || "",
              source: file.name,
              sourceType: "upload",
              triageLevel: "quick_browse",
              tags: [],
              summary: (data.paper.summary as string) || null,
              year: (data.paper.year as number) || null,
              authors: (data.paper.authors as string) || null,
              journal: null,
            };
            setPapers((prev) => [...prev, newPaper]);
            toast.success(`已上传: ${file.name}`);
          }
        } catch (err) {
          console.error("Upload failed:", err);
          toast.error(`上传失败: ${file.name}`);
        }
      }
    },
    [projectId]
  );

  const handleFilterChange = useCallback((_filter: string) => {
    // Filtering is handled inside SourcePanel
  }, []);

  // Note handlers
  const handleSaveToNotes = useCallback(
    async (content: string, title: string) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            sourcePaperIds: selectedIds,
          }),
        });
        const data = await res.json();
        if (data.note) {
          setNotes((prev) => [data.note, ...prev]);
          setActiveNoteId(data.note.id);
          toast.success("已沉淀为笔记");
        }
      } catch (err) {
        console.error("Save note failed:", err);
        toast.error("保存笔记失败");
      }
    },
    [projectId, selectedIds]
  );

  const handleDeleteNote = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/projects/${projectId}/notes/${id}`, {
          method: "DELETE",
        });
        setNotes((prev) => prev.filter((n) => n.id !== id));
        if (activeNoteId === id) setActiveNoteId(null);
        toast.success("笔记已删除");
      } catch (err) {
        console.error("Delete note failed:", err);
        toast.error("删除失败");
      }
    },
    [projectId, activeNoteId]
  );

  const handleExportNote = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/notes/${id}/export`
        );
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `note-${id}.md`;
        link.click();
        window.URL.revokeObjectURL(url);
        toast.success("导出成功");
      } catch (err) {
        console.error("Export failed:", err);
        toast.error("导出失败");
      }
    },
    [projectId]
  );

  const handleCreateNote = useCallback(() => {
    // Open a blank note creation - for now, trigger via chat save
    toast.info("在对话中使用 /save 指令沉淀笔记");
  }, []);

  const selectedPaperTitles = papers
    .filter((p) => selectedIds.includes(p.id))
    .map((p) => p.title);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Top bar */}
      <header className="h-11 border-b border-[#E8EAED] bg-white flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 text-xs text-[#5F6368] hover:text-[#202124] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Brain className="h-4 w-4 text-[#1a73e8]" />
            <span className="text-xs font-medium text-[#202124]">
              智创Agent
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 rounded-lg",
              leftCollapsed
                ? "text-[#1a73e8] bg-[#E8F0FE]"
                : "text-[#5F6368]"
            )}
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            title={leftCollapsed ? "展开文献面板" : "折叠文献面板"}
          >
            {leftCollapsed ? (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 rounded-lg",
              rightCollapsed
                ? "text-[#1a73e8] bg-[#E8F0FE]"
                : "text-[#5F6368]"
            )}
            onClick={() => setRightCollapsed(!rightCollapsed)}
            title={rightCollapsed ? "展开笔记面板" : "折叠笔记面板"}
          >
            {rightCollapsed ? (
              <PanelRightOpen className="h-3.5 w-3.5" />
            ) : (
              <PanelRightClose className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </header>

      {/* Three-panel layout */}
      <div className="flex-1 overflow-hidden">
        <Group orientation="horizontal">
          {/* Left: Sources */}
          {!leftCollapsed && (
            <>
              <Panel defaultSize={22} minSize={18} maxSize={35}>
                <SourcePanel
                  papers={papers}
                  selectedIds={selectedIds}
                  onTogglePaper={handleTogglePaper}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  onSearch={handleSearch}
                  onUpload={handleUpload}
                  onFilterChange={handleFilterChange}
                  loading={searchLoading}
                />
              </Panel>
              <Separator className="w-1 bg-[#E8EAED] hover:bg-[#1a73e8] transition-colors cursor-col-resize" />
            </>
          )}

          {/* Center: Chat */}
          <Panel minSize={30}>
            <ChatPanel
              projectId={projectId}
              selectedPaperIds={selectedIds}
              selectedPaperTitles={selectedPaperTitles}
              onSaveToNotes={handleSaveToNotes}
            />
          </Panel>

          {/* Right: Notes */}
          {!rightCollapsed && (
            <>
              <Separator className="w-1 bg-[#E8EAED] hover:bg-[#1a73e8] transition-colors cursor-col-resize" />
              <Panel defaultSize={22} minSize={18} maxSize={35}>
                <NotesPanel
                  notes={notes}
                  activeNoteId={activeNoteId}
                  onSelectNote={setActiveNoteId}
                  onDeleteNote={handleDeleteNote}
                  onExportNote={handleExportNote}
                  onCreateNote={handleCreateNote}
                />
              </Panel>
            </>
          )}
        </Group>
      </div>
    </div>
  );
}