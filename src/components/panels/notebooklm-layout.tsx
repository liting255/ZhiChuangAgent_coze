"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
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

// ─── Resizable Panel Hook ───────────────────────────────────────────
function useResizablePanel(initialSize: number, minSize: number, maxSize: number) {
  const [size, setSize] = useState(initialSize);
  const sizeRef = useRef(initialSize);

  const updateSize = useCallback((newSize: number) => {
    const clamped = Math.min(maxSize, Math.max(minSize, newSize));
    sizeRef.current = clamped;
    setSize(clamped);
  }, [minSize, maxSize]);

  return { size, sizeRef, updateSize };
}

// ─── Drag Handle Component ──────────────────────────────────────────
function DragHandle({
  onDrag,
  direction,
}: {
  onDrag: (delta: number) => void;
  direction: "left" | "right";
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const startXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const delta = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onDrag(direction === "left" ? delta : -delta);
    },
    [isDragging, onDrag, direction]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-1 cursor-col-resize select-none touch-none shrink-0 transition-colors duration-150",
        isDragging ? "bg-[#1a73e8]" : isHovered ? "bg-[#1a73e8]/50" : "bg-[#E8EAED]"
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      style={{ touchAction: "none" }}
    >
      {/* Wider invisible hit area */}
      <div className="absolute inset-y-0 -left-2 -right-2" />
    </div>
  );
}

export default function NotebookLMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // Panel sizes (percentage)
  const leftPanel = useResizablePanel(22, 15, 35);
  const rightPanel = useResizablePanel(22, 15, 35);

  // Panel collapsed state
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const leftPrevSize = useRef(22);
  const rightPrevSize = useRef(22);

  // Source panel state
  const [papers, setPapers] = useState<SourcePaper[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Notes panel state
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Container ref for calculating percentages
  const containerRef = useRef<HTMLDivElement>(null);

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
          (p: Record<string, unknown>, idx: number) => ({
            id: (p.id as string) || `search-${Date.now()}-${idx}`,
            title: (p.title as string) || "Untitled",
            abstract: (p.abstract as string) || "",
            source: (p.source as string) || "网络检索",
            sourceType: "search" as const,
            triageLevel:
              (p.triage_level as "priority_read" | "quick_browse" | "skip") ||
              "quick_browse",
            tags: (p.tags as string[]) || [],
            summary: (p.summary as string) || null,
            year: (p.year as number) || null,
            authors: (p.authors as string) || null,
            journal: (p.journal as string) || null,
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
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setUploadLoading(true);

      // Batch upload: send all files in one request
      const formData = new FormData();
      fileArray.forEach((file) => {
        formData.append("files", file);
      });

      try {
        const res = await fetch(`/api/projects/${projectId}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          let errorMsg = "上传失败";
          try {
            const errData = await res.json();
            errorMsg = errData.error || errData.details || errorMsg;
          } catch {
            // response body not JSON, use default message
          }
          toast.error(errorMsg);
          return;
        }

        const data = await res.json();

        if (data.papers && data.papers.length > 0) {
          const newPapers: SourcePaper[] = data.papers.map(
            (p: Record<string, unknown>) => ({
              id: p.id as string,
              title: (p.title as string) || "Untitled",
              abstract: (p.abstract as string) || "",
              source: (p.source as string) || "用户上传",
              sourceType: "upload" as const,
              triageLevel: "quick_browse",
              tags: [],
              summary: (p.summary as string) || null,
              year: (p.year as number) || null,
              authors: (p.authors as string) || null,
              journal: null,
            })
          );
          setPapers((prev) => [...prev, ...newPapers]);
          toast.success(data.summary || `成功上传 ${newPapers.length} 篇文献`);
        }

        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((e: { fileName: string; error: string }) => {
            toast.error(`${e.fileName}: ${e.error}`);
          });
        }
      } catch (err) {
        console.error("Upload failed:", err);
        toast.error("上传失败，请检查网络连接后重试");
      } finally {
        setUploadLoading(false);
      }
    },
    [projectId]
  );

  // Toggle handlers
  const toggleLeftPanel = useCallback(() => {
    if (leftCollapsed) {
      leftPanel.updateSize(leftPrevSize.current);
      setLeftCollapsed(false);
    } else {
      leftPrevSize.current = leftPanel.sizeRef.current;
      leftPanel.updateSize(0);
      setLeftCollapsed(true);
    }
  }, [leftCollapsed, leftPanel]);

  const toggleRightPanel = useCallback(() => {
    if (rightCollapsed) {
      rightPanel.updateSize(rightPrevSize.current);
      setRightCollapsed(false);
    } else {
      rightPrevSize.current = rightPanel.sizeRef.current;
      rightPanel.updateSize(0);
      setRightCollapsed(true);
    }
  }, [rightCollapsed, rightPanel]);

  // Drag handlers - convert pixel delta to percentage
  const handleLeftDrag = useCallback(
    (deltaPx: number) => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const deltaPercent = (deltaPx / containerWidth) * 100;
      const newSize = leftPanel.sizeRef.current + deltaPercent;
      leftPanel.updateSize(newSize);
      if (newSize <= 0) setLeftCollapsed(true);
      else setLeftCollapsed(false);
    },
    [leftPanel]
  );

  const handleRightDrag = useCallback(
    (deltaPx: number) => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const deltaPercent = (deltaPx / containerWidth) * 100;
      const newSize = rightPanel.sizeRef.current + deltaPercent;
      rightPanel.updateSize(newSize);
      if (newSize <= 0) setRightCollapsed(true);
      else setRightCollapsed(false);
    },
    [rightPanel]
  );

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
    toast.info("在对话中使用 /save 指令沉淀笔记");
  }, []);

  const handleDownload = useCallback(
    async (paperId: string) => {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/papers/${paperId}/download`
        );
        const data = await res.json();

        if (data.downloadUrl) {
          // Use fetch + blob pattern for cross-origin download
          const response = await fetch(data.downloadUrl);
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = data.fileName || "document.pdf";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          toast.success("下载开始");
        } else {
          toast.error("获取下载链接失败");
        }
      } catch (err) {
        console.error("Download failed:", err);
        toast.error("下载失败");
      }
    },
    [projectId]
  );

  const selectedPaperTitles = papers
    .filter((p) => selectedIds.includes(p.id))
    .map((p) => p.title);

  // Calculate center panel size
  const leftSize = leftCollapsed ? 0 : leftPanel.size;
  const rightSize = rightCollapsed ? 0 : rightPanel.size;
  const centerSize = 100 - leftSize - rightSize;

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
            onClick={toggleLeftPanel}
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
            onClick={toggleRightPanel}
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

      {/* Three-panel layout with custom drag handles */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-row overflow-hidden"
        style={{ touchAction: "none" }}
      >
        {/* Left Panel - Sources */}
        {!leftCollapsed && (
          <div
            className="h-full overflow-hidden shrink-0"
            style={{ width: `${leftSize}%` }}
          >
            <SourcePanel
              papers={papers}
              selectedIds={selectedIds}
              onTogglePaper={handleTogglePaper}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onSearch={handleSearch}
              onUpload={handleUpload}
              onDownload={handleDownload}
              loading={searchLoading}
              uploadLoading={uploadLoading}
            />
          </div>
        )}

        {/* Left Drag Handle */}
        {!leftCollapsed && (
          <DragHandle onDrag={handleLeftDrag} direction="left" />
        )}

        {/* Center Panel - Chat */}
        <div
          className="h-full overflow-hidden shrink-0"
          style={{ width: `${centerSize}%` }}
        >
          <ChatPanel
            projectId={projectId}
            selectedPaperIds={selectedIds}
            selectedPaperTitles={selectedPaperTitles}
            onSaveToNotes={handleSaveToNotes}
          />
        </div>

        {/* Right Drag Handle */}
        {!rightCollapsed && (
          <DragHandle onDrag={handleRightDrag} direction="right" />
        )}

        {/* Right Panel - Notes */}
        {!rightCollapsed && (
          <div
            className="h-full overflow-hidden shrink-0"
            style={{ width: `${rightSize}%` }}
          >
            <NotesPanel
              notes={notes}
              activeNoteId={activeNoteId}
              onSelectNote={setActiveNoteId}
              onDeleteNote={handleDeleteNote}
              onExportNote={handleExportNote}
              onCreateNote={handleCreateNote}
            />
          </div>
        )}
      </div>
    </div>
  );
}
