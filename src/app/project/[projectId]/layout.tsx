"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, FileText, Database, FlaskConical, ArrowLeft, BookOpen } from "lucide-react";

const stages = [
  { id: "discover", label: "文献发现", sublabel: "双通道检索", icon: Search, color: "#2563EB" },
  { id: "screening", label: "筛选分类", sublabel: "AI分诊 + 人工确认", icon: FileText, color: "#7C3AED" },
  { id: "library", label: "知识入库", sublabel: "结构化 + 向量化", icon: Database, color: "#0F766E" },
  { id: "evidence", label: "证据综合", sublabel: "二次检索 + 迭代", icon: FlaskConical, color: "#D97706" },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const projectId = params.projectId as string;

  const currentStage = stages.find((s) => pathname.includes(`/${s.id}`));

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-slate-200 bg-white flex flex-col">
        {/* Back */}
        <div className="p-4 border-b border-slate-100">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回工作台
          </button>
        </div>

        {/* Pipeline stages */}
        <nav className="flex-1 p-3 space-y-1">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider px-3 mb-2">
            四阶段流水线
          </p>
          {stages.map((stage, i) => {
            const isActive = currentStage?.id === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => router.push(`/project/${projectId}/${stage.id}`)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                  isActive
                    ? "bg-slate-50 border border-slate-200"
                    : "hover:bg-slate-50 border border-transparent"
                )}
              >
                <div
                  className="h-7 w-7 rounded flex items-center justify-center shrink-0"
                  style={{ backgroundColor: isActive ? stage.color + "15" : "#f8fafc" }}
                >
                  <stage.icon
                    className="h-3.5 w-3.5"
                    style={{ color: isActive ? stage.color : "#94a3b8" }}
                  />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-sm font-medium truncate", isActive ? "text-slate-900" : "text-slate-600")}>
                    <span className="text-[10px] text-slate-400 mr-1">{String(i + 1).padStart(2, "0")}</span>
                    {stage.label}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{stage.sublabel}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <BookOpen className="h-3 w-3" />
            <span>智创Agent v1.0</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
