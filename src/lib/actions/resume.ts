import type { ResumeData } from "@/types/resume";

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getResumes(): Promise<ActionResult<any[]>> {
  const res = await fetch("/api/resumes");
  return res.json() as Promise<ActionResult<any[]>>;
}

export async function getResume(id: string): Promise<ActionResult<any>> {
  const res = await fetch(`/api/resumes/${id}`);
  return res.json() as Promise<ActionResult<any>>;
}

export async function createResume(input: {
  name: string;
  data: ResumeData;
}): Promise<ActionResult<any>> {
  const res = await fetch("/api/resumes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<ActionResult<any>>;
}

export async function updateResume(input: {
  id: string;
  name?: string;
  data?: ResumeData;
}): Promise<ActionResult<any>> {
  const res = await fetch(`/api/resumes/${input.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<ActionResult<any>>;
}

export async function deleteResume(id: string): Promise<ActionResult<void>> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: "DELETE",
  });
  return res.json() as Promise<ActionResult<void>>;
}

export async function duplicateResume(id: string): Promise<ActionResult<any>> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: "POST",
  });
  return res.json() as Promise<ActionResult<any>>;
}
