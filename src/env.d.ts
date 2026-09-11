/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare namespace App {
  interface Locals {
    user?: import("better-auth").User;
    session?: import("better-auth").Session;
    cfContext?: ExecutionContext;
    env?: {
      KNOWLEDGE_AGENT?: Fetcher;
      INTERNAL_SERVICE_KEY?: string;
      KNOWLEDGE_AGENT_URL?: string;
      [key: string]: unknown;
    };
    runtime?: {
      env: {
        KNOWLEDGE_AGENT?: Fetcher;
        INTERNAL_SERVICE_KEY?: string;
        KNOWLEDGE_AGENT_URL?: string;
      };
    };
  }
}
