import type { ScoreAdvisory } from "../../drizzle/schema";

/**
 * GOGETTER Reliability Index — domain types.
 *
 * The knowledge base captures battle-tested, model-year-specific reliability
 * intelligence (curated from real-world buyer research) that no spec sheet or
 * make-level heuristic can express: "2007-2017 automatic Nissan Sentras eat
 * their CVTs", "a Pontiac Vibe is a Toyota Matrix at a dead-brand discount".
 * Entries are pure versioned data; lookup lives in `lookup.ts`.
 */

export type AdvisorySeverity = "avoid" | "caution" | "value-pick";

export type AdvisoryCategory =
  | "transmission"
  | "engine"
  | "electrical"
  | "cooling"
  | "theft"
  | "rust"
  | "value"
  | "parts"
  | "maintenance";

export type RiskLevel = "clear" | "caution" | "high";

/** Engine-specific refinement of an entry (e.g. only the 2.4L burns oil). */
export type EngineRule = {
  /** Displacement prefixes in liters, compared to 1 decimal (e.g. "2.4"). */
  displacements: string[];
  /** Replaces the entry severity when the engine matches. */
  severityOverride?: AdvisorySeverity;
  /** Replaces the entry scoreDelta when the engine matches. */
  deltaOverride?: number;
  note: string;
};

export type KnowledgeEntry = {
  id: string;
  make: string;
  /** Canonical model name plus aliases ("Mazda3", "Mazda 3"). Matched after
   * normalization with equality or listing-startsWith-alias (so "Focus SE"
   * matches "Focus" but "Corolla" never matches "Corolla Matrix"). */
  models: string[];
  yearFrom: number;
  yearTo: number;
  severity: AdvisorySeverity;
  categories: AdvisoryCategory[];
  title: string;
  detail: string;
  whyBuy?: string[];
  watchFor: string[];
  /** Set when the defect only affects automatics (manuals are fine). */
  transmissionCaveat?: { manualIsFine: true; note: string };
  /** Engine-displacement refinements. */
  engineRules?: EngineRule[];
  /** Reliability-subscore delta: avoid ≈ -45, caution ≈ -12..-15, value-pick ≈ +6..+12. */
  scoreDelta: number;
  /** Extra model-specific pre-purchase checklist items. */
  checklistItems?: string[];
};

/** Inputs available when asking the knowledge base about a vehicle. Listings
 * have no transmission/engine data — those fields stay undefined and the
 * lookup takes the conservative (assume-automatic) branch. */
export type AdvisoryQuery = {
  make: string;
  model: string;
  year: number;
  transmissionStyle?: string;
  engineDisplacementL?: string;
};

/** The advisory shape attached to scores and matches (re-exported for server use). */
export type VehicleAdvisory = ScoreAdvisory;
