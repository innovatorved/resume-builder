"use client";

import { useState } from "react";
import { TypeformResumeBuilder } from "@/components/typeform-resume-builder";
import { ResumePreview } from "@/components/resume-preview";
import { Button } from "@/components/ui/button";
import { Download, FileText, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadResumePdf } from "@/lib/download-resume-v2";
import { DOWNLOAD_BUTTON_BASE_CLASSES } from "@/lib/utils";
import type { ResumeData } from "@/types/resume";

export default function Home() {
  const [showForm, setShowForm] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();
  const [resumeData, setResumeData] = useState<ResumeData>({
    personalInfo: {
      name: "VED PRAKASH GUPTA",
      title: "Cloud Engineer",
      phone: "+917007868719",
      email: "vedgupta0401@gmail.com",
      linkedin: "linkedin.com/in/innovatorved",
      location: "Hyderabad, India",
    },
    summary:
      "As a Creative and Driven Cloud Developer, I have built a strong foundation in web technologies, specifically in cloud development and integration. My expertise spans across multiple modern tech stacks and I thrive in team environments, collaborating on impactful projects. I am committed to open-source contributions and continually seek to innovate with personal projects that push the limits of technology.",
    experience: [
      {
        title: "Cloud Engineer",
        company: "LTIMindtree",
        location: "Hyderabad, India",
        startDate: "03/2024",
        endDate: "Present",
        description: "Cloud Engineering Company specializing in cloud solutions",
        responsibilities: [
          "Working on a Microsoft Azure Cloud project with a focus on Infrastructure as a Service (IaaS), optimizing and managing Cloud infrastructure",
          "Implementing and deploying scalable, secure, and efficient Cloud solutions on Azure",
          "Collaborating with teams to design and deploy Cloud architectures aligned with business needs",
          "Providing solutions for clients by designing, deploying, and managing Azure IaaS environments tailored to their specific needs",
        ],
      },
    ],
    education: [
      {
        degree: "Bachelor of Technology - BTech",
        institution: "Galgotias College of Engineering and Technology",
        location: "India",
        startDate: "08/2020",
        endDate: "05/2023",
      },
      {
        degree: "Diploma",
        institution: "Government Polytechnic Bahraich",
        location: "Bahraich, India",
        startDate: "01/2017",
        endDate: "01/2020",
      },
    ],
    skills: [
      "GitHub",
      "React",
      "Next.js",
      "JavaScript",
      "TypeScript",
      "Docker",
      "Kubernetes",
      "DevOps",
      "CI/CD",
      "GitHub Actions",
      "Azure DevOps",
      "Jenkins",
      "Terraform",
      "Ansible",
      "IAM",
      "Azure",
      "Azure IaaS",
      "Container Orchestration",
      "Microservices",
      "HTML",
      "Python",
      "MongoDB",
      "PostgreSQL",
      "Redis",
      "Git",
      "Azure AD",
      "GCP",
      "IAC",
      "SQL",
      "RESTful API",
      "Helm",
      "Docker Compose",
    ],
    certifications: [
      {
        title: "Microsoft Certified: Azure Fundamentals",
        issuer: "Microsoft",
        date: "May 2025",
        link: "https://learn.microsoft.com/api/credentials/share/en-in/innovatorved/6511623ED859592E?sharingId",
        skills: "Cloud Computing, Azure Services, Pricing, SLAs, Governance",
      },
      {
        title: "Microsoft Certified: Azure Administrator Associate",
        issuer: "Microsoft",
        date: "Apr 2025",
        link: "https://learn.microsoft.com/en-in/users/innovatorved/credentials/6c94bf7cd6e82766",
        skills:
          "Azure Identities and Governance, Storage Management, Azure Compute Resources, Virtual Networking, Azure Monitoring",
      },
      {
        title: "Google Cloud Certified Associate Cloud Engineer",
        issuer: "Google Cloud",
        date: "Oct 2024",
        link: "https://www.credly.com/badges/34a38859-04f5-4548-a543-e871e740db36/",
        skills:
          "Cloud Architecture, Cloud Computing, Cloud Security, Cloud Storage, Compute Engine, GCP, IAM, IaC, Networking, Pub/Sub, SQL",
      },
      {
        title: "GitHub Foundations",
        issuer: "GitHub",
        date: "Nov 2024",
        link: "https://www.credly.com/badges/616b1e3c-7b47-464b-ad2f-5d9d04d07985/public_url",
        skills:
          "Repository Management, Collaborative Workflows, CI/CD, DevOps, Version Control, Project Management",
      },
      {
        title: "ReactJS: Zero to Hero",
        issuer: "QA Ltd",
        date: "Aug 2024",
        link: "https://certificates.platform.qa.com/4c2ab58979101bc6a8e277c746325c2c35702052.pdf",
        skills:
          "React Components, Props, State Management, Hooks, Routing, Performance Optimization",
      },
    ],
    projects: [
      {
        title: "Subtitle - Open-source Subtitle Generation",
        description:
          "Open-source subtitle generation tool for seamless content translation. Built a self-hosted, AI-powered solution using OpenAI's Whisper model with multilingual support. Features include automatic subtitle generation, multiple output formats (VTT, SRT, LRC), and support for 20+ Whisper models. Successfully gained 426+ GitHub stars and active community adoption.",
        technologies: "Python, Whisper AI, FFmpeg, Machine Learning, Shell Scripting",
      },
      {
        title: "Autoapplys.com",
        description:
          "AutoApplys is designed to streamline the job application process, allowing users to create job profiles and automate submissions. Led the development of a web-based platform automating job application processes, reducing manual efforts and time.",
        technologies: "Prisma, JavaScript, MongoDB, TypeScript, React.js, Next.js",
      },
      {
        title: "whisper.api",
        description:
          "An open-source project that integrates speech-to-text functionality into applications. Developed an easy-to-use RESTful API that processes audio input into transcribed text via OpenAI's Whisper model. Managed the functionality to handle audio files and provided accurate transcription output.",
        technologies: "Python, Whisper, ASR",
      },
    ],
    languages: [
      {
        name: "Hindi",
        level: "Native",
      },
      {
        name: "English",
        level: "Proficient",
      },
    ],
  });

  const handleDownloadPDF = async () => {
    setIsDownloading(true);

    try {
      await downloadResumePdf(resumeData);

      toast({
        title: "Resume downloaded",
        description: "Your PDF has been generated with the latest updates.",
      });
    } catch (error) {
      console.error("[download] Failed to generate resume PDF", error);
      toast({
        title: "Download failed",
        description: "We couldn't generate your resume PDF. Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (showForm) {
    return (
      <TypeformResumeBuilder
        data={resumeData}
        onChange={setResumeData}
        onComplete={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950">
      {/* Header */}
      <header className="border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowForm(true)}
                variant="outline"
                size="sm"
                className="border-2 border-gray-300 dark:border-gray-600 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-700 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-blue-700 dark:text-blue-500">
                  Resume Preview
                </h1>
              </div>
            </div>
            <Button
              onClick={handleDownloadPDF}
              className={`${DOWNLOAD_BUTTON_BASE_CLASSES} bg-blue-700 hover:bg-blue-800 text-white shadow-xl shadow-blue-500/40 dark:shadow-blue-900/60 disabled:cursor-not-allowed disabled:opacity-50`}
              size="lg"
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Preview */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
          <div className="p-6">
            <ResumePreview data={resumeData} />
          </div>
        </div>
      </main>
    </div>
  );
}
