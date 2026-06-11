import { ENV } from "../_core/env";

/**
 * Server-side Mapbox Geocoding (v6 forward) for buyer ZIPs outside the seeded
 * centroid table — replaces the old "fall back to seeded distance" mock path
 * with a real lookup. Follows the recalls.ts house pattern: AbortController
 * timeout, success-only TTL cache with LRU cap, null on any failure.
 *
 * Uses the public (pk.) MAPBOX_TOKEN; Mapbox's API takes it as the standard
 * access_token query parameter.
 */

export type GeoPoint = { lat: number; lng: number };

const GEOCODE_URL = "https://api.mapbox.com/search/geocode/v6/forward";
const TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 200;

const cache = new Map<string, { at: number; value: GeoPoint }>();

export function geoConfigured(): boolean {
  return Boolean(ENV.mapboxToken);
}

/** Geocode a 5-digit US ZIP to its centroid. Null when unconfigured/unknown. */
export async function geocodeZip(zip: string): Promise<GeoPoint | null> {
  if (!geoConfigured() || !/^\d{5}$/.test(zip)) return null;

  const hit = cache.get(zip);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value: GeoPoint | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const params = new URLSearchParams({
        q: zip,
        country: "us",
        types: "postcode",
        limit: "1",
        access_token: ENV.mapboxToken,
      });
      const res = await fetch(`${GEOCODE_URL}?${params}`, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const json = (await res.json()) as {
          features?: { geometry?: { coordinates?: number[] } }[];
        };
        const coords = json?.features?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          const [lng, lat] = coords;
          if (Number.isFinite(lat) && Number.isFinite(lng)) value = { lat, lng };
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    value = null;
  }

  // Cache only successful lookups so transient failures retry next call.
  if (value !== null) {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(zip, { at: Date.now(), value });
  }
  return value;
}

const placeCache = new Map<string, { at: number; value: { zip: string; place: string } }>();

/**
 * Geocode a free-text US place ("Austin, TX") to its nearest representative
 * 5-digit ZIP using the same v6 forward endpoint with types=postcode. Null
 * when unconfigured, unknown, or on any failure.
 */
export async function geocodePlaceZip(
  query: string,
): Promise<{ zip: string; place: string } | null> {
  const q = query.trim();
  if (!geoConfigured() || q.length < 2) return null;

  const key = q.toLowerCase();
  const hit = placeCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value: { zip: string; place: string } | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const params = new URLSearchParams({
        q,
        country: "us",
        types: "postcode",
        limit: "1",
        access_token: ENV.mapboxToken,
      });
      const res = await fetch(`${GEOCODE_URL}?${params}`, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const json = (await res.json()) as {
          features?: { properties?: { name?: string; place_formatted?: string } }[];
        };
        const props = json?.features?.[0]?.properties;
        if (props?.name && /^\d{5}$/.test(props.name)) {
          value = { zip: props.name, place: props.place_formatted ?? q };
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    value = null;
  }

  if (value !== null) {
    if (placeCache.size >= CACHE_MAX) placeCache.delete(placeCache.keys().next().value!);
    placeCache.set(key, { at: Date.now(), value });
  }
  return value;
}

/** Test hook. */
export function _resetGeocodeCache(): void {
  cache.clear();
  placeCache.clear();
}
