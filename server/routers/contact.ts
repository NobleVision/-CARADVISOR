import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { inventoryProvider } from "../inventory/provider";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";
import { logSellerInquiry } from "../db";
import {
  ALL_TEMPLATE_KINDS,
  buildOneTemplate,
  buildTemplates,
  type ContactContext,
  type ContactTemplateKind,
} from "../contact/templates";
import type { Listing } from "../inventory/types";

const KIND_VALUES = ALL_TEMPLATE_KINDS as [ContactTemplateKind, ...ContactTemplateKind[]];

function contextFromListing(
  listing: Listing,
  buyerName?: string,
  buyerNotes?: string
): ContactContext {
  return {
    year: listing.year,
    make: listing.make,
    model: listing.model,
    trim: listing.trim,
    vin: listing.vin,
    price: listing.price,
    mileage: listing.condition === "New" ? undefined : listing.mileage,
    sellerType: listing.sellerType,
    dealerName: listing.dealerName,
    city: listing.city,
    state: listing.state,
    buyerName,
    buyerNotes,
  };
}

async function resolveListing(args: {
  listingId?: string;
  vin?: string;
}): Promise<Listing> {
  let listing: Listing | null = null;
  if (args.listingId) {
    listing = await inventoryProvider.getListingById(args.listingId);
  } else if (args.vin) {
    listing = await inventoryProvider.getListingByVin(args.vin);
  }
  if (!listing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Listing not found — contacting the seller is only available for inventory listings.",
    });
  }
  return listing;
}

function extractText(response: unknown): string {
  const content = (response as any)?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((p: any) => (p?.type === "text" ? p.text : ""))
      .join("")
      .trim();
  }
  return "";
}

const llmConfigured = () => Boolean(ENV.llmApiUrl && ENV.llmApiKey);

export const contactRouter = router({
  /** Return all four tailored templates for an inventory listing. */
  templates: publicProcedure
    .input(
      z.object({
        listingId: z.string().optional(),
        vin: z.string().optional(),
        buyerName: z.string().max(120).optional(),
        buyerNotes: z.string().max(600).optional(),
      })
    )
    .query(async ({ input }) => {
      const listing = await resolveListing(input);
      const ctx = contextFromListing(listing, input.buyerName, input.buyerNotes);
      return {
        sellerType: listing.sellerType,
        dealerName: listing.dealerName,
        vehicle: `${listing.year} ${listing.make} ${listing.model}`,
        templates: buildTemplates(ctx),
      };
    }),

  /**
   * Build one template, optionally rewritten by the LLM for a more natural tone
   * (falls back to the deterministic template when no LLM is configured).
   */
  generate: publicProcedure
    .input(
      z.object({
        listingId: z.string().optional(),
        vin: z.string().optional(),
        templateKind: z.enum(KIND_VALUES),
        buyerName: z.string().max(120).optional(),
        buyerNotes: z.string().max(600).optional(),
        personalize: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const listing = await resolveListing(input);
      const ctx = contextFromListing(listing, input.buyerName, input.buyerNotes);
      const template = buildOneTemplate(ctx, input.templateKind);

      if (!input.personalize || !llmConfigured()) {
        return {
          subject: template.subject,
          message: template.body,
          sellerType: listing.sellerType,
          templateKind: input.templateKind,
          personalized: false,
        };
      }

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You rewrite a car buyer's outreach message to a seller. Keep it concise (under 170 words), warm, specific, and ready to send. Preserve every factual detail (vehicle, price, VIN, the checklist items and the buyer's intent). Return ONLY the message body — no subject line, no preamble, no quotes.",
            },
            {
              role: "user",
              content: `Seller type: ${ctx.sellerType}. Rewrite this message for a ${ctx.year} ${ctx.make} ${ctx.model}:\n\n${template.body}${
                ctx.buyerNotes ? `\n\nWork in this buyer note naturally: ${ctx.buyerNotes}` : ""
              }`,
            },
          ],
        });
        const text = extractText(response);
        return {
          subject: template.subject,
          message: text || template.body,
          sellerType: listing.sellerType,
          templateKind: input.templateKind,
          personalized: Boolean(text),
        };
      } catch {
        // Graceful fallback — deterministic template still works without an LLM.
        return {
          subject: template.subject,
          message: template.body,
          sellerType: listing.sellerType,
          templateKind: input.templateKind,
          personalized: false,
        };
      }
    }),

  /** Log that the user drafted/sent an inquiry (for their records). */
  logInquiry: protectedProcedure
    .input(
      z.object({
        listingId: z.string().optional(),
        vin: z.string().optional(),
        sellerType: z.string().max(32).optional(),
        templateKind: z.enum(KIND_VALUES),
        message: z.string().min(1).max(4000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await logSellerInquiry({
        userId: ctx.user.id,
        vin: input.vin ?? null,
        listingId: input.listingId ?? null,
        sellerType: input.sellerType ?? null,
        templateKind: input.templateKind,
        message: input.message,
        status: "drafted",
      });
      return { success: true };
    }),
});
