import type { DecodedVehicle, ScoreBreakdown } from "../drizzle/schema";
import { advisoryNote, findAdvisories, hasAvoidAdvisory, riskLevelFor } from "./knowledge/lookup";

/**
 * Make-level reliability heuristics (0-100), derived from widely reported
 * long-term dependability patterns. These are heuristic baselines for the
 * scoring engine, NOT real-time data, and are clearly framed as such in the UI.
 */
const MAKE_RELIABILITY: Record<string, number> = {
  TOYOTA: 95,
  LEXUS: 96,
  HONDA: 92,
  ACURA: 89,
  MAZDA: 90,
  SUBARU: 86,
  HYUNDAI: 83,
  KIA: 83,
  GENESIS: 85,
  NISSAN: 78,
  INFINITI: 77,
  BUICK: 82,
  CHEVROLET: 76,
  GMC: 75,
  FORD: 74,
  DODGE: 72,
  CHRYSLER: 69,
  JEEP: 68,
  RAM: 72,
  VOLKSWAGEN: 73,
  BMW: 72,
  "MERCEDES-BENZ": 71,
  AUDI: 71,
  VOLVO: 75,
  PORSCHE: 80,
  TESLA: 79,
  MINI: 70,
  "LAND ROVER": 62,
  JAGUAR: 63,
  CADILLAC: 73,
  LINCOLN: 76,
  MITSUBISHI: 76,
  FIAT: 64,
  ALFA: 62,
  SCION: 90, // Toyota sub-brand — Toyota powertrains throughout
};

const DEFAULT_RELIABILITY = 75;

export function letterGrade(score: number): string {
  if (score >= 93) return "A+";
  if (score >= 88) return "A";
  if (score >= 83) return "A-";
  if (score >= 78) return "B+";
  if (score >= 73) return "B";
  if (score >= 68) return "B-";
  if (score >= 63) return "C+";
  if (score >= 58) return "C";
  if (score >= 53) return "C-";
  if (score >= 45) return "D";
  return "F";
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Compute a transparent, explainable used-car quality score (0-100)
 * from decoded specs, reliability heuristics, age, and mileage.
 */
export function scoreVehicle(vehicle: DecodedVehicle, mileage?: number): ScoreBreakdown {
  const notes: string[] = [];
  const currentYear = new Date().getFullYear();
  const year = parseInt(vehicle.modelYear, 10);
  const age = Number.isFinite(year) ? Math.max(0, currentYear - year) : 8;

  // 1. Reliability (make-based heuristic)
  const makeKey = vehicle.make.trim().toUpperCase();
  let reliability =
    MAKE_RELIABILITY[makeKey] ??
    Object.entries(MAKE_RELIABILITY).find(([k]) => makeKey.includes(k))?.[1] ??
    DEFAULT_RELIABILITY;
  if (reliability >= 90) notes.push(`${vehicle.make} has an excellent long-term dependability reputation.`);
  else if (reliability >= 80) notes.push(`${vehicle.make} is generally considered above-average for reliability.`);
  else if (reliability < 68) notes.push(`${vehicle.make} historically carries higher ownership and repair risk.`);

  // 1b. Curated model-year knowledge (GOGETTER Reliability Index): known
  // defects pull the reliability subscore into failing territory; proven
  // value picks earn a bonus. Negative deltas floor at 15 so the subscore
  // stays meaningful rather than pinning to zero.
  const advisories = Number.isFinite(year)
    ? findAdvisories({
        make: vehicle.make,
        model: vehicle.model,
        year,
        transmissionStyle: vehicle.transmissionStyle,
        engineDisplacementL: vehicle.engineDisplacementL,
      })
    : [];
  for (const a of advisories) {
    reliability =
      a.appliedDelta < 0
        ? Math.max(15, Math.min(100, reliability + a.appliedDelta))
        : clamp(reliability + a.appliedDelta);
    notes.push(advisoryNote(a));
  }

  // 2. Safety (count of decoded driver-assist & airbag features)
  const safetyCount = vehicle.safetyFeatures.length;
  let safety = clamp(45 + safetyCount * 6);
  if (safetyCount >= 8) {
    safety = clamp(safety + 5);
    notes.push("Equipped with a strong suite of modern safety features.");
  } else if (safetyCount <= 2) {
    notes.push("Limited safety technology was decoded for this vehicle.");
  }

  // 3. Age & Mileage
  let ageMileage: number;
  if (typeof mileage === "number" && mileage > 0) {
    const expectedMiles = age * 12000;
    const ratio = expectedMiles > 0 ? mileage / expectedMiles : 1;
    // ratio < 1 = below-average mileage (good); > 1 = above-average (worse)
    let mileScore = clamp(100 - (ratio - 1) * 55 - age * 2.2);
    ageMileage = clamp(mileScore);
    if (ratio < 0.8) notes.push("Lower-than-average mileage for its age — a strong positive.");
    else if (ratio > 1.3) notes.push("Higher-than-average mileage for its age — inspect wear items closely.");
    if (mileage > 150000) notes.push("Over 150k miles: budget for major maintenance.");
  } else {
    ageMileage = clamp(92 - age * 4.5);
    notes.push("Mileage was not provided; the age-only estimate will sharpen once you add it.");
  }
  if (age <= 3) notes.push("Relatively new — likely still within or near factory warranty windows.");
  else if (age >= 12) notes.push("Older vehicle; parts availability and wear should be verified.");

  // 4. Efficiency / drivetrain modernity
  let efficiency = 70;
  const fuel = vehicle.fuelType.toLowerCase();
  const elec = vehicle.electrificationLevel.toLowerCase();
  if (elec.includes("bev")) {
    efficiency = 95;
    notes.push("Fully electric drivetrain — lowest running costs, no fuel or oil changes.");
  } else if (elec.includes("phev") || elec.includes("plug")) {
    efficiency = 90;
  } else if (elec.includes("hev") || elec.includes("hybrid") || fuel.includes("hybrid")) {
    efficiency = 88;
    notes.push("Hybrid powertrain offers strong fuel economy.");
  } else if (fuel.includes("diesel")) {
    efficiency = 74;
  } else if (fuel.includes("gas")) {
    const cyl = parseInt(vehicle.engineCylinders, 10);
    if (Number.isFinite(cyl)) {
      if (cyl <= 4) efficiency = 78;
      else if (cyl === 6) efficiency = 68;
      else efficiency = 58;
    }
  }

  // Weighted overall. A documented catastrophic defect (non-waived "avoid"
  // advisory) caps the overall at D territory — fresh tires and low miles
  // can't outweigh a transmission that's known to die.
  let overall = clamp(
    Math.round(reliability * 0.4 + safety * 0.2 + ageMileage * 0.28 + efficiency * 0.12),
  );
  if (hasAvoidAdvisory(advisories)) overall = Math.min(overall, 50);

  return {
    overall,
    grade: letterGrade(overall),
    reliability: Math.round(reliability),
    safety: Math.round(safety),
    ageMileage: Math.round(ageMileage),
    efficiency: Math.round(efficiency),
    notes,
    ...(advisories.length > 0
      ? { advisories, riskLevel: riskLevelFor(advisories) }
      : {}),
  };
}
