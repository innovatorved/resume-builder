import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ResumeData } from "@/types/resume";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DOWNLOAD_BUTTON_BASE_CLASSES = "h-auto px-8 py-5 text-lg font-semibold gap-3";

/**
 * Extracts a JSON object string from raw LLM output (stripping markdown fences or surrounding prose).
 */
export function cleanJsonText(raw: string): string {
  const text = raw.trim();
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }
  return text;
}

/**
 * Safely parses stored resume JSON data whether returned as a string or pre-parsed object.
 */
export function parseResumeData(data: unknown): ResumeData {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as ResumeData;
    } catch {
      return data as unknown as ResumeData;
    }
  }
  return data as ResumeData;
}
