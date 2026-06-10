import { invokeLLM } from "../_core/llm";
import type { BuyerCriteria, RankedMatch } from "./types";

/** AI-written narrative for one recommended car. */
export type CarNarrative = {
  listingId: string;
  whyPicked: string;
  advantages: string[];
  disadvantages: string[];
  watchFor: string[];
};

const USE_CASE_LABELS: Record<string, string> = {
  "teen-driver": "a new/teen driver — safety, predictability, and insurance costs matter most",
  student: "a student — low running costs and dependability matter most",
  commuter: "a daily commuter — fuel costs and long-term reliability matter most",
  family: "family duty — space, safety, and practicality matter most",
  "first-car": "a first car — forgiving, reliable, and cheap to keep",
  budget: "a tight budget — avoiding known-defect models matters more than features",
};

function criteriaSummary(c: BuyerCriteria): string {
  const tradeoff =
    c.priceVsReliability >= 66
      ? "reliability matters more than price"
      : c.priceVsReliability <= 33
        ? "price matters more than reliability"
        : "price and reliability are balanced";
  const parts = [
    `Condition: ${c.condition === "Any" ? "new or used" : c.condition.toLowerCase()}`,
    `Budget: up to $${c.maxPrice.toLocaleString()}`,
    `Max distance: ${c.maxDistance} miles`,
    `Body styles: ${c.bodyStyles.length ? c.bodyStyles.join(", ") : "any"}`,
    `Fuel: ${c.fuels.length ? c.fuels.join(", ") : "any"}`,
    `Seller types: ${c.sellerTypes.length ? c.sellerTypes.join(", ") : "any"}`,
    `Max mileage: ${c.maxMileage.toLocaleString()}`,
    `Trade-off: ${tradeoff}`,
    `Fuel-efficiency priority: ${c.efficiencyPriority}/100`,
  ];
  if (c.useCase && USE_CASE_LABELS[c.useCase]) {
    parts.push(`Buying for: ${USE_CASE_LABELS[c.useCase]}`);
  }
  if (c.budgetMode === true) {
    parts.push("Budget Buyer Mode is ON: known-defect models were excluded; proven value picks are prioritized");
  }
  if (c.searchText && c.searchText.trim()) {
    parts.push(`Buyer's own words: "${c.searchText.trim().slice(0, 300)}"`);
  }
  return parts.join("; ");
}

function listingLine(m: RankedMatch): string {
  const l = m.listing;
  const flags = l.regionFlags && l.regionFlags.length ? ` | Regional notes (UNVERIFIED): ${l.regionFlags.join("; ")}` : "";
  const newInfo = l.condition === "New"
    ? ` | NEW CAR | warranty: ${l.warranty ?? "factory"} | reputation: ${l.modelReputation ?? "n/a"}`
    : "";

  // Curated knowledge from the GOGETTER Reliability Index — ground truth for
  // the model. The LLM must weave these into the narrative.
  const knowledgeBits: string[] = [];
  for (const a of m.advisories ?? []) {
    if (a.severity === "value-pick") {
      knowledgeBits.push(`VALUE PICK (${a.source}): ${a.title}. ${a.detail}`);
    } else if (a.waivedByManual) {
      knowledgeBits.push(`WAIVED ISSUE: ${a.title} affects automatics only and this car is a manual.`);
    } else {
      knowledgeBits.push(
        `KNOWN ISSUE (${a.source}, severity=${a.severity}): ${a.title}. ${a.detail}${a.transmissionNote ? ` ${a.transmissionNote}` : ""}`,
      );
    }
  }
  const knowledge = knowledgeBits.length ? ` | ${knowledgeBits.join(" | ")}` : "";
  const trust =
    m.trust && m.trust.level !== "neutral"
      ? ` | Trust: ${m.trust.level}${m.trust.suspiciousDeal ? " (SUSPICIOUSLY GOOD DEAL on a known-defect model — the seller may know what's coming)" : ""}`
      : "";

  return [
    `id=${l.id}`,
    `${l.condition} ${l.year} ${l.make} ${l.model} ${l.trim}`,
    `${l.bodyStyle}/${l.fuel}`,
    `seller=${l.sellerType}`,
    `$${l.price.toLocaleString()}`,
    l.condition === "New" ? `${l.mileage} delivery mi` : `${l.mileage.toLocaleString()} mi`,
    `${l.mpg} ${l.fuel === "EV" ? "MPGe" : "mpg"}`,
    `${l.distanceMiles} mi away at ${l.dealerName} (${l.city}, ${l.state})`,
    `matchScore=${m.matchScore}`,
    `qualityScore=${m.qualityScore} (${m.qualityGrade})`,
    newInfo,
    flags,
  ].join(" | ") + knowledge + trust;
}

const SYSTEM_PROMPT = `You are the GOGETTER AI Car Advisor. Given a buyer's criteria and a shortlist of real-area car listings (already filtered and ranked by our engine), write a concise, trustworthy narrative for EACH car. Listings may be NEW or USED, and from a Franchise Dealer, Independent Dealer, or Private Seller.

For every car produce:
- whyPicked: 1-2 sentences on why this car made THIS buyer's shortlist, referencing their specific criteria (condition, budget, distance, body style, fuel, seller type, price-vs-reliability trade-off).
- advantages: 2-4 short bullet strings of concrete pros for this buyer.
- disadvantages: 2-3 short bullet strings of honest trade-offs/cons.
- watchFor: 2-4 short bullet strings of practical things to inspect or budget for.

Context-specific guidance:
- USED cars: focus watchFor on likely maintenance for that make/model/age/mileage, plus any regional/history red flags (flood-prone area, salt-belt corrosion, high mileage). Turn any regional note into a concrete "verify X" item and remind the buyer it is UNVERIFIED until confirmed with a Carfax or CarGurus history report (GOGETTER premium).
- NEW cars: there is NO vehicle history — do NOT mention Carfax/accident history. Instead emphasize model reputation, warranty coverage, expected reliability/ownership costs, and reasonable out-the-door price negotiation.
- PRIVATE SELLER: add practical private-sale guidance — get a pre-purchase inspection, verify title is clean and in seller's name, confirm no liens, use secure payment, and that there's no dealer warranty.
- INDEPENDENT DEALER: suggest confirming any warranty/as-is status and reputation.

Curated knowledge (GOGETTER Reliability Index): some listings include KNOWN ISSUE / VALUE PICK / WAIVED ISSUE / Trust facts. Treat these as ground truth and weave them in:
- KNOWN ISSUE: lead watchFor with it in plain English and include it in disadvantages. If a transmission caveat is present (manuals are fine), say so and tell the buyer to verify the transmission FIRST. If the deal is flagged as suspiciously good, say plainly that the price may reflect a failure the seller can see coming.
- VALUE PICK: lead advantages with why it's a curated pick (e.g. "a Toyota Matrix at a dead-brand discount"), but keep its specific watch items (oil consumption, spark plugs, rust).
- WAIVED ISSUE: mention it as good news — the manual transmission avoids the known automatic defect.
- Buying-for context: if the buyer described a use case (e.g. a 15-year-old new driver), address it directly — insurance, predictability, safety — in whyPicked and advantages.

Rules:
- Ground claims in the provided specs and well-known reliability/maintenance patterns. Do NOT invent specific accident history, owner counts, or exact prices beyond what is given.
- Keep each bullet under ~16 words. Plain, friendly, premium advisory tone.
- Return STRICT JSON only, matching the schema. No markdown, no extra prose.`;

const RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "car_recommendations",
    strict: true,
    schema: {
      type: "object",
      properties: {
        cars: {
          type: "array",
          items: {
            type: "object",
            properties: {
              listingId: { type: "string" },
              whyPicked: { type: "string" },
              advantages: { type: "array", items: { type: "string" } },
              disadvantages: { type: "array", items: { type: "string" } },
              watchFor: { type: "array", items: { type: "string" } },
            },
            required: ["listingId", "whyPicked", "advantages", "disadvantages", "watchFor"],
            additionalProperties: false,
          },
        },
      },
      required: ["cars"],
      additionalProperties: false,
    },
  },
};

/** Deterministic fallback narrative if the LLM is unavailable. */
function fallbackNarrative(m: RankedMatch, criteria?: BuyerCriteria): CarNarrative {
  const l = m.listing;
  const advisories = m.advisories ?? [];
  const valuePick = advisories.find((a) => a.severity === "value-pick");
  const knownIssues = advisories.filter((a) => a.appliedDelta < 0 && !a.waivedByManual);
  const waived = advisories.find((a) => a.waivedByManual);

  const adv: string[] = [];
  // Curated knowledge leads: the whole point of the Reliability Index.
  if (valuePick) {
    adv.push(`GOGETTER value pick: ${valuePick.title}.`);
    for (const w of valuePick.whyBuy ?? []) adv.push(w);
  }
  if (waived) adv.push(`Good news: ${waived.title} only affects automatics — this manual avoids it.`);
  if (m.fit.reliability >= 88 && !valuePick) adv.push(`${l.make} has a strong dependability reputation.`);
  if (m.fit.price >= 80) adv.push("Priced well within your budget.");
  if (l.fuel === "EV") adv.push("Electric drivetrain means very low running costs.");
  else if (l.fuel === "Hybrid") adv.push("Hybrid powertrain keeps fuel costs down.");
  if (l.condition === "New") adv.push("Brand new with full factory warranty and no history risk.");
  else if (m.fit.mileage >= 75 && adv.length < 4) adv.push("Reasonable mileage for its age.");
  if (adv.length === 0) adv.push("Solid all-around fit for your criteria.");

  const dis: string[] = [];
  for (const issue of knownIssues) {
    dis.push(`Known issue for this model year range: ${issue.title}.`);
  }
  if (m.trust?.suspiciousDeal) {
    dis.push("Priced suspiciously well for a known-defect model — the seller may know what's coming.");
  }
  if (m.fit.reliability < 70 && knownIssues.length === 0) dis.push(`${l.make} can carry higher repair costs.`);
  if (l.mileage > 90000 && l.condition !== "New") dis.push("Higher mileage — inspect wear items closely.");
  if (l.fuel === "Gas" && l.mpg < 24) dis.push("Fuel economy is on the thirstier side.");
  if (dis.length === 0) dis.push("Few obvious drawbacks; verify condition in person.");

  const watch: string[] = [];
  // Model-specific watch items from the knowledge base come first.
  for (const a of advisories) {
    if (a.waivedByManual) continue;
    if (a.transmissionNote) watch.push(a.transmissionNote);
    for (const w of a.watchFor) {
      if (watch.length < 3) watch.push(w);
    }
  }
  if (l.condition === "New") {
    watch.push("Negotiate the out-the-door price and dealer add-ons.");
    watch.push(`Confirm warranty coverage (${l.warranty ?? "factory"}).`);
    watch.push("Compare across nearby dealers for the best allocation/price.");
  } else {
    watch.push("Request maintenance records and a pre-purchase inspection.");
    if (watch.length < 4) {
      watch.push(`Budget for routine ${l.year <= 2018 ? "age-related" : "wear"} items (tires, brakes, fluids).`);
    }
    if (l.sellerType === "Private Seller" && watch.length < 4) {
      watch.push("Verify clean title in seller's name and no outstanding liens.");
    }
    if (l.regionFlags && l.regionFlags.length && watch.length < 4) {
      watch.push(`${l.regionFlags[0]} (UNVERIFIED — confirm via Carfax/CarGurus).`);
    }
  }

  const useCaseLabel = criteria?.useCase ? USE_CASE_LABELS[criteria.useCase] : undefined;
  const topReason = (m.reasons[0] ?? "fits your core criteria").replace(/\.$/, "");
  const whyParts: string[] = [`A ${m.matchScore}/100 match: ${topReason}`];
  if (useCaseLabel) whyParts.push(`Chosen with your situation in mind — ${useCaseLabel}`);

  return {
    listingId: l.id,
    whyPicked: `${whyParts.join(". ")}.`,
    advantages: adv.slice(0, 4),
    disadvantages: dis.slice(0, 3),
    watchFor: watch.slice(0, 4),
  };
}

/**
 * Generate per-car narratives for the ranked shortlist. Uses a single LLM call
 * with structured JSON output; falls back to deterministic text on any error so
 * the shortlist always renders.
 */
export async function generateNarratives(
  matches: RankedMatch[],
  criteria: BuyerCriteria,
): Promise<Record<string, CarNarrative>> {
  if (matches.length === 0) return {};

  const userContent = [
    `BUYER CRITERIA: ${criteriaSummary(criteria)}`,
    "",
    "SHORTLIST (already ranked best-first):",
    ...matches.map((m, i) => `${i + 1}. ${listingLine(m)}`),
    "",
    "Write the narrative for each car by its listing id.",
  ].join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: RESPONSE_SCHEMA,
    });

    let content = response?.choices?.[0]?.message?.content;
    if (Array.isArray(content)) {
      content = content.map((p: any) => (p.type === "text" ? p.text : "")).join("");
    }
    if (typeof content !== "string" || !content.trim()) throw new Error("empty");

    const parsed = JSON.parse(content) as { cars: CarNarrative[] };
    const byId: Record<string, CarNarrative> = {};
    for (const car of parsed.cars) {
      if (car && car.listingId) byId[car.listingId] = car;
    }
    // Ensure every match has a narrative; backfill any the model skipped.
    for (const m of matches) {
      if (!byId[m.listing.id]) byId[m.listing.id] = fallbackNarrative(m, criteria);
    }
    return byId;
  } catch {
    const byId: Record<string, CarNarrative> = {};
    for (const m of matches) byId[m.listing.id] = fallbackNarrative(m, criteria);
    return byId;
  }
}
