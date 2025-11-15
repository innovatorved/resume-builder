"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TypeformResumeBuilder } from "@/components/typeform-resume-builder";
import { useToast } from "@/hooks/use-toast";
import { createResume, updateResume } from "@/lib/actions/resume";
import { draftManager } from "@/lib/draft-manager";
import type { ResumeData } from "@/types/resume";

const EMPTY_RESUME: ResumeData = {
  personalInfo: {
    name: "",
    title: "",
    phone: "",
    email: "",
    linkedin: "",
    location: "",
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  languages: [],
};

interface ResumeEditorProps {
  initialResume?: {
    id: string;
    name: string;
    data: ResumeData;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
}

export function ResumeEditor({ initialResume }: ResumeEditorProps) {
  const [resumeData, setResumeData] = useState<ResumeData>(initialResume?.data || EMPTY_RESUME);
  const { toast } = useToast();
  const router = useRouter();

  // Load draft for new resumes
  useEffect(() => {
    if (!initialResume) {
      const draft = draftManager.loadDraft();
      if (draft) {
        const age = draftManager.getDraftAge();
        if (age && age < 1440) {
          // Less than 24 hours
          const shouldRestore = confirm(
            `You have an unsaved draft from ${age < 60 ? age + " minutes" : Math.floor(age / 60) + " hours"} ago. Would you like to restore it?`
          );
          if (shouldRestore) {
            setResumeData(draft.data);
          } else {
            draftManager.clearDraft();
          }
        }
      }
    }
  }, [initialResume]);

  const handleComplete = async () => {
    try {
      if (initialResume) {
        // Update existing resume
        const result = await updateResume({
          id: initialResume.id,
          data: resumeData,
        });

        if (result.success) {
          draftManager.clearDraft();
          toast({
            title: "Resume updated",
            description: "Your resume has been saved successfully.",
          });
          router.push("/");
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to update resume",
            variant: "destructive",
          });
        }
      } else {
        // Create new resume
        const resumeName = resumeData.personalInfo.name || "New Resume";
        const result = await createResume({
          name: resumeName,
          data: resumeData,
        });

        if (result.success) {
          draftManager.clearDraft();
          toast({
            title: "Resume created",
            description: "Your resume has been saved successfully.",
          });
          router.push("/");
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to create resume",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    // Draft is auto-saved, just navigate back
    toast({
      title: "Draft saved",
      description: "Your progress has been saved automatically.",
    });
    router.push("/");
  };

  return (
    <TypeformResumeBuilder
      data={resumeData}
      onChange={setResumeData}
      onComplete={handleComplete}
      onBack={handleBack}
    />
  );
}
