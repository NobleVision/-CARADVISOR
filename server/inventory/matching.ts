import type { BuyerCriteria, Listing, RankedMatch } from "./types";

/**
 * Make-level reliability heuristics (0-100), kept in sync conceptually with
 * server/scoring.ts. Duplicated locally so the matching engine has no hard
 * dependency on the VIN-decode-shaped scoring input.
 */
const MAKE_RELIABILITY: Record<string, number> = {
  TOYOTA: 95, LEXUS: 96, HONDA: 92, ACURA: 89, MAZDA: 90, SUBARU: 86,
  HYUNDAI: 83, KIA: 83, GENESIS: 85, NISSAN: 78, INFINITI: 77, BUICK: 82,
  CHEVROLET: 76, GMC: 75, FORD: 74, DODGE: 72, CHRYSLER: 69, JEEP: 68,
  RAM: 72, VOLKSWAGEN: 73, BMW: 72, "MERCEDES-BENZ": 71, AUDI: 71,
  VOLVO: 75, PORSCHE: 80, TESLA: 79, MINI: 70, "LAND ROVER": 62,
  JAGUAR: 63, CADILLAC: 73, LINCOLN: 76, MITSUBISHI: 76, FIAT: 64,
};
const DEFAULT_RELIABILITY = 75;
const CURRENT_YEAR = 2026;

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function letterGrade(score: number): string {
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

export function reliabilityForMake(make: string): number {
  const key = make.trim().toUpperCase();
  return (
    MAKE_RELIABILITY[key] ??
    Object.entries(MAKE_RELIABILITY).find(([k]) => key.includes(k))?.[1] ??
    DEFAULT_RELIABILITY
  );
}

/**
 * GOGETTER quality score for a listing (0-100), derived from make reliability,
 * age, mileage-vs-expected, and fuel-type efficiency. Mirrors the VIN scoring
 * engine's spirit but operates on listing fields.
 */
export function qualityScoreForListing(listing: Listing): { score: number; grade: string } {
  const reliability = reliabilityForMake(listing.make);
  const age = Math.max(0, CURRENT_YEAR - listing.year);

  const expectedMiles = Math.max(1, age * 12000);
  const ratio = listing.mileage / expectedMiles;
  const mileScore = clamp(100 - (ratio - 1) * 55 - age * 2.2);

  let efficiency = 70;
  if (listing.fuel === "EV") efficiency = 95;
  else if (listing.fuel === "Hybrid") efficiency = 88;
  else if (listing.fuel === "Diesel") efficiency = 74;
  else efficiency = clamp(40 + listing.mpg * 1.1);

  const overall = clamp(
    Math.round(reliability * 0.45 + mileScore * 0.33 + efficiency * 0.22),
  );
  return { score: overall, grade: letterGrade(overall) };
}

/**
 * Score how well a single listing fits the buyer's criteria. Returns a
 * RankedMatch with an overall 0-100 matchScore plus per-dimension fit.
 */
export function scoreListingFit(listing: Listing, c: BuyerCriteria): RankedMatch {
  const reasons: string[] = [];

  // --- price fit (closer to but under budget is best) ---
  const priceRatio = listing.price / Math.max(1, c.maxPrice);
  let priceFit: number;
  if (priceRatio <= 1) {
    // 0.7-1.0 of budget = great value usage; very cheap is fine too
    priceFit = clamp(100 - Math.abs(0.85 - priceRatio) * 70);
    if (priceRatio <= 0.8) reasons.push("Comfortably under budget.");
  } else {
    priceFit = clamp(100 - (priceRatio - 1) * 280); // over budget penalised hard
  }

  // --- mileage fit (new cars are effectively zero-mile) ---
  const isNew = listing.condition === "New";
  const mileageFit = isNew
    ? 100
    : clamp(100 - (listing.mileage / Math.max(1, c.maxMileage)) * 70);
  if (isNew) reasons.push("Brand new — no wear and full factory warranty.");
  else if (listing.mileage <= c.maxMileage * 0.6) reasons.push("Low mileage for the segment.");

  // --- distance fit ---
  const distanceFit = clamp(100 - (listing.distanceMiles / Math.max(1, c.maxDistance)) * 60);
  if (listing.distanceMiles <= c.maxDistance * 0.5) reasons.push("Close enough for an easy test drive.");

  // --- reliability fit (seller type & condition adjust buyer confidence) ---
  let reliabilityFit = reliabilityForMake(listing.make);
  if (reliabilityFit >= 90) reasons.push(`${listing.make} is known for excellent dependability.`);
  else if (reliabilityFit < 68) reasons.push(`${listing.make} carries higher repair risk — weigh carefully.`);
  // New cars and franchise/CPO carry less ownership uncertainty; private sales
  // carry slightly more (no dealer warranty, unknown servicing).
  if (isNew) reliabilityFit = clamp(reliabilityFit + 6);
  else if (listing.sellerType === "Franchise Dealer") reliabilityFit = clamp(reliabilityFit + 2);
  else if (listing.sellerType === "Private Seller") {
    reliabilityFit = clamp(reliabilityFit - 4);
    reasons.push("Private sale — get a pre-purchase inspection and verify the title.");
  }

  // --- efficiency fit ---
  let efficiencyFit: number;
  if (listing.fuel === "EV") efficiencyFit = 98;
  else if (listing.fuel === "Hybrid") efficiencyFit = 90;
  else efficiencyFit = clamp(35 + listing.mpg * 1.3);
  if (listing.fuel === "EV") reasons.push("Electric — lowest running costs.");
  else if (listing.fuel === "Hybrid") reasons.push("Hybrid efficiency keeps fuel costs down.");

  // --- weighting from buyer dials ---
  // priceVsReliability: 0 = price-first, 100 = reliability-first
  const relW = c.priceVsReliability / 100; // 0..1
  const priceW = 1 - relW;
  const effPriority = c.efficiencyPriority / 100; // 0..1

  // Base weights then blended with explicit buyer priorities.
  const wPrice = 0.30 * (0.5 + priceW);
  const wReliability = 0.30 * (0.5 + relW);
  const wEfficiency = 0.14 * (0.5 + effPriority);
  const wMileage = 0.16;
  const wDistance = 0.10;
  const wSum = wPrice + wReliability + wEfficiency + wMileage + wDistance;

  const matchScore = clamp(
    Math.round(
      (priceFit * wPrice +
        reliabilityFit * wReliability +
        efficiencyFit * wEfficiency +
        mileageFit * wMileage +
        distanceFit * wDistance) /
        wSum,
    ),
  );

  const quality = qualityScoreForListing(listing);

  return {
    listing,
    matchScore,
    qualityScore: quality.score,
    qualityGrade: quality.grade,
    fit: {
      price: Math.round(priceFit),
      reliability: Math.round(reliabilityFit),
      efficiency: Math.round(efficiencyFit),
      distance: Math.round(distanceFit),
      mileage: Math.round(mileageFit),
    },
    reasons,
  };
}

/** True when a listing satisfies the buyer's hard filters. */
export function passesHardFilters(listing: Listing, c: BuyerCriteria): boolean {
  const condition = c.condition ?? "Any";
  if (condition !== "Any" && listing.condition && listing.condition !== condition) return false;
  if (listing.price > c.maxPrice) return false;
  if (c.minPrice && listing.price < c.minPrice) return false;
  // New cars effectively have no mileage; only gate used cars on mileage.
  if (listing.condition !== "New" && listing.mileage > c.maxMileage) return false;
  if (listing.distanceMiles > c.maxDistance) return false;
  if (c.bodyStyles?.length > 0 && !c.bodyStyles.includes(listing.bodyStyle)) return false;
  if (c.fuels?.length > 0 && !c.fuels.includes(listing.fuel)) return false;
  if (c.sellerTypes && c.sellerTypes.length > 0 && listing.sellerType && !c.sellerTypes.includes(listing.sellerType)) return false;
  return true;
}

/**
 * Filter inventory by hard constraints, rank by weighted fit, and return the
 * top N matches (default 5). Quality acts as a tiebreaker so we never surface
 * a high-fit-but-low-quality "on life support" car above a solid one.
 */
export function rankInventory(
  inventory: Listing[],
  criteria: BuyerCriteria,
  limit = 5,
): RankedMatch[] {
  const eligible = inventory.filter((l) => passesHardFilters(l, criteria));
  const ranked = eligible
    .map((l) => scoreListingFit(l, criteria))
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
      return a.listing.price - b.listing.price;
    });
  return ranked.slice(0, limit);
}
