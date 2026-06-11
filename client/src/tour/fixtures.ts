import type { Message } from "@/components/AIChatBox";
import type { SearchResult } from "@/lib/inventory";

/**
 * Static sample data for the guided tour — typed off the REAL client mirrors
 * so any server-shape drift fails `pnpm check`. The tour never performs live
 * NHTSA / LLM / Pinecone / Brave calls: detail pages use seeded-inventory
 * VINs (already local), Find-My-Car results come from this fixture, and the
 * advisor shows the scripted transcript below.
 */

/** Curated demo cars (server/inventory/data.curated.json) the tour visits. */
export const TOUR_VINS = {
  /** 2013 Mazda3 i Touring — proven value pick (lst_096). */
  detail: "JM1BL1M72D17N5W94",
  /** Compare pair: the Mazda3 vs the 2011 Honda Fit Sport (lst_097). */
  compareA: "JM1BL1M72D17N5W94",
  compareB: "JHMGE8H52BC04T7L6",
} as const;

const PHOTO_HATCH =
  "https://res.cloudinary.com/dod8ajzjd/image/upload/f_auto,q_auto,w_1000,c_limit/v1781193189/gogetter/src/c08fb3cf6c6a39a4.webp";
const PHOTO_SEDAN =
  "https://res.cloudinary.com/dod8ajzjd/image/upload/f_auto,q_auto,w_1000,c_limit/v1781193190/gogetter/src/e485f9e3d3e03199.webp";

/**
 * Sample Find-My-Car result (a live search would call the LLM for
 * narratives). Mirrors the real curated story: a value pick on top, an
 * honest middle pick, and the classic trap — flagged, not hidden.
 */
export const TOUR_SEARCH_RESULT: SearchResult = {
  scanned: 102,
  eligible: 14,
  shortlisted: 3,
  zipApplied: true,
  hiddenAvoidCount: 0,
  semanticApplied: true,
  suggestions: [],
  valuePickAlternatives: [],
  matches: [
    {
      listing: {
        id: "lst_096",
        vin: TOUR_VINS.detail,
        condition: "Used",
        year: 2013,
        make: "Mazda",
        model: "Mazda3",
        trim: "i Touring",
        bodyStyle: "Hatchback",
        fuel: "Gas",
        price: 6400,
        mileage: 88000,
        mpg: 32,
        exteriorColor: "Sky Blue",
        sellerType: "Independent Dealer",
        dealerName: "Beltway Budget Autos",
        sellerTenure: "9 yrs in business",
        city: "Fairfax",
        state: "VA",
        distanceMiles: 9,
        zip: "22030",
        photos: [{ url: PHOTO_HATCH, source: "stock", caption: "2013 Mazda Mazda3 i Touring (representative image)" }],
        dealerBlurb: "One-owner SkyActiv hatch with full service records.",
      },
      matchScore: 91,
      qualityScore: 84,
      qualityGrade: "B+",
      fit: { price: 95, reliability: 92, efficiency: 84, distance: 96, mileage: 78 },
      reasons: [
        "Under budget with money left for the pre-purchase inspection.",
        "SkyActiv-era Mazda3s are a documented value pick in the Reliability Index.",
      ],
      narrative: {
        listingId: "lst_096",
        whyPicked:
          "Toyota-grade reliability without the Toyota badge tax — the SkyActiv Mazda3 is the textbook smart buy at this price.",
        advantages: ["Conventional automatic (no CVT)", "Cheap, available parts", "Genuinely fun to drive"],
        disadvantages: ["Road noise on the highway", "Smaller back seat than a Corolla"],
        watchFor: ["Confirm the infotainment screen works — replacements are pricey."],
      },
      advisories: [
        {
          id: "mazda3-skyactiv-value",
          severity: "value-pick",
          title: "SkyActiv Mazda3: proven budget value pick",
          detail:
            "2012–2014 Mazda3s deliver top-tier reliability at a discount because they lack the Toyota/Honda badge premium.",
          watchFor: ["Rust on the rear wheel arches in salt states."],
          whyBuy: ["Reliable conventional automatic", "Low running costs"],
          appliedDelta: 8,
          source: "GOGETTER Reliability Index v1",
        },
      ],
      riskLevel: "clear",
      trust: { level: "approved", reasons: ["Established dealer (9 yrs)", "Price in line with the market"] },
    },
    {
      listing: {
        id: "lst_097",
        vin: TOUR_VINS.compareB,
        condition: "Used",
        year: 2011,
        make: "Honda",
        model: "Fit",
        trim: "Sport",
        bodyStyle: "Hatchback",
        fuel: "Gas",
        price: 5900,
        mileage: 105000,
        mpg: 31,
        exteriorColor: "Milano Red",
        sellerType: "Private Seller",
        dealerName: "Private Seller — Dana R.",
        city: "Arlington",
        state: "VA",
        distanceMiles: 14,
        zip: "22201",
        photos: [{ url: PHOTO_HATCH, source: "stock", caption: "2011 Honda Fit Sport (representative image)" }],
        dealerBlurb: "Adult-owned commuter, timing chain engine, garage kept.",
      },
      matchScore: 86,
      qualityScore: 82,
      qualityGrade: "B+",
      fit: { price: 97, reliability: 90, efficiency: 82, distance: 90, mileage: 64 },
      reasons: ["Legendary Honda reliability and a magic cargo hold.", "Private sale — budget for an independent inspection."],
      narrative: {
        listingId: "lst_097",
        whyPicked: "The Fit is the practicality champion — Honda dependability with hatch space that shames small SUVs.",
        advantages: ["Timing chain (no belt service)", "Huge, flexible cargo area"],
        disadvantages: ["Buzzy at 70+ mph", "Higher miles than the Mazda3"],
        watchFor: ["Verify clean title in the seller's own name before money changes hands."],
      },
      riskLevel: "clear",
      trust: { level: "neutral", reasons: ["Private sale — use the private-seller safety steps"] },
    },
    {
      listing: {
        id: "lst_091",
        vin: "3N1AB7AP5FY2K8M41",
        condition: "Used",
        year: 2015,
        make: "Nissan",
        model: "Sentra",
        trim: "SV",
        bodyStyle: "Sedan",
        fuel: "Gas",
        price: 5500,
        mileage: 88000,
        mpg: 30,
        exteriorColor: "Gun Metallic",
        sellerType: "Independent Dealer",
        dealerName: "QuickFlip Motors",
        sellerTenure: "8 months in business",
        city: "Springfield",
        state: "VA",
        distanceMiles: 11,
        zip: "22150",
        photos: [{ url: PHOTO_SEDAN, source: "stock", caption: "2015 Nissan Sentra SV (representative image)" }],
        dealerBlurb: "Newer body style! Priced to move this week.",
        regionFlags: ["Listed 3x in 90 days"],
      },
      matchScore: 58,
      qualityScore: 41,
      qualityGrade: "D",
      fit: { price: 98, reliability: 22, efficiency: 80, distance: 94, mileage: 78 },
      reasons: ["Looks like a deal on paper — the Reliability Index says otherwise."],
      narrative: {
        listingId: "lst_091",
        whyPicked:
          "Shown so you can see the warning system: a newer car suspiciously cheap is usually cheap for a reason.",
        advantages: ["Newest model year in the shortlist"],
        disadvantages: ["Known CVT transmission failures for this generation", "Short-tenure seller relisting the same car"],
        watchFor: ["Walk away unless a transmission shop inspects the CVT first."],
      },
      advisories: [
        {
          id: "nissan-jatco-cvt",
          severity: "avoid",
          title: "2013–2017 Sentra: Jatco CVT failures",
          detail:
            "This generation's CVT has widely documented premature failures; replacement often exceeds the car's value.",
          watchFor: ["Shudder or rubber-band feel on test drive", "Any delay engaging Drive"],
          appliedDelta: -45,
          source: "GOGETTER Reliability Index v1",
        },
      ],
      riskLevel: "high",
      trust: {
        level: "flagged",
        reasons: ["Known-defect model priced under market", "Seller in business under a year"],
        suspiciousDeal: true,
      },
    },
  ],
};

/** Scripted advisor exchange — what the live chat does, without the LLM. */
export const TOUR_ADVISOR_TRANSCRIPT: Message[] = [
  { role: "user", content: "Why did this car get this score?" },
  {
    role: "assistant",
    content:
      "This **2013 Mazda3 i Touring** scores well for three reasons:\n\n" +
      "- **Reliability** — SkyActiv-era Mazda3s are a curated *value pick* in the GOGETTER Reliability Index: conventional automatic (no CVT), cheap parts, strong owner track record.\n" +
      "- **Age & mileage** — 88k miles on a 2013 is right on the normal wear curve.\n" +
      "- **Efficiency** — 32 mpg combined keeps running costs low.\n\n" +
      "The score isn't a guess — every point comes from the decoded specs and the curated knowledge base.",
  },
  { role: "user", content: "What should I inspect before buying?" },
  {
    role: "assistant",
    content:
      "Three things for this exact car:\n\n" +
      "1. **Rear wheel arches** — early-2010s Mazdas can rust there in salt states.\n" +
      "2. **Infotainment screen** — confirm it works; replacements are disproportionately pricey.\n" +
      "3. **Service records** — ask the dealer the three GOGETTER questions: *What's your return policy? Has it been inspected? Can I take it to my mechanic?* A hard no to the last one is your cue to walk.\n\n" +
      "And always budget ~$150 for an independent pre-purchase inspection — it's the cheapest insurance in car buying.",
  },
];
