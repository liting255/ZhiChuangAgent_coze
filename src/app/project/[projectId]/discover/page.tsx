"use client";

import { useParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

interface Paper {
  id?: string;
  title: string;
  url: string;
  abstract: string;
  source: string;
  triage_level: string;
  triage_reason: string;
  relevance_score: number;
  quality_score: number;
  confidence: string;
}

interface QueryExpansion {
  intent?: { topic?: string; object?: string; task?: string; boundary?: string };
  expanded_queries?: string[];
  boolean_query?: string;
  english_keywords?: string[];
}

interface SearchResult {
  session_id: string;
  query_expansion: QueryExpansion;
  total_found: number;
  triage_summary: { priority_read: number; quick_browse: number; skip: number };
  papers: Paper[];
}

export default function DiscoverPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [query, setQuery] = useState("");
  const [booleanQuery, setBooleanQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"hybrid" | "semantic" | "boolean">("hybrid");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [step, setStep] = useState(0);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setStep(1);
    setResult(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode: searchMode, boolean_query: booleanQuery }),
      });
      const data: SearchResult = await res.json();
      setStep(4);
      setResult(data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }, [query, searchMode, booleanQuery, projectId]);

  const triageColors: Record<string, string> = {
    priority_read: "border-red-200 text-red-700 bg-red-50",
    quick_browse: "border-amber-200 text-amber-700 bg-amber-50",
    skip: "border-slate-200 text-slate-500 bg-slate-50",
  };

  const triageLabels: Record<string, string> = {
    priority_read: "优先精读",
    quick_browse: "快速浏览",
    skip: "暂不纳入",
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
          <h1 className="text-xl font-medium text-[#202124]">文献发现与候选集构建</h1>
        </div>
        <p className="text-sm text-[#5F6368] ml-[18px]">通过双通道混合检索，从多源学术数据库中发现相关文献</p>
      </div>

      {/* Search Input — Chat-like */}
      <Card className="mb-6 border-[#DADCE0] rounded-xl shadow-sm">
        <CardContent className="pt-5">
          <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as "hybrid" | "semantic" | "boolean")}>
            <TabsList className="mb-4 bg-[#F8F9FA] rounded-xl">
              <TabsTrigger value="hybrid" className="text-xs rounded-lg data-[state=active]:bg-white">
                <Sparkles className="h-3 w-3 mr-1" /> 混合检索
              </TabsTrigger>
              <TabsTrigger value="semantic" className="text-xs rounded-lg data-[state=active]:bg-white">
                <Search className="h-3 w-3 mr-1" /> AI语义检索
              </TabsTrigger>
              <TabsTrigger value="boolean" className="text-xs rounded-lg data-[state=active]:bg-white">
                <Search className="h-3 w-3 mr-1" /> 专家布尔检索
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hybrid" className="mt-0">
              <Textarea
                placeholder="用自然语言描述你的研究问题，如：大语言模型在医疗诊断中的应用挑战与局限性"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={3}
                className="mb-3 resize-none rounded-xl"
              />
              <p className="text-xs text-[#5F6368] mb-3">系统将同时使用AI语义检索和布尔检索双通道，最大化召回率</p>
            </TabsContent>

            <TabsContent value="semantic" className="mt-0">
              <Textarea
                placeholder="用自然语言描述你的研究问题..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={3}
                className="mb-3 resize-none rounded-xl"
              />
              <p className="text-xs text-[#5F6368] mb-3">AI语义检索：将自然语言转化为向量召回，适合探索性研究</p>
            </TabsContent>

            <TabsContent value="boolean" className="mt-0">
              <Textarea
                placeholder="描述你的研究问题（可选，用于辅助理解）..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={2}
                className="mb-3 resize-none rounded-xl"
              />
              <Input
                placeholder="布尔检索表达式，如：large language model AND healthcare AND (diagnosis OR treatment) NOT survey"
                value={booleanQuery}
                onChange={(e) => setBooleanQuery(e.target.value)}
                className="mb-3 rounded-xl"
              />
              <p className="text-xs text-[#5F6368] mb-3">使用AND/OR/NOT精确控制检索条件</p>
            </TabsContent>

            <Button
              className="w-full bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl"
              onClick={handleSearch}
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  检索中...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  开始检索
                </>
              )}
            </Button>
          </Tabs>
        </CardContent>
      </Card>

      {/* Progress Steps */}
      {loading && (
        <Card className="mb-6 border-[#DADCE0] bg-[#F8F9FA] rounded-xl shadow-sm">
          <CardContent className="pt-5">
            <div className="space-y-3">
              {[
                { n: 1, label: "查询理解与扩展", desc: "意图拆解、同义词扩展" },
                { n: 2, label: "双通道检索执行", desc: "AI语义 + 布尔检索" },
                { n: 3, label: "AI分诊评估", desc: "相关性评分、质量评分、分诊分类" },
                { n: 4, label: "候选集构建完成", desc: "合并去重、保留来源" },
              ].map((s) => (
                <div key={s.n} className="flex items-center gap-3">
                  {step >= s.n ? (
                    <CheckCircle2 className="h-4 w-4 text-[#1a73e8] shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-[#DADCE0] shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm ${step >= s.n ? "text-[#202124] font-medium" : "text-[#9AA0A6]"}`}>{s.label}</p>
                    <p className="text-xs text-[#9AA0A6]">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Query Expansion */}
          {result.query_expansion && (
            <Card className="border-[#DADCE0] rounded-xl shadow-sm">
              <CardContent className="pt-5">
                <h3 className="text-sm font-medium text-[#202124] mb-3">查询理解与扩展</h3>
                {result.query_expansion.intent && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {Object.entries(result.query_expansion.intent).map(([key, val]) => (
                      <div key={key} className="bg-[#F8F9FA] rounded-xl p-2">
                        <p className="text-[10px] text-[#9AA0A6] uppercase">{key}</p>
                        <p className="text-xs text-[#202124] truncate">{val || "-"}</p>
                      </div>
                    ))}
                  </div>
                )}
                {result.query_expansion.expanded_queries && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.query_expansion.expanded_queries.map((q, i) => (
                      <Badge key={i} variant="outline" className="text-xs rounded-full">{q}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Triage Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-red-700">{result.triage_summary.priority_read}</p>
              <p className="text-xs text-red-600 mt-0.5">优先精读</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-amber-700">{result.triage_summary.quick_browse}</p>
              <p className="text-xs text-amber-600 mt-0.5">快速浏览</p>
            </div>
            <div className="bg-slate-50 border border-[#DADCE0] rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-[#5F6368]">{result.triage_summary.skip}</p>
              <p className="text-xs text-[#5F6368] mt-0.5">暂不纳入</p>
            </div>
          </div>

          {/* Paper List */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#202124]">
              候选论文池（共 {result.total_found} 篇）
            </h3>
            {result.papers.map((paper, i) => (
              <Card key={i} className="border-[#DADCE0] hover:bg-[#F8F9FA] transition-colors rounded-xl shadow-sm">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`${triageColors[paper.triage_level]} text-[10px] rounded-full`}>
                          {triageLabels[paper.triage_level]}
                        </Badge>
                        <span className="text-[10px] text-[#9AA0A6]">{paper.source}</span>
                      </div>
                      <h4 className="text-sm font-medium text-[#202124] mb-1 line-clamp-2">
                        {paper.title}
                      </h4>
                      <p className="text-xs text-[#5F6368] line-clamp-2 mb-2">{paper.abstract}</p>
                      {paper.triage_reason && (
                        <p className="text-xs text-[#9AA0A6] italic">分诊理由: {paper.triage_reason}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-[#5F6368] space-y-1">
                        <div>相关性 <span className="font-medium text-[#202124]">{paper.relevance_score}</span></div>
                        <div>质量 <span className="font-medium text-[#202124]">{paper.quality_score}</span></div>
                        <Badge variant="outline" className={`text-[10px] rounded-full ${paper.confidence === "high" ? "border-green-300 text-green-700" : paper.confidence === "medium" ? "border-amber-300 text-amber-700" : "border-red-300 text-red-700"}`}>
                          {paper.confidence === "high" ? "高置信" : paper.confidence === "medium" ? "中置信" : "低置信"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Next Stage */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              className="rounded-xl border-[#DADCE0]"
              onClick={() => window.location.href = `/project/${projectId}/screening`}
            >
              进入阶段02: 筛选分类
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}