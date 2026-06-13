import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "..");
const heroParticlesSource = readFileSync(
  path.join(repoRoot, "client", "public", "hero", "hero-particles.js"),
  "utf8",
);
const heroSectionSource = readFileSync(
  path.join(repoRoot, "client", "src", "landing", "HeroSection.tsx"),
  "utf8",
);

function carsArrayBlock() {
  const match = heroParticlesSource.match(/var CARS = \[([\s\S]*?)\n\s*\];/);
  if (!match) throw new Error("Could not find hero CARS array");
  return match[1];
}

describe("hero particle carousel asset", () => {
  it("does not include the Polestar 5 in the public hero rotation", () => {
    const cars = carsArrayBlock();

    expect(cars).not.toContain("polestar5");
    expect(cars).not.toContain("Polestar 5");
    expect(cars).toContain("Toyota 4Runner");
  });

  it("holds each assembled car for three seconds before shifting", () => {
    expect(heroParticlesSource).toMatch(/T_HOLD\s*=\s*3(?:\.0)?\b/);
  });

  it("supports selected-car parallax motion without making the hero overlay block CTA clicks", () => {
    expect(heroParticlesSource).toContain("function setParallaxTarget");
    expect(heroParticlesSource).toContain("function pointerWithinCar");
    expect(heroParticlesSource).toContain("window.addEventListener('pointerdown'");
    expect(heroParticlesSource).toContain("var carMotion = {");
    expect(heroSectionSource).toContain("pointer-events-none absolute inset-0");
  });
});
