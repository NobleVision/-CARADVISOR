import { invokeLLM } from "./_core/llm";
import type { DecodedVehicle, ScoreBreakdown } from "../drizzle/schema";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Optional dealer/listing context for inventory-backed reports. */
export type ListingContext = {
  condition?: "New" | "Used";
  sellerType?: string;
  dealerName?: string;
  price?: number;
  msrp?: number;
  warranty?: string;
  modelReputation?: string;
  regionFlags?: string[];
  location?: string;
};

function buildListingContext(l: ListingContext): string {
  const lines: string[] = [];
  if (l.condition) lines.push(`Condition: ${l.condition}`);
  if (l.sellerType) lines.push(`Seller type: ${l.sellerType}`);
  if (l.dealerName) lines.push(`Seller/Dealer: ${l.dealerName}${l.location ? ` (${l.location})` : ""}`);
  if (typeof l.price === "number") lines.push(`Listed price: $${l.price.toLocaleString()}`);
  if (typeof l.msrp === "number") lines.push(`MSRP: $${l.msrp.toLocaleString()}`);
  if (l.warranty) lines.push(`Warranty: ${l.warranty}`);
  if (l.modelReputation) lines.push(`Model reputation: ${l.modelReputation}`);
  if (l.regionFlags && l.regionFlags.length) lines.push(`Regional notes (UNVERIFIED): ${l.regionFlags.join("; ")}`);
  return lines.length ? `DEALER LISTING CONTEXT:\n${lines.join("\n")}` : "";
}

function buildVehicleContext(vehicle: DecodedVehicle, score: ScoreBreakdown, mileage?: number): string {
  const specs = [
    `VIN: ${vehicle.vin}`,
    `Year/Make/Model: ${vehicle.modelYear} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`,
    `Body: ${vehicle.bodyClass || "n/a"} | Vehicle Type: ${vehicle.vehicleType || "n/a"}`,
    `Drivetrain: ${vehicle.driveType || "n/a"} | Transmission: ${vehicle.transmissionStyle || "n/a"}${vehicle.transmissionSpeeds ? ` (${vehicle.transmissionSpeeds}-speed)` : ""}`,
    `Engine: ${vehicle.engineCylinders ? `${vehicle.engineCylinders}-cyl` : "n/a"}${vehicle.engineDisplacementL ? ` ${parseFloat(vehicle.engineDisplacementL).toFixed(1)}L` : ""}${vehicle.engineHP ? ` ${vehicle.engineHP} hp` : ""}`,
    `Fuel: ${vehicle.fuelType || "n/a"}${vehicle.electrificationLevel ? ` | ${vehicle.electrificationLevel}` : ""}`,
    `Doors: ${vehicle.doors || "n/a"} | GVWR: ${vehicle.gvwr || "n/a"}`,
    `Built in: ${[vehicle.plantCity, vehicle.plantState, vehicle.plantCountry].filter(Boolean).join(", ") || "n/a"}`,
    `Mileage: ${mileage ? `${mileage.toLocaleString()} miles` : "not provided"}`,
    `Safety features decoded: ${vehicle.safetyFeatures.map((f) => f.label).join(", ") || "none decoded"}`,
  ].join("\n");

  const scoreText = [
    `Overall GOGETTER Score: ${score.overall}/100 (Grade ${score.grade})`,
    `- Reliability subscore: ${score.reliability}/100`,
    `- Safety subscore: ${score.safety}/100`,
    `- Age & Mileage subscore: ${score.ageMileage}/100`,
    `- Efficiency subscore: ${score.efficiency}/100`,
    `Engine notes: ${score.notes.join(" ")}`,
  ].join("\n");

  // Curated model-year intelligence — lets the advisor cite specific known
  // traps (PowerShift, Jatco CVT, Theta II...) or value picks for this car.
  let knowledgeText = "";
  if (score.advisories && score.advisories.length > 0) {
    const lines = score.advisories.map((a) => {
      if (a.waivedByManual) return `- WAIVED (manual transmission): ${a.title} — only affects automatics.`;
      const head = a.severity === "value-pick" ? "VALUE PICK" : a.severity === "avoid" ? "KNOWN DEFECT" : "CAUTION";
      return `- ${head}: ${a.title}. ${a.detail}${a.transmissionNote ? ` ${a.transmissionNote}` : ""}`;
    });
    knowledgeText = `\n\nKNOWN MODEL ISSUES (${score.advisories[0].source} — treat as ground truth, weave into advice):\n${lines.join("\n")}`;
  }

  return `DECODED VEHICLE (source: NHTSA vPIC public VIN database):\n${specs}\n\nGOGETTER SCORE BREAKDOWN:\n${scoreText}${knowledgeText}`;
}

const SYSTEM_PROMPT = `You are the GOGETTER AI Used Car Advisor — a sharp, trustworthy, and friendly expert who helps everyday buyers make confident used-car decisions.

Your guidance is grounded ONLY in the decoded VIN specs (from the free NHTSA public database) and the GOGETTER scoring breakdown provided to you. Use that data to:
- Explain what the vehicle's specs mean in plain language.
- Explain WHY the vehicle earned its score and subscores.
- Give balanced, practical buying recommendations (what to inspect, typical concerns for this make/model/era, negotiation angles, ownership cost expectations).

Rules:
- Be concise and skimmable. Use short paragraphs and tight bullet lists. Use markdown.
- Never invent accident history, ownership records, title status, or precise market pricing — that data is NOT available from public VIN decoding. If asked, explain it would require a premium history report (e.g., Carfax or CarGurus) and is part of GOGETTER's premium tier.
- Be honest about limitations and uncertainty. You are an informational assistant, not a guarantee.
- Keep a warm, premium, advisory tone.

If DEALER LISTING CONTEXT is provided, tailor your advice to it:
- NEW car: there is NO vehicle history — do not bring up Carfax/accident history unless the user explicitly asks. Focus on model reputation, factory warranty, expected reliability/ownership cost, and out-the-door price vs. MSRP negotiation.
- USED car: cover likely maintenance for the make/model/era and turn any regional note into a concrete "verify X" item, reminding the buyer it is unverified until confirmed with a premium history report.
- PRIVATE SELLER: proactively give private-sale safety steps — independent pre-purchase inspection, verify clean title in the seller's name, check for liens, use secure payment, and note there is no dealer warranty.
- INDEPENDENT DEALER: suggest confirming warranty/as-is status and checking the dealer's reputation/reviews.`;

export async function getAdvisorReply(args: {
  vehicle: DecodedVehicle;
  score: ScoreBreakdown;
  mileage?: number;
  history: ChatMessage[];
  question: string;
  listing?: ListingContext;
}): Promise<string> {
  const { vehicle, score, mileage, history, question, listing } = args;
  const context = buildVehicleContext(vehicle, score, mileage);
  const listingCtx = listing ? buildListingContext(listing) : "";

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "system" as const, content: context },
    ...(listingCtx ? [{ role: "system" as const, content: listingCtx }] : []),
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: question },
  ];

  const response = await invokeLLM({ messages });
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) {
    return content;
  }
  if (Array.isArray(content)) {
    const text = content
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("")
      .trim();
    if (text) return text;
  }
  throw new Error("The advisor could not generate a response. Please try again.");
}
