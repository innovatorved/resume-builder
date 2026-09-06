import { GoogleGenAI } from "@google/genai";

export function getGeminiApiKey(env?: Record<string, string | undefined>): string | null {
  return env?.GEMINI_API_KEY || process.env.GEMINI_API_KEY || null;
}

export function isGeminiConfigured(env?: Record<string, string | undefined>): boolean {
  return Boolean(getGeminiApiKey(env));
}

export function getGeminiClient(env?: Record<string, string | undefined>): GoogleGenAI {
  const apiKey = getGeminiApiKey(env);
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your Cloudflare secrets or environment."
    );
  }
  return new GoogleGenAI({ apiKey });
}
