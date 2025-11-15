"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
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
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-slate-700">
        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {session.user?.name || session.user?.email}
        </span>
      </div>
      <Button
        onClick={handleSignOut}
        variant="outline"
        size="sm"
        className="border-2 border-gray-300 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
      >
        <LogOut className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Sign Out</span>
      </Button>
    </div>
  );
}
