"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Database, ArrowRight, Loader2, FileText, Layers, BookOpen } from "lucide-react";

interface Paper {
  id: string;
  title: string;
  abstract: string | null;
  tags: Record<string, string[]> | null;
  triage_level: string;
  human_confirmed: boolean;
  processing_status: string;
}

export default function LibraryPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchPapers = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/papers`);
      const data = await res.json();
      setPapers(data.papers || []);
    } catch (err) {
      console.error("Failed to fetch papers:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const handleProcess = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process_papers" }),
      });
      const data = await res.json();
      if (data.processed) {
        await fetchPapers();
      }
    } catch (err) {
      console.error("Processing failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  const includedPapers = papers.filter((p) => p.triage_level !== "skip" && p.human_confirmed);
  const processedPapers = papers.filter((p) => p.processing_status === "processed");

  const allTags: Record<string, Set<string>> = {};
  papers.forEach((p) => {
    if (p.tags) {
      Object.entries(p.tags).forEach(([dim, tags]) => {
        if (!allTags[dim]) allTags[dim] = new Set();
        (tags as string[]).forEach((t) => allTags[dim].add(t));
      });
    }
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2.5 w-2.5 rounded-full bg-[#0F766E]" />
          <h1 className="text-xl font-medium text-[#202124]">文献加工与知识入库</h1>
        </div>
        <p className="text-sm text-[#5F6368] ml-[18px]">全文获取、结构解析、向量化索引与证据抽取</p>
      </div>

      {/* Knowledge Base Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="border-[#DADCE0] rounded-xl shadow-sm">
          <CardContent className="pt-4 pb-4 text-center">
            <BookOpen className="h-5 w-5 text-[#0F766E] mx-auto mb-1" />
            <p className="text-xl font-semibold text-[#202124]">{includedPapers.length}</p>
            <p className="text-xs text-[#5F6368]">纳入文献</p>
          </CardContent>
        </Card>
        <Card className="border-[#DADCE0] rounded-xl shadow-sm">
          <CardContent className="pt-4 pb-4 text-center">
            <Layers className="h-5 w-5 text-[#0F766E] mx-auto mb-1" />
            <p className="text-xl font-semibold text-[#202124]">{processedPapers.length}</p>
            <p className="text-xs text-[#5F6368]">已处理</p>
          </CardContent>
        </Card>
        <Card className="border-[#DADCE0] rounded-xl shadow-sm">
          <CardContent className="pt-4 pb-4 text-center">
            <Database className="h-5 w-5 text-[#0F766E] mx-auto mb-1" />
            <p className="text-xl font-semibold text-[#202124]">{Object.keys(allTags).length}</p>
            <p className="text-xs text-[#5F6368]">标签维度</p>
          </CardContent>
        </Card>
      </div>

      {/* Tag Cloud */}
      {Object.keys(allTags).length > 0 && (
        <Card className="mb-6 border-[#DADCE0] rounded-xl shadow-sm">
          <CardContent className="pt-5">
            <h3 className="text-sm font-medium text-[#202124] mb-3">标签体系</h3>
            <div className="space-y-2">
              {Object.entries(allTags).map(([dim, tags]) => (
                <div key={dim} className="flex items-start gap-2">
                  <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5 rounded-full">
                    {dim === "task" ? "任务" : dim === "method" ? "方法" : dim === "data" ? "数据" : "场景"}
                  </Badge>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(tags).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] rounded-full">{tag}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process Button */}
      <Card className="mb-6 border-[#DADCE0] bg-[#F8F9FA] rounded-xl shadow-sm">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-[#202124]">统一知识库</h3>
              <p className="text-xs text-[#5F6368] mt-1">
                对纳入文献进行结构解析、向量化索引和证据抽取，构建文档库 + 向量库 + 标签库
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-xl border-[#DADCE0]"
              onClick={handleProcess}
              disabled={processing || includedPapers.length === 0}
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 处理中...</>
              ) : (
                <><Database className="h-4 w-4 mr-2" /> 执行入库</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Paper List */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-[#202124] mb-3">
          纳入文献列表 ({includedPapers.length} 篇)
        </h3>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-[#F8F9FA] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : includedPapers.length === 0 ? (
          <Card className="border-dashed border-[#DADCE0] rounded-xl">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <FileText className="h-8 w-8 text-[#DADCE0] mb-2" />
              <p className="text-sm text-[#5F6368]">请先完成阶段02的筛选确认</p>
            </CardContent>
          </Card>
        ) : (
          includedPapers.map((paper) => (
            <div key={paper.id} className="flex items-center gap-3 p-3 bg-white border border-[#DADCE0] rounded-xl">
              <div className={`h-2 w-2 rounded-full shrink-0 ${paper.processing_status === "processed" ? "bg-green-500" : "bg-[#DADCE0]"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#202124] truncate">{paper.title}</p>
              </div>
              <Badge variant="outline" className="text-[10px] rounded-full">
                {paper.processing_status === "processed" ? "已入库" : "待处理"}
              </Badge>
            </div>
          ))
        )}
      </div>

      {/* Next Stage */}
      <div className="flex justify-end mt-6">
        <Button
          variant="outline"
          className="rounded-xl border-[#DADCE0]"
          onClick={() => router.push(`/project/${projectId}/evidence`)}
        >
          进入阶段04: 证据综合
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}