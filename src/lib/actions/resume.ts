import type { ResumeData } from "@/types/resume";

export async function getResumes() {
  const res = await fetch("/api/resumes");
  return res.json();
}

export async function getResume(id: string) {
  const res = await fetch(`/api/resumes/${id}`);
  return res.json();
}

export async function createResume(input: { name: string; data: ResumeData }) {
  const res = await fetch("/api/resumes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function updateResume(input: { id: string; name?: string; data?: ResumeData }) {
  const res = await fetch(`/api/resumes/${input.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function deleteResume(id: string) {
  const res = await fetch(`/api/resumes/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function duplicateResume(id: string) {
  const res = await fetch(`/api/resumes/${id}`, {
    method: "POST",
  });
  return res.json();
}
