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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6">
            Resume Builder
          </p>
          <h1 className="font-semibold text-5xl md:text-6xl text-foreground mb-3 tracking-tight">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-lg">Sign in to continue crafting your resume.</p>
        </div>

        {/* Progress line */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className={`h-0.5 transition-all duration-500 ease-out ${
              currentStep === "email" ? "w-20 bg-primary" : "w-10 bg-border"
            }`}
          />
          <div
            className={`h-0.5 transition-all duration-500 ease-out ${
              currentStep === "password" ? "w-20 bg-primary" : "w-10 bg-border"
            }`}
          />
        </div>

        {/* Email Step */}
        <div
          className={`transition-all duration-500 ${
            currentStep === "email"
              ? "opacity-100 translate-x-0 relative"
              : "opacity-0 -translate-x-full absolute pointer-events-none"
          }`}
        >
          {/* VedGupta SSO Quick Sign-in */}
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
                  Continue with VedGupta SSO
                </>
              )}
            </Button>
            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <span className="relative bg-background px-3 text-xs uppercase tracking-widest text-muted-foreground">
                or use email
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailNext} className="space-y-10">
            <div className="space-y-4">
              <label
                htmlFor="email"
                className="text-sm font-medium tracking-wide text-foreground uppercase"
              >
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-14 text-lg border-0 border-b-2 border-border rounded-none bg-transparent focus:border-primary focus-visible:ring-0 transition-colors placeholder:text-muted-foreground/50"
                autoFocus
                onKeyPress={handleKeyPress}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <a
                href="/register"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium underline underline-offset-4 decoration-border hover:decoration-foreground"
              >
                Create an account
              </a>
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
              : "opacity-0 translate-x-full absolute pointer-events-none"
          }`}
        >
          <form onSubmit={handlePasswordSubmit} className="space-y-10">
            <div className="space-y-4">
              <label
                htmlFor="password"
                className="text-sm font-medium tracking-wide text-foreground uppercase"
              >
                Password
              </label>
              <p className="text-muted-foreground text-sm">
                Signing in as <span className="font-medium text-foreground">{email}</span>
              </p>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-14 text-lg border-0 border-b-2 border-border rounded-none bg-transparent focus:border-primary focus-visible:ring-0 transition-colors placeholder:text-muted-foreground/50"
                autoFocus
                required
                disabled={isLoading}
              />
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

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-20">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
