"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FlaskConical, Loader2, AlertTriangle, CheckCircle2, RefreshCw, Download } from "lucide-react";

interface SynthesisResult {
  synthesis?: string;
  comparison_matrix?: Array<{ paper: string; method: string; result: string; limitation: string }>;
  consensus?: string;
  conflicts?: string;
  evidence_sufficient?: boolean;
  suggestions?: string;
  reading_path?: string[];
}

interface EvidenceResponse {
  constraints: Record<string, string>;
  additional_results: Array<{ title: string; url: string; snippet: string }>;
  synthesis: SynthesisResult;
  kb_paper_count: number;
}

export default function EvidencePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [evidenceQuery, setEvidenceQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvidenceResponse | null>(null);
  const [iteration, setIteration] = useState(0);

  const handleSearch = async () => {
    if (!evidenceQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evidence_search", evidence_query: evidenceQuery }),
      });
      const data: EvidenceResponse = await res.json();
      setResult(data);
      setIteration((prev) => prev + 1);
    } catch (err) {
      console.error("Evidence search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = () => {
    // Feedback loop: adjust constraints and re-search
    setEvidenceQuery((prev) => prev + "，请补充更多近期文献和不同方法论的对比");
    setResult(null);
  };

  const handleExport = async () => {
    const res = await fetch(`/api/projects/${projectId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "markdown" }),
    });
    const data = await res.json();
    if (data.content) {
      const blob = new Blob([data.content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evidence-report-${projectId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-medium">04</div>
          <h1 className="text-xl font-semibold">需求驱动的二次检索与证据综合</h1>
        </div>
        <p className="text-sm text-slate-500 ml-8">基于知识库的场景化检索，迭代优化直至证据充分</p>
      </div>

      {/* Evidence Query */}
      <Card className="mb-6 border-slate-200">
        <CardContent className="pt-5">
          <label className="text-sm font-medium text-slate-700 mb-2 block">具体证据需求</label>
          <Textarea
            placeholder="例：充电站时序预测场景中，哪些方法在准确率上表现最优？不同方法的数据集和局限性如何？"
            value={evidenceQuery}
            onChange={(e) => setEvidenceQuery(e.target.value)}
            rows={3}
            className="mb-3 resize-none"
          />
          <div className="flex gap-2">
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleSearch}
              disabled={loading || !evidenceQuery.trim()}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 综合中...</>
              ) : (
                <><FlaskConical className="h-4 w-4 mr-2" /> 证据综合</>
              )}
            </Button>
            {result && !result.synthesis.evidence_sufficient && (
              <Button variant="outline" onClick={handleRefine}>
                <RefreshCw className="h-4 w-4 mr-2" /> 调整约束/补充检索
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Constraints Parsed */}
          {result.constraints && Object.keys(result.constraints).length > 0 && (
            <Card className="border-slate-200">
              <CardContent className="pt-5">
                <h3 className="text-sm font-medium text-slate-700 mb-2">需求解析与场景约束</h3>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(result.constraints).map(([key, val]) => (
                    <div key={key} className="bg-slate-50 rounded p-2">
                      <p className="text-[10px] text-slate-400 uppercase">
                        {key === "object" ? "对象" : key === "time_range" ? "时间" : key === "method_focus" ? "方法" : "输出"}
                      </p>
                      <p className="text-xs text-slate-700 truncate">{val || "-"}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evidence Sufficiency */}
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            result.synthesis.evidence_sufficient
              ? "bg-green-50 border-green-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            {result.synthesis.evidence_sufficient ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${result.synthesis.evidence_sufficient ? "text-green-800" : "text-amber-800"}`}>
                {result.synthesis.evidence_sufficient ? "证据充分" : "证据不充分"}
              </p>
              {result.synthesis.suggestions && !result.synthesis.evidence_sufficient && (
                <p className="text-xs text-amber-700 mt-0.5">{result.synthesis.suggestions as string}</p>
              )}
            </div>
          </div>

          {/* Synthesis */}
          {result.synthesis.synthesis && (
            <Card className="border-slate-200">
              <CardContent className="pt-5">
                <h3 className="text-sm font-medium text-slate-700 mb-3">跨论文证据综合</h3>
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {result.synthesis.synthesis}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Consensus & Conflicts */}
          <div className="grid grid-cols-2 gap-3">
            {result.synthesis.consensus && (
              <Card className="border-green-200 bg-green-50/30">
                <CardContent className="pt-4">
                  <h4 className="text-xs font-medium text-green-800 mb-1">共识</h4>
                  <p className="text-xs text-green-700">{result.synthesis.consensus}</p>
                </CardContent>
              </Card>
            )}
            {result.synthesis.conflicts && (
              <Card className="border-red-200 bg-red-50/30">
                <CardContent className="pt-4">
                  <h4 className="text-xs font-medium text-red-800 mb-1">分歧/冲突</h4>
                  <p className="text-xs text-red-700">{result.synthesis.conflicts}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Comparison Matrix */}
          {result.synthesis.comparison_matrix && result.synthesis.comparison_matrix.length > 0 && (
            <Card className="border-slate-200">
              <CardContent className="pt-5">
                <h3 className="text-sm font-medium text-slate-700 mb-3">方法与结果比较矩阵</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 pr-3 font-medium text-slate-500">论文</th>
                        <th className="text-left py-2 pr-3 font-medium text-slate-500">方法</th>
                        <th className="text-left py-2 pr-3 font-medium text-slate-500">结果</th>
                        <th className="text-left py-2 font-medium text-slate-500">局限</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.synthesis.comparison_matrix.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-2 pr-3 text-slate-900 max-w-[200px] truncate">{row.paper}</td>
                          <td className="py-2 pr-3 text-slate-600">{row.method}</td>
                          <td className="py-2 pr-3 text-slate-600">{row.result}</td>
                          <td className="py-2 text-slate-600">{row.limitation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reading Path */}
          {result.synthesis.reading_path && result.synthesis.reading_path.length > 0 && (
            <Card className="border-slate-200">
              <CardContent className="pt-5">
                <h3 className="text-sm font-medium text-slate-700 mb-3">推荐阅读路径</h3>
                <ol className="space-y-1.5">
                  {result.synthesis.reading_path.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-700">
                      <span className="h-5 w-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-medium shrink-0">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Iteration Info */}
          <p className="text-xs text-slate-400 text-center">
            第 {iteration} 次迭代 | 知识库 {result.kb_paper_count} 篇 + 新检索 {result.additional_results.length} 篇
          </p>

          {/* Export */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              导出证据报告
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
