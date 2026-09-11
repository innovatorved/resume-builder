import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

function initAuth() {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required");

  const baseURL =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.trim() ||
    "https://resume.vedgupta.in";

  const trustedOrigins = Array.from(
    new Set(
      [
        baseURL,
        "https://resume.vedgupta.in",
        "https://resume-builder-14e.pages.dev",
        "http://localhost:3000",
      ].filter(Boolean) as string[]
    )
  );

  return betterAuth({
    baseURL,
    secret,
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
            redirectURI: `${baseURL}/api/auth/callback/vedgupta-sso`,
            scopes: ["openid", "email", "profile"],
            pkce: true,
            responseType: "code",
          },
        ],
      }),
    ],
    advanced: {
      trustedProxyHeaders: true,
    },
    trustedOrigins,
  });
}

type AuthInstance = ReturnType<typeof initAuth>;
let authInstance: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  if (!authInstance) {
    authInstance = initAuth();
  }
  return authInstance;
}

export const auth = new Proxy({} as AuthInstance, {
  get(_target, prop, receiver) {
    const instance = getAuth();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export type Session = AuthInstance["$Infer"]["Session"];
