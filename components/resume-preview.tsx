import type { ResumeData } from "@/types/resume";

interface ResumePreviewProps {
  data: ResumeData;
}

export function ResumePreview({ data }: ResumePreviewProps) {
  return (
    <div
      id="resume-preview"
      className="bg-white text-gray-800"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        width: "100%",
        minHeight: "297mm",
        backgroundColor: "#ffffff",
        color: "#1f2937",
      }}
    >
      <div
        className="max-w-[210mm] mx-auto px-4 py-4 grid grid-cols-[1fr_2fr] gap-5"
        style={{
          maxWidth: "210mm",
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingTop: "16px",
          paddingBottom: "16px",
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "20px",
        }}
      >
        {/* Header - Full Width */}
        <div className="col-span-2 mb-1 border-b border-gray-300 pb-1">
          <h1
            className="text-3xl font-bold text-gray-900 mb-0.5 tracking-wide"
            style={{ fontSize: "24px" }}
          >
            {data.personalInfo.name}
          </h1>
          <div className="text-base text-gray-600 mb-2" style={{ fontSize: "14px" }}>
            {data.personalInfo.title}
          </div>
          <div
            className="flex flex-wrap gap-3 text-[10px] text-gray-700"
            style={{ fontSize: "10px" }}
          >
            <span>{data.personalInfo.phone}</span>
            <span>
              Email:{" "}
              <a href={`mailto:${data.personalInfo.email}`} className="text-blue-600 no-underline">
                {data.personalInfo.email}
              </a>
            </span>
            <span>
              LinkedIn:{" "}
              <a
                href={`https://${data.personalInfo.linkedin}`}
                className="text-blue-600 no-underline"
              >
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
              <h2
                className="text-[12px] font-bold uppercase text-gray-900 mb-2 tracking-widest"
                style={{ fontSize: "12px" }}
              >
                Education
              </h2>
              {data.education.map((edu, index) => (
                <div key={index} className="mb-3">
                  <div
                    className="text-[12px] font-semibold text-gray-900 leading-tight"
                    style={{ fontSize: "12px" }}
                  >
                    {edu.degree}
                  </div>
                  <div className="text-[11px] text-blue-600 mb-0.5" style={{ fontSize: "11px" }}>
                    {edu.institution}
                  </div>
                  <div className="text-[10px] text-gray-600" style={{ fontSize: "10px" }}>
                    {edu.startDate} - {edu.endDate} {edu.location}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Languages */}
          {data.languages.length > 0 && (
            <section>
              <h2
                className="text-[12px] font-bold uppercase text-gray-900 mb-2 tracking-widest"
                style={{ fontSize: "12px" }}
              >
                Languages
              </h2>
              {data.languages.map((lang, index) => (
                <div
                  key={index}
                  className="flex justify-between text-[11px] mb-1.5"
                  style={{ fontSize: "11px" }}
                >
                  <span className="font-semibold text-gray-900">{lang.name}</span>
                  <span className="text-gray-600">{lang.level}</span>
                </div>
              ))}
            </section>
          )}

          {/* Skills */}
          {data.skills.length > 0 && (
            <section>
              <h2
                className="text-[12px] font-bold uppercase text-gray-900 mb-2 tracking-widest"
                style={{ fontSize: "12px" }}
              >
                Skills
              </h2>
              <div
                className="text-[10px] text-gray-700 leading-relaxed"
                style={{ fontSize: "10px" }}
              >
                {data.skills.filter((s) => s.trim()).join(", ")}
              </div>
            </section>
          )}

          {/* Certifications */}
          {data.certifications.length > 0 && (
            <section>
              <h2
                className="text-[12px] font-bold uppercase text-gray-900 mb-2 tracking-widest"
                style={{ fontSize: "12px" }}
              >
                Certifications
              </h2>
              {data.certifications.map((cert, index) => (
                <div key={index} className="mb-2.5">
                  <div
                    className="text-[11px] font-semibold text-gray-900 leading-tight"
                    style={{ fontSize: "11px" }}
                  >
                    {cert.title}
                  </div>
                  <div className="text-[10px] text-gray-600" style={{ fontSize: "10px" }}>
                    {cert.issuer} • {cert.date}
                  </div>
                  {cert.link && cert.link.trim() && (
                    <div className="text-[9px] mt-0.5" style={{ fontSize: "9px" }}>
                      <a
                        href={cert.link}
                        className="text-blue-600 no-underline hover:underline"
                        style={{ color: "#2563eb", textDecoration: "none", cursor: "pointer" }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Credential
                      </a>
                    </div>
                  )}
                  {cert.skills && cert.skills.trim() && (
                    <div className="text-[10px] text-gray-700 mt-0.5" style={{ fontSize: "10px" }}>
                      {cert.skills}
                    </div>
                  )}
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
              <h2
                className="text-[12px] font-bold uppercase text-gray-900 mb-2 tracking-widest"
                style={{ fontSize: "12px" }}
              >
                Summary
              </h2>
              <p className="text-[11px] leading-relaxed text-gray-700" style={{ fontSize: "11px" }}>
                {data.summary}
              </p>
            </section>
          )}

          {/* Experience */}
          {data.experience.length > 0 && (
            <section>
              <h2
                className="text-[12px] font-bold uppercase text-gray-900 mb-2 tracking-widest"
                style={{ fontSize: "12px" }}
              >
                Experience
              </h2>
              {data.experience.map((exp, index) => (
                <div key={index} className="mb-4">
                  <div className="mb-0.5">
                    <div
                      className="text-[13px] font-semibold text-gray-900"
                      style={{ fontSize: "13px" }}
                    >
                      {exp.title}
                    </div>
                    <div
                      className="text-[12px] text-blue-600 font-medium"
                      style={{ fontSize: "12px" }}
                    >
                      {exp.company}
                    </div>
                    <div className="text-[10px] text-gray-600" style={{ fontSize: "10px" }}>
                      {exp.startDate} - {exp.endDate} • {exp.location}
                    </div>
                  </div>
                  {exp.description && (
                    <div
                      className="text-[10px] text-gray-600 italic mb-1.5"
                      style={{ fontSize: "10px" }}
                    >
                      {exp.description}
                    </div>
                  )}
                  {exp.responsibilities.length > 0 && exp.responsibilities[0] && (
                    <ul className="list-none pl-0">
                      {exp.responsibilities
                        .filter((r) => r.trim())
                        .map((resp, idx) => (
                          <li
                            key={idx}
                            className="text-[11px] text-gray-700 mb-0.5 pl-2.5 relative leading-snug"
                            style={{ fontSize: "11px" }}
                          >
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
              <h2
                className="text-[12px] font-bold uppercase text-gray-900 mb-2 tracking-widest"
                style={{ fontSize: "12px" }}
              >
                Projects
              </h2>
              {data.projects.map((project, index) => (
                <div key={index} className="mb-3">
                  <div
                    className="text-[12px] font-semibold text-gray-900"
                    style={{ fontSize: "12px" }}
                  >
                    {project.title}
                  </div>
                  {project.description && (
                    <div
                      className="text-[11px] text-gray-700 mb-0.5 leading-snug"
                      style={{ fontSize: "11px" }}
                    >
                      {project.description}
                    </div>
                  )}
                  {project.technologies && (
                    <div className="text-[10px] text-blue-600" style={{ fontSize: "10px" }}>
                      {project.technologies}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
