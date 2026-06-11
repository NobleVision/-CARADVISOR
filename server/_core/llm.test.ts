import { afterEach, describe, expect, it, vi } from "vitest";

type CapturedRequest = { url: string; payload: Record<string, any>; headers: Record<string, string> };

/**
 * llm.ts reads ENV at import time → each scenario stubs env vars, installs a
 * capturing fetch mock, and imports a fresh module copy.
 */
async function loadLLM(vars: Record<string, string>, replyContent = '{"ok":true}') {
  vi.resetModules();
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);

  const captured: CapturedRequest[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    captured.push({
      url: String(url),
      payload: init?.body ? JSON.parse(String(init.body)) : {},
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    return {
      ok: true,
      json: async () => ({
        id: "test",
        created: 0,
        model: "test-model",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: replyContent },
            finish_reason: "stop",
          },
        ],
        object: "list",
        data: [],
      }),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);

  const mod = await import("./llm");
  return { mod, captured };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const SCHEMA = {
  type: "json_schema" as const,
  json_schema: { name: "test_shape", schema: { type: "object", properties: { ok: { type: "boolean" } } } },
};

describe("invokeLLM URL join", () => {
  it("appends /v1/chat/completions for bare OpenAI-style bases", async () => {
    const { mod, captured } = await loadLLM({
      LLM_API_URL: "https://api.openai.com",
      LLM_API_KEY: "sk-test",
    });
    await mod.invokeLLM({ messages: [{ role: "user", content: "hi" }] });
    expect(captured[0].url).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("appends only the resource for version-pinned bases (Z.AI), with trailing slashes trimmed", async () => {
    const { mod, captured } = await loadLLM({
      LLM_API_URL: "https://api.z.ai/api/paas/v4/",
      LLM_API_KEY: "sk-test",
    });
    await mod.invokeLLM({ messages: [{ role: "user", content: "hi" }] });
    expect(captured[0].url).toBe("https://api.z.ai/api/paas/v4/chat/completions");
  });
});

describe("Z.AI fallback path", () => {
  it("targets the GLM endpoint with the default model and the Z.AI key", async () => {
    const { mod, captured } = await loadLLM({ ZAI_API_KEY: "zai-test-key" });
    await mod.invokeLLM({ messages: [{ role: "user", content: "hi" }] });
    expect(captured[0].url).toBe("https://api.z.ai/api/paas/v4/chat/completions");
    expect(captured[0].payload.model).toBe("glm-4.5-flash");
    expect(captured[0].headers.authorization).toBe("Bearer zai-test-key");
  });

  it("downgrades json_schema to json_object with a schema instruction message", async () => {
    const { mod, captured } = await loadLLM({ ZAI_API_KEY: "zai-test-key" });
    await mod.invokeLLM({
      messages: [{ role: "user", content: "parse this" }],
      response_format: SCHEMA,
    });
    const payload = captured[0].payload;
    expect(payload.response_format).toEqual({ type: "json_object" });
    const last = payload.messages[payload.messages.length - 1];
    expect(last.role).toBe("system");
    expect(last.content).toContain("test_shape");
    expect(last.content).toContain("JSON");
    expect(last.content).toContain('"properties"');
  });

  it("strips a markdown fence from a downgraded JSON reply", async () => {
    const { mod } = await loadLLM(
      { ZAI_API_KEY: "zai-test-key" },
      '```json\n{"ok":true}\n```'
    );
    const result = await mod.invokeLLM({
      messages: [{ role: "user", content: "parse this" }],
      response_format: SCHEMA,
    });
    expect(result.choices[0].message.content).toBe('{"ok":true}');
  });
});

describe("schema-capable providers are untouched", () => {
  it("passes json_schema through verbatim and leaves replies unmodified", async () => {
    const fenced = '```json\n{"ok":true}\n```';
    const { mod, captured } = await loadLLM(
      { LLM_API_URL: "https://api.openai.com", LLM_API_KEY: "sk-test" },
      fenced
    );
    const result = await mod.invokeLLM({
      messages: [{ role: "user", content: "parse this" }],
      response_format: SCHEMA,
    });
    expect(captured[0].payload.response_format.type).toBe("json_schema");
    // No instruction message appended…
    expect(captured[0].payload.messages).toHaveLength(1);
    // …and no fence stripping applied.
    expect(result.choices[0].message.content).toBe(fenced);
  });
});

describe("listLLMModels URL join", () => {
  // One scenario per test: vi.stubEnv layers within a test, so a second
  // loadLLM would still see the first scenario's vars.
  it("uses /v1/models for bare bases", async () => {
    const { mod, captured } = await loadLLM({
      LLM_API_URL: "https://api.openai.com",
      LLM_API_KEY: "k",
    });
    await mod.listLLMModels();
    expect(captured[0].url).toBe("https://api.openai.com/v1/models");
  });

  it("uses /models for version-pinned bases (Z.AI)", async () => {
    const { mod, captured } = await loadLLM({ ZAI_API_KEY: "zai-test-key" });
    await mod.listLLMModels();
    expect(captured[0].url).toBe("https://api.z.ai/api/paas/v4/models");
  });
});
