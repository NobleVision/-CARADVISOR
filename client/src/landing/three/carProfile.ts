/**
 * Dimension-accurate sedan profile for the particle hero — traced from the
 * published dimensions of a real midsize sedan (10th-gen Honda Accord:
 * length 4882mm, width 1862, height 1450, wheelbase 2830, front/rear
 * overhang 946/1106, tire ⌀657, ground clearance 136) so the silhouette
 * carries real-world proportions: H/L 0.297, W/L 0.381, WB/L 0.580,
 * wheel ⌀/L 0.135, rear overhang > front. No model download needed —
 * the ratios are public data and the pipeline consumes exactly this.
 *
 * Scene scale: car length = 4.4 units (scale s = 4.4 / 4882mm).
 */

export type Point2 = [number, number];

/** Overall body envelope + greenhouse stations (all in scene units). */
export const BODY = {
  length: 4.4,
  halfL: 2.2,
  height: 1.307, // 1450mm · s  → H/L = 0.297
  halfWidthMax: 0.839, // 931mm · s → W/L = 0.381
  /** Beltline (window bottom) — the shoulder step, ≈ 0.62 · H. */
  beltY: 0.81,
  /** Plan-view widest station ≈ B-pillar. */
  widestX: -0.1,
  /** Greenhouse span: cowl … backlight base. */
  cabinFrontX: 0.78,
  cabinRearX: -1.6,
} as const;

/**
 * Closed side polygon: front bumper lip → hood → windshield (≈30° rake) →
 * roof peak at 53% aft → fastback backlight (≈22°) → decklid → tail →
 * underbody with the wheel-arch openings traced as r=0.40 arcs around each
 * axle, so wells are excluded from the fill and the shell draws arch lips.
 */
export const CAR_PROFILE: Point2[] = [
  [2.16, 0.2], // front bumper lower lip
  [2.2, 0.48], // bumper foremost (headlight level)
  [2.1, 0.62], // hood leading edge (0.47·H)
  [1.45, 0.72], // hood mid (≈9.5° slope)
  [0.78, 0.84], // cowl / windshield base (0.64·H, 32% aft)
  [0.4, 1.08], // windshield mid (slight glass bow)
  [0.03, 1.27], // windshield header
  [-0.13, 1.307], // roof peak — 53% aft
  [-0.6, 1.27], // roof rear
  [-1.02, 1.12], // C-pillar / backlight upper
  [-1.35, 0.96], // backlight mid (fastback glass ≈22°)
  [-1.6, 0.86], // backlight base / tulip panel
  [-1.95, 0.82], // decklid
  [-2.17, 0.83], // ducktail lip
  [-2.2, 0.62], // tail upper face / lamp line (rearmost)
  [-2.19, 0.4], // rear bumper face
  [-2.06, 0.2], // rear bumper lower lip
  [-1.86, 0.17], // rear valance
  [-1.579, 0.159], // rear arch rear lip      ┐
  [-1.566, 0.465], //                          │
  [-1.403, 0.642], //                          │ rear arch arc
  [-1.203, 0.696], // rear arch top            │ (cx −1.203, r 0.40)
  [-1.003, 0.642], //                          │
  [-0.84, 0.465], //                           │
  [-0.827, 0.159], // rear arch front lip     ┘
  [0.971, 0.159], // front arch rear lip (edge in between = rocker line)
  [0.984, 0.465], //                           ┐
  [1.147, 0.642], //                           │ front arch arc
  [1.347, 0.696], // front arch top            │ (cx +1.347, r 0.40)
  [1.547, 0.642], //                           │
  [1.71, 0.465], //                            │
  [1.723, 0.159], // front arch front lip     ┘
  [1.96, 0.17], // front valance → closes to the bumper lip
];

/** Wheel geometry (side view). Asymmetric axles: rear overhang > front. */
export const WHEELS = {
  centers: [1.347, -1.203] as const, // front, rear → wheelbase 2.551 (0.580·L)
  centerY: 0.296, // tire touches the ground plane at y = 0
  radius: 0.296, // ⌀/L = 0.135
  /** Arch opening radius — matches the arcs traced in CAR_PROFILE. */
  archRadius: 0.4,
};

/** Below-belt body plan: near-constant over the doors, ~80% pull-in at nose/tail. */
export function bodyHalfWidth(x: number): number {
  const span = x > BODY.widestX ? BODY.halfL - BODY.widestX : BODY.halfL + BODY.widestX;
  const t = Math.min(Math.abs(x - BODY.widestX) / span, 1);
  return BODY.halfWidthMax * (0.8 + 0.2 * Math.cos((t * Math.PI) / 2));
}

/**
 * Two-tier width: full body below the beltline (and over hood/decklid),
 * inset greenhouse above it — the shoulder step at the belt plus tumblehome
 * and fore/aft glass rake are what make the 3/4 view read as a real car.
 * Daylight-opening averages ≈ 72% of body width.
 */
export function halfWidth(x: number, y: number): number {
  const body = bodyHalfWidth(x);
  if (y <= BODY.beltY || x > BODY.cabinFrontX || x < BODY.cabinRearX) return body;
  const t = Math.min((y - BODY.beltY) / (BODY.height - BODY.beltY), 1); // 0 belt → 1 roof
  const m = (x - BODY.cabinRearX) / (BODY.cabinFrontX - BODY.cabinRearX); // 0 rear → 1 front
  const planEnd = 0.8 + 0.2 * Math.pow(Math.sin(Math.PI * m), 0.8); // pull-in at glass ends
  return body * 0.9 * (1 - 0.28 * t) * (1 - (1 - planEnd) * t);
}

/** Ray-casting point-in-polygon test against CAR_PROFILE. */
export function pointInProfile(x: number, y: number): boolean {
  let inside = false;
  const n = CAR_PROFILE.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = CAR_PROFILE[i];
    const [xj, yj] = CAR_PROFILE[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
