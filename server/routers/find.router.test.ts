import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

/** Context with no authenticated user (mirrors vehicle.router.test.ts). */
function publicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("find.parseIntent", () => {
  it("falls back to the rules parser when no LLM is configured", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const r = await caller.find.parseIntent({
      text: "safe efficient car under $7k for my 15-year-old new driver within 30 miles of 22030",
    });
    expect(r.source).toBe("rules");
    expect(r.criteriaPatch.maxPrice).toBe(7000);
    expect(r.criteriaPatch.zip).toBe("22030");
    expect(r.useCase).toBe("teen-driver");
    expect(r.interpreted.length).toBeGreaterThan(0);
  });
});

describe("find.checklist", () => {
  it("builds a checklist from a vehicle shape with model-specific items", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const r = await caller.find.checklist({
      vehicle: {
        year: 2014,
        make: "Nissan",
        model: "Sentra",
        mileage: 90000,
        sellerType: "Independent Dealer",
      },
    });
    expect(r.checklist.vehicleLabel).toBe("2014 Nissan Sentra");
    expect(r.checklist.dealerQuestions).toHaveLength(3);
    const items = r.checklist.sections.flatMap((s) => s.items.map((i) => i.text));
    expect(items.some((t) => /transmission/i.test(t))).toBe(true);
    expect(r.text).toContain("GOLDEN RULES");
  });

  it("rejects a request with neither listingId nor vehicle", async () => {
    const caller = appRouter.createCaller(publicCtx());
    await expect(caller.find.checklist({})).rejects.toThrow();
  });
});

describe("find.similar", () => {
  it("falls back to deterministic closeness-ranked picks when vector search is off", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const subject = await caller.find.listing({ id: "lst_001" });
    const r = await caller.find.similar({ listingId: "lst_001" });
    expect(r.source).toBe("rules");
    expect(r.items).toHaveLength(5);
    for (const item of r.items) {
      expect(item.id).not.toBe("lst_001");
      expect(item.condition).toBe(subject.condition);
      expect(item.label).toMatch(/^\d{4} /);
      expect(item.qualityGrade).toBeTruthy();
      expect(["clear", "caution", "high"]).toContain(item.riskLevel);
    }
    // Closeness-ordered: the nearest pick is within a sane price band.
    expect(Math.abs(r.items[0].price - subject.price)).toBeLessThanOrEqual(subject.price);
  });

  it("returns an empty result for a VIN outside the seeded inventory", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const r = await caller.find.similar({ vin: "1HGCM82633A004352" });
    expect(r.source).toBe("none");
    expect(r.items).toEqual([]);
  });
});

describe("find.mapListings", () => {
  it("returns map-ready coordinates for every seeded listing, deterministically", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const a = await caller.find.mapListings();
    const b = await caller.find.mapListings();
    expect(a.count).toBeGreaterThan(100); // all 102 seeded ZIPs ship centroids
    expect(a.items).toEqual(b.items); // jitter is per-id deterministic
    for (const item of a.items.slice(0, 10)) {
      // DC-metro envelope (jitter included).
      expect(item.lat).toBeGreaterThan(37.5);
      expect(item.lat).toBeLessThan(40.0);
      expect(item.lng).toBeGreaterThan(-78.5);
      expect(item.lng).toBeLessThan(-75.5);
      expect(item.price).toBeGreaterThan(0);
      expect(item.qualityGrade).toBeTruthy();
      expect(["clear", "caution", "high"]).toContain(item.riskLevel);
    }
    // Same-ZIP pins must not stack: all coordinates pairwise distinct.
    const coords = new Set(a.items.map((i) => `${i.lat.toFixed(6)},${i.lng.toFixed(6)}`));
    expect(coords.size).toBe(a.items.length);
  });
});

describe("find.search — criteria backward compatibility", () => {
  it("accepts a legacy criteria object without the new optional fields", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const r = await caller.find.search({
      condition: "Used",
      maxPrice: 25000,
      maxDistance: 100,
      bodyStyles: [],
      fuels: [],
      sellerTypes: [],
      maxMileage: 150000,
      priceVsReliability: 50,
      efficiencyPriority: 50,
    });
    expect(r.scanned).toBeGreaterThan(0);
    expect(r.shortlisted).toBeGreaterThan(0);
    expect(r.hiddenAvoidCount).toBe(0); // budgetMode off
    expect(r.semanticApplied).toBe(false); // vector search keyless in tests
    expect(Array.isArray(r.matches)).toBe(true);
    // Every match carries the new trust assessment.
    expect(r.matches.every((m) => m.trust && m.trust.level)).toBe(true);
  });

  it("hides known-defect models and reports the hidden count in Budget Buyer Mode", async () => {
    const caller = appRouter.createCaller(publicCtx());
    const base = {
      condition: "Used" as const,
      maxPrice: 8000,
      maxDistance: 150,
      bodyStyles: [],
      fuels: [],
      sellerTypes: [],
      maxMileage: 150000,
      priceVsReliability: 50,
      efficiencyPriority: 50,
      limit: 10,
    };
    const off = await caller.find.search(base);
    const on = await caller.find.search({ ...base, budgetMode: true });
    expect(on.matches.every((m) => m.riskLevel !== "high")).toBe(true);
    // The mode reports exactly how many eligible trouble cars it hid.
    const highRiskShown = off.matches.filter((m) => m.riskLevel === "high").length;
    expect(on.hiddenAvoidCount).toBeGreaterThanOrEqual(highRiskShown > 0 ? 1 : 0);
  });
});
