import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

console.log("[AUTH] Initializing auth system...");
console.log("[AUTH] Environment check:", {
  nodeEnv: process.env.NODE_ENV,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + "...",
  betterAuthUrl: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "not set",
});

const prisma = new PrismaClient();
console.log("[AUTH] PrismaClient initialized");

const trustedOrigins = process.env.NEXT_PUBLIC_BETTER_AUTH_URL
  ? [process.env.NEXT_PUBLIC_BETTER_AUTH_URL]
  : ["http://localhost:3000"];

console.log("[AUTH] Trusted origins:", trustedOrigins);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production with email service
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  socialProviders: {
    // Add social providers here if needed (GitHub, Google, etc.)
    // Example:
    // github: {
    //   clientId: process.env.GITHUB_CLIENT_ID!,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    // },
  },
  trustedOrigins,
});

console.log("[AUTH] betterAuth configured successfully");

export type Session = typeof auth.$Infer.Session;
