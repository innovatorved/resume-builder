import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getResume } from "@/lib/actions/resume";
import { ResumeEditor } from "@/components/resume-editor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditResumePage({ params }: PageProps) {
  const { id } = await params;

  // Check authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Handle new resume
  if (id === "new") {
    return <ResumeEditor />;
  }

  // Fetch existing resume
  const result = await getResume(id);

  if (!result.success || !result.data) {
    redirect("/");
  }

  return <ResumeEditor initialResume={result.data} />;
}
