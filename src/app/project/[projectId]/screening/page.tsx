"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle2, XCircle, ArrowRight, Loader2, Tag, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

interface Paper {
  id: string;
  title: string;
  url: string;
  abstract: string | null;
  source: string;
  triage_level: string;
  triage_reason: string | null;
  relevance_score: number;
  quality_score: number;
  confidence: string;
  human_confirmed: boolean;
  tags: Record<string, string[]> | null;
}

export default function ScreeningPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagging, setTagging] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");

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

  const handleGenerateTags = async () => {
    setTagging(true);
    try {
      await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_tags" }),
      });
      await fetchPapers();
    } catch (err) {
      console.error("Tagging failed:", err);
    } finally {
      setTagging(false);
    }
  };

  const handleConfirm = async (paperId: string) => {
    await fetch(`/api/projects/${projectId}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", paper_id: paperId }),
    });
    await fetchPapers();
  };

  const handleAdjustTriage = async (paperId: string, newLevel: string) => {
    await fetch(`/api/projects/${projectId}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjust_triage", paper_id: paperId, new_triage_level: newLevel }),
    });
    await fetchPapers();
  };

  const filteredPapers = activeFilter === "all"
    ? papers
    : papers.filter((p) => p.triage_level === activeFilter);

  const triageColors: Record<string, string> = {
    priority_read: "bg-red-50 text-red-700 border-red-200",
    quick_browse: "bg-amber-50 text-amber-700 border-amber-200",
    skip: "bg-slate-50 text-slate-500 border-slate-200",
  };

  const triageLabels: Record<string, string> = {
    priority_read: "优先精读",
    quick_browse: "快速浏览",
    skip: "暂不纳入",
  };

  const counts = {
    all: papers.length,
    priority_read: papers.filter((p) => p.triage_level === "priority_read").length,
    quick_browse: papers.filter((p) => p.triage_level === "quick_browse").length,
    skip: papers.filter((p) => p.triage_level === "skip").length,
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-medium">02</div>
          <h1 className="text-xl font-semibold">一次筛选与主题分类</h1>
        </div>
        <p className="text-sm text-slate-500 ml-8">AI排序 + 人工确认，生成主题分类标签</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateTags}
          disabled={tagging}
        >
          {tagging ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Tag className="h-4 w-4 mr-2" />}
          {tagging ? "分类中..." : "生成主题标签"}
        </Button>
        <span className="text-xs text-slate-400">
          已确认 {papers.filter((p) => p.human_confirmed).length} / {papers.length} 篇
        </span>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="all" className="text-xs">全部 ({counts.all})</TabsTrigger>
          <TabsTrigger value="priority_read" className="text-xs">优先精读 ({counts.priority_read})</TabsTrigger>
          <TabsTrigger value="quick_browse" className="text-xs">快速浏览 ({counts.quick_browse})</TabsTrigger>
          <TabsTrigger value="skip" className="text-xs">暂不纳入 ({counts.skip})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Paper List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredPapers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">暂无文献，请先完成阶段01的检索</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPapers.map((paper) => (
            <Card key={paper.id} className={`border-slate-200 ${paper.human_confirmed ? "border-l-4 border-l-green-400" : ""}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className={`${triageColors[paper.triage_level]} text-[10px]`}>
                        {triageLabels[paper.triage_level]}
                      </Badge>
                      {paper.human_confirmed && (
                        <Badge variant="outline" className="text-[10px] border-green-300 text-green-700 bg-green-50">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" /> 已确认
                        </Badge>
                      )}
                      {paper.confidence === "low" && (
                        <Badge variant="outline" className="text-[10px] border-red-300 text-red-700 bg-red-50">
                          需人工确认
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-sm font-medium text-slate-900 mb-1 line-clamp-2">{paper.title}</h4>
                    {paper.triage_reason && (
                      <p className="text-xs text-slate-400 italic mb-2">{paper.triage_reason}</p>
                    )}
                    {/* Tags */}
                    {paper.tags && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {Object.entries(paper.tags).map(([dim, tags]) =>
                          (tags as string[]).map((tag, i) => (
                            <Badge key={`${dim}-${i}`} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => router.push(`/project/${projectId}/paper/${paper.id}`)}
                    >
                      <Eye className="h-3 w-3 mr-1" /> 详情
                    </Button>
                    {!paper.human_confirmed && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-green-600"
                          onClick={() => handleConfirm(paper.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> 确认
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-red-600"
                          onClick={() => handleAdjustTriage(paper.id, paper.triage_level === "skip" ? "quick_browse" : "skip")}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          {paper.triage_level === "skip" ? "改为浏览" : "排除"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Next Stage */}
      <div className="flex justify-end mt-6">
        <Button
          variant="outline"
          className="border-teal-300 text-teal-700 hover:bg-teal-50"
          onClick={() => router.push(`/project/${projectId}/library`)}
        >
          进入阶段03: 知识入库
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
