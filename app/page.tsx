"use client"

import { useState } from "react"
import { TypeformResumeBuilder } from "@/components/typeform-resume-builder"
import { ResumePreview } from "@/components/resume-preview"
import { Button } from "@/components/ui/button"
import { Download, FileText, ArrowLeft, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { downloadResumePdf } from "@/lib/download-resume-v2"
import type { ResumeData } from "@/types/resume"

export default function Home() {
  const [showForm, setShowForm] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const { toast } = useToast()
  const [resumeData, setResumeData] = useState<ResumeData>({
    personalInfo: {
      name: "VED PRAKASH GUPTA",
      title: "Cloud Developer",
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
          "Working on a Microsoft Azure Cloud project with a focus on Infrastructure as a Service (IaaS), optimizing and managing cloud infrastructure",
          "Implementing and deploying scalable, secure, and efficient cloud solutions on Azure",
          "Collaborating with teams to design and deploy cloud architectures aligned with business needs",
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
      "IAM",
      "Azure",
      "Azure IaaS",
      "HTML",
      "Python",
      "MongoDB",
      "PostgreSQL",
      "Redis",
      "Git",
      "GitHub Actions",
      "Azure AD",
      "GCP",
      "IAC",
      "SQL",
      "RESTful API",
    ],
    certifications: [
      {
        title: "Microsoft Certified: Azure Administrator Associate",
        issuer: "Microsoft",
        date: "Apr 2025",
      },
      {
        title: "Microsoft Certified: Azure Fundamentals",
        issuer: "Microsoft",
        date: "May 2025",
      },
      {
        title: "Associate Cloud Engineer",
        issuer: "Google Cloud",
        date: "Oct 2024",
      },
      {
        title: "GitHub Foundations",
        issuer: "GitHub",
        date: "Nov 2024",
      },
      {
        title: "ReactJS: Zero to Hero",
        issuer: "QA Ltd",
        date: "Aug 2024",
      },
    ],
    projects: [
      {
        title: "Autoapplys.com",
        startDate: "01/2021",
        endDate: "12/2021",
        description:
          "AutoApplys is designed to streamline the job application process, allowing users to create job profiles and automate submissions. Led the development of a web-based platform automating job application processes, reducing manual efforts and time.",
        technologies: "Prisma, JavaScript, MongoDB, TypeScript, React.js, Next.js",
      },
      {
        title: "whisper.api",
        startDate: "01/2023",
        endDate: "Present",
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
  })

  const handleDownloadPDF = async () => {
    setIsDownloading(true)

    try {
      await downloadResumePdf(resumeData)

      toast({
        title: "Resume downloaded",
        description: "Your PDF has been generated with the latest updates.",
      })
    } catch (error) {
  console.error("[download] Failed to generate resume PDF", error)
      toast({
        title: "Download failed",
        description: "We couldn't generate your resume PDF. Please try again shortly.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-background">
        <TypeformResumeBuilder data={resumeData} onChange={setResumeData} onComplete={() => setShowForm(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-primary">Resume Preview</h1>
              </div>
            </div>
            <Button
              onClick={handleDownloadPDF}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              size="lg"
              disabled={isDownloading}
            >
              {isDownloading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
              {isDownloading ? "Preparing..." : "Download PDF"}
            </Button>
          </div>
        </div>
      </header>

      {/* Preview */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden">
          <ResumePreview data={resumeData} />
        </div>
      </main>
    </div>
  )
}
