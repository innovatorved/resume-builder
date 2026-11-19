import { describe, expect, test } from "bun:test";
import { cleanJsonText, parseResumeData } from "./utils";

describe("shared utils", () => {
  test("cleanJsonText extracts JSON from fenced code blocks and prose", () => {
    expect(cleanJsonText('```json\n{"reply":"ok"}\n```')).toBe('{"reply":"ok"}');
    expect(cleanJsonText('Here is your result:\n{"reply":"ok"}\nThanks!')).toBe('{"reply":"ok"}');
    expect(cleanJsonText('{"reply":"ok"}')).toBe('{"reply":"ok"}');
  });

  test("parseResumeData handles both JSON strings and pre-parsed objects", () => {
    const obj = { personalInfo: { name: "Ada" } };
    expect(parseResumeData(JSON.stringify(obj))).toEqual(obj as any);
    expect(parseResumeData(obj)).toEqual(obj as any);
  });
});
