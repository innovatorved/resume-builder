import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const isWorkerd =
  typeof (globalThis as unknown as Record<string, unknown>).WebSocketPair !== "undefined" ||
  (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers");

const DEFAULT_TURSO_URL = "libsql://resume-builder-innovatorved.aws-ap-south-1.turso.io";
const DEFAULT_TURSO_TOKEN =
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODg2NzYzMTgsImlkIjoiMDFhMDc1NmEtMDMwMS03ZWMwLTkxODktYmY4YjJmOTVhNDY5Iiwia2lkIjoiRjc4NTdZd1ZlVl9RYXFjb09ydGk4MlJ0LVVaZGU4RnNiaDdPWjc2VWJmayIsInJpZCI6IjA1ZTJhYmFmLWIwZjMtNDAyMy1hYzRjLTRmNTc0MDBkNjY4ZCJ9.-EV0OobVjCum_56QfBJU67Uf4hWBY7zBFLPVJ3M450G8JSY-GKRJp7zYtPCGCKJIvR6qGfxbGVyBMFaki0A4Bg";

const rawUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const url = (rawUrl && rawUrl.trim()) || DEFAULT_TURSO_URL;
const rawAuthToken = process.env.TURSO_AUTH_TOKEN;
const authToken = (rawAuthToken && rawAuthToken.trim()) || DEFAULT_TURSO_TOKEN;

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });
