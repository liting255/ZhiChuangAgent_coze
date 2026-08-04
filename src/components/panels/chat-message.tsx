"use client";

import { cn } from "@/lib/utils";
import { Copy, RefreshCw, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: { id: string; title: string }[];
}

interface ChatMessageProps {
  message: ChatMessageData;
  onSaveToNotes?: (content: string) => void;
  onRegenerate?: () => void;
}

export function ChatMessage({
  message,
  onSaveToNotes,
  onRegenerate,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%]", isUser ? "order-1" : "order-1")}>
        {/* Message bubble */}
        <div
          className={cn(
            "px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-[#E8F0FE] text-[#202124] rounded-2xl rounded-br-md"
              : "bg-white border border-[#DADCE0] text-[#202124] rounded-2xl rounded-bl-md"
          )}
        >
          {/* Simple markdown rendering */}
          <div
            className="prose prose-sm max-w-none prose-headings:text-[#202124] prose-p:text-[#202124] prose-a:text-[#1a73e8] prose-strong:text-[#202124] prose-code:text-[#5F6368] prose-code:bg-[#F1F3F4] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs"
            dangerouslySetInnerHTML={{
              __html: message.content
                .replace(/\n\n/g, "</p><p>")
                .replace(/\n/g, "<br/>")
                .replace(/^(.+)$/gm, (line) => {
                  if (line.startsWith("### ")) {
                    return `<h3 class="text-base font-semibold mt-3 mb-1">${line.slice(4)}</h3>`;
                  }
                  if (line.startsWith("## ")) {
                    return `<h2 class="text-lg font-semibold mt-4 mb-2">${line.slice(3)}</h2>`;
                  }
                  if (line.startsWith("- ")) {
                    return `<li class="ml-4 list-disc">${line.slice(2)}</li>`;
                  }
                  if (/^\d+\.\s/.test(line)) {
                    return `<li class="ml-4 list-decimal">${line.replace(/^\d+\.\s/, "")}</li>`;
                  }
                  return line;
                })
                .replace(/<p><\/p>/g, "")
                .replace(
                  /\*\*(.+?)\*\*/g,
                  "<strong>$1</strong>"
                )
                .replace(
                  /`([^`]+)`/g,
                  "<code>$1</code>"
                ),
            }}
          />
        </div>

        {/* Action bar */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-1.5 ml-1">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[10px] text-[#9AA0A6] hover:text-[#5F6368] transition-colors px-1.5 py-0.5 rounded-md hover:bg-[#F1F3F4]"
            >
              <Copy className="h-3 w-3" />
              {copied ? "已复制" : "复制"}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="inline-flex items-center gap-1 text-[10px] text-[#9AA0A6] hover:text-[#5F6368] transition-colors px-1.5 py-0.5 rounded-md hover:bg-[#F1F3F4]"
              >
                <RefreshCw className="h-3 w-3" />
                重新生成
              </button>
            )}
            {onSaveToNotes && (
              <button
                onClick={() => onSaveToNotes(message.content)}
                className="inline-flex items-center gap-1 text-[10px] text-[#9AA0A6] hover:text-[#1a73e8] transition-colors px-1.5 py-0.5 rounded-md hover:bg-[#E8F0FE]"
              >
                <BookmarkPlus className="h-3 w-3" />
                沉淀为笔记
              </button>
            )}
          </div>
        )}

        {/* Sources citation */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-1.5 ml-1 flex flex-wrap gap-1">
            {message.sources.map((s) => (
              <span
                key={s.id}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F1F3F4] text-[#5F6368]"
              >
                {s.title.length > 20
                  ? s.title.slice(0, 20) + "..."
                  : s.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}