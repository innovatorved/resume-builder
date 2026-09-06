// @ts-check

import cloudflare from "@astrojs/cloudflare"
import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: "cloudflare",
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(process.env.GEMINI_API_KEY || ""),
      "process.env.TURSO_DATABASE_URL": JSON.stringify(process.env.TURSO_DATABASE_URL || ""),
      "process.env.TURSO_AUTH_TOKEN": JSON.stringify(process.env.TURSO_AUTH_TOKEN || ""),
      "process.env.BETTER_AUTH_SECRET": JSON.stringify(process.env.BETTER_AUTH_SECRET || ""),
      "process.env.BETTER_AUTH_URL": JSON.stringify(process.env.BETTER_AUTH_URL || ""),
      "process.env.NEXT_PUBLIC_BETTER_AUTH_URL": JSON.stringify(process.env.NEXT_PUBLIC_BETTER_AUTH_URL || ""),
      "process.env.SSO_BASE_URL": JSON.stringify(process.env.SSO_BASE_URL || ""),
      "process.env.SSO_CLIENT_ID": JSON.stringify(process.env.SSO_CLIENT_ID || ""),
    },
  },
})
