import type { RankedMatch } from "../inventory/types";
import type { SemanticHit } from "./pinecone";

/**
 * Blend semantic relevance into deterministically-ranked matches.
 *
 * Semantic hit scores are min–max normalized within the hit set (cosine
 * similarities cluster in a narrow band, so relative position is the signal),
 * then mixed into each match's score: (1−w)·deterministic + w·semantic·100.
 * Matches without a semantic hit keep their deterministic score untouched, so
 * a stale index entry can demote nothing. Re-sorts using the same tiebreakers
 * as rankInventory (score desc, quality desc, price asc).
 */
export function blendSemantic(
  matches: RankedMatch[],
  hits: SemanticHit[],
  weight = 0.25,
): RankedMatch[] {
  if (matches.length === 0 || hits.length === 0) return matches;

  let min = Infinity;
  let max = -Infinity;
  for (const h of hits) {
    if (h.score < min) min = h.score;
    if (h.score > max) max = h.score;
  }
  const span = max - min;
  const semById = new Map(
    hits.map((h) => [h.id, span > 0 ? (h.score - min) / span : 1] as const),
  );

  const blended = matches.map((m) => {
    const sem = semById.get(m.listing.id);
    if (sem === undefined) return m;
    const matchScore = Math.round((1 - weight) * m.matchScore + weight * sem * 100);
    return { ...m, matchScore };
  });

  blended.sort(
    (a, b) =>
      b.matchScore - a.matchScore ||
      b.qualityScore - a.qualityScore ||
      a.listing.price - b.listing.price,
  );
  return blended;
}
