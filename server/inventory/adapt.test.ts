import { describe, expect, it } from "vitest";
import { listingToDecodedVehicle } from "./adapt";
import { scoreVehicle } from "../scoring";
import type { Listing } from "./types";

const baseListing: Listing = {
  id: "test-1",
  vin: "1ABCDEFGHJ2345678",
  year: 2021,
  make: "Toyota",
  model: "Corolla",
  trim: "LE",
  bodyStyle: "Sedan",
  fuel: "Gas",
  price: 17000,
  mileage: 40000,
  mpg: 34,
  exteriorColor: "Silver",
  dealerName: "Summit Pre-Owned",
  city: "Springfield",
  state: "IL",
  distanceMiles: 12,
  photoUrl: "",
  dealerBlurb: "Clean one-owner.",
  regionFlags: ["High-salt winter region — inspect for undercarriage corrosion."],
};

describe("listingToDecodedVehicle", () => {
  it("maps core identity fields from the listing", () => {
    const v = listingToDecodedVehicle(baseListing);
    expect(v.vin).toBe(baseListing.vin);
    expect(v.make).toBe("Toyota");
    expect(v.model).toBe("Corolla");
    expect(v.modelYear).toBe("2021");
    expect(v.trim).toBe("LE");
  });

  it("maps body style to a sensible body class and vehicle type", () => {
    const v = listingToDecodedVehicle(baseListing);
    expect(v.bodyClass).toMatch(/Sedan/);
    expect(v.vehicleType).toBe("PASSENGER CAR");
    expect(v.doors).toBe("4");
  });

  it("maps fuel kind to NHTSA-style fuel + electrification", () => {
    const ev = listingToDecodedVehicle({ ...baseListing, fuel: "EV" });
    expect(ev.fuelType).toBe("Electric");
    expect(ev.electrificationLevel).toMatch(/BEV/);
    expect(ev.engineCylinders).toBe("");

    const hybrid = listingToDecodedVehicle({ ...baseListing, fuel: "Hybrid" });
    expect(hybrid.fuelType).toMatch(/Hybrid/);
    expect(hybrid.electrificationLevel).toMatch(/HEV/);
  });

  it("includes a richer safety suite for newer model years", () => {
    const older = listingToDecodedVehicle({ ...baseListing, year: 2014 });
    const newer = listingToDecodedVehicle({ ...baseListing, year: 2022 });
    expect(newer.safetyFeatures.length).toBeGreaterThan(older.safetyFeatures.length);
  });

  it("preserves region flags and listing metadata in raw", () => {
    const v = listingToDecodedVehicle(baseListing);
    expect(v.raw.regionFlags).toContain("undercarriage corrosion");
    expect(v.raw.listingId).toBe("test-1");
    expect(v.raw.__source).toBe("gogetter-inventory");
  });

  it("produces a vehicle that scores cleanly through the existing engine", () => {
    const v = listingToDecodedVehicle(baseListing);
    const score = scoreVehicle(v, baseListing.mileage);
    expect(score.overall).toBeGreaterThan(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    // Toyota + reasonable mileage should land comfortably above average
    expect(score.overall).toBeGreaterThanOrEqual(70);
    expect(score.grade).toBeTruthy();
  });
});
