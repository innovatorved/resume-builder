import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VLogo } from "@/components/v-logo";
import { useToast } from "@/hooks/use-toast";
import { signIn } from "@/lib/auth-client";

export function RegisterPage() {
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
      console.error("SSO sign-up error:", error);
      toast({
        title: "SSO Error",
        description: "Failed to initiate sign-up with VedGupta SSO. Please try again.",
        variant: "destructive",
      });
      setIsSsoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 sm:p-8 overflow-hidden">
      <div className="w-full max-w-md">
        {/* Brand Header matching sso.vedgupta.in */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex items-center justify-center rounded-md shrink-0 h-10 w-10 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
            <VLogo className="shrink-0 h-5 w-5 text-black dark:text-white" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tighter text-foreground">Ved Gupta</p>
            <p className="text-[11px] text-neutral-500 uppercase tracking-widest font-medium">
              Resume Studio
            </p>
          </div>
        </div>

        {/* Section Header */}
        <div className="mb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500 mb-2">
            Get Started
          </p>
          <h1 className="text-3xl font-semibold tracking-tighter text-foreground mb-2 text-balance">
            Activate Resume Studio
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Accounts are managed centrally at sso.vedgupta.in. Sign in with your Ved Gupta SSO
            credentials to activate your studio.
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
              <span>Unified Account Provisioning</span>
            </div>
            <p className="leading-relaxed">
              You do not need to register a separate email and password. Your Ved Gupta single
              sign-on profile will automatically provision your resume workspace upon first login.
            </p>
            <div className="pt-2">
              <a
                href="https://sso.vedgupta.in"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-neutral-900 dark:text-neutral-200 font-medium hover:underline underline-offset-2"
              >
                <span>Manage SSO account</span>
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>
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
