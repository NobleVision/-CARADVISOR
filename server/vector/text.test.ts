import { describe, expect, it } from "vitest";
import { KNOWLEDGE_ENTRIES } from "../knowledge/data";
import type { Listing } from "../inventory/types";
import type { VehicleAdvisory } from "../knowledge/types";
import { buildKnowledgeText, buildListingText } from "./text";

const LISTING: Listing = {
  id: "lst_test",
  vin: "TESTVIN0000000001",
  condition: "Used",
  year: 2014,
  make: "Mazda",
  model: "Mazda3",
  trim: "i Touring",
  bodyStyle: "Hatchback",
  fuel: "Gas",
  price: 9400,
  mileage: 78000,
  mpg: 33,
  exteriorColor: "Soul Red",
  sellerType: "Independent Dealer",
  dealerName: "Beltway Auto",
  city: "Fairfax",
  state: "VA",
  distanceMiles: 12,
  zip: "22030",
  photos: [],
  dealerBlurb: "One owner, clean title.",
};

describe("buildListingText", () => {
  it("packs the buyer-relevant facts into one text", () => {
    const text = buildListingText(LISTING, []);
    expect(text).toContain("2014 Mazda Mazda3 i Touring");
    expect(text).toContain("used hatchback");
    expect(text).toContain("$9,400");
    expect(text).toContain("78,000 miles");
    expect(text).toContain("independent dealer Beltway Auto in Fairfax, VA");
    expect(text).toContain("One owner, clean title.");
  });

  it("verbalizes advisories by severity", () => {
    const advisories = [
      { severity: "avoid", title: "CVT failures", detail: "x", source: "s" },
      { severity: "value-pick", title: "Proven platform", detail: "x", source: "s" },
    ] as unknown as VehicleAdvisory[];
    const text = buildListingText(LISTING, advisories);
    expect(text).toContain("known defect, avoid: CVT failures");
    expect(text).toContain("proven value pick: Proven platform");
  });

  it("describes EVs in MPGe and new cars without odometer miles", () => {
    const ev: Listing = { ...LISTING, fuel: "EV", mpg: 120, condition: "New", mileage: 12 };
    const text = buildListingText(ev, []);
    expect(text).toContain("electric 120 MPGe");
    expect(text).toContain("new, delivery miles");
    expect(text).not.toContain("12 miles");
  });

  it("builds non-empty text for every curated knowledge entry", () => {
    for (const entry of KNOWLEDGE_ENTRIES) {
      const text = buildKnowledgeText(entry);
      expect(text.length).toBeGreaterThan(40);
      expect(text).toContain(entry.make);
      expect(text).toContain(String(entry.yearFrom));
    }
  });
});

describe("buildKnowledgeText", () => {
  it("leads with the model-years and the severity verdict", () => {
    const entry = KNOWLEDGE_ENTRIES.find((e) => e.severity === "avoid")!;
    const text = buildKnowledgeText(entry);
    expect(text).toContain(`${entry.make} ${entry.models[0]} ${entry.yearFrom}-${entry.yearTo}`);
    expect(text).toContain("Known defect — avoid");
    expect(text).toContain(entry.title);
  });
});
