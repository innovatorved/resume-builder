"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  GraduationCap,
  HelpCircle,
  History,
  Layers,
  Link2,
  MousePointer,
  Pin,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface Hotspot {
  id: string;
  num: number;
  label: string;
  targetName: string;
  position: { top?: string; bottom?: string; left?: string; right?: string };
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
    // SLIDE 1: Career Knowledge Hub (Evidence Library)
    {
      id: "knowledge-hub",
      stepNumber: 1,
      badge: "Step 1 of 5 • Evidence Library",
      title: "Connect Your Career Evidence Library",
      subtitle: "Anchor your resumes in verified career facts to eliminate AI hallucinations",
      summary:
        "The Evidence Library crawls and parses your GitHub profile, LinkedIn, portfolios, and uploaded documents. Cloudflare Durable Objects synthesize everything into structured Markdown evidence files stored securely in R2.",
      ctaText: "Open Evidence Library",
      ctaHref: "/knowledge",
      hotspots: [
        {
          id: "h1",
          num: 1,
          label: "1. 'Add source' Form",
          targetName: "Source Form: 'Add source' / 'Upload resume'",
          position: { top: "18px", right: "20px" },
          pointerDirection: "bottom",
          actionText: "Select source type (GitHub, LinkedIn, Portfolio, Website, or Resume) and click 'Add source'",
          effectText: "Durable Objects crawl the source, extract career facts, and store verified evidence in Cloudflare R2",
          tip: "Choose 'Resume' to upload PDF, LaTeX (.tex), Markdown, or plain text.",
        },
        {
          id: "h2",
          num: 2,
          label: "2. Sources & Status",
          targetName: "Sources List: 'searchable', 'artifact_ready', 'indexing'",
          position: { top: "46%", left: "25%" },
          pointerDirection: "top",
          actionText: "Track live ingestion progress and inspect Durable Object background steps",
          effectText: "Synthesizes raw content into verified 'profile.md' and evidence files in R2",
          tip: "Click 'Run History' in the header to view durable execution steps and retry states.",
        },
        {
          id: "h3",
          num: 3,
          label: "3. 'Ask your knowledge'",
          targetName: "Assistant: 'Ask your knowledge' with Citations",
          position: { top: "65%", right: "15%" },
          pointerDirection: "top",
          actionText: "Ask natural questions like 'What evidence shows my backend experience?'",
          effectText: "Retrieves grounded answers directly cited from your saved sources with clickable citations like [1] profile.md",
          tip: "Click 'Build Resume' at the top to generate a complete resume from your entire knowledge base.",
        },
      ],
      renderMockup: (activeId, onSelect) => (
        <div className="relative w-full h-[250px] sm:h-[280px] md:h-[320px] lg:h-[350px] bg-neutral-950 rounded-xl border border-neutral-800/90 overflow-hidden select-none p-2.5 sm:p-3.5 flex flex-col font-sans">
          {/* Top Mockup App Bar */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400 ml-1 sm:ml-2 flex items-center gap-1">
                <span className="text-white font-semibold">Ved Gupta × Resume Builder</span> / Evidence Library
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Durable DO Synced
              </span>
              <div
                onClick={() => onSelect("h1")}
                className={`relative px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-medium rounded transition-all cursor-pointer flex items-center gap-1 ${
                  activeId === "h1"
                    ? "bg-white text-black ring-2 ring-blue-500 shadow-lg"
                    : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                }`}
              >
                <Plus className="w-3 h-3" />
                <span>Add source</span>
              </div>
            </div>
          </div>

          {/* Body Columns */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 flex-1 overflow-hidden min-h-0">
            {/* Left Sources List */}
            <div className="md:col-span-7 flex flex-col gap-1.5 overflow-hidden">
              <div className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Sources (2 connected)
              </div>

              {/* Source Card 1 */}
              <div
                onClick={() => onSelect("h2")}
                className={`p-1.5 sm:p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  activeId === "h2"
                    ? "border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50"
                    : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-white" />
                    <span className="text-[11px] sm:text-xs font-semibold text-white">github.com/innovatorved</span>
                  </div>
                  <span className="text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                    searchable
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 line-clamp-1">
                  14 repositories, 89 commits extracted into verified evidence
                </p>
              </div>

              {/* Source Card 2 */}
              <div
                onClick={() => onSelect("h2")}
                className="p-1.5 sm:p-2 rounded-lg border border-neutral-800/80 bg-neutral-900/40 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] sm:text-xs font-semibold text-neutral-300">linkedin_profile.pdf</span>
                  </div>
                  <span className="text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded bg-blue-950 border border-blue-800 text-blue-300">
                    artifact_ready
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 line-clamp-1">
                  Experience: Senior Architect @ Cloud Systems, Education: B.Tech
                </p>
              </div>
            </div>

            {/* Right Assistant Panel */}
            <div
              onClick={() => onSelect("h3")}
              className={`md:col-span-5 rounded-lg border p-1.5 sm:p-2 flex flex-col justify-between transition-all cursor-pointer ${
                activeId === "h3"
                  ? "border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50"
                  : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700"
              }`}
            >
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-semibold text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-blue-400" />
                  Ask your knowledge
                </span>
                <span className="text-[8px] text-neutral-400 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" /> Build Resume
                </span>
              </div>
              <div className="bg-neutral-950/80 rounded p-1.5 border border-neutral-800/60 my-1 text-[9px] sm:text-[10px] text-neutral-300">
                <span className="text-blue-400 font-medium">[1] profile.md:</span> Built distributed sync
                protocol handling 1.2M queries/day.
              </div>
              <div className="flex items-center gap-1 bg-neutral-800/80 rounded px-2 py-1 text-[8px] sm:text-[9px] text-neutral-400 border border-neutral-700/60">
                <Search className="w-2.5 h-2.5" />
                <span className="truncate">What evidence shows my backend experience?</span>
              </div>
            </div>
          </div>

          {/* Interactive Hotspot Pulsing Markers */}
          <HotspotBadge
            num={1}
            active={activeId === "h1"}
            onClick={() => onSelect("h1")}
            position={{ top: "18px", right: "20px" }}
            title="Click to see 'Add source' form"
          />
          <HotspotBadge
            num={2}
            active={activeId === "h2"}
            onClick={() => onSelect("h2")}
            position={{ top: "46%", left: "25%" }}
            title="Click to see Sources & Status"
          />
          <HotspotBadge
            num={3}
            active={activeId === "h3"}
            onClick={() => onSelect("h3")}
            position={{ top: "65%", right: "15%" }}
            title="Click to see 'Ask your knowledge' Assistant"
          />
        </div>
      ),
    },

    // SLIDE 2: Dashboard & Resume Management
    {
      id: "dashboard-management",
      stepNumber: 2,
      badge: "Step 2 of 5 • My Resumes Dashboard",
      title: "Create, Upload & Manage Resumes",
      subtitle: "Manage LaTeX documents, duplicate drafts, pin favorites, and download PDFs",
      summary:
        "Create new resumes from modern LaTeX templates, import existing PDF or .tex documents with 'Upload', or duplicate versions tailored to specific roles.",
      ctaText: "Go to My Resumes",
      ctaHref: "/",
      hotspots: [
        {
          id: "h1",
          num: 1,
          label: "1. '+ New' Button",
          targetName: "Top Action Bar: '+ New' (Create New Resume)",
          position: { top: "18px", right: "20px" },
          pointerDirection: "bottom",
          actionText: "Click '+ New' in the header navigation to initialize a new LaTeX resume",
          effectText: "Generates a clean template, creates Version 1 snapshot, and opens the split studio",
          tip: "Pre-fills your profile name and contact information automatically from your account.",
        },
        {
          id: "h2",
          num: 2,
          label: "2. 'Upload' Button",
          targetName: "Top Action Bar: 'Upload' (Upload Existing Resume)",
          position: { top: "18px", right: "95px" },
          pointerDirection: "bottom",
          actionText: "Click 'Upload' to import an existing PDF, LaTeX (.tex), or Markdown resume",
          effectText: "Parses your experience and optionally syncs it directly into the Evidence Library",
          tip: "Check 'Sync into AI Knowledge Base' during upload to ground future AI tailoring.",
        },
        {
          id: "h3",
          num: 3,
          label: "3. Resume Row Actions",
          targetName: "Document Actions: 'Duplicate', 'PDF', 'Pin', & Click to open studio",
          position: { top: "62%", left: "50%" },
          pointerDirection: "top",
          actionText: "Click any document title to open LaTeX Studio, or click 'Duplicate', 'PDF', or 'Pin'",
          effectText: "Opens the dual-pane editor or downloads the latest compiled PDF in 1 click",
          tip: "Pin your master resume to keep it at the top of your list.",
        },
      ],
      renderMockup: (activeId, onSelect) => (
        <div className="relative w-full h-[250px] sm:h-[280px] md:h-[320px] lg:h-[350px] bg-neutral-950 rounded-xl border border-neutral-800/90 overflow-hidden select-none p-2.5 sm:p-3.5 flex flex-col font-sans">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-[10px] sm:text-[11px] font-mono text-neutral-300 ml-1 sm:ml-2">
                Ved Gupta × Resume Builder
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                onClick={() => onSelect("h2")}
                className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-medium rounded border transition-all cursor-pointer flex items-center gap-1 ${
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
                className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-medium rounded transition-all cursor-pointer flex items-center gap-1 ${
                  activeId === "h1"
                    ? "bg-white text-black ring-2 ring-blue-500 shadow-lg"
                    : "bg-neutral-100 text-black hover:bg-neutral-200"
                }`}
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
                <span className="hidden sm:inline">Resume</span>
              </div>
            </div>
          </div>

          {/* Search bar & Section header mockup */}
          <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-white">My Resumes</span>
              <span className="text-[9px] text-neutral-400 bg-neutral-900 border border-neutral-800 px-1.5 py-0.2 rounded-full">2</span>
            </div>
            <div className="w-48 sm:w-64 bg-neutral-900/80 border border-neutral-800 rounded px-2 py-0.5 text-[8px] sm:text-[9px] text-neutral-400 flex items-center gap-1">
              <Search className="w-2.5 h-2.5" />
              <span className="truncate">Search resumes, titles, or skills...</span>
            </div>
          </div>

          {/* Single-Row List Layout matching actual app */}
          <div className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/50 divide-y divide-neutral-800 overflow-hidden min-h-0 flex flex-col justify-center">
            {/* Row 1 (Pinned) */}
            <div
              onClick={() => onSelect("h3")}
              className={`p-2 sm:p-2.5 flex items-center justify-between transition-all cursor-pointer ${
                activeId === "h3"
                  ? "bg-blue-950/30 border-blue-500 ring-1 ring-blue-500/50"
                  : "hover:bg-neutral-900/80"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] sm:text-xs font-semibold text-white hover:underline truncate">
                      Full-Stack Lead CV
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-950/40 border border-amber-800 text-amber-400 text-[8px] sm:text-[9px] font-medium">
                      <Pin className="w-2 h-2 fill-amber-400 text-amber-400 rotate-45" /> Pinned
                    </span>
                    <span className="px-1 py-0.2 rounded bg-neutral-800 text-neutral-300 text-[8px] font-mono">LaTeX</span>
                    <span className="px-1 py-0.2 rounded bg-neutral-800 text-neutral-300 text-[8px]">4 exp</span>
                    <span className="px-1 py-0.2 rounded bg-neutral-800 text-neutral-300 text-[8px]">8 skills</span>
                  </div>
                  <div className="text-[8px] sm:text-[9px] text-neutral-400 truncate mt-0.5">
                    Senior Software Architect · Alex Chen • Updated 2 hours ago
                  </div>
                </div>
              </div>

              {/* Actions Right */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[8px] sm:text-[9px] flex items-center gap-1 hover:text-white">
                  <Copy className="w-2.5 h-2.5" /> Duplicate
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[8px] sm:text-[9px] flex items-center gap-1 hover:text-white">
                  <Download className="w-2.5 h-2.5" /> PDF
                </span>
                <span className="p-1 rounded text-amber-400 bg-amber-950/30">
                  <Pin className="w-3 h-3 fill-amber-400 rotate-45" />
                </span>
              </div>
            </div>

            {/* Row 2 */}
            <div
              onClick={() => onSelect("h3")}
              className="p-2 sm:p-2.5 flex items-center justify-between hover:bg-neutral-900/80 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] sm:text-xs font-semibold text-neutral-300 hover:underline truncate">
                      Cloudflare AI Architect
                    </span>
                    <span className="px-1 py-0.2 rounded bg-neutral-800 text-neutral-300 text-[8px] font-mono">LaTeX</span>
                    <span className="px-1 py-0.2 rounded bg-neutral-800 text-neutral-300 text-[8px]">3 exp</span>
                  </div>
                  <div className="text-[8px] sm:text-[9px] text-neutral-400 truncate mt-0.5">
                    AI Systems Engineer · Alex Chen • Updated yesterday
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[8px] sm:text-[9px] flex items-center gap-1">
                  <Copy className="w-2.5 h-2.5" /> Duplicate
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[8px] sm:text-[9px] flex items-center gap-1">
                  <Download className="w-2.5 h-2.5" /> PDF
                </span>
              </div>
            </div>
          </div>

          {/* Hotspot Markers */}
          <HotspotBadge
            num={1}
            active={activeId === "h1"}
            onClick={() => onSelect("h1")}
            position={{ top: "18px", right: "20px" }}
            title="Click to see '+ New' Resume button"
          />
          <HotspotBadge
            num={2}
            active={activeId === "h2"}
            onClick={() => onSelect("h2")}
            position={{ top: "18px", right: "95px" }}
            title="Click to see 'Upload' button"
          />
          <HotspotBadge
            num={3}
            active={activeId === "h3"}
            onClick={() => onSelect("h3")}
            position={{ top: "62%", left: "50%" }}
            title="Click to see Resume row actions ('Duplicate', 'PDF', 'Pin')"
          />
        </div>
      ),
    },

    // SLIDE 3: Dual-Pane LaTeX Studio
    {
      id: "split-studio",
      stepNumber: 3,
      badge: "Step 3 of 5 • LaTeX Studio",
      title: "Dual-Pane LaTeX Editor & Vector PDF Preview",
      subtitle: "Monaco code editor on the left, live vector PDF compilation on the right",
      summary:
        "Desktop-grade typesetting right inside your browser powered by WebAssembly. Edit LaTeX source code with Monaco auto-completion while the right pane renders live vector PDFs.",
      ctaText: "Open Resume Studio",
      ctaHref: "/resume/new",
      hotspots: [
        {
          id: "h1",
          num: 1,
          label: "1. Monaco LaTeX Editor",
          targetName: "Left Pane: Monaco LaTeX Editor ('main.tex')",
          position: { top: "45%", left: "20%" },
          pointerDirection: "right",
          actionText: "Edit LaTeX source code directly with full syntax highlighting and bracket matching",
          effectText: "Real-time auto-save keeps drafts saved, showing 'saved' / 'saving...' status",
          tip: "Press Cmd+S (or Ctrl+S) anytime to trigger an instant PDF compilation.",
        },
        {
          id: "h2",
          num: 2,
          label: "2. Vector PDF Preview",
          targetName: "Right Pane: Live Vector PDF Preview",
          position: { top: "45%", right: "20%" },
          pointerDirection: "left",
          actionText: "View vector PDF output with zoom, fit-to-page, and page navigation",
          effectText: "Compiles on-demand using WebAssembly TeX engine with 0 server latency",
          tip: "What you see in this preview is 100% byte-for-byte identical to the downloaded PDF.",
        },
        {
          id: "h3",
          num: 3,
          label: "3. Header Action Bar",
          targetName: "Top Action Bar: Title, 'Save', 'History', & 'Export'",
          position: { top: "18px", right: "60px" },
          pointerDirection: "bottom",
          actionText: "Edit resume title, click 'Save' to record a snapshot, or click 'Export' for PDF / .tex",
          effectText: "Creates an immutable version in history or downloads files locally",
          tip: "Click 'Export' to choose between 'Download PDF' and 'Download .tex Source'.",
        },
      ],
      renderMockup: (activeId, onSelect) => (
        <div className="relative w-full h-[250px] sm:h-[280px] md:h-[320px] lg:h-[350px] bg-neutral-950 rounded-xl border border-neutral-800/90 overflow-hidden select-none p-2 sm:p-3 flex flex-col font-sans">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 sm:pb-2 mb-1.5 px-1 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">resume /</span>
              <span className="text-[11px] sm:text-xs font-semibold text-white">Full-Stack Lead CV</span>
              <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono">
                saved
              </span>
            </div>
            <div
              onClick={() => onSelect("h3")}
              className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded transition-all cursor-pointer ${
                activeId === "h3" ? "ring-2 ring-blue-500 bg-blue-950/40" : ""
              }`}
            >
              <span className="hidden xs:flex text-[9px] sm:text-[10px] text-neutral-400 items-center gap-1 hover:text-white">
                <History className="w-3 h-3" /> History
              </span>
              <div className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-medium bg-white text-black rounded flex items-center gap-1">
                <Save className="w-2.5 h-2.5" /> Save
              </div>
              <div className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-medium bg-neutral-800 text-neutral-200 rounded flex items-center gap-1">
                <Download className="w-2.5 h-2.5" /> Export <ChevronDown className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>

          {/* Split Pane Mockup */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 overflow-hidden min-h-0">
            {/* Left Monaco Pane */}
            <div
              onClick={() => onSelect("h1")}
              className={`rounded-lg border p-2 bg-neutral-900/90 font-mono text-[9px] sm:text-[10px] overflow-hidden flex flex-col transition-all cursor-pointer ${
                activeId === "h1"
                  ? "border-blue-500 ring-1 ring-blue-500/50"
                  : "border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <div className="flex items-center justify-between text-neutral-500 pb-1 border-b border-neutral-800 text-[8px] sm:text-[9px]">
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
              className={`rounded-lg border bg-neutral-900/60 p-2 items-center justify-center transition-all cursor-pointer hidden sm:flex ${
                activeId === "h2"
                  ? "border-blue-500 ring-1 ring-blue-500/50"
                  : "border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <div className="w-[85%] h-[92%] bg-white rounded shadow-md p-2 text-neutral-900 font-serif flex flex-col justify-between">
                <div>
                  <div className="text-center pb-1 border-b border-neutral-300">
                    <div className="text-[10px] sm:text-[11px] font-bold tracking-tight text-neutral-950">
                      ALEX CHEN
                    </div>
                    <div className="text-[6px] sm:text-[7px] text-neutral-600">
                      alex@example.com • +1 555 0192 • San Francisco, CA
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-400">
                      Experience
                    </div>
                    <div className="flex justify-between text-[6px] sm:text-[7px] font-semibold mt-0.5">
                      <span>Senior Software Architect</span>
                      <span className="text-neutral-500">2022 – Present</span>
                    </div>
                    <div className="text-[5.5px] sm:text-[6.5px] text-neutral-700 list-disc pl-2">
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
            position={{ top: "45%", left: "20%" }}
            title="Click to see Monaco LaTeX Editor"
          />
          <HotspotBadge
            num={2}
            active={activeId === "h2"}
            onClick={() => onSelect("h2")}
            position={{ top: "45%", right: "20%" }}
            title="Click to see Vector PDF Preview"
          />
          <HotspotBadge
            num={3}
            active={activeId === "h3"}
            onClick={() => onSelect("h3")}
            position={{ top: "18px", right: "60px" }}
            title="Click to see 'Save', 'History', & 'Export'"
          />
        </div>
      ),
    },

    // SLIDE 4: AI Copilot & Job Tailoring (Prism AI Bar)
    {
      id: "ai-copilot",
      stepNumber: 4,
      badge: "Step 4 of 5 • AI Copilot (Prism AI Bar)",
      title: "Tailor Resume with AI & Career Evidence",
      subtitle: "Match job descriptions against your verified knowledge without hallucinations",
      summary:
        "Open the bottom AI Copilot bar (⌘K), click 'Tailor to target job post', paste the job description, and click 'Create preview'. Review matched requirements and click 'Apply and save version'.",
      ctaText: "Try AI Copilot",
      ctaHref: "/resume/new",
      hotspots: [
        {
          id: "h1",
          num: 1,
          label: "1. 'AI Copilot' Bar",
          targetName: "Bottom Dock: 'AI Copilot' (Cmd+K / ⌘K)",
          position: { bottom: "78px", left: "25px" },
          pointerDirection: "top",
          actionText: "Press Cmd+K or click the bottom dock to expand the AI Copilot bar",
          effectText: "Reveals AI chat input and quick action chips like 'Tailor to target job post'",
          tip: "Press Cmd+K anytime from the editor to immediately toggle and focus the AI Copilot bar.",
        },
        {
          id: "h2",
          num: 2,
          label: "2. 'Paste the job description'",
          targetName: "Job Tailoring: 'Paste the job description' -> 'Create preview'",
          position: { bottom: "25px", left: "25%" },
          pointerDirection: "bottom",
          actionText: "Click 'Tailor to target job post', paste job description, and click 'Create preview'",
          effectText: "Gemini analyzes job requirements against your Evidence Library without hallucinations",
          tip: "The AI displays 'Matched requirements' and 'Missing requirements' with evidence citations.",
        },
        {
          id: "h3",
          num: 3,
          label: "3. 'Apply and save version'",
          targetName: "Tailor Actions: 'Apply and save version' / 'Discard'",
          position: { bottom: "25px", right: "15%" },
          pointerDirection: "bottom",
          actionText: "Review alignment analysis and click 'Apply and save version'",
          effectText: "Updates your LaTeX source code, recompiles the vector PDF, and saves a version snapshot",
          tip: "Use 'Undo AI Edit' or 'Version History' if you ever want to revert back.",
        },
      ],
      renderMockup: (activeId, onSelect) => (
        <div className="relative w-full h-[250px] sm:h-[280px] md:h-[320px] lg:h-[350px] bg-neutral-950 rounded-xl border border-neutral-800/90 overflow-hidden select-none p-2 sm:p-3 flex flex-col justify-between font-sans">
          {/* Top subtle editor background */}
          <div className="opacity-40 flex-1 grid grid-cols-2 gap-2 p-1 blur-[0.5px] overflow-hidden min-h-0">
            <div className="bg-neutral-900 rounded p-2 text-[9px] font-mono text-neutral-400 overflow-hidden">
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
            className={`rounded-xl border p-2 sm:p-2.5 bg-neutral-900/95 backdrop-blur-md shadow-2xl transition-all cursor-pointer shrink-0 ${
              activeId === "h1"
                ? "border-blue-500 ring-2 ring-blue-500/50"
                : "border-neutral-700/80 hover:border-neutral-600"
            }`}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] sm:text-xs font-semibold text-white">AI Copilot</span>
                <span className="text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono">
                  ⌘K
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] sm:text-[10px] text-neutral-400 hidden sm:inline">Ask AI to refine, tailor, or balance LaTeX...</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </div>
            </div>

            {/* Quick action suggestion chips */}
            <div className="flex items-center gap-1.5 py-1 text-[8px] sm:text-[9px] overflow-x-auto no-scrollbar">
              <span className="text-neutral-500 font-medium">Quick actions:</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-900/40 border border-blue-700 text-blue-300 font-medium">
                Tailor to target job post
              </span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 hidden sm:inline">
                Quantify achievements
              </span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 hidden sm:inline">
                Improve action verbs
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mt-1">
              {/* JD Input */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect("h2");
                }}
                className={`sm:col-span-7 rounded-lg border p-1.5 bg-neutral-950 text-left transition-all ${
                  activeId === "h2"
                    ? "border-blue-500 ring-1 ring-blue-500"
                    : "border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="text-[8px] sm:text-[9px] text-neutral-400 font-mono mb-0.5">Paste the job description:</div>
                <div className="text-[9px] sm:text-[10px] text-neutral-200 line-clamp-1">
                  "Include responsibilities and required qualifications..."
                </div>
                <div className="mt-1">
                  <span className="px-2 py-0.5 rounded bg-white text-black text-[8px] font-medium">Create preview</span>
                </div>
              </div>

              {/* Recommendation & Apply */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect("h3");
                }}
                className={`sm:col-span-5 rounded-lg border p-1.5 flex flex-col justify-between transition-all ${
                  activeId === "h3"
                    ? "border-blue-500 ring-1 ring-blue-500 bg-blue-950/20"
                    : "border-neutral-800 bg-neutral-950/60"
                }`}
              >
                <div>
                  <div className="text-[8px] sm:text-[9px] text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Matched requirements: 3 found
                  </div>
                  <div className="text-[7.5px] sm:text-[8.5px] text-neutral-400 mt-0.5">
                    • Distributed systems · profile.md [1]
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="px-2 py-0.5 text-[8px] sm:text-[9px] font-medium bg-white text-black rounded hover:bg-neutral-200">
                    Apply and save version
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
            position={{ bottom: "78px", left: "25px" }}
            title="Click to see AI Copilot dock"
          />
          <HotspotBadge
            num={2}
            active={activeId === "h2"}
            onClick={() => onSelect("h2")}
            position={{ bottom: "25px", left: "25%" }}
            title="Click to see 'Paste the job description'"
          />
          <HotspotBadge
            num={3}
            active={activeId === "h3"}
            onClick={() => onSelect("h3")}
            position={{ bottom: "25px", right: "15%" }}
            title="Click to see 'Apply and save version'"
          />
        </div>
      ),
    },

    // SLIDE 5: Version History & PDF Export
    {
      id: "versions-and-export",
      stepNumber: 5,
      badge: "Step 5 of 5 • Version History & Export",
      title: "Point-in-Time Snapshots & ATS PDF Export",
      subtitle: "One-click rollbacks with Version History and high-resolution PDF downloads",
      summary:
        "Every compile and save automatically records a version snapshot in the database. Open 'Version History' to restore earlier states, or use 'Export' to download PDF and .tex files.",
      ctaText: "Get Started Now",
      ctaHref: "/",
      hotspots: [
        {
          id: "h1",
          num: 1,
          label: "1. 'Export' Dropdown",
          targetName: "Top Action Bar: 'Export' -> 'Download PDF' / 'Download .tex Source'",
          position: { top: "18px", right: "25px" },
          pointerDirection: "bottom",
          actionText: "Click 'Export' in the top action bar and select 'Download PDF'",
          effectText: "Downloads publication-quality, ATS-optimized vector PDF to your computer",
          tip: "Clean vector text ensures Applicant Tracking Systems (ATS) parse every keyword.",
        },
        {
          id: "h2",
          num: 2,
          label: "2. 'History' Button",
          targetName: "Top Action Bar: 'History' -> 'Version History' Modal",
          position: { top: "18px", right: "95px" },
          pointerDirection: "bottom",
          actionText: "Click 'History' in the top bar to open the Version History timeline modal",
          effectText: "Lists all snapshots with version numbers, timestamps, change summaries, and 'Current' badge",
          tip: "Snapshots record both LaTeX source code and structured resume data in Turso & Cloudflare R2.",
        },
        {
          id: "h3",
          num: 3,
          label: "3. 'Restore' Button",
          targetName: "Version Item Action: 'Restore' (Rollback snapshot)",
          position: { bottom: "25px", right: "25px" },
          pointerDirection: "left",
          actionText: "Click 'Restore' next to any previous version in the modal",
          effectText: "Instantly rolls back the Monaco editor code and re-compiles the exact PDF",
          tip: "Restoring creates a brand new version snapshot, so you never lose any historical work.",
        },
      ],
      renderMockup: (activeId, onSelect) => (
        <div className="relative w-full h-[250px] sm:h-[280px] md:h-[320px] lg:h-[350px] bg-neutral-950 rounded-xl border border-neutral-800/90 overflow-hidden select-none p-2.5 sm:p-3.5 flex flex-col font-sans">
          {/* Top Bar Mockup */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">resume /</span>
              <span className="text-[11px] sm:text-xs font-semibold text-white">Full-Stack Lead CV</span>
              <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono">
                saved
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                onClick={() => onSelect("h2")}
                className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-medium rounded border transition-all cursor-pointer flex items-center gap-1 ${
                  activeId === "h2"
                    ? "bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500 shadow-md"
                    : "bg-neutral-900 border-neutral-800 text-neutral-200 hover:bg-neutral-800"
                }`}
              >
                <History className="w-3 h-3 text-amber-400" />
                <span>History</span>
              </div>
              <div
                onClick={() => onSelect("h1")}
                className={`relative px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-medium rounded transition-all cursor-pointer flex items-center gap-1 ${
                  activeId === "h1"
                    ? "bg-white text-black ring-2 ring-blue-500 shadow-lg"
                    : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                }`}
              >
                <Download className="w-3 h-3" />
                <span>Export</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>

          {/* Version History Modal Mockup */}
          <div className="flex-1 bg-neutral-900/70 rounded-lg border border-neutral-800 p-2 sm:p-2.5 flex flex-col gap-1.5 sm:gap-2 overflow-hidden min-h-0">
            <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-neutral-400 border-b border-neutral-800 pb-1 shrink-0">
              <span className="font-semibold text-neutral-200 flex items-center gap-1">
                <History className="w-3 h-3 text-blue-400" /> Version History
              </span>
              <span>3 snapshots recorded</span>
            </div>

            {/* Version item 3 (Current) */}
            <div className="p-1.5 sm:p-2 rounded bg-neutral-950/80 border border-blue-500/60 flex items-center justify-between text-left shrink-0">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] sm:text-xs font-bold text-white">Version 3</span>
                  <span className="text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded bg-white text-black font-semibold flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> Current
                  </span>
                  <span className="text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> Tailored
                  </span>
                </div>
                <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5">
                  Applied tailored resume for Cloudflare role • 2 mins ago
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] rounded bg-neutral-900 border border-neutral-800 text-neutral-300">PDF</span>
                <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] rounded bg-neutral-900 border border-neutral-800 text-neutral-300">.tex</span>
              </div>
            </div>

            {/* Version item 2 (Custom LaTeX with Restore) */}
            <div
              onClick={() => onSelect("h3")}
              className={`p-1.5 sm:p-2 rounded border flex items-center justify-between text-left transition-all cursor-pointer shrink-0 ${
                activeId === "h3"
                  ? "bg-blue-950/30 border-blue-500 ring-1 ring-blue-500"
                  : "bg-neutral-950/40 border-neutral-800/80 hover:border-neutral-700"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] sm:text-xs font-semibold text-neutral-300">Version 2</span>
                  <span className="text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 flex items-center gap-0.5">
                    <FileCode className="w-2.5 h-2.5" /> Custom LaTeX
                  </span>
                </div>
                <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5">
                  Updated Experience section bullet points • 1 hour ago
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hidden xs:inline">PDF</span>
                <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hidden xs:inline">.tex</span>
                <span className="px-2 py-0.5 text-[8px] sm:text-[9px] font-medium bg-white text-black hover:bg-neutral-200 rounded flex items-center gap-1 shadow-xs">
                  <RotateCcw className="w-2.5 h-2.5 text-black" /> Restore
                </span>
              </div>
            </div>
          </div>

          {/* Hotspots */}
          <HotspotBadge
            num={1}
            active={activeId === "h1"}
            onClick={() => onSelect("h1")}
            position={{ top: "18px", right: "25px" }}
            title="Click to see 'Export -> Download PDF'"
          />
          <HotspotBadge
            num={2}
            active={activeId === "h2"}
            onClick={() => onSelect("h2")}
            position={{ top: "18px", right: "95px" }}
            title="Click to see 'History' timeline"
          />
          <HotspotBadge
            num={3}
            active={activeId === "h3"}
            onClick={() => onSelect("h3")}
            position={{ bottom: "25px", right: "25px" }}
            title="Click to see 'Restore' action"
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
        className="w-[96vw] max-w-[96vw] sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl p-0 max-h-[92vh] flex flex-col gap-0 overflow-hidden bg-neutral-950 border border-neutral-800 text-white shadow-2xl rounded-2xl sm:rounded-3xl duration-200"
      >
        {/* Top Sequence & Progress Bar */}
        <div className="relative w-full bg-neutral-900 h-1.5 shrink-0">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="px-4 sm:px-6 pt-3.5 sm:pt-4 pb-2.5 sm:pb-3 flex items-center justify-between border-b border-neutral-800/80 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <span className="p-1 sm:p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Compass className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-neutral-400 block truncate">
                {currentSlide.badge}
              </span>
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight leading-tight truncate">
                {currentSlide.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="hidden md:inline-block text-[11px] text-neutral-400 font-mono">
              Use <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">←</kbd> <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">→</kbd> to navigate
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 sm:p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer z-50 touch-manipulation"
              aria-label="Close guide"
              title="Close guide"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-5 md:p-6 flex-1 overflow-y-auto min-h-0 flex flex-col gap-3 sm:gap-3.5">
          {/* Visual Interactive UI Mockup with Clickable Highlight Pins */}
          <div className="w-full">
            {currentSlide.renderMockup(activeHotspotId, (id) => setActiveHotspotId(id))}
          </div>

          {/* Highlight Sequence Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar flex-nowrap sm:flex-wrap shrink-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
              <MousePointer className="w-3 h-3 text-blue-400" /> Sequence:
            </span>
            {currentSlide.hotspots.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setActiveHotspotId(h.id)}
                className={`px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 touch-manipulation ${
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
                <span className="whitespace-nowrap">{h.label}</span>
              </button>
            ))}
          </div>

          {/* Active Highlight Detail Callout Card */}
          <div className="p-3 sm:p-4 rounded-xl border border-neutral-800 bg-neutral-900/70 flex flex-col gap-1.5 sm:gap-2 transition-all shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center shrink-0">
                  {activeHotspot.num}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                    {activeHotspot.targetName}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-blue-300 font-medium">{activeHotspot.actionText}</p>
                </div>
              </div>
            </div>

            <p className="text-[11px] sm:text-xs text-neutral-300 pl-7 sm:pl-8 leading-relaxed">
              <span className="text-neutral-400 font-medium">Result: </span>
              {activeHotspot.effectText}
            </p>

            {activeHotspot.tip && (
              <div className="ml-7 sm:ml-8 mt-0.5 px-2.5 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-[10px] sm:text-[11px] text-amber-300 flex items-start gap-1.5">
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
        <div className="px-4 sm:px-6 py-2.5 sm:py-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
          {/* Slide dots */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSetSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 sm:h-2 rounded-full transition-all cursor-pointer ${
                  i === currentSlideIndex
                    ? "w-5 sm:w-6 bg-white"
                    : "w-1.5 sm:w-2 bg-neutral-700 hover:bg-neutral-500"
                }`}
              />
            ))}
            <span className="text-[10px] sm:text-[11px] text-neutral-400 font-mono ml-1.5 sm:ml-2">
              {currentSlideIndex + 1}/{slides.length}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 px-2 sm:px-2.5 text-xs text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer"
            >
              Skip
            </Button>

            {currentSlideIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="h-8 px-2.5 sm:px-3 text-xs border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                <span className="hidden xs:inline">Prev</span>
              </Button>
            )}

            {currentSlide.ctaHref && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-8 px-2 sm:px-2.5 text-xs text-neutral-400 hover:text-white hidden md:inline-flex"
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
              className="h-8 px-3 sm:px-3.5 text-xs bg-white text-black hover:bg-neutral-200 font-medium gap-1 cursor-pointer shadow-sm"
            >
              {currentSlideIndex === slides.length - 1 ? (
                <>
                  <span>Get Started</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Next</span>
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
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none touch-manipulation"
    >
      {/* Animated Ping Wave */}
      <span
        className={`absolute -inset-1 sm:-inset-1.5 rounded-full opacity-75 transition-all ${
          active
            ? "bg-blue-400 animate-ping"
            : "bg-neutral-400 group-hover:bg-blue-400 group-hover:animate-ping opacity-30"
        }`}
      />

      {/* Number Badge */}
      <span
        className={`relative flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-bold shadow-lg transition-transform duration-200 ${
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
