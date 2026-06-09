import { describe, expect, it } from "vitest";
import { isValidVin } from "./vin";

describe("isValidVin", () => {
  it("accepts a valid 17-character VIN", () => {
    expect(isValidVin("1HGCM82633A004352")).toBe(true);
    expect(isValidVin("5YJ3E1EA7HF000316")).toBe(true);
  });

  it("normalizes case and surrounding whitespace", () => {
    expect(isValidVin("  5yj3e1ea7hf000316  ")).toBe(true);
  });

  it("rejects VINs of the wrong length", () => {
    expect(isValidVin("1HGCM82633A00435")).toBe(false); // 16
    expect(isValidVin("1HGCM82633A0043522")).toBe(false); // 18
    expect(isValidVin("")).toBe(false);
  });

  it("rejects VINs containing the forbidden letters I, O, or Q", () => {
    expect(isValidVin("1HGCM82633A0043I2")).toBe(false);
    expect(isValidVin("1HGCM82633A0043O2")).toBe(false);
    expect(isValidVin("1HGCM82633A0043Q2")).toBe(false);
  });

  it("rejects VINs with non-alphanumeric characters", () => {
    expect(isValidVin("1HGCM82633A0043-2")).toBe(false);
    expect(isValidVin("1HGCM82633A0043 2")).toBe(false);
  });
});
