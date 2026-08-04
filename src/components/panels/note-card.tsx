"use client";

import { cn } from "@/lib/utils";
import { FileText, MoreVertical, Trash2, Download, Eye } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface NoteData {
  id: string;
  title: string;
  content: string;
  sourcePaperIds: string[];
  sourcePaperTitles: string[];
  createdAt: string;
  updatedAt: string;
}

interface NoteCardProps {
  note: NoteData;
  active: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}

export function NoteCard({
  note,
  active,
  onClick,
  onDelete,
  onExport,
}: NoteCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative px-3 py-3 border-b border-[#E8EAED] cursor-pointer transition-colors",
        active
          ? "bg-[#E8F0FE] border-l-2 border-l-[#1a73e8]"
          : "hover:bg-[#F1F3F4] border-l-2 border-l-transparent"
      )}
    >
      <div className="flex items-start gap-2">
        <FileText className="h-3.5 w-3.5 text-[#9AA0A6] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-medium text-[#202124] leading-snug line-clamp-2">
            {note.title}
          </h4>
          <p className="text-[10px] text-[#5F6368] mt-1 line-clamp-2 leading-relaxed">
            {note.content.slice(0, 100)}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-[#9AA0A6]">
              {new Date(note.createdAt).toLocaleDateString("zh-CN")}
            </span>
            {note.sourcePaperTitles.length > 0 && (
              <span className="text-[10px] text-[#9AA0A6]">
                来源: {note.sourcePaperTitles.length} 篇文献
              </span>
            )}
          </div>
        </div>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="shrink-0 p-0.5 rounded-md hover:bg-[#E8EAED] transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MoreVertical className="h-3.5 w-3.5 text-[#5F6368]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-xl">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="text-xs gap-2"
            >
              <Eye className="h-3.5 w-3.5" />
              查看详情
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onExport(note.id);
              }}
              className="text-xs gap-2"
            >
              <Download className="h-3.5 w-3.5" />
              导出
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
              className="text-xs gap-2 text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}