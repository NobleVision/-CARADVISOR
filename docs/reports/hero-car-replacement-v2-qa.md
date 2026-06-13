# Hero Car Replacement V2 QA and Replacement Report

Updated: 2026-06-13T16:22:00Z

User approved live replacement for:

- runner-v2
- camry-v2
- cx5-v2

User did not approve live replacement for:

- accord-v2

## Result

The approved replacements were applied in new-key mode. This means the live rotation now points at the new v2 keys and new PNG files, while the original active PNG files remain on disk for rollback/review.

No cleanup/delete was performed.

## Current live rotation

- runner-v2
- camry-v2
- cx5-v2
- accord
- toyota-rav4-hybrid
- honda-cr-v-hybrid
- honda-civic
- subaru-forester
- tesla-model-y
- toyota-tacoma
- ford-f-150

## Applied replacements

| Replacement key | Replaced key | Live asset | Rollback backup | Status |
| --- | --- | --- | --- | --- |
| runner-v2 | runner | `client/public/hero/cars/runner-v2.png` | `client/public/hero/cars/backups/runner-2026-06-13T16-17-29-092Z.png` | Active |
| camry-v2 | camry | `client/public/hero/cars/camry-v2.png` | `client/public/hero/cars/backups/camry-2026-06-13T16-17-29-131Z.png` | Active |
| cx5-v2 | cx5 | `client/public/hero/cars/cx5-v2.png` | `client/public/hero/cars/backups/cx5-2026-06-13T16-17-29-167Z.png` | Active |

Original files are still retained as inactive/orphaned rollback/review assets:

- `client/public/hero/cars/toyota-4runner.png`
- `client/public/hero/cars/toyota-camry.png`
- `client/public/hero/cars/mazda-cx5.png`

## Accord status

`accord-v2` remains staged only:

- Source approval: true
- Visual approval: false
- Import/replacement approval: false
- Staged cutout: `client/public/hero/cars/staged/accord-v2/cutout.png`

Reason: the staged Accord replacement still has weaker edge/halo/shadow quality than the approved v2 replacements. Live rotation continues to use the current `accord` asset.

## Review files

- Full HTML preview: `docs/reports/hero-car-rotation-preview.html`
- Replacement contact sheet: `docs/reports/hero-car-replacement-v2-review.png`
- Browser QA report: `docs/reports/hero-car-visual-qa/report.md`
- Validation report: `docs/reports/hero-car-rotation-validation-report.md`

## Validation and QA

Commands run after replacement:

```bash
pnpm exec tsx scripts/hero-cars/render-preview-sheet.mts
pnpm exec tsx scripts/hero-cars/validate-rotation.mts --json --write-report
pnpm exec tsc --noEmit --pretty false
pnpm exec vitest run server/heroParticles.asset.test.ts
pnpm run hero:qa:visual -- --url http://localhost:3000/
pnpm exec tsx scripts/hero-cars/validate-rotation.mts --json --write-report
git diff --check
```

Results:

- Rotation validator: pass
- TypeScript: pass
- Focused Vitest: 12/12 pass
- Browser QA: pass
  - desktop: pass
  - mobile: pass
  - reduced motion: pass
  - stale localStorage index: pass
  - carousel exercised 11/11 active cars
- `git diff --check`: pass

## Notes

The validator reports inactive/orphaned PNGs because old assets are intentionally retained for rollback/review. It does not delete them.
