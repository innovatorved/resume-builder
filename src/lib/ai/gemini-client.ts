import { GoogleGenAI } from "@google/genai";
import { getSyncCloudflareEnv } from "@/lib/cloudflare-env";

// biome-ignore lint/suspicious/noExplicitAny: Environment bindings can come from multiple runtimes
export function getGeminiApiKey(contextOrEnv?: any): string | null {
  const env = getSyncCloudflareEnv(contextOrEnv?.locals || contextOrEnv);

  const key =
    env?.GEMINI_API_KEY ||
    (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.GEMINI_API_KEY) ||
    (globalThis as any)?.__env__?.GEMINI_API_KEY ||
    (globalThis as any)?.env?.GEMINI_API_KEY ||
    (globalThis as any)?.GEMINI_API_KEY ||
    null;

  return key;
}

// biome-ignore lint/suspicious/noExplicitAny: Environment bindings can come from multiple runtimes
export function isGeminiConfigured(contextOrEnv?: any): boolean {
  return Boolean(getGeminiApiKey(contextOrEnv));
}

// biome-ignore lint/suspicious/noExplicitAny: Environment bindings can come from multiple runtimes
export function getGeminiClient(contextOrEnv?: any): GoogleGenAI {
  const apiKey = getGeminiApiKey(contextOrEnv);
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your Cloudflare secrets or environment."
    );
  }
  return new GoogleGenAI({ apiKey });
}
