/**
 * Dev-only verification for the particle-car geometry: measures real-car
 * proportion ratios against pass ranges and renders side / front / 3/4
 * orthographic projections to PNG so the silhouette can be eyeballed
 * without opening the browser.
 *
 * Run: pnpm tsx scripts/preview-car-points.mts   → tmp/car-preview/*.png
 */
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { buildCarPointCloud } from "../client/src/landing/three/buildCarPointCloud";
import { BODY, WHEELS } from "../client/src/landing/three/carProfile";

const OUT = "tmp/car-preview";
mkdirSync(OUT, { recursive: true });

const { positions } = buildCarPointCloud(14000);
const n = positions.length / 3;

// ── Measurements from the generated cloud ──
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxAbsZ = 0;
let roofMaxZ = 0;
for (let i = 0; i < n; i++) {
  const x = positions[i * 3];
  const y = positions[i * 3 + 1];
  const z = positions[i * 3 + 2];
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
  const az = Math.abs(z);
  if (az > maxAbsZ) maxAbsZ = az;
  if (y > 1.15 && az > roofMaxZ) roofMaxZ = az;
}
const L = maxX - minX;
const H = maxY;
const W = maxAbsZ * 2;
const WB = WHEELS.centers[0] - WHEELS.centers[1];
const frontOverhang = maxX - WHEELS.centers[0];
const rearOverhang = WHEELS.centers[1] - minX;

const checks: [string, number, number, number][] = [
  ["height / length", H / L, 0.28, 0.31],
  ["width / length", W / L, 0.36, 0.4],
  ["wheelbase / length", WB / L, 0.57, 0.59],
  ["wheel ⌀ / length", (WHEELS.radius * 2) / L, 0.125, 0.145],
  ["rear / front overhang", rearOverhang / frontOverhang, 1.05, 1.35],
  ["roof width / body width", roofMaxZ / maxAbsZ, 0.55, 0.75],
];

console.log("Proportion gate (real-sedan targets):");
let failed = 0;
for (const [label, value, lo, hi] of checks) {
  const ok = value >= lo && value <= hi;
  if (!ok) failed++;
  console.log(`  ${ok ? "✓" : "✗"} ${label.padEnd(24)} ${value.toFixed(3)}  [${lo}–${hi}]`);
}
if (failed) process.exitCode = 1;

// ── Orthographic preview renders ──
type Project = (x: number, y: number, z: number) => [number, number];

function render(name: string, project: Project, guides = false) {
  const PX = 130; // px per scene unit
  const pad = 60;
  // Project all points, find extent
  const pts: [number, number][] = [];
  let pMinX = Infinity, pMaxX = -Infinity, pMinY = Infinity, pMaxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const [u, v] = project(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    pts.push([u, v]);
    if (u < pMinX) pMinX = u;
    if (u > pMaxX) pMaxX = u;
    if (v < pMinY) pMinY = v;
    if (v > pMaxY) pMaxY = v;
  }
  const w = Math.ceil((pMaxX - pMinX) * PX + pad * 2);
  const h = Math.ceil((pMaxY - pMinY) * PX + pad * 2);
  const sx = (u: number) => (u - pMinX) * PX + pad;
  const sy = (v: number) => h - ((v - pMinY) * PX + pad); // flip y

  // All 14k points as ONE path of 1px rect subpaths (fast for resvg).
  let d = "";
  for (const [u, v] of pts) {
    d += `M${sx(u).toFixed(1)} ${sy(v).toFixed(1)}h1.4v1.4h-1.4z`;
  }

  let guideSvg = "";
  if (guides) {
    const ground = sy(0);
    const belt = sy(BODY.beltY);
    guideSvg = `
      <line x1="0" y1="${ground}" x2="${w}" y2="${ground}" stroke="#3a4154" stroke-width="1"/>
      <line x1="0" y1="${belt}" x2="${w}" y2="${belt}" stroke="#3a4154" stroke-width="1" stroke-dasharray="6 5"/>
      ${WHEELS.centers
        .map(
          (cx) =>
            `<circle cx="${sx(cx)}" cy="${sy(WHEELS.centerY)}" r="${WHEELS.radius * PX}" fill="none" stroke="#4a5168" stroke-width="1"/>`,
        )
        .join("")}`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="#12141A"/>
    ${guideSvg}
    <path d="${d}" fill="#E9C97A" fill-opacity="0.55"/>
  </svg>`;

  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1440 } }).render().asPng();
  writeFileSync(`${OUT}/${name}.png`, png);
  console.log(`  → ${OUT}/${name}.png`);
}

console.log("Rendering previews:");
render("side", (x, y) => [x, y], true);
render("front", (_x, y, z) => [z, y]);
// Mirror the scene's group rotation: rotY −0.55 then rotX 0.07, project (x, y).
const ry = -0.55, rx = 0.07;
render("three-quarter", (x, y, z) => {
  const x1 = x * Math.cos(ry) + z * Math.sin(ry);
  const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
  const y2 = y * Math.cos(rx) - z1 * Math.sin(rx);
  return [x1, y2];
});

console.log(failed ? `\n${failed} ratio check(s) FAILED` : "\nAll proportion checks passed.");
