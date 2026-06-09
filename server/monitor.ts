import { inventoryProvider } from "./inventory/provider";
import { rankInventory } from "./inventory/matching";
import {
  addNotification,
  getActiveSavedSearches,
  getAllSavedVehicles,
  markSavedSearchChecked,
  recordPrice,
  updateSavedVehiclePrice,
} from "./db";
import type { BuyerCriteria, Listing } from "./inventory/types";

/**
 * The price-drop / new-match monitor. Runs from the Vercel Cron function
 * (`api/cron/monitor.ts`) and the local dev route (`POST /api/cron/monitor`).
 *
 * NOTE: the seeded inventory is static, so this applies a small, clearly-labeled
 * "market simulation" to saved vehicles so the price-drop + alerts features are
 * demonstrable. Swapping in a real listings provider makes the same logic track
 * genuine price changes and new listings with no other changes.
 */

const PRICE_DROP_STEP = 0.985; // ~1.5% nudge per run
const PRICE_FLOOR_RATIO = 0.82; // never below 82% of the original asking price

function formatUSD(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function nextPrice(prev: number, base: number): number {
  const floor = Math.round(base * PRICE_FLOOR_RATIO);
  return Math.max(Math.round(prev * PRICE_DROP_STEP), floor);
}

/** Deterministic ~50% selector that varies by day, so not every car drops every run. */
function dropsThisRun(listingId: string): boolean {
  const dayBucket = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  let h = dayBucket >>> 0;
  for (let i = 0; i < listingId.length; i++) {
    h = (h * 31 + listingId.charCodeAt(i)) >>> 0;
  }
  return h % 2 === 0;
}

export type MonitorResult = {
  priceDrops: number;
  newMatches: number;
  checkedSearches: number;
  checkedVehicles: number;
};

export async function runMonitor(): Promise<MonitorResult> {
  const inventory = await inventoryProvider.getInventory();
  const byId = new Map(inventory.map((l) => [l.id, l] as const));

  let priceDrops = 0;
  let newMatches = 0;

  // --- Price-drop tracking on saved vehicles ---
  const savedVehicles = await getAllSavedVehicles();
  const trackable = savedVehicles.filter((v) => !!v.listingId);
  for (const v of trackable) {
    const listing = byId.get(v.listingId!);
    const base = v.priceAtSave ?? listing?.price ?? v.lastKnownPrice ?? null;
    const prev = v.lastKnownPrice ?? v.priceAtSave ?? listing?.price ?? null;
    if (base == null || prev == null) continue;

    // Guarantee a visible drop the first time we observe a freshly-saved car.
    const neverDropped = prev === base;
    const np = neverDropped || dropsThisRun(v.listingId!) ? nextPrice(prev, base) : prev;

    if (np < prev) {
      await recordPrice({ listingId: v.listingId!, vin: v.vin, price: np });
      await updateSavedVehiclePrice(v.id, np);
      priceDrops += 1;
      await addNotification({
        userId: v.userId,
        type: "price_drop",
        title: `Price drop on ${v.nickname ?? `${v.make ?? ""} ${v.model ?? ""}`.trim()}`,
        body: `Now ${formatUSD(np)} — down ${formatUSD(prev - np)} from ${formatUSD(
          prev
        )} (${formatUSD(base)} when you saved it).`,
        listingId: v.listingId,
        vin: v.vin,
        data: { from: prev, to: np, base },
      });
    }
  }

  // --- New-match alerts on active saved searches ---
  const searches = await getActiveSavedSearches();
  for (const s of searches) {
    const criteria = s.criteria as unknown as BuyerCriteria;
    let ranked;
    try {
      ranked = rankInventory(inventory, criteria, 8);
    } catch {
      // Skip malformed criteria rather than failing the whole run.
      await markSavedSearchChecked(s.id, s.lastSeenListingIds ?? []);
      continue;
    }
    const currentIds = ranked.map((m) => m.listing.id);
    const prevSeen = s.lastSeenListingIds ?? null;
    const fresh =
      prevSeen == null ? currentIds : currentIds.filter((id) => !prevSeen.includes(id));

    if (fresh.length > 0) {
      newMatches += fresh.length;
      const sample = fresh
        .map((id) => byId.get(id))
        .filter((l): l is Listing => !!l)
        .slice(0, 3)
        .map((l) => `${l.year} ${l.make} ${l.model} — ${formatUSD(l.price)}`);
      await addNotification({
        userId: s.userId,
        type: "new_match",
        title: `${fresh.length} new match${fresh.length === 1 ? "" : "es"} for "${
          s.name ?? "your saved search"
        }"`,
        body: sample.join(" · "),
        savedSearchId: s.id,
        data: { listingIds: fresh },
      });
    }
    await markSavedSearchChecked(s.id, currentIds);
  }

  return {
    priceDrops,
    newMatches,
    checkedSearches: searches.length,
    checkedVehicles: trackable.length,
  };
}
