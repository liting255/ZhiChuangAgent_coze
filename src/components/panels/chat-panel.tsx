"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, ChatMessageData } from "./chat-message";
import {
  Send,
  Sparkles,
  BookOpen,
  FilePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  projectId: string;
  selectedPaperIds: string[];
  selectedPaperTitles: string[];
  onSaveToNotes: (content: string, title: string) => void;
  className?: string;
}

export function ChatPanel({
  projectId,
  selectedPaperIds,
  selectedPaperTitles,
  onSaveToNotes,
  className,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessageData = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: input.trim(),
          paperIds: selectedPaperIds,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE format
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
            } catch {
              // Plain text chunk
              fullContent += data;
              setStreamingContent(fullContent);
            }
          }
        }
      }

      const assistantMessage: ChatMessageData = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: fullContent,
        timestamp: new Date().toISOString(),
        sources: selectedPaperIds.map((id, i) => ({
          id,
          title: selectedPaperTitles[i] || id,
        })),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessageData = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "抱歉，对话请求失败。请稍后重试。",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, projectId, selectedPaperIds, selectedPaperTitles, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveToNotes = (content: string) => {
    // Extract a title from the first line or first 50 chars
    const firstLine = content.split("\n")[0].replace(/^#+\s*/, "");
    const title = firstLine.slice(0, 50) || "未命名笔记";
    onSaveToNotes(content, title);
  };

  const handleRegenerate = () => {
    if (messages.length < 2) return;
    // Remove last assistant message and resend
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setMessages((prev) => prev.slice(0, -1));
      setInput(lastUserMsg.content);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingContent("");
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E8EAED] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#1a73e8]" />
          <h2 className="text-sm font-medium text-[#202124]">AI 研究助手</h2>
          {selectedPaperIds.length > 0 && (
            <span className="text-[10px] text-[#1a73e8] bg-[#E8F0FE] px-2 py-0.5 rounded-full">
              基于 {selectedPaperIds.length} 篇文献
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-[#5F6368] hover:text-[#202124] rounded-lg"
            onClick={clearChat}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            清空对话
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="px-4 py-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 rounded-full bg-[#E8F0FE] flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-[#1a73e8]" />
              </div>
              <h3 className="text-sm font-medium text-[#202124] mb-1">
                开始研究对话
              </h3>
              <p className="text-xs text-[#5F6368] text-center max-w-xs">
                {selectedPaperIds.length === 0
                  ? "在左侧面板选择文献后，即可基于文献内容进行深度对话"
                  : `已选择 ${selectedPaperIds.length} 篇文献，可以开始提问了`}
              </p>
              {selectedPaperIds.length === 0 && (
                <div className="mt-4 flex items-center gap-1 text-[10px] text-[#9AA0A6]">
                  <BookOpen className="h-3 w-3" />
                  请先在左侧勾选文献源
                </div>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onSaveToNotes={handleSaveToNotes}
              onRegenerate={msg.role === "assistant" ? handleRegenerate : undefined}
            />
          ))}

          {/* Streaming message */}
          {loading && streamingContent && (
            <ChatMessage
              message={{
                id: "streaming",
                role: "assistant",
                content: streamingContent,
                timestamp: new Date().toISOString(),
                sources: selectedPaperIds.map((id, i) => ({
                  id,
                  title: selectedPaperTitles[i] || id,
                })),
              }}
            />
          )}

          {loading && !streamingContent && (
            <div className="flex items-center gap-2 px-4 py-3">
              <Loader2 className="h-4 w-4 text-[#1a73e8] animate-spin" />
              <span className="text-xs text-[#5F6368]">正在思考...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-[#E8EAED] shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            placeholder={
              selectedPaperIds.length === 0
                ? "请先在左侧选择文献..."
                : "基于选中文献提问，或输入 /save 沉淀为文档..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={selectedPaperIds.length === 0}
            className="resize-none text-sm rounded-xl border-[#DADCE0] focus-visible:ring-[#1a73e8] min-h-[44px]"
          />
          <Button
            size="icon"
            className="h-9 w-9 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] shrink-0"
            onClick={handleSend}
            disabled={loading || !input.trim() || selectedPaperIds.length === 0}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-[#9AA0A6] hover:text-[#1a73e8] rounded-lg"
            onClick={() => {
              if (messages.length > 0) {
                const lastContent = messages[messages.length - 1].content;
                handleSaveToNotes(lastContent);
              }
            }}
            disabled={messages.length === 0}
          >
            <FilePlus className="h-3 w-3 mr-1" />
            沉淀为文档
          </Button>
          <span className="text-[10px] text-[#DADCE0]">|</span>
          <span className="text-[10px] text-[#9AA0A6]">
            输入 /save 可将当前回答保存为笔记
          </span>
        </div>
      </div>
    </div>
  );
}