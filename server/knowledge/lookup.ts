import { KNOWLEDGE_ENTRIES, KNOWLEDGE_VERSION } from "./data";
import type { AdvisoryQuery, KnowledgeEntry, RiskLevel, VehicleAdvisory } from "./types";

/**
 * GOGETTER Reliability Index — lookup engine.
 *
 * Resolves curated knowledge entries against a vehicle (decoded VIN or
 * inventory listing). Handles model-name variance ("MAZDA3" / "Mazda 3" /
 * "Mazda3"), inclusive year ranges, engine-specific refinements, and the
 * manual-transmission exception for automatic-only defects.
 */

/** Uppercase and strip non-alphanumerics so "Mazda 3", "MAZDA3", "xB" all normalize. */
export function normalizeModelKey(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function makeMatches(queryMake: string, entryMake: string): boolean {
  const q = normalizeModelKey(queryMake);
  const e = normalizeModelKey(entryMake);
  return q === e || q.includes(e);
}

/**
 * One-direction trim-tolerant match: the listing model may carry a trim suffix
 * ("Focus SE" matches alias "Focus"), but a bare model never matches a longer
 * alias ("Corolla" must NOT match "Corolla Matrix").
 */
function modelMatches(queryModel: string, aliases: string[]): boolean {
  const q = normalizeModelKey(queryModel);
  if (!q) return false;
  return aliases.some((a) => {
    const alias = normalizeModelKey(a);
    return q === alias || q.startsWith(alias);
  });
}

function isManual(transmissionStyle?: string): boolean {
  return /manual/i.test(transmissionStyle ?? "");
}

/** Compare NHTSA displacement strings ("2.359999895") to rule prefixes ("2.4") at 1 decimal. */
function displacementMatches(queryDisp: string | undefined, ruleDisps: string[]): boolean {
  const q = parseFloat(queryDisp ?? "");
  if (!Number.isFinite(q)) return false;
  return ruleDisps.some((d) => {
    const r = parseFloat(d);
    return Number.isFinite(r) && q.toFixed(1) === r.toFixed(1);
  });
}

/** Resolve one matched entry into the advisory attached to scores/matches. */
function toAdvisory(entry: KnowledgeEntry, q: AdvisoryQuery): VehicleAdvisory {
  let severity = entry.severity;
  let delta = entry.scoreDelta;
  let detail = entry.detail;

  // Engine-specific refinement (e.g. Vibe 2.4L burns oil; VW 2.0T timing chain).
  const engineRule = entry.engineRules?.find((r) => displacementMatches(q.engineDisplacementL, r.displacements));
  if (engineRule) {
    severity = engineRule.severityOverride ?? severity;
    delta = engineRule.deltaOverride ?? delta;
    detail = `${detail} ${engineRule.note}`;
  }

  // Manual-transmission exception: automatic-only defects don't apply to a
  // confirmed manual. Listings carry no transmission data, so they always take
  // the conservative branch with the verify-first note.
  let waivedByManual = false;
  let transmissionNote: string | undefined;
  if (entry.transmissionCaveat?.manualIsFine && delta < 0) {
    if (isManual(q.transmissionStyle)) {
      waivedByManual = true;
      delta = 0;
    } else {
      transmissionNote = entry.transmissionCaveat.note;
    }
  }

  return {
    id: entry.id,
    severity,
    title: entry.title,
    detail,
    watchFor: entry.watchFor,
    ...(entry.whyBuy ? { whyBuy: entry.whyBuy } : {}),
    ...(transmissionNote ? { transmissionNote } : {}),
    ...(waivedByManual ? { waivedByManual: true } : {}),
    appliedDelta: delta,
    source: KNOWLEDGE_VERSION,
  };
}

/** All curated advisories that apply to the given vehicle. */
export function findAdvisories(q: AdvisoryQuery): VehicleAdvisory[] {
  if (!q.make || !q.model || !Number.isFinite(q.year)) return [];
  return KNOWLEDGE_ENTRIES.filter(
    (e) =>
      makeMatches(q.make, e.make) &&
      modelMatches(q.model, e.models) &&
      q.year >= e.yearFrom &&
      q.year <= e.yearTo,
  ).map((e) => toAdvisory(e, q));
}

/** Headline risk classification: any live "avoid" → high; live "caution" → caution. */
export function riskLevelFor(advisories: VehicleAdvisory[]): RiskLevel {
  if (advisories.some((a) => a.severity === "avoid" && !a.waivedByManual)) return "high";
  if (advisories.some((a) => a.severity === "caution" && !a.waivedByManual)) return "caution";
  return "clear";
}

/** One-line score note for an advisory, cited to the knowledge base. */
export function advisoryNote(a: VehicleAdvisory): string {
  if (a.waivedByManual) {
    return `${a.title} affects automatics only — this one decodes as a manual, the reliable configuration (${a.source}).`;
  }
  switch (a.severity) {
    case "avoid":
      return `Known defect for this model year range: ${a.title} (${a.source}).`;
    case "caution":
      return `Verify before buying: ${a.title} (${a.source}).`;
    case "value-pick":
      return `GOGETTER value pick: ${a.title} (${a.source}).`;
  }
}

/** Knowledge entries flagged as proven budget value picks. */
export function valuePickEntries(): KnowledgeEntry[] {
  return KNOWLEDGE_ENTRIES.filter((e) => e.severity === "value-pick");
}

/** Convenience: does this make/model/year hit a non-waived hard avoid? */
export function hasAvoidAdvisory(advisories: VehicleAdvisory[]): boolean {
  return advisories.some((a) => a.severity === "avoid" && !a.waivedByManual);
}
