import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { inventoryProvider } from "../inventory/provider";
import { rankInventory } from "../inventory/matching";
import { generateNarratives } from "../inventory/recommend";
import { listingToDecodedVehicle } from "../inventory/adapt";
import { distanceFromZip, isKnownZip } from "../inventory/geo";
import { scoreVehicle, letterGrade } from "../scoring";
import { CONFIG_OPTIONS } from "../inventory/options";
import {
  saveVehicle,
  recordPrice,
  createSavedSearch,
  getSavedSearches,
  setSavedSearchActive,
  deleteSavedSearch,
  getPriceHistory,
} from "../db";
import type { BodyStyle, FuelKind, Listing, SellerType } from "../inventory/types";

/** Persist a single inventory listing into the user's Garage (saved vehicles). */
async function saveListingForUser(userId: number, listing: Listing) {
  const vehicle = listingToDecodedVehicle(listing);
  const score = scoreVehicle(vehicle, listing.condition === "New" ? undefined : listing.mileage);
  await saveVehicle({
    userId,
    vin: listing.vin,
    listingId: listing.id,
    make: listing.make,
    model: listing.model,
    modelYear: String(listing.year),
    mileage: listing.condition === "New" ? 0 : listing.mileage,
    score: score.overall,
    grade: score.grade,
    priceAtSave: listing.price,
    lastKnownPrice: listing.price,
    nickname: `${listing.year} ${listing.make} ${listing.model}`,
    notes: `${listing.condition} · ${listing.sellerType} · ${listing.dealerName} (${listing.city}, ${listing.state}) · listed ${formatPrice(listing.price)}`,
    vehicleData: vehicle,
    scoreData: score,
  });
  // Seed the price-history baseline so the Garage sparkline has a starting point.
  await recordPrice({ listingId: listing.id, vin: listing.vin, price: listing.price });
}

function formatPrice(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const BODY_STYLES = [
  "Sedan", "SUV", "Truck", "Coupe", "Hatchback", "Minivan", "Convertible", "Wagon",
] as const;
const FUELS = ["Gas", "Hybrid", "EV", "Diesel"] as const;
const SELLER_TYPES = ["Franchise Dealer", "Independent Dealer", "Private Seller"] as const;

const criteriaSchema = z.object({
  condition: z.enum(["New", "Used", "Any"]).default("Used"),
  maxPrice: z.number().int().positive().max(2_000_000),
  minPrice: z.number().int().nonnegative().optional(),
  zip: z.string().regex(/^\d{5}$/).optional(),
  maxDistance: z.number().int().positive().max(500),
  bodyStyles: z.array(z.enum(BODY_STYLES)).default([]),
  fuels: z.array(z.enum(FUELS)).default([]),
  sellerTypes: z.array(z.enum(SELLER_TYPES)).default([]),
  maxMileage: z.number().int().positive().max(500_000),
  priceVsReliability: z.number().int().min(0).max(100),
  efficiencyPriority: z.number().int().min(0).max(100),
  limit: z.number().int().min(1).max(10).optional(),
});

/**
 * Apply buyer ZIP to recompute each listing's distance from the buyer. Falls
 * back to the seeded distance when ZIPs are unknown.
 */
function applyZipDistance(inventory: Listing[], zip: string | undefined): Listing[] {
  if (!isKnownZip(zip)) return inventory;
  return inventory.map((l) => {
    const d = distanceFromZip(zip, l.zip);
    return d == null ? l : { ...l, distanceMiles: d };
  });
}

/** Human-readable summary used as a default name for a saved search. */
function describeCriteria(c: z.infer<typeof criteriaSchema>): string {
  const parts: string[] = [];
  parts.push(c.condition === "Any" ? "Any condition" : c.condition);
  if (c.bodyStyles.length) parts.push(c.bodyStyles.join("/"));
  if (c.fuels.length) parts.push(c.fuels.join("/"));
  parts.push(`under ${formatPrice(c.maxPrice)}`);
  if (c.zip) parts.push(`within ${c.maxDistance}mi of ${c.zip}`);
  return parts.join(" · ");
}

export const findRouter = router({
  /** Distinct facet values to drive the intake form (from current inventory). */
  facets: publicProcedure.query(async () => {
    const inv = await inventoryProvider.getInventory();
    const used = inv.filter((l) => l.condition === "Used");
    const prices = inv.map((l) => l.price);
    const mileages = used.map((l) => l.mileage);
    const distances = inv.map((l) => l.distanceMiles);
    return {
      total: inv.length,
      newCount: inv.filter((l) => l.condition === "New").length,
      usedCount: used.length,
      bodyStyles: BODY_STYLES as readonly BodyStyle[],
      fuels: FUELS as readonly FuelKind[],
      sellerTypes: SELLER_TYPES as readonly SellerType[],
      priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
      mileageRange: { min: Math.min(...mileages), max: Math.max(...mileages) },
      maxDistance: Math.max(...distances),
    };
  }),

  /**
   * Core discovery: filter + rank seeded inventory against buyer criteria, then
   * attach AI narratives to the shortlist. Returns how many cars were scanned
   * vs. shortlisted so the UI can tell the "5 of thousands" story.
   */
  search: publicProcedure
    .input(criteriaSchema)
    .mutation(async ({ input }) => {
      const rawInventory = await inventoryProvider.getInventory();
      const inventory = applyZipDistance(rawInventory, input.zip);
      const criteria = {
        condition: input.condition,
        maxPrice: input.maxPrice,
        minPrice: input.minPrice,
        zip: input.zip,
        maxDistance: input.maxDistance,
        bodyStyles: input.bodyStyles,
        fuels: input.fuels,
        sellerTypes: input.sellerTypes,
        maxMileage: input.maxMileage,
        priceVsReliability: input.priceVsReliability,
        efficiencyPriority: input.efficiencyPriority,
      };

      const eligibleCount = inventory.filter((l) =>
        (criteria.condition === "Any" || l.condition === criteria.condition) &&
        l.price <= criteria.maxPrice &&
        (!criteria.minPrice || l.price >= criteria.minPrice) &&
        (l.condition === "New" || l.mileage <= criteria.maxMileage) &&
        l.distanceMiles <= criteria.maxDistance &&
        (criteria.bodyStyles.length === 0 || criteria.bodyStyles.includes(l.bodyStyle)) &&
        (criteria.fuels.length === 0 || criteria.fuels.includes(l.fuel)) &&
        (criteria.sellerTypes.length === 0 || criteria.sellerTypes.includes(l.sellerType)),
      ).length;

      const matches = rankInventory(inventory, criteria, input.limit ?? 5);
      const narratives = await generateNarratives(matches, criteria);

      return {
        scanned: inventory.length,
        eligible: eligibleCount,
        shortlisted: matches.length,
        zipApplied: isKnownZip(input.zip),
        matches: matches.map((m) => ({
          ...m,
          narrative: narratives[m.listing.id] ?? null,
        })),
      };
    }),

  /**
   * New-car browse: group new inventory by model so buyers shop on reputation,
   * warranty, MSRP and efficiency rather than vehicle history. Returns one entry
   * per model with its lowest available price and a representative listing.
   */
  newCars: publicProcedure
    .input(
      z
        .object({
          bodyStyles: z.array(z.enum(BODY_STYLES)).default([]),
          fuels: z.array(z.enum(FUELS)).default([]),
          maxPrice: z.number().int().positive().optional(),
          sort: z.enum(["reputation", "price", "efficiency"]).default("reputation"),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const opts = input ?? { bodyStyles: [], fuels: [], sort: "reputation" as const };
      const inv = await inventoryProvider.getInventory();
      let news = inv.filter((l) => l.condition === "New");
      if (opts.bodyStyles && opts.bodyStyles.length > 0)
        news = news.filter((l) => opts.bodyStyles!.includes(l.bodyStyle));
      if (opts.fuels && opts.fuels.length > 0)
        news = news.filter((l) => opts.fuels!.includes(l.fuel));
      if (opts.maxPrice) news = news.filter((l) => l.price <= opts.maxPrice!);

      // Group by make+model, keep the cheapest listing as representative.
      const byModel = new Map<string, Listing[]>();
      for (const l of news) {
        const key = `${l.make}__${l.model}`;
        const arr = byModel.get(key) ?? [];
        arr.push(l);
        byModel.set(key, arr);
      }

      const models = Array.from(byModel.values()).map((listings) => {
        const sorted = [...listings].sort((a, b) => a.price - b.price);
        const rep = sorted[0];
        const vehicle = listingToDecodedVehicle(rep);
        const score = scoreVehicle(vehicle, undefined);
        return {
          key: `${rep.make}__${rep.model}`,
          make: rep.make,
          model: rep.model,
          bodyStyle: rep.bodyStyle,
          fuel: rep.fuel,
          mpg: rep.mpg,
          fromPrice: sorted[0].price,
          msrp: rep.msrp,
          warranty: rep.warranty,
          modelReputation: rep.modelReputation,
          qualityScore: score.overall,
          qualityGrade: score.grade,
          trims: sorted.map((l) => ({
            id: l.id,
            vin: l.vin,
            trim: l.trim,
            price: l.price,
            msrp: l.msrp,
            exteriorColor: l.exteriorColor,
            dealerName: l.dealerName,
            city: l.city,
            state: l.state,
            distanceMiles: l.distanceMiles,
            photos: l.photos,
          })),
        };
      });

      const sort = opts.sort ?? "reputation";
      models.sort((a, b) => {
        if (sort === "price") return a.fromPrice - b.fromPrice;
        if (sort === "efficiency") return b.mpg - a.mpg;
        return b.qualityScore - a.qualityScore;
      });

      return { count: models.length, models };
    }),

  /** Fetch a single listing by id (for a detail view / deep link). */
  listing: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const listing = await inventoryProvider.getListingById(input.id);
      if (!listing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found." });
      }
      return listing;
    }),

  /**
   * Listing-backed report for a deep link from the shortlist. Seeded inventory
   * VINs are synthetic and won't resolve against NHTSA, so we adapt the listing
   * into the same DecodedVehicle shape and run the existing scoring engine.
   * Returns null when the VIN isn't part of our inventory (caller then falls
   * back to a live NHTSA decode for real, user-entered VINs).
   */
  reportByVin: publicProcedure
    .input(z.object({ vin: z.string().min(1) }))
    .query(async ({ input }) => {
      const listing = await inventoryProvider.getListingByVin(input.vin);
      if (!listing) return null;
      const vehicle = listingToDecodedVehicle(listing);
      const score = scoreVehicle(vehicle, listing.condition === "New" ? undefined : listing.mileage);
      return { source: "inventory" as const, listing, vehicle, score };
    }),

  /** Save a single match (by listing id) to the signed-in user's Garage. */
  saveMatch: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await inventoryProvider.getListingById(input.listingId);
      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found." });
      await saveListingForUser(ctx.user.id, listing);
      return { success: true, vin: listing.vin };
    }),

  /** Save an entire shortlist (multiple listing ids) to the Garage in one action. */
  saveShortlist: protectedProcedure
    .input(z.object({ listingIds: z.array(z.string()).min(1).max(10) }))
    .mutation(async ({ ctx, input }) => {
      const listings = await Promise.all(
        input.listingIds.map((id) => inventoryProvider.getListingById(id)),
      );
      const found = listings.filter((l): l is Listing => !!l);
      for (const l of found) {
        await saveListingForUser(ctx.user.id, l);
      }
      return { success: true, saved: found.length };
    }),

  /**
   * Save the current Find-My-Car criteria as a monitored "search alert". The
   * monitor cron re-runs active searches and notifies on new matching listings.
   */
  saveSearch: protectedProcedure
    .input(z.object({ name: z.string().max(160).optional(), criteria: criteriaSchema }))
    .mutation(async ({ ctx, input }) => {
      const label = input.name?.trim() || describeCriteria(input.criteria);
      await createSavedSearch({
        userId: ctx.user.id,
        name: label,
        criteria: input.criteria as Record<string, unknown>,
        active: true,
      });
      return { success: true, name: label };
    }),

  /** List the signed-in user's saved searches. */
  savedSearches: protectedProcedure.query(async ({ ctx }) => {
    return getSavedSearches(ctx.user.id);
  }),

  /** Enable/disable alerts for a saved search. */
  toggleSavedSearch: protectedProcedure
    .input(z.object({ id: z.number().int(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await setSavedSearchActive(ctx.user.id, input.id, input.active);
      return { success: true };
    }),

  /** Delete a saved search. */
  deleteSavedSearch: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSavedSearch(ctx.user.id, input.id);
      return { success: true };
    }),

  /** Price history for a saved listing — drives the Garage price sparkline. */
  priceHistory: publicProcedure
    .input(z.object({ listingId: z.string() }))
    .query(async ({ input }) => {
      const rows = await getPriceHistory(input.listingId, 60);
      // Ascending by time for charting.
      return rows.map((r) => ({ price: r.price, at: r.recordedAt })).reverse();
    }),

  /** New-car trim configurator: the option/package catalog for the UI. */
  configOptions: publicProcedure.query(() => CONFIG_OPTIONS),

  /**
   * Configure a new-car trim: apply selected options to recompute price, MSRP,
   * efficiency, and the GOGETTER quality score (safety packages feed the score).
   */
  configure: publicProcedure
    .input(
      z.object({
        listingId: z.string(),
        optionIds: z.array(z.string()).default([]),
      }),
    )
    .query(async ({ input }) => {
      const listing = await inventoryProvider.getListingById(input.listingId);
      if (!listing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trim not found." });
      }
      const selected = CONFIG_OPTIONS.filter((o) => input.optionIds.includes(o.id));
      const optionsTotal = selected.reduce((s, o) => s + o.priceDelta, 0);
      const baseMsrp = listing.msrp ?? listing.price;
      const mpg = Math.max(
        0,
        listing.mpg + selected.reduce((s, o) => s + (o.mpgDelta ?? 0), 0),
      );

      const vehicle = listingToDecodedVehicle(listing);
      const extraSafety = selected
        .flatMap((o) => o.addedSafetyFeatures ?? [])
        .map((label) => ({ label, value: "Optioned" }));
      const augmented = {
        ...vehicle,
        safetyFeatures: [...vehicle.safetyFeatures, ...extraSafety],
      };
      const base = scoreVehicle(augmented, undefined);
      const scoreDelta = selected.reduce((s, o) => s + (o.scoreDelta ?? 0), 0);
      const overall = Math.max(0, Math.min(100, base.overall + scoreDelta));

      return {
        base: {
          trim: listing.trim,
          price: listing.price,
          msrp: baseMsrp,
          mpg: listing.mpg,
        },
        price: listing.price + optionsTotal,
        msrp: baseMsrp + optionsTotal,
        optionsTotal,
        mpg,
        fuel: listing.fuel,
        qualityScore: overall,
        qualityGrade: letterGrade(overall),
        subscores: {
          reliability: base.reliability,
          safety: base.safety,
          ageMileage: base.ageMileage,
          efficiency: base.efficiency,
        },
      };
    }),
});
