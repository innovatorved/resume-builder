# Resume Builder

A web application to create, edit, tailor, and store professional LaTeX resumes with an integrated career knowledge base.

Live URL: https://resume.vedgupta.in/

## What It Does

### Resume Management
- Create, rename, duplicate, and delete resumes from a central dashboard.
- Direct LaTeX code editor with live syntax validation and vector PDF preview.
- Live PDF preview generated on demand.
- Version history with point-in-time snapshots and restore options.
- AI-assisted tailoring for job descriptions and section rewriting.

### Career Knowledge Hub
- Connects multiple career sources to ground your resume data:
  - GitHub: pulls public profile information, repositories, and pinned work.
  - Portfolios: crawls sitemaps and key pages (about, projects, experience).
  - Websites: captures single articles, blog posts, or project links.
  - LinkedIn: profiles scraped with an option to upload the official PDF export for complete data.
  - Resumes and Documents: direct file upload supporting PDF, LaTeX, Markdown, and plain text.
- Cloudflare Durable Objects handle background fetching and extraction.
- Live progress and logs stream directly to the browser through WebSockets.
- Synthesizes extracted content into clean Markdown evidence files stored in Cloudflare R2.
- Search and query interface to find facts and answer questions from your saved sources.

### Security and Storage
- Files and generated PDFs are saved to private Cloudflare R2 buckets.
- Uploads and downloads use short-lived, signed URLs. Files are never publicly exposed.
- User accounts and sessions managed through Better Auth.
- Relational data stored in Turso (libSQL) using Drizzle ORM.

## Tech Stack

- Frontend: Astro 5, React 19, Tailwind CSS v4, TypeScript
- Backend: Cloudflare Pages SSR, Cloudflare Workers with Durable Objects
- Database: Turso (libSQL) with Drizzle ORM
- Storage: Cloudflare R2 with S3-compatible signed URLs
- Auth: Better Auth
- AI: Google Gemini API and Cloudflare AI Search

## Local Setup

- Install dependencies:
  ```sh
  bun install
  ```
- Copy environment configuration:
  ```sh
  cp .env.example .env
  ```
- Fill in required variables in `.env` (auth, database, R2, and AI keys).
- Start the development server:
  ```sh
  bun run dev
  ```
- Open in browser: `http://localhost:3000`

## Tests and Verification

- Run test suite:
  ```sh
  bun test
  ```
- Typecheck frontend and backend:
  ```sh
  bunx tsc --noEmit
  cd workers/knowledge-agent && bunx tsc --noEmit
  ```

## Deployment

- Build and deploy frontend to Cloudflare Pages:
  ```sh
  bun run build
  bunx wrangler pages deploy ./dist --project-name resume-builder --branch main
  ```
- Deploy the knowledge worker:
  ```sh
  cd workers/knowledge-agent
  bunx wrangler deploy
  ```

