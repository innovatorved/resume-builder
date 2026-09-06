# Resume Builder

Create, edit, version, and download professional LaTeX resumes.

Live site: https://resume.vedgupta.in/

## Features

- Resume dashboard with create, edit, duplicate, rename, and delete actions
- Structured form and LaTeX editor with live PDF preview
- AI-assisted resume edits and tailoring
- Version history for saved resume snapshots
- Private PDF and LaTeX source storage in Cloudflare R2
- Short-lived, signed S3 URLs for uploads and downloads

## Stack

- Astro and React
- TypeScript and Tailwind CSS
- Better Auth
- Turso with Drizzle ORM
- Cloudflare Pages and R2
- AWS S3 SDK for R2-compatible signed URLs

## Local development

Install dependencies and copy the environment example:

```sh
bun install
cp .env.example .env
```

Set the required values in `.env`, then start the development server:

```sh
bun run dev
```

The application runs at http://localhost:3000.

## Environment variables

Application authentication, database, and AI settings are documented in `.env.example`.

For private R2 storage, configure:

```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET=resume-builder-private
```

Create an R2 API token with Object Read and Write access scoped to the configured bucket. Do not commit credentials. The browser uploads only through time-limited presigned URLs, and files are never publicly exposed.

## Validation

```sh
bun test
bun run build
```

## Deployment

Production deploys from the `main` branch through Cloudflare Pages. To deploy manually:

```sh
bun run build
bun x wrangler pages deploy ./dist --project-name resume-builder --branch main
```
