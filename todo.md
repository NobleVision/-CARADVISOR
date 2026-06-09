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
- [ ] Export full codebase to local @CARADVISOR directory with run instructions
