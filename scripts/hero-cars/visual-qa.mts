process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE ??= "ubuntu24.04-x64";

import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import {
  REPORTS_ROOT,
  activeRotation,
  ensureDir,
  exitWithError,
  getFlag,
  loadRotation,
  parseArgs,
  toRepoRelative,
  writeJson,
  writeText,
} from "./lib.mts";

type Scenario = {
  name: string;
  viewport: { width: number; height: number };
  reducedMotion?: "reduce" | "no-preference";
  staleIndex?: boolean;
  exerciseCarousel?: boolean;
};

type ScenarioResult = {
  name: string;
  url: string;
  screenshot: string;
  ready: boolean;
  labelTop: string;
  labelSub: string;
  canvasPixels: number;
  horizontalOverflow: number;
  heroError: string | null;
  assetWarnings: string[];
  consoleErrors: string[];
  pageErrors: string[];
  carouselLabels: string[];
  expectedCarouselCount: number;
  passed: boolean;
};

const scenarios: Scenario[] = [
  { name: "desktop", viewport: { width: 1440, height: 960 }, reducedMotion: "no-preference", exerciseCarousel: true },
  { name: "mobile", viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" },
  { name: "reduced-motion", viewport: { width: 1440, height: 960 }, reducedMotion: "reduce" },
  { name: "stale-local-storage", viewport: { width: 1440, height: 960 }, reducedMotion: "no-preference", staleIndex: true },
];

function markdown(results: ScenarioResult[]): string {
  const rows = results
    .map(
      (result) =>
        `| ${result.passed ? "PASS" : "FAIL"} | ${result.name} | ${result.labelTop || "n/a"} | ${result.canvasPixels} | ${result.horizontalOverflow} | ${result.consoleErrors.length + result.pageErrors.length} | ${result.screenshot} |`,
    )
    .join("\n");
  const details = results
    .map(
      (result) => `
## ${result.name}

- URL: ${result.url}
- Screenshot: ${result.screenshot}
- Ready: ${result.ready}
- Label: ${result.labelTop} / ${result.labelSub}
- Canvas non-transparent sampled pixels: ${result.canvasPixels}
- Horizontal overflow px: ${result.horizontalOverflow}
- Hero error: ${result.heroError ?? "none"}
- Asset warnings: ${result.assetWarnings.length ? result.assetWarnings.join("; ") : "none"}
- Console errors: ${result.consoleErrors.length ? result.consoleErrors.join("; ") : "none"}
- Page errors: ${result.pageErrors.length ? result.pageErrors.join("; ") : "none"}
- Carousel labels: ${result.carouselLabels.length ? result.carouselLabels.join(" | ") : "not exercised"}
- Expected carousel count: ${result.expectedCarouselCount || "not exercised"}
`,
    )
    .join("\n");

  return `# Hero Car Rotation Visual QA Report\n\nGenerated: ${new Date().toISOString()}\n\n| Result | Scenario | Hero label | Canvas pixels | Overflow px | JS errors | Screenshot |\n| --- | --- | --- | ---: | ---: | ---: | --- |\n${rows}\n\n${details}\n`;
}

async function waitForHero(page: Page): Promise<void> {
  await page.waitForSelector("hero-particles", { timeout: 30000 });
  await page.waitForFunction(
    () => {
      const hero = document.querySelector("hero-particles") as HTMLElement & { __ready?: () => boolean };
      return Boolean(hero && typeof hero.__ready === "function" && hero.__ready());
    },
    { timeout: 30000 },
  );
  await page.waitForTimeout(600);
}

async function inspectHero(page: Page, expectedCarouselCount = 0) {
  return page.evaluate((carouselCount) => {
    const hero = document.querySelector("hero-particles") as HTMLElement & {
      __ready?: () => boolean;
      __err?: string;
      __assetWarnings?: string[];
      __renderAt?: (sec: number, steps?: number) => void;
      __setCar?: (idx: number) => void;
    };
    if (!hero) throw new Error("hero-particles element not found");
    if (typeof hero.__renderAt === "function") hero.__renderAt(5, 4);

    const canvas = hero.querySelector("canvas") as HTMLCanvasElement | null;
    const ctx = canvas?.getContext("2d");
    let canvasPixels = 0;
    if (canvas && ctx && canvas.width && canvas.height) {
      const sample = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < sample.length; i += 40) {
        if (sample[i] > 0) canvasPixels += 1;
      }
    }

    const label = Array.from(hero.children).find((child) => child instanceof HTMLDivElement) as HTMLDivElement | undefined;
    const labelTop = label?.children[0]?.textContent ?? "";
    const labelSub = label?.children[1]?.textContent ?? "";
    const carouselLabels: string[] = [];
    if (carouselCount > 0 && typeof hero.__setCar === "function") {
      for (let i = 0; i < carouselCount; i += 1) {
        hero.__setCar(i);
        carouselLabels.push(label?.children[0]?.textContent ?? "");
      }
    }

    const doc = document.documentElement;
    return {
      ready: Boolean(hero.__ready?.()),
      labelTop,
      labelSub,
      canvasPixels,
      horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
      heroError: hero.__err ?? null,
      assetWarnings: hero.__assetWarnings ?? [],
      carouselLabels,
    };
  }, expectedCarouselCount);
}

async function runScenario(
  browser: Browser,
  url: string,
  outDir: string,
  scenario: Scenario,
  expectedCarouselCount: number,
): Promise<ScenarioResult> {
  const context: BrowserContext = await browser.newContext({
    viewport: scenario.viewport,
    reducedMotion: scenario.reducedMotion ?? "no-preference",
    deviceScaleFactor: 1,
  });
  if (scenario.staleIndex) {
    await context.addInitScript(() => localStorage.setItem("carAdvisorHero.carIdx", "999"));
  }

  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await waitForHero(page);
  const inspection = await inspectHero(page, scenario.exerciseCarousel ? expectedCarouselCount : 0);
  const screenshotPath = path.join(outDir, `${scenario.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await context.close();

  const passed =
    inspection.ready &&
    inspection.canvasPixels > 100 &&
    inspection.horizontalOverflow <= 1 &&
    !inspection.heroError &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0 &&
    (!scenario.exerciseCarousel || inspection.carouselLabels.length === expectedCarouselCount);

  return {
    name: scenario.name,
    url,
    screenshot: toRepoRelative(screenshotPath),
    ...inspection,
    expectedCarouselCount: scenario.exerciseCarousel ? expectedCarouselCount : 0,
    consoleErrors,
    pageErrors,
    passed,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const url = getFlag(args, "url") ?? "http://localhost:3000/";
  const outDir = path.resolve(getFlag(args, "out") ?? path.join(REPORTS_ROOT, "hero-car-visual-qa"));
  await ensureDir(outDir);
  const expectedCarouselCount = activeRotation(await loadRotation()).length;

  const browser = await chromium.launch({ headless: true });
  try {
    const results: ScenarioResult[] = [];
    for (const scenario of scenarios) {
      results.push(await runScenario(browser, url, outDir, scenario, expectedCarouselCount));
    }

    await writeJson(path.join(outDir, "report.json"), { ok: results.every((result) => result.passed), results });
    await writeText(path.join(outDir, "report.md"), markdown(results));
    console.log(`Wrote ${toRepoRelative(path.join(outDir, "report.md"))}`);
    console.log(JSON.stringify({ ok: results.every((result) => result.passed), results }, null, 2));
    if (!results.every((result) => result.passed)) process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(exitWithError);
