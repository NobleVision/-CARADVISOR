import { CAR_PROFILE, WHEELS, halfWidth, pointInProfile } from "./carProfile";

export type CarPointCloud = {
  /** Assembled target positions (xyz triplets). */
  positions: Float32Array;
  /** Scattered start positions on a loose sphere shell. */
  scatter: Float32Array;
  /** One random float per point (stagger/twinkle seed). */
  rand: Float32Array;
};

function insideWheelArch(x: number, y: number): boolean {
  for (const cx of WHEELS.centers) {
    const dx = x - cx;
    const dy = y - WHEELS.centerY;
    if (dx * dx + dy * dy < WHEELS.archRadius * WHEELS.archRadius) return true;
  }
  return false;
}

/**
 * Builds the particle car: ~50% volumetric body fill, ~28% silhouette shell
 * along the profile edges (what makes it READ as a car), ~22% wheel rings.
 */
export function buildCarPointCloud(count = 14000): CarPointCloud {
  const positions = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const rand = new Float32Array(count);

  const nBody = Math.floor(count * 0.5);
  const nShell = Math.floor(count * 0.28);
  const nWheels = count - nBody - nShell;

  let i = 0;
  const put = (x: number, y: number, z: number) => {
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    // Scattered start: a loose sphere shell around the scene.
    const r = 3.5 + Math.random() * 2.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    scatter[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    scatter[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    scatter[i * 3 + 2] = r * Math.cos(phi);
    rand[i] = Math.random();
    i++;
  };

  // ── Volumetric body fill (rejection sampling, arches excluded) ──
  let placed = 0;
  let guard = 0;
  while (placed < nBody && guard < nBody * 40) {
    guard++;
    const x = (Math.random() * 2 - 1) * 2.18;
    const y = Math.random() * 1.1;
    if (!pointInProfile(x, y) || insideWheelArch(x, y)) continue;
    const z = (Math.random() * 2 - 1) * halfWidth(x);
    put(x, y, z);
    placed++;
  }

  // ── Silhouette shell along the profile edges, biased to the flanks ──
  const edges: { ax: number; ay: number; bx: number; by: number; len: number }[] = [];
  let totalLen = 0;
  for (let e = 0; e < CAR_PROFILE.length; e++) {
    const [ax, ay] = CAR_PROFILE[e];
    const [bx, by] = CAR_PROFILE[(e + 1) % CAR_PROFILE.length];
    const len = Math.hypot(bx - ax, by - ay);
    edges.push({ ax, ay, bx, by, len });
    totalLen += len;
  }
  for (let s = 0; s < nShell; s++) {
    // Pick an edge weighted by length, then a point along it.
    let pick = Math.random() * totalLen;
    let edge = edges[0];
    for (const e of edges) {
      if (pick <= e.len) {
        edge = e;
        break;
      }
      pick -= e.len;
    }
    const t = Math.random();
    const x = edge.ax + (edge.bx - edge.ax) * t + (Math.random() * 2 - 1) * 0.02;
    const y = edge.ay + (edge.by - edge.ay) * t + (Math.random() * 2 - 1) * 0.02;
    const side = Math.random() < 0.5 ? -1 : 1;
    const z = side * halfWidth(x) * (0.86 + Math.random() * 0.14);
    put(x, y, z);
  }

  // ── Wheels: a rim band + sparse hub ring per wheel per side ──
  for (let w = 0; w < nWheels; w++) {
    const cx = WHEELS.centers[w % 2];
    const side = w % 4 < 2 ? 1 : -1;
    const theta = Math.random() * Math.PI * 2;
    const isHub = Math.random() < 0.16;
    const radius = isHub ? 0.05 + Math.random() * 0.07 : 0.25 + Math.random() * 0.09;
    const x = cx + radius * Math.cos(theta);
    const y = WHEELS.centerY + radius * Math.sin(theta);
    const z = side * (halfWidth(cx) * (0.92 + Math.random() * 0.1));
    put(x, y, z);
  }

  // Backfill any rejection-sampling shortfall with extra shell points.
  while (i < count) {
    const edge = edges[Math.floor(Math.random() * edges.length)];
    const t = Math.random();
    const x = edge.ax + (edge.bx - edge.ax) * t;
    const y = edge.ay + (edge.by - edge.ay) * t;
    put(x, y, (Math.random() < 0.5 ? -1 : 1) * halfWidth(x));
  }

  return { positions, scatter, rand };
}
