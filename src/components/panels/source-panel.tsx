"use client";

import { useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Upload,
  SlidersHorizontal,
  X,
  Loader2,
  Plus,
  BookOpen,
  CheckSquare,
  Square,
} from "lucide-react";
import { SourceCard, SourcePaper } from "./source-card";
import { SearchDialog } from "./search-dialog";
import { cn } from "@/lib/utils";

interface SourcePanelProps {
  papers: SourcePaper[];
  selectedIds: string[];
  onTogglePaper: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSearch: (query: string) => void;
  onUpload: (files: FileList) => void;
  onDownload?: (id: string) => void;
  loading: boolean;
  uploadLoading: boolean;
  className?: string;
}

type FilterTab = "all" | "priority_read" | "quick_browse" | "skip";

export function SourcePanel({
  papers,
  selectedIds,
  onTogglePaper,
  onSelectAll,
  onDeselectAll,
  onSearch,
  onUpload,
  onDownload,
  loading,
  uploadLoading,
  className,
}: SourcePanelProps) {
  console.log("SourcePanel rendered, onUpload type:", typeof onUpload, "papers count:", papers.length, "uploadLoading:", uploadLoading);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  }, [searchQuery, onSearch]);

  const filteredPapers = activeFilter === "all"
    ? papers
    : papers.filter((p) => p.triageLevel === activeFilter);

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "全部", count: papers.length },
    {
      key: "priority_read",
      label: "精读",
      count: papers.filter((p) => p.triageLevel === "priority_read").length,
    },
    {
      key: "quick_browse",
      label: "浏览",
      count: papers.filter((p) => p.triageLevel === "quick_browse").length,
    },
    {
      key: "skip",
      label: "备选",
      count: papers.filter((p) => p.triageLevel === "skip").length,
    },
  ];

  const allSelected = papers.length > 0 && selectedIds.length === papers.length;

  return (
    <div className={cn("flex flex-col h-full bg-[#F8F9FA]", className)}>
      {/* Header */}
      <div className="px-3 py-3 border-b border-[#E8EAED]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-[#202124] flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-[#5F6368]" />
            文献源
          </h2>
          <span className="text-[10px] text-[#9AA0A6]">
            {papers.length} 篇
          </span>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9AA0A6]" />
          <Input
            placeholder="搜索文献..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-8 pr-8 h-8 text-xs rounded-lg bg-white border-[#DADCE0] focus-visible:ring-[#1a73e8]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3 w-3 text-[#9AA0A6]" />
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] rounded-lg text-[#5F6368] hover:text-[#202124] hover:bg-[#E8EAED] flex-1"
            onClick={() => setShowSearchDialog(true)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Search className="h-3 w-3 mr-1" />
            )}
            网络检索
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] rounded-lg text-[#5F6368] hover:text-[#202124] hover:bg-[#E8EAED] flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading}
          >
            {uploadLoading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Upload className="h-3 w-3 mr-1" />
            )}
            {uploadLoading ? "上传中..." : "上传PDF"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 text-[11px] rounded-lg",
              showFilters
                ? "text-[#1a73e8] bg-[#E8F0FE]"
                : "text-[#5F6368] hover:bg-[#E8EAED]"
            )}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-3 w-3" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                console.log("SourcePanel: files selected", e.target.files.length, "files:", Array.from(e.target.files).map(f => f.name).join(", "));
                onUpload(e.target.files);
              } else {
                console.log("SourcePanel: file input changed but no files");
              }
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      {showFilters && (
        <div className="px-3 py-2 border-b border-[#E8EAED] flex items-center gap-1 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveFilter(tab.key);
              }}
              className={cn(
                "text-[10px] px-2 py-1 rounded-full whitespace-nowrap transition-colors",
                activeFilter === tab.key
                  ? "bg-[#1a73e8] text-white"
                  : "bg-[#E8EAED] text-[#5F6368] hover:bg-[#DADCE0]"
              )}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      )}

      {/* Select all bar */}
      {papers.length > 0 && (
        <div className="px-3 py-1.5 border-b border-[#E8EAED] flex items-center gap-2">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-[10px] text-[#5F6368] hover:text-[#202124] flex items-center gap-1"
          >
            {allSelected ? (
              <CheckSquare className="h-3 w-3" />
            ) : (
              <Square className="h-3 w-3" />
            )}
            {allSelected ? "取消全选" : "全选"}
          </button>
          {selectedIds.length > 0 && (
            <span className="text-[10px] text-[#1a73e8]">
              已选 {selectedIds.length} 篇
            </span>
          )}
        </div>
      )}

      {/* Paper list */}
      <ScrollArea className="flex-1">
        {loading && papers.length === 0 ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 mx-1 rounded-lg bg-[#E8EAED] animate-pulse"
              />
            ))}
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <BookOpen className="h-8 w-8 text-[#DADCE0] mb-2" />
            <p className="text-xs text-[#9AA0A6] text-center">
              {papers.length === 0
                ? "尚未导入文献，使用搜索或上传添加"
                : "没有匹配的文献"}
            </p>
            {papers.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-7 text-[11px] rounded-lg"
                onClick={() => setShowSearchDialog(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                开始检索
              </Button>
            )}
          </div>
        ) : (
          <div>
            {filteredPapers.map((paper) => (
              <SourceCard
                key={paper.id}
                paper={paper}
                selected={selectedIds.includes(paper.id)}
                onToggle={onTogglePaper}
                onDownload={onDownload}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Search Dialog */}
      <SearchDialog
        open={showSearchDialog}
        onOpenChange={setShowSearchDialog}
        onSearch={onSearch}
        loading={loading}
      />
    </div>
  );
}