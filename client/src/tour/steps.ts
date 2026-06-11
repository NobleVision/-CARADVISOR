import { TOUR_VINS } from "./fixtures";

/** Side-effect hooks a step can use before it is shown. */
export type TourStepContext = {
  isAuthenticated: () => boolean;
  /** Sign into the shared demo account (admin/admin) and refresh auth. */
  demoLogin: () => Promise<void>;
};

export type TourStep = {
  id: string;
  /** Pathname this step lives on — the engine navigates there if needed.
   *  Empty string = stay wherever the tour currently is (nav/finish steps). */
  route: string;
  /** Full href when the route needs query params (defaults to `route`). */
  href?: string;
  /** CSS selector to spotlight; empty string = centered popover. */
  target: string;
  title: string;
  body: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  beforeEnter?: (ctx: TourStepContext) => Promise<void> | void;
};

const DETAIL_ROUTE = `/vehicle/${TOUR_VINS.detail}`;

// ── Shared beats (Quick is a subset of Full) ──

const STEP_VIN_FORM: TourStep = {
  id: "vin-form",
  route: "/lookup",
  target: '[data-tour="vin-form"]',
  title: "Start with any VIN",
  body:
    "Paste a VIN from a listing, a windshield, or a title and GOGETTER decodes the full vehicle profile. " +
    "For this tour we'll use a sample car from the demo inventory — no live lookups, nothing leaves your browser session.",
  side: "bottom",
};

const STEP_SCORE: TourStep = {
  id: "score",
  route: DETAIL_ROUTE,
  target: '[data-tour="score-card"]',
  title: "The GOGETTER Score",
  body:
    "Every car gets a transparent 0–100 score built from four subscores — reliability, safety, age & mileage, " +
    "and efficiency. No black box: the “Why this score” panel shows exactly which facts moved the number.",
  side: "left",
};

const STEP_ADVISORY: TourStep = {
  id: "advisory",
  route: DETAIL_ROUTE,
  target: '[data-tour="advisory"]',
  title: "The Reliability Index",
  body:
    "Curated model-year intelligence from real buyer research. Proven value picks (like this Mazda3) get a boost; " +
    "documented traps — CVT-eating Sentras, PowerShift Focuses — get the “Don't walk away. RUN.” treatment.",
  side: "top",
};

const STEP_ADVISOR: TourStep = {
  id: "advisor",
  route: DETAIL_ROUTE,
  target: '[data-tour="advisor-chat"]',
  title: "Ask the AI Advisor",
  body:
    "Chat about reliability, inspection priorities, fair pricing, seller questions — answers are grounded in the " +
    "decoded data and the Reliability Index. This preview is a scripted sample; after the tour, ask anything live.",
  side: "top",
};

const STEP_HELP: TourStep = {
  id: "help",
  route: "", // the NavBar is on every page — no navigation needed
  target: '[data-tour="help-menu"]',
  title: "Run this tour anytime",
  body: "The “?” menu re-launches the quick or full tour whenever you want a refresher.",
  side: "bottom",
  align: "end",
};

// ── Full-tour-only beats ──

const STEP_NL_SEARCH: TourStep = {
  id: "nl-search",
  route: "/find",
  target: '[data-tour="nl-search"]',
  title: "Describe what you need — in English",
  body:
    "No VIN yet? Type something like “a safe, efficient car under $7k for my 15-year-old new driver within " +
    "30 miles of 22030” and GOGETTER translates it into filters for you.",
  side: "right",
};

const STEP_CRITERIA: TourStep = {
  id: "criteria",
  route: "/find",
  target: '[data-tour="criteria"]',
  title: "Your criteria, your priorities",
  body:
    "Budget, distance, mileage, body style, seller type — plus two dials that tell the ranking engine what YOU " +
    "care about: price vs. reliability, and how much fuel efficiency matters.",
  side: "right",
};

const STEP_BUDGET_MODE: TourStep = {
  id: "budget-mode",
  route: "/find",
  target: '[data-tour="budget-mode"]',
  title: "Budget Buyer Mode",
  body:
    "At budget prices, maintenance history beats brand name. This switch hides models with documented serious " +
    "defects, boosts proven value picks — and always tells you exactly how many trouble cars it hid.",
  side: "right",
};

const STEP_RESULTS: TourStep = {
  id: "results",
  route: "/find",
  target: '[data-tour="results"]',
  title: "A shortlist, not a haystack",
  body:
    "These are sample results. Each match shows fit bars, a seller trust signal, and plain-English reasons. " +
    "Notice #3: a newer Sentra, suspiciously cheap — flagged with the RUN warning instead of being quietly recommended. " +
    "That honesty is the whole point.",
  side: "left",
};

const STEP_COMPARE: TourStep = {
  id: "compare",
  route: "/compare",
  href: `/compare?vins=${TOUR_VINS.compareA},${TOUR_VINS.compareB}`,
  target: '[data-tour="compare"]',
  title: "Compare your finalists",
  body:
    "Specs, scores, and advisories side by side — here the Mazda3 against a Honda Fit, both proven budget picks " +
    "from the demo inventory.",
  side: "bottom",
};

const STEP_GARAGE: TourStep = {
  id: "garage",
  route: "/saved",
  target: '[data-tour="garage"]',
  title: "Your Garage",
  body:
    "Saved cars live here with price-drop tracking and alerts. (Anonymous visitors are signed into the shared demo " +
    "account automatically for this stop — your own Garage starts when you sign in.)",
  side: "bottom",
  beforeEnter: async (ctx) => {
    if (!ctx.isAuthenticated()) {
      try {
        await ctx.demoLogin();
      } catch {
        // Non-fatal: the step still shows the page's signed-out state.
      }
    }
  },
};

const STEP_HISTORY: TourStep = {
  id: "history",
  route: "/history",
  target: '[data-tour="history"]',
  title: "Search History",
  body: "Every VIN you decode is kept here so you can reopen any report when the seller calls back.",
  side: "bottom",
};

const finishStep = (variant: "quick" | "full"): TourStep => ({
  id: "finish",
  route: "", // centered popover wherever the tour ended
  target: "",
  title: variant === "quick" ? "That's the core loop" : "You've seen the whole showroom",
  body:
    variant === "quick"
      ? "Decode → score → ask. Try it yourself with any real VIN — or take the Full tour from the “?” menu to see Find My Car, Compare, the Garage, and more."
      : "There's still more to explore — the live inventory Map and the New Cars showroom are one click away in the nav. Happy (confident) car hunting.",
});

export const QUICK_STEPS: TourStep[] = [
  STEP_VIN_FORM,
  STEP_SCORE,
  STEP_ADVISORY,
  STEP_ADVISOR,
  STEP_HELP,
  finishStep("quick"),
];

export const FULL_STEPS: TourStep[] = [
  { ...STEP_VIN_FORM, title: "Welcome to GOGETTER", body: "This 5-minute tour walks every major feature using sample data — no live lookups. First stop: the VIN decoder, where every report starts." },
  STEP_SCORE,
  STEP_ADVISORY,
  {
    id: "checklist",
    route: DETAIL_ROUTE,
    target: '[data-tour="checklist"]',
    title: "Your pre-purchase action plan",
    body:
      "A personalized checklist for THIS car — model-specific inspection items, the golden rules, and the three " +
      "dealer questions that expose a bad seller in under a minute.",
    side: "top",
  },
  STEP_ADVISOR,
  STEP_NL_SEARCH,
  STEP_CRITERIA,
  STEP_BUDGET_MODE,
  STEP_RESULTS,
  STEP_COMPARE,
  STEP_GARAGE,
  STEP_HISTORY,
  STEP_HELP,
  finishStep("full"),
];
