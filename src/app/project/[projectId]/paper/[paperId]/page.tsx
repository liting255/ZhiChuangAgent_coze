"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, BookOpen, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Term {
  id: string;
  term: string;
  translation: string | null;
  explanation: string | null;
}

interface Note {
  id: string;
  content: string;
  confirmed: boolean;
  created_at: string;
}

interface Paper {
  id: string;
  title: string;
  url: string;
  abstract: string | null;
  source: string;
  doi: string | null;
  triage_level: string;
  triage_reason: string | null;
  relevance_score: number;
  quality_score: number;
  confidence: string;
  ai_summary: string | null;
  evidence: {
    method?: string;
    data?: string;
    conclusion?: string;
    limitation?: string;
  } | null;
  human_confirmed: boolean;
}

export default function PaperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const paperId = params.paperId as string;

  const [paper, setPaper] = useState<Paper | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPaper = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/papers/${paperId}`);
      const data = await res.json();
      setPaper(data.paper);
      setTerms(data.terms || []);
      setNotes(data.notes || []);
    } catch (err) {
      console.error("Failed to fetch paper:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, paperId]);

  useEffect(() => {
    fetchPaper();
  }, [fetchPaper]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          <div className="h-32 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-center">
        <p className="text-slate-500">文献不存在</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      {/* Title & Meta */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className={
            paper.triage_level === "priority_read" ? "border-red-200 text-red-700 bg-red-50" :
            paper.triage_level === "quick_browse" ? "border-amber-200 text-amber-700 bg-amber-50" :
            "border-slate-200 text-slate-500 bg-slate-50"
          }>
            {paper.triage_level === "priority_read" ? "优先精读" : paper.triage_level === "quick_browse" ? "快速浏览" : "暂不纳入"}
          </Badge>
          {paper.confidence === "low" && (
            <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
              <AlertTriangle className="h-3 w-3 mr-1" /> 低置信度
            </Badge>
          )}
          {paper.human_confirmed && (
            <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">已人工确认</Badge>
          )}
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">{paper.title}</h1>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>来源: {paper.source}</span>
          <span>相关性: {paper.relevance_score}</span>
          <span>质量: {paper.quality_score}</span>
          {paper.doi && (
            <a href={paper.doi} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
              DOI <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {paper.url && (
            <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5">
              原文链接 <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* AI Summary */}
      {paper.ai_summary && (
        <Card className="mb-4 border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4">
            <h3 className="text-xs font-medium text-blue-800 mb-2 flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> AI通俗化摘要
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">{paper.ai_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Evidence */}
      {paper.evidence && (
        <Card className="mb-4 border-slate-200">
          <CardContent className="pt-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3">证据抽取</h3>
            <div className="grid grid-cols-2 gap-3">
              {paper.evidence.method && (
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-[10px] text-slate-400 uppercase mb-1">研究方法</p>
                  <p className="text-xs text-slate-700">{paper.evidence.method}</p>
                </div>
              )}
              {paper.evidence.data && (
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-[10px] text-slate-400 uppercase mb-1">数据</p>
                  <p className="text-xs text-slate-700">{paper.evidence.data}</p>
                </div>
              )}
              {paper.evidence.conclusion && (
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-[10px] text-slate-400 uppercase mb-1">结论</p>
                  <p className="text-xs text-slate-700">{paper.evidence.conclusion}</p>
                </div>
              )}
              {paper.evidence.limitation && (
                <div className="bg-slate-50 rounded p-3">
                  <p className="text-[10px] text-slate-400 uppercase mb-1">局限性</p>
                  <p className="text-xs text-slate-700">{paper.evidence.limitation}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terms */}
      {terms.length > 0 && (
        <Card className="mb-4 border-slate-200">
          <CardContent className="pt-4">
            <h3 className="text-sm font-medium text-slate-700 mb-3">术语解释</h3>
            <div className="space-y-2">
              {terms.map((term) => (
                <div key={term.id} className="flex items-start gap-3 p-2 bg-slate-50 rounded">
                  <div className="shrink-0">
                    <p className="text-sm font-medium text-slate-900">{term.term}</p>
                    {term.translation && <p className="text-xs text-blue-600">{term.translation}</p>}
                  </div>
                  {term.explanation && (
                    <p className="text-xs text-slate-600">{term.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abstract */}
      {paper.abstract && (
        <Card className="mb-4 border-slate-200">
          <CardContent className="pt-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">原文摘要</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{paper.abstract}</p>
          </CardContent>
        </Card>
      )}

      {/* Triage Reason */}
      {paper.triage_reason && (
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <h3 className="text-sm font-medium text-slate-700 mb-2">分诊理由</h3>
            <p className="text-xs text-slate-600 italic">{paper.triage_reason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
