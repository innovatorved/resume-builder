import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signOut, useSession } from "@/lib/auth-client";

export function AuthNav() {
  const { data: session, isPending } = useSession();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
      window.location.href = "/login";
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
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground cursor-pointer"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </div>
  );
}
