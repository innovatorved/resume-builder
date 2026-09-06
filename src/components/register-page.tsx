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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-16 animate-in fade-in slide-in-from-top-4 duration-500">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6">
            Resume Builder
          </p>
          <h1 className="font-semibold text-5xl md:text-6xl text-foreground mb-3 tracking-tight">
            Create account
          </h1>
          <p className="text-muted-foreground text-lg">Join in a few easy steps.</p>
        </div>

        {/* Progress lines */}
        <div className="flex items-center gap-3 mb-12">
          {["name", "email", "password", "confirm"].map((step, index) => (
            <div key={step} className="flex flex-col items-start gap-1.5 flex-1">
              <div
                className={`h-0.5 w-full transition-all duration-500 ease-out ${
                  getStepNumber(currentStep) === index
                    ? "bg-primary"
                    : getStepNumber(currentStep) > index
                      ? "bg-primary/40"
                      : "bg-border"
                }`}
              />
              <span
                className={`text-[10px] uppercase tracking-widest transition-colors ${
                  getStepNumber(currentStep) >= index
                    ? "text-foreground"
                    : "text-muted-foreground/50"
                }`}
              >
                {stepLabels[step]}
              </span>
            </div>
          ))}
        </div>

        {/* Name Step */}
        <div
          className={`transition-all duration-500 ${
            currentStep === "name"
              ? "opacity-100 translate-x-0 relative"
              : "opacity-0 -translate-x-full absolute pointer-events-none"
          }`}
        >
          {/* VedGupta SSO Quick Sign-up */}
          <div className="space-y-4 mb-8">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleSsoLogin}
              disabled={isSsoLoading || isLoading}
              className="w-full h-12 text-base font-medium flex items-center justify-center gap-2.5 border-border hover:bg-accent/50 transition-all cursor-pointer"
            >
              {isSsoLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting to SSO…
                </>
              ) : (
                <>
                  <VLogo className="h-5 w-5 text-foreground shrink-0" />
                  Sign up with VedGupta SSO
                </>
              )}
            </Button>
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <span className="relative bg-background px-3 text-xs uppercase tracking-widest text-muted-foreground">
                or register with email
              </span>
            </div>
          </div>

          <form onSubmit={handleNameNext} className="space-y-10">
            <div className="space-y-4">
              <label
                htmlFor="reg-name"
                className="text-sm font-medium tracking-wide text-foreground uppercase"
              >
                Your name
              </label>
              <Input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="h-14 text-lg border-0 border-b-2 border-border rounded-none bg-transparent focus:border-primary focus-visible:ring-0 transition-colors placeholder:text-muted-foreground/50"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <a
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium underline underline-offset-4 decoration-border hover:decoration-foreground"
              >
                Already have an account?
              </a>
              <Button
                type="submit"
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base font-medium group transition-all cursor-pointer"
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
          className={`transition-all duration-500 ${
            currentStep === "email"
              ? "opacity-100 translate-x-0 relative"
              : getStepNumber(currentStep) > getStepNumber("email")
                ? "opacity-0 -translate-x-full absolute pointer-events-none"
                : "opacity-0 translate-x-full absolute pointer-events-none"
          }`}
        >
          <form onSubmit={handleEmailNext} className="space-y-10">
            <div className="space-y-4">
              <label
                htmlFor="reg-email"
                className="text-sm font-medium tracking-wide text-foreground uppercase"
              >
                Email address
              </label>
              <p className="text-muted-foreground text-sm">
                Hi <span className="font-medium text-foreground">{name}</span>, we'll use this to
                create your account.
              </p>
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-14 text-lg border-0 border-b-2 border-border rounded-none bg-transparent focus:border-primary focus-visible:ring-0 transition-colors placeholder:text-muted-foreground/50"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
              >
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base font-medium group transition-all cursor-pointer"
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
          className={`transition-all duration-500 ${
            currentStep === "password"
              ? "opacity-100 translate-x-0 relative"
              : getStepNumber(currentStep) > getStepNumber("password")
                ? "opacity-0 -translate-x-full absolute pointer-events-none"
                : "opacity-0 translate-x-full absolute pointer-events-none"
          }`}
        >
          <form onSubmit={handlePasswordNext} className="space-y-10">
            <div className="space-y-4">
              <label
                htmlFor="reg-pwd"
                className="text-sm font-medium tracking-wide text-foreground uppercase"
              >
                Create a password
              </label>
              <p className="text-muted-foreground text-sm">Must be at least 8 characters long.</p>
              <Input
                id="reg-pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a secure password"
                className="h-14 text-lg border-0 border-b-2 border-border rounded-none bg-transparent focus:border-primary focus-visible:ring-0 transition-colors placeholder:text-muted-foreground/50"
                autoFocus
                required
              />
              {password && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-0.5 bg-border overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ease-out ${
                          passwordStrength === "strong"
                            ? "bg-accent-foreground w-full"
                            : passwordStrength === "medium"
                              ? "bg-chart-3 w-2/3"
                              : "bg-destructive w-1/3"
                        }`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground capitalize font-medium min-w-[50px]">
                      {passwordStrength}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
              >
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base font-medium group transition-all cursor-pointer"
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
          className={`transition-all duration-500 ${
            currentStep === "confirm"
              ? "opacity-100 translate-x-0 relative"
              : "opacity-0 translate-x-full absolute pointer-events-none"
          }`}
        >
          <form onSubmit={handleConfirmSubmit} className="space-y-10">
            <div className="space-y-4">
              <label
                htmlFor="reg-confirm"
                className="text-sm font-medium tracking-wide text-foreground uppercase"
              >
                Confirm password
              </label>
              <p className="text-muted-foreground text-sm">
                Re-enter your password to make sure it's correct.
              </p>
              <div className="relative">
                <Input
                  id="reg-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="h-14 text-lg border-0 border-b-2 border-border rounded-none bg-transparent focus:border-primary focus-visible:ring-0 transition-colors placeholder:text-muted-foreground/50"
                  autoFocus
                  required
                  disabled={isLoading}
                />
                {confirmPassword && password === confirmPassword && (
                  <Check className="absolute right-0 top-4 h-5 w-5 text-accent-foreground" />
                )}
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-destructive text-sm">Passwords don't match</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base font-medium transition-all cursor-pointer"
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

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-20">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
