/**
 * Procedural fastback-GT side profile for the particle hero — no external 3D
 * model download. Coordinates are normalized: +x = nose, y up from the
 * ground plane at 0. The polygon is closed (last point connects to first).
 */

export type Point2 = [number, number];

/** Closed body-side polygon: front bumper → over the roof → tail → underside. */
export const CAR_PROFILE: Point2[] = [
  [2.15, 0.18], // front bumper lower lip
  [2.18, 0.34], // bumper face
  [2.08, 0.46], // hood leading edge
  [1.42, 0.58], // hood mid
  [0.82, 0.64], // cowl
  [0.42, 0.96], // windshield → roof front
  [-0.12, 1.08], // roof crown
  [-0.68, 1.02], // roof rear
  [-1.28, 0.80], // fastback glass
  [-1.82, 0.64], // rear deck
  [-2.10, 0.56], // ducktail tip
  [-2.16, 0.36], // tail face
  [-2.06, 0.18], // rear bumper lower
  [-1.64, 0.15], // behind rear wheel
  [-1.25, 0.20], // rear arch base
  [-0.84, 0.13], // rocker rear
  [0.84, 0.13], // rocker front
  [1.25, 0.20], // front arch base
  [1.64, 0.15], // ahead of front wheel
];

/** Wheel centers and geometry (side view). */
export const WHEELS = {
  centers: [1.25, -1.25] as const,
  centerY: 0.34,
  radius: 0.34,
  /** Wheel-arch exclusion radius — keeps the arches readable in the fill. */
  archRadius: 0.42,
};

/** Half-width of the body at longitudinal position x (taper at nose/tail). */
export function halfWidth(x: number): number {
  const t = Math.min(Math.abs(x) / 2.16, 1);
  return 0.4 * (0.6 + 0.4 * Math.cos((t * Math.PI) / 2));
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
