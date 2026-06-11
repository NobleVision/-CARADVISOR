import { ENV } from "../_core/env";

/**
 * Brave Search API client — real web results for the live-market scan and
 * model web intel. Brave is METERED (small monthly credit), so this module is
 * deliberately stingy: 6h success-only cache, ~1.1s minimum spacing between
 * request starts (1 rps plan limit), small result counts, and it is only ever
 * called behind explicit user actions — never on page load.
 *
 * recalls.ts house pattern: AbortController timeout, TTL cache with LRU cap,
 * null on any failure (callers hide their panels).
 */

export type BraveResult = {
  title: string;
  url: string;
  description: string;
  age?: string;
  siteName?: string;
  thumbnail?: string;
};

const SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 100;
const MIN_INTERVAL_MS = 1100;

const cache = new Map<string, { at: number; value: BraveResult[] }>();
let queue: Promise<void> = Promise.resolve();
let lastStartAt = 0;

export function braveConfigured(): boolean {
  return Boolean(ENV.braveSearchApiKey);
}

/** Serialize request starts with ≥1.1s spacing (free-plan rate limit). */
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastStartAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastStartAt = Date.now();
    return task();
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

const stripTags = (s: string) => s.replace(/<[^>]+>/g, "");

export async function braveSearch(
  q: string,
  opts: { count?: number; freshness?: "pd" | "pw" | "pm" | "py" } = {},
): Promise<BraveResult[] | null> {
  const query = q.trim();
  if (!braveConfigured() || !query) return null;
  const count = Math.min(Math.max(opts.count ?? 10, 1), 20);

  const key = `${query.toLowerCase()}|${count}|${opts.freshness ?? ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value: BraveResult[] | null = null;
  try {
    value = await throttled(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const params = new URLSearchParams({
          q: query,
          count: String(count),
          country: "us",
          search_lang: "en",
        });
        if (opts.freshness) params.set("freshness", opts.freshness);
        const res = await fetch(`${SEARCH_URL}?${params}`, {
          signal: controller.signal,
          headers: {
            accept: "application/json",
            "x-subscription-token": ENV.braveSearchApiKey,
          },
        });
        // 429/payment-required and friends: report failure, never cache it.
        if (!res.ok) return null;
        const json = (await res.json()) as {
          web?: {
            results?: {
              title?: string;
              url?: string;
              description?: string;
              age?: string;
              profile?: { name?: string };
              meta_url?: { hostname?: string };
              thumbnail?: { src?: string };
            }[];
          };
        };
        const rows = json?.web?.results ?? [];
        return rows
          .filter((r) => r.url && r.title)
          .map((r) => ({
            title: stripTags(r.title ?? ""),
            url: r.url!,
            description: stripTags(r.description ?? ""),
            age: r.age,
            siteName: r.profile?.name ?? r.meta_url?.hostname,
            thumbnail: r.thumbnail?.src,
          }));
      } finally {
        clearTimeout(timer);
      }
    });
  } catch {
    value = null;
  }

  if (value !== null) {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), value });
  }
  return value;
}

/**
 * Shared "what does the web say about this model" search — used by both
 * vehicle.webIntel and the advisor context block, so the 6h cache means at
 * most one metered request per model-year per instance.
 */
export async function modelIntelSearch(
  yearLabel: string | number,
  make: string,
  model: string,
): Promise<BraveResult[] | null> {
  const label = `${yearLabel} ${make} ${model}`.trim();
  if (!label) return null;
  return braveSearch(`${label} common problems reliability owner complaints`, { count: 6 });
}

/** Test hook. */
export function _resetBraveCache(): void {
  cache.clear();
  lastStartAt = 0;
  queue = Promise.resolve();
}
