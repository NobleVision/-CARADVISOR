/** Temporary smoke script for the buyer-first demo flow (safe to delete). */
import { appRouter } from "../server/routers";

const ctx = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: { clearCookie: () => {} },
} as never;

const caller = appRouter.createCaller(ctx);
const base = {
  condition: "Used" as const,
  maxPrice: 7000,
  maxDistance: 50,
  bodyStyles: [] as never[],
  fuels: [] as never[],
  sellerTypes: [] as never[],
  maxMileage: 130000,
  priceVsReliability: 60,
  efficiencyPriority: 60,
  limit: 6,
};

const off = await caller.find.search(base);
console.log("--- Budget Mode OFF (top 6 under $7k) ---");
for (const m of off.matches) {
  console.log(
    `${m.matchScore} | ${m.listing.year} ${m.listing.make} ${m.listing.model} $${m.listing.price}` +
      ` | risk=${m.riskLevel ?? "none"} trust=${m.trust?.level}${m.trust?.suspiciousDeal ? " SUSPICIOUS" : ""}` +
      ` | watch: ${m.narrative?.watchFor?.[0] ?? ""}`,
  );
}

const on = await caller.find.search({ ...base, budgetMode: true, useCase: "teen-driver" });
console.log(`--- Budget Mode ON (hiddenAvoidCount: ${on.hiddenAvoidCount}) ---`);
for (const m of on.matches) {
  console.log(
    `${m.matchScore} | ${m.listing.year} ${m.listing.make} ${m.listing.model} $${m.listing.price}` +
      ` | risk=${m.riskLevel ?? "none"} | adv: ${m.narrative?.advantages?.[0] ?? ""}`,
  );
}
console.log(`whyPicked[0]: ${on.matches[0]?.narrative?.whyPicked}`);

const zero = await caller.find.search({ ...base, maxPrice: 4000, fuels: ["EV" as never] });
console.log("--- Zero results ---");
console.log("suggestions:", zero.suggestions.map((s) => `${s.label} (+${s.unlocks})`));
console.log("valuePicks:", zero.valuePickAlternatives.map((v) => `${v.label} $${v.price}`));
