import { S3Client } from "@aws-sdk/client-s3";

export function getR2Client(env?: Record<string, string | undefined>) {
  const accountId =
    env?.R2_ACCOUNT_ID ||
    process.env.R2_ACCOUNT_ID ||
    (typeof process !== "undefined" && process.env.R2_ACCOUNT_ID);
  const accessKeyId =
    env?.R2_ACCESS_KEY_ID ||
    process.env.R2_ACCESS_KEY_ID ||
    (typeof process !== "undefined" && process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey =
    env?.R2_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_ACCESS_KEY ||
    (typeof process !== "undefined" && process.env.R2_SECRET_ACCESS_KEY);

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing Cloudflare R2 credentials. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in your environment or secrets."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}
