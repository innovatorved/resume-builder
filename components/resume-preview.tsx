import type { ResumeData } from "@/types/resume"

interface ResumePreviewProps {
  data: ResumeData
}

export function ResumePreview({ data }: ResumePreviewProps) {
  return (
    <div
      id="resume-preview"
      className="bg-white text-gray-800"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' }}
    >
      <div className="max-w-[210mm] mx-auto p-12 grid grid-cols-[1fr_2fr] gap-5">
        {/* Header - Full Width */}
        <div className="col-span-2 mb-1 border-b border-gray-300 pb-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-0.5 tracking-wide">{data.personalInfo.name}</h1>
          <div className="text-sm text-gray-600 mb-2">{data.personalInfo.title}</div>
          <div className="flex flex-wrap gap-3 text-[9px] text-gray-700">
            <span>{data.personalInfo.phone}</span>
            <span>
              <a href={`mailto:${data.personalInfo.email}`} className="text-blue-600 no-underline">
                {data.personalInfo.email}
              </a>
            </span>
            <span>
              <a href={`https://${data.personalInfo.linkedin}`} className="text-blue-600 no-underline">
                {data.personalInfo.linkedin}
              </a>
            </span>
            <span>{data.personalInfo.location}</span>
          </div>
        </div>

        {/* Left Column */}
        <div className="flex flex-col gap-[18px]">
          {/* Education */}
          {data.education.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold uppercase text-gray-900 mb-2 tracking-widest">Education</h2>
              {data.education.map((edu, index) => (
                <div key={index} className="mb-3">
                  <div className="text-[11px] font-semibold text-gray-900 leading-tight">{edu.degree}</div>
                  <div className="text-[10px] text-blue-600 mb-0.5">{edu.institution}</div>
                  <div className="text-[9px] text-gray-600">
                    {edu.startDate} - {edu.endDate} {edu.location}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Languages */}
          {data.languages.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold uppercase text-gray-900 mb-2 tracking-widest">Languages</h2>
              {data.languages.map((lang, index) => (
                <div key={index} className="flex justify-between text-[10px] mb-1.5">
                  <span className="font-semibold text-gray-900">{lang.name}</span>
                  <span className="text-gray-600">{lang.level}</span>
                </div>
              ))}
            </section>
          )}

          {/* Skills */}
          {data.skills.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold uppercase text-gray-900 mb-2 tracking-widest">Skills</h2>
              <div className="text-[9px] text-gray-700 leading-relaxed">
                {data.skills.filter((s) => s.trim()).join(", ")}
              </div>
            </section>
          )}

          {/* Certifications */}
          {data.certifications.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold uppercase text-gray-900 mb-2 tracking-widest">Certifications</h2>
              {data.certifications.map((cert, index) => (
                <div key={index} className="mb-2.5">
                  <div className="text-[10px] font-semibold text-gray-900 leading-tight">{cert.title}</div>
                  <div className="text-[9px] text-gray-600">
                    {cert.issuer} • {cert.date}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-[18px]">
          {/* Summary */}
          {data.summary && (
            <section>
              <h2 className="text-[11px] font-bold uppercase text-gray-900 mb-2 tracking-widest">Summary</h2>
              <p className="text-[10px] leading-relaxed text-gray-700">{data.summary}</p>
            </section>
          )}

          {/* Experience */}
          {data.experience.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold uppercase text-gray-900 mb-2 tracking-widest">Experience</h2>
              {data.experience.map((exp, index) => (
                <div key={index} className="mb-4">
                  <div className="mb-0.5">
                    <div className="text-[12px] font-semibold text-gray-900">{exp.title}</div>
                    <div className="text-[11px] text-blue-600 font-medium">{exp.company}</div>
                    <div className="text-[9px] text-gray-600">
                      {exp.startDate} - {exp.endDate} • {exp.location}
                    </div>
                  </div>
                  {exp.description && <div className="text-[9px] text-gray-600 italic mb-1.5">{exp.description}</div>}
                  {exp.responsibilities.length > 0 && exp.responsibilities[0] && (
                    <ul className="list-none pl-0">
                      {exp.responsibilities
                        .filter((r) => r.trim())
                        .map((resp, idx) => (
                          <li key={idx} className="text-[10px] text-gray-700 mb-0.5 pl-2.5 relative leading-snug">
                            <span className="absolute left-0 text-blue-600">•</span>
                            {resp}
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Projects */}
          {data.projects.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold uppercase text-gray-900 mb-2 tracking-widest">Projects</h2>
              {data.projects.map((project, index) => (
                <div key={index} className="mb-3">
                  <div className="text-[11px] font-semibold text-gray-900">{project.title}</div>
                  <div className="text-[9px] text-gray-600 mb-0.5">
                    {project.startDate} - {project.endDate}
                  </div>
                  {project.description && (
                    <div className="text-[10px] text-gray-700 mb-0.5 leading-snug">{project.description}</div>
                  )}
                  {project.technologies && <div className="text-[9px] text-blue-600">{project.technologies}</div>}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
