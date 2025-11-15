import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getResume } from "@/lib/actions/resume";
import { ResumePreviewPage } from "@/components/resume-preview-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: PageProps) {
  const { id } = await params;

  // Check authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Fetch resume
  const result = await getResume(id);

  if (!result.success || !result.data) {
    redirect("/");
  }

  return <ResumePreviewPage resume={result.data} />;
}
