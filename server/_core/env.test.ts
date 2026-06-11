import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * ENV is resolved at import time, so each scenario stubs process.env and
 * re-imports a fresh module copy. The vitest `test.env` guard blanks every
 * service variable globally; these stubs layer the scenario on top.
 */
async function loadEnv(vars: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);
  return await import("./env");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("ENV LLM resolution", () => {
  it("is fully unconfigured when no LLM or Z.AI vars are set", async () => {
    const { ENV, SERVICES } = await loadEnv({});
    expect(ENV.llmApiUrl).toBe("");
    expect(ENV.llmApiKey).toBe("");
    expect(ENV.llmModel).toBe("");
    expect(ENV.llmJsonSchemaSupported).toBe(true);
    expect(SERVICES.ai).toBe(false);
  });

  it("falls back to Z.AI when only ZAI_API_KEY is set", async () => {
    const { ENV, SERVICES } = await loadEnv({ ZAI_API_KEY: "zai-test-key" });
    expect(ENV.llmApiUrl).toBe("https://api.z.ai/api/paas/v4");
    expect(ENV.llmApiKey).toBe("zai-test-key");
    expect(ENV.llmModel).toBe("glm-4.5-flash");
    expect(ENV.llmJsonSchemaSupported).toBe(false);
    expect(SERVICES.ai).toBe(true);
  });

  it("lets an explicit LLM_MODEL override the Z.AI default model", async () => {
    const { ENV } = await loadEnv({ ZAI_API_KEY: "zai-test-key", LLM_MODEL: "glm-5.1" });
    expect(ENV.llmModel).toBe("glm-5.1");
    expect(ENV.llmApiUrl).toBe("https://api.z.ai/api/paas/v4");
  });

  it("prefers an explicit custom endpoint over the Z.AI fallback", async () => {
    const { ENV } = await loadEnv({
      LLM_API_URL: "https://api.openai.com",
      LLM_API_KEY: "sk-custom",
      LLM_MODEL: "gpt-4o-mini",
      ZAI_API_KEY: "zai-test-key",
    });
    expect(ENV.llmApiUrl).toBe("https://api.openai.com");
    expect(ENV.llmApiKey).toBe("sk-custom");
    expect(ENV.llmModel).toBe("gpt-4o-mini");
    expect(ENV.llmJsonSchemaSupported).toBe(true);
  });

  it("never mixes the Z.AI key into a partially-configured custom endpoint", async () => {
    // URL set but key missing: misconfiguration should surface, not silently
    // send the Z.AI credential to a custom host.
    const { ENV, SERVICES } = await loadEnv({
      LLM_API_URL: "https://llm.example.com",
      ZAI_API_KEY: "zai-test-key",
    });
    expect(ENV.llmApiKey).toBe("");
    expect(SERVICES.ai).toBe(false);
  });

  it("allows forcing native json_schema on the Z.AI path", async () => {
    const { ENV } = await loadEnv({ ZAI_API_KEY: "zai-test-key", LLM_JSON_SCHEMA: "on" });
    expect(ENV.llmJsonSchemaSupported).toBe(true);
  });
});

describe("SERVICES flags", () => {
  it("reports every optional service off by default", async () => {
    const { SERVICES } = await loadEnv({});
    expect(SERVICES).toEqual({
      ai: false,
      vector: false,
      images: false,
      map: false,
      websearch: false,
    });
  });

  it("flips each flag on with its key", async () => {
    const { SERVICES } = await loadEnv({
      PINECONE_API_KEY: "pc-test",
      CLOUDINARY_URL: "cloudinary://k:s@demo-cloud",
      MAPBOX_TOKEN: "pk.test",
      BRAVE_SEARCH_API_KEY: "brave-test",
    });
    expect(SERVICES.vector).toBe(true);
    expect(SERVICES.images).toBe(true);
    expect(SERVICES.map).toBe(true);
    expect(SERVICES.websearch).toBe(true);
    expect(SERVICES.ai).toBe(false);
  });
});
