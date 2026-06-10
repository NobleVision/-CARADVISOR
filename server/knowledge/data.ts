import type { KnowledgeEntry } from "./types";

/**
 * GOGETTER Reliability Index — curated, versioned knowledge entries.
 *
 * Source: real-world buyer research that led to a successful budget used-car
 * purchase (validated against widely reported defect patterns: NHTSA
 * complaints, class-action records, and long-term owner reports). This is the
 * proprietary layer that turns spec-sheet scoring into genuine buyer advice.
 *
 * IMPORTANT — test-fixture safety: unit-test fixtures across the repo use
 * generic models (Camry, Corolla, Accord). NEVER add an entry whose aliases
 * match those models, or make-level scoring tests will start picking up
 * advisories. knowledge.test.ts pins this invariant.
 */

export const KNOWLEDGE_VERSION = "GOGETTER Reliability Index v1";

/** Battle-tested budget-buying principles, surfaced in checklists and AI context. */
export const GOLDEN_RULES: string[] = [
  "At budget price points (under ~$7,000), owner maintenance history matters more than brand name — a well-maintained Ford or Hyundai will treat you better than a neglected Toyota.",
  "A suspiciously cheap, newer, low-mileage example of a known-defect model is cheap for a reason — the current owner may know what's coming. Walk away.",
  "Spend ~$150 on a pre-purchase inspection (PPI) by an independent mechanic before handing over cash — it catches hidden rust, fluid leaks, and masked check-engine lights.",
  "Pull a vehicle history report (Carfax/AutoCheck) and confirm a clean title — a rebuilt or salvage title can make the car uninsurable or wildly expensive to insure.",
];

/** The three questions to ask any dealer BEFORE driving to the lot. */
export const DEALER_QUESTIONS: string[] = [
  "What is your exact dealer processing fee?",
  "Can you send me the vehicle history report right now, before I come in?",
  "What is the absolute total out-the-door price if I write a check today?",
];

/** What to do when a dealer dodges the three questions. */
export const DEALER_EVASION_RULE =
  "If they evade these questions or say \"you have to come in to see\" — walk away. At budget price points, a hidden $1,000 dealer fee ruins the deal.";

export const KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  // ───────────────────────── VALUE PICKS ─────────────────────────
  {
    id: "mazda3-skyactiv",
    make: "Mazda",
    models: ["Mazda3", "Mazda 3"],
    yearFrom: 2012,
    yearTo: 2014,
    severity: "value-pick",
    categories: ["value", "rust"],
    title: "SkyActiv-era Mazda3 — Corolla reliability without the Toyota tax",
    detail:
      "The 2012–2014 Mazda3 matches a Corolla for reliability but avoids the pricing premium. SkyActiv engines are excellent on gas and mechanically bulletproof, and it comes in sedan and versatile hatchback styles.",
    whyBuy: [
      "Fun to drive with sharp styling — rare at this price.",
      "SkyActiv engine: efficient and mechanically bulletproof.",
      "Avoids the inflated 'Toyota/Honda tax' on used prices.",
    ],
    watchFor: [
      "Check the underbody for rust if it lived in the rust belt (2012+ is much better protected than older Mazdas).",
    ],
    scoreDelta: 8,
    checklistItems: ["Inspect the underbody and wheel arches for rust, especially on rust-belt cars."],
  },
  {
    id: "honda-fit-magic-seats",
    make: "Honda",
    models: ["Fit"],
    yearFrom: 2009,
    yearTo: 2013,
    severity: "value-pick",
    categories: ["value", "maintenance"],
    title: "Second-gen Honda Fit — small-SUV cargo space in a tiny footprint",
    detail:
      "Honda's 'Magic Seats' fold flat or flip up, creating cargo room that rivals small SUVs. Stellar gas mileage and incredibly easy to park. Basic interior and highway noise are the honest trade-offs.",
    whyBuy: [
      "Magic Seats: cargo flexibility that rivals small SUVs.",
      "Stellar gas mileage; easy to park and maneuver.",
    ],
    watchFor: [
      "Confirm the spark plugs have been serviced — they are known to loosen over time on this generation.",
      "Basic interior and noticeable highway noise — judge on a highway test drive.",
    ],
    scoreDelta: 8,
    checklistItems: ["Ask when the spark plugs were last serviced (known to loosen on this generation)."],
  },
  {
    id: "pontiac-vibe-toyota-twin",
    make: "Pontiac",
    models: ["Vibe"],
    yearFrom: 2009,
    yearTo: 2010,
    severity: "value-pick",
    categories: ["value", "engine"],
    title: "Pontiac Vibe — a Toyota Matrix at a dead-brand discount",
    detail:
      "Under the Pontiac badge, the Vibe is entirely a Toyota Matrix — same frame, engine, and transmission. Because the Pontiac brand no longer exists, it often sells for thousands less than the identical Toyota.",
    whyBuy: [
      "Mechanically identical to the Toyota Matrix — same frame, engine, transmission.",
      "Dead-brand discount: often thousands cheaper than the Toyota twin.",
    ],
    watchFor: ["Prefer the 1.8L engine — the optional 2.4L in some trims is known to consume oil."],
    engineRules: [
      {
        displacements: ["2.4"],
        severityOverride: "caution",
        deltaOverride: -12,
        note: "This one has the 2.4L, which is known to consume oil — check the dipstick and service records.",
      },
    ],
    scoreDelta: 12,
    checklistItems: ["Confirm which engine it has — prefer the 1.8L; the 2.4L is known to consume oil."],
  },
  {
    id: "toyota-matrix-twin",
    make: "Toyota",
    models: ["Matrix", "Corolla Matrix"],
    yearFrom: 2009,
    yearTo: 2010,
    severity: "value-pick",
    categories: ["value", "engine"],
    title: "Toyota Matrix — practical Corolla-based hatch (the Vibe's twin)",
    detail:
      "The Matrix shares its frame, engine, and transmission with the Pontiac Vibe. Toyota reliability in a practical hatchback body; the Vibe twin is often even cheaper if you can find one.",
    whyBuy: [
      "Toyota powertrain reliability in a practical hatchback.",
      "Check the identical Pontiac Vibe too — usually thousands cheaper.",
    ],
    watchFor: ["Prefer the 1.8L engine — the optional 2.4L is known to consume oil."],
    engineRules: [
      {
        displacements: ["2.4"],
        severityOverride: "caution",
        deltaOverride: -12,
        note: "This one has the 2.4L, which is known to consume oil — check the dipstick and service records.",
      },
    ],
    scoreDelta: 8,
    checklistItems: ["Confirm which engine it has — prefer the 1.8L; the 2.4L is known to consume oil."],
  },
  {
    id: "scion-xb-toyota-bargain",
    make: "Scion",
    models: ["xB"],
    yearFrom: 2010,
    yearTo: 2014,
    severity: "value-pick",
    categories: ["value", "engine"],
    title: "Scion xB — Toyota powertrain, discontinued-brand depreciation",
    detail:
      "Scion was Toyota's youth sub-brand; because it was discontinued, these depreciate faster than Toyotas, making them used bargains. Standard Toyota powertrains keep them reliable and cheap to fix, and the boxy shape offers massive headroom and cargo space.",
    whyBuy: [
      "Standard Toyota powertrain — reliable and cheap to fix.",
      "Boxy shape = massive headroom and cargo space.",
      "Discontinued-brand depreciation makes it a genuine bargain.",
    ],
    watchFor: [
      "The 2.4L engine can burn oil — check the dipstick and ask for oil-change records.",
    ],
    scoreDelta: 8,
    checklistItems: ["Check the dipstick level and ask for oil-change records (2.4L can burn oil)."],
  },
  {
    id: "ford-focus-duratec",
    make: "Ford",
    models: ["Focus"],
    yearFrom: 2008,
    yearTo: 2011,
    severity: "value-pick",
    categories: ["value"],
    title: "2008–2011 Ford Focus — plain, durable, and underpriced",
    detail:
      "This generation uses the highly resilient 2.0L Duratec engine and a traditional, durable automatic — NOT the later PowerShift. Without a Japanese badge, these often have far lower mileage than a Civic or Corolla at the same price.",
    whyBuy: [
      "Resilient 2.0L Duratec engine and a traditional, durable automatic.",
      "Often much lower mileage than a same-price Civic or Corolla.",
    ],
    watchFor: [
      "This value applies ONLY to 2008–2011 — the 2012+ automatic Focus has the defective PowerShift transmission.",
    ],
    scoreDelta: 6,
  },

  // ───────────────────────── HARD AVOIDS ─────────────────────────
  {
    id: "ford-focus-powershift",
    make: "Ford",
    models: ["Focus"],
    yearFrom: 2012,
    yearTo: 2018,
    severity: "avoid",
    categories: ["transmission"],
    title: "PowerShift dual-clutch transmission failure (automatic)",
    detail:
      "The automatic 'PowerShift' dual-clutch in 2012–2018 Focuses is fundamentally defective: it shudders, stalls, loses power on the highway, and fails completely. Ford faced massive class-action lawsuits. A $3,000–$4,000 replacement tends to fail again.",
    watchFor: [
      "If it's the automatic, walk away — replacements fail again.",
      "On any test drive: shuddering, hesitation, or clunky low-speed shifts are the failure starting.",
    ],
    transmissionCaveat: {
      manualIsFine: true,
      note: "The manual-transmission versions are actually great and highly reliable — this warning only applies to the automatic. Verify the transmission before you go.",
    },
    scoreDelta: -45,
    checklistItems: ["Verify the transmission type FIRST — automatic PowerShift is a dealbreaker; manual is fine."],
  },
  {
    id: "ford-fiesta-powershift",
    make: "Ford",
    models: ["Fiesta"],
    yearFrom: 2011,
    yearTo: 2018,
    severity: "avoid",
    categories: ["transmission"],
    title: "PowerShift dual-clutch transmission failure (automatic)",
    detail:
      "Automatic 2011–2018 Fiestas use the same defective 'PowerShift' dual-clutch as the Focus: shuddering, stalling, total failure, and class-action lawsuits. These cars are incredibly cheap for a reason.",
    watchFor: [
      "If it's the automatic, walk away — replacements fail again.",
      "On any test drive: shuddering or hesitation at low speed is the failure starting.",
    ],
    transmissionCaveat: {
      manualIsFine: true,
      note: "The manual-transmission versions are actually great and highly reliable — this warning only applies to the automatic. Verify the transmission before you go.",
    },
    scoreDelta: -45,
    checklistItems: ["Verify the transmission type FIRST — automatic PowerShift is a dealbreaker; manual is fine."],
  },
  {
    id: "nissan-jatco-cvt",
    make: "Nissan",
    models: ["Sentra", "Versa", "Altima"],
    yearFrom: 2007,
    yearTo: 2017,
    severity: "avoid",
    categories: ["transmission"],
    title: "Jatco CVT transmission failure (automatic)",
    detail:
      "Nissan's early CVT automatics in this era are notoriously fragile: overheating, whining, slipping, and sudden death — frequently before 120,000 miles. Replacement costs upwards of $4,000, often more than the car is worth.",
    watchFor: [
      "CVTs in this era frequently fail before 120k miles — a $4,000+ repair.",
      "On a test drive: whining, rubber-band acceleration, or shuddering means the CVT is dying.",
    ],
    transmissionCaveat: {
      manualIsFine: true,
      note: "Manual-transmission versions are fine — this warning applies to every automatic Nissan of this era. Verify the transmission before you go.",
    },
    scoreDelta: -45,
    checklistItems: [
      "Verify the transmission type FIRST — automatic (CVT) is a dealbreaker; manual is fine.",
      "If you still test drive it: listen for CVT whine and feel for slipping under acceleration.",
    ],
  },
  {
    id: "chevy-cruze-cooling",
    make: "Chevrolet",
    models: ["Cruze"],
    yearFrom: 2011,
    yearTo: 2016,
    severity: "avoid",
    categories: ["cooling", "engine"],
    title: "Chronic coolant leaks, head gaskets, and 1.4L turbo failures",
    detail:
      "First-generation Cruzes are notorious money pits: cracked plastic coolant housings, blown head gaskets, failing water pumps, and turbocharger failures on the 1.4L. You fix one leak just to find another the next week.",
    watchFor: [
      "Check for coolant smell, low coolant, or white exhaust smoke — endemic cooling failures.",
      "1.4L turbo failures are common; listen for whining or check for oil in the intake.",
    ],
    scoreDelta: -45,
    checklistItems: ["Have the PPI pressure-test the cooling system — cracked coolant housings are endemic."],
  },
  {
    id: "chevy-sonic-cooling",
    make: "Chevrolet",
    models: ["Sonic"],
    yearFrom: 2012,
    yearTo: 2018,
    severity: "avoid",
    categories: ["cooling", "engine"],
    title: "Chronic fluid leaks and cooling-system failures",
    detail:
      "The Sonic shares the Cruze's failure patterns: cracked coolant housings, water pumps, head gaskets, and 1.4L turbo trouble. Cheap to buy, expensive to keep alive.",
    watchFor: [
      "Check for coolant smell, low coolant, or crusty residue around plastic cooling parts.",
      "Budget for repeated small leaks even if it passes inspection today.",
    ],
    scoreDelta: -45,
    checklistItems: ["Have the PPI pressure-test the cooling system — cracked coolant housings are endemic."],
  },
  {
    id: "hyundai-elantra-theta",
    make: "Hyundai",
    models: ["Elantra"],
    yearFrom: 2011,
    yearTo: 2016,
    severity: "avoid",
    categories: ["engine", "theft"],
    title: "Theta II/Nu engine failure + extreme theft risk",
    detail:
      "This generation's engines are prone to piston slap and sudden seizure from manufacturing debris blocking oil flow. Worse, these years lack an engine immobilizer ('Kia Boys' era) — they're trivially easy to steal, so insurance is astronomically expensive if you can get covered at all.",
    watchFor: [
      "Engine can seize without warning — listen for ticking/knocking at startup.",
      "No immobilizer: prime theft target, so get an insurance quote BEFORE buying.",
      "Check for severe oil consumption between changes.",
    ],
    scoreDelta: -45,
    checklistItems: [
      "Get an insurance quote BEFORE buying — no-immobilizer years are theft magnets and can be brutal to insure.",
      "Ask whether the engine was ever replaced under Hyundai's Theta II recall/extended warranty.",
    ],
  },
  {
    id: "kia-forte-theta",
    make: "Kia",
    models: ["Forte"],
    yearFrom: 2011,
    yearTo: 2016,
    severity: "avoid",
    categories: ["engine", "theft"],
    title: "Theta II/Nu engine failure + extreme theft risk",
    detail:
      "Same story as the sibling Elantra: engines prone to rod-bearing failure and seizure, plus no engine immobilizer in these years — a favorite of the 'Kia Boys' theft trend, which makes insurance astronomically expensive.",
    watchFor: [
      "Engine can seize without warning — listen for ticking/knocking at startup.",
      "No immobilizer: prime theft target, so get an insurance quote BEFORE buying.",
    ],
    scoreDelta: -45,
    checklistItems: [
      "Get an insurance quote BEFORE buying — no-immobilizer years are theft magnets and can be brutal to insure.",
      "Ask whether the engine was ever replaced under Kia's engine recall/extended warranty.",
    ],
  },
  {
    id: "dodge-dart-electrical",
    make: "Dodge",
    models: ["Dart"],
    yearFrom: 2013,
    yearTo: 2016,
    severity: "avoid",
    categories: ["electrical", "parts"],
    title: "Electrical gremlins, stalling, and vanishing parts supply",
    detail:
      "Fiat-Chrysler's Italian-architecture compacts were disastrous: severe electrical glitches, random stalling, and premature suspension failure. The Dart was discontinued quickly, so parts are getting harder to find.",
    watchFor: [
      "Electrical glitches and random stalling are the signature failures.",
      "Parts availability is shrinking — repairs take longer and cost more.",
    ],
    scoreDelta: -45,
  },
  {
    id: "chrysler-200-electrical",
    make: "Chrysler",
    models: ["200"],
    yearFrom: 2011,
    yearTo: 2017,
    severity: "avoid",
    categories: ["electrical", "parts"],
    title: "Electrical nightmares and poor build quality",
    detail:
      "The Chrysler 200 shares the Dart's disastrous reliability record: electrical faults, stalling, and premature suspension wear, with a shrinking parts supply after its quick discontinuation.",
    watchFor: [
      "Electrical glitches and random stalling are the signature failures.",
      "Premature suspension wear — listen for clunks over bumps.",
    ],
    scoreDelta: -45,
  },

  // ───────────────────────── CAUTION ─────────────────────────
  {
    id: "vw-jetta-golf-budget",
    make: "Volkswagen",
    models: ["Jetta", "Golf"],
    yearFrom: 2006,
    yearTo: 2013,
    severity: "caution",
    categories: ["engine", "maintenance", "parts"],
    title: "German maintenance costs — and turbo timing-chain roulette",
    detail:
      "A $6,500 Jetta feels premium but requires strict, expensive upkeep: German parts and labor cost roughly double a Japanese car. The 2.5L 5-cylinder is genuinely reliable; the 2.0T/1.4T turbos are not — skipped oil changes stretch the timing chain and destroy the engine.",
    watchFor: [
      "Demand complete oil-change records — skipped changes on turbo engines stretch the timing chain.",
      "Budget roughly double for parts and labor versus a Japanese rival.",
      "The 2.5L 5-cylinder is the reliable engine choice in this era.",
    ],
    engineRules: [
      {
        displacements: ["2.0", "1.4"],
        severityOverride: "avoid",
        deltaOverride: -45,
        note: "This one has the turbo engine — timing-chain stretch destroys these engines when oil changes were skipped. Walk away without complete service records.",
      },
    ],
    scoreDelta: -15,
    checklistItems: ["Require complete oil-change records — turbo timing chains die from skipped maintenance."],
  },
];
