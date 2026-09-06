import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VLogo } from "@/components/v-logo";
import { useToast } from "@/hooks/use-toast";
import { signIn, signUp } from "@/lib/auth-client";

type Step = "name" | "email" | "password" | "confirm";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentStep, setCurrentStep] = useState<Step>("name");
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
      console.error("SSO sign-up error:", error);
      toast({
        title: "SSO Error",
        description: "Failed to initiate sign-up with VedGupta SSO. Please try again.",
        variant: "destructive",
      });
      setIsSsoLoading(false);
    }
  };

  const handleNameNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setCurrentStep("email");
    }
  };

  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setCurrentStep("password");
    }
  };

  const handlePasswordNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length >= 8) {
      setCurrentStep("confirm");
    } else {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await signUp.email({
        email,
        password,
        name,
      });

      if (error) {
        console.error("Registration error:", error);
        toast({
          title: "Registration failed",
          description: error.message || "An error occurred. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Account created!",
        description: "Welcome to Resume Builder. Redirecting…",
      });

      window.location.href = "/";
    } catch (error: any) {
      console.error("Unexpected registration error:", error);
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ["name", "email", "password", "confirm"];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const passwordStrength =
    password.length >= 12 ? "strong" : password.length >= 8 ? "medium" : "weak";

  const getStepNumber = (step: Step): number => {
    const steps: Step[] = ["name", "email", "password", "confirm"];
    return steps.indexOf(step);
  };

  const stepLabels: Record<string, string> = {
    name: "Name",
    email: "Email",
    password: "Password",
    confirm: "Confirm",
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
            Registration
          </p>
          <h1 className="text-3xl font-semibold tracking-tighter text-foreground mb-2 text-balance">
            Create account
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Join in a few easy steps to start crafting your resume.
          </p>
        </div>

        {/* Progress lines */}
        <div className="flex items-center gap-2 mb-8">
          {["name", "email", "password", "confirm"].map((step, index) => (
            <div key={step} className="flex flex-col items-start gap-1 flex-1">
              <div
                className={`h-0.5 w-full transition-all duration-300 ${
                  getStepNumber(currentStep) === index
                    ? "bg-foreground"
                    : getStepNumber(currentStep) > index
                      ? "bg-neutral-400 dark:bg-neutral-600"
                      : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              />
              <span
                className={`text-[9px] uppercase tracking-widest transition-colors font-medium ${
                  getStepNumber(currentStep) >= index ? "text-foreground" : "text-neutral-400/60"
                }`}
              >
                {stepLabels[step]}
              </span>
            </div>
          ))}
        </div>

        {/* Name Step */}
        <div
          className={`transition-all duration-300 ${
            currentStep === "name"
              ? "opacity-100 translate-x-0 relative"
              : "opacity-0 -translate-x-full absolute pointer-events-none"
          }`}
        >
          {/* VedGupta SSO Quick Sign-up */}
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
                  Sign up with Ved Gupta SSO
                </>
              )}
            </Button>
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
              </div>
              <span className="relative bg-background px-3 text-[11px] uppercase tracking-widest text-neutral-500 font-medium">
                or register with email
              </span>
            </div>
          </div>

          <form onSubmit={handleNameNext} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="reg-name"
                className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500"
              >
                Your name
              </label>
              <Input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="h-11 text-sm border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-foreground rounded-md px-3.5 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 transition-colors"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="/login"
                className="text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors text-xs font-medium underline underline-offset-4 decoration-neutral-300 dark:decoration-neutral-700"
              >
                Already have an account?
              </a>
              <Button
                type="submit"
                size="lg"
                className="h-11 px-6 text-sm font-medium group transition-all"
                disabled={!name.trim()}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </form>
        </div>

        {/* Email Step */}
        <div
          className={`transition-all duration-300 ${
            currentStep === "email"
              ? "opacity-100 translate-x-0 relative"
              : getStepNumber(currentStep) > getStepNumber("email")
                ? "opacity-0 -translate-x-full absolute pointer-events-none"
                : "opacity-0 translate-x-full absolute pointer-events-none"
          }`}
        >
          <form onSubmit={handleEmailNext} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="reg-email"
                className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500"
              >
                Email address
              </label>
              <p className="text-xs text-neutral-500">
                Hi <span className="font-medium text-foreground">{name}</span>, we'll use this to
                create your account.
              </p>
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 text-sm border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-foreground rounded-md px-3.5 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 transition-colors"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleBack}
                className="h-11 text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors group cursor-pointer"
              >
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back
              </Button>
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
              : getStepNumber(currentStep) > getStepNumber("password")
                ? "opacity-0 -translate-x-full absolute pointer-events-none"
                : "opacity-0 translate-x-full absolute pointer-events-none"
          }`}
        >
          <form onSubmit={handlePasswordNext} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="reg-pwd"
                className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500"
              >
                Create a password
              </label>
              <p className="text-xs text-neutral-500">Must be at least 8 characters long.</p>
              <Input
                id="reg-pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a secure password"
                className="h-11 text-sm border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-foreground rounded-md px-3.5 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 transition-colors"
                autoFocus
                required
              />
              {password && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-0.5 bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ease-out ${
                          passwordStrength === "strong"
                            ? "bg-green-500 w-full"
                            : passwordStrength === "medium"
                              ? "bg-amber-500 w-2/3"
                              : "bg-red-500 w-1/3"
                        }`}
                      />
                    </div>
                    <span className="text-[11px] text-neutral-500 capitalize font-medium min-w-[50px]">
                      {passwordStrength}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleBack}
                className="h-11 text-xs text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors group cursor-pointer"
              >
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                className="h-11 px-6 text-sm font-medium group transition-all"
                disabled={password.length < 8}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </form>
        </div>

        {/* Confirm Password Step */}
        <div
          className={`transition-all duration-300 ${
            currentStep === "confirm"
              ? "opacity-100 translate-x-0 relative"
              : "opacity-0 translate-x-full absolute pointer-events-none"
          }`}
        >
          <form onSubmit={handleConfirmSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="reg-confirm"
                className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500"
              >
                Confirm password
              </label>
              <p className="text-xs text-neutral-500">
                Re-enter your password to make sure it's correct.
              </p>
              <div className="relative">
                <Input
                  id="reg-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="h-11 text-sm border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-foreground rounded-md px-3.5 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600 transition-colors"
                  autoFocus
                  required
                  disabled={isLoading}
                />
                {confirmPassword && password === confirmPassword && (
                  <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                )}
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-500 text-xs">Passwords don't match</p>
              )}
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
                disabled={!confirmPassword || password !== confirmPassword || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>
                    Create Account
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
          <p className="text-[11px] text-neutral-500">© 2026 Ved Prakash Gupta · Resume Studio</p>
        </div>
      </div>
    </div>
  );
}
