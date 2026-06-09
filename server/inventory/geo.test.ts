import { describe, expect, it } from "vitest";
import { distanceFromZip, isKnownZip } from "./geo";

describe("isKnownZip", () => {
  it("accepts a known 5-digit ZIP", () => {
    expect(isKnownZip("22030")).toBe(true);
  });
  it("rejects unknown / malformed ZIPs", () => {
    expect(isKnownZip("00000")).toBe(false);
    expect(isKnownZip("123")).toBe(false);
    expect(isKnownZip(undefined)).toBe(false);
  });
});

describe("distanceFromZip", () => {
  it("returns 1+ miles between two known ZIPs", () => {
    const d = distanceFromZip("22030", "22201"); // Fairfax -> Arlington
    expect(d).not.toBeNull();
    expect(d as number).toBeGreaterThan(0);
    expect(d as number).toBeLessThan(40);
  });

  it("is symmetric", () => {
    expect(distanceFromZip("22030", "20814")).toBe(distanceFromZip("20814", "22030"));
  });

  it("rates a far ZIP farther than a near ZIP from the same origin", () => {
    const near = distanceFromZip("22030", "22031") as number; // Fairfax -> Fairfax
    const far = distanceFromZip("22030", "21201") as number; // Fairfax -> Baltimore
    expect(far).toBeGreaterThan(near);
  });

  it("returns null when a ZIP is unknown so caller can fall back", () => {
    expect(distanceFromZip("99999", "22030")).toBeNull();
    expect(distanceFromZip("22030", "99999")).toBeNull();
    expect(distanceFromZip(undefined, "22030")).toBeNull();
  });
});
