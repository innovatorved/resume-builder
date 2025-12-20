"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";

type Step = "name" | "email" | "password" | "confirm";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentStep, setCurrentStep] = useState<Step>("name");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

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
        description: "Welcome to Resume Builder. Redirecting...",
      });

      router.push("/");
      router.refresh();
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
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Create Account</h1>
          <p className="text-gray-600 dark:text-gray-400 text-center text-lg">
            Join Resume Builder in a few easy steps
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {["name", "email", "password", "confirm"].map((step, index) => (
            <div
              key={step}
              className={`h-2  transition-all duration-300 ${
                getStepNumber(currentStep) === index
                  ? "w-16 bg-blue-600"
                  : getStepNumber(currentStep) > index
                    ? "w-8 bg-blue-400"
                    : "w-8 bg-gray-300 dark:bg-gray-600"
              }`}
            />
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
          <form onSubmit={handleNameNext} className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                <User className="h-6 w-6 text-blue-600" />
                <h2 className="text-3xl font-semibold">What's your name?</h2>
              </div>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="h-14 text-lg border-2 border-gray-300 dark:border-gray-600 focus:border-blue-600 dark:focus:border-blue-500  bg-white dark:bg-slate-800 transition-all"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <Link
                href="/login"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
              >
                Already have an account? Sign in
              </Link>
              <Button
                type="submit"
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all  px-8 h-12 text-base font-semibold group"
                disabled={!name.trim()}
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
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
          <form onSubmit={handleEmailNext} className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                <Mail className="h-6 w-6 text-blue-600" />
                <h2 className="text-3xl font-semibold">What's your email?</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Hi <span className="font-semibold text-gray-900 dark:text-white">{name}</span>,
                we'll use this to create your account
              </p>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-14 text-lg border-2 border-gray-300 dark:border-gray-600 focus:border-blue-600 dark:focus:border-blue-500  bg-white dark:bg-slate-800 transition-all"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleBack}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group "
              >
                <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all  px-8 h-12 text-base font-semibold group"
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
              : getStepNumber(currentStep) > getStepNumber("password")
                ? "opacity-0 -translate-x-full absolute pointer-events-none"
                : "opacity-0 translate-x-full absolute pointer-events-none"
          }`}
        >
          <form onSubmit={handlePasswordNext} className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                <Lock className="h-6 w-6 text-blue-600" />
                <h2 className="text-3xl font-semibold">Create a password</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Must be at least 8 characters long
              </p>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a secure password"
                className="h-14 text-lg border-2 border-gray-300 dark:border-gray-600 focus:border-blue-600 dark:focus:border-blue-500  bg-white dark:bg-slate-800 transition-all"
                autoFocus
                required
              />
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700  overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength === "strong"
                            ? "bg-green-500 w-full"
                            : passwordStrength === "medium"
                              ? "bg-yellow-500 w-2/3"
                              : "bg-red-500 w-1/3"
                        }`}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400 capitalize font-medium min-w-[60px]">
                      {passwordStrength}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={handleBack}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group "
              >
                <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                Back
              </Button>
              <Button
                type="submit"
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all  px-8 h-12 text-base font-semibold group"
                disabled={password.length < 8}
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
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
          <form onSubmit={handleConfirmSubmit} className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                <Check className="h-6 w-6 text-blue-600" />
                <h2 className="text-3xl font-semibold">Confirm your password</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Re-enter your password to make sure it's correct
              </p>
              <div className="relative">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="h-14 text-lg border-2 border-gray-300 dark:border-gray-600 focus:border-blue-600 dark:focus:border-blue-500  bg-white dark:bg-slate-800 transition-all"
                  autoFocus
                  required
                  disabled={isLoading}
                />
                {confirmPassword && password === confirmPassword && (
                  <Check className="absolute right-4 top-4 h-6 w-6 text-green-500" />
                )}
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-500 text-sm">Passwords don't match</p>
              )}
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
                disabled={!confirmPassword || password !== confirmPassword || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-12">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
