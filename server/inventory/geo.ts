/**
 * Lightweight ZIP-based distance estimation.
 *
 * For the seeded demo we ship approximate lat/lng centroids for the DC-metro
 * ZIPs used by our dealers/sellers, plus a handful of common nearby ZIPs a
 * buyer might enter. When the buyer provides a ZIP we recompute each listing's
 * distance from that point (haversine). If a ZIP is unknown we fall back to the
 * listing's seeded `distanceMiles`.
 *
 * In production this would be replaced by a real geocoding lookup; the public
 * API (`distanceFromZip`) stays identical.
 */

import { geocodeZip } from "../geo/mapboxGeocode";

type LatLng = { lat: number; lng: number };

// Approximate centroids (good enough for a metro-scale distance estimate).
const ZIP_CENTROIDS: Record<string, LatLng> = {
  // Dealer / seller ZIPs (Northern VA, MD, DC)
  "22150": { lat: 38.772, lng: -77.184 }, // Springfield VA
  "22151": { lat: 38.802, lng: -77.205 }, // Springfield VA
  "22201": { lat: 38.887, lng: -77.094 }, // Arlington VA
  "22203": { lat: 38.873, lng: -77.114 }, // Arlington VA
  "22301": { lat: 38.819, lng: -77.059 }, // Alexandria VA
  "22304": { lat: 38.814, lng: -77.106 }, // Alexandria VA
  "22030": { lat: 38.846, lng: -77.306 }, // Fairfax VA
  "22031": { lat: 38.861, lng: -77.265 }, // Fairfax VA
  "22042": { lat: 38.864, lng: -77.190 }, // Falls Church VA
  "20814": { lat: 38.983, lng: -77.097 }, // Bethesda MD
  "20850": { lat: 39.084, lng: -77.181 }, // Rockville MD
  "20852": { lat: 39.049, lng: -77.120 }, // Rockville MD
  "20910": { lat: 39.000, lng: -77.030 }, // Silver Spring MD
  "20782": { lat: 38.965, lng: -76.962 }, // Hyattsville MD
  "20878": { lat: 39.118, lng: -77.245 }, // Gaithersburg MD
  "20190": { lat: 38.957, lng: -77.339 }, // Reston VA
  "22102": { lat: 38.943, lng: -77.224 }, // Tysons VA
  "22101": { lat: 38.933, lng: -77.175 }, // McLean VA
  "22182": { lat: 38.927, lng: -77.260 }, // Vienna/Tysons VA
  "20001": { lat: 38.912, lng: -77.018 }, // Washington DC
  // A few common buyer ZIPs further out
  "20105": { lat: 38.943, lng: -77.560 }, // Aldie VA
  "22033": { lat: 38.873, lng: -77.388 }, // Fairfax VA (Fair Oaks)
  "20171": { lat: 38.928, lng: -77.397 }, // Herndon VA
  "21201": { lat: 39.295, lng: -76.620 }, // Baltimore MD
  "22401": { lat: 38.301, lng: -77.470 }, // Fredericksburg VA
};

function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3958.8; // miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** True when we can compute a real distance for this buyer ZIP. */
export function isKnownZip(zip: string | undefined): boolean {
  return !!zip && /^\d{5}$/.test(zip) && zip in ZIP_CENTROIDS;
}

/**
 * Distance in miles from a buyer ZIP to a listing ZIP. Returns null when either
 * ZIP is unknown so the caller can fall back to the seeded distance.
 */
export function distanceFromZip(buyerZip: string | undefined, listingZip: string): number | null {
  if (!buyerZip || !(buyerZip in ZIP_CENTROIDS)) return null;
  if (!(listingZip in ZIP_CENTROIDS)) return null;
  const d = haversineMiles(ZIP_CENTROIDS[buyerZip], ZIP_CENTROIDS[listingZip]);
  return Math.max(1, Math.round(d));
}

/** Centroid for a seeded ZIP (all listing ZIPs ship one); null otherwise. */
export function centroidForZip(zip: string | undefined): LatLng | null {
  if (!zip || !/^\d{5}$/.test(zip)) return null;
  return ZIP_CENTROIDS[zip] ?? null;
}

/** Distance in miles from an arbitrary point to a listing's ZIP centroid. */
export function distanceFromPoint(point: LatLng, listingZip: string): number | null {
  const target = ZIP_CENTROIDS[listingZip];
  if (!target) return null;
  return Math.max(1, Math.round(haversineMiles(point, target)));
}

/**
 * Resolve the buyer's location: the seeded centroid table first (free,
 * instant), then live Mapbox geocoding for any other US ZIP — the real-data
 * replacement this file's header promised. Null when both miss (caller keeps
 * the seeded-distance fallback).
 */
export async function resolveBuyerPoint(zip: string | undefined): Promise<LatLng | null> {
  const local = centroidForZip(zip);
  if (local) return local;
  if (!zip || !/^\d{5}$/.test(zip)) return null;
  return geocodeZip(zip);
}

/**
 * Deterministic per-listing map jitter (~±0.008° ≈ ±0.55 mi) so pins sharing
 * a ZIP centroid don't stack. FNV-1a over the id → stable across requests.
 */
export function jitterForId(id: string): { dLat: number; dLng: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = ((h >>> 0) % 1000) / 1000 - 0.5;
  const h2 = Math.imul((h ^ 0x9e3779b9) >>> 0, 16777619);
  const b = ((h2 >>> 0) % 1000) / 1000 - 0.5;
  return { dLat: a * 0.016, dLng: b * 0.016 };
}
