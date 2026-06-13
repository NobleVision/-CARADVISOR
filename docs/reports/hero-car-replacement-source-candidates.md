# Hero Car Replacement Source Candidates

Updated: 2026-06-13T16:22:00Z

Scope: source research, source-approved staging, and approved live replacement tracking for the original active replacement keys `runner-v2`, `camry-v2`, `cx5-v2`, and `accord-v2`. The user approved live replacement for `runner-v2`, `camry-v2`, and `cx5-v2`; those three are active in `rotation.json`. `accord-v2` remains staged only and was not imported.

Current selected sources are: `runner-v2` Toyota 4Runner TRD Sport, `camry-v2` 2026 Camry exterior hero, `cx5-v2` 2025 CX-5 pricing fallback after two 2026 CX-5 options were held during visual QA, and staged-only `accord-v2` 2026 Accord SE after the Sport-L source showed lower-edge cleanup concerns.

## `runner-v2` — Toyota 4Runner (replaces `runner`)

Current asset retained: `cars/toyota-4runner.png`

| Option | Source page | Direct URL | Verification | Notes |
| --- | --- | --- | --- | --- |
| 1. Toyota Pressroom direct image — 2026 Toyota 4Runner TRD Sport exterior | https://pressroom.toyota.com/vehicle/2026-toyota-4runner/ | https://toyota-cms-media.s3.amazonaws.com/wp-content/uploads/2025/10/2026_Toyota_4Runner_TRDSport_1.jpg | HEAD 200 image/jpeg (1026017 bytes) | HEAD verified 200 image/jpeg, content-length 1,026,017 bytes. Cleaner mainstream 4Runner trim candidate; likely the best first replacement source if visual consistency beats rugged accessory detail. |
| 2. Toyota Pressroom direct image — 2026 Toyota 4Runner TRD Off-Road exterior | https://pressroom.toyota.com/vehicle/2026-toyota-4runner/ | https://toyota-cms-media.s3.amazonaws.com/wp-content/uploads/2025/10/2026_Toyota_4Runner_TRDOffRoad_1-1.jpg | HEAD 200 image/jpeg (1584454 bytes) | HEAD verified 200 image/jpeg, content-length 1,584,454 bytes. Strong trail-SUV replacement candidate that matches the current runner slot/tag. |
| 3. Toyota Pressroom direct image — 2026 Toyota 4Runner Trailhunter exterior | https://pressroom.toyota.com/vehicle/2026-toyota-4runner/ | https://toyota-cms-media.s3.amazonaws.com/wp-content/uploads/2025/10/2026_Toyota_4Runner_TrailHunter_1-1.jpg | HEAD 200 image/jpeg (1739952 bytes) | HEAD verified 200 image/jpeg, content-length 1,739,952 bytes. More rugged/overlanding variant; visually useful backup but roof/accessory detail may be harder to normalize into a clean studio-like family. |

## `camry-v2` — Toyota Camry (replaces `camry`)

Current asset retained: `cars/toyota-camry.png`

| Option | Source page | Direct URL | Verification | Notes |
| --- | --- | --- | --- | --- |
| 1. Toyota Pressroom direct image — 2026 Toyota Camry exterior hero | https://pressroom.toyota.com/vehicle/2026-toyota-camry/ | https://toyota-cms-media.s3.amazonaws.com/wp-content/uploads/2025/04/2026_Toyota-Camry_001.jpg | HEAD 200 image/jpeg (3517308 bytes) | HEAD verified 200 image/jpeg, content-length 3,517,308 bytes. Best first-pass Camry replacement candidate because it is a high-resolution official 2026 Camry exterior from the vehicle media page. |
| 2. Toyota Pressroom direct image — 2026 Toyota Camry XSE AWD Heavy Metal / Black Roof | https://pressroom.toyota.com/vehicle/2026-toyota-camry/ | https://toyota-cms-media.s3.amazonaws.com/wp-content/uploads/2025/04/2026_Camry_XSE_AWD_HeavyMetalBlackRoof_001.jpg | HEAD 200 image/jpeg (1092743 bytes) | HEAD verified 200 image/jpeg, content-length 1,092,743 bytes. Sportier trim/color option; good alternate if the primary angle/background does not cut out cleanly. |
| 3. Toyota Pressroom direct image — 2026 Toyota Camry SE AWD Supersonic Red | https://pressroom.toyota.com/vehicle/2026-toyota-camry/ | https://toyota-cms-media.s3.amazonaws.com/wp-content/uploads/2025/04/2026_Camry_SE_AWD_SupersonicRed_001.jpg | HEAD 200 image/jpeg (1090227 bytes) | HEAD verified 200 image/jpeg, content-length 1,090,227 bytes. Higher-saturation alternate that may read well on the dark/gold hero background if cutout edges are clean. |

## `cx5-v2` — Mazda CX-5 (replaces `cx5`)

Current asset retained: `cars/mazda-cx5.png`

| Option | Source page | Direct URL | Verification | Notes |
| --- | --- | --- | --- | --- |
| 1. Mazda USA Newsroom direct image — 2026 Mazda CX-5 Navy Blue Mica | https://news.mazdausa.com/2026-01-13-Mazda-Announces-Pricing-and-Packaging-for-All-New-2026-Mazda-CX-5 | https://mma.prnewswire.com/media/2860295/2026_CX_5_Navy_Blue_Mica_1.jpg?p=original | HEAD 200 image/jpeg (110026 bytes) | HEAD verified 200 image/jpeg, content-length 110,026 bytes. Official Mazda newsroom/PRNewswire-hosted 2026 CX-5 pricing image; likely smaller than Toyota sources but may be clean enough for an 800px hero cutout. |
| 2. Mazda USA Newsroom direct image — all-new 2026 Mazda CX-5 reveal | https://news.mazdausa.com/2025-07-10-Mazda-Reveals-All-New-2026-CX-5 | https://mma.prnewswire.com/media/2728441/Mazda_North_America_Operations_2026_All_New_CX_5.jpg?p=original | HEAD 200 image/jpeg (2672866 bytes) | HEAD verified 200 image/jpeg, content-length 2,672,866 bytes. Strong high-resolution 2026 CX-5 source; recommended as the first fallback or primary if the Navy Blue image is too small for clean processing. |
| 3. Mazda USA Newsroom direct image — 2025 Mazda CX-5 pricing fallback | https://news.mazdausa.com/2024-07-16-2025-Mazda-CX-5-Pricing-and-Packaging | https://mma.prnewswire.com/media/2461978/Mazda_North_American_Operations_2025_CX_5.jpg?p=original | HEAD 200 image/jpeg (447141 bytes) | HEAD verified 200 image/jpeg, content-length 447,141 bytes. Official 2025 fallback if 2026 all-new shots do not match the desired hero angle/crop. |

## `accord-v2` — Honda Accord (replaces `accord`)

Current asset retained: `cars/honda-accord.png`

| Option | Source page | Direct URL | Verification | Notes |
| --- | --- | --- | --- | --- |
| 1. Honda News direct image — 2026 Honda Accord Sport-L Hybrid exterior | https://hondanews.com/en-US/honda-automobiles/releases/release-c26685400737027f7d053958c30909ed-2026-honda-accord-adds-more-standard-tech-and-sportier-styling-now-arriving-at-dealers | https://wieck-honda-production.s3.amazonaws.com/photos/c230399c555d9a312d8d851917cfeb454b63ebb7/preview-928x522.jpg | HEAD 200 image/jpeg (74090 bytes) | HEAD verified 200 image/jpeg, content-length 74,090 bytes. Official Honda News/Wieck 2026 Accord Sport-L Hybrid preview; good first-pass Accord replacement source if preview resolution is sufficient. |
| 2. Honda News direct image — 2026 Honda Accord SE exterior | https://hondanews.com/en-US/honda-automobiles/releases/release-c26685400737027f7d053958c30909ed-2026-honda-accord-adds-more-standard-tech-and-sportier-styling-now-arriving-at-dealers | https://wieck-honda-production.s3.amazonaws.com/photos/96711768a25abac8f6ef6333ff81d7c8dc83a32d/preview-928x522.jpg | HEAD 200 image/jpeg (86784 bytes) | HEAD verified 200 image/jpeg, content-length 86,784 bytes. Official Honda News/Wieck 2026 Accord SE preview; useful alternate if it has cleaner silhouette/edge separation. |
| 3. Honda News direct image — 2026 Honda Accord SE wheel/exterior detail fallback | https://hondanews.com/en-US/honda-automobiles/releases/release-c26685400737027f7d053958c30909ed-2026-honda-accord-adds-more-standard-tech-and-sportier-styling-now-arriving-at-dealers | https://wieck-honda-production.s3.amazonaws.com/photos/1ec2ad95e619266f4c9c2cb7b7759c963cc42b08/preview-928x522.jpg | HEAD 200 image/jpeg (46470 bytes) | HEAD verified 200 image/jpeg, content-length 46,470 bytes. Official Honda News/Wieck fallback; likely less ideal for full-vehicle hero use if it is primarily a wheel/detail angle. |

## Current replacement state

Applied live replacements:

- `runner-v2` replaces `runner` and is active in `rotation.json`.
- `camry-v2` replaces `camry` and is active in `rotation.json`.
- `cx5-v2` replaces `cx5` and is active in `rotation.json`.

Staged only:

- `accord-v2` remains staged and unapproved for live replacement.

Review/report artifacts:

- Full HTML preview: `docs/reports/hero-car-rotation-preview.html`
- Replacement contact sheet: `docs/reports/hero-car-replacement-v2-review.png`
- Replacement QA/replacement report: `docs/reports/hero-car-replacement-v2-qa.md`
- Validation report: `docs/reports/hero-car-rotation-validation-report.md`

Original active PNG files remain retained for rollback/review; no cleanup/delete was performed.
