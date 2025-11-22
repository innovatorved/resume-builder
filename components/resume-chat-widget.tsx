"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Minus, Maximize2 } from "lucide-react";
import type { ResumeData } from "@/types/resume";
import { ResumeChat } from "@/components/resume-chat";
import { cn } from "@/lib/utils";

interface ResumeChatWidgetProps {
  resumeData: ResumeData;
  onUpdate: (data: ResumeData) => void;
}

export function ResumeChatWidget({ resumeData, onUpdate }: ResumeChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={toggleOpen}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 hover:scale-105 transition-all z-50 flex items-center justify-center"
      >
        <Sparkles className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed right-4 z-50 flex flex-col items-end transition-all duration-300 ease-in-out font-sans",
        isMinimized ? "bottom-0" : "bottom-0"
      )}
    >
      <div
        className={cn(
          "bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col transition-all duration-300",
          isMinimized
            ? "w-64 h-10 rounded-t-lg" // Tab style
            : "w-[380px] sm:w-[450px] h-[600px] max-h-[85vh] rounded-t-xl mb-0" // Window style stuck to bottom
        )}
      >
        {/* Window Header */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 cursor-pointer select-none"
          onClick={toggleMinimize}
        >
          {/* Title Area */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Chat</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMinimize();
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-gray-400 transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="p-1 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 rounded text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chat Content */}
        {!isMinimized && (
          <div className="flex-1 overflow-hidden">
             <ResumeChat resumeData={resumeData} onUpdate={onUpdate} />
          </div>
        )}
      </div>
    </div>
  );
}
