// @ts-check

import cloudflare from "@astrojs/cloudflare"
import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import agents from "agents/vite"
import { defineConfig } from "astro/config"

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: "cloudflare",
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss(), ...agents()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  },
})
