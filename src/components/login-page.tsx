import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VLogo } from "@/components/v-logo";
import { useToast } from "@/hooks/use-toast";
import { signIn } from "@/lib/auth-client";

type Step = "email" | "password";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentStep, setCurrentStep] = useState<Step>("email");
  const [isLoading, setIsLoading] = useState(false);
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

  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setCurrentStep("password");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn.email({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        toast({
          title: "Login failed",
          description: error.message || "Invalid email or password. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });

      window.location.href = "/";
    } catch (error) {
      console.error("Unexpected login error:", error);
      toast({
        title: "Login failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentStep("email");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (currentStep === "email" && email) {
        setCurrentStep("password");
      }
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
            Sign In
          </p>
          <h1 className="text-3xl font-semibold tracking-tighter text-foreground mb-2 text-balance">
            Welcome back
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Sign in to continue crafting your LaTeX resume.
          </p>
        </div>

        {/* Progress line */}
        <div className="flex items-center gap-2 mb-8">
          <div
            className={`h-0.5 transition-all duration-300 ${
              currentStep === "email" ? "w-16 bg-foreground" : "w-8 bg-neutral-200 dark:bg-neutral-800"
            }`}
          />
          <div
            className={`h-0.5 transition-all duration-300 ${
              currentStep === "password" ? "w-16 bg-foreground" : "w-8 bg-neutral-200 dark:bg-neutral-800"
            }`}
          />
        </div>

        {/* Email Step */}
        <div
          className={`transition-all duration-300 ${
            currentStep === "email"
              ? "opacity-100 translate-x-0 relative"
              : "opacity-0 -translate-x-full absolute pointer-events-none"
          }`}
        >
          {/* VedGupta SSO Quick Sign-in */}
          <div className="space-y-4 mb-6">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleSsoLogin}
              disabled={isSsoLoading || isLoading}
              className="w-full h-11 text-sm font-medium flex items-center justify-center gap-2.5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-black dark:text-white transition-colors cursor-pointer"
            >
              {isSsoLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting to SSO…
                </>
              ) : (
                <>
                  <VLogo className="h-4 w-4 text-foreground shrink-0" />
                  Continue with Ved Gupta SSO
                </>
              )}
            </Button>
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              </div>
              <span className="relative bg-background px-3 text-[11px] uppercase tracking-widest text-neutral-500 font-medium">
                or use email
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailNext} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500"
              >
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 text-sm border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-foreground rounded-md px-3.5 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 transition-colors"
                autoFocus
                onKeyPress={handleKeyPress}
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="/register"
                className="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors text-xs font-medium underline underline-offset-4 decoration-neutral-300 dark:decoration-neutral-700"
              >
                Create an account
              </a>
              <Button
                type="submit"
                size="lg"
                className="h-11 px-6 text-sm font-medium group transition-all"
                disabled={!email}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </form>
        </div>

        {/* Password Step */}
        <div
          className={`transition-all duration-300 ${
            currentStep === "password"
              ? "opacity-100 translate-x-0 relative"
              : "opacity-0 translate-x-full absolute pointer-events-none"
          }`}
        >
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500"
              >
                Password
              </label>
              <p className="text-xs text-neutral-500">
                Signing in as <span className="font-medium text-foreground">{email}</span>
              </p>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-11 text-sm border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-foreground rounded-md px-3.5 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 transition-colors"
                autoFocus
                required
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleBack}
                className="h-11 text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors group cursor-pointer"
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                className="h-11 px-6 text-sm font-medium transition-all cursor-pointer"
                disabled={!password || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
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
          <p className="text-[11px] text-neutral-500">
            © 2026 Ved Prakash Gupta · Resume Studio
          </p>
        </div>
      </div>
    </div>
  );
}
