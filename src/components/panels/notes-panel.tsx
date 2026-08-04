"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NoteCard, NoteData } from "./note-card";
import { FileText, Plus, Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotesPanelProps {
  notes: NoteData[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onExportNote: (id: string) => void;
  onCreateNote: () => void;
  className?: string;
}

export function NotesPanel({
  notes,
  activeNoteId,
  onSelectNote,
  onDeleteNote,
  onExportNote,
  onCreateNote,
  className,
}: NotesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewNote, setPreviewNote] = useState<NoteData | null>(null);

  const filteredNotes = searchQuery.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notes;

  return (
    <div className={cn("flex flex-col h-full bg-[#F8F9FA]", className)}>
      {/* Header */}
      <div className="px-3 py-3 border-b border-[#E8EAED]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-[#202124] flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-[#5F6368]" />
            研究笔记
          </h2>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#9AA0A6]">{notes.length}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-lg"
              onClick={onCreateNote}
            >
              <Plus className="h-3.5 w-3.5 text-[#5F6368]" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9AA0A6]" />
          <Input
            placeholder="搜索笔记..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs rounded-lg bg-white border-[#DADCE0] focus-visible:ring-[#1a73e8]"
          />
        </div>
      </div>

      {/* Notes list */}
      <ScrollArea className="flex-1">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <FileText className="h-8 w-8 text-[#DADCE0] mb-2" />
            <p className="text-xs text-[#9AA0A6] text-center">
              {notes.length === 0
                ? "暂无研究笔记，在对话中沉淀知识"
                : "没有匹配的笔记"}
            </p>
          </div>
        ) : (
          <div>
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                active={note.id === activeNoteId}
                onClick={() => {
                  onSelectNote(note.id);
                  setPreviewNote(note);
                }}
                onDelete={onDeleteNote}
                onExport={onExportNote}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Preview dialog */}
      <Dialog
        open={!!previewNote}
        onOpenChange={(open) => {
          if (!open) setPreviewNote(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">
              {previewNote?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-[#202124] leading-relaxed whitespace-pre-wrap">
              {previewNote?.content}
            </div>
            {previewNote && previewNote.sourcePaperTitles.length > 0 && (
              <div className="border-t border-[#E8EAED] pt-3">
                <h4 className="text-xs font-medium text-[#5F6368] mb-2">
                  参考来源
                </h4>
                <div className="space-y-1">
                  {previewNote.sourcePaperTitles.map((title, i) => (
                    <p
                      key={i}
                      className="text-[11px] text-[#5F6368] flex items-center gap-1.5"
                    >
                      <span className="h-1 w-1 rounded-full bg-[#9AA0A6] shrink-0" />
                      {title}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-[#9AA0A6]">
              <span>
                创建于{" "}
                {previewNote &&
                  new Date(previewNote.createdAt).toLocaleString("zh-CN")}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] rounded-lg"
                onClick={() => {
                  if (previewNote) onExportNote(previewNote.id);
                }}
              >
                <Download className="h-3 w-3 mr-1" />
                导出
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}