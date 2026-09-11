# Agent Guidelines

## Architecture Overview

- Unified Architecture: Astro SSR and Knowledge Agent on Cloudflare Workers (Static Assets) with Durable Objects, Workflows, and WebSockets in a single unified worker (`src/worker.ts`).
- Database: Turso (libSQL) with Drizzle ORM.
- Storage: Cloudflare R2 for resumes, compiled PDFs, and knowledge evidence files.
- Authentication: Better Auth with session management.
- AI Integration: Google Gemini API for resume tailoring and copilot; Cloudflare AI Search for knowledge retrieval.

## Development Commands

- `bun run dev`: Start local development server on port 3000.
- `bun test`: Run test suite.
- `bunx tsc --noEmit`: Typecheck root project.
- `bun run build`: Build production bundle for Cloudflare Workers.
- `bun run db:generate`: Generate database migrations.
- `bun run db:push`: Apply database schema changes.

## Development Rules

- Use Bun as the package manager and test runner.
- Always run `bun test` and `bunx tsc --noEmit` before committing code.
- Avoid introducing unnecessary dependencies.
- Keep UI styling neutral and aligned with existing design tokens.
- Maintain tenant isolation in storage paths (`storage/knowledge/<userId>/...`).

