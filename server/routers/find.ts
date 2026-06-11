import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { inventoryProvider } from "../inventory/provider";
import {
  advisoriesForListing,
  passesHardFilters,
  qualityScoreForListing,
  rankInventory,
} from "../inventory/matching";
import { generateNarratives } from "../inventory/recommend";
import { listingToDecodedVehicle } from "../inventory/adapt";
import {
  centroidForZip,
  distanceFromPoint,
  jitterForId,
  resolveBuyerPoint,
} from "../inventory/geo";
import { resolveLocationToZip } from "../geo/cityToZip";
import { scoreVehicle, letterGrade } from "../scoring";
import { CONFIG_OPTIONS } from "../inventory/options";
import { parseSearchIntent } from "../search/intent";
import { buildChecklist, checklistToText } from "../checklist";
import { findAdvisories, hasAvoidAdvisory, riskLevelFor } from "../knowledge/lookup";
import { semanticSearchListings, vectorConfigured } from "../vector/pinecone";
import { blendSemantic } from "../vector/blend";
import { buildListingText } from "../vector/text";
import { braveConfigured, braveSearch } from "../websearch/brave";
import { tagAndRankResults } from "../websearch/marketplaces";
import type { BuyerCriteria } from "../inventory/types";
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
  // Optional buyer-first extensions (legacy saved searches simply lack them).
  searchText: z.string().max(600).optional(),
  useCase: z.enum(["teen-driver", "student", "commuter", "family", "first-car", "budget"]).optional(),
  budgetMode: z.boolean().optional(),
  makes: z.array(z.string().min(1)).max(8).optional(),
});

/**
 * Apply buyer ZIP to recompute each listing's distance from the buyer.
 * Resolution order: seeded centroid table, then live Mapbox geocoding for
 * any other US ZIP. Falls back to the seeded distances (zipApplied: false)
 * only when both miss or no ZIP was given.
 */
async function applyZipDistance(
  inventory: Listing[],
  zip: string | undefined,
): Promise<{ inventory: Listing[]; zipApplied: boolean }> {
  const point = await resolveBuyerPoint(zip);
  if (!point) return { inventory, zipApplied: false };
  return {
    zipApplied: true,
    inventory: inventory.map((l) => {
      const d = distanceFromPoint(point, l.zip);
      return d == null ? l : { ...l, distanceMiles: d };
    }),
  };
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
  /**
   * Resolve a free-text buyer location (5-digit ZIP or "City, ST") to the
   * representative ZIP the search engine needs. Seeded metro table first,
   * then Mapbox, then keyless Zippopotam; ok:false carries a clear message.
   */
  resolveLocation: publicProcedure
    .input(z.object({ query: z.string().trim().min(1).max(80) }))
    .query(({ input }) => resolveLocationToZip(input.query)),

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
      const { inventory, zipApplied } = await applyZipDistance(rawInventory, input.zip);
      const criteria: BuyerCriteria = {
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
        searchText: input.searchText,
        useCase: input.useCase,
        budgetMode: input.budgetMode,
        makes: input.makes,
      };

      // Single source of truth for eligibility — the same hard filters the
      // ranking engine applies (deliberately includes known-defect models so
      // the hidden-by-Budget-Mode count below stays honest).
      const eligibleListings = inventory.filter((l) => passesHardFilters(l, criteria));
      const eligibleCount = eligibleListings.length;
      const hiddenAvoidCount =
        criteria.budgetMode === true
          ? eligibleListings.filter((l) => hasAvoidAdvisory(advisoriesForListing(l))).length
          : 0;

      // Semantic re-rank (Pinecone): when the buyer typed free text and the
      // vector index is live, rank a wider deterministic pool, blend in
      // semantic relevance, then cut the shortlist. Keyless or no-text
      // searches take the exact pre-existing path.
      const limit = input.limit ?? 5;
      const semanticQuery = criteria.searchText?.trim() ?? "";
      const wantSemantic = semanticQuery.length > 0 && vectorConfigured();
      let semanticApplied = false;
      let matches = rankInventory(inventory, criteria, wantSemantic ? Math.max(limit * 3, 15) : limit);
      if (wantSemantic) {
        const hits = await semanticSearchListings(semanticQuery, { topK: 40 });
        if (hits && hits.length > 0) {
          matches = blendSemantic(matches, hits);
          semanticApplied = true;
        }
      }
      matches = matches.slice(0, limit);
      const narratives = await generateNarratives(matches, criteria);

      // Zero results → advise which criteria to loosen (each suggestion is
      // validated against the inventory, so every button actually unlocks cars)
      // and surface curated value picks slightly outside the chip filters.
      const suggestions: { label: string; patch: Partial<z.infer<typeof criteriaSchema>>; unlocks: number }[] = [];
      let valuePickAlternatives: { listingId: string; vin: string; label: string; price: number }[] = [];
      if (matches.length === 0) {
        const countWith = (patch: Partial<BuyerCriteria>): number => {
          const next = { ...criteria, ...patch };
          let pool = inventory.filter((l) => passesHardFilters(l, next));
          if (next.budgetMode === true) pool = pool.filter((l) => !hasAvoidAdvisory(advisoriesForListing(l)));
          return pool.length;
        };
        const candidates: { label: string; patch: Partial<BuyerCriteria> }[] = [
          {
            label: `Widen the radius to ${Math.min(150, criteria.maxDistance * 2)} miles`,
            patch: { maxDistance: Math.min(150, criteria.maxDistance * 2) },
          },
          {
            label: `Raise the budget to ${formatPrice(Math.round(criteria.maxPrice * 1.2))}`,
            patch: { maxPrice: Math.round(criteria.maxPrice * 1.2) },
          },
          {
            label: `Allow up to ${(criteria.maxMileage + 30000).toLocaleString()} miles`,
            patch: { maxMileage: criteria.maxMileage + 30000 },
          },
          ...(criteria.bodyStyles.length ? [{ label: "Any body style", patch: { bodyStyles: [] as typeof criteria.bodyStyles } }] : []),
          ...(criteria.fuels.length ? [{ label: "Any fuel type", patch: { fuels: [] as typeof criteria.fuels } }] : []),
          ...(criteria.sellerTypes.length ? [{ label: "Any seller type", patch: { sellerTypes: [] as typeof criteria.sellerTypes } }] : []),
          ...(criteria.makes?.length ? [{ label: "Any make", patch: { makes: [] as string[] } }] : []),
          ...(criteria.condition !== "Any" ? [{ label: "New or used", patch: { condition: "Any" as const } }] : []),
        ];
        for (const cand of candidates) {
          const unlocks = countWith(cand.patch);
          if (unlocks > 0) suggestions.push({ ...cand, patch: cand.patch as Partial<z.infer<typeof criteriaSchema>>, unlocks });
        }

        // Curated value picks near the budget, ignoring chip filters — the
        // "consider this instead" guidance from the budget golden rules.
        valuePickAlternatives = inventory
          .filter(
            (l) =>
              l.condition === "Used" &&
              l.price <= criteria.maxPrice * 1.15 &&
              advisoriesForListing(l).some((a) => a.severity === "value-pick"),
          )
          .sort((a, b) => a.price - b.price)
          .slice(0, 3)
          .map((l) => ({
            listingId: l.id,
            vin: l.vin,
            label: `${l.year} ${l.make} ${l.model} ${l.trim}`.trim(),
            price: l.price,
          }));
      }

      return {
        scanned: inventory.length,
        eligible: eligibleCount,
        shortlisted: matches.length,
        zipApplied,
        hiddenAvoidCount,
        semanticApplied,
        suggestions,
        valuePickAlternatives,
        matches: matches.map((m) => ({
          ...m,
          narrative: narratives[m.listing.id] ?? null,
        })),
      };
    }),

  /**
   * Hybrid search: translate a plain-English description into criteria the
   * filter controls understand. LLM-extracted when configured; a deterministic
   * rules parser is the always-on fallback.
   */
  parseIntent: publicProcedure
    .input(z.object({ text: z.string().min(3).max(600) }))
    .mutation(async ({ input }) => parseSearchIntent(input.text)),

  /**
   * Personalized pre-purchase checklist (deterministic, free). Accepts either
   * a seeded listing id or a vehicle shape (for real NHTSA-decoded VINs).
   */
  checklist: publicProcedure
    .input(
      z
        .object({
          listingId: z.string().optional(),
          vehicle: z
            .object({
              year: z.number().int().min(1980).max(2030),
              make: z.string().min(1),
              model: z.string().min(1),
              mileage: z.number().int().nonnegative().optional(),
              sellerType: z.enum(SELLER_TYPES).optional(),
              regionFlags: z.array(z.string()).optional(),
              transmissionStyle: z.string().optional(),
              engineDisplacementL: z.string().optional(),
            })
            .optional(),
          useCase: z.string().max(40).optional(),
        })
        .refine((i) => Boolean(i.listingId || i.vehicle), {
          message: "Provide a listingId or a vehicle.",
        }),
    )
    .query(async ({ input }) => {
      let checklist;
      if (input.listingId) {
        const listing = await inventoryProvider.getListingById(input.listingId);
        if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found." });
        checklist = buildChecklist({
          year: listing.year,
          make: listing.make,
          model: listing.model,
          mileage: listing.condition === "New" ? undefined : listing.mileage,
          price: listing.price,
          sellerType: listing.sellerType,
          regionFlags: listing.regionFlags,
          advisories: advisoriesForListing(listing),
          useCase: input.useCase,
        });
      } else {
        const v = input.vehicle!;
        checklist = buildChecklist({
          year: v.year,
          make: v.make,
          model: v.model,
          mileage: v.mileage,
          sellerType: v.sellerType,
          regionFlags: v.regionFlags,
          advisories: findAdvisories({
            make: v.make,
            model: v.model,
            year: v.year,
            transmissionStyle: v.transmissionStyle,
            engineDisplacementL: v.engineDisplacementL,
          }),
          useCase: input.useCase,
        });
      }
      return { checklist, text: checklistToText(checklist) };
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

  /**
   * Every listing with map-ready coordinates for the /map explorer. Lat/lng
   * is the listing ZIP's centroid plus a small deterministic per-id jitter so
   * same-ZIP pins don't stack; quality grade and risk ride along for the pin
   * badges and popups. No geocoding API needed — all seeded ZIPs ship
   * centroids.
   */
  mapListings: publicProcedure.query(async () => {
    const inventory = await inventoryProvider.getInventory();
    const items = inventory.flatMap((l) => {
      const center = centroidForZip(l.zip);
      if (!center) return [];
      const quality = qualityScoreForListing(l);
      const { dLat, dLng } = jitterForId(l.id);
      return [
        {
          id: l.id,
          vin: l.vin,
          label: `${l.year} ${l.make} ${l.model}`,
          trim: l.trim,
          condition: l.condition,
          price: l.price,
          mileage: l.mileage,
          bodyStyle: l.bodyStyle,
          fuel: l.fuel,
          photo: l.photos[0]?.url ?? null,
          dealerName: l.dealerName,
          sellerType: l.sellerType,
          city: l.city,
          state: l.state,
          lat: center.lat + dLat,
          lng: center.lng + dLng,
          qualityScore: quality.score,
          qualityGrade: quality.grade,
          riskLevel: riskLevelFor(advisoriesForListing(l)),
        },
      ];
    });
    return { count: items.length, items };
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

  /**
   * "More like this": semantic nearest neighbors from the Pinecone vector
   * index when configured, with a deterministic same-body/price-window
   * fallback so the section renders either way. Accepts a VIN (detail page
   * deep link) or a listing id. Real user-entered VINs aren't in seeded
   * inventory — those return an empty list and the UI hides the section.
   */
  similar: publicProcedure
    .input(
      z
        .object({ vin: z.string().optional(), listingId: z.string().optional() })
        .refine((i) => Boolean(i.vin || i.listingId), { message: "Provide a vin or listingId." }),
    )
    .query(async ({ input }) => {
      const subject = input.listingId
        ? await inventoryProvider.getListingById(input.listingId)
        : await inventoryProvider.getListingByVin(input.vin!);
      if (!subject) return { source: "none" as const, items: [] };

      const inventory = await inventoryProvider.getInventory();
      let picks: Listing[] | null = null;
      let source: "vector" | "rules" = "rules";

      if (vectorConfigured()) {
        const hits = await semanticSearchListings(
          buildListingText(subject, advisoriesForListing(subject)),
          { topK: 8 },
        );
        if (hits && hits.length > 0) {
          const byId = new Map(inventory.map((l) => [l.id, l]));
          const fromHits = hits
            .filter((h) => h.id !== subject.id)
            .map((h) => byId.get(h.id))
            .filter((l): l is Listing => Boolean(l))
            .slice(0, 5);
          if (fromHits.length > 0) {
            picks = fromHits;
            source = "vector";
          }
        }
      }

      if (!picks) {
        // Graded closeness instead of a hard window so unusual listings (the
        // only cheap EV hatchback, say) still get sensible neighbors: relative
        // price distance, with body/fuel mismatches and year gaps priced in.
        picks = inventory
          .filter((l) => l.id !== subject.id && l.condition === subject.condition)
          .map((l) => ({
            l,
            closeness:
              Math.abs(l.price - subject.price) / Math.max(subject.price, 1) +
              (l.bodyStyle === subject.bodyStyle ? 0 : 0.35) +
              (l.fuel === subject.fuel ? 0 : 0.15) +
              Math.min(Math.abs(l.year - subject.year), 8) * 0.03,
          }))
          .sort((a, b) => a.closeness - b.closeness)
          .slice(0, 5)
          .map((x) => x.l);
      }

      return {
        source,
        items: picks.map((l) => {
          const quality = qualityScoreForListing(l);
          return {
            id: l.id,
            vin: l.vin,
            label: `${l.year} ${l.make} ${l.model}${l.trim ? ` ${l.trim}` : ""}`,
            price: l.price,
            mileage: l.mileage,
            condition: l.condition,
            photo: l.photos[0]?.url ?? null,
            city: l.city,
            state: l.state,
            qualityScore: quality.score,
            qualityGrade: quality.grade,
            riskLevel: riskLevelFor(advisoriesForListing(l)),
          };
        }),
      };
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

  /**
   * Live market scan (Brave Search): one composed real-web query for cars
   * matching the buyer's intent, with results badged by marketplace. Metered
   * API — only called from explicit user actions, cached 6h server-side, and
   * `available:false` lets the client hide the panel entirely when keyless.
   */
  liveMarket: publicProcedure
    .input(
      z.object({
        make: z.string().max(40).optional(),
        model: z.string().max(60).optional(),
        maxPrice: z.number().int().positive().optional(),
        city: z.string().max(60).optional(),
        state: z.string().max(20).optional(),
        zip: z.string().regex(/^\d{5}$/).optional(),
        condition: z.enum(["New", "Used", "Any"]).optional(),
      }),
    )
    .query(async ({ input }) => {
      if (!braveConfigured()) {
        return { available: false as const, query: null, results: [] };
      }
      const subject = [input.make, input.model].filter(Boolean).join(" ") || "cars";
      const parts = [`${input.condition === "New" ? "new" : "used"} ${subject} for sale`];
      if (input.maxPrice) parts.push(`under $${input.maxPrice.toLocaleString("en-US")}`);
      const near = input.city
        ? `${input.city}${input.state ? `, ${input.state}` : ""}`
        : input.zip;
      if (near) parts.push(`near ${near}`);
      const query = parts.join(" ");

      const results = await braveSearch(query, { count: 10 });
      return {
        available: true as const,
        query,
        results: results ? tagAndRankResults(results) : [],
      };
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
