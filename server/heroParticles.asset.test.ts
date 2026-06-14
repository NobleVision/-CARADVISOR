import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "..");
const validateRotationCommand = process.platform === "win32"
  ? {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "pnpm exec tsx scripts/hero-cars/validate-rotation.mts --json"],
    }
  : {
      command: "pnpm",
      args: ["exec", "tsx", "scripts/hero-cars/validate-rotation.mts", "--json"],
    };
const heroRoot = path.join(repoRoot, "client", "public", "hero");
const carsRoot = path.join(heroRoot, "cars");
const heroParticlesPath = path.join(heroRoot, "hero-particles.js");
const rotationPath = path.join(carsRoot, "rotation.json");
const metaPath = path.join(carsRoot, "meta.json");
const visualQaPath = path.join(repoRoot, "scripts", "hero-cars", "visual-qa.mts");
const validateRotationPath = path.join(repoRoot, "scripts", "hero-cars", "validate-rotation.mts");
const heroParticlesSource = readFileSync(heroParticlesPath, "utf8");
const visualQaSource = readFileSync(visualQaPath, "utf8");
const validateRotationSource = readFileSync(validateRotationPath, "utf8");
const heroSectionSource = readFileSync(
  path.join(repoRoot, "client", "src", "landing", "HeroSection.tsx"),
  "utf8",
);

const activeRotationKeys = [
  "runner-v2",
  "camry-v2",
  "cx5-v2",
  "accord",
  "toyota-rav4-hybrid",
  "honda-cr-v-hybrid",
  "honda-civic",
  "subaru-forester",
  "tesla-model-y",
  "toyota-tacoma",
  "ford-f-150",
];

const activeRotationNames = [
  "Toyota 4Runner",
  "Toyota Camry",
  "Mazda CX-5",
  "Honda Accord",
  "Toyota RAV4 Hybrid",
  "Honda CR-V Hybrid",
  "Honda Civic",
  "Subaru Forester",
  "Tesla Model Y",
  "Toyota Tacoma",
  "Ford F-150",
];

function readJson<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

type RotationEntry = {
  key: string;
  name: string;
  tag: string;
  destW: number;
  status?: string;
};

type MetaEntry = {
  src: string;
  w: number;
  h: number;
  poly: number[][];
  headlights: number[][];
  ground: number;
  lampFlash?: {
    intro?: boolean;
    color?: string;
  };
};

describe("hero particle carousel asset", () => {
  it("externalizes the active hero rotation in rotation.json and keeps Polestar out of the public list", () => {
    expect(existsSync(rotationPath), "rotation.json should hold the editable public rotation").toBe(true);
    const rotation = readJson<RotationEntry[]>(rotationPath);
    if (!rotation) return;

    expect(rotation.map((car) => car.key)).toEqual(activeRotationKeys);
    expect(rotation.map((car) => car.name)).toEqual(activeRotationNames);
    expect(rotation.map((car) => car.key)).not.toContain("polestar5");
    expect(rotation.map((car) => car.name)).not.toContain("Polestar 5");
    expect(rotation.every((car) => car.status === undefined || car.status === "active")).toBe(true);
  });

  it("loads rotation.json before resolving entries against meta.json while preserving a no-blank fallback", () => {
    expect(heroParticlesSource).toContain("cars/rotation.json");
    expect(heroParticlesSource).toContain("function loadHeroAssets");
    expect(heroParticlesSource).toContain("DEFAULT_ROTATION");
    expect(heroParticlesSource).not.toMatch(/var CARS\s*=\s*\[/);
  });

  it("keeps localStorage index compatibility and clamps stale indexes after rotation changes", () => {
    expect(heroParticlesSource).toContain("carAdvisorHero.carIdx");
    expect(heroParticlesSource).toContain("function normalizeCarIndex");
    expect(heroParticlesSource).toMatch(/normalizeCarIndex\(st,\s*CARS\.length\)/);
    expect(heroParticlesSource).toMatch(/normalizeCarIndex\(carIdx \+ 1,\s*CARS\.length\)/);
  });

  it("holds each assembled car for three seconds before shifting", () => {
    expect(heroParticlesSource).toMatch(/T_HOLD\s*=\s*3(?:\.0)?\b/);
  });

  it("keeps the three-second hold clean by drawing particles behind the full car photo", () => {
    expect(heroParticlesSource).toContain("function cleanHoldAlpha");
    expect(heroParticlesSource).toContain("cleanPhotoA");
    expect(heroParticlesSource).toContain("particleA");
    expect(heroParticlesSource).toMatch(/drawParticles\(ctx, ph\.particleA\);\s*\n\s*drawCar\(ctx, car, ph\.carAlpha, ph\.beat, carMotion\);/);
    expect(heroParticlesSource).not.toContain("trace(g, car.poly, true); g.stroke();");
    expect(heroParticlesSource).not.toContain("sheen sweep clipped to silhouette");
  });

  it("keeps lamp flashes restrained so they read as natural lamp glints instead of oversized blobs", () => {
    expect(heroParticlesSource).toMatch(/T_FLASH_HOLD\s*=\s*0\.5\b/);
    expect(heroParticlesSource).toContain("function lampFlashBeat");
    expect(heroParticlesSource).toMatch(/FLASH_CORE_ALPHA\s*=\s*0\.66\b/);
    expect(heroParticlesSource).toMatch(/FLASH_GOLD_ALPHA\s*=\s*0\.28\b/);
    expect(heroParticlesSource).toMatch(/FLASH_RADIUS\s*=\s*26\b/);
  });

  it("does not draw gold body overlays that can make simplified polygons look like oblong car outlines", () => {
    expect(heroParticlesSource).not.toContain("gold rim light along the traced silhouette");
    expect(heroParticlesSource).not.toContain("g.strokeStyle = rim");
    expect(heroParticlesSource).not.toContain("g.clip();\n        var sg = g.createLinearGradient");
  });

  it("supports selected-car parallax motion without making the hero overlay block CTA clicks", () => {
    expect(heroParticlesSource).toContain("function setParallaxTarget");
    expect(heroParticlesSource).toContain("function pointerWithinCar");
    expect(heroParticlesSource).toContain("window.addEventListener('pointerdown'");
    expect(heroParticlesSource).toContain("var carMotion = {");
    expect(heroSectionSource).toContain("pointer-events-none absolute inset-0");
  });

  it("validates each active rotation key against metadata and on-disk cutouts", () => {
    const rotation = readJson<RotationEntry[]>(rotationPath);
    const meta = readJson<Record<string, MetaEntry>>(metaPath);
    expect(rotation, "rotation.json should parse").not.toBeNull();
    expect(meta, "meta.json should parse").not.toBeNull();
    if (!rotation || !meta) return;

    for (const car of rotation) {
      const metadata = meta[car.key];
      expect(metadata, `${car.key} should exist in meta.json`).toBeTruthy();
      if (!metadata) continue;
      expect(metadata.poly.length, `${car.key} should have non-empty polygon metadata`).toBeGreaterThan(2);
      expect(metadata.headlights.length, `${car.key} should have a visible lamp anchor`).toBeGreaterThan(0);
      expect(metadata.ground, `${car.key} ground line should be sane`).toBeGreaterThan(0.7);
      expect(metadata.ground, `${car.key} ground line should be sane`).toBeLessThanOrEqual(1.05);
      expect(existsSync(path.join(heroRoot, metadata.src)), `${car.key} cutout should exist`).toBe(true);
    }
  });

  it("places the ignition flash on a visible lamp for every active car", () => {
    const meta = readJson<Record<string, MetaEntry>>(metaPath);
    expect(meta, "meta.json should parse").not.toBeNull();
    if (!meta) return;

    const expectedLampAnchors: Record<string, [number, number]> = {
      "runner-v2": [0.485, 0.382],
      "camry-v2": [0.74, 0.61],
      "cx5-v2": [0.642, 0.476],
      accord: [0.35, 0.525],
      "toyota-rav4-hybrid": [0.398, 0.365],
      "honda-cr-v-hybrid": [0.397, 0.456],
      "honda-civic": [0.448, 0.463],
      "subaru-forester": [0.314, 0.466],
      "tesla-model-y": [0.31, 0.344],
      "toyota-tacoma": [0.462, 0.365],
      "ford-f-150": [0.368, 0.456],
    };

    for (const key of activeRotationKeys) {
      const [x, y] = meta[key].headlights[0] ?? [];
      const [expectedX, expectedY] = expectedLampAnchors[key];
      expect(x, `${key} lamp anchor x`).toBeCloseTo(expectedX, 3);
      expect(y, `${key} lamp anchor y`).toBeCloseTo(expectedY, 3);
    }
  });

  it("uses per-car lamp-flash metadata for Civic intro suppression and the rear-facing Tesla tail-light flash", () => {
    const meta = readJson<Record<string, MetaEntry>>(metaPath);
    expect(meta, "meta.json should parse").not.toBeNull();
    if (!meta) return;

    expect(meta["honda-civic"].lampFlash?.intro, "Civic should not show the first assembly flash").toBe(false);
    expect(meta["tesla-model-y"].lampFlash?.color, "rear-facing Tesla should use a red tail-light flash").toBe("red");
    expect(heroParticlesSource).toContain("car.lampFlash");
    expect(heroParticlesSource).toContain("lampFlashBeat(tc, car)");
    expect(heroParticlesSource).toContain("intro !== false");
    expect(heroParticlesSource).toContain("tailColor");
  });

  it("keeps staged metadata lamp anchors synchronized with active imported cars", () => {
    const meta = readJson<Record<string, MetaEntry>>(metaPath);
    expect(meta, "meta.json should parse").not.toBeNull();
    if (!meta) return;

    for (const key of activeRotationKeys) {
      const stagedMetaPath = path.join(carsRoot, "staged", key, "meta.json");
      if (!existsSync(stagedMetaPath)) continue;

      const stagedMeta = readJson<MetaEntry>(stagedMetaPath);
      expect(stagedMeta, `${key} staged meta should parse`).not.toBeNull();
      if (!stagedMeta) continue;

      expect(stagedMeta.headlights, `${key} staged lamp anchors should match live metadata`).toEqual(
        meta[key].headlights,
      );
    }
  });

  it("ships the hero-car automation scripts and workflow documentation", () => {
    const requiredFiles = [
      "scripts/hero-cars/research-candidates.mts",
      "scripts/hero-cars/download-source.mts",
      "scripts/hero-cars/process-cutout.mts",
      "scripts/hero-cars/generate-meta.mts",
      "scripts/hero-cars/render-preview-sheet.mts",
      "scripts/hero-cars/import-approved.mts",
      "scripts/hero-cars/replace-approved.mts",
      "scripts/hero-cars/remove-car.mts",
      "scripts/hero-cars/validate-rotation.mts",
      "docs/hero-car-rotation-workflow.md",
      "client/public/hero/cars/sources.json",
    ];

    for (const file of requiredFiles) {
      expect(existsSync(path.join(repoRoot, file)), `${file} should exist`).toBe(true);
    }
  });

  it("requires explicit approval keys before importing or replacing staged candidates", () => {
    const approvalScripts = [
      "scripts/hero-cars/import-approved.mts",
      "scripts/hero-cars/replace-approved.mts",
    ];

    for (const script of approvalScripts) {
      const scriptPath = path.join(repoRoot, script);
      expect(existsSync(scriptPath), `${script} should exist`).toBe(true);
      if (!existsSync(scriptPath)) continue;
      const source = readFileSync(scriptPath, "utf8");
      expect(source).toContain("--approved");
      expect(source).toContain("No approved candidate keys supplied");
      expect(source).toContain("approvedKeys");
    }

    expect(readFileSync(path.join(repoRoot, "scripts/hero-cars/import-approved.mts"), "utf8")).toContain("imported-active");
  });

  it("formats carousel labels with two-digit ordinals after the rotation grows past nine cars", () => {
    expect(heroParticlesSource).toContain("String(idx + 1).padStart(2, '0')");
    expect(heroParticlesSource).not.toContain("'0' + (idx + 1)");
  });

  it("browser QA exercises the full active rotation instead of a hard-coded four-car subset", () => {
    expect(visualQaSource).toContain("activeRotation(await loadRotation())");
    expect(visualQaSource).toContain("expectedCarouselCount");
    expect(visualQaSource).not.toMatch(/i\s*<\s*4/);
  });

  it("browser QA filters benign connection-aborted resource noise", () => {
    expect(visualQaSource).toContain("function isBenignConsoleError");
    expect(visualQaSource).toContain("ERR_CONNECTION_ABORTED");
    expect(visualQaSource).toContain("!isBenignConsoleError(message.text())");
  });

  it("validation reporting consumes browser QA results when they have been generated", () => {
    expect(validateRotationSource).toContain("hero-car-visual-qa");
    expect(validateRotationSource).toContain("loadBrowserQaResults");
    expect(validateRotationSource).toContain("carouselAdvancesThroughApprovedList");
  });

  it("validates the rotation via the CLI validator and reports orphaned assets without deleting them", () => {
    const result = spawnSync(validateRotationCommand.command, validateRotationCommand.args, {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
    });

    expect(result.status, result.stderr || result.stdout).toBe(0);
    if (result.status !== 0) return;

    const report = JSON.parse(result.stdout) as {
      ok: boolean;
      currentRotation: string[];
      orphanedAssets: string[];
      checks: Array<{ id: string; status: string }>;
    };
    expect(report.ok).toBe(true);
    expect(report.currentRotation).toEqual(activeRotationKeys);
    expect(report.orphanedAssets).toContain("cars/polestar5.png");
    expect(report.checks.some((check) => check.id === "orphaned-assets" && check.status === "warn")).toBe(true);
  });
});
