import { DEALER_EVASION_RULE, DEALER_QUESTIONS, GOLDEN_RULES, KNOWLEDGE_ENTRIES } from "./knowledge/data";
import type { VehicleAdvisory } from "./knowledge/types";
import type { SellerType } from "./inventory/types";

/**
 * Personalized pre-purchase checklist — fully deterministic (no LLM), built
 * from the exact playbook that produced a successful real-world budget
 * purchase: history report first, smart dealer questions by phone, a $150
 * independent PPI, and model-specific checks from the GOGETTER Reliability
 * Index.
 */

export type ChecklistItem = {
  text: string;
  /** Dealbreaker-grade item, highlighted in the UI. */
  critical?: boolean;
};

export type ChecklistSection = {
  title: string;
  items: ChecklistItem[];
};

export type PrePurchaseChecklist = {
  vehicleLabel: string;
  sections: ChecklistSection[];
  /** The three questions to ask a dealer by phone (empty for private sellers). */
  dealerQuestions: string[];
  dealerEvasionRule?: string;
  goldenRules: string[];
};

export type ChecklistInput = {
  year: number;
  make: string;
  model: string;
  mileage?: number;
  price?: number;
  sellerType?: SellerType;
  regionFlags?: string[];
  advisories: VehicleAdvisory[];
  useCase?: string;
};

const ENTRY_BY_ID = new Map(KNOWLEDGE_ENTRIES.map((e) => [e.id, e]));

function dedupe(items: ChecklistItem[]): ChecklistItem[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = i.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Build the personalized checklist for one vehicle. */
export function buildChecklist(input: ChecklistInput): PrePurchaseChecklist {
  const { advisories, sellerType, regionFlags = [], mileage, useCase } = input;
  const isDealer = sellerType === "Franchise Dealer" || sellerType === "Independent Dealer";
  const isPrivate = sellerType === "Private Seller";
  const age = Math.max(0, new Date().getFullYear() - input.year);
  const theftRisk = advisories.some((a) => !a.waivedByManual && /theft|immobilizer/i.test(`${a.title} ${a.detail}`));

  // ── Before you visit ──
  const before: ChecklistItem[] = [
    {
      text: "Pull a vehicle history report (Carfax/AutoCheck) and confirm a clean title — rebuilt/salvage titles can be uninsurable or carry massive premiums.",
      critical: true,
    },
  ];
  if (isDealer) {
    before.push({
      text: "Call ahead and ask the three smart dealer questions below — if they evade or say \"you have to come in,\" walk away.",
      critical: true,
    });
  }
  if (isPrivate) {
    before.push({ text: "Ask the owner for maintenance records and why they're selling — at budget prices, maintenance history matters more than brand." });
  }
  if (theftRisk || useCase === "teen-driver") {
    before.push({
      text: theftRisk
        ? "Get an insurance quote for this exact car BEFORE committing — this model year range is a known theft target and can be brutal to insure."
        : "Get an insurance quote for this exact car with your new driver on the policy BEFORE committing.",
      critical: theftRisk,
    });
  }

  // ── Model-specific checks (GOGETTER Reliability Index) ──
  const modelChecks: ChecklistItem[] = [];
  for (const a of advisories) {
    if (a.waivedByManual) {
      modelChecks.push({ text: `Good news: ${a.title} only affects automatics — this manual avoids it. Still confirm it shifts smoothly.` });
      continue;
    }
    const entry = ENTRY_BY_ID.get(a.id);
    const items = entry?.checklistItems?.length ? entry.checklistItems : a.watchFor;
    for (const text of items) {
      modelChecks.push({ text, critical: a.severity === "avoid" });
    }
    if (a.transmissionNote) {
      modelChecks.push({ text: a.transmissionNote, critical: a.severity === "avoid" });
    }
  }

  // ── At the car / test drive ──
  const atCar: ChecklistItem[] = [
    {
      text: "Arrange a ~$150 pre-purchase inspection (PPI) with an independent mechanic — not the seller's shop. It catches hidden rust, leaks, and masked check-engine lights.",
      critical: true,
    },
    { text: "Cold-start the engine and listen for ticking, knocking, or rough idle before it warms up." },
  ];
  if (typeof mileage === "number" && mileage > 120000) {
    atCar.push({ text: "Ask for proof of timing belt/chain service and recent fluid changes — budget for major maintenance past 120k miles." });
  }
  if (age >= 12) {
    atCar.push({ text: "Older vehicle: verify parts availability and check wear items (suspension bushings, hoses, seals)." });
  }
  for (const flag of regionFlags) {
    atCar.push({ text: `Regional signal (UNVERIFIED): ${flag} — have the PPI specifically check for this and confirm with the history report.` });
  }

  // ── Paperwork & closing ──
  const closing: ChecklistItem[] = [];
  if (isPrivate) {
    closing.push(
      { text: "Verify the title is clean, in the seller's name, and there are no outstanding liens.", critical: true },
      { text: "Use a secure payment method and complete the bill of sale + title transfer per your state's rules." },
    );
  } else {
    closing.push({
      text: "Get the out-the-door price in writing and confirm it matches the phone quote — no surprise fees at signing.",
      critical: true,
    });
    if (sellerType === "Independent Dealer") {
      closing.push({ text: "Confirm warranty vs. as-is status in writing before signing anything." });
    }
  }

  const sections: ChecklistSection[] = [
    { title: "Before you visit", items: dedupe(before) },
    ...(modelChecks.length ? [{ title: "Model-specific checks", items: dedupe(modelChecks) }] : []),
    { title: "At the car & test drive", items: dedupe(atCar) },
    { title: "Paperwork & closing", items: dedupe(closing) },
  ];

  return {
    vehicleLabel: `${input.year} ${input.make} ${input.model}`.trim(),
    sections,
    dealerQuestions: isDealer ? [...DEALER_QUESTIONS] : [],
    ...(isDealer ? { dealerEvasionRule: DEALER_EVASION_RULE } : {}),
    goldenRules: [...GOLDEN_RULES],
  };
}

/** Plain-text rendering for copy-to-clipboard. */
export function checklistToText(c: PrePurchaseChecklist): string {
  const lines: string[] = [`Pre-purchase checklist — ${c.vehicleLabel}`, ""];
  for (const s of c.sections) {
    lines.push(s.title.toUpperCase());
    for (const i of s.items) lines.push(`  [ ] ${i.critical ? "(!) " : ""}${i.text}`);
    lines.push("");
  }
  if (c.dealerQuestions.length) {
    lines.push("SMART QUESTIONS FOR THE DEALER (ask by phone first)");
    c.dealerQuestions.forEach((q, i) => lines.push(`  ${i + 1}. ${q}`));
    if (c.dealerEvasionRule) lines.push(`  ${c.dealerEvasionRule}`);
    lines.push("");
  }
  lines.push("GOLDEN RULES");
  for (const r of c.goldenRules) lines.push(`  • ${r}`);
  return lines.join("\n");
}
