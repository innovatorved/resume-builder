import { describe, expect, test } from "bun:test";
import {
  createPresignedUploadUrl,
  isValidStorageExtension,
  isValidStorageId,
} from "./presigned";

describe("R2 presigned storage validation", () => {
  test("accepts valid storage IDs and rejects path traversal", () => {
    expect(isValidStorageId("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(isValidStorageId("user_abc-123")).toBe(true);
    expect(isValidStorageId("../../other-user/resume-1")).toBe(false);
    expect(isValidStorageId("a/b")).toBe(false);
    expect(isValidStorageId("")).toBe(false);
    expect(isValidStorageId("x".repeat(201))).toBe(false);
  });

  test("allowlists only expected file extensions", () => {
    expect(isValidStorageExtension("tex")).toBe(true);
    expect(isValidStorageExtension("pdf")).toBe(true);
    expect(isValidStorageExtension("bin")).toBe(true);
    expect(isValidStorageExtension("html")).toBe(false);
    expect(isValidStorageExtension("pdf/../../evil")).toBe(false);
  });

  test("createPresignedUploadUrl rejects traversal IDs and disallowed extensions", async () => {
    await expect(
      createPresignedUploadUrl({
        userId: "user-1",
        resumeId: "../../other/resume",
        versionId: "v-1",
        type: "pdf",
        contentType: "application/pdf",
      })
    ).rejects.toThrow("Invalid storage identifier");

    await expect(
      createPresignedUploadUrl({
        userId: "user-1",
        resumeId: "resume-1",
        versionId: "v-1",
        type: "pdf",
        contentType: "application/pdf",
        extension: "exe",
      })
    ).rejects.toThrow("Invalid file extension");
  });
});
