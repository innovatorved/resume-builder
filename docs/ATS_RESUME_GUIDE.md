# ATS Resume Architecture & Engineering Guide

This document defines the technical specifications, parsing mechanics, and content rules for generating Applicant Tracking System (ATS) compliant resumes within Resume Builder.

---

## 1. How Modern ATS Systems Work

Modern enterprise ATS platforms (Workday, Greenhouse, Lever, Taleo, iCIMS, Ashby) process resumes through a three-stage pipeline:

```
[Uploaded PDF/LaTeX] 
        │
        ▼ (Stage 1: Text & Glyph Extraction)
[Linear Plain Text Stream]
        │
        ▼ (Stage 2: Named Entity Recognition / NLP)
[Structured Candidate Schema: Contact, Roles, Dates, Education, Skills]
        │
        ▼ (Stage 3: Keyword & Semantic Scoring)
[Match Score vs. Job Description & Knockout Filters]
```

### Stage 1: Text & Glyph Extraction
- The parser extracts raw text from the document stream.
- In multi-column layouts or tables, stream extraction reads left-to-right across the entire page width, interweaving columns and scrambling work experience into gibberish.
- Bitmapped fonts or custom unmapped glyphs produce garbled Unicode characters. Standard Type 1 or TrueType fonts with valid Unicode mappings (such as Computer Modern or Times in LaTeX) guarantee 100% readable text extraction.

### Stage 2: Named Entity Recognition (NER)
- Machine learning models segment the text stream into semantic blocks based on standard heading anchors (`Experience`, `Education`, `Skills`, `Projects`, `Certifications`).
- Non-standard headings (such as *"My Journey"* or *"Where I've Been"*) fail header classification, causing entire job histories to be dropped from the parsed profile.
- Regex and date models parse chronological timelines. Standardized formats (`Month YYYY -- Month YYYY` or `Month YYYY -- Present`) ensure zero ambiguity in calculating years of experience.

### Stage 3: Keyword Matching & Knockout Filters
- Exact token matching: Recruiters filter by required keywords (e.g., "Kubernetes", "TypeScript", "PostgreSQL", "Cloudflare"). If a term is abbreviated or phrased ambiguously, it fails exact-token filters.
- Knockout questions: Missing education degrees, missing required certifications, or missing core technologies automatically disqualify candidates before a human recruiter reviews the application.

---

## 2. What MUST Be Included

### 1. Standard Contact Header
- **Full Legal Name**: Top of document in prominent bold heading.
- **Location**: City, State/Province, Country (full street address is unnecessary and omitted for privacy).
- **Phone Number**: International standard format (`+1 (555) 123-4567`).
- **Professional Email**: Clean address (`name@domain.com`).
- **Live URLs**: LinkedIn profile, GitHub profile, and portfolio/website with explicit text (e.g., `linkedin.com/in/username`).

### 2. Standardized Section Headings
Use only universally recognized section titles:
- `Work Experience` or `Experience`
- `Education`
- `Technical Skills` or `Skills`
- `Projects`
- `Certifications` or `Licenses & Certifications`

### 3. Chronological Role Metadata
Every employment or project entry must follow a consistent hierarchy:
- **Job Title**: Clear, industry-standard title (e.g., *Senior Backend Engineer*).
- **Company / Organization Name**: Official company name.
- **Location**: City, State or *Remote*.
- **Date Range**: Formatted as `Month YYYY -- Month YYYY` or `Month YYYY -- Present` (e.g., `June 2022 -- Present`).

### 4. Google's XYZ Formula for Bullet Points
Every bullet point must describe tangible accomplishment rather than passive job responsibilities:
$$\text{Accomplished } [X] \text{ as measured by } [Y], \text{ by doing } [Z]$$

- **Formula Breakdown**:
  - **X (Accomplished)**: What was achieved or built.
  - **Y (Measured by)**: Quantifiable metric, percentage, latency reduction, cost savings, or throughput increase.
  - **Z (By doing)**: Specific tools, algorithms, architectures, or methodologies employed.
- **Action Verbs**: Begin every bullet point with an assertive past-tense verb (or present-tense for current role): *Architected, Engineered, Implemented, Scaled, Automated, Reduced, Spearheaded*.

### 5. Categorized Technical Skills
Organize skills into logical clusters rather than an unorganized comma-separated wall:
- **Languages**: TypeScript, Go, Python, SQL, C++
- **Frameworks & Runtimes**: React, Astro, Node.js, Next.js
- **Cloud & Infrastructure**: Cloudflare Workers, Durable Objects, AWS, Docker, Kubernetes, Terraform
- **Databases & Storage**: PostgreSQL, Turso (libSQL), Redis, Cloudflare R2

### 6. Official Certifications
List verified certifications with full official name, issuing vendor, and year:
- *AWS Certified Solutions Architect -- Associate (Amazon Web Services, 2024)*
- *Certified Kubernetes Administrator (CKA, The Linux Foundation, 2024)*

---

## 3. What MUST NOT Be Included (ATS Traps)

| Anti-Pattern | Why ATS Rejects or Penalizes | Correct Standard |
| :--- | :--- | :--- |
| **Multi-Column Layouts** | Text stream parser reads across columns, mixing unrelated lines | Single-column linear layout |
| **Tables & Grids** | Parsers strip cell formatting or fail to identify rows | Clean LaTeX vertical blocks (`\vspace`, `\resumeItem`) |
| **Headshots & Photos** | Triggers OCR confusion and EEOC compliance rejection | No photos or graphics |
| **Skill Rating Bars / Stars** | "85% Python" or "4/5 stars" is unparseable and penalizes rank | List skills as named text under categories |
| **Icons without Text** | Mail/phone icon graphics disappear in text extraction | Include explicit text or standard link anchors |
| **Info in Running Headers/Footers** | Many ATS parsers completely ignore PDF running headers/footers | Place all contact info inside document body |
| **Unusual Fonts** | Non-standard font glyphs fail Unicode mapping | Standard Type 1 / OpenType fonts with clear Unicode mappings |
| **Fabricated Claims** | Immediate disqualification during background check | Ground strictly in candidate's verified knowledge base |
| **Unescaped LaTeX Characters** | Characters like `%`, `&`, `$`, `_`, `#` break compilation | Escape all LaTeX special characters (`\%`, `\&`, `\_`) |

---

## 4. Prompt Grounding Implementation

The AI Copilot and Tailor engines (`src/pages/api/ai/copilot.ts` and `src/pages/api/ai/tailor.ts`) embed these directives directly into system prompts:
1. Enforces single-column compilable LaTeX.
2. Formats all achievements with the Google XYZ formula.
3. Aligns keyword tokens with target job requirements using verified candidate knowledge.
4. Strips all placeholder tokens, rating bars, and multi-column tables.
