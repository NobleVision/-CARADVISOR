/**
 * Free-text buyer location → representative 5-digit ZIP.
 *
 * The Find-My-Car engine keys distance off a ZIP, but buyers think in city
 * names. Resolution order mirrors the geo house style: the seeded metro table
 * first (free, instant), then live Mapbox forward geocoding (types=postcode),
 * then the keyless Zippopotam.us API when the buyer included a state. Returns
 * a clear, actionable message when a city can't be pinned down.
 */

import { geoConfigured, geocodePlaceZip } from "./mapboxGeocode";

export type LocationResolution =
  | { ok: true; zip: string; label: string; source: "zip" | "seeded" | "mapbox" | "zippopotam" }
  | { ok: false; message: string };

const US_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]);

// Cities for every seeded ZIP centroid (see server/inventory/geo.ts) so the
// demo metro resolves instantly with no network or API key.
const SEEDED_CITY_ZIPS: Record<string, { zip: string; state: string; label: string }> = {
  "springfield": { zip: "22150", state: "VA", label: "Springfield, VA" },
  "arlington": { zip: "22201", state: "VA", label: "Arlington, VA" },
  "alexandria": { zip: "22301", state: "VA", label: "Alexandria, VA" },
  "fairfax": { zip: "22030", state: "VA", label: "Fairfax, VA" },
  "falls church": { zip: "22042", state: "VA", label: "Falls Church, VA" },
  "bethesda": { zip: "20814", state: "MD", label: "Bethesda, MD" },
  "rockville": { zip: "20850", state: "MD", label: "Rockville, MD" },
  "silver spring": { zip: "20910", state: "MD", label: "Silver Spring, MD" },
  "hyattsville": { zip: "20782", state: "MD", label: "Hyattsville, MD" },
  "gaithersburg": { zip: "20878", state: "MD", label: "Gaithersburg, MD" },
  "reston": { zip: "20190", state: "VA", label: "Reston, VA" },
  "tysons": { zip: "22102", state: "VA", label: "Tysons, VA" },
  "mclean": { zip: "22101", state: "VA", label: "McLean, VA" },
  "vienna": { zip: "22182", state: "VA", label: "Vienna, VA" },
  "washington": { zip: "20001", state: "DC", label: "Washington, DC" },
  "aldie": { zip: "20105", state: "VA", label: "Aldie, VA" },
  "herndon": { zip: "20171", state: "VA", label: "Herndon, VA" },
  "baltimore": { zip: "21201", state: "MD", label: "Baltimore, MD" },
  "fredericksburg": { zip: "22401", state: "VA", label: "Fredericksburg, VA" },
};

const ZIPPOPOTAM_URL = "https://api.zippopotam.us/us";
const TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 200;

const zippoCache = new Map<string, { at: number; value: string }>();

/** Split "City, ST" / "city st" into parts; null when it can't be a place. */
export function parseCityState(query: string): { city: string; state?: string } | null {
  const cleaned = query.trim().replace(/\s+/g, " ");
  if (!cleaned || /\d/.test(cleaned)) return null;

  let city = cleaned;
  let state: string | undefined;
  const commaIdx = cleaned.indexOf(",");
  if (commaIdx >= 0) {
    city = cleaned.slice(0, commaIdx).trim();
    const st = cleaned.slice(commaIdx + 1).trim().toUpperCase();
    if (!US_STATES.has(st)) return null;
    state = st;
  } else {
    const words = cleaned.split(" ");
    const last = words[words.length - 1]?.toUpperCase();
    if (words.length > 1 && last && US_STATES.has(last)) {
      state = last;
      city = words.slice(0, -1).join(" ");
    }
  }

  if (city.length < 2 || !/^[a-zA-Z][a-zA-Z .'-]*$/.test(city)) return null;
  return { city, state };
}

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/** Keyless Zippopotam.us city lookup (state required). Null on any failure. */
async function zippopotamCityZip(city: string, state: string): Promise<string | null> {
  const key = `${state}/${city.toLowerCase()}`;
  const hit = zippoCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value: string | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(
        `${ZIPPOPOTAM_URL}/${state.toLowerCase()}/${encodeURIComponent(city.toLowerCase())}`,
        { signal: controller.signal, headers: { accept: "application/json" } },
      );
      if (res.ok) {
        const json = (await res.json()) as { places?: { "post code"?: string }[] };
        const zip = json?.places?.[0]?.["post code"];
        if (zip && /^\d{5}$/.test(zip)) value = zip;
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    value = null;
  }

  if (value !== null) {
    if (zippoCache.size >= CACHE_MAX) zippoCache.delete(zippoCache.keys().next().value!);
    zippoCache.set(key, { at: Date.now(), value });
  }
  return value;
}

/** Resolve a ZIP-or-city query to a 5-digit ZIP, or explain why we couldn't. */
export async function resolveLocationToZip(query: string): Promise<LocationResolution> {
  const q = query.trim();
  if (!q) return { ok: false, message: "Enter a 5-digit ZIP code or a city." };
  if (/^\d{5}$/.test(q)) return { ok: true, zip: q, label: `ZIP ${q}`, source: "zip" };

  const parsed = parseCityState(q);
  if (!parsed) {
    return { ok: false, message: `Couldn't read "${q}" as a location — enter a 5-digit ZIP or a city like "Fairfax, VA".` };
  }

  const seeded = SEEDED_CITY_ZIPS[parsed.city.toLowerCase()];
  if (seeded && (!parsed.state || parsed.state === seeded.state)) {
    return { ok: true, zip: seeded.zip, label: seeded.label, source: "seeded" };
  }

  if (geoConfigured()) {
    const hit = await geocodePlaceZip(parsed.state ? `${parsed.city}, ${parsed.state}` : parsed.city);
    if (hit) return { ok: true, zip: hit.zip, label: hit.place, source: "mapbox" };
  }

  if (parsed.state) {
    const zip = await zippopotamCityZip(parsed.city, parsed.state);
    if (zip) {
      return { ok: true, zip, label: `${titleCase(parsed.city)}, ${parsed.state}`, source: "zippopotam" };
    }
    return { ok: false, message: `Couldn't find "${q}" — check the spelling, or enter a 5-digit ZIP.` };
  }

  return { ok: false, message: `Couldn't pinpoint "${q}" — add the state (e.g. "${titleCase(parsed.city)}, VA") or enter a 5-digit ZIP.` };
}

/** Test hook. */
export function _resetCityZipCache(): void {
  zippoCache.clear();
}
