import { invokeLLM } from "../_core/llm";
import type { BodyStyle, FuelKind, SellerType } from "../inventory/types";

/**
 * Hybrid natural-language search — intent parsing.
 *
 * Buyers can describe what they need in plain English ("safe efficient car
 * under $7k for my 15-year-old new driver within 30 miles of 22030") and we
 * translate it into the same structured criteria the filter buttons set. The
 * LLM path produces the richest extraction; a deterministic rules parser
 * ALWAYS works as the fallback, so the feature never depends on a paid model.
 */

export type UseCase =
  | "teen-driver"
  | "student"
  | "commuter"
  | "family"
  | "first-car"
  | "budget";

/** Partial criteria extracted from text — merged over the form state client-side. */
export type IntentCriteriaPatch = {
  condition?: "New" | "Used" | "Any";
  maxPrice?: number;
  minPrice?: number;
  zip?: string;
  maxDistance?: number;
  maxMileage?: number;
  bodyStyles?: BodyStyle[];
  fuels?: FuelKind[];
  sellerTypes?: SellerType[];
  makes?: string[];
  priceVsReliability?: number;
  efficiencyPriority?: number;
  budgetMode?: boolean;
};

export type IntentResult = {
  criteriaPatch: IntentCriteriaPatch;
  useCase?: UseCase;
  /** Human-readable "interpreted as" chips shown to the buyer for transparency. */
  interpreted: string[];
  source: "llm" | "rules";
};

const BODY_KEYWORDS: [RegExp, BodyStyle][] = [
  [/\bsedans?\b/i, "Sedan"],
  [/\bsuvs?\b|\bcrossovers?\b/i, "SUV"],
  [/\btrucks?\b|\bpickups?\b/i, "Truck"],
  [/\bcoupes?\b/i, "Coupe"],
  [/\bhatch(?:back)?s?\b|\bhatchbacks?\b/i, "Hatchback"],
  [/\bminivans?\b/i, "Minivan"],
  [/\bconvertibles?\b/i, "Convertible"],
  [/\bwagons?\b/i, "Wagon"],
];

const FUEL_KEYWORDS: [RegExp, FuelKind][] = [
  [/\bhybrids?\b/i, "Hybrid"],
  [/\bevs?\b|\belectric\b/i, "EV"],
  [/\bdiesels?\b/i, "Diesel"],
  [/\bgas(?:oline)?\b|\bpetrol\b/i, "Gas"],
];

/** Makes recognizable in free text (word-boundary matched). */
const KNOWN_MAKES = [
  "Toyota", "Lexus", "Honda", "Acura", "Mazda", "Subaru", "Hyundai", "Kia",
  "Genesis", "Nissan", "Infiniti", "Buick", "Chevrolet", "Chevy", "GMC",
  "Ford", "Dodge", "Chrysler", "Jeep", "Ram", "Volkswagen", "VW", "BMW",
  "Mercedes", "Audi", "Volvo", "Porsche", "Tesla", "Mini", "Jaguar",
  "Cadillac", "Lincoln", "Mitsubishi", "Fiat", "Pontiac", "Scion",
];
const MAKE_CANONICAL: Record<string, string> = {
  CHEVY: "Chevrolet",
  VW: "Volkswagen",
  MERCEDES: "Mercedes-Benz",
};

const VALID_BODY: BodyStyle[] = ["Sedan", "SUV", "Truck", "Coupe", "Hatchback", "Minivan", "Convertible", "Wagon"];
const VALID_FUEL: FuelKind[] = ["Gas", "Hybrid", "EV", "Diesel"];
const VALID_SELLER: SellerType[] = ["Franchise Dealer", "Independent Dealer", "Private Seller"];
const VALID_USE_CASES: UseCase[] = ["teen-driver", "student", "commuter", "family", "first-car", "budget"];

function clampInt(n: unknown, min: number, max: number): number | undefined {
  const v = typeof n === "number" ? Math.round(n) : NaN;
  if (!Number.isFinite(v)) return undefined;
  return Math.max(min, Math.min(max, v));
}

/** Enforce criteriaSchema bounds on any patch (LLM or rules) before it leaves the server. */
function sanitizePatch(raw: Record<string, unknown>): IntentCriteriaPatch {
  const patch: IntentCriteriaPatch = {};
  const condition = raw.condition;
  if (condition === "New" || condition === "Used" || condition === "Any") patch.condition = condition;

  const maxPrice = clampInt(raw.maxPrice, 1, 2_000_000);
  if (maxPrice) patch.maxPrice = maxPrice;
  const minPrice = clampInt(raw.minPrice, 0, 2_000_000);
  if (minPrice) patch.minPrice = minPrice;
  const maxDistance = clampInt(raw.maxDistance, 1, 500);
  if (maxDistance) patch.maxDistance = maxDistance;
  const maxMileage = clampInt(raw.maxMileage, 1, 500_000);
  if (maxMileage) patch.maxMileage = maxMileage;

  if (typeof raw.zip === "string" && /^\d{5}$/.test(raw.zip)) patch.zip = raw.zip;

  if (Array.isArray(raw.bodyStyles)) {
    const v = raw.bodyStyles.filter((b): b is BodyStyle => VALID_BODY.includes(b as BodyStyle));
    if (v.length) patch.bodyStyles = Array.from(new Set(v));
  }
  if (Array.isArray(raw.fuels)) {
    const v = raw.fuels.filter((f): f is FuelKind => VALID_FUEL.includes(f as FuelKind));
    if (v.length) patch.fuels = Array.from(new Set(v));
  }
  if (Array.isArray(raw.sellerTypes)) {
    const v = raw.sellerTypes.filter((s): s is SellerType => VALID_SELLER.includes(s as SellerType));
    if (v.length) patch.sellerTypes = Array.from(new Set(v));
  }
  if (Array.isArray(raw.makes)) {
    const v = raw.makes.filter((m): m is string => typeof m === "string" && m.trim().length > 0).slice(0, 8);
    if (v.length) patch.makes = Array.from(new Set(v));
  }

  const rel = clampInt(raw.priceVsReliability, 0, 100);
  if (rel !== undefined) patch.priceVsReliability = rel;
  const eff = clampInt(raw.efficiencyPriority, 0, 100);
  if (eff !== undefined) patch.efficiencyPriority = eff;
  if (raw.budgetMode === true) patch.budgetMode = true;

  return patch;
}

/** Parse a money mention to whole dollars ("$7k" → 7000; "8000" → 8000; "7" → 7000). */
function toDollars(numText: string, hasK: boolean): number | undefined {
  const n = parseFloat(numText.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (hasK) return Math.round(n * 1000);
  // Bare small numbers in a car-budget context mean thousands ("under 8" → $8k).
  return n < 500 ? Math.round(n * 1000) : Math.round(n);
}

/**
 * Deterministic rules parser — the always-available fallback. Intentionally
 * conservative: it only patches what it confidently recognizes.
 */
export function parseIntentDeterministic(text: string): IntentResult {
  const raw: Record<string, unknown> = {};
  const interpreted: string[] = [];
  const t = text.trim();

  // Distance: "within 30 miles", "30 mi radius"
  const dist = t.match(/\bwithin\s+(\d{1,3})\s*(?:miles?|mi)\b/i) ?? t.match(/\b(\d{1,3})\s*(?:miles?|mi)\s+radius\b/i);
  if (dist) {
    raw.maxDistance = parseInt(dist[1], 10);
    interpreted.push(`Within ${dist[1]} miles`);
  }

  // ZIP: "of 22030", "near 22030", "zip 22030", "around 22030", "in 22030"
  const zip = t.match(/\b(?:of|near|around|in|zip(?:\s*code)?)\s+(\d{5})\b/i);
  if (zip) {
    raw.zip = zip[1];
    interpreted.push(`Near ZIP ${zip[1]}`);
  }

  // Mileage cap: "under 100k miles", "less than 120,000 miles"
  const miles = t.match(/\b(?:under|below|less than|max(?:imum)?(?:\s+of)?)\s+\$?([\d,]+)\s*(k)?\s*miles?\b/i);
  if (miles) {
    const n = parseFloat(miles[1].replace(/,/g, ""));
    if (Number.isFinite(n)) {
      raw.maxMileage = Math.round(miles[2] ? n * 1000 : n < 500 ? n * 1000 : n);
      interpreted.push(`Mileage: under ${Number(raw.maxMileage).toLocaleString()} miles`);
    }
  }

  // Price: "$7k", "under $8,000", "budget of 7000" — never the mileage mention.
  const priceSource = miles ? t.replace(miles[0], " ") : t;
  const price =
    priceSource.match(/\$\s*([\d.,]+)\s*(k)?\b/i) ??
    priceSource.match(/\b(?:under|below|less than|max(?:imum)?(?:\s+of)?|budget(?:\s+(?:of|is|around))?)\s+([\d.,]+)\s*(k)?\b(?!\s*miles?)/i);
  if (price) {
    const dollars = toDollars(price[1], Boolean(price[2]));
    if (dollars && dollars >= 1000) {
      raw.maxPrice = dollars;
      interpreted.push(`Budget: up to $${dollars.toLocaleString()}`);
    }
  }

  // Condition — "brand new"/"new car" means New; "new driver" does NOT.
  if (/\bbrand[- ]new\b|\bnew (?:car|vehicle)s?\b/i.test(t)) {
    raw.condition = "New";
    interpreted.push("Condition: new");
  } else if (/\bused\b|\bpre[- ]owned\b|\bsecond[- ]hand\b/i.test(t)) {
    raw.condition = "Used";
    interpreted.push("Condition: used");
  }

  // Body styles & fuels
  const bodies = BODY_KEYWORDS.filter(([re]) => re.test(t)).map(([, b]) => b);
  if (bodies.length) {
    raw.bodyStyles = bodies;
    interpreted.push(`Body: ${bodies.join(", ")}`);
  }
  const fuels = FUEL_KEYWORDS.filter(([re]) => re.test(t)).map(([, f]) => f);
  // "gas" alone is usually incidental ("good on gas") — only honor it with another cue.
  const meaningfulFuels = fuels.filter((f) => f !== "Gas" || /\bgas (?:engine|car|only)\b/i.test(t));
  if (meaningfulFuels.length) {
    raw.fuels = meaningfulFuels;
    interpreted.push(`Fuel: ${meaningfulFuels.join(", ")}`);
  }

  // Seller types
  if (/\bprivate (?:seller|sale|party|owner)\b|\bby owner\b/i.test(t)) {
    raw.sellerTypes = ["Private Seller"];
    interpreted.push("Seller: private seller");
  } else if (/\bfranchise dealer\b/i.test(t)) {
    raw.sellerTypes = ["Franchise Dealer"];
    interpreted.push("Seller: franchise dealer");
  } else if (/\bdealer(?:ship)?s?\b/i.test(t)) {
    raw.sellerTypes = ["Franchise Dealer", "Independent Dealer"];
    interpreted.push("Seller: dealers");
  }

  // Makes
  const makes = KNOWN_MAKES.filter((m) => new RegExp(`\\b${m}\\b`, "i").test(t)).map(
    (m) => MAKE_CANONICAL[m.toUpperCase()] ?? m,
  );
  if (makes.length) {
    raw.makes = Array.from(new Set(makes));
    interpreted.push(`Makes: ${Array.from(new Set(makes)).join(", ")}`);
  }

  // Use case
  let useCase: UseCase | undefined;
  if (/\b1[5-7][- ]?year[- ]?old\b|\bteen(?:ager)?s?\b|\bnew driver\b|\byoung driver\b|\bfirst[- ]time driver\b|\bmy (?:daughter|son|kid|granddaughter|grandson)\b/i.test(t)) {
    useCase = "teen-driver";
    interpreted.push("Use case: new/teen driver — safety and reliability first");
  } else if (/\bstudent\b|\bcollege\b/i.test(t)) {
    useCase = "student";
    interpreted.push("Use case: student");
  } else if (/\bcommut/i.test(t)) {
    useCase = "commuter";
    interpreted.push("Use case: commuter");
  } else if (/\bfamily\b|\bcar seats?\b|\bkids\b/i.test(t)) {
    useCase = "family";
    interpreted.push("Use case: family");
  } else if (/\bfirst car\b/i.test(t)) {
    useCase = "first-car";
    interpreted.push("Use case: first car");
  }

  // Priority dials
  if (/\breliab|\bdependab|\bsafe(?:st|ty)?\b|\bwon'?t break\b/i.test(t) || useCase === "teen-driver") {
    raw.priceVsReliability = 75;
    interpreted.push("Reliability prioritized over price");
  } else if (/\bcheapest\b|\blowest price\b|\bbargain\b/i.test(t)) {
    raw.priceVsReliability = 25;
    interpreted.push("Price prioritized");
  }
  if (/\befficien|\bgood (?:on gas|gas mileage|mpg)\b|\bfuel[- ]sip|\bhigh mpg\b/i.test(t)) {
    raw.efficiencyPriority = 75;
    interpreted.push("Fuel efficiency prioritized");
  }

  // Budget Buyer Mode: low budgets engage the golden rules automatically.
  if (typeof raw.maxPrice === "number" && raw.maxPrice <= 10000) {
    raw.budgetMode = true;
    interpreted.push("Budget Buyer Mode suggested — hides known-defect models");
  }

  const patch = sanitizePatch(raw);
  return { criteriaPatch: patch, ...(useCase ? { useCase } : {}), interpreted, source: "rules" };
}

const INTENT_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "search_intent",
    strict: true,
    schema: {
      type: "object",
      properties: {
        condition: { type: ["string", "null"], description: 'One of "New", "Used", "Any", or null.' },
        maxPrice: { type: ["number", "null"], description: "Max budget in whole US dollars." },
        minPrice: { type: ["number", "null"] },
        zip: { type: ["string", "null"], description: "5-digit US ZIP code if mentioned." },
        maxDistance: { type: ["number", "null"], description: "Max distance in miles." },
        maxMileage: { type: ["number", "null"], description: "Max odometer miles." },
        bodyStyles: { type: "array", items: { type: "string" } },
        fuels: { type: "array", items: { type: "string" } },
        sellerTypes: { type: "array", items: { type: "string" } },
        makes: { type: "array", items: { type: "string" } },
        useCase: {
          type: ["string", "null"],
          description: 'One of "teen-driver","student","commuter","family","first-car","budget", or null.',
        },
        priceVsReliability: {
          type: ["number", "null"],
          description: "0-100; 100 = reliability matters most. Set ≥70 when safety/reliability is emphasized.",
        },
        efficiencyPriority: { type: ["number", "null"], description: "0-100; set ≥70 when fuel economy is emphasized." },
        budgetMode: { type: ["boolean", "null"], description: "true for tight budgets (≤ ~$10k) where defect-avoidance matters most." },
        interpreted: {
          type: "array",
          items: { type: "string" },
          description: "Short human-readable chips summarizing each thing you extracted.",
        },
      },
      required: [
        "condition", "maxPrice", "minPrice", "zip", "maxDistance", "maxMileage",
        "bodyStyles", "fuels", "sellerTypes", "makes", "useCase",
        "priceVsReliability", "efficiencyPriority", "budgetMode", "interpreted",
      ],
      additionalProperties: false,
    },
  },
};

const INTENT_SYSTEM_PROMPT = `You translate a car buyer's natural-language description into structured search criteria for the GOGETTER Car Advisor.
Valid bodyStyles: Sedan, SUV, Truck, Coupe, Hatchback, Minivan, Convertible, Wagon.
Valid fuels: Gas, Hybrid, EV, Diesel. Valid sellerTypes: Franchise Dealer, Independent Dealer, Private Seller.
Rules:
- Extract ONLY what the buyer actually said; use null/empty for everything else.
- "new driver" describes the PERSON, not the car's condition.
- Money like "$7k" or "under 8 grand" means thousands of dollars.
- A 5-digit number after "near/of/around/in" is a ZIP code, not a price.
- Teen/new-driver or safety-focused buyers: priceVsReliability ≥ 75.
- Budgets at or under $10,000: budgetMode = true.
- "interpreted": one short chip per extraction, e.g. "Budget: up to $7,000".
Return STRICT JSON matching the schema.`;

/**
 * Parse buyer intent with the LLM when configured, falling back to the
 * deterministic rules parser on ANY failure. Output is always sanitized to
 * the same bounds the criteria schema enforces.
 */
export async function parseSearchIntent(text: string): Promise<IntentResult> {
  const trimmed = text.trim();
  if (!trimmed) return { criteriaPatch: {}, interpreted: [], source: "rules" };

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: INTENT_SYSTEM_PROMPT },
        { role: "user", content: trimmed.slice(0, 600) },
      ],
      response_format: INTENT_SCHEMA,
    });

    let content = response?.choices?.[0]?.message?.content;
    if (Array.isArray(content)) {
      content = content.map((p: any) => (p.type === "text" ? p.text : "")).join("");
    }
    if (typeof content !== "string" || !content.trim()) throw new Error("empty");

    const parsed = JSON.parse(content) as Record<string, unknown>;
    const patch = sanitizePatch(parsed);
    const useCase = VALID_USE_CASES.includes(parsed.useCase as UseCase)
      ? (parsed.useCase as UseCase)
      : undefined;
    const interpreted = Array.isArray(parsed.interpreted)
      ? parsed.interpreted.filter((s): s is string => typeof s === "string").slice(0, 12)
      : [];

    return { criteriaPatch: patch, ...(useCase ? { useCase } : {}), interpreted, source: "llm" };
  } catch {
    return parseIntentDeterministic(trimmed);
  }
}
