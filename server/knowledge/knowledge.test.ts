import { describe, expect, it } from "vitest";
import {
  findAdvisories,
  hasAvoidAdvisory,
  normalizeModelKey,
  riskLevelFor,
  valuePickEntries,
} from "./lookup";

describe("normalizeModelKey", () => {
  it("collapses spacing, case, and punctuation variants", () => {
    expect(normalizeModelKey("Mazda 3")).toBe("MAZDA3");
    expect(normalizeModelKey("MAZDA3")).toBe("MAZDA3");
    expect(normalizeModelKey("xB")).toBe("XB");
  });
});

describe("findAdvisories — matching", () => {
  it("matches all naming variants of the same model", () => {
    for (const model of ["Mazda3", "Mazda 3", "MAZDA3"]) {
      const found = findAdvisories({ make: "Mazda", model, year: 2013 });
      expect(found.map((a) => a.id)).toContain("mazda3-skyactiv");
    }
  });

  it("matches a model carrying a trim suffix (one-direction startsWith)", () => {
    const found = findAdvisories({ make: "Ford", model: "Focus SE", year: 2014 });
    expect(found.map((a) => a.id)).toContain("ford-focus-powershift");
  });

  it("never leaks across makes", () => {
    expect(findAdvisories({ make: "Toyota", model: "Sentra", year: 2014 })).toEqual([]);
  });

  it("respects inclusive year boundaries (Nissan CVT era 2007-2017)", () => {
    const q = (year: number) => findAdvisories({ make: "Nissan", model: "Sentra", year });
    expect(q(2006)).toEqual([]);
    expect(q(2007).map((a) => a.id)).toContain("nissan-jatco-cvt");
    expect(q(2017).map((a) => a.id)).toContain("nissan-jatco-cvt");
    expect(q(2018)).toEqual([]);
  });

  it("never matches generic test-fixture models (Camry/Corolla/Accord)", () => {
    // Fixtures across scoring/matching/adapt tests use these models; the
    // knowledge base must stay silent on them or those suites would drift.
    for (const year of [2008, 2012, 2015, 2018]) {
      expect(findAdvisories({ make: "Toyota", model: "Camry", year })).toEqual([]);
      expect(findAdvisories({ make: "Toyota", model: "Corolla", year })).toEqual([]);
      expect(findAdvisories({ make: "Honda", model: "Accord", year })).toEqual([]);
    }
  });
});

describe("findAdvisories — manual-transmission exception", () => {
  it("waives an automatic-only defect when the transmission decodes as manual", () => {
    const [a] = findAdvisories({
      make: "Nissan",
      model: "Sentra",
      year: 2014,
      transmissionStyle: "Manual/Standard",
    });
    expect(a.waivedByManual).toBe(true);
    expect(a.appliedDelta).toBe(0);
    expect(a.transmissionNote).toBeUndefined();
  });

  it("applies the full penalty with a verify-note when the transmission is unknown", () => {
    const [a] = findAdvisories({ make: "Nissan", model: "Sentra", year: 2014 });
    expect(a.waivedByManual).toBeUndefined();
    expect(a.appliedDelta).toBe(-45);
    expect(a.transmissionNote).toMatch(/manual/i);
  });

  it("applies the full penalty for a confirmed automatic", () => {
    const [a] = findAdvisories({
      make: "Ford",
      model: "Focus",
      year: 2014,
      transmissionStyle: "Automatic",
    });
    expect(a.appliedDelta).toBe(-45);
    expect(a.severity).toBe("avoid");
  });
});

describe("findAdvisories — engine rules", () => {
  it("escalates the VW caution to avoid for the 2.0T", () => {
    const [a] = findAdvisories({
      make: "Volkswagen",
      model: "Jetta",
      year: 2010,
      engineDisplacementL: "2.0",
    });
    expect(a.severity).toBe("avoid");
    expect(a.appliedDelta).toBe(-45);
    expect(a.detail).toMatch(/timing-chain/i);
  });

  it("keeps the VW base caution when the engine is the reliable 2.5L", () => {
    const [a] = findAdvisories({
      make: "Volkswagen",
      model: "Jetta",
      year: 2010,
      engineDisplacementL: "2.5",
    });
    expect(a.severity).toBe("caution");
    expect(a.appliedDelta).toBe(-15);
  });

  it("downgrades the Vibe value pick to caution for the oil-burning 2.4L", () => {
    const [a] = findAdvisories({
      make: "Pontiac",
      model: "Vibe",
      year: 2009,
      engineDisplacementL: "2.359999895", // NHTSA-style raw displacement → 2.4
    });
    expect(a.severity).toBe("caution");
    expect(a.appliedDelta).toBe(-12);
  });

  it("keeps the Vibe value pick for the 1.8L", () => {
    const [a] = findAdvisories({
      make: "Pontiac",
      model: "Vibe",
      year: 2009,
      engineDisplacementL: "1.8",
    });
    expect(a.severity).toBe("value-pick");
    expect(a.appliedDelta).toBe(12);
  });
});

describe("riskLevelFor", () => {
  it("classifies live avoids as high, cautions as caution, value picks as clear", () => {
    const avoid = findAdvisories({ make: "Chevrolet", model: "Cruze", year: 2013 });
    const caution = findAdvisories({ make: "Volkswagen", model: "Golf", year: 2010 });
    const pick = findAdvisories({ make: "Honda", model: "Fit", year: 2011 });
    expect(riskLevelFor(avoid)).toBe("high");
    expect(riskLevelFor(caution)).toBe("caution");
    expect(riskLevelFor(pick)).toBe("clear");
    expect(riskLevelFor([])).toBe("clear");
    expect(hasAvoidAdvisory(avoid)).toBe(true);
  });

  it("does not raise risk for a manual-waived avoid", () => {
    const waived = findAdvisories({
      make: "Ford",
      model: "Fiesta",
      year: 2014,
      transmissionStyle: "Manual/Standard",
    });
    expect(riskLevelFor(waived)).toBe("clear");
    expect(hasAvoidAdvisory(waived)).toBe(false);
  });
});

describe("valuePickEntries", () => {
  it("exposes the curated budget value picks", () => {
    const ids = valuePickEntries().map((e) => e.id);
    expect(ids).toContain("mazda3-skyactiv");
    expect(ids).toContain("honda-fit-magic-seats");
    expect(ids).toContain("pontiac-vibe-toyota-twin");
    expect(ids.length).toBeGreaterThanOrEqual(5);
  });
});
