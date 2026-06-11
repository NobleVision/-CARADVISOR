import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    // Hermetic tests: dev machines carry real service keys in .env / the
    // shell. ENV is resolved at import time, so blank every service variable
    // here — all external-service modules must see the unconfigured path and
    // exercise their deterministic fallbacks, never the network. Tests that
    // cover configured behavior opt in via vi.stubEnv + vi.resetModules.
    env: {
      LLM_API_URL: "",
      LLM_API_KEY: "",
      LLM_MODEL: "",
      LLM_JSON_SCHEMA: "",
      ZAI_API_KEY: "",
      PINECONE_API_KEY: "",
      CLOUDINARY_URL: "",
      CLOUDINARY_API_KEY: "",
      CLOUDINARY_API_SECRET: "",
      MAPBOX_TOKEN: "",
      BRAVE_SEARCH_API_KEY: "",
    },
  },
});
