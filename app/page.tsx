import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getResumes } from "@/lib/actions/resume";
import { ResumeList } from "@/components/resume-list";

export default async function HomePage() {
  // Check authentication on server
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Fetch resumes on server
  const result = await getResumes();
  const resumes = result.success && result.data ? result.data : [];

  return <ResumeList initialResumes={resumes} />;
}
