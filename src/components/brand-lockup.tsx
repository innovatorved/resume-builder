import type React from "react";
import { VLogo } from "./v-logo";

export function ResumeMark({ className = "h-4 w-4 text-current" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

interface BrandLockupProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

export function BrandLockup({
  size = "md",
  showTagline = true,
  className = "",
}: BrandLockupProps) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Partner Icons Lockup: VD × Resume */}
      <div className="flex items-center gap-1.5">
        <div
          className={`flex items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shadow-xs ${
            isSm ? "h-7 w-7" : isLg ? "h-10 w-10 rounded-lg" : "h-8 w-8"
          }`}
        >
          <VLogo
            className={
              isSm
                ? "h-3.5 w-3.5 text-black dark:text-white"
                : isLg
                  ? "h-5 w-5 text-black dark:text-white"
                  : "h-4 w-4 text-black dark:text-white"
            }
          />
        </div>

        <span className="text-neutral-400 dark:text-neutral-500 font-mono text-xs px-0.5">
          ✕
        </span>

        <div
          className={`flex items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shadow-xs ${
            isSm ? "h-7 w-7" : isLg ? "h-10 w-10 rounded-lg" : "h-8 w-8"
          }`}
        >
          <ResumeMark
            className={
              isSm
                ? "h-3.5 w-3.5 text-black dark:text-white"
                : isLg
                  ? "h-5 w-5 text-black dark:text-white"
                  : "h-4 w-4 text-black dark:text-white"
            }
          />
        </div>
      </div>

      {/* Typography */}
      <div>
        <div className="flex items-center gap-1.5">
          <span
            className={`font-semibold tracking-tight text-foreground ${
              isSm ? "text-xs" : isLg ? "text-base" : "text-sm"
            }`}
          >
            Ved Gupta
          </span>
          <span className="text-neutral-400 dark:text-neutral-500 font-mono text-xs">×</span>
          <span
            className={`font-semibold tracking-tight text-foreground ${
              isSm ? "text-xs" : isLg ? "text-base" : "text-sm"
            }`}
          >
            Resume Builder
          </span>
        </div>
        {showTagline && (
          <p className="text-[10px] sm:text-[11px] text-neutral-500 uppercase tracking-widest font-medium">
            LaTeX Resume Engine
          </p>
        )}
      </div>
    </div>
  );
}
