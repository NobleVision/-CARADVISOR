import type { VehicleAdvisory } from "../knowledge/types";
import { hasAvoidAdvisory } from "../knowledge/lookup";
import type { Listing, TrustSignal } from "./types";

/**
 * Rule-based seller/listing trust assessment — the "GOGETTER Approved" /
 * red-flag layer. Buyer-first by design: dealer-funded sites are
 * disincentivized from flagging bad inventory; we are not.
 *
 * Heuristics only (no external reputation data yet): photo provenance,
 * seller tenure/CPO cues, seller type, and the curated knowledge base.
 */

const CURRENT_YEAR = 2026;

/** Expected resale price decay used by the too-good-to-be-true detector. */
function roughExpectedPrice(listing: Listing): number {
  const age = Math.max(0, CURRENT_YEAR - listing.year);
  // Crude depreciation curve: ~16%/yr from a modest $24k compact baseline,
  // floored at $2.5k. Only used to spot dramatic underpricing on trap models.
  return Math.max(2500, 24000 * Math.pow(0.84, age));
}

/**
 * The classic trap from the budget golden rules: a known-defect model that is
 * newer/lower-mileage than its price implies. "It's priced low because the
 * current owner knows the transmission is about to slip for the final time."
 */
function isSuspiciousDeal(listing: Listing, advisories: VehicleAdvisory[]): boolean {
  if (!hasAvoidAdvisory(advisories)) return false;
  if (listing.condition !== "Used") return false;
  const age = Math.max(0, CURRENT_YEAR - listing.year);
  const lowMileageForAge = listing.mileage < age * 11000;
  const newish = age <= 13;
  const dramaticallyCheap = listing.price <= roughExpectedPrice(listing) * 0.75;
  return newish && (lowMileageForAge || dramaticallyCheap);
}

/** Assess trust cues for one listing given its knowledge-base advisories. */
export function trustForListing(listing: Listing, advisories: VehicleAdvisory[]): TrustSignal {
  const reasons: string[] = [];
  const avoid = hasAvoidAdvisory(advisories);
  const suspicious = isSuspiciousDeal(listing, advisories);

  if (avoid) {
    reasons.push("This model year range has a documented serious defect (GOGETTER Reliability Index).");
    if (suspicious) {
      reasons.push(
        "Priced suspiciously well for its age/mileage on a known-defect model — the seller may know what's coming.",
      );
    }
    return { level: "flagged", reasons, ...(suspicious ? { suspiciousDeal: true } : {}) };
  }

  // Positive trust cues.
  const hasDealerPhotos = listing.photos.some((p) => p.source === "dealer");
  const hasTenure = Boolean(listing.sellerTenure && listing.sellerTenure.trim());
  const isCpo = /certified|cpo/i.test(listing.sellerTenure ?? "");
  const isFranchise = listing.sellerType === "Franchise Dealer";

  if (hasDealerPhotos) reasons.push("Real seller-supplied photos of this exact car.");
  if (isCpo) reasons.push("Certified Pre-Owned availability noted.");
  else if (hasTenure) reasons.push(`Established seller — ${listing.sellerTenure}.`);
  if (isFranchise) reasons.push("Franchise dealer — recourse and reconditioning standards.");

  const positives = [hasDealerPhotos, hasTenure || isCpo, isFranchise].filter(Boolean).length;
  if (positives >= 2) return { level: "approved", reasons };

  if (listing.sellerType === "Private Seller") {
    reasons.push("Private sale — verify title and get a pre-purchase inspection.");
  }
  return { level: "neutral", reasons };
}
