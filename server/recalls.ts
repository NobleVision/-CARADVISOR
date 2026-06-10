/**
 * Free NHTSA recall enrichment (no key, no cost) — the first slice of the
 * "micro layer" public-records story. Queried by make/model/year so it works
 * for both real decoded VINs and demo inventory listings.
 *
 * Defensive by design: 5s timeout, tolerant response parsing, and null on any
 * failure (null = "couldn't check right now"; count 0 = "checked, none found").
 */

export type RecallRecord = {
  component: string;
  summary: string;
  remedy?: string;
  reportDate?: string;
  campaignNumber?: string;
};

export type RecallResult = {
  count: number;
  /** Up to 10 most relevant records (count reflects the full total). */
  recalls: RecallRecord[];
  source: "NHTSA";
};

const RECALLS_URL = "https://api.nhtsa.gov/recalls/recallsByVehicle";
const TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const CACHE_MAX = 200;

const cache = new Map<string, { at: number; value: RecallResult | null }>();

/** Test hook. */
export function _resetRecallCache(): void {
  cache.clear();
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseRecallRow(r: Record<string, unknown>): RecallRecord {
  return {
    component: str(r.Component ?? r.component),
    summary: str(r.Summary ?? r.summary),
    remedy: str(r.Remedy ?? r.remedy) || undefined,
    reportDate: str(r.ReportReceivedDate ?? r.reportReceivedDate) || undefined,
    campaignNumber: str(r.NHTSACampaignNumber ?? r.nhtsaCampaignNumber) || undefined,
  };
}

/** Fetch open recall campaigns for a make/model/year from NHTSA's public API. */
export async function fetchRecalls(
  make: string,
  model: string,
  modelYear: string | number,
): Promise<RecallResult | null> {
  const year = String(modelYear).trim();
  if (!make.trim() || !model.trim() || !/^\d{4}$/.test(year)) return null;

  const key = `${make.trim().toLowerCase()}|${model.trim().toLowerCase()}|${year}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value: RecallResult | null = null;
  try {
    const url =
      `${RECALLS_URL}?make=${encodeURIComponent(make.trim())}` +
      `&model=${encodeURIComponent(model.trim())}` +
      `&modelYear=${encodeURIComponent(year)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
      if (res.ok) {
        const json = (await res.json()) as Record<string, unknown>;
        const list = (json.results ?? json.Results ?? []) as Record<string, unknown>[];
        if (Array.isArray(list)) {
          const rows = list.map(parseRecallRow).filter((r) => r.component || r.summary);
          const countRaw = json.Count ?? json.count;
          const count = typeof countRaw === "number" ? countRaw : rows.length;
          value = { count, recalls: rows.slice(0, 10), source: "NHTSA" };
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    value = null;
  }

  // Only cache successful lookups — a transient failure shouldn't suppress
  // recall data for hours (React Query already de-dupes client-side retries).
  if (value !== null) {
    if (cache.size >= CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { at: Date.now(), value });
  }
  return value;
}
