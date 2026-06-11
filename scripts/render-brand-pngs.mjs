/**
 * One-shot brand rasterizer: renders the SVG brand assets to the PNG set the
 * web needs (favicon fallback, apple-touch-icon, manifest icon, OG image).
 * Run: node scripts/render-brand-pngs.mjs   (outputs are committed)
 */
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brand = join(root, "client", "public", "brand");

function render(svgPath, outPath, width) {
  const svg = readFileSync(svgPath, "utf8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: true },
  });
  writeFileSync(outPath, resvg.render().asPng());
  console.log(`✓ ${outPath.replace(root, "").replace(/\\/g, "/")} (${width}w)`);
}

// NOTE: favicon-32 / apple-touch-icon / icon-512 / caradvisor-logo-nowords are
// now resized from the raster brand mark docs/images/caradvisor-logo-nowords.png
// (not the legacy favicon.svg) — do not regenerate them here.
render(join(brand, "og-image.svg"), join(brand, "og-image.png"), 1200);
render(join(brand, "gogetter-mark.svg"), join(brand, "preview-mark.png"), 512);
render(join(brand, "gogetter-lockup.svg"), join(brand, "preview-lockup.png"), 1020);
