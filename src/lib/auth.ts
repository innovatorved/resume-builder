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
            scopes: ["openid", "email", "profile", "offline_access"],
            pkce: true,
            responseType: "code",
            accountSubject: ({ profile }) => (profile.sub || profile.id || "") as string,
            mapProfileToUser: (profile) => ({
              name: (profile.name || profile.email?.split("@")[0] || "User") as string,
              email: profile.email as string,
              image: (profile.picture || profile.image) as string | undefined,
              emailVerified: Boolean(profile.email_verified ?? profile.emailVerified ?? true),
            }),
            getToken: async (data) => {
              console.log("[SSO getToken] Starting token exchange:", {
                hasCode: Boolean(data.code),
                hasVerifier: Boolean(data.codeVerifier),
                redirectURI: data.redirectURI,
              });

              const redirectURI = data.redirectURI || `${baseURL}/api/auth/callback/vedgupta-sso`;
              const body = new URLSearchParams({
                grant_type: "authorization_code",
                code: data.code,
                client_id: process.env.SSO_CLIENT_ID || "resume-builder-app",
                redirect_uri: redirectURI,
              });

              if (data.codeVerifier) {
                body.set("code_verifier", data.codeVerifier);
              }
              if (process.env.SSO_CLIENT_SECRET) {
                body.set("client_secret", process.env.SSO_CLIENT_SECRET);
              }

              const response = await fetch("https://sso.vedgupta.in/api/auth/oauth2/token", {
                method: "POST",
                headers: {
                  "content-type": "application/x-www-form-urlencoded",
                  accept: "application/json",
                },
                body: body.toString(),
              });

              const responseText = await response.text();
              console.log(`[SSO getToken] Token response ${response.status}:`, responseText);

              if (!response.ok) {
                console.error(`[SSO getToken ERROR] Status ${response.status}: ${responseText}`);
                throw new Error(`SSO token exchange failed: ${responseText}`);
              }

              const json = JSON.parse(responseText);
              return {
                tokenType: json.token_type,
                accessToken: json.access_token,
                refreshToken: json.refresh_token,
                accessTokenExpiresAt: json.expires_in
                  ? new Date(Date.now() + json.expires_in * 1000)
                  : undefined,
                refreshTokenExpiresAt: json.refresh_token_expires_in
                  ? new Date(Date.now() + json.refresh_token_expires_in * 1000)
                  : undefined,
                scopes: json.scope
                  ? Array.isArray(json.scope)
                    ? json.scope
                    : json.scope.split(" ")
                  : [],
                idToken: json.id_token,
                raw: json,
              };
            },
            getUserInfo: async (tokens) => {
              console.log("[SSO getUserInfo] Fetching user info with access token");
              const response = await fetch("https://sso.vedgupta.in/api/auth/oauth2/userinfo", {
                headers: {
                  authorization: `Bearer ${tokens.accessToken}`,
                  accept: "application/json",
                },
              });

              const responseText = await response.text();
              console.log(`[SSO getUserInfo] Response ${response.status}:`, responseText);

              if (!response.ok) {
                console.error(`[SSO getUserInfo ERROR] Status ${response.status}: ${responseText}`);
                throw new Error(`SSO userinfo fetch failed: ${responseText}`);
              }

              return JSON.parse(responseText);
            },
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
