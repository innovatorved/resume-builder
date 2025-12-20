"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";

type Step = "email" | "password";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentStep, setCurrentStep] = useState<Step>("email");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

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

      router.push("/");
      router.refresh();
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950 flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-2xl">
        {/* Logo/Header - Always visible */}
        <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="p-4 bg-white dark:bg-slate-800 shadow-xl mb-4">
            <Image
              src="/refresh.svg"
              alt="Resume Builder"
              width={40}
              height={40}
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(40%) sepia(100%) saturate(2500%) hue-rotate(195deg) brightness(95%) contrast(90%)",
              }}
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h1>
          <p className="text-gray-600 dark:text-gray-400 text-center text-lg">
            Sign in to continue to Resume Builder
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <div
            className={`h-2  transition-all duration-300 ${
              currentStep === "email" ? "w-16 bg-blue-600" : "w-8 bg-blue-300"
            }`}
          />
          <div
            className={`h-2  transition-all duration-300 ${
              currentStep === "password" ? "w-16 bg-blue-600" : "w-8 bg-gray-300 dark:bg-gray-600"
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
          <form onSubmit={handleEmailNext} className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                <Mail className="h-6 w-6 text-blue-600" />
                <h2 className="text-3xl font-semibold">What's your email?</h2>
              </div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-14 text-lg border-2 border-gray-300 dark:border-gray-600 focus:border-blue-600 dark:focus:border-blue-500  bg-white dark:bg-slate-800 transition-all"
                autoFocus
                onKeyPress={handleKeyPress}
                required
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <Link
                href="/register"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
              >
                Don't have an account? Sign up
              </Link>
              <Button
                type="submit"
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all px-8 h-12 text-base font-semibold group"
                disabled={!email}
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
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
          <form onSubmit={handlePasswordSubmit} className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                <Lock className="h-6 w-6 text-blue-600" />
                <h2 className="text-3xl font-semibold">Enter your password</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Signing in as{" "}
                <span className="font-semibold text-gray-900 dark:text-white">{email}</span>
              </p>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-14 text-lg border-2 border-gray-300 dark:border-gray-600 focus:border-blue-600 dark:focus:border-blue-500  bg-white dark:bg-slate-800 transition-all"
                autoFocus
                required
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleBack}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group "
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all  px-8 h-12 text-base font-semibold"
                disabled={!password || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-12">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
