import { describe, expect, it } from "vitest";
import { scoreVehicle } from "./scoring";
import type { DecodedVehicle } from "../drizzle/schema";

function makeVehicle(overrides: Partial<DecodedVehicle> = {}): DecodedVehicle {
  return {
    vin: "1HGCM82633A004352",
    make: "Honda",
    model: "Accord",
    modelYear: "2015",
    trim: "",
    vehicleType: "PASSENGER CAR",
    bodyClass: "Sedan/Saloon",
    driveType: "FWD",
    fuelType: "Gasoline",
    engineCylinders: "4",
    engineHP: "185",
    engineDisplacementL: "2.4",
    transmissionStyle: "Automatic",
    transmissionSpeeds: "6",
    doors: "4",
    manufacturer: "Honda",
    plantCountry: "United States",
    plantCity: "Marysville",
    plantState: "Ohio",
    electrificationLevel: "",
    gvwr: "",
    safetyFeatures: [],
    raw: {},
    ...overrides,
  };
}

describe("scoreVehicle", () => {
  it("returns a bounded overall score and a valid grade", () => {
    const result = scoreVehicle(makeVehicle());
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.grade).toMatch(/^(A\+|A-|A|B\+|B-|B|C\+|C-|C|D|F)$/);
    expect(Array.isArray(result.notes)).toBe(true);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it("rewards reliable makes with a higher reliability subscore", () => {
    const toyota = scoreVehicle(makeVehicle({ make: "Toyota" }));
    const landRover = scoreVehicle(makeVehicle({ make: "Land Rover" }));
    expect(toyota.reliability).toBeGreaterThan(landRover.reliability);
    expect(toyota.reliability).toBe(95);
  });

  it("falls back to the default reliability for unknown makes", () => {
    const unknown = scoreVehicle(makeVehicle({ make: "Koenigsegg" }));
    expect(unknown.reliability).toBe(75);
  });

  it("raises the safety subscore as more safety features are decoded", () => {
    const few = scoreVehicle(makeVehicle({ safetyFeatures: [{ label: "ABS", value: "Standard" }] }));
    const many = scoreVehicle(
      makeVehicle({
        safetyFeatures: Array.from({ length: 10 }, (_, i) => ({ label: `f${i}`, value: "Standard" })),
      }),
    );
    expect(many.safety).toBeGreaterThan(few.safety);
    expect(many.safety).toBeLessThanOrEqual(100);
  });

  it("gives a full electric vehicle a high efficiency subscore", () => {
    const ev = scoreVehicle(
      makeVehicle({ make: "Tesla", fuelType: "Electric", electrificationLevel: "BEV (Battery Electric Vehicle)" }),
    );
    expect(ev.efficiency).toBe(95);
  });

  it("penalizes high mileage relative to age", () => {
    const lowMiles = scoreVehicle(makeVehicle({ modelYear: "2015" }), 40000);
    const highMiles = scoreVehicle(makeVehicle({ modelYear: "2015" }), 220000);
    expect(lowMiles.ageMileage).toBeGreaterThan(highMiles.ageMileage);
  });

  it("notes when mileage is not provided", () => {
    const result = scoreVehicle(makeVehicle());
    expect(result.notes.some((n) => n.toLowerCase().includes("mileage was not provided"))).toBe(true);
  });
});

describe("scoreVehicle — GOGETTER Reliability Index integration", () => {
  it("penalizes a known-defect model into failing reliability territory", () => {
    const trap = scoreVehicle(
      makeVehicle({ make: "Nissan", model: "Sentra", modelYear: "2014", transmissionStyle: "CVT" }),
    );
    expect(trap.reliability).toBeLessThanOrEqual(40);
    expect(trap.riskLevel).toBe("high");
    expect(trap.advisories?.some((a) => a.id === "nissan-jatco-cvt")).toBe(true);
    expect(trap.notes.some((n) => n.includes("Reliability Index"))).toBe(true);
  });

  it("waives an automatic-only defect for a decoded manual transmission", () => {
    const manual = scoreVehicle(
      makeVehicle({ make: "Nissan", model: "Sentra", modelYear: "2014", transmissionStyle: "Manual/Standard" }),
    );
    expect(manual.reliability).toBe(78); // Nissan make baseline, no penalty
    expect(manual.riskLevel).toBe("clear");
    expect(manual.advisories?.[0]?.waivedByManual).toBe(true);
    expect(manual.notes.some((n) => n.toLowerCase().includes("manual"))).toBe(true);
  });

  it("rewards a curated value pick with a reliability bonus", () => {
    const pick = scoreVehicle(
      makeVehicle({ make: "Mazda", model: "Mazda3", modelYear: "2013", engineDisplacementL: "2.0" }),
    );
    expect(pick.reliability).toBeGreaterThanOrEqual(95);
    expect(pick.riskLevel).toBe("clear");
    expect(pick.notes.some((n) => n.includes("value pick"))).toBe(true);
  });

  it("scores a manual PowerShift-era Focus far above the automatic", () => {
    const auto = scoreVehicle(
      makeVehicle({ make: "Ford", model: "Focus", modelYear: "2014", transmissionStyle: "Automatic" }),
    );
    const manual = scoreVehicle(
      makeVehicle({ make: "Ford", model: "Focus", modelYear: "2014", transmissionStyle: "Manual/Standard" }),
    );
    expect(manual.reliability).toBeGreaterThan(auto.reliability);
    expect(auto.riskLevel).toBe("high");
    expect(manual.riskLevel).toBe("clear");
  });

  it("attaches no advisories to vehicles outside the knowledge base", () => {
    const baseline = scoreVehicle(makeVehicle()); // 2015 Honda Accord fixture
    expect(baseline.advisories).toBeUndefined();
    expect(baseline.riskLevel).toBeUndefined();
  });

  it("keeps the worst-case trap car within score bounds and grade mapping", () => {
    const worst = scoreVehicle(
      makeVehicle({ make: "Chevrolet", model: "Cruze", modelYear: "2011", safetyFeatures: [] }),
      230000,
    );
    expect(worst.overall).toBeGreaterThanOrEqual(0);
    expect(worst.overall).toBeLessThanOrEqual(100);
    expect(worst.grade).toMatch(/^(A\+|A-|A|B\+|B-|B|C\+|C-|C|D|F)$/);
    expect(worst.reliability).toBeGreaterThanOrEqual(15);
  });
});
