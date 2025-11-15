import { createAuthClient } from "better-auth/react";

const baseURL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";

console.log("[AUTH-CLIENT] Initializing auth client...", {
  baseURL,
  isProduction: process.env.NODE_ENV === "production",
  hasEnvVariable: !!process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});

export const authClient = createAuthClient({
  baseURL,
});

console.log("[AUTH-CLIENT] Auth client created successfully");

export const { signIn, signUp, signOut, useSession } = authClient;
