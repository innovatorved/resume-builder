import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const isWorkerd =
  typeof (globalThis as unknown as Record<string, unknown>).WebSocketPair !== "undefined" ||
  (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers");

const rawUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const url = rawUrl?.trim();
const rawAuthToken = process.env.TURSO_AUTH_TOKEN;
const authToken = rawAuthToken?.trim();

if (!url) throw new Error("TURSO_DATABASE_URL or DATABASE_URL is required");
if (url.startsWith("libsql://") && !authToken) throw new Error("TURSO_AUTH_TOKEN is required");

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });
