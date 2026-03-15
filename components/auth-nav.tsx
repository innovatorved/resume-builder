"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export function AuthNav() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isPending) {
    return null;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <span className="hidden sm:inline text-sm text-muted-foreground">
        {session.user?.name || session.user?.email}
      </span>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  );
}
