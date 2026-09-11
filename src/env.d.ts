/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare namespace App {
  interface Locals {
    user?: import("better-auth").User;
    session?: import("better-auth").Session;
    runtime?: { env: { KNOWLEDGE_AGENT?: Fetcher } };
  }
}
