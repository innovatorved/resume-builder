import { defineConfig } from "drizzle-kit";

// Load .env automatically if running via Node or Drizzle-Kit
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch {
    // Ignore if .env does not exist
  }
}

const isTurso = process.env.TURSO_DATABASE_URL?.startsWith("libsql://");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: isTurso ? "turso" : "sqlite",
  dbCredentials: isTurso
    ? {
        url: process.env.TURSO_DATABASE_URL || "",
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : {
        url: process.env.DATABASE_URL || "local.db",
      },
});
