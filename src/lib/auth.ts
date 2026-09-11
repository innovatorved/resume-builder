import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

async function ssoFetch(url: string | URL, init?: RequestInit): Promise<Response> {
  const ssoService = (globalThis as any).__SSO_SERVICE__ || (process.env as any).SSO_SERVICE;
  if (ssoService && typeof ssoService.fetch === "function") {
    console.log("[SSO ssoFetch] Calling via Cloudflare Service Binding:", url.toString());
    return ssoService.fetch(url.toString(), init);
  }
  console.log("[SSO ssoFetch] Calling via global fetch:", url.toString());
  return fetch(url, init);
}

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
            clientSecret: process.env.SSO_CLIENT_SECRET || "ZRkRBGALUztlpJWabalsHKWdMkvPaUDh",
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
              const clientId = (process.env.SSO_CLIENT_ID || "resume-builder-app").trim();
              const clientSecret = (
                process.env.SSO_CLIENT_SECRET || "ZRkRBGALUztlpJWabalsHKWdMkvPaUDh"
              ).trim();

              const body = new URLSearchParams({
                grant_type: "authorization_code",
                code: data.code,
                redirect_uri: redirectURI,
              });

              if (data.codeVerifier) {
                body.set("code_verifier", data.codeVerifier);
              }

              const headers: Record<string, string> = {
                "content-type": "application/x-www-form-urlencoded",
                accept: "application/json",
              };

              // Better Auth OAuth provider with token_endpoint_auth_method: "client_secret_basic"
              // expects HTTP Basic Authentication header and NO client_secret in the body
              if (clientSecret) {
                const credentials = btoa(`${clientId}:${clientSecret}`);
                headers["authorization"] = `Basic ${credentials}`;
              } else {
                body.set("client_id", clientId);
              }

              let response = await ssoFetch("https://sso.vedgupta.in/api/auth/oauth2/token", {
                method: "POST",
                headers,
                body: body.toString(),
              });

              let responseText = await response.text();
              console.log(`[SSO getToken] Token response ${response.status}:`, responseText);

              // If the server failed due to method mismatch expecting client_secret_post, fallback and retry
              if (!response.ok && responseText.includes("client_secret_post") && clientSecret) {
                console.log("[SSO getToken] Retrying with client_secret_post...");
                const postBody = new URLSearchParams(body);
                postBody.set("client_id", clientId);
                postBody.set("client_secret", clientSecret);
                response = await ssoFetch("https://sso.vedgupta.in/api/auth/oauth2/token", {
                  method: "POST",
                  headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    accept: "application/json",
                  },
                  body: postBody.toString(),
                });
                responseText = await response.text();
                console.log(`[SSO getToken retry] Response ${response.status}:`, responseText);
              }

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
              const response = await ssoFetch("https://sso.vedgupta.in/api/auth/oauth2/userinfo", {
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
