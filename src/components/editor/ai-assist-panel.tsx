import { Check, Copy, Loader2, Percent, Sparkles, Wand2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ResumeData } from "@/types/resume";

interface AiAssistPanelProps {
  resumeId: string;
  currentResumeData: ResumeData;
  onApplyTailoredResume: (tailoredData: ResumeData, summary: string) => void;
  onApplyBulletEdit: (newBullet: string) => void;
  onClose: () => void;
}

export function AiAssistPanel({
  resumeId,
  currentResumeData: _currentResumeData,
  onApplyTailoredResume,
  onApplyBulletEdit,
  onClose,
}: AiAssistPanelProps) {
  const [activeTab, setActiveTab] = useState<"tailor" | "bullet" | "chat">("tailor");

  // Tailoring State
  const [jobDescription, setJobDescription] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorResult, setTailorResult] = useState<any>(null);
  const [tailorError, setTailorError] = useState<string | null>(null);

  // Bullet Rewriter State
  const [bulletText, setBulletText] = useState("");
  const [bulletMode, setBulletMode] = useState<"xyz" | "impact" | "concise">("xyz");
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<any>(null);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  // Quick Prompt State
  const [_chatPrompt, _setChatPrompt] = useState("");
  const [_isChatting, _setIsChatting] = useState(false);
  const [_chatResponse, _setChatResponse] = useState<string | null>(null);

  // Handler for Tailoring
  const handleTailor = async () => {
    if (!jobDescription.trim()) return;
    setIsTailoring(true);
    setTailorError(null);

    try {
      const res = await fetch("/api/ai/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          jobDescription,
          company,
          role,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTailorResult(data.data);
      } else {
        setTailorError(data.error || "Failed to tailor resume");
      }
    } catch (err: any) {
      setTailorError(err?.message || "Failed to tailor resume");
    } finally {
      setIsTailoring(false);
    }
  };

  // Handler for Bullet Rewrite
  const handleRewrite = async () => {
    if (!bulletText.trim()) return;
    setIsRewriting(true);
    setRewriteError(null);

    try {
      const res = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          text: bulletText,
          mode: bulletMode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRewriteResult(data.data);
      } else {
        setRewriteError(data.error || "Rewrite failed");
      }
    } catch (err: any) {
      setRewriteError(err?.message || "Rewrite failed");
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="w-80 sm:w-96 flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-sm text-slate-100">AI Resume Copilot</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/30 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("tailor")}
          className={`flex-1 py-2.5 px-2 text-center font-medium border-b-2 transition-colors ${
            activeTab === "tailor"
              ? "border-blue-500 text-blue-400 bg-blue-500/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Tailor to JD
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bullet")}
          className={`flex-1 py-2.5 px-2 text-center font-medium border-b-2 transition-colors ${
            activeTab === "bullet"
              ? "border-blue-500 text-blue-400 bg-blue-500/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Rewrite Bullet
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: TAILOR TO JOB DESCRIPTION */}
        {activeTab === "tailor" && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paste a job description. Gemini will analyze keyword overlap and tailor your resume
                bullets for maximum ATS alignment.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="target-company" className="text-[11px] text-slate-400">
                  Target Company
                </label>
                <Input
                  id="target-company"
                  placeholder="e.g. Cloudflare"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-8 text-xs bg-slate-800/80 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <label htmlFor="target-role" className="text-[11px] text-slate-400">
                  Target Role
                </label>
                <Input
                  id="target-role"
                  placeholder="e.g. Senior Backend Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-8 text-xs bg-slate-800/80 border-slate-700 text-white mt-1"
                />
              </div>
            </div>

            <div>
              <label htmlFor="target-jd" className="text-[11px] text-slate-400">
                Job Description Text
              </label>
              <Textarea
                id="target-jd"
                rows={5}
                placeholder="Paste the full job post requirements, responsibilities, and qualifications..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="text-xs bg-slate-800/80 border-slate-700 text-white mt-1 resize-none"
              />
            </div>

            <Button
              className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
              disabled={isTailoring || !jobDescription.trim()}
              onClick={handleTailor}
            >
              {isTailoring ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing & Tailoring...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Tailor Resume to Post
                </>
              )}
            </Button>

            {tailorError && (
              <div className="p-2.5 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs">
                {tailorError}
              </div>
            )}

            {/* Tailor Results */}
            {tailorResult && (
              <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                  <span className="text-xs font-semibold text-slate-200">Alignment Score</span>
                  <span className="inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                    <Percent className="w-3 h-3 mr-0.5" />
                    {tailorResult.alignmentAnalysis?.matchScorePercent || 85}% Match
                  </span>
                </div>

                {tailorResult.alignmentAnalysis?.summaryOfChanges && (
                  <p className="text-[11px] text-slate-300 italic">
                    "{tailorResult.alignmentAnalysis.summaryOfChanges}"
                  </p>
                )}

                {/* Matching Skills */}
                {tailorResult.alignmentAnalysis?.matchingKeywords?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Matching Keywords Highlighted:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tailorResult.alignmentAnalysis.matchingKeywords.map((kw: string) => (
                        <span
                          key={kw}
                          className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1 mt-2"
                  onClick={() => {
                    const changeSummary = `Tailored for ${company || "Job Post"} (${role || "Target Role"})`;
                    onApplyTailoredResume(tailorResult.tailoredResume, changeSummary);
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                  Apply & Save as New Version
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BULLET POINT REWRITER */}
        {activeTab === "bullet" && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paste any weak bullet point. Gemini will rewrite it using Google's XYZ formula or
                executive-level impact verbs.
              </p>
            </div>

            <div>
              <label htmlFor="bullet-input" className="text-[11px] text-slate-400">
                Current Bullet Point
              </label>
              <Textarea
                id="bullet-input"
                rows={3}
                placeholder="e.g. Worked on the payment service and made it faster..."
                value={bulletText}
                onChange={(e) => setBulletText(e.target.value)}
                className="text-xs bg-slate-800/80 border-slate-700 text-white mt-1 resize-none"
              />
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Tone & Framework</span>
              <div className="grid grid-cols-3 gap-1">
                {(["xyz", "impact", "concise"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBulletMode(m)}
                    className={`py-1 text-[11px] rounded border transition-colors ${
                      bulletMode === m
                        ? "bg-blue-600 text-white border-blue-500"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    {m === "xyz" ? "Google XYZ" : m === "impact" ? "Impact" : "Concise"}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
              disabled={isRewriting || !bulletText.trim()}
              onClick={handleRewrite}
            >
              {isRewriting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Rewriting...
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  Enhance Bullet
                </>
              )}
            </Button>

            {rewriteError && (
              <div className="p-2.5 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs">
                {rewriteError}
              </div>
            )}

            {rewriteResult && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="p-3 bg-slate-800/80 border border-blue-500/40 rounded-lg">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                    Recommended (High Impact)
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {rewriteResult.improved}
                  </p>
                  {rewriteResult.explanation && (
                    <p className="text-[11px] text-slate-400 mt-1 italic">
                      {rewriteResult.explanation}
                    </p>
                  )}
                  <div className="mt-2 flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] px-2 text-slate-300"
                      onClick={() => navigator.clipboard.writeText(rewriteResult.improved)}
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                    <Button
                      size="sm"
                      className="h-6 text-[11px] px-2 bg-blue-600 hover:bg-blue-500 text-white"
                      onClick={() => onApplyBulletEdit(rewriteResult.improved)}
                    >
                      <Check className="w-3 h-3 mr-1" /> Apply
                    </Button>
                  </div>
                </div>

                {rewriteResult.alternatives?.map((alt: string) => (
                  <div
                    key={alt}
                    className="p-2.5 bg-slate-800/40 border border-slate-700/60 rounded-lg text-xs text-slate-300"
                  >
                    <p>{alt}</p>
                    <div className="mt-1.5 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-[10px] px-1.5 text-blue-400 hover:text-blue-300"
                        onClick={() => onApplyBulletEdit(alt)}
                      >
                        Use this
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
