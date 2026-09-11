import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Plus,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Education, Experience, Project, ResumeData } from "@/types/resume";

interface StructuredFormEditorProps {
  data: ResumeData;
  onChange: (updated: ResumeData) => void;
}

export function StructuredFormEditor({ data, onChange }: StructuredFormEditorProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basics: true,
    summary: true,
    experience: true,
    education: true,
    skills: true,
    projects: false,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const updatePersonalInfo = (field: string, val: string) => {
    onChange({
      ...data,
      personalInfo: {
        ...data.personalInfo,
        [field]: val,
      },
    });
  };

  const updateSummary = (val: string) => {
    onChange({
      ...data,
      summary: val,
    });
  };

  // Experience handlers
  const addExperience = () => {
    const newItem: Experience = {
      title: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "Present",
      description: "",
      responsibilities: [""],
    };
    onChange({
      ...data,
      experience: [newItem, ...(data.experience || [])],
    });
  };

  const updateExperienceItem = (index: number, patch: Partial<Experience>) => {
    const next = [...(data.experience || [])];
    next[index] = { ...next[index], ...patch };
    onChange({ ...data, experience: next });
  };

  const removeExperienceItem = (index: number) => {
    onChange({
      ...data,
      experience: (data.experience || []).filter((_, i) => i !== index),
    });
  };

  const addResponsibility = (expIndex: number) => {
    const next = [...(data.experience || [])];
    const exp = next[expIndex];
    exp.responsibilities = [...(exp.responsibilities || []), ""];
    onChange({ ...data, experience: next });
  };

  const updateResponsibility = (expIndex: number, respIndex: number, val: string) => {
    const next = [...(data.experience || [])];
    const exp = next[expIndex];
    const resps = [...(exp.responsibilities || [])];
    resps[respIndex] = val;
    exp.responsibilities = resps;
    onChange({ ...data, experience: next });
  };

  const removeResponsibility = (expIndex: number, respIndex: number) => {
    const next = [...(data.experience || [])];
    const exp = next[expIndex];
    exp.responsibilities = (exp.responsibilities || []).filter((_, i) => i !== respIndex);
    onChange({ ...data, experience: next });
  };

  // Education handlers
  const addEducation = () => {
    const newItem: Education = {
      institution: "",
      degree: "",
      location: "",
      startDate: "",
      endDate: "",
    };
    onChange({
      ...data,
      education: [newItem, ...(data.education || [])],
    });
  };

  const updateEducationItem = (index: number, patch: Partial<Education>) => {
    const next = [...(data.education || [])];
    next[index] = { ...next[index], ...patch };
    onChange({ ...data, education: next });
  };

  const removeEducationItem = (index: number) => {
    onChange({
      ...data,
      education: (data.education || []).filter((_, i) => i !== index),
    });
  };

  // Skills handler
  const updateSkillsText = (text: string) => {
    const list = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({ ...data, skills: list });
  };

  // Projects handlers
  const addProject = () => {
    const newItem: Project = {
      title: "",
      description: "",
      technologies: "",
    };
    onChange({
      ...data,
      projects: [newItem, ...(data.projects || [])],
    });
  };

  const updateProjectItem = (index: number, patch: Partial<Project>) => {
    const next = [...(data.projects || [])];
    next[index] = { ...next[index], ...patch };
    onChange({ ...data, projects: next });
  };

  const removeProjectItem = (index: number) => {
    onChange({
      ...data,
      projects: (data.projects || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-neutral-950 p-4 space-y-4 font-sans text-xs select-none">
      {/* 1. Contact & Personal Info */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30">
        <button
          type="button"
          onClick={() => toggleSection("basics")}
          className="w-full flex items-center justify-between p-3.5 bg-neutral-900/80 hover:bg-neutral-800/60 transition-colors text-left text-neutral-200 font-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-semibold tracking-tight">Personal Information</span>
          </div>
          {openSections.basics ? (
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          )}
        </button>

        {openSections.basics && (
          <div className="p-3.5 space-y-3 bg-neutral-950/60 border-t border-neutral-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Full Name
                </label>
                <Input
                  value={data.personalInfo?.name || ""}
                  onChange={(e) => updatePersonalInfo("name", e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="h-8 text-xs bg-neutral-900 border-neutral-800 text-neutral-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Professional Title
                </label>
                <Input
                  value={data.personalInfo?.title || ""}
                  onChange={(e) => updatePersonalInfo("title", e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="h-8 text-xs bg-neutral-900 border-neutral-800 text-neutral-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Email
                </label>
                <Input
                  type="email"
                  value={data.personalInfo?.email || ""}
                  onChange={(e) => updatePersonalInfo("email", e.target.value)}
                  placeholder="alex@example.com"
                  className="h-8 text-xs bg-neutral-900 border-neutral-800 text-neutral-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Phone
                </label>
                <Input
                  value={data.personalInfo?.phone || ""}
                  onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="h-8 text-xs bg-neutral-900 border-neutral-800 text-neutral-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Location
                </label>
                <Input
                  value={data.personalInfo?.location || ""}
                  onChange={(e) => updatePersonalInfo("location", e.target.value)}
                  placeholder="San Francisco, CA"
                  className="h-8 text-xs bg-neutral-900 border-neutral-800 text-neutral-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  LinkedIn Profile
                </label>
                <Input
                  value={data.personalInfo?.linkedin || ""}
                  onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
                  placeholder="linkedin.com/in/alexmorgan"
                  className="h-8 text-xs bg-neutral-900 border-neutral-800 text-neutral-100"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Professional Summary */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30">
        <button
          type="button"
          onClick={() => toggleSection("summary")}
          className="w-full flex items-center justify-between p-3.5 bg-neutral-900/80 hover:bg-neutral-800/60 transition-colors text-left text-neutral-200 font-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">Professional Summary</span>
          </div>
          {openSections.summary ? (
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          )}
        </button>

        {openSections.summary && (
          <div className="p-3.5 bg-neutral-950/60 border-t border-neutral-800/80">
            <Textarea
              value={data.summary || ""}
              onChange={(e) => updateSummary(e.target.value)}
              placeholder="Write a concise 2-3 sentence executive summary highlighting key accomplishments..."
              className="min-h-[80px] text-xs bg-neutral-900 border-neutral-800 text-neutral-100 resize-none leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* 3. Work Experience */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30">
        <button
          type="button"
          onClick={() => toggleSection("experience")}
          className="w-full flex items-center justify-between p-3.5 bg-neutral-900/80 hover:bg-neutral-800/60 transition-colors text-left text-neutral-200 font-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-semibold tracking-tight">
              Experience ({(data.experience || []).length})
            </span>
          </div>
          {openSections.experience ? (
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          )}
        </button>

        {openSections.experience && (
          <div className="p-3.5 space-y-4 bg-neutral-950/60 border-t border-neutral-800/80">
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addExperience}
                className="h-7 text-xs border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Position
              </Button>
            </div>

            {(data.experience || []).map((exp, expIdx) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: Order is user controlled
                key={expIdx}
                className="p-3 border border-neutral-800/80 rounded-md bg-neutral-900/40 space-y-3 relative"
              >
                <button
                  type="button"
                  onClick={() => removeExperienceItem(expIdx)}
                  className="absolute top-3 right-3 text-neutral-500 hover:text-red-400 transition-colors"
                  title="Remove Position"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-6">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Company
                    </label>
                    <Input
                      value={exp.company}
                      onChange={(e) => updateExperienceItem(expIdx, { company: e.target.value })}
                      placeholder="Company Name"
                      className="h-7 text-xs bg-neutral-950 border-neutral-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Job Title
                    </label>
                    <Input
                      value={exp.title}
                      onChange={(e) => updateExperienceItem(expIdx, { title: e.target.value })}
                      placeholder="Job Title"
                      className="h-7 text-xs bg-neutral-950 border-neutral-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Location
                    </label>
                    <Input
                      value={exp.location}
                      onChange={(e) => updateExperienceItem(expIdx, { location: e.target.value })}
                      placeholder="City, State"
                      className="h-7 text-xs bg-neutral-950 border-neutral-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Start Date
                    </label>
                    <Input
                      value={exp.startDate || ""}
                      onChange={(e) => updateExperienceItem(expIdx, { startDate: e.target.value })}
                      placeholder="e.g. 2022"
                      className="h-7 text-xs bg-neutral-950 border-neutral-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      End Date
                    </label>
                    <Input
                      value={exp.endDate}
                      onChange={(e) => updateExperienceItem(expIdx, { endDate: e.target.value })}
                      placeholder="e.g. Present"
                      className="h-7 text-xs bg-neutral-950 border-neutral-800"
                    />
                  </div>
                </div>

                {/* Bullet points */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Key Accomplishments / Responsibilities
                    </label>
                    <button
                      type="button"
                      onClick={() => addResponsibility(expIdx)}
                      className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Bullet
                    </button>
                  </div>

                  {(exp.responsibilities || []).map((bullet, bulletIdx) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: Order is user controlled
                      key={bulletIdx}
                      className="flex items-center gap-1.5"
                    >
                      <span className="text-neutral-500 font-mono text-[10px]">•</span>
                      <Input
                        value={bullet}
                        onChange={(e) => updateResponsibility(expIdx, bulletIdx, e.target.value)}
                        placeholder="Accomplished [X] as measured by [Y], by doing [Z]..."
                        className="h-7 text-xs bg-neutral-950 border-neutral-800 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeResponsibility(expIdx, bulletIdx)}
                        className="text-neutral-600 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Education */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30">
        <button
          type="button"
          onClick={() => toggleSection("education")}
          className="w-full flex items-center justify-between p-3.5 bg-neutral-900/80 hover:bg-neutral-800/60 transition-colors text-left text-neutral-200 font-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-semibold tracking-tight">
              Education ({(data.education || []).length})
            </span>
          </div>
          {openSections.education ? (
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          )}
        </button>

        {openSections.education && (
          <div className="p-3.5 space-y-3 bg-neutral-950/60 border-t border-neutral-800/80">
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addEducation}
                className="h-7 text-xs border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Education
              </Button>
            </div>

            {(data.education || []).map((edu, eduIdx) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: Order is user controlled
                key={eduIdx}
                className="p-3 border border-neutral-800/80 rounded-md bg-neutral-900/40 space-y-2.5 relative"
              >
                <button
                  type="button"
                  onClick={() => removeEducationItem(eduIdx)}
                  className="absolute top-3 right-3 text-neutral-500 hover:text-red-400 transition-colors"
                  title="Remove Education"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-6">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Institution / University
                    </label>
                    <Input
                      value={edu.institution}
                      onChange={(e) => updateEducationItem(eduIdx, { institution: e.target.value })}
                      placeholder="e.g. UC Berkeley"
                      className="h-7 text-xs bg-neutral-950 border-neutral-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Degree
                    </label>
                    <Input
                      value={edu.degree}
                      onChange={(e) => updateEducationItem(eduIdx, { degree: e.target.value })}
                      placeholder="e.g. B.S. in Computer Science"
                      className="h-7 text-xs bg-neutral-950 border-neutral-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Location
                    </label>
                    <Input
                      value={edu.location}
                      onChange={(e) => updateEducationItem(eduIdx, { location: e.target.value })}
                      placeholder="Berkeley, CA"
                      className="h-7 text-xs bg-neutral-950 border-neutral-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Start Year
                    </label>
                    <Input
                      value={edu.startDate || ""}
                      onChange={(e) => updateEducationItem(eduIdx, { startDate: e.target.value })}
                      placeholder="e.g. 2016"
                      className="h-7 text-xs bg-neutral-950 border-neutral-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Graduation Year
                    </label>
                    <Input
                      value={edu.endDate}
                      onChange={(e) => updateEducationItem(eduIdx, { endDate: e.target.value })}
                      placeholder="e.g. 2020"
                      className="h-7 text-xs bg-neutral-950 border-neutral-800"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Technical Skills */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30">
        <button
          type="button"
          onClick={() => toggleSection("skills")}
          className="w-full flex items-center justify-between p-3.5 bg-neutral-900/80 hover:bg-neutral-800/60 transition-colors text-left text-neutral-200 font-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-semibold tracking-tight">Skills</span>
          </div>
          {openSections.skills ? (
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          )}
        </button>

        {openSections.skills && (
          <div className="p-3.5 space-y-2 bg-neutral-950/60 border-t border-neutral-800/80">
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">
              Comma-Separated Skills
            </label>
            <Input
              value={(data.skills || []).join(", ")}
              onChange={(e) => updateSkillsText(e.target.value)}
              placeholder="Go, TypeScript, Kubernetes, PostgreSQL, Cloudflare, AWS"
              className="h-8 text-xs bg-neutral-900 border-neutral-800 text-neutral-100"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(data.skills || []).map((skill, idx) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: Display pill
                  key={idx}
                  className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[11px]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Projects */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30">
        <button
          type="button"
          onClick={() => toggleSection("projects")}
          className="w-full flex items-center justify-between p-3.5 bg-neutral-900/80 hover:bg-neutral-800/60 transition-colors text-left text-neutral-200 font-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">
              Projects ({(data.projects || []).length})
            </span>
          </div>
          {openSections.projects ? (
            <ChevronDown className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          )}
        </button>

        {openSections.projects && (
          <div className="p-3.5 space-y-3 bg-neutral-950/60 border-t border-neutral-800/80">
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addProject}
                className="h-7 text-xs border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Project
              </Button>
            </div>

            {(data.projects || []).map((proj, projIdx) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: Order is user controlled
                key={projIdx}
                className="p-3 border border-neutral-800/80 rounded-md bg-neutral-900/40 space-y-2 relative"
              >
                <button
                  type="button"
                  onClick={() => removeProjectItem(projIdx)}
                  className="absolute top-3 right-3 text-neutral-500 hover:text-red-400 transition-colors"
                  title="Remove Project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-6">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Project Title
                    </label>
                    <Input
                      value={proj.title}
                      onChange={(e) => updateProjectItem(projIdx, { title: e.target.value })}
                      placeholder="Project Name"
                      className="h-7 text-xs bg-neutral-950 border-neutral-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Technologies
                    </label>
                    <Input
                      value={proj.technologies}
                      onChange={(e) => updateProjectItem(projIdx, { technologies: e.target.value })}
                      placeholder="React, Next.js, Rust"
                      className="h-7 text-xs bg-neutral-950 border-neutral-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Description
                  </label>
                  <Textarea
                    value={proj.description}
                    onChange={(e) => updateProjectItem(projIdx, { description: e.target.value })}
                    placeholder="Brief description of project impact..."
                    className="min-h-[50px] text-xs bg-neutral-950 border-neutral-800 leading-relaxed resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
