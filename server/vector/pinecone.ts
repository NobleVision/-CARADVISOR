import { ENV } from "../_core/env";
import type { Pinecone } from "@pinecone-database/pinecone";

/**
 * Pinecone semantic search over the seeded inventory + curated knowledge
 * base. Uses an integrated-inference index (Pinecone-hosted embedding model)
 * so text goes in and hits come out — no separate embedding key.
 *
 * Designed to be safely absent: every entry point returns null when the key
 * is missing, times out, or errors — callers keep their deterministic paths.
 * The SDK is loaded lazily AFTER the key guard so keyless deployments (and
 * the test suite) never even import it.
 *
 * The index is created/populated by `pnpm sync:pinecone` (scripts/sync-pinecone.mts).
 */

export const PINECONE_INDEX = "gogetter-vehicles";
export const LISTINGS_NAMESPACE = "listings";
export const KNOWLEDGE_NAMESPACE = "knowledge";

export type SemanticHit = { id: string; score: number };

const SEARCH_TIMEOUT_MS = 3500;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;

const cache = new Map<string, { at: number; value: SemanticHit[] }>();
let _client: Pinecone | null = null;

export function vectorConfigured(): boolean {
  return Boolean(ENV.pineconeApiKey);
}

async function getClient(): Promise<Pinecone> {
  if (!_client) {
    const { Pinecone: PineconeCtor } = await import("@pinecone-database/pinecone");
    _client = new PineconeCtor({ apiKey: ENV.pineconeApiKey });
  }
  return _client;
}

async function searchNamespace(
  namespace: string,
  text: string,
  topK: number,
): Promise<SemanticHit[]> {
  const pc = await getClient();
  const ns = pc.index(PINECONE_INDEX).namespace(namespace);
  const res = await ns.searchRecords({ query: { topK, inputs: { text } } });
  const hits = res?.result?.hits ?? [];
  // Wire format is {_id, _score}; tolerate the un-prefixed shape some SDK
  // docs show so a minor upstream rename can't zero out search results.
  return hits
    .map((h) => {
      const raw = h as { _id?: string; id?: string; _score?: number; score?: number };
      return { id: String(raw._id ?? raw.id ?? ""), score: Number(raw._score ?? raw.score) };
    })
    .filter((h) => h.id && Number.isFinite(h.score));
}

/**
 * Semantic search with timeout + short TTL cache. Returns null when the
 * service is unconfigured, slow, or failing — never throws.
 */
async function semanticSearch(
  namespace: string,
  text: string,
  topK: number,
): Promise<SemanticHit[] | null> {
  const query = text.trim();
  if (!vectorConfigured() || !query) return null;

  const key = `${namespace}|${topK}|${query.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  // Errors resolve to null so the race below can never reject.
  const inFlight = searchNamespace(namespace, query, topK).catch(() => null);
  const value = await Promise.race([
    inFlight,
    new Promise<null>((resolve) => setTimeout(resolve, SEARCH_TIMEOUT_MS, null)),
  ]);

  const store = (hits: SemanticHit[]) => {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), value: hits });
  };

  if (value === null) {
    // Timed out (typical on a cold instance: SDK load + index-host resolve).
    // Let the in-flight search finish in the background and warm the cache so
    // the NEXT query takes the semantic path. Failures stay uncached.
    void inFlight.then((late) => {
      if (late !== null) store(late);
    });
    return null;
  }

  // Cache only successful lookups so transient failures retry next call.
  store(value);
  return value;
}

/** Rank inventory listings by semantic similarity to a buyer's free text. */
export async function semanticSearchListings(
  text: string,
  opts: { topK?: number } = {},
): Promise<SemanticHit[] | null> {
  return semanticSearch(LISTINGS_NAMESPACE, text, opts.topK ?? 40);
}

/** Recall curated knowledge entries relevant to a free-form question. */
export async function semanticSearchKnowledge(
  text: string,
  topK = 2,
): Promise<SemanticHit[] | null> {
  return semanticSearch(KNOWLEDGE_NAMESPACE, text, topK);
}

/** Test hook: clear the cache and the memoized client. */
export function _resetVectorState(): void {
  cache.clear();
  _client = null;
}
