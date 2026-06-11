/**
 * Scripted Chrome DevTools QA for the landing page + UI refresh.
 * Drives the system Chrome via puppeteer-core (no bundled Chromium):
 *   - all routes × 4 breakpoints: console errors, horizontal overflow
 *   - landing: WebGL hero presence, pinned-scroll FPS sample, mid-pin nav-away
 *   - reduced-motion emulation: static hero fallback, content visible
 *   - login flow lands on /lookup; favicon + OG assets respond
 * Run: node scripts/qa-browser.mjs [baseUrl]   (default http://localhost:3000)
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SHOTS = "qa-shots";
mkdirSync(SHOTS, { recursive: true });

const ROUTES = ["/", "/lookup", "/login", "/find", "/map", "/new-cars", "/compare", "/saved", "/history", "/premium", "/definitely-missing"];
const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

const failures = [];
const note = (ok, msg) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${msg}`);
  if (!ok) failures.push(msg);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell" === "never" ? false : true,
  args: ["--no-first-run", "--hide-scrollbars", "--mute-audio", "--use-gl=angle"],
});

try {
  const page = await browser.newPage();
  const consoleIssues = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      const t = m.text();
      // Vite HMR/devtools noise we don't own:
      if (/Download the React DevTools|\[vite\]/.test(t)) return;
      consoleIssues.push(`${m.type()}: ${t.slice(0, 200)}`);
    }
  });
  page.on("pageerror", (e) => consoleIssues.push(`pageerror: ${String(e).slice(0, 200)}`));

  // ── Route × viewport sweep ──
  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      consoleIssues.length = 0;
      await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 45000 });
      await new Promise((r) => setTimeout(r, 700));

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      note(overflow <= 0, `${route} @ ${vp.name}: no horizontal overflow (delta ${overflow}px)`);

      // Mid-page overflow check (catches pinned-section spill)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
      await new Promise((r) => setTimeout(r, 400));
      const overflowMid = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      note(overflowMid <= 0, `${route} @ ${vp.name}: no overflow mid-scroll (delta ${overflowMid}px)`);

      const errs = consoleIssues.filter((c) => !c.startsWith("warning"));
      note(errs.length === 0, `${route} @ ${vp.name}: console clean${errs.length ? " — " + errs[0] : ""}`);

      if (vp.name === "mobile-375" || vp.name === "desktop-1440") {
        const slug = (route === "/" ? "landing" : route.replace(/[/:]/g, "_")).replace(/^_/, "");
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise((r) => setTimeout(r, 300));
        await page.screenshot({ path: `${SHOTS}/${slug}-${vp.name}.png` });
      }
    }
  }

  // ── Landing deep checks (desktop) ──
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));

  const heroState = await page.evaluate(() => ({
    canvas: Boolean(document.querySelector("section canvas")),
    fallbackImg: Boolean(document.querySelector('img[src="/img/hero-car.svg"]')),
    h1: document.querySelector("h1")?.textContent?.slice(0, 60) ?? "",
  }));
  note(
    heroState.canvas || heroState.fallbackImg,
    `landing hero renders (canvas=${heroState.canvas}, fallback=${heroState.fallbackImg})`,
  );
  note(/Don't buy on hope/.test(heroState.h1), `hero headline present ("${heroState.h1}")`);

  // FPS sample while scrolling through the pinned story
  const fps = await page.evaluate(async () => {
    const start = performance.now();
    let frames = 0;
    const tick = () => {
      frames++;
      if (performance.now() - start < 2000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const step = (document.body.scrollHeight * 0.5) / 40;
    for (let i = 0; i < 40; i++) {
      window.scrollBy(0, step);
      await new Promise((r) => setTimeout(r, 50));
    }
    await new Promise((r) => setTimeout(r, Math.max(0, 2050 - (performance.now() - start))));
    return Math.round((frames / (performance.now() - start)) * 1000);
  });
  note(fps >= 40, `scroll FPS sample: ${fps} (target ≥50, ≥40 acceptable under software GL)`);
  await page.screenshot({ path: `${SHOTS}/landing-midscroll.png` });

  // Navigate away mid-pin → /lookup must be clean (no ghost pins/errors)
  consoleIssues.length = 0;
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.3));
  await new Promise((r) => setTimeout(r, 300));
  await page.click('a[href="/lookup"]');
  await new Promise((r) => setTimeout(r, 1200));
  const lookupState = await page.evaluate(() => ({
    url: location.pathname,
    scrollY: window.scrollY,
    pinSpacers: document.querySelectorAll(".pin-spacer").length,
  }));
  note(lookupState.url === "/lookup", `mid-pin nav lands on /lookup (got ${lookupState.url})`);
  note(lookupState.scrollY === 0, `ScrollToTop reset scroll (y=${lookupState.scrollY})`);
  note(lookupState.pinSpacers === 0, `no ghost pin-spacers after route change (${lookupState.pinSpacers})`);
  note(consoleIssues.length === 0, `route-change console clean${consoleIssues[0] ? " — " + consoleIssues[0] : ""}`);

  // ── Reduced-motion emulation ──
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));
  const rm = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const style = h1 ? getComputedStyle(h1) : null;
    const score = document.querySelectorAll("section")[2]?.textContent ?? "";
    return {
      canvas: Boolean(document.querySelector("section canvas")),
      fallbackImg: Boolean(document.querySelector('img[src="/img/hero-car.svg"]')),
      h1Visible: Boolean(style && style.visibility !== "hidden" && style.opacity !== "0"),
      hasScore92: /92/.test(score),
    };
  });
  note(!rm.canvas && rm.fallbackImg, `reduced-motion: static hero fallback (canvas=${rm.canvas}, img=${rm.fallbackImg})`);
  note(rm.h1Visible, "reduced-motion: headline fully visible");
  note(rm.hasScore92, "reduced-motion: score story shows finished state (92)");
  await page.screenshot({ path: `${SHOTS}/landing-reduced-motion.png` });
  await page.emulateMediaFeatures([]);

  // ── Login flow → /lookup ──
  await page.goto(BASE + "/login", { waitUntil: "networkidle2" });
  await page.click('button[type="submit"]');
  await new Promise((r) => setTimeout(r, 2500));
  const afterLogin = await page.evaluate(() => location.pathname);
  note(afterLogin === "/lookup", `demo login lands on /lookup (got ${afterLogin})`);

  // ── Brand assets respond ──
  for (const asset of ["/brand/favicon.svg", "/brand/favicon-32.png", "/brand/apple-touch-icon.png", "/brand/og-image.png"]) {
    const status = await page.evaluate(async (u) => (await fetch(u)).status, asset);
    note(status === 200, `${asset} → ${status}`);
  }

  console.log("\n────────────────────────────");
  if (failures.length) {
    console.log(`FAILURES (${failures.length}):`);
    for (const f of failures) console.log("  ✗ " + f);
    process.exitCode = 1;
  } else {
    console.log("ALL BROWSER QA CHECKS PASSED");
  }
} finally {
  await browser.close();
}
