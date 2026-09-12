"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Compass,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  HelpCircle,
  History,
  Layers,
  Link2,
  MousePointer,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Hotspot {
  id: string;
  num: number;
  label: string;
  targetName: string;
  position: { top: string; left: string };
  pointerDirection?: "top" | "bottom" | "left" | "right";
  actionText: string;
  effectText: string;
  tip?: string;
}

interface TourSlide {
  id: string;
  stepNumber: number;
  badge: string;
  title: string;
  subtitle: string;
  summary: string;
  ctaText: string;
  ctaAction?: () => void;
  ctaHref?: string;
  hotspots: Hotspot[];
  renderMockup: (activeHotspotId: string, onSelectHotspot: (id: string) => void) => React.ReactNode;
}

const STORAGE_KEY = "resume_builder_instruction_tour_seen_v1";

export function InstructionTourDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeHotspotId, setActiveHotspotId] = useState<string>("h1");

  const slides: TourSlide[] = [
    // SLIDE 1: Career Knowledge Hub
    {
      id: "knowledge-hub",
      stepNumber: 1,
      badge: "Step 1 of 5 • Knowledge Hub",
      title: "Connect Your Career Knowledge Base",
      subtitle: "Anchor your resumes in verified career evidence to eliminate hallucinations",
      summary:
        "The Knowledge Hub crawls and parses your actual repositories, LinkedIn profile, previous resumes, and portfolios. Cloudflare Durable Objects synthesize everything into structured Markdown evidence stored securely in R2.",
      ctaText: "Explore Knowledge Hub",
      ctaHref: "/knowledge",
      hotspots: [
        {
          id: "h1",
          num: 1,
          label: "1. Add Sources",
          targetName: "Top Action: '+ Add Source'",
          position: { top: "18%", left: "82%" },
          pointerDirection: "bottom",
          actionText: "Click '+ Add Source' to choose GitHub, LinkedIn, Website, or Resume upload",
          effectText: "Opens the modal to link your public profiles or upload CV documents",
          tip: "Upload your official LinkedIn PDF export for complete job titles and verified tenure dates.",
        },
        {
          id: "h2",
          num: 2,
          label: "2. Extraction Pipeline",
          targetName: "Live Ingestion Status Card",
          position: { top: "54%", left: "40%" },
          pointerDirection: "top",
          actionText: "Watch the Durable Object stream live fetching, parsing, and indexing steps",
          effectText: "Turns raw unformatted content into verified Markdown career facts",
          tip: "All files and extracted data are isolated per tenant in private R2 storage.",
        },
        {
          id: "h3",
          num: 3,
          label: "3. Career Copilot Query",
          targetName: "Evidence Search & Q&A Assistant",
          position: { top: "82%", left: "68%" },
          pointerDirection: "top",
          actionText: "Ask natural questions like 'What are my top React and Cloudflare achievements?'",
          effectText: "Retrieves exact source quotes and facts to power your resume bullets",
          tip: "Cloudflare AI Search automatically vectors your documents for lightning-fast retrieval.",
        },
      ],
      renderMockup: (activeId, onSelect) => (
        <div className="relative w-full h-[260px] sm:h-[300px] bg-neutral-950 rounded-xl border border-neutral-800/90 overflow-hidden select-none p-3 flex flex-col font-sans">
          {/* Top Mockup App Bar */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-[11px] font-mono text-neutral-400 ml-2 flex items-center gap-1">
                <span className="text-white font-semibold">ResumeBuilder</span> / knowledge
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AI Synced
              </span>
              <div
                onClick={() => onSelect("h1")}
                className={`relative px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer flex items-center gap-1 ${
                  activeId === "h1"
                    ? "bg-white text-black ring-2 ring-blue-500 shadow-lg"
                    : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                }`}
              >
                <Plus className="w-3 h-3" />
                <span>Add Source</span>
              </div>
            </div>
          </div>

          {/* Body Columns */}
          <div className="grid grid-cols-12 gap-2 flex-1 overflow-hidden">
            {/* Left Sources List */}
            <div className="col-span-7 flex flex-col gap-1.5 overflow-hidden">
              <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Connected Sources
              </div>

              {/* Source Card 1 */}
              <div
                onClick={() => onSelect("h2")}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  activeId === "h2"
                    ? "border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50"
                    : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-semibold text-white">github.com/innovatorved</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950 border border-blue-800 text-blue-300">
                    indexed
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1 line-clamp-1">
                  14 repositories, 89 commits extracted into verified evidence
                </p>
              </div>

              {/* Source Card 2 */}
              <div
                onClick={() => onSelect("h2")}
                className="p-2 rounded-lg border border-neutral-800/80 bg-neutral-900/40 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-semibold text-neutral-300">linkedin_profile.pdf</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                    verified
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1 line-clamp-1">
                  Experience: Senior Architect @ Cloud Systems, Education: B.Tech
                </p>
              </div>
            </div>

            {/* Right Assistant Panel */}
            <div
              onClick={() => onSelect("h3")}
              className={`col-span-5 rounded-lg border p-2 flex flex-col justify-between transition-all cursor-pointer ${
                activeId === "h3"
                  ? "border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50"
                  : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700"
              }`}
            >
              <div className="flex items-center gap-1 text-[10px] font-semibold text-neutral-300">
                <Bot className="w-3.5 h-3.5 text-blue-400" />
                <span>Career Copilot</span>
              </div>
              <div className="bg-neutral-950/80 rounded p-1.5 border border-neutral-800/60 my-1 text-[10px] text-neutral-300">
                <span className="text-blue-400 font-medium">Fact:</span> Built distributed sync
                protocol handling 1.2M queries/day.
              </div>
              <div className="flex items-center gap-1 bg-neutral-800/80 rounded px-2 py-1 text-[9px] text-neutral-400 border border-neutral-700/60">
                <Search className="w-2.5 h-2.5" />
                <span className="truncate">Ask question from sources...</span>
              </div>
            </div>
          </div>

          {/* Interactive Hotspot Pulsing Markers */}
          <HotspotBadge
            num={1}
            active={activeId === "h1"}
            onClick={() => onSelect("h1")}
            position={{ top: "8px", right: "24px" }}
            title="Click to see where to add sources"
          />
          <HotspotBadge
            num={2}
            active={activeId === "h2"}
            onClick={() => onSelect("h2")}
            position={{ top: "110px", left: "20%" }}
            title="Click to see source extraction"
          />
          <HotspotBadge
            num={3}
            active={activeId === "h3"}
            onClick={() => onSelect("h3")}
            position={{ top: "110px", right: "12%" }}
            title="Click to see Copilot queries"
          />
        </div>
      ),
    },

    // SLIDE 2: Dashboard & Creation
    {
      id: "dashboard-management",
      stepNumber: 2,
      badge: "Step 2 of 5 • Dashboard",
      title: "Create, Import & Manage Resumes",
      subtitle: "Your central hub for all resume variants, version branches, and exports",
      summary:
        "Easily kickstart a fresh LaTeX resume from proven clean templates, or import your existing PDF/LaTeX file with automatic layout parsing. Duplicate tailored versions for each target company.",
      ctaText: "Go to Dashboard",
      ctaHref: "/",
      hotspots: [
        {
          id: "h1",
          num: 1,
          label: "1. '+ New' Button",
          targetName: "Top Right: '+ New Resume'",
          position: { top: "18%", left: "84%" },
          pointerDirection: "bottom",
          actionText: "Click the '+ New' button in the navigation header",
          effectText: "Creates a clean modern LaTeX template with standard sections and opens the split studio",
          tip: "Pre-loaded with your profile name and contact information automatically.",
        },
        {
          id: "h2",
          num: 2,
          label: "2. 'Upload' Button",
          targetName: "Top Right: 'Upload' Existing CV",
          position: { top: "18%", left: "70%" },
          pointerDirection: "bottom",
          actionText: "Click 'Upload' to parse an existing PDF, LaTeX (.tex), or Markdown file",
          effectText: "Converts previous work experience directly into editable code and adds it to your library",
          tip: "Supports two-way sync: keeps both raw LaTeX code and structured resume data in sync.",
        },
        {
          id: "h3",
          num: 3,
          label: "3. Resume Cards",
          targetName: "Document Cards & Action Icons",
          position: { top: "60%", left: "30%" },
          pointerDirection: "top",
          actionText: "Click on any resume title or card to edit, pin to top, duplicate, or download PDF",
          effectText: "Opens the interactive dual-pane LaTeX studio immediately",
          tip: "Use the pin icon to keep your primary general-purpose resume always at the top of your list.",
        },
      ],
      renderMockup: (activeId, onSelect) => (
        <div className="relative w-full h-[260px] sm:h-[300px] bg-neutral-950 rounded-xl border border-neutral-800/90 overflow-hidden select-none p-3 flex flex-col font-sans">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-[11px] font-mono text-neutral-300 ml-2">Dashboard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                onClick={() => onSelect("h2")}
                className={`px-2 py-1 text-[11px] font-medium rounded border transition-all cursor-pointer flex items-center gap-1 ${
                  activeId === "h2"
                    ? "bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-500"
                    : "bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>Upload</span>
              </div>
              <div
                onClick={() => onSelect("h1")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer flex items-center gap-1 ${
                  activeId === "h1"
                    ? "bg-white text-black ring-2 ring-blue-500 shadow-lg"
                    : "bg-neutral-100 text-black hover:bg-neutral-200"
                }`}
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </div>
            </div>
          </div>

          {/* Search bar mockup */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 bg-neutral-900/80 border border-neutral-800 rounded px-2.5 py-1 text-[10px] text-neutral-400 flex items-center gap-1.5">
              <Search className="w-3 h-3" />
              <span>Search resumes by name, skill, or role...</span>
            </div>
          </div>

          {/* Resume Cards Grid */}
          <div className="grid grid-cols-2 gap-2 flex-1">
            {/* Card 1 */}
            <div
              onClick={() => onSelect("h3")}
              className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                activeId === "h3"
                  ? "border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50"
                  : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Full-Stack Lead CV</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
                    pinned
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">
                  LaTeX Modern • Updated 2 hours ago • 4 snapshots
                </p>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[10px] text-neutral-400">
                <span className="text-blue-400 font-medium">Click to open studio</span>
                <div className="flex items-center gap-1 text-neutral-400">
                  <Download className="w-3 h-3 hover:text-white" />
                  <ExternalLink className="w-3 h-3 hover:text-white" />
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div
              onClick={() => onSelect("h3")}
              className="p-2.5 rounded-lg border border-neutral-800/80 bg-neutral-900/30 text-left flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300">Cloudflare AI Architect</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    tailored
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">
                  Tailored with Career Hub evidence for Cloudflare JD
                </p>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[10px] text-neutral-400">
                <span>Updated yesterday</span>
                <ChevronRight className="w-3 h-3 text-neutral-500" />
              </div>
            </div>
          </div>

          {/* Hotspot Markers */}
          <HotspotBadge
            num={1}
            active={activeId === "h1"}
            onClick={() => onSelect("h1")}
            position={{ top: "8px", right: "12px" }}
            title="Click to see New Resume button"
          />
          <HotspotBadge
            num={2}
            active={activeId === "h2"}
            onClick={() => onSelect("h2")}
            position={{ top: "8px", right: "75px" }}
            title="Click to see Upload button"
          />
          <HotspotBadge
            num={3}
            active={activeId === "h3"}
            onClick={() => onSelect("h3")}
            position={{ top: "95px", left: "15%" }}
            title="Click to see Resume card actions"
          />
        </div>
      ),
    },

    // SLIDE 3: Dual-Pane LaTeX Split Studio
    {
      id: "split-studio",
      stepNumber: 3,
      badge: "Step 3 of 5 • LaTeX Studio",
      title: "Desktop-Grade LaTeX Editor & Vector PDF",
      subtitle: "Instant real-time re-compilation with vector typography and zero setup",
      summary:
        "No TeX Live installation needed. The browser compiles LaTeX via client-side WebAssembly. Enjoy Monaco code completions on the left and sharp, interactive PDF preview on the right.",
      ctaText: "Open Resume Studio",
      ctaHref: "/resume/new",
      hotspots: [
        {
          id: "h1",
          num: 1,
          label: "1. Monaco Code Editor",
          targetName: "Left Pane: LaTeX Source Editor",
          position: { top: "50%", left: "25%" },
          pointerDirection: "right",
          actionText: "Click into the code pane to edit sections, bullet points, skills, and styling",
          effectText: "Provides LaTeX syntax highlighting, bracket matching, and keyboard shortcuts",
          tip: "Press Cmd+S (or Ctrl+S) anytime to trigger an instant recompilation.",
        },
        {
          id: "h2",
          num: 2,
          label: "2. Vector PDF Preview",
          targetName: "Right Pane: High-DPI Vector Preview",
          position: { top: "50%", left: "75%" },
          pointerDirection: "left",
          actionText: "Inspect your resume in true print quality as you type",
          effectText: "Renders exact page boundaries, margins, fonts, and multi-page flows",
          tip: "What you see here is 100% byte-for-byte identical to the final exported PDF.",
        },
        {
          id: "h3",
          num: 3,
          label: "3. Top Action Controls",
          targetName: "Header: Auto-Save, Save Version, & Recompile",
          position: { top: "15%", left: "80%" },
          pointerDirection: "bottom",
          actionText: "Click 'Save' to commit a permanent snapshot or 'Recompile' to refresh PDF",
          effectText: "Creates a version point in history and regenerates your vector document",
          tip: "Changes are automatically saved as draft in real-time as you write.",
        },
      ],
      renderMockup: (activeId, onSelect) => (
        <div className="relative w-full h-[260px] sm:h-[300px] bg-neutral-950 rounded-xl border border-neutral-800/90 overflow-hidden select-none p-2 flex flex-col font-sans">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-1.5 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Untitled Resume</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono">
                saved
              </span>
            </div>
            <div
              onClick={() => onSelect("h3")}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all cursor-pointer ${
                activeId === "h3" ? "ring-2 ring-blue-500 bg-blue-950/40" : ""
              }`}
            >
              <span className="text-[10px] text-neutral-400 flex items-center gap-1 hover:text-white">
                <History className="w-3 h-3" /> History
              </span>
              <div className="px-2 py-0.5 text-[10px] font-medium bg-white text-black rounded flex items-center gap-1">
                <Save className="w-2.5 h-2.5" /> Save
              </div>
              <div className="px-2 py-0.5 text-[10px] font-medium bg-neutral-800 text-neutral-200 rounded flex items-center gap-1">
                <Download className="w-2.5 h-2.5" /> Export
              </div>
            </div>
          </div>

          {/* Split Pane Mockup */}
          <div className="flex-1 grid grid-cols-2 gap-1.5 overflow-hidden">
            {/* Left Monaco Pane */}
            <div
              onClick={() => onSelect("h1")}
              className={`rounded-lg border p-2 bg-neutral-900/90 font-mono text-[10px] overflow-hidden flex flex-col transition-all cursor-pointer ${
                activeId === "h1"
                  ? "border-blue-500 ring-1 ring-blue-500/50"
                  : "border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <div className="flex items-center justify-between text-neutral-500 pb-1 border-b border-neutral-800 text-[9px]">
                <span className="flex items-center gap-1">
                  <Code2 className="w-3 h-3 text-blue-400" /> main.tex
                </span>
                <span>UTF-8</span>
              </div>
              <div className="mt-1 space-y-0.5 leading-tight text-neutral-300">
                <p>
                  <span className="text-pink-400">\documentclass</span>
                  <span className="text-neutral-500">[11pt]&#123;article&#125;</span>
                </p>
                <p>
                  <span className="text-pink-400">\begin</span>
                  <span className="text-neutral-500">&#123;document&#125;</span>
                </p>
                <p className="text-amber-300 font-semibold">\textbf&#123;Alex Chen&#125;</p>
                <p className="text-blue-300">\section&#123;Experience&#125;</p>
                <p className="text-neutral-400 pl-2">
                  <span className="text-purple-400">\resumeItem</span>&#123;Architected...&#125;
                </p>
                <p>
                  <span className="text-pink-400">\end</span>
                  <span className="text-neutral-500">&#123;document&#125;</span>
                </p>
              </div>
            </div>

            {/* Right PDF Preview Pane */}
            <div
              onClick={() => onSelect("h2")}
              className={`rounded-lg border bg-neutral-900/60 p-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeId === "h2"
                  ? "border-blue-500 ring-1 ring-blue-500/50"
                  : "border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <div className="w-[85%] h-[92%] bg-white rounded shadow-md p-2 text-neutral-900 font-serif flex flex-col justify-between">
                <div>
                  <div className="text-center pb-1 border-b border-neutral-300">
                    <div className="text-[11px] font-bold tracking-tight text-neutral-950">
                      ALEX CHEN
                    </div>
                    <div className="text-[7px] text-neutral-600">
                      alex@example.com • +1 555 0192 • San Francisco, CA
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="text-[8px] font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-400">
                      Experience
                    </div>
                    <div className="flex justify-between text-[7px] font-semibold mt-0.5">
                      <span>Senior Software Architect</span>
                      <span className="text-neutral-500">2022 – Present</span>
                    </div>
                    <div className="text-[6.5px] text-neutral-700 list-disc pl-2">
                      • Designed low-latency distributed pipeline serving 10M+ users
                    </div>
                  </div>
                </div>
                <div className="text-right text-[6px] text-neutral-400">Page 1 of 1</div>
              </div>
            </div>
          </div>

          {/* Hotspots */}
          <HotspotBadge
            num={1}
            active={activeId === "h1"}
            onClick={() => onSelect("h1")}
            position={{ top: "85px", left: "15%" }}
            title="Click to see Code Editor"
          />
          <HotspotBadge
            num={2}
            active={activeId === "h2"}
            onClick={() => onSelect("h2")}
            position={{ top: "85px", right: "20%" }}
            title="Click to see PDF Preview"
          />
          <HotspotBadge
            num={3}
            active={activeId === "h3"}
            onClick={() => onSelect("h3")}
            position={{ top: "8px", right: "25px" }}
            title="Click to see Actions"
          />
        </div>
      ),
    },

    // SLIDE 4: AI Copilot & Job Tailoring
    {
      id: "ai-copilot",
      stepNumber: 4,
      badge: "Step 4 of 5 • AI Tailoring",
      title: "Match & Tailor to Any Job Description",
      subtitle: "Gemini AI scans the job listing and optimizes your bullets with verified facts",
      summary:
        "Open the bottom AI Copilot bar, paste any job description or prompt, and let the AI propose pinpoint LaTeX diffs. It prioritizes relevant skills from your Knowledge Hub while strictly keeping formatting intact.",
      ctaText: "Try AI Copilot",
      ctaHref: "/resume/new",
      hotspots: [
        {
          id: "h1",
          num: 1,
          label: "1. AI Copilot Dock",
          targetName: "Bottom Dock: AI Assistant Bar",
          position: { top: "78%", left: "50%" },
          pointerDirection: "top",
          actionText: "Click on the bottom AI Copilot dock to expand the tailoring workspace",
          effectText: "Opens the prompt window with quick action chips ('Tailor for JD', 'Fix Grammar')",
          tip: "You can type custom instructions like 'Highlight my Kubernetes experience more'.",
        },
        {
          id: "h2",
          num: 2,
          label: "2. Paste Job Description",
          targetName: "Input Area: Target Role or JD",
          position: { top: "60%", left: "30%" },
          pointerDirection: "bottom",
          actionText: "Paste the job posting text and click 'Tailor Resume'",
          effectText: "Gemini analyzes keyword overlap and cross-references your career knowledge",
          tip: "The AI only uses verified achievements from your Knowledge Hub, ensuring 100% honesty.",
        },
        {
          id: "h3",
          num: 3,
          label: "3. 'Apply Changes'",
          targetName: "Diff Action: 'Apply to Resume'",
          position: { top: "60%", left: "80%" },
          pointerDirection: "bottom",
          actionText: "Review suggested code changes and click 'Apply to Resume'",
          effectText: "Directly inserts revised bullet points into your LaTeX code and triggers a live PDF recompile",
          tip: "You can always undo or revert via Version History if you change your mind.",
        },
      ],
      renderMockup: (activeId, onSelect) => (
        <div className="relative w-full h-[260px] sm:h-[300px] bg-neutral-950 rounded-xl border border-neutral-800/90 overflow-hidden select-none p-2 flex flex-col justify-between font-sans">
          {/* Top subtle editor background */}
          <div className="opacity-40 flex-1 grid grid-cols-2 gap-2 p-1 blur-[0.5px]">
            <div className="bg-neutral-900 rounded p-2 text-[9px] font-mono text-neutral-400">
              \section&#123;Experience&#125;
              <br />
              \resumeItem&#123;Built scalable distributed pipeline...&#125;
            </div>
            <div className="bg-neutral-900/60 rounded p-2 flex items-center justify-center">
              <div className="w-16 h-20 bg-white/20 rounded" />
            </div>
          </div>

          {/* Expanded Bottom Copilot Dock Mockup */}
          <div
            onClick={() => onSelect("h1")}
            className={`rounded-xl border p-2.5 bg-neutral-900/95 backdrop-blur-md shadow-2xl transition-all cursor-pointer ${
              activeId === "h1"
                ? "border-blue-500 ring-2 ring-blue-500/50"
                : "border-neutral-700/80 hover:border-neutral-600"
            }`}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-white">AI Tailor Copilot</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 border border-purple-800 text-purple-300 font-mono">
                  Gemini 2.5
                </span>
              </div>
              <span className="text-[10px] text-neutral-400">Ready to optimize</span>
            </div>

            <div className="grid grid-cols-12 gap-2 mt-2">
              {/* JD Input */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect("h2");
                }}
                className={`col-span-7 rounded-lg border p-1.5 bg-neutral-950 text-left transition-all ${
                  activeId === "h2"
                    ? "border-blue-500 ring-1 ring-blue-500"
                    : "border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="text-[9px] text-neutral-400 font-mono mb-0.5">Target Job Description:</div>
                <div className="text-[10px] text-neutral-200 line-clamp-2">
                  "Seeking Senior Cloud Engineer proficient with Cloudflare Workers, TypeScript, and
                  modern AI architectures..."
                </div>
              </div>

              {/* Recommendation & Apply */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect("h3");
                }}
                className={`col-span-5 rounded-lg border p-1.5 flex flex-col justify-between transition-all ${
                  activeId === "h3"
                    ? "border-blue-500 ring-1 ring-blue-500 bg-blue-950/20"
                    : "border-neutral-800 bg-neutral-950/60"
                }`}
              >
                <div className="text-[9px] text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-2.5 h-2.5" /> 3 bullet points tailored
                </div>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="px-2 py-0.5 text-[9px] font-medium bg-white text-black rounded hover:bg-neutral-200">
                    Apply to Resume
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hotspots */}
          <HotspotBadge
            num={1}
            active={activeId === "h1"}
            onClick={() => onSelect("h1")}
            position={{ bottom: "80px", left: "12px" }}
            title="Click to see AI Copilot Dock"
          />
          <HotspotBadge
            num={2}
            active={activeId === "h2"}
            onClick={() => onSelect("h2")}
            position={{ bottom: "35px", left: "20%" }}
            title="Click to see JD input"
          />
          <HotspotBadge
            num={3}
            active={activeId === "h3"}
            onClick={() => onSelect("h3")}
            position={{ bottom: "35px", right: "12%" }}
            title="Click to see Apply action"
          />
        </div>
      ),
    },

    // SLIDE 5: Version Snapshots & Export
    {
      id: "versions-and-export",
      stepNumber: 5,
      badge: "Step 5 of 5 • Export & History",
      title: "Point-in-Time Snapshots & PDF Export",
      subtitle: "Safe version history rollbacks and high-resolution ATS-optimized downloads",
      summary:
        "Every compile and save automatically writes an immutable snapshot to the database. If an AI tailor or edit isn't what you wanted, restore any prior snapshot in 1 click or download standard vector PDF and LaTeX source.",
      ctaText: "Get Started Now",
      ctaHref: "/",
      hotspots: [
        {
          id: "h1",
          num: 1,
          label: "1. 'Export' Dropdown",
          targetName: "Top Menu: 'Export -> Download PDF'",
          position: { top: "15%", left: "85%" },
          pointerDirection: "bottom",
          actionText: "Click 'Export' to download either high-res PDF or raw .tex source code",
          effectText: "Directly downloads your publication-ready, ATS-compliant PDF file to your machine",
          tip: "Vector text ensures applicant tracking systems (ATS) can parse every word cleanly.",
        },
        {
          id: "h2",
          num: 2,
          label: "2. 'History' Timeline",
          targetName: "Version Modal: Timeline Snapshots",
          position: { top: "45%", left: "40%" },
          pointerDirection: "right",
          actionText: "Click 'History' to browse chronologically saved versions with change summaries",
          effectText: "Inspect what changed between version snapshots with visual diff badges",
          tip: "Snapshots save both the raw LaTeX source and parsed structured resume data.",
        },
        {
          id: "h3",
          num: 3,
          label: "3. 'Restore' Button",
          targetName: "Timeline Action: 'Restore Version'",
          position: { top: "70%", left: "75%" },
          pointerDirection: "left",
          actionText: "Click 'Restore' next to any previous version",
          effectText: "Instantly rolls back the editor code and compiles the exact restored PDF",
          tip: "Restoring creates a brand new snapshot, so you never lose any historical work.",
        },
      ],
      renderMockup: (activeId, onSelect) => (
        <div className="relative w-full h-[260px] sm:h-[300px] bg-neutral-950 rounded-xl border border-neutral-800/90 overflow-hidden select-none p-3 flex flex-col font-sans">
          {/* Top Bar Mockup */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Full-Stack Lead CV</span>
              <span className="text-[10px] text-neutral-400 font-mono">v3 (active)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                onClick={() => onSelect("h2")}
                className={`px-2 py-1 text-[11px] font-medium rounded border transition-all cursor-pointer flex items-center gap-1 ${
                  activeId === "h2"
                    ? "bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500"
                    : "bg-neutral-900 border-neutral-800 text-neutral-200 hover:bg-neutral-800"
                }`}
              >
                <History className="w-3 h-3 text-amber-400" />
                <span>History</span>
              </div>
              <div
                onClick={() => onSelect("h1")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer flex items-center gap-1 ${
                  activeId === "h1"
                    ? "bg-white text-black ring-2 ring-blue-500 shadow-lg"
                    : "bg-neutral-100 text-black hover:bg-neutral-200"
                }`}
              >
                <Download className="w-3 h-3" />
                <span>Download PDF</span>
              </div>
            </div>
          </div>

          {/* Version History Drawer Mockup */}
          <div className="flex-1 bg-neutral-900/70 rounded-lg border border-neutral-800 p-2.5 flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between text-[10px] text-neutral-400 border-b border-neutral-800 pb-1">
              <span className="font-semibold text-neutral-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" /> Point-in-Time Snapshots
              </span>
              <span>3 snapshots recorded</span>
            </div>

            {/* Version item 3 */}
            <div className="p-2 rounded bg-neutral-950/80 border border-blue-500/60 flex items-center justify-between text-left">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Version 3</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
                    current
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  AI Tailored for Cloudflare Role • 2 mins ago
                </div>
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">Active</span>
            </div>

            {/* Version item 2 */}
            <div
              onClick={() => onSelect("h3")}
              className={`p-2 rounded border flex items-center justify-between text-left transition-all cursor-pointer ${
                activeId === "h3"
                  ? "bg-blue-950/30 border-blue-500 ring-1 ring-blue-500"
                  : "bg-neutral-950/40 border-neutral-800/80 hover:border-neutral-700"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-neutral-300">Version 2</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                    manual edit
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  Updated Experience section bullet points • 1 hour ago
                </div>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-medium bg-neutral-800 hover:bg-neutral-700 text-white rounded border border-neutral-700 flex items-center gap-1">
                <RotateCcw className="w-2.5 h-2.5 text-amber-400" /> Restore
              </span>
            </div>
          </div>

          {/* Hotspots */}
          <HotspotBadge
            num={1}
            active={activeId === "h1"}
            onClick={() => onSelect("h1")}
            position={{ top: "8px", right: "12px" }}
            title="Click to see Download PDF"
          />
          <HotspotBadge
            num={2}
            active={activeId === "h2"}
            onClick={() => onSelect("h2")}
            position={{ top: "8px", right: "125px" }}
            title="Click to see Version History"
          />
          <HotspotBadge
            num={3}
            active={activeId === "h3"}
            onClick={() => onSelect("h3")}
            position={{ bottom: "25px", right: "20px" }}
            title="Click to see Restore action"
          />
        </div>
      ),
    },
  ];

  const currentSlide = slides[currentSlideIndex];

  // Sync active hotspot when changing slide
  const handleSetSlide = useCallback(
    (index: number) => {
      const validIndex = Math.max(0, Math.min(index, slides.length - 1));
      setCurrentSlideIndex(validIndex);
      setActiveHotspotId(slides[validIndex].hotspots[0].id);
    },
    [slides]
  );

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      handleSetSlide(currentSlideIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      handleSetSlide(currentSlideIndex - 1);
    }
  };

  const handleDismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch (e) {
        console.warn("Storage error:", e);
      }
    }
    onOpenChange(false);
  }, [onOpenChange]);

  const handleComplete = () => {
    handleDismiss();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape") {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const activeHotspot =
    currentSlide.hotspots.find((h) => h.id === activeHotspotId) || currentSlide.hotspots[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleDismiss();
        } else {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl w-[95vw] p-0 overflow-hidden bg-neutral-950 border border-neutral-800 text-white shadow-2xl rounded-2xl"
      >
        {/* Top Sequence & Progress Bar */}
        <div className="relative w-full bg-neutral-900 h-1.5">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-neutral-800/80">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Compass className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[11px] font-mono tracking-wider uppercase text-neutral-400">
                {currentSlide.badge}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                {currentSlide.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[11px] text-neutral-400 font-mono">
              Use <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">←</kbd> <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">→</kbd> to navigate
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer z-50"
              aria-label="Close guide"
              title="Close guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 max-h-[75vh] overflow-y-auto">
          {/* Visual Interactive UI Mockup with Clickable Highlight Pins */}
          <div className="w-full">
            {currentSlide.renderMockup(activeHotspotId, (id) => setActiveHotspotId(id))}
          </div>

          {/* Highlight Sequence Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <MousePointer className="w-3 h-3 text-blue-400" /> Click Sequence:
            </span>
            {currentSlide.hotspots.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setActiveHotspotId(h.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
                  activeHotspotId === h.id
                    ? "bg-blue-600 text-white border-blue-500 shadow-md ring-1 ring-blue-400"
                    : "bg-neutral-900/90 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    activeHotspotId === h.id ? "bg-white text-blue-700" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {h.num}
                </span>
                <span>{h.label}</span>
              </button>
            ))}
          </div>

          {/* Active Highlight Detail Callout Card */}
          <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/70 flex flex-col gap-2 transition-all animate-in fade-in-50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {activeHotspot.num}
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">
                    {activeHotspot.targetName}
                  </h4>
                  <p className="text-xs text-blue-300 font-medium">{activeHotspot.actionText}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 pl-8 leading-relaxed">
              <span className="text-neutral-400 font-medium">Result: </span>
              {activeHotspot.effectText}
            </p>

            {activeHotspot.tip && (
              <div className="ml-8 mt-0.5 px-2.5 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-[11px] text-amber-300 flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong className="font-semibold text-amber-200">Pro Tip:</strong>{" "}
                  {activeHotspot.tip}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-3">
          {/* Slide dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSetSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === currentSlideIndex
                    ? "w-6 bg-white"
                    : "w-2 bg-neutral-700 hover:bg-neutral-500"
                }`}
              />
            ))}
            <span className="text-[11px] text-neutral-400 font-mono ml-2">
              {currentSlideIndex + 1} / {slides.length}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 px-2.5 text-xs text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer"
            >
              Skip
            </Button>

            {currentSlideIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="h-8 px-3 text-xs border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                Previous
              </Button>
            )}

            {currentSlide.ctaHref && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 px-2.5 text-xs text-neutral-400 hover:text-white hidden sm:inline-flex"
              >
                <a href={currentSlide.ctaHref}>
                  <span>{currentSlide.ctaText}</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleNext}
              className="h-8 px-3.5 text-xs bg-white text-black hover:bg-neutral-200 font-medium gap-1 cursor-pointer shadow-sm"
            >
              {currentSlideIndex === slides.length - 1 ? (
                <>
                  <span>Get Started</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Interactive Hotspot Badge overlaid directly on the mockups
function HotspotBadge({
  num,
  active,
  onClick,
  position,
  title,
}: {
  num: number;
  active: boolean;
  onClick: () => void;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      style={position}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none"
    >
      {/* Animated Ping Wave */}
      <span
        className={`absolute -inset-1 rounded-full opacity-75 transition-all ${
          active
            ? "bg-blue-400 animate-ping"
            : "bg-neutral-400 group-hover:bg-blue-400 group-hover:animate-ping opacity-30"
        }`}
      />

      {/* Number Badge */}
      <span
        className={`relative flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shadow-lg transition-transform duration-200 ${
          active
            ? "bg-blue-500 text-white scale-110 ring-2 ring-white"
            : "bg-neutral-900 text-neutral-200 border border-neutral-600 group-hover:scale-105 group-hover:border-blue-400"
        }`}
      >
        {num}
      </span>
    </button>
  );
}
