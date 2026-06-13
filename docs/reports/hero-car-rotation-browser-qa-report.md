# Hero Car Rotation Browser QA Report

Generated: 2026-06-13
Updated: 2026-06-13 after approved seven-car import and full 11-car carousel QA

## Environment

The WSL browser automation path uses Playwright-managed Linux Chromium instead of Windows Chrome.

Key setup:

- Dev dependency: `playwright`
- Reusable visual QA script: `scripts/hero-cars/visual-qa.mts`
- npm/pnpm script: `hero:qa:visual`
- Platform override: `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64`

Run command:

```bash
pnpm dev
pnpm hero:qa:visual -- --url http://127.0.0.1:3000/ --out docs/reports/hero-car-visual-qa
```

## Dev server

- URL tested: `http://127.0.0.1:3000/`
- Requirement: run `pnpm dev` before visual QA if the dev server is not already running.

## Full automated visual QA completed

Output directory:

`docs/reports/hero-car-visual-qa/`

Generated files:

- `docs/reports/hero-car-visual-qa/report.md`
- `docs/reports/hero-car-visual-qa/report.json`
- `docs/reports/hero-car-visual-qa/desktop.png`
- `docs/reports/hero-car-visual-qa/mobile.png`
- `docs/reports/hero-car-visual-qa/reduced-motion.png`
- `docs/reports/hero-car-visual-qa/stale-local-storage.png`

## Results

| Check | Result |
| --- | --- |
| Desktop landing renders hero canvas | PASS |
| Mobile landing renders hero canvas | PASS |
| Reduced-motion fallback renders | PASS |
| Stale `carAdvisorHero.carIdx=999` does not crash | PASS |
| Carousel labels cover active list | PASS, 11/11 active cars |
| No blank canvas | PASS |
| No horizontal overflow | PASS |
| No console errors | PASS |
| No page errors | PASS |

## Active carousel labels verified

- `01 — Toyota 4Runner`
- `02 — Toyota Camry`
- `03 — Mazda CX-5`
- `04 — Honda Accord`
- `05 — Toyota RAV4 Hybrid`
- `06 — Honda CR-V Hybrid`
- `07 — Honda Civic`
- `08 — Subaru Forester`
- `09 — Tesla Model Y`
- `10 — Toyota Tacoma`
- `11 — Ford F-150`

## Notes

The seven visually approved candidates have been imported into the live hero rotation. The active rotation now contains 11 cars. `polestar5` remains retained as an inactive/orphaned rollback/review asset.
