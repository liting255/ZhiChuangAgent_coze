"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, Loader2, Brain } from "lucide-react";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (query: string) => void;
  loading: boolean;
}

export function SearchDialog({
  open,
  onOpenChange,
  onSearch,
  loading,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");

  const handleSearch = useCallback(() => {
    if (query.trim() && !loading) {
      onSearch(query.trim());
      setQuery("");
    }
  }, [query, onSearch, loading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-[#DADCE0] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#E8F0FE]">
              <Brain className="h-4 w-4 text-[#1a73e8]" />
            </div>
            <DialogTitle className="text-base font-medium text-[#202124]">
              AI 文献检索
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[#5F6368] mt-1">
            输入研究主题，AI 将自动进行语义检索、分诊评分并下载相关文献
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 py-4">
          <div className="relative">
            <Textarea
              placeholder="描述你想研究的方向，例如：&#10;大语言模型在医疗诊断中的应用与挑战"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] text-sm rounded-xl border-[#DADCE0] focus-visible:ring-[#1a73e8] resize-none placeholder:text-[#9AA0A6]"
              autoFocus
              disabled={loading}
            />
            <p className="text-[10px] text-[#9AA0A6] mt-2 text-right">
              Ctrl + Enter 快速搜索
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs rounded-lg border-[#DADCE0] text-[#5F6368] hover:bg-[#F8F9FA]"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white"
            onClick={handleSearch}
            disabled={!query.trim() || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                检索中...
              </>
            ) : (
              <>
                <Search className="h-3.5 w-3.5 mr-1.5" />
                开始搜索
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}