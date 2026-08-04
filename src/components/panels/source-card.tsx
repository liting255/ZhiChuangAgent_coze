"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, FileText, Globe } from "lucide-react";
import { useState } from "react";

export interface SourcePaper {
  id: string;
  title: string;
  abstract: string;
  source: string;
  sourceType: "search" | "upload";
  triageLevel: "priority_read" | "quick_browse" | "skip";
  tags: string[];
  summary: string | null;
  year: number | null;
  authors: string | null;
  journal: string | null;
}

const triageColors: Record<string, string> = {
  priority_read: "border-red-200 text-red-700 bg-red-50",
  quick_browse: "border-amber-200 text-amber-700 bg-amber-50",
  skip: "border-slate-200 text-slate-500 bg-slate-50",
};

const triageLabels: Record<string, string> = {
  priority_read: "精读",
  quick_browse: "浏览",
  skip: "备选",
};

interface SourceCardProps {
  paper: SourcePaper;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function SourceCard({ paper, selected, onToggle }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "group relative border-b border-[#E8EAED] transition-colors",
        selected
          ? "bg-[#E8F0FE] border-l-2 border-l-[#1a73e8]"
          : "hover:bg-[#F1F3F4] border-l-2 border-l-transparent"
      )}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(paper.id)}
          className="mt-0.5 h-3.5 w-3.5 rounded-sm data-[state=checked]:bg-[#1a73e8] data-[state=checked]:border-[#1a73e8]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {paper.sourceType === "search" ? (
              <Globe className="h-3 w-3 text-[#9AA0A6] shrink-0" />
            ) : (
              <FileText className="h-3 w-3 text-[#9AA0A6] shrink-0" />
            )}
            <span className="text-[11px] text-[#9AA0A6] truncate">
              {paper.source}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 rounded-full shrink-0",
                triageColors[paper.triageLevel]
              )}
            >
              {triageLabels[paper.triageLevel]}
            </Badge>
          </div>
          <h4 className="text-xs font-medium text-[#202124] leading-snug line-clamp-2">
            {paper.title}
          </h4>
          {paper.authors && (
            <p className="text-[10px] text-[#9AA0A6] mt-0.5 truncate">
              {paper.authors} {paper.year && `(${paper.year})`}
            </p>
          )}
          {paper.summary && (
            <p className="text-[11px] text-[#5F6368] mt-1 line-clamp-2 leading-relaxed">
              {paper.summary}
            </p>
          )}
          {paper.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {paper.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#E8EAED] text-[#5F6368]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-0.5 rounded-md hover:bg-[#E8EAED] transition-colors opacity-0 group-hover:opacity-100"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-[#5F6368] transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 pl-9">
          <p className="text-[11px] text-[#5F6368] leading-relaxed">
            {paper.abstract}
          </p>
          {paper.journal && (
            <p className="text-[10px] text-[#9AA0A6] mt-1.5">
              期刊: {paper.journal}
            </p>
          )}
        </div>
      )}
    </div>
  );
}