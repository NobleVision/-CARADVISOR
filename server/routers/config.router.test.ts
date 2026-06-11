import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

/** Context with no authenticated user (mirrors find.router.test.ts). */
function publicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

/** ENV resolves at import time → stub env, then import a fresh appRouter. */
async function freshCaller(vars: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);
  const { appRouter } = await import("../routers");
  return appRouter.createCaller(publicCtx());
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("config.public", () => {
  it("reports all services off and no token when unconfigured", async () => {
    const caller = await freshCaller({});
    const r = await caller.config.public();
    expect(r.mapboxToken).toBeNull();
    expect(r.services).toEqual({
      ai: false,
      vector: false,
      images: false,
      map: false,
      websearch: false,
    });
  });

  it("exposes the Mapbox public token and service flags — and nothing else", async () => {
    const caller = await freshCaller({
      MAPBOX_TOKEN: "pk.public-token",
      ZAI_API_KEY: "zai-secret",
      PINECONE_API_KEY: "pc-secret",
      BRAVE_SEARCH_API_KEY: "brave-secret",
    });
    const r = await caller.config.public();
    expect(r.mapboxToken).toBe("pk.public-token");
    expect(r.services.ai).toBe(true);
    expect(r.services.vector).toBe(true);
    expect(r.services.websearch).toBe(true);
    expect(r.services.images).toBe(false);
    // The response must never carry secrets — only the public pk token.
    const serialized = JSON.stringify(r);
    expect(serialized).not.toContain("zai-secret");
    expect(serialized).not.toContain("pc-secret");
    expect(serialized).not.toContain("brave-secret");
    expect(Object.keys(r).sort()).toEqual(["mapboxToken", "services"]);
  });
});
