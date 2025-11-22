"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X, ChevronUp, ChevronDown } from "lucide-react";
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

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {/* Widget Container - pointer events allowed on children */}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 pointer-events-auto transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
            isMinimized ? "w-72 h-14" : "w-[350px] sm:w-[400px] h-[600px] max-h-[80vh]"
          )}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-3 bg-blue-600 text-white cursor-pointer select-none"
            onClick={toggleMinimize}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-blue-700/50"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMinimize();
                }}
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-blue-700/50"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content - Only rendered when not minimized */}
          <div className={cn("flex-1 overflow-hidden", isMinimized && "hidden")}>
             <ResumeChat resumeData={resumeData} onUpdate={onUpdate} />
          </div>
        </div>
      )}

      {/* Floating Action Button (Toggle) */}
      {!isOpen && (
        <Button
          onClick={toggleOpen}
          size="icon"
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 hover:scale-105 transition-all pointer-events-auto"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}
