# Hero car rotation workflow

The landing hero is now data-driven:

- Active public rotation: `client/public/hero/cars/rotation.json`
- Asset metadata library: `client/public/hero/cars/meta.json`
- Source/research library: `client/public/hero/cars/sources.json`
- Runtime renderer: `client/public/hero/hero-particles.js`
- Automation scripts: `scripts/hero-cars/*.mts`

The approval gate is intentional: staged candidates are never added to the live rotation unless an exact candidate key is approved and passed to the import or replacement script with `--approved`.

## Current active rotation

1. `runner` — Toyota 4Runner
2. `camry` — Toyota Camry
3. `cx5` — Mazda CX-5
4. `accord` — Honda Accord
5. `toyota-rav4-hybrid` — Toyota RAV4 Hybrid
6. `honda-cr-v-hybrid` — Honda CR-V Hybrid
7. `honda-civic` — Honda Civic
8. `subaru-forester` — Subaru Forester
9. `tesla-model-y` — Tesla Model Y
10. `toyota-tacoma` — Toyota Tacoma
11. `ford-f-150` — Ford F-150

`polestar5` remains in `meta.json` and on disk as an inactive/orphaned asset for rollback/review, but it is not in `rotation.json`.

## Research candidates

List recorded demand/source candidates:

```bash
pnpm exec tsx scripts/hero-cars/research-candidates.mts
```

Add a manual research record without approving it:

```bash
pnpm exec tsx scripts/hero-cars/research-candidates.mts \
  --add-key toyota-rav4-hybrid \
  --name "Toyota RAV4 Hybrid" \
  --tag "2026 · compact hybrid SUV" \
  --url "https://pressroom.toyota.com/..." \
  --source-type official-oem-media-page
```

Rules:

- Prefer OEM newsroom/media assets or clearly licensed sources.
- Avoid dealer, marketplace, watermarked, scraped, or unclear-rights photos.
- Keep source attribution in `sources.json`.
- Do not download a source until licensing/terms are explicitly approved.

## Download and stage a candidate source

After source approval only:

```bash
pnpm exec tsx scripts/hero-cars/download-source.mts \
  --key toyota-rav4-hybrid \
  --url "https://approved.example/source.png" \
  --approved-source
```

This writes under `client/public/hero/cars/staged/<key>/` and records a manifest. It does not touch `rotation.json`.

## Process a cutout

If the source is already a reviewed transparent PNG:

```bash
pnpm exec tsx scripts/hero-cars/process-cutout.mts --key toyota-rav4-hybrid
```

If background removal/cleanup was done manually or with a specialist tool, stage the reviewed transparent PNG:

```bash
pnpm exec tsx scripts/hero-cars/process-cutout.mts \
  --key toyota-rav4-hybrid \
  --manual-cutout /absolute/path/to/transparent-cutout.png
```

The script deliberately stages `cutout.png`; it does not import it.

## Generate staged metadata

```bash
pnpm exec tsx scripts/hero-cars/generate-meta.mts \
  --key toyota-rav4-hybrid \
  --ground 0.97 \
  --headlight 0.35,0.46
```

Generated metadata is a starting point for preview/review. Refine polygon, ground, and headlight values before approving visual import.

## Render the visual review sheet

```bash
pnpm exec tsx scripts/hero-cars/render-preview-sheet.mts
```

Default output:

`docs/reports/hero-car-rotation-preview.html`

The sheet shows candidate key, vehicle name, tagline, source URL/domain, add vs replacement status, current cutout for replacements, staged cutout if present, ground line, headlight point, and pass/fail notes.

## Import approved new candidates

Only after exact visual approval by key:

```bash
pnpm exec tsx scripts/hero-cars/import-approved.mts \
  --approved toyota-rav4-hybrid
```

Dry run:

```bash
pnpm exec tsx scripts/hero-cars/import-approved.mts \
  --approved toyota-rav4-hybrid \
  --dry-run
```

The import script refuses to run without `--approved` and requires a staged `cutout.png` plus staged `meta.json`.

After the June 2026 visual approval, the first approved import batch was:

```bash
pnpm exec tsx scripts/hero-cars/import-approved.mts \
  --approved toyota-rav4-hybrid,honda-cr-v-hybrid,honda-civic,subaru-forester,tesla-model-y,toyota-tacoma,ford-f-150
```

The imported files are now active in `rotation.json` and remain traceable to staged review artifacts under `client/public/hero/cars/staged/<key>/`.

## Replace approved existing assets

Default replacement keeps the old file recoverable and adds a new key/file:

```bash
pnpm exec tsx scripts/hero-cars/replace-approved.mts \
  --approved runner-v2
```

To promote into the existing key, backing up the old PNG first:

```bash
pnpm exec tsx scripts/hero-cars/replace-approved.mts \
  --approved runner-v2 \
  --promote-existing-key
```

The replacement script refuses to run without `--approved`, verifies the current asset still exists, writes a backup under `client/public/hero/cars/backups/`, and then updates rotation/meta only for approved keys.

## Remove or deactivate a car

Deactivate without deleting images/metadata:

```bash
pnpm exec tsx scripts/hero-cars/remove-car.mts --key accord
```

Delete only the rotation entry, still preserving image files and metadata:

```bash
pnpm exec tsx scripts/hero-cars/remove-car.mts --key accord --delete-entry
```

The script refuses to save if the active rotation would become empty. Runtime index normalization protects stale `localStorage.carAdvisorHero.carIdx` values when rotation length changes.

## Validate

```bash
pnpm exec tsx scripts/hero-cars/validate-rotation.mts
pnpm exec tsx scripts/hero-cars/validate-rotation.mts --json
pnpm exec tsx scripts/hero-cars/validate-rotation.mts --report docs/reports/hero-car-rotation-validation-report.md
```

Validation checks:

- Every active rotation key exists in `meta.json`.
- Every active `src` exists on disk.
- Polygon data is non-empty.
- PNG dimensions match metadata.
- Ground line is sane.
- LocalStorage index safety is covered by runtime normalization.
- Inactive/orphaned PNG assets are reported without deletion.
- Replacement candidates keep the current asset recoverable.

## Browser QA checklist

After implementation or after any approved import/replacement, run the dev server and visual QA script:

```bash
pnpm dev
pnpm hero:qa:visual -- --url http://127.0.0.1:3000/ --out docs/reports/hero-car-visual-qa
```

The visual QA script verifies:

- Landing desktop renders a car and particles with no blank canvas.
- Landing mobile renders without horizontal overflow.
- Reduced-motion mode renders the static fallback.
- Reload with stale `localStorage.setItem("carAdvisorHero.carIdx", "999")` does not crash.
- Carousel advances through the approved active list.
- Proposed/replaced cutouts share comparable scale, contrast, crop, and ground alignment.
- Console has no errors.

The June 2026 approved import batch has been imported and validated. The live rotation currently has 11 active cars; staged review artifacts remain available for audit/rollback under `client/public/hero/cars/staged/`.
