import type { ResumeData } from "@/types/resume";

interface ResumePreviewProps {
  data: ResumeData;
}

export function ResumePreview({ data }: ResumePreviewProps) {
  // Guard against missing data
  const personalInfo = data?.personalInfo || {
    name: "",
    title: "",
    phone: "",
    email: "",
    linkedin: "",
    location: "",
  };
  const summary = data?.summary || "";
  const experience = data?.experience || [];
  const education = data?.education || [];
  const skills = (data?.skills || []).filter((s) => s.trim());
  const certifications = data?.certifications || [];
  const projects = data?.projects || [];
  const languages = data?.languages || [];

  return (
    <article
      id="resume-preview"
      style={{
        fontFamily: "'Lato', 'Segoe UI', Arial, sans-serif",
        width: "210mm",
        minHeight: "297mm",
        backgroundColor: "#ffffff",
        color: "#2b2b2b",
        boxSizing: "border-box",
        padding: "12.7mm",
        fontSize: "10pt",
        lineHeight: 1.4,
      }}
    >
      {/* --- HEADER --- */}
      <header style={{ textAlign: "center", marginBottom: "8px" }}>
        <h1
          style={{
            fontSize: "24pt",
            fontWeight: 700,
            color: "#2b2b2b",
            margin: 0,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          {personalInfo.name || "Your Name"}
        </h1>
        {personalInfo.title && (
          <div
            style={{
              fontSize: "13pt",
              color: "#003366",
              marginTop: "2px",
            }}
          >
            {personalInfo.title}
          </div>
        )}
        <div
          style={{
            fontSize: "9pt",
            color: "#2b2b2b",
            marginTop: "4px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.phone && personalInfo.email && <span style={{ margin: "0 2px" }}>|</span>}
          {personalInfo.email && (
            <a
              href={`mailto:${personalInfo.email}`}
              style={{ color: "#003366", textDecoration: "none" }}
            >
              {personalInfo.email}
            </a>
          )}
          {personalInfo.linkedin && (
            <>
              <span style={{ margin: "0 2px" }}>|</span>
              <a
                href={`https://${personalInfo.linkedin.replace(/^https?:\/\//, "")}`}
                style={{ color: "#003366", textDecoration: "none" }}
              >
                {personalInfo.linkedin.replace(/^https?:\/\//, "")}
              </a>
            </>
          )}
          {personalInfo.location && (
            <>
              <span style={{ margin: "0 2px" }}>|</span>
              <span>{personalInfo.location}</span>
            </>
          )}
        </div>
      </header>

      {/* --- SUMMARY --- */}
      {summary.trim() && (
        <Section title="Summary">
          <p style={{ margin: 0, fontSize: "10pt", lineHeight: 1.5 }}>{summary}</p>
        </Section>
      )}

      {/* --- TECHNICAL SKILLS --- */}
      {skills.length > 0 && (
        <Section title="Technical Skills">
          <ul
            style={{
              margin: 0,
              paddingLeft: "14px",
              listStyleType: "disc",
            }}
          >
            <li style={{ fontSize: "10pt", lineHeight: 1.5 }}>{skills.join(", ")}</li>
          </ul>
        </Section>
      )}

      {/* --- PROFESSIONAL EXPERIENCE --- */}
      {experience.length > 0 && (
        <Section title="Professional Experience">
          {experience.map((exp, index) => (
            <div key={index} style={{ marginBottom: "10px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "10pt" }}>{exp.company}</span>
                <span style={{ fontSize: "10pt" }}>{exp.location}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontStyle: "italic", fontSize: "10pt" }}>{exp.title}</span>
                <span style={{ fontSize: "10pt" }}>
                  {exp.startDate ? `${exp.startDate} — ` : ""}
                  {exp.endDate}
                </span>
              </div>
              {exp.description && exp.description.trim() && (
                <p
                  style={{
                    fontSize: "10pt",
                    color: "#444",
                    fontStyle: "italic",
                    margin: "2px 0",
                    lineHeight: 1.4,
                  }}
                >
                  {exp.description}
                </p>
              )}
              {exp.responsibilities &&
                exp.responsibilities.length > 0 &&
                exp.responsibilities.some((r) => r.trim()) && (
                  <ul
                    style={{
                      margin: "3px 0 0 0",
                      paddingLeft: "16px",
                      listStyleType: "disc",
                    }}
                  >
                    {exp.responsibilities
                      .filter((r) => r.trim())
                      .map((resp, idx) => (
                        <li
                          key={idx}
                          style={{
                            fontSize: "10pt",
                            lineHeight: 1.4,
                            marginBottom: "1px",
                          }}
                        >
                          {resp}
                        </li>
                      ))}
                  </ul>
                )}
            </div>
          ))}
        </Section>
      )}

      {/* --- CERTIFICATIONS --- */}
      {certifications.length > 0 && (
        <Section title="Certifications">
          <ul
            style={{
              margin: 0,
              paddingLeft: "14px",
              listStyleType: "disc",
            }}
          >
            {certifications.map((cert, index) => (
              <li
                key={index}
                style={{
                  fontSize: "10pt",
                  lineHeight: 1.5,
                  marginBottom: "2px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span>
                    <strong>{cert.title}</strong>
                    {cert.issuer && (
                      <>
                        {" "}
                        | <em>{cert.issuer}</em>
                      </>
                    )}
                  </span>
                  {cert.date && (
                    <span
                      style={{
                        fontSize: "10pt",
                        flexShrink: 0,
                        marginLeft: "8px",
                      }}
                    >
                      {cert.date}
                    </span>
                  )}
                </div>
                {cert.link && cert.link.trim() && (
                  <div style={{ fontSize: "9pt", marginTop: "1px" }}>
                    <a
                      href={cert.link}
                      style={{ color: "#003366", textDecoration: "none" }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Credential ↗
                    </a>
                  </div>
                )}
                {cert.skills && cert.skills.trim() && (
                  <div
                    style={{
                      fontSize: "9pt",
                      color: "#555",
                      marginTop: "1px",
                    }}
                  >
                    Skills: {cert.skills}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* --- KEY PROJECTS --- */}
      {projects.length > 0 && (
        <Section title="Key Projects">
          {projects.map((project, index) => (
            <div key={index} style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "10pt" }}>
                <strong>{project.title}</strong>
                {project.technologies && project.technologies.trim() && (
                  <span>
                    {" "}
                    | <em>{project.technologies}</em>
                  </span>
                )}
              </div>
              {project.description && project.description.trim() && (
                <ul
                  style={{
                    margin: "2px 0 0 0",
                    paddingLeft: "16px",
                    listStyleType: "disc",
                  }}
                >
                  {project.description
                    .split("\n")
                    .filter((l) => l.trim())
                    .map((line, idx) => (
                      <li
                        key={idx}
                        style={{
                          fontSize: "10pt",
                          lineHeight: 1.4,
                          marginBottom: "1px",
                        }}
                      >
                        {line}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* --- EDUCATION --- */}
      {education.length > 0 && (
        <Section title="Education">
          {education.map((edu, index) => (
            <div key={index} style={{ marginBottom: "6px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "10pt" }}>{edu.institution}</span>
                <span style={{ fontSize: "10pt" }}>
                  {edu.startDate ? `${edu.startDate} — ` : ""}
                  {edu.endDate}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: "10pt" }}>{edu.degree}</span>
                <span style={{ fontSize: "10pt" }}>{edu.location}</span>
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* --- LANGUAGES --- */}
      {languages.length > 0 && (
        <Section title="Languages">
          <p style={{ margin: 0, fontSize: "10pt" }}>
            {languages.map((lang, i) => (
              <span key={lang.name + i}>
                {i > 0 && ", "}
                <strong>{lang.name}</strong>
                {lang.level && ` (${lang.level})`}
              </span>
            ))}
          </p>
        </Section>
      )}
    </article>
  );
}

/* Reusable section component matching LaTeX \section formatting */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "7px", marginBottom: "5px" }}>
      <h2
        style={{
          fontSize: "12pt",
          fontWeight: 700,
          fontVariant: "small-caps",
          color: "#2b2b2b",
          margin: 0,
          paddingBottom: "3px",
          borderBottom: "1px solid #2b2b2b",
          marginBottom: "5px",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
