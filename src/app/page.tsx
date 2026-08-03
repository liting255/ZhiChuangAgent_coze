"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Search, FileText, Brain, Database, FlaskConical } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  research_question: string | null;
  status: string;
  created_at: string;
  paper_count?: number;
}

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          research_question: newQuestion.trim(),
          description: newDesc.trim(),
        }),
      });
      const data = await res.json();
      if (data.project) {
        setDialogOpen(false);
        setNewName("");
        setNewQuestion("");
        setNewDesc("");
        router.push(`/project/${data.project.id}/discover`);
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreating(false);
    }
  };

  const stageIcons = [
    { icon: Search, color: "text-blue-600", bg: "bg-blue-50", label: "文献发现" },
    { icon: FileText, color: "text-violet-600", bg: "bg-violet-50", label: "筛选分类" },
    { icon: Database, color: "text-teal-700", bg: "bg-teal-50", label: "知识入库" },
    { icon: FlaskConical, color: "text-amber-600", bg: "bg-amber-50", label: "证据综合" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">智创Agent</h1>
              <p className="text-xs text-slate-500">科研文献检索与知识服务平台</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                新建研究项目
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>新建研究项目</DialogTitle>
                <DialogDescription>输入你的研究方向，开始文献检索之旅</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">项目名称</label>
                  <Input
                    placeholder="如：大语言模型在医疗领域的应用"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">研究问题</label>
                  <Textarea
                    placeholder="用自然语言描述你的研究方向、目标对象、任务边界..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">项目描述（可选）</label>
                  <Textarea
                    placeholder="简要描述项目背景..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                >
                  {creating ? "创建中..." : "创建并开始检索"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Pipeline Overview */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-slate-500 mb-3">四阶段流水线</h2>
          <div className="grid grid-cols-4 gap-3">
            {stageIcons.map((stage, i) => (
              <div key={i} className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg">
                <div className={`h-8 w-8 rounded flex items-center justify-center ${stage.bg}`}>
                  <stage.icon className={`h-4 w-4 ${stage.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">阶段 {i + 1}</p>
                  <p className="text-sm font-medium">{stage.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project List */}
        <div>
          <h2 className="text-sm font-medium text-slate-500 mb-3">研究项目</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 bg-white border border-slate-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500 mb-4">还没有研究项目</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  创建第一个项目
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:border-blue-300 transition-colors border-slate-200"
                  onClick={() => router.push(`/project/${project.id}/discover`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {project.status === "active" ? "进行中" : project.status}
                      </Badge>
                    </div>
                    {project.research_question && (
                      <CardDescription className="line-clamp-2">
                        {project.research_question}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>文献 {project.paper_count ?? 0} 篇</span>
                      <span>{new Date(project.created_at).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
