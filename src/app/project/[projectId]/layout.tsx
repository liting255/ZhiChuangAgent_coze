"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, FileText, Database, FlaskConical, ArrowLeft, BookOpen } from "lucide-react";

const stages = [
  { id: "discover", label: "文献发现", icon: Search, color: "#2563EB" },
  { id: "screening", label: "筛选分类", icon: FileText, color: "#7C3AED" },
  { id: "library", label: "知识入库", icon: Database, color: "#0F766E" },
  { id: "evidence", label: "证据综合", icon: FlaskConical, color: "#D97706" },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const projectId = params.projectId as string;

  const currentStage = stages.find((s) => pathname.includes(`/${s.id}`));

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar — NotebookLM style */}
      <aside className="w-56 border-r border-[#DADCE0] bg-[#F8F9FA] flex flex-col shrink-0">
        {/* Back */}
        <div className="px-4 py-4 border-b border-[#E8EAED]">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm text-[#5F6368] hover:text-[#202124] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回工作台
          </button>
        </div>

        {/* Pipeline stages */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="text-[11px] font-medium text-[#5F6368] uppercase tracking-wider px-3 mb-3">
            四阶段流水线
          </p>
          {stages.map((stage, i) => {
            const isActive = currentStage?.id === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => router.push(`/project/${projectId}/${stage.id}`)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                  isActive
                    ? "bg-white shadow-sm border border-[#DADCE0]"
                    : "hover:bg-[#E8EAED]/50 border border-transparent"
                )}
              >
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <div className="min-w-0">
                  <p className={cn(
                    "text-sm truncate",
                    isActive ? "text-[#202124] font-medium" : "text-[#5F6368]"
                  )}>
                    {stage.label}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-[#E8EAED]">
          <div className="flex items-center gap-2 text-xs text-[#9AA0A6]">
            <BookOpen className="h-3 w-3" />
            <span>智创Agent</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-white">
        {children}
      </main>
    </div>
  );
}