# GOGETTER AI Used Car Advisor — Project TODO

## Foundation
- [x] Establish elegant design system (typography, color palette, theming) in index.css + index.html
- [x] Define database schema (vehicles cache, search history, saved vehicles)
- [x] Push DB migration

## Feature 1: VIN Lookup (NHTSA vPIC)
- [x] Backend service to call NHTSA vPIC DecodeVin API
- [x] Parse decoded fields (make, model, year, engine, drive type, body class, safety features)
- [x] tRPC procedure for VIN decode
- [x] VIN lookup UI with input, validation, and decoded specs display

## Feature 2: Vehicle Scoring Engine
- [x] Reliability heuristics by make/model
- [x] Scoring algorithm (specs, reliability, mileage, age)
- [x] Score breakdown output (subscores + overall)
- [x] Score display UI with visual gauge/breakdown

## Feature 3: AI Conversational Advisor
- [x] LLM-powered chat procedure with VIN context
- [x] Score explanation + buying recommendations
- [x] Chat UI integrated with vehicle context

## Feature 4: Vehicle Comparison Tool
- [x] Compare 2+ VINs side-by-side
- [x] Parallel specs + scores layout

## Feature 5: Search History & Saved Vehicles
- [x] Persist search history per user
- [x] Save/unsave vehicles
- [x] History + saved vehicles UI

## Feature 6: Premium Tier Teaser Panel
- [x] Locked panel previewing Carfax/CarGurus data (accident history, ownership count, market value)
- [x] Premium upgrade CTA + dedicated Premium page

## Polish & Quality
- [x] Landing/home page with premium aesthetic
- [x] Navigation structure (top nav)
- [x] Loading/empty/error states
- [x] Vitest tests for backend procedures (VIN validation + scoring engine)
- [x] README documentation

## v2 — Inventory Discovery Engine (buyer profile + ranked shortlist)

### Demo login
- [x] Add username/password credential auth (demo account admin/admin)
- [x] Backend: credential login procedure issues a signed session cookie/JWT
- [x] Frontend: "Sign in" supports demo login (username/password)
- [x] Demo user upserted on first login (synthetic openId demo_admin)

### Seeded inventory data layer (pluggable for future real listings API)
- [x] Inventory schema: listings with VIN, year/make/model, price, mileage, body style, fuel type, location + distance, dealer name, photo
- [x] Provider abstraction so a real listings API can drop in later (single getInventory() boundary)
- [x] Seed realistic sample inventory (60 listings, varied make/model/price/mileage/body/fuel/location)

### Buyer-criteria matching + ranking engine
- [x] Capture criteria: budget/price range, max distance, body style, fuel type, max mileage, price-vs-reliability weighting, fuel-efficiency priority
- [x] Filter inventory by hard constraints (price, distance, mileage, style, fuel)
- [x] Weighted match score per listing (reuse GOGETTER reliability score + price/efficiency/distance fit)
- [x] Return ranked shortlist (top ~5 best matches), filter out low-quality cars

### Buyer-profile intake + shortlist UI
- [x] Guided intake flow (Find My Car) capturing all criteria with elegant UI
- [x] Ranked best-matches results page (cards: photo, price, mileage, match %, score, dealer, distance)
- [x] Each match card carries its VIN (links into the existing decode/score/advisor flow)
- [x] Add nav entry + route; preserve all existing features

### Verification
- [x] Tests for matching/ranking engine + credential auth (38 tests passing)
- [x] End-to-end browser verification of demo login + find-my-car flow
- [x] Checkpoint + deliver

### Per-car AI recommendation narrative (refinement)
- [x] Shortlist returns ~4-5 best-fit cars
- [x] For each car, LLM-generated narrative: why picked, advantages, disadvantages/trade-offs
- [x] "What to watch for": likely maintenance by make/model/age/mileage
- [x] History/regional red flags (e.g. flood-risk area, high-mileage wear, known model issues) + verify-with-Carfax/CarGurus nudge

### v2 polish (gap closure before final checkpoint)
- [x] MatchCard: add a visible "View full report" CTA linking to /vehicle/:vin (existing decode/score/advisor flow)
- [x] MatchCard: surface regionFlags as visible warning badges (e.g. flood-risk area), not just a disclaimer
- [x] Verify a flagged car shows its warning + the VIN link works in the browser
- [x] Fix: inventory VINs are synthetic and fail NHTSA decode — added listing->DecodedVehicle adapter + find.reportByVin; VehicleDetail tries inventory first, falls back to NHTSA
- [x] Show dealer context (price/dealer/location) + region-flag warnings on the inventory-backed detail page
- [x] Accurate provenance label ("Local dealer listing" vs "Decoded via NHTSA vPIC")
- [x] Tests for adapter + scoring through the engine (44 tests passing)
- [x] Re-run tests, final checkpoint, deliver

## v3 — Discovery depth, new cars, sellers, local export

- [x] ZIP code input in buyer profile; distance filtering reflects user location (geo helper + haversine)
- [x] Save individual match to Garage (per-card Save button + toast + Saved state)
- [x] Save entire shortlist to Garage ("Save all to Garage")
- [x] "Compare my matches" sends top picks into the side-by-side Compare view via ?vins= handoff
- [x] Compare page reads VINs from URL and auto-decodes via inventory-aware path + NHTSA fallback
- [x] Listing data model: condition (new/used), sellerType (franchise/independent/private), photos[] with provenance, warranty, MSRP, model reputation
- [x] Reseed inventory: 90 listings (60 used, 30 new), all seller types, dealer-photo demo subset
- [x] Real-photo provenance: dealer/stock/placeholder tagging + "Dealer photos" credibility badge
- [x] New-car experience: dedicated New Cars browse page (reputation, trims, MSRP, warranty, efficiency)
- [x] New-car aware scoring (no mileage penalty) + new vs. used framing in advisor/recommend
- [x] Private seller / independent dealer support: seller-type filters + trust-cue badges
- [x] Seller-type guidance in advisor + recommend (private-sale title/lien/inspection, independent as-is, new warranty)
- [x] Region-flag warnings surfaced on cards and detail pages
- [x] Tests updated for new schema + filters + ZIP distance (54 passing)
- [x] End-to-end browser verification of all new features
- [x] Export full codebase to local @CARADVISOR directory with run instructions

## v4 — Vercel serverless, Neon, de-brand, landing video & gap features

### Serverless refactor + database
- [x] Move the tRPC router behind a single Vercel function (`api/trpc/[trpc].ts`, node-http adapter)
- [x] Framework-agnostic `createContext({req,res})` shared by the Vercel function and the local Express dev server (cookies via `res.setHeader`, `SameSite=Lax`)
- [x] Migrate Drizzle schema + driver from MySQL/TiDB to **Neon serverless Postgres** (`neon-http`, `onConflictDoUpdate`); regenerate migrations
- [x] `vercel.json` (SPA rewrites, function config, daily monitor cron)
- [x] Dependency-free cookie serialize/parse (avoids a duplicate `cookie` version's broken types)

### Branding cleanup
- [x] Remove every "Manus" reference (plugins, OAuth, storage proxy, heartbeat, notifications, Forge LLM, docs, config); repo grep is clean
- [x] Delete the `.project-config.json` build artifact (contained live secrets — rotate them)
- [x] Rename env vars `BUILT_IN_FORGE_*` → `LLM_API_*`; local Express dev kept for HMR

### Landing page + video background
- [x] New `/login` cinematic landing page with the demo sign-in card
- [x] Rotating background video: shuffled order (no back-to-back repeat), crossfade between two preloaded `<video>` layers, error-skip, `prefers-reduced-motion` + poster fallback
- [x] Wire up the 10 generated clips in `client/public/videos/` (renamed to clean slugs)
- [x] 10 cinematic Gemini Omni Flash b-roll prompts (`docs/landing-video-prompts.md`)

### Gap features (the three Manus had suggested)
- [x] Contact seller — tailored private-owner vs. dealership templates (inquiry/offer/inspection/paperwork), copy + email, optional AI personalization
- [x] New-car trim configurator — pick trim + options; price/MSRP/MPG/quality score recompute live
- [x] Garage price-drop tracker (per-car sparkline) + saved-search alerts + in-app notifications center, fed by the monitor cron

### Verification
- [x] `pnpm check` clean · `pnpm test` 54 passing · `pnpm build` succeeds · `pnpm db:push` applied to Neon
- [x] Live smoke test: demo login cookie → `auth.me`, find/save, monitor → price-drop notification

### Follow-ups (not yet done)
- [ ] Integrate a real licensed listings API behind the existing `InventoryProvider` boundary (replaces the static seed + price simulation)
- [ ] Live Carfax/CarGurus history behind the premium tier
- [ ] Email/SMS delivery for alerts (currently in-app only) — e.g. Resend + a `notifications` dispatcher
- [ ] Encode WebM/AV1 variants of the landing clips for smaller transfers; consider lazy-loading non-first clips
- [ ] Code-split the client bundle (the markdown/syntax-highlighter chunks make the initial JS large)
- [ ] Replace the placeholder SVG poster with a real first-frame poster image

## v5 — Buyer-First Co-Pilot (GOGETTER Reliability Index, hybrid search, trust & checklists)

Built from the June 9, 2026 strategy meeting + the real-world car-search research notes ("Eric's playbook"). Theme: *Empowering Car Buyers via Intelligent Decision Support* · Feature: *Dual-Layer AI Scoring & Recommendation Engine* (macro layer live; micro/VIN-history layer remains the premium Tier-2 path).

### Knowledge base (the proprietary macro layer)
- [x] `server/knowledge/` — GOGETTER Reliability Index v1: 16 curated model-year entries (hard avoids: Nissan Jatco CVT 2007–17, Ford PowerShift 2011/12–18, Chevy Cruze/Sonic cooling, Hyundai/Kia Theta II + theft, Dodge Dart / Chrysler 200; caution: VW Jetta/Golf 2006–13 w/ 2.0T/1.4T escalation; value picks: Mazda3 SkyActiv, Honda Fit, Pontiac Vibe, Toyota Matrix, Scion xB, Ford Focus Duratec)
- [x] Lookup with model-alias normalization ("MAZDA3"/"Mazda 3"), inclusive year ranges, engine-displacement rules (2.4L oil-burner downgrade, VW turbo escalation), and the manual-transmission exception (PowerShift/CVT warnings waive on a decoded manual)
- [x] Golden rules + the three smart dealer questions exported for checklists and AI context
- [x] Guard: knowledge entries must never match generic test-fixture models (Camry/Corolla/Accord) — pinned by tests

### Scoring & matching integration
- [x] `scoreVehicle` applies advisory deltas to the reliability subscore (floor 15), pushes plain-English notes, returns optional `advisories[]` + `riskLevel`; a non-waived hard avoid caps the overall score at D
- [x] `matching.ts`: advisory-adjusted reliability fit + quality grade (same D cap), "Known issue:" / "GOGETTER value pick:" reasons, trust signal attached to every match
- [x] `trust.ts`: rule-based GOGETTER Approved / flagged levels + the suspicious-deal detector (known-defect model priced too well for its age/mileage)
- [x] Budget Buyer Mode: reliability-dial floor (70), value-pick boost, hard-avoid exclusion from the shortlist with an honest `hiddenAvoidCount`
- [x] Optional `makes[]` hard filter (set via natural language), backward compatible with legacy saved-search criteria jsonb

### Hybrid natural-language search
- [x] `server/search/intent.ts` — LLM structured-output extraction with an always-on deterministic rules parser (price/$7k forms, ZIP vs. price disambiguation, distance, mileage caps, body/fuel/seller/makes, use cases, priority dials, auto Budget-Mode at ≤$10k)
- [x] `find.parseIntent` procedure + FindMyCar textarea: "Interpret & set filters" visibly moves the existing controls, shows interpreted-as chips, removable make chips
- [x] `searchText`/`useCase` flow into narratives ("Chosen with your situation in mind — a new/teen driver…")

### Narratives, checklist, recalls, advisor
- [x] LLM narrative prompt + deterministic fallback both consume advisories, trust, and use case (knowledge leads advantages/watchFor)
- [x] `server/checklist.ts` + `find.checklist` + ChecklistCard — personalized pre-purchase action plan (history report, $150 PPI, 3 dealer questions + evasion rule, private-sale title/lien/payment, model-specific checks, insurance-quote-first for theft targets, high-mileage/regional items), copy-to-clipboard
- [x] `server/recalls.ts` + `vehicle.recalls` + PublicRecords card — live NHTSA recall campaigns by make/model/year (verified live: 5 recalls for a 2014 Sentra), defensive parsing, 6h cache, null-safe
- [x] Advisor chat context includes KNOWN MODEL ISSUES so answers cite the exact trap/value story for real decoded VINs too

### UI
- [x] AdvisoryCallout — "Don't walk away — RUN." banner (role=alert, motion-safe pulse) / amber caution / emerald value pick / manual-waiver good news; rendered on MatchCard and VehicleResult (incl. Compare)
- [x] GOGETTER Approved + Value Pick badges on MatchCard; hidden-trouble-cars chip in the results summary bar
- [x] Zero-result intelligence: validated one-click relaxations ("+N unlocks") that apply-and-rerun, plus curated value-pick alternatives linking to full reports
- [x] Dual-layer caption under the score gauge (Layer 1 live · Layer 2 Premium coming soon)
- [x] 12 curated demo listings (`data.curated.json`, concatenated by the provider so `genInventory.mjs` can't wipe them): the $5,500 low-mile Sentra trap, PowerShift Focus, Theta-II Elantra, Cruze, VW 2.5L, and the value picks — plus the "good ending" 2010 Elantra

### Verification
- [x] `pnpm check` clean · `pnpm test` 118 passing (54 existing + 64 new) · `pnpm build` succeeds (client + serverless bundles)
- [x] Live HTTP smoke through the dev server: parseIntent (kitchen-sink teen-driver sentence) → search w/ Budget Mode (4 traps hidden, value picks ranked top, trust approved) → trap shortlist shows RUN + suspicious-deal → checklist for the Sentra (3 dealer questions) → live NHTSA recalls → demo login → Garage save round-trips advisories through jsonb (score capped 50/D)

### Tier-2 follow-ups (deliberately deferred from the meeting)
- [ ] Micro layer: real per-VIN history (Carfax/AutoCheck partnership or validated alternative sourcing) behind the premium tier — the acknowledged critical bottleneck (~$29–40/report retail)
- [ ] Live licensed listings API behind the existing `InventoryProvider` boundary
- [ ] Monetization: premium subscriptions (deep history, exports, priority alerts), non-conflicting affiliates (financing/insurance/warranty/repair), dealer "Trust Stamp" program, B2B auction/clearinghouse tooling
- [ ] Crowdsourced prior-owner feedback ("Private Investigator") — opt-in, anonymized, consented
- [ ] Marketing: problem→solution micro-drama commercial, shareable "My AI Car Find" cards, social engagement pipeline

## v6 — Awards-worthy landing page, UI refresh & G-Gauge brand

### Brand
- [x] Hand-crafted SVG "G-Gauge" monogram (G ring whose mouth is a speedometer redline gap; crossbar = needle; gold gradient #F6D488→#C9A24A from the existing palette) — mark, lockup, favicon tile, OG card in `client/public/brand/`
- [x] PNG set rendered via `scripts/render-brand-pngs.mjs` (resvg-js, dev-only): favicon-32, apple-touch-icon 180, icon-512, og-image 1200×630
- [x] `Logo` component (inline SVG, useId-namespaced gradients) in NavBar, Login, footer, 404, route fallback
- [x] index.html: favicon links, theme-color, description, OG/Twitter cards, new title

### Landing page (`/`, lazy chunk ~54KB gz + three.js chunk ~128KB gz)
- [x] Three.js particle hero: ~14k champagne particles assemble into a procedural fastback silhouette (no model download), pointer parallax, scroll dispersal, idle shimmer; pauses off-screen/hidden-tab; WebGL probe + context-loss + reduced-motion → static fallback; full dispose on unmount
- [x] GSAP ScrollTrigger story: masked-line hero reveal, marquee strip, pinned "One honest number. Five real inputs." score build (38→92 + bars), the RUN stamp demo (real AdvisoryCallout over a mock trap listing), cinematic b-roll interlude (LazyMount — 35MB of clips never load early), feature grid stagger, how-it-works rail draw, Eric-story quote + counters, gold CTA band
- [x] All motion inside `gsap.matchMedia("(prefers-reduced-motion: no-preference)")` — reduced-motion users get a fully static, fully visible page
- [x] Routing: `/` = landing, VIN lookup moved to `/lookup` (NavBar, Login, empty-state links updated); ScrollToTop on route change; Suspense outside Switch (wouter patch constraint)

### UI refresh
- [x] Shared `PageHero` (eyebrow + serif headline + hairline + grain) and `SiteFooter` (full + compact) across find/new-cars/compare/saved/history/premium/vehicle/lookup
- [x] CSS utilities: `fade-rise` entrance, `card-lift` hover glow, `marquee-track` — all reduced-motion safe; applied across cards/heroes
- [x] NotFound re-skinned to the midnight-showroom brand (was off-brand light slate)
- [x] Fixed pre-existing 17px horizontal overflow on /new-cars at 1024px (sort group couldn't wrap)

### Verification
- [x] `pnpm check` clean · `pnpm test` 118 passing · `pnpm build` clean; bundle audit: main chunk unchanged, gsap/three confined to lazy landing chunks (guardrail grep)
- [x] Scripted Chrome DevTools QA (`scripts/qa-browser.mjs`, puppeteer-core + system Chrome): 10 routes × 4 breakpoints (375/768/1024/1440) — zero console errors, zero horizontal overflow (top + mid-scroll), 57 FPS scroll sample under software GL, mid-pin navigation leaves no ghost pins + ScrollToTop verified, reduced-motion emulation shows static fallback with finished content, demo login lands on /lookup, all brand assets 200
- [x] Caught & fixed by QA: shader precision mismatch (uTime highp/mediump), the /new-cars overflow

### v6.1 — Particle car: real sedan proportions
- [x] Rebuilt the hero point-cloud geometry from a real midsize sedan's published dimensions (10th-gen Honda Accord ratios): H/L 0.297, W/L 0.381, WB/L 0.580, wheel ⌀/L 0.135, asymmetric overhangs; wheel-arch arcs traced into the profile; two-tier width model (body + inset greenhouse with tumblehome and shoulder step at the beltline); 3% beltline-accent particles
- [x] Sourcing investigated first: no CC0 + realistic + non-interactively-downloadable sedan GLB exists (three.js ferrari upstream disabled/NC-suspected; Poly Haven has no car; poly.pizza/Khronos stylized; Sketchfab login-gated) → dimension-accurate procedural wins (zero asset, zero perf delta, no license surface)
- [x] New `scripts/preview-car-points.mts` verification loop: 6 proportion gates (all pass) + side/front/3-4 orthographic PNG renders, checked before browser
- [x] Verified: pnpm check/test (118)/build clean; browser QA suite all-pass, 57 FPS unchanged, zero console errors, zero mobile overflow
- [ ] Follow-up: static fallback art `/img/hero-car.svg` (reduced-motion/no-WebGL path) still shows the old stylized art — could be retraced to match

## v7 — Real-data cloud services (Pinecone · Cloudinary · Z.AI · Mapbox · Brave)

### Foundation
- [x] `server/_core/env.ts`: 7 new keys + Z.AI fallback chain (explicit `LLM_*` always wins; the Z.AI key is never sent to a custom endpoint) + `SERVICES` booleans; `config.public` tRPC endpoint serves flags + the public Mapbox token only
- [x] `vitest.config.ts` test.env guard blanks every service var — dev-machine keys can never leak tests onto real networks
- [x] `.env.local.example` documents all 7 vars with the degradation story

### Z.AI (lights up 4 existing features, zero call-site changes)
- [x] `llm.ts` URL join handles version-pinned bases (`…/paas/v4`) alongside OpenAI-style hosts; `json_schema` → `json_object` shim (schema into system prompt + fence-strip) since GLM has no schema mode
- [x] Live-verified: advisor chat, search-intent parsing (`source: "llm"`), per-match narratives, contact drafts — all deterministic fallbacks intact
- [x] Default model `glm-4.5-flash` (Z.AI free tier — the account currently has no paid balance; error 1113 on paid models). `LLM_MODEL=glm-4.7`/`glm-5.1` after recharge

### Pinecone (semantic search / similar / advisor recall)
- [x] `server/vector/` (text composers · lazy-SDK client with 3.5s timeout + late-resolve cache warming · pure blend) — keyless deployments never even import the SDK
- [x] find.search blends semantic relevance (75/25) over a wider deterministic pool when the buyer typed free text → `semanticApplied`; NEW find.similar ("More like this" on vehicle detail, deterministic closeness fallback); advisor recalls top-2 curated advisories for the question itself
- [x] `pnpm sync:pinecone` created index `gogetter-vehicles` (aws/us-east-1, llama-text-embed-v2) and upserted 102 listings + 16 knowledge entries; live-verified ("college student hatchback" → curated value picks; "CVT worries" → Jatco entry first)

### Cloudinary (real CDN image delivery)
- [x] `pnpm sync:cloudinary` de-dupes by source URL (6 unique images for 102 listings), uploads once with hash public_ids, writes committed manifest `server/inventory/photos.cloudinary.json`
- [x] Runtime = pure URL builder (`server/images/cloudinary.ts`) swapping photo URLs to `f_auto,q_auto,w_1000` delivery at the provider chokepoint — zero client changes, verified 102/102 listings on the CDN + HTTP 200 delivery

### Mapbox (new /map screen + real geocoding)
- [x] NEW `/map` (lazy chunk — mapbox-gl never touches the main bundle): dark-v11, 102 gold price-pill pins (deterministic per-id jitter so same-ZIP pins never stack), themed popup report cards → /vehicle/:vin, price/body/risk filters, Geolocate + Navigation controls, branded keyless fallback; NavBar link added (and md-width nav padding tightened — caught by QA)
- [x] `server/geo/mapboxGeocode.ts` (Geocoding v6, recalls-pattern cache/timeout) wired into buyer-ZIP distance resolution — out-of-table ZIPs now get REAL distances (live-verified: 90210 → 34.069/-118.403; cross-country buyer correctly gets zero in-radius matches where the mock fallback would have returned cars)

### Brave Search (live market + web intel, metered-aware)
- [x] `server/websearch/` (6h success-only cache, ~1.1s throttle, 429 never cached, marketplace tagger); find.liveMarket + vehicle.webIntel + advisor "WEB FINDINGS" context block
- [x] Client: "Live market scan" panel on Find-My-Car (explicit opt-in click guards the metered API; Brave attribution) + "From the web" card on vehicle detail — live-verified with real Cars.com/TrueCar/CarGurus results for "used Mazda3 near Fairfax under $10,000"

### Verification
- [x] `pnpm check` clean · `pnpm test` **179 passing** (118 original untouched + 61 new) · `pnpm build` clean (MapExplorer isolated at ~502KB gz lazy; api/ functions bundle fine)
- [x] E2E smoke over the live dev server (real tRPC HTTP): 15/15 — all five services live, semantic ranking applied, Z.AI narratives, Cloudinary URLs, vector similar, mapListings 102, live geocode, liveMarket + webIntel, full advisor reply
- [x] `scripts/qa-browser.mjs` (now incl. /map): 11 routes × 4 breakpoints all-pass — zero console errors, zero overflow, 50 FPS landing sample; map page screenshots (desktop/popup/mobile) in qa-shots/
- [ ] Follow-up: Z.AI account has no paid balance — recharge + set `LLM_MODEL=glm-4.7` (or `glm-5.1`) for higher-quality advisor prose
- [ ] Follow-up: real listings feed (Marketcheck/Auto.dev) would flow real dealer photos through the same Cloudinary sync + Pinecone index unchanged
