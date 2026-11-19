import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "./s3-client";

export function isR2Configured(env?: Record<string, string | undefined>): boolean {
  const accountId = env?.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const accessKeyId = env?.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env?.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
  return Boolean(accountId && accessKeyId && secretAccessKey);
}

export function getR2BucketName(env?: Record<string, string | undefined>): string {
  return env?.R2_BUCKET || process.env.R2_BUCKET || "resume-builder-private";
}

export interface PresignedUploadOptions {
  userId: string;
  resumeId: string;
  versionId: string;
  type: "source" | "pdf" | "uploads";
  contentType: string;
  extension?: string;
  expiresInSeconds?: number;
  env?: Record<string, string | undefined>;
}

const SAFE_STORAGE_ID = /^[a-zA-Z0-9_-]{1,200}$/;
const ALLOWED_EXTENSIONS = new Set(["tex", "pdf", "bin"]);

export function isValidStorageId(value: string): boolean {
  return SAFE_STORAGE_ID.test(value);
}

export function isValidStorageExtension(value: string): boolean {
  return ALLOWED_EXTENSIONS.has(value);
}

export async function createPresignedUploadUrl({
  userId,
  resumeId,
  versionId,
  type,
  contentType,
  extension,
  expiresInSeconds = 180, // 3 minutes default
  env,
}: PresignedUploadOptions) {
  if (!isValidStorageId(userId) || !isValidStorageId(resumeId) || !isValidStorageId(versionId)) {
    throw new Error("Invalid storage identifier");
  }

  const fileExt = extension || (type === "pdf" ? "pdf" : type === "source" ? "tex" : "bin");
  if (!isValidStorageExtension(fileExt)) {
    throw new Error("Invalid file extension");
  }

  const s3 = getR2Client(env);
  const bucket = getR2BucketName(env);

  // Strict key prefix format: resumes/{userId}/{resumeId}/{type}/{versionId}.{ext}
  const key = `resumes/${userId}/${resumeId}/${type}/${versionId}.${fileExt}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });

  return { uploadUrl, key };
}

export interface PresignedDownloadOptions {
  key: string;
  filename: string;
  expiresInSeconds?: number;
  env?: Record<string, string | undefined>;
}

export async function createPresignedDownloadUrl({
  key,
  filename,
  expiresInSeconds = 120, // 2 minutes default
  env,
}: PresignedDownloadOptions) {
  const s3 = getR2Client(env);
  const bucket = getR2BucketName(env);

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });

  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}
