# Agent Guidelines

## Architecture Overview

- Frontend and API: Astro 5 SSR on Cloudflare Pages, React 19, Tailwind CSS v4.
- Background Ingestion: Cloudflare Worker with Durable Objects (`workers/knowledge-agent`), WebSockets for live status.
- Database: Turso (libSQL) with Drizzle ORM.
- Storage: Cloudflare R2 for resumes, compiled PDFs, and knowledge evidence files.
- Authentication: Better Auth with session management.
- AI Integration: Google Gemini API for resume tailoring and copilot; Cloudflare AI Search for knowledge retrieval.

## Development Commands

- `bun run dev`: Start local development server on port 3000.
- `bun test`: Run test suite.
- `bunx tsc --noEmit`: Typecheck root project.
- `cd workers/knowledge-agent && bunx tsc --noEmit`: Typecheck knowledge agent worker.
- `bun run build`: Build production bundle for Cloudflare Pages.
- `bun run db:generate`: Generate database migrations.
- `bun run db:push`: Apply database schema changes.

## Development Rules

- Use Bun as the package manager and test runner.
- Always run `bun test` and `bunx tsc --noEmit` before committing code.
- Avoid introducing unnecessary dependencies.
- Keep UI styling neutral and aligned with existing design tokens.
- Maintain tenant isolation in storage paths (`storage/knowledge/<userId>/...`).

