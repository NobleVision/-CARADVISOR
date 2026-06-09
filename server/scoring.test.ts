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
