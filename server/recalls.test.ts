import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRecallCache, fetchRecalls } from "./recalls";

function okResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

describe("fetchRecalls", () => {
  beforeEach(() => {
    _resetRecallCache();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses NHTSA-cased results and passes the right query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({
        Count: 2,
        results: [
          { Component: "POWER TRAIN", Summary: "CVT may fail.", Remedy: "Dealer replaces unit.", NHTSACampaignNumber: "14V123000" },
          { Component: "AIR BAGS", Summary: "Inflator rupture." },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRecalls("Nissan", "Sentra", 2014);
    expect(result?.count).toBe(2);
    expect(result?.recalls[0]).toMatchObject({
      component: "POWER TRAIN",
      summary: "CVT may fail.",
      remedy: "Dealer replaces unit.",
      campaignNumber: "14V123000",
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("make=Nissan");
    expect(url).toContain("model=Sentra");
    expect(url).toContain("modelYear=2014");
  });

  it("tolerates alternate casing in the response shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse({ count: 1, Results: [{ component: "BRAKES", summary: "Soft pedal." }] }),
      ),
    );
    const result = await fetchRecalls("Honda", "Fit", "2011");
    expect(result?.count).toBe(1);
    expect(result?.recalls[0].component).toBe("BRAKES");
  });

  it("returns null on a non-OK HTTP status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) } as Response));
    expect(await fetchRecalls("Honda", "Fit", 2011)).toBeNull();
  });

  it("returns null when fetch throws (network/timeout)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("aborted")));
    expect(await fetchRecalls("Honda", "Fit", 2011)).toBeNull();
  });

  it("returns null for invalid inputs without calling the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchRecalls("", "Fit", 2011)).toBeNull();
    expect(await fetchRecalls("Honda", "Fit", "20xx")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caches successful lookups but never caches failures", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("flaky"))
      .mockResolvedValue(okResponse({ Count: 0, results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchRecalls("Mazda", "Mazda3", 2013)).toBeNull(); // failure → not cached
    const second = await fetchRecalls("Mazda", "Mazda3", 2013); // retried → cached
    const third = await fetchRecalls("Mazda", "Mazda3", 2013); // served from cache
    expect(second?.count).toBe(0);
    expect(third?.count).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
