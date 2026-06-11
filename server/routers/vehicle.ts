import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { decodeVin, isValidVin } from "../vin";
import { scoreVehicle } from "../scoring";
import { getAdvisorReply } from "../advisor";
import { fetchRecalls } from "../recalls";
import { braveConfigured, modelIntelSearch } from "../websearch/brave";
import { inventoryProvider } from "../inventory/provider";
import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistoryItem,
  getSavedVehicles,
  getSearchHistory,
  saveVehicle,
  unsaveVehicle,
  updateSavedVehicleMeta,
} from "../db";
import type { DecodedVehicle, ScoreBreakdown } from "../../drizzle/schema";

const decodedVehicleSchema = z.object({
  vin: z.string(),
  make: z.string(),
  model: z.string(),
  modelYear: z.string(),
  trim: z.string(),
  vehicleType: z.string(),
  bodyClass: z.string(),
  driveType: z.string(),
  fuelType: z.string(),
  engineCylinders: z.string(),
  engineHP: z.string(),
  engineDisplacementL: z.string(),
  transmissionStyle: z.string(),
  transmissionSpeeds: z.string(),
  doors: z.string(),
  manufacturer: z.string(),
  plantCountry: z.string(),
  plantCity: z.string(),
  plantState: z.string(),
  electrificationLevel: z.string(),
  gvwr: z.string(),
  safetyFeatures: z.array(z.object({ label: z.string(), value: z.string() })),
  raw: z.record(z.string(), z.string()),
}) as z.ZodType<DecodedVehicle>;

// Mirrors ScoreAdvisory — without these fields zod would silently strip the
// curated advisories whenever a score round-trips through save/advisor/rescore.
const scoreAdvisorySchema = z.object({
  id: z.string(),
  severity: z.enum(["avoid", "caution", "value-pick"]),
  title: z.string(),
  detail: z.string(),
  watchFor: z.array(z.string()),
  whyBuy: z.array(z.string()).optional(),
  transmissionNote: z.string().optional(),
  waivedByManual: z.boolean().optional(),
  appliedDelta: z.number(),
  source: z.string(),
});

const scoreSchema = z.object({
  overall: z.number(),
  grade: z.string(),
  reliability: z.number(),
  safety: z.number(),
  ageMileage: z.number(),
  efficiency: z.number(),
  notes: z.array(z.string()),
  advisories: z.array(scoreAdvisorySchema).optional(),
  riskLevel: z.enum(["clear", "caution", "high"]).optional(),
}) as z.ZodType<ScoreBreakdown>;

export const vehicleRouter = router({
  /** Decode a VIN + compute its score. Logs to history if user is signed in. */
  decode: publicProcedure
    .input(
      z.object({
        vin: z.string().min(11).max(17),
        mileage: z.number().int().positive().max(1_000_000).optional(),
        modelYear: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!isValidVin(input.vin)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please enter a valid 17-character VIN (no I, O, or Q).",
        });
      }
      let vehicle: DecodedVehicle;
      try {
        vehicle = await decodeVin(input.vin, input.modelYear);
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Failed to decode VIN.",
        });
      }
      const score = scoreVehicle(vehicle, input.mileage);

      if (ctx.user) {
        try {
          await addSearchHistory({
            userId: ctx.user.id,
            vin: vehicle.vin,
            make: vehicle.make,
            model: vehicle.model,
            modelYear: vehicle.modelYear,
            mileage: input.mileage,
            score: score.overall,
            grade: score.grade,
            vehicleData: vehicle,
            scoreData: score,
          });
        } catch (e) {
          console.warn("[vehicle.decode] failed to log history", e);
        }
      }

      return { vehicle, score, mileage: input.mileage ?? null };
    }),

  /** Re-score an already decoded vehicle (e.g. user adjusts mileage). */
  rescore: publicProcedure
    .input(z.object({ vehicle: decodedVehicleSchema, mileage: z.number().int().positive().max(1_000_000).optional() }))
    .query(({ input }) => scoreVehicle(input.vehicle, input.mileage)),

  /**
   * Free NHTSA recall lookup (public records, no key). Queried by
   * make/model/year so it works for real VINs and demo listings alike.
   * Returns null when NHTSA can't be reached — the UI says "couldn't check".
   */
  recalls: publicProcedure
    .input(
      z.object({
        make: z.string().min(1),
        model: z.string().min(1),
        modelYear: z.union([z.string().min(2), z.number().int()]),
      }),
    )
    .query(({ input }) => fetchRecalls(input.make, input.model, input.modelYear)),

  /**
   * "From the web" model intel (Brave Search): real owner-reported problem /
   * reliability links for this model-year. Metered API — cached 6h server-
   * side and shared with the advisor's web-context block; `available:false`
   * hides the card when keyless.
   */
  webIntel: publicProcedure
    .input(
      z.object({
        make: z.string().min(1).max(40),
        model: z.string().min(1).max(60),
        modelYear: z.union([z.string().min(2), z.number().int()]),
      }),
    )
    .query(async ({ input }) => {
      if (!braveConfigured()) return { available: false as const, results: [] };
      const results = await modelIntelSearch(input.modelYear, input.make, input.model);
      return { available: true as const, results: results ?? [] };
    }),

  /** Conversational advisor reply. */
  advisor: publicProcedure
    .input(
      z.object({
        vehicle: decodedVehicleSchema,
        score: scoreSchema,
        mileage: z.number().int().positive().optional(),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
        question: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // If this VIN belongs to seeded inventory, enrich the advisor with the
        // dealer/listing context (seller type, price, warranty, region flags) so
        // it can give new-car / private-seller specific guidance.
        let listing;
        try {
          const l = await inventoryProvider.getListingByVin(input.vehicle.vin);
          if (l) {
            listing = {
              condition: l.condition,
              sellerType: l.sellerType,
              dealerName: l.dealerName,
              price: l.price,
              msrp: l.msrp,
              warranty: l.warranty,
              modelReputation: l.modelReputation,
              regionFlags: l.regionFlags,
              location: `${l.city}, ${l.state}`,
            };
          }
        } catch {
          // non-fatal: advisor still works without listing context
        }
        const reply = await getAdvisorReply({
          vehicle: input.vehicle,
          score: input.score,
          mileage: input.mileage,
          history: input.history,
          question: input.question,
          listing,
        });
        return { reply };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Advisor failed.",
        });
      }
    }),

  // ----- History -----
  history: protectedProcedure.query(({ ctx }) => getSearchHistory(ctx.user.id)),
  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    await clearSearchHistory(ctx.user.id);
    return { success: true };
  }),
  deleteHistoryItem: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSearchHistoryItem(ctx.user.id, input.id);
      return { success: true };
    }),

  // ----- Saved vehicles -----
  saved: protectedProcedure.query(({ ctx }) => getSavedVehicles(ctx.user.id)),
  save: protectedProcedure
    .input(
      z.object({
        vehicle: decodedVehicleSchema,
        score: scoreSchema,
        mileage: z.number().int().positive().optional(),
        nickname: z.string().max(128).optional(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await saveVehicle({
        userId: ctx.user.id,
        vin: input.vehicle.vin,
        make: input.vehicle.make,
        model: input.vehicle.model,
        modelYear: input.vehicle.modelYear,
        mileage: input.mileage,
        score: input.score.overall,
        grade: input.score.grade,
        nickname: input.nickname,
        notes: input.notes,
        vehicleData: input.vehicle,
        scoreData: input.score,
      });
      return { success: true };
    }),
  unsave: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await unsaveVehicle(ctx.user.id, input.id);
      return { success: true };
    }),
  updateSavedMeta: protectedProcedure
    .input(z.object({ id: z.number().int(), nickname: z.string().max(128).optional(), notes: z.string().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await updateSavedVehicleMeta(ctx.user.id, input.id, {
        nickname: input.nickname,
        notes: input.notes,
      });
      return { success: true };
    }),
});
