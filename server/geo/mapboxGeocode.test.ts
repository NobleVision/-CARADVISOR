import { afterEach, describe, expect, it, vi } from "vitest";

/** mapboxGeocode reads ENV at import time → fresh module per scenario. */
async function loadGeo(vars: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);
  return await import("./mapboxGeocode");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const FEATURE_RESPONSE = {
  features: [{ geometry: { coordinates: [-77.47, 38.301] } }],
};

function okResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

describe("geocodeZip", () => {
  it("returns null and never fetches when MAPBOX_TOKEN is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadGeo({});
    expect(mod.geoConfigured()).toBe(false);
    expect(await mod.geocodeZip("22401")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses Mapbox v6 [lng, lat] coordinates into {lat, lng}", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(FEATURE_RESPONSE));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadGeo({ MAPBOX_TOKEN: "pk.test" });
    const point = await mod.geocodeZip("22401");
    expect(point).toEqual({ lat: 38.301, lng: -77.47 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("search/geocode/v6/forward");
    expect(url).toContain("q=22401");
    expect(url).toContain("types=postcode");
    expect(url).toContain("country=us");
  });

  it("rejects non-ZIP input without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadGeo({ MAPBOX_TOKEN: "pk.test" });
    expect(await mod.geocodeZip("abcde")).toBeNull();
    expect(await mod.geocodeZip("1234")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caches successful lookups", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(FEATURE_RESPONSE));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadGeo({ MAPBOX_TOKEN: "pk.test" });
    await mod.geocodeZip("22401");
    await mod.geocodeZip("22401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures (non-200 then success)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 } as Response)
      .mockResolvedValueOnce(okResponse(FEATURE_RESPONSE));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadGeo({ MAPBOX_TOKEN: "pk.test" });
    expect(await mod.geocodeZip("22401")).toBeNull();
    expect(await mod.geocodeZip("22401")).toEqual({ lat: 38.301, lng: -77.47 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null on malformed feature payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ features: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const mod = await loadGeo({ MAPBOX_TOKEN: "pk.test" });
    expect(await mod.geocodeZip("22401")).toBeNull();
  });
});
