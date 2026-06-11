import { describe, expect, it } from "vitest";
import type { RankedMatch } from "../inventory/types";
import { blendSemantic } from "./blend";

function match(id: string, matchScore: number, qualityScore = 80, price = 10_000): RankedMatch {
  return {
    listing: { id, price } as RankedMatch["listing"],
    matchScore,
    qualityScore,
    qualityGrade: "B",
    fit: { price: 0, reliability: 0, efficiency: 0, distance: 0, mileage: 0 },
    reasons: [],
  };
}

describe("blendSemantic", () => {
  it("returns matches untouched when there are no hits", () => {
    const matches = [match("a", 90), match("b", 80)];
    expect(blendSemantic(matches, [])).toBe(matches);
  });

  it("reorders when semantic relevance disagrees with the deterministic rank", () => {
    // "b" is the best semantic hit (normalized to 1), "a" the worst (0).
    const matches = [match("a", 82), match("b", 78)];
    const out = blendSemantic(matches, [
      { id: "b", score: 0.92 },
      { id: "a", score: 0.71 },
    ]);
    // a: 0.75*82 + 0 = 62 ; b: 0.75*78 + 25 = 84
    expect(out.map((m) => m.listing.id)).toEqual(["b", "a"]);
    expect(out[0].matchScore).toBe(84);
    expect(out[1].matchScore).toBe(62);
  });

  it("leaves matches without a hit at their deterministic score", () => {
    const matches = [match("a", 82), match("c", 60)];
    const out = blendSemantic(matches, [
      { id: "a", score: 0.9 },
      { id: "b", score: 0.7 },
    ]);
    const c = out.find((m) => m.listing.id === "c")!;
    expect(c.matchScore).toBe(60);
  });

  it("treats a single hit as fully relevant and never mutates inputs", () => {
    const matches = [match("a", 60), match("b", 70)];
    const out = blendSemantic(matches, [{ id: "a", score: 0.83 }]);
    const a = out.find((m) => m.listing.id === "a")!;
    expect(a.matchScore).toBe(Math.round(0.75 * 60 + 25)); // 70
    expect(matches[0].matchScore).toBe(60); // original untouched
  });

  it("breaks score ties by quality then price, like rankInventory", () => {
    const a = match("a", 80, 70, 12_000);
    const b = match("b", 80, 90, 9_000);
    const out = blendSemantic([a, b], [{ id: "zzz", score: 0.5 }]);
    expect(out.map((m) => m.listing.id)).toEqual(["b", "a"]);
  });
});
