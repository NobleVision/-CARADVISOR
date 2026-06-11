import { afterEach, describe, expect, it, vi } from "vitest";

/** brave.ts reads ENV at import time → fresh module per scenario. */
async function loadBrave(vars: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);
  return await import("./brave");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const BRAVE_RESPONSE = {
  web: {
    results: [
      {
        title: "Used <strong>Mazda3</strong> for Sale",
        url: "https://www.cars.com/shopping/mazda-mazda3/",
        description: "Shop <strong>Mazda3</strong> listings near you.",
        age: "2 days ago",
        profile: { name: "Cars.com" },
        thumbnail: { src: "https://imgs.search.brave.com/x.jpg" },
      },
      {
        title: "Mazda3 buyer's guide",
        url: "https://example.com/guide",
        description: "What to know.",
      },
    ],
  },
};

function okResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

describe("braveSearch", () => {
  it("returns null and never fetches when unconfigured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadBrave({});
    expect(mod.braveConfigured()).toBe(false);
    expect(await mod.braveSearch("used cars")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the subscription token header and parses/strips results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(BRAVE_RESPONSE));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadBrave({ BRAVE_SEARCH_API_KEY: "brave-test" });
    const results = await mod.braveSearch("used mazda3", { count: 10 });
    expect(results).toHaveLength(2);
    expect(results![0]).toMatchObject({
      title: "Used Mazda3 for Sale", // tags stripped
      url: "https://www.cars.com/shopping/mazda-mazda3/",
      description: "Shop Mazda3 listings near you.",
      siteName: "Cars.com",
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("api.search.brave.com/res/v1/web/search");
    expect(url).toContain("q=used+mazda3");
    expect((init.headers as Record<string, string>)["x-subscription-token"]).toBe("brave-test");
  });

  it("caches successful searches for repeat queries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(BRAVE_RESPONSE));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadBrave({ BRAVE_SEARCH_API_KEY: "brave-test" });
    await mod.braveSearch("used mazda3");
    await mod.braveSearch("USED Mazda3 "); // same normalized key
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null on 429 and does not cache the failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 } as Response)
      .mockResolvedValueOnce(okResponse(BRAVE_RESPONSE));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadBrave({ BRAVE_SEARCH_API_KEY: "brave-test" });
    mod._resetBraveCache();
    expect(await mod.braveSearch("query")).toBeNull();
    expect(await mod.braveSearch("query")).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("spaces request starts by at least ~1.1s (rate-limit throttle)", async () => {
    vi.useFakeTimers();
    const starts: number[] = [];
    const fetchMock = vi.fn().mockImplementation(async () => {
      starts.push(Date.now());
      return okResponse(BRAVE_RESPONSE);
    });
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadBrave({ BRAVE_SEARCH_API_KEY: "brave-test" });
    const both = Promise.all([mod.braveSearch("query one"), mod.braveSearch("query two")]);
    await vi.advanceTimersByTimeAsync(3000);
    await both;
    expect(starts).toHaveLength(2);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(1100);
    vi.useRealTimers();
  });
});
