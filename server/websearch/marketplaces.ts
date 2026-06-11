import type { BraveResult } from "./brave";

/**
 * Pure helpers that classify raw web-search results by car marketplace so
 * the "Live market scan" panel can badge and prioritize real listing pages.
 */

const MARKETPLACES: { name: string; domains: string[] }[] = [
  { name: "Cars.com", domains: ["cars.com"] },
  { name: "AutoTrader", domains: ["autotrader.com"] },
  { name: "CarGurus", domains: ["cargurus.com"] },
  { name: "Carfax", domains: ["carfax.com"] },
  { name: "Edmunds", domains: ["edmunds.com"] },
  { name: "TrueCar", domains: ["truecar.com"] },
  { name: "CarMax", domains: ["carmax.com"] },
  { name: "Carvana", domains: ["carvana.com"] },
  { name: "Craigslist", domains: ["craigslist.org"] },
  { name: "Facebook Marketplace", domains: ["facebook.com"] },
];

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Marketplace display name for a URL, or null for general web results. */
export function marketplaceFor(url: string): string | null {
  const host = hostnameOf(url);
  if (!host) return null;
  for (const m of MARKETPLACES) {
    if (m.domains.some((d) => host === d || host.endsWith(`.${d}`))) return m.name;
  }
  return null;
}

export type TaggedResult = BraveResult & { marketplace: string | null };

/**
 * Tag every result with its marketplace and order listing pages first
 * (stable within each group), so the panel leads with actual inventory.
 */
export function tagAndRankResults(results: BraveResult[]): TaggedResult[] {
  return results
    .map((r, i) => ({ ...r, marketplace: marketplaceFor(r.url), i }))
    .sort((a, b) => Number(b.marketplace !== null) - Number(a.marketplace !== null) || a.i - b.i)
    .map(({ i: _i, ...rest }) => rest);
}
