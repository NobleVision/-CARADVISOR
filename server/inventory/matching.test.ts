import { describe, expect, it } from "vitest";
import {
  passesHardFilters,
  rankInventory,
  reliabilityForMake,
  scoreListingFit,
  qualityScoreForListing,
} from "./matching";
import type { BuyerCriteria, Listing } from "./types";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "lst_test",
    vin: "1HGCM82633A004352",
    condition: "Used",
    year: 2018,
    make: "Toyota",
    model: "Camry",
    trim: "LE",
    bodyStyle: "Sedan",
    fuel: "Gas",
    price: 15000,
    mileage: 60000,
    mpg: 32,
    exteriorColor: "Silver",
    sellerType: "Franchise Dealer",
    dealerName: "Test Motors",
    city: "Fairfax",
    state: "VA",
    distanceMiles: 12,
    zip: "22030",
    photos: [],
    dealerBlurb: "Clean.",
    regionFlags: [],
    ...overrides,
  };
}

function baseCriteria(overrides: Partial<BuyerCriteria> = {}): BuyerCriteria {
  return {
    condition: "Any",
    maxPrice: 20000,
    maxDistance: 25,
    bodyStyles: [],
    fuels: [],
    sellerTypes: [],
    maxMileage: 100000,
    priceVsReliability: 50,
    efficiencyPriority: 50,
    ...overrides,
  };
}

describe("reliabilityForMake", () => {
  it("rates Toyota/Lexus very high", () => {
    expect(reliabilityForMake("Toyota")).toBeGreaterThanOrEqual(90);
    expect(reliabilityForMake("LEXUS")).toBeGreaterThanOrEqual(90);
  });
  it("rates Land Rover lower than Toyota", () => {
    expect(reliabilityForMake("Land Rover")).toBeLessThan(reliabilityForMake("Toyota"));
  });
  it("falls back to a default for unknown makes", () => {
    expect(reliabilityForMake("Wuling")).toBe(75);
  });
});

describe("passesHardFilters", () => {
  it("rejects over-budget cars", () => {
    expect(passesHardFilters(makeListing({ price: 25000 }), baseCriteria())).toBe(false);
  });
  it("rejects too-far cars", () => {
    expect(passesHardFilters(makeListing({ distanceMiles: 40 }), baseCriteria())).toBe(false);
  });
  it("rejects too-high mileage (used)", () => {
    expect(passesHardFilters(makeListing({ mileage: 120000 }), baseCriteria())).toBe(false);
  });
  it("does NOT gate a new car on mileage", () => {
    const newCar = makeListing({ condition: "New", mileage: 5, price: 19000 });
    expect(passesHardFilters(newCar, baseCriteria({ maxMileage: 10 }))).toBe(true);
  });
  it("respects condition filter (New only)", () => {
    const c = baseCriteria({ condition: "New" });
    expect(passesHardFilters(makeListing({ condition: "Used" }), c)).toBe(false);
    expect(passesHardFilters(makeListing({ condition: "New", mileage: 8 }), c)).toBe(true);
  });
  it("respects body-style filter", () => {
    const c = baseCriteria({ bodyStyles: ["SUV"] });
    expect(passesHardFilters(makeListing({ bodyStyle: "Sedan" }), c)).toBe(false);
    expect(passesHardFilters(makeListing({ bodyStyle: "SUV" }), c)).toBe(true);
  });
  it("respects fuel filter", () => {
    const c = baseCriteria({ fuels: ["EV"] });
    expect(passesHardFilters(makeListing({ fuel: "Gas" }), c)).toBe(false);
    expect(passesHardFilters(makeListing({ fuel: "EV" }), c)).toBe(true);
  });
  it("respects seller-type filter", () => {
    const c = baseCriteria({ sellerTypes: ["Private Seller"] });
    expect(passesHardFilters(makeListing({ sellerType: "Franchise Dealer" }), c)).toBe(false);
    expect(passesHardFilters(makeListing({ sellerType: "Private Seller" }), c)).toBe(true);
  });
  it("accepts a fully-compliant car", () => {
    expect(passesHardFilters(makeListing(), baseCriteria())).toBe(true);
  });
});

describe("scoreListingFit", () => {
  it("produces a 0-100 matchScore and fit breakdown", () => {
    const m = scoreListingFit(makeListing(), baseCriteria());
    expect(m.matchScore).toBeGreaterThanOrEqual(0);
    expect(m.matchScore).toBeLessThanOrEqual(100);
    for (const v of Object.values(m.fit)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("weights reliability higher when the buyer prioritizes it", () => {
    const reliable = makeListing({ make: "Toyota", price: 16000 });
    const cheapRisky = makeListing({ make: "Land Rover", price: 9000 });

    const priceFirst = baseCriteria({ priceVsReliability: 0 });
    const reliabilityFirst = baseCriteria({ priceVsReliability: 100 });

    const reliableGain =
      scoreListingFit(reliable, reliabilityFirst).matchScore -
      scoreListingFit(reliable, priceFirst).matchScore;
    const riskyGain =
      scoreListingFit(cheapRisky, reliabilityFirst).matchScore -
      scoreListingFit(cheapRisky, priceFirst).matchScore;

    expect(reliableGain).toBeGreaterThan(riskyGain);
  });

  it("rewards EVs on the efficiency dimension", () => {
    const ev = scoreListingFit(makeListing({ fuel: "EV", mpg: 120 }), baseCriteria());
    const gas = scoreListingFit(makeListing({ fuel: "Gas", mpg: 22 }), baseCriteria());
    expect(ev.fit.efficiency).toBeGreaterThan(gas.fit.efficiency);
  });
});

describe("qualityScoreForListing", () => {
  it("scores a low-mileage reliable car higher than a high-mileage risky one", () => {
    const good = qualityScoreForListing(makeListing({ make: "Toyota", year: 2020, mileage: 30000 }));
    const bad = qualityScoreForListing(makeListing({ make: "Chrysler", year: 2012, mileage: 140000 }));
    expect(good.score).toBeGreaterThan(bad.score);
    expect(good.grade).toBeTruthy();
  });
});

describe("rankInventory", () => {
  const inventory: Listing[] = [
    makeListing({ id: "a", make: "Toyota", price: 16000, mileage: 40000, distanceMiles: 10 }),
    makeListing({ id: "b", make: "Land Rover", price: 9000, mileage: 95000, distanceMiles: 20 }),
    makeListing({ id: "c", make: "Honda", price: 14000, mileage: 55000, distanceMiles: 8 }),
    makeListing({ id: "d", make: "Ford", price: 30000, mileage: 20000, distanceMiles: 5 }), // over budget
    makeListing({ id: "e", make: "Kia", price: 11000, mileage: 70000, distanceMiles: 30 }), // too far
  ];

  it("filters out ineligible cars and limits the result", () => {
    const ranked = rankInventory(inventory, baseCriteria(), 3);
    expect(ranked.length).toBe(3);
    const ids = ranked.map((r) => r.listing.id);
    expect(ids).not.toContain("d");
    expect(ids).not.toContain("e");
  });

  it("returns matches sorted by descending matchScore", () => {
    const ranked = rankInventory(inventory, baseCriteria(), 5);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].matchScore).toBeGreaterThanOrEqual(ranked[i].matchScore);
    }
  });

  it("ranks the reliable Toyota above the risky Land Rover when reliability is prioritized", () => {
    const ranked = rankInventory(inventory, baseCriteria({ priceVsReliability: 100 }), 5);
    const toyota = ranked.findIndex((r) => r.listing.id === "a");
    const rover = ranked.findIndex((r) => r.listing.id === "b");
    expect(toyota).toBeLessThan(rover);
  });

  it("returns only new cars when condition=New", () => {
    const mixed: Listing[] = [
      makeListing({ id: "n1", condition: "New", mileage: 6, price: 19000 }),
      makeListing({ id: "u1", condition: "Used", mileage: 50000, price: 15000 }),
    ];
    const ranked = rankInventory(mixed, baseCriteria({ condition: "New" }), 5);
    expect(ranked.every((r) => r.listing.condition === "New")).toBe(true);
    expect(ranked.map((r) => r.listing.id)).toContain("n1");
    expect(ranked.map((r) => r.listing.id)).not.toContain("u1");
  });
});

// ─── GOGETTER Reliability Index integration ───────────────────────────────

/** A classic trap car: CVT-era Nissan Sentra, suspiciously cheap for its mileage. */
function trapListing(overrides: Partial<Listing> = {}): Listing {
  return makeListing({
    id: "trap",
    make: "Nissan",
    model: "Sentra",
    year: 2015,
    price: 5500,
    mileage: 90000,
    ...overrides,
  });
}

/** A curated value pick: SkyActiv-era Mazda3. */
function valuePickListing(overrides: Partial<Listing> = {}): Listing {
  return makeListing({
    id: "pick",
    make: "Mazda",
    model: "Mazda3",
    year: 2013,
    price: 6200,
    mileage: 95000,
    ...overrides,
  });
}

describe("scoreListingFit — knowledge advisories", () => {
  it("flags a known-defect model with high risk and a hammered reliability fit", () => {
    const m = scoreListingFit(trapListing(), baseCriteria());
    expect(m.riskLevel).toBe("high");
    expect(m.advisories?.some((a) => a.id === "nissan-jatco-cvt")).toBe(true);
    expect(m.fit.reliability).toBeLessThanOrEqual(40);
    expect(m.reasons.some((r) => r.startsWith("Known issue:"))).toBe(true);
    expect(m.qualityGrade).toMatch(/^(D|F)$/); // catastrophic defect caps quality at D
  });

  it("leads with the value-pick reason and keeps risk clear for curated picks", () => {
    const m = scoreListingFit(valuePickListing(), baseCriteria());
    expect(m.riskLevel).toBe("clear");
    expect(m.reasons[0]).toContain("GOGETTER value pick");
    expect(m.fit.reliability).toBeGreaterThanOrEqual(95);
  });

  it("attaches no advisories to ordinary cars", () => {
    const m = scoreListingFit(makeListing(), baseCriteria());
    expect(m.advisories).toBeUndefined();
    expect(m.riskLevel).toBeUndefined();
  });
});

describe("trust signals", () => {
  it("flags a trap car as a suspicious deal", () => {
    const m = scoreListingFit(trapListing(), baseCriteria());
    expect(m.trust?.level).toBe("flagged");
    expect(m.trust?.suspiciousDeal).toBe(true);
  });

  it("marks a well-evidenced franchise listing as approved", () => {
    const m = scoreListingFit(
      makeListing({
        sellerType: "Franchise Dealer",
        sellerTenure: "Certified Pre-Owned available",
        photos: [{ url: "x", source: "dealer" }],
      }),
      baseCriteria(),
    );
    expect(m.trust?.level).toBe("approved");
    expect(m.trust?.reasons.length).toBeGreaterThan(0);
  });
});

describe("Budget Buyer Mode", () => {
  const budgetInventory: Listing[] = [
    trapListing(),
    valuePickListing(),
    makeListing({ id: "neutral", make: "Hyundai", model: "Sonata", year: 2013, price: 6000, mileage: 98000 }),
  ];

  it("includes the trap car in the baseline shortlist (transparency without the mode)", () => {
    const ranked = rankInventory(budgetInventory, baseCriteria(), 5);
    expect(ranked.map((r) => r.listing.id)).toContain("trap");
  });

  it("excludes known-defect models from the shortlist when enabled", () => {
    const ranked = rankInventory(budgetInventory, baseCriteria({ budgetMode: true }), 5);
    const ids = ranked.map((r) => r.listing.id);
    expect(ids).not.toContain("trap");
    expect(ids).toContain("pick");
  });

  it("ranks the curated value pick above a comparable neutral car when enabled", () => {
    const ranked = rankInventory(budgetInventory, baseCriteria({ budgetMode: true }), 5);
    const pick = ranked.findIndex((r) => r.listing.id === "pick");
    const neutral = ranked.findIndex((r) => r.listing.id === "neutral");
    expect(pick).toBeGreaterThanOrEqual(0);
    expect(pick).toBeLessThan(neutral);
  });

  it("filters by preferred makes when provided and ignores the filter when absent", () => {
    expect(passesHardFilters(makeListing({ make: "Toyota" }), baseCriteria({ makes: ["Mazda", "Honda"] }))).toBe(false);
    expect(passesHardFilters(makeListing({ make: "Honda" }), baseCriteria({ makes: ["Mazda", "Honda"] }))).toBe(true);
    expect(passesHardFilters(makeListing({ make: "Toyota" }), baseCriteria({ makes: [] }))).toBe(true);
    expect(passesHardFilters(makeListing({ make: "Toyota" }), baseCriteria())).toBe(true);
  });

  it("ranks a legacy criteria object (no new fields) identically to before", () => {
    const legacy = baseCriteria(); // no budgetMode/makes/searchText/useCase keys
    const ranked = rankInventory(budgetInventory, legacy, 5);
    expect(ranked.length).toBe(3);
    expect(ranked.map((r) => r.listing.id)).toContain("trap");
  });
});
