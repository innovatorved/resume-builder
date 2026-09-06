import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const trustedOrigins = Array.from(
  new Set(
    [
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
      process.env.BETTER_AUTH_URL,
      "https://resume.vedgupta.in",
      "https://resume-builder-14e.pages.dev",
      "http://localhost:3000",
    ].filter(Boolean) as string[]
  )
);

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "bQmYpTAaLHwRCAj2tqGXVkC2mfaBOFns0ujXrOG+EQQ=",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "vedgupta-sso",
          clientId: process.env.SSO_CLIENT_ID || "resume-builder-app",
          clientSecret: process.env.SSO_CLIENT_SECRET || "",
          authorizationUrl: "https://sso.vedgupta.in/api/auth/oauth2/authorize",
          tokenUrl: "https://sso.vedgupta.in/api/auth/oauth2/token",
          userInfoUrl: "https://sso.vedgupta.in/api/auth/oauth2/userinfo",
          scopes: ["openid", "email", "profile"],
          pkce: true,
          responseType: "code",
        },
      ],
    }),
  ],
  trustedOrigins,
});

export type Session = typeof auth.$Infer.Session;
