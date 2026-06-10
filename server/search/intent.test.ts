import { describe, expect, it } from "vitest";
import { parseIntentDeterministic, parseSearchIntent } from "./intent";

// LLM env vars are unset under vitest, so parseSearchIntent always exercises
// the deterministic fallback here — exactly the no-LLM production path.

describe("parseIntentDeterministic — money", () => {
  it("parses '$7k' as $7,000", () => {
    const r = parseIntentDeterministic("I want a car for $7k");
    expect(r.criteriaPatch.maxPrice).toBe(7000);
  });

  it("parses 'under 8000' as $8,000", () => {
    const r = parseIntentDeterministic("something reliable under 8000");
    expect(r.criteriaPatch.maxPrice).toBe(8000);
  });

  it("parses 'under $8,500' with separators", () => {
    const r = parseIntentDeterministic("under $8,500 please");
    expect(r.criteriaPatch.maxPrice).toBe(8500);
  });
});

describe("parseIntentDeterministic — location & distance", () => {
  it("extracts 'within 30 miles' and a ZIP after 'of' without confusing the two", () => {
    const r = parseIntentDeterministic("within 30 miles of 22030");
    expect(r.criteriaPatch.maxDistance).toBe(30);
    expect(r.criteriaPatch.zip).toBe("22030");
    expect(r.criteriaPatch.maxPrice).toBeUndefined(); // 22030 must not read as a price
  });

  it("keeps a mileage cap separate from price and distance", () => {
    const r = parseIntentDeterministic("under 100k miles and under $9k");
    expect(r.criteriaPatch.maxMileage).toBe(100000);
    expect(r.criteriaPatch.maxPrice).toBe(9000);
  });
});

describe("parseIntentDeterministic — categorical filters", () => {
  it("maps body style and fuel keywords", () => {
    const r = parseIntentDeterministic("a hybrid SUV or hatchback");
    expect(r.criteriaPatch.bodyStyles).toEqual(expect.arrayContaining(["SUV", "Hatchback"]));
    expect(r.criteriaPatch.fuels).toEqual(["Hybrid"]);
  });

  it("maps private-seller wording", () => {
    const r = parseIntentDeterministic("buying from a private seller");
    expect(r.criteriaPatch.sellerTypes).toEqual(["Private Seller"]);
  });

  it("extracts preferred makes including aliases", () => {
    const r = parseIntentDeterministic("prefer Mazda or Honda, maybe a Chevy");
    expect(r.criteriaPatch.makes).toEqual(expect.arrayContaining(["Mazda", "Honda", "Chevrolet"]));
  });

  it("treats 'new driver' as a use case, not a new-car condition", () => {
    const r = parseIntentDeterministic("a used car for my new driver");
    expect(r.useCase).toBe("teen-driver");
    expect(r.criteriaPatch.condition).toBe("Used");
  });
});

describe("parseIntentDeterministic — the kitchen-sink brief", () => {
  it("parses the full teen-driver sentence end to end", () => {
    const r = parseIntentDeterministic(
      "I want a safe, efficient car under $7k for my 15-year-old new driver with good cargo space within 30 miles of 22030, prefer Mazda or Honda",
    );
    expect(r.criteriaPatch.maxPrice).toBe(7000);
    expect(r.criteriaPatch.maxDistance).toBe(30);
    expect(r.criteriaPatch.zip).toBe("22030");
    expect(r.useCase).toBe("teen-driver");
    expect(r.criteriaPatch.priceVsReliability).toBeGreaterThanOrEqual(70);
    expect(r.criteriaPatch.efficiencyPriority).toBeGreaterThanOrEqual(70);
    expect(r.criteriaPatch.budgetMode).toBe(true); // ≤ $10k engages the golden rules
    expect(r.criteriaPatch.makes).toEqual(expect.arrayContaining(["Mazda", "Honda"]));
    expect(r.interpreted.length).toBeGreaterThanOrEqual(5);
    expect(r.source).toBe("rules");
  });
});

describe("parseIntentDeterministic — graceful emptiness", () => {
  it("returns an empty patch for unparseable text", () => {
    const r = parseIntentDeterministic("hello there, lovely weather today");
    expect(Object.keys(r.criteriaPatch)).toHaveLength(0);
    expect(r.useCase).toBeUndefined();
  });
});

describe("parseSearchIntent — fallback wiring", () => {
  it("falls back to the rules parser when no LLM is configured", async () => {
    const r = await parseSearchIntent("reliable sedan under $6k");
    expect(r.source).toBe("rules");
    expect(r.criteriaPatch.maxPrice).toBe(6000);
    expect(r.criteriaPatch.bodyStyles).toEqual(["Sedan"]);
  });

  it("returns an empty result for blank input", async () => {
    const r = await parseSearchIntent("   ");
    expect(r.criteriaPatch).toEqual({});
    expect(r.interpreted).toEqual([]);
  });
});
