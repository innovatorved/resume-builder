import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const isWorkerd =
  typeof (globalThis as unknown as Record<string, unknown>).WebSocketPair !== "undefined" ||
  (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers");

const rawUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const url = rawUrl || (isWorkerd ? "https://placeholder-turso.turso.io" : "file:local.db");
const authToken =
  process.env.TURSO_AUTH_TOKEN || (isWorkerd && !rawUrl ? "placeholder" : undefined);

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });
