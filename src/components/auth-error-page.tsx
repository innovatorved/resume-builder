import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Home,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/brand-lockup";
import { Button } from "@/components/ui/button";
import { VLogo } from "@/components/v-logo";
import { signIn } from "@/lib/auth-client";

interface ErrorInfo {
  title: string;
  description: string;
  recommendation: string;
  badge: string;
}

const ERROR_MAP: Record<string, ErrorInfo> = {
  state_mismatch: {
    title: "Session Expired or State Mismatch",
    description:
      "The security state token generated when signing in could not be verified or has timed out. This commonly happens if the authentication window took longer than 5 minutes or if multiple sign-in tabs were opened.",
    recommendation: "Click below to start a fresh login session with Ved Gupta SSO.",
    badge: "STATE_MISMATCH",
  },
  access_denied: {
    title: "Access Request Denied",
    description:
      "The sign-in request was rejected or cancelled. If your account is pending administrator approval or does not have permissions to access Resume Studio, contact your administrator.",
    recommendation: "Ensure your account is active and approved on sso.vedgupta.in.",
    badge: "ACCESS_DENIED",
  },
  oauth_error: {
    title: "OAuth Authorization Failed",
    description:
      "An unexpected error occurred while communicating with the central SSO identity provider during token exchange.",
    recommendation: "Please try authenticating again in a few moments.",
    badge: "OAUTH_ERROR",
  },
  configuration_error: {
    title: "SSO Service Configuration Issue",
    description:
      "The Resume Studio application could not verify its identity credentials with the central SSO service.",
    recommendation: "Check SSO service health or retry shortly.",
    badge: "CONFIG_ERROR",
  },
  invalid_callback: {
    title: "Invalid Authorization Callback",
    description:
      "The authentication response returned by the SSO provider contained invalid parameters.",
    recommendation: "Please start the sign-in flow again from the login page.",
    badge: "INVALID_CALLBACK",
  },
};

export function AuthErrorPage() {
  const [errorCode, setErrorCode] = useState<string>("unknown_error");
  const [errorDesc, setErrorDesc] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [timestamp, setTimestamp] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error") || "unknown_error";
    const desc = params.get("error_description") || "";
    setErrorCode(code);
    setErrorDesc(desc);
    setTimestamp(new Date().toISOString());
  }, []);

  const errorInfo = ERROR_MAP[errorCode] || {
    title: "Authentication Error",
    description:
      errorDesc ||
      "We encountered an unexpected issue while authenticating your account with Ved Gupta SSO.",
    recommendation: "Please try signing in again or return to the home page.",
    badge: errorCode.toUpperCase(),
  };

  const handleRetryLogin = async () => {
    setIsRetrying(true);
    try {
      await signIn.social({
        provider: "vedgupta-sso",
        callbackURL: "/",
      });
    } catch (err) {
      console.error("Failed to retry SSO login:", err);
      setIsRetrying(false);
      window.location.href = "/login";
    }
  };

  const copyDebugJson = () => {
    const debugData = {
      app: "resume-builder",
      origin: typeof window !== "undefined" ? window.location.origin : "",
      errorCode,
      errorDescription: errorDesc,
      timestamp,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 sm:p-8 overflow-hidden">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <BrandLockup size="lg" className="mb-8" />

        {/* Error Main Card */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-card p-6 sm:p-8 shadow-sm space-y-6">
          {/* Status Indicator */}
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-lg border border-red-500/20 bg-red-500/10 flex items-center justify-center shrink-0 text-red-500 dark:text-red-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono tracking-wider font-semibold uppercase px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                  {errorInfo.badge}
                </span>
                <span className="text-xs text-neutral-500">SSO Gate</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                {errorInfo.title}
              </h1>
            </div>
          </div>

          {/* Description & Advice */}
          <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed border-t border-b border-neutral-200 dark:border-neutral-800/80 py-4">
            <p>{errorInfo.description}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              💡 {errorInfo.recommendation}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              onClick={handleRetryLogin}
              disabled={isRetrying}
              className="w-full h-12 text-sm font-medium flex items-center justify-center gap-2.5 border border-neutral-800 bg-white text-black hover:bg-neutral-100 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-900" />
                  Connecting to SSO…
                </>
              ) : (
                <>
                  <VLogo className="h-4 w-4 text-black shrink-0" />
                  Try Again with Ved Gupta SSO
                </>
              )}
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => {
                  window.location.href = "/login";
                }}
                className="h-10 text-xs font-medium border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back to Sign In
              </Button>

              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={() => {
                  window.location.href = "/";
                }}
                className="h-10 text-xs font-medium border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              >
                <Home className="h-3.5 w-3.5 mr-1.5" />
                Go to Workspace
              </Button>
            </div>
          </div>

          {/* Technical Diagnostics Collapsible */}
          <div className="border border-neutral-200 dark:border-neutral-800/80 rounded-lg overflow-hidden bg-neutral-50/50 dark:bg-neutral-950/40">
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 font-mono transition-colors text-left"
            >
              <span className="flex items-center gap-1.5">
                {showTechnical ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Diagnostic Details
              </span>
              <span className="text-[10px] text-neutral-400">code: {errorCode}</span>
            </button>

            {showTechnical && (
              <div className="p-4 pt-0 space-y-3 border-t border-neutral-200 dark:border-neutral-800/60 font-mono text-[11px]">
                <div className="flex justify-between items-center pt-2">
                  <span className="text-neutral-400">Telemetry Payload</span>
                  <button
                    type="button"
                    onClick={copyDebugJson}
                    className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-foreground cursor-pointer px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 bg-background"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy JSON
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-neutral-900 text-neutral-300 p-3 rounded-md overflow-x-auto text-[11px] leading-relaxed border border-neutral-800">
                  <p>
                    <span className="text-neutral-500">error:</span> "{errorCode}"
                  </p>
                  {errorDesc && (
                    <p>
                      <span className="text-neutral-500">description:</span> "{errorDesc}"
                    </p>
                  )}
                  <p>
                    <span className="text-neutral-500">provider:</span> "vedgupta-sso"
                  </p>
                  <p>
                    <span className="text-neutral-500">endpoint:</span> "https://sso.vedgupta.in"
                  </p>
                  <p>
                    <span className="text-neutral-500">timestamp:</span> "{timestamp}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800/80 text-center space-y-2">
          <p className="text-xs text-neutral-500">
            Authenticated via{" "}
            <a
              href="https://sso.vedgupta.in"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-neutral-300 dark:decoration-neutral-700 underline-offset-4 hover:text-black dark:hover:text-white transition-colors"
            >
              sso.vedgupta.in
            </a>
          </p>
          <p className="text-[11px] text-neutral-500">© 2026 Ved Prakash Gupta · Resume Studio</p>
        </div>
      </div>
    </div>
  );
}
