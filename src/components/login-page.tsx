import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { BrandLockup } from "@/components/brand-lockup";
import { Button } from "@/components/ui/button";
import { VLogo } from "@/components/v-logo";
import { useToast } from "@/hooks/use-toast";
import { signIn } from "@/lib/auth-client";

export function LoginPage() {
  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const { toast } = useToast();

  const handleSsoLogin = async () => {
    setIsSsoLoading(true);
    try {
      await signIn.social({
        provider: "vedgupta-sso",
        callbackURL: "/",
      });
    } catch (error) {
      console.error("SSO login error:", error);
      toast({
        title: "SSO Login Failed",
        description: "Failed to initiate login with VedGupta SSO. Please try again.",
        variant: "destructive",
      });
      setIsSsoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 sm:p-8 overflow-hidden">
      <div className="w-full max-w-md">
        {/* Brand Header: VD x Resume Builder */}
        <BrandLockup size="lg" className="mb-10" />

        {/* Section Header */}
        <div className="mb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500 mb-2">
            Authentication
          </p>
          <h1 className="text-3xl font-semibold tracking-tighter text-foreground mb-2 text-balance">
            Welcome to Resume Studio
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Single sign-on access for your LaTeX resumes, templates, and compiler workspace.
          </p>
        </div>

        {/* Single Sign-On Action */}
        <div className="space-y-4">
          <Button
            type="button"
            size="lg"
            onClick={handleSsoLogin}
            disabled={isSsoLoading}
            className="w-full h-12 text-sm font-medium flex items-center justify-center gap-3 border border-neutral-800 bg-white text-black hover:bg-neutral-100 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer"
          >
            {isSsoLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-neutral-900" />
                Connecting to SSO…
              </>
            ) : (
              <>
                <VLogo className="h-4 w-4 text-black shrink-0" />
                Continue with Ved Gupta SSO
              </>
            )}
          </Button>

          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/30 p-4 text-xs text-neutral-500 space-y-2">
            <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 font-medium">
              <ShieldCheck className="h-4 w-4 text-neutral-400" />
              <span>Centralized Identity Access</span>
            </div>
            <p className="leading-relaxed">
              Accounts and sessions are centrally authenticated by{" "}
              <a
                href="https://sso.vedgupta.in"
                target="_blank"
                rel="noreferrer"
                className="text-neutral-900 dark:text-neutral-200 underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                sso.vedgupta.in
              </a>
              .
            </p>
          </div>
        </div>

        {/* Footer matching sso.vedgupta.in */}
        <div className="mt-16 pt-6 border-t border-neutral-200 dark:border-neutral-800/80 text-center space-y-2">
          <p className="text-xs text-neutral-500">
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
