"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Search, Brain } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  research_question: string | null;
  status: string;
  created_at: string;
  paper_count?: number;
}

const stageColors = ["#2563EB", "#7C3AED", "#0F766E", "#D97706"];
const stageLabels = ["文献发现", "筛选分类", "知识入库", "证据综合"];

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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[#DADCE0] bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#1a73e8] flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-medium tracking-tight text-[#202124]">智创Agent</h1>
              <p className="text-xs text-[#5F6368]">科研文献检索与知识服务平台</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl">
                <Plus className="h-4 w-4 mr-1" />
                新建研究项目
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-xl">
              <DialogHeader>
                <DialogTitle>新建研究项目</DialogTitle>
                <DialogDescription>输入你的研究方向，开始文献检索之旅</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-[#202124] mb-1 block">项目名称</label>
                  <Input
                    placeholder="如：大语言模型在医疗领域的应用"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#202124] mb-1 block">研究问题</label>
                  <Textarea
                    placeholder="用自然语言描述你的研究方向、目标对象、任务边界..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    rows={3}
                    className="rounded-xl resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#202124] mb-1 block">项目描述（可选）</label>
                  <Textarea
                    placeholder="简要描述项目背景..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={2}
                    className="rounded-xl resize-none"
                  />
                </div>
                <Button
                  className="w-full bg-[#1a73e8] hover:bg-[#1557b0] rounded-xl"
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
      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Pipeline Overview — subtle dots */}
        <div className="mb-10">
          <h2 className="text-xs font-medium text-[#5F6368] uppercase tracking-wider mb-4">四阶段流水线</h2>
          <div className="flex items-center gap-2">
            {stageLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: stageColors[i] }}
                />
                <span className="text-sm text-[#5F6368]">{label}</span>
                {i < stageLabels.length - 1 && (
                  <div className="w-8 h-px bg-[#DADCE0] mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Project List */}
        <div>
          <h2 className="text-xs font-medium text-[#5F6368] uppercase tracking-wider mb-4">研究项目</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-[#F8F9FA] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed border-[#DADCE0] rounded-xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-10 w-10 text-[#DADCE0] mb-3" />
                <p className="text-sm text-[#5F6368] mb-4">还没有研究项目</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  创建第一个项目
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:bg-[#F8F9FA] transition-colors border-[#DADCE0] rounded-xl shadow-sm"
                  onClick={() => router.push(`/project/${project.id}/discover`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base font-medium text-[#202124]">{project.name}</h3>
                      <Badge variant="secondary" className="text-xs rounded-full">
                        {project.status === "active" ? "进行中" : project.status}
                      </Badge>
                    </div>
                    {project.research_question && (
                      <p className="text-sm text-[#5F6368] line-clamp-2 mb-3">
                        {project.research_question}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-[#9AA0A6]">
                      <span className="flex items-center gap-1">
                        <Search className="h-3 w-3" />
                        文献 {project.paper_count ?? 0} 篇
                      </span>
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