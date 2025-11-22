"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Bot, User } from "lucide-react";
import type { ResumeData } from "@/types/resume";
import { cn } from "@/lib/utils";

interface ResumeChatProps {
  resumeData: ResumeData;
  onUpdate: (data: ResumeData) => void;
}

export function ResumeChat({ resumeData, onUpdate }: ResumeChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    body: {
      currentResume: resumeData,
    },
    maxSteps: 5, // Allow multi-step interactions (e.g. tool call -> result -> response)
    onToolCall: async ({ toolCall }) => {
      if (toolCall.toolName === 'updateResume') {
        const updates = toolCall.args as Partial<ResumeData>;

        // Merge updates with current data
        // specific handling for arrays to replace or append?
        // For simplicity, we will replace arrays if provided, or merge objects.
        // But structured clone is safest for deep merge if needed,
        // however the tool definition suggests full array replacement for lists.

        const newData = {
            ...resumeData,
            ...updates,
            personalInfo: {
                ...resumeData.personalInfo,
                ...(updates.personalInfo || {})
            }
        };

        onUpdate(newData as ResumeData);

        // Return a success message to the AI
        return "Resume updated successfully.";
      }
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-gray-800 shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-blue-50/50 dark:bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Gemini 2.5</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden relative bg-gray-50/50 dark:bg-slate-950/50">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto p-4 space-y-4 scroll-smooth"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4 opacity-60">
                <Bot className="w-12 h-12 text-blue-500 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Hi! I can help you improve your resume. Ask me to rewrite your summary, fix typos, or suggest skills.
                </p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-3 max-w-[90%]",
                m.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                m.role === "user" ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700"
              )}>
                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-blue-600" />}
              </div>

              <div className={cn(
                "p-3 rounded-2xl text-sm shadow-sm",
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none"
              )}>
                {/* Check for tool invocations that don't have text content yet */}
                {m.content ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                ) : (
                    m.toolInvocations?.map(tool => (
                        <div key={tool.toolCallId} className="italic text-gray-500 flex items-center gap-2">
                             <Sparkles className="w-3 h-3 animate-spin" />
                             {tool.toolName === 'updateResume' ? 'Updating resume...' : 'Working...'}
                        </div>
                    ))
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
             <div className="flex gap-3 max-w-[80%]">
                 <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-blue-600" />
                 </div>
                 <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-tl-none shadow-sm">
                    <div className="flex gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                    </div>
                 </div>
             </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask AI to update your resume..."
            className="flex-1 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 focus-visible:ring-blue-500"
          />
          <Button
            type="submit"
            disabled={isLoading || !(input || '').trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
