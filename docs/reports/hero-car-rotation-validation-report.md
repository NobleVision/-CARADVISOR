# Hero Car Rotation Validation Report

Generated: 2026-06-13T16:21:45.891Z

## Current active rotation

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

## Recommended new candidates

- toyota-rav4-hybrid
- honda-cr-v-hybrid
- honda-civic
- subaru-forester
- tesla-model-y
- toyota-tacoma
- ford-f-150

## Replacement candidates

- runner-v2
- camry-v2
- cx5-v2
- accord-v2

## Approved candidates

- toyota-rav4-hybrid
- honda-cr-v-hybrid
- honda-civic
- subaru-forester
- tesla-model-y
- toyota-tacoma
- ford-f-150
- runner-v2
- camry-v2
- cx5-v2

## Rejected candidates

None

## Source attribution

- toyota-rav4-hybrid: https://pressroom.toyota.com/wp-content/uploads/2025/05/2026-Toyota-RAV4-PHEV_GRSport_Studio_002.jpg, https://pressroom.toyota.com/
- honda-cr-v-hybrid: https://wieck-honda-production.s3.amazonaws.com/photos/ae0ac1ebe2692c5709a9e2da0a1709e5370b229c/preview-928x522.jpg, https://wieck-honda-production.s3.amazonaws.com/photos/3d9583b4a74260c7694440126be9bc00c127ce66/preview-928x522.jpg, https://hondanews.com/en-US/honda-automobiles/channels/cr-v
- honda-civic: https://wieck-honda-production.s3.amazonaws.com/photos/8167b82614b1d70815fbdd1456c228cdb91c03d0/preview-928x522.jpg, https://hondanews.com/en-US/honda-automobiles/channels/civic
- subaru-forester: https://s3.amazonaws.com/subarumedia.iconicweb.com/mediasite/teaserImages/TEASER2026_Subaru_Forester_Wilderness_Hybrid_01.jpg, https://s3.amazonaws.com/subarumedia.iconicweb.com/mediasite/teaserImages/TEASER2026-Subaru-Forester-Hybrid.jpg, https://media.subaru.com/
- tesla-model-y: https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Homepage-Model-Y-Desktop-US.png, https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Model-Y-Main-Hero-Desktop-Global.jpg, https://www.tesla.com/presskit
- toyota-tacoma: https://pressroom.toyota.com/wp-content/uploads/2025/11/2026_Toyota_Tacoma_Limited_012.jpg, https://pressroom.toyota.com/wp-content/uploads/2025/11/2026_Toyota_Tacoma_Limited_001.jpg, https://pressroom.toyota.com/
- ford-f-150: https://www.assets.ford.com/adobe/assets/urn:aaid:aem:ca9583b3-6c04-4511-baf9-59f75e87b3dc/as/2026_F-150_XLT_ChromePackage_ArgonBlue.webp?max-quality=75&crop-names=1_16x9&width=3840, https://www.assets.ford.com/adobe/assets/urn:aaid:aem:48f4c65c-706f-4966-b488-fdf51ff139fb/as/2026_F-150_Lariat_BlackAppearancePackage_IconicSilver.webp?max-quality=75&crop-names=1_16x9&width=3840, https://media.ford.com/
- runner-v2: https://toyota-cms-media.s3.amazonaws.com/wp-content/uploads/2025/10/2026_Toyota_4Runner_TRDSport_1.jpg, https://toyota-cms-media.s3.amazonaws.com/wp-content/uploads/2025/10/2026_Toyota_4Runner_TRDOffRoad_1-1.jpg, https://toyota-cms-media.s3.amazonaws.com/wp-content/uploads/2025/10/2026_Toyota_4Runner_TrailHunter_1-1.jpg, https://pressroom.toyota.com/vehicle/2026-toyota-4runner/
- camry-v2: https://toyota-cms-media.s3.amazonaws.com/wp-content/uploads/2025/04/2026_Toyota-Camry_001.jpg, https://toyota-cms-media.s3.amazonaws.com/wp-content/uploads/2025/04/2026_Camry_XSE_AWD_HeavyMetalBlackRoof_001.jpg, https://toyota-cms-media.s3.amazonaws.com/wp-content/uploads/2025/04/2026_Camry_SE_AWD_SupersonicRed_001.jpg, https://pressroom.toyota.com/vehicle/2026-toyota-camry/
- cx5-v2: https://mma.prnewswire.com/media/2860295/2026_CX_5_Navy_Blue_Mica_1.jpg?p=original, https://mma.prnewswire.com/media/2728441/Mazda_North_America_Operations_2026_All_New_CX_5.jpg?p=original, https://mma.prnewswire.com/media/2461978/Mazda_North_American_Operations_2025_CX_5.jpg?p=original, https://news.mazdausa.com/news-releases?keywords=CX-5
- accord-v2: https://wieck-honda-production.s3.amazonaws.com/photos/c230399c555d9a312d8d851917cfeb454b63ebb7/preview-928x522.jpg, https://wieck-honda-production.s3.amazonaws.com/photos/96711768a25abac8f6ef6333ff81d7c8dc83a32d/preview-928x522.jpg, https://wieck-honda-production.s3.amazonaws.com/photos/1ec2ad95e619266f4c9c2cb7b7759c963cc42b08/preview-928x522.jpg, https://hondanews.com/en-US/honda-automobiles/channels/accord

## Orphaned or inactive hero PNG assets

- cars/mazda-cx5.png
- cars/polestar5.png
- cars/toyota-4runner.png
- cars/toyota-camry.png

## QA results

- cliValidation: complete
- browserDesktop: pass — desktop hero rendered with no console/page errors or overflow
- browserMobile: pass — mobile hero rendered with no console/page errors or overflow
- reducedMotion: pass — reduced-motion fallback rendered
- staleLocalStorage: pass — stale carAdvisorHero.carIdx was clamped safely
- carouselAdvancesThroughApprovedList: pass — exercised 11/11 active cars

## Checks

| Status | Check | Message |
| --- | --- | --- |
| PASS | rotation-json | client/public/hero/cars/rotation.json parsed successfully. |
| PASS | meta-json | client/public/hero/cars/meta.json parsed successfully. |
| PASS | sources-json | client/public/hero/cars/sources.json parsed successfully. |
| PASS | non-empty-rotation | Active rotation has 11 cars. |
| PASS | meta-runner-v2 | runner-v2 has metadata. |
| PASS | asset-runner-v2 | cars/runner-v2.png exists. |
| PASS | poly-runner-v2 | runner-v2 has 9 polygon points. |
| PASS | headlight-runner-v2 | runner-v2 has a headlight point. |
| PASS | ground-runner-v2 | runner-v2 ground=0.9577. |
| PASS | dimensions-runner-v2 | runner-v2 dimensions match metadata (1000x544). |
| PASS | meta-camry-v2 | camry-v2 has metadata. |
| PASS | asset-camry-v2 | cars/camry-v2.png exists. |
| PASS | poly-camry-v2 | camry-v2 has 9 polygon points. |
| PASS | headlight-camry-v2 | camry-v2 has a headlight point. |
| PASS | ground-camry-v2 | camry-v2 ground=0.9501. |
| PASS | dimensions-camry-v2 | camry-v2 dimensions match metadata (1000x461). |
| PASS | meta-cx5-v2 | cx5-v2 has metadata. |
| PASS | asset-cx5-v2 | cars/cx5-v2.png exists. |
| PASS | poly-cx5-v2 | cx5-v2 has 9 polygon points. |
| PASS | headlight-cx5-v2 | cx5-v2 has a headlight point. |
| PASS | ground-cx5-v2 | cx5-v2 ground=0.9356. |
| PASS | dimensions-cx5-v2 | cx5-v2 dimensions match metadata (1000x435). |
| PASS | meta-accord | accord has metadata. |
| PASS | asset-accord | cars/honda-accord.png exists. |
| PASS | poly-accord | accord has 168 polygon points. |
| PASS | headlight-accord | accord has a headlight point. |
| PASS | ground-accord | accord ground=0.97. |
| PASS | dimensions-accord | accord dimensions match metadata (867x348). |
| PASS | meta-toyota-rav4-hybrid | toyota-rav4-hybrid has metadata. |
| PASS | asset-toyota-rav4-hybrid | cars/toyota-rav4-hybrid.png exists. |
| PASS | poly-toyota-rav4-hybrid | toyota-rav4-hybrid has 9 polygon points. |
| PASS | headlight-toyota-rav4-hybrid | toyota-rav4-hybrid has a headlight point. |
| PASS | ground-toyota-rav4-hybrid | toyota-rav4-hybrid ground=0.9673. |
| PASS | dimensions-toyota-rav4-hybrid | toyota-rav4-hybrid dimensions match metadata (1000x489). |
| PASS | meta-honda-cr-v-hybrid | honda-cr-v-hybrid has metadata. |
| PASS | asset-honda-cr-v-hybrid | cars/honda-cr-v-hybrid.png exists. |
| PASS | poly-honda-cr-v-hybrid | honda-cr-v-hybrid has 9 polygon points. |
| PASS | headlight-honda-cr-v-hybrid | honda-cr-v-hybrid has a headlight point. |
| PASS | ground-honda-cr-v-hybrid | honda-cr-v-hybrid ground=0.9673. |
| PASS | dimensions-honda-cr-v-hybrid | honda-cr-v-hybrid dimensions match metadata (1000x489). |
| PASS | meta-honda-civic | honda-civic has metadata. |
| PASS | asset-honda-civic | cars/honda-civic.png exists. |
| PASS | poly-honda-civic | honda-civic has 9 polygon points. |
| PASS | headlight-honda-civic | honda-civic has a headlight point. |
| PASS | ground-honda-civic | honda-civic ground=0.964. |
| PASS | dimensions-honda-civic | honda-civic dimensions match metadata (1000x445). |
| PASS | meta-subaru-forester | subaru-forester has metadata. |
| PASS | asset-subaru-forester | cars/subaru-forester.png exists. |
| PASS | poly-subaru-forester | subaru-forester has 9 polygon points. |
| PASS | headlight-subaru-forester | subaru-forester has a headlight point. |
| PASS | ground-subaru-forester | subaru-forester ground=0.9656. |
| PASS | dimensions-subaru-forester | subaru-forester dimensions match metadata (1000x465). |
| PASS | meta-tesla-model-y | tesla-model-y has metadata. |
| PASS | asset-tesla-model-y | cars/tesla-model-y.png exists. |
| PASS | poly-tesla-model-y | tesla-model-y has 9 polygon points. |
| PASS | headlight-tesla-model-y | tesla-model-y has a headlight point. |
| PASS | ground-tesla-model-y | tesla-model-y ground=0.9654. |
| PASS | dimensions-tesla-model-y | tesla-model-y dimensions match metadata (1000x463). |
| PASS | meta-toyota-tacoma | toyota-tacoma has metadata. |
| PASS | asset-toyota-tacoma | cars/toyota-tacoma.png exists. |
| PASS | poly-toyota-tacoma | toyota-tacoma has 9 polygon points. |
| PASS | headlight-toyota-tacoma | toyota-tacoma has a headlight point. |
| PASS | ground-toyota-tacoma | toyota-tacoma ground=0.9673. |
| PASS | dimensions-toyota-tacoma | toyota-tacoma dimensions match metadata (1000x489). |
| PASS | meta-ford-f-150 | ford-f-150 has metadata. |
| PASS | asset-ford-f-150 | cars/ford-f-150.png exists. |
| PASS | poly-ford-f-150 | ford-f-150 has 9 polygon points. |
| PASS | headlight-ford-f-150 | ford-f-150 has a headlight point. |
| PASS | ground-ford-f-150 | ford-f-150 ground=0.9652. |
| PASS | dimensions-ford-f-150 | ford-f-150 dimensions match metadata (1000x460). |
| PASS | localstorage-index-safety | Runtime normalizes carAdvisorHero.carIdx against the active rotation length. |
| WARN | orphaned-assets | Inactive/unreferenced PNG assets retained for rollback/review: cars/mazda-cx5.png, cars/polestar5.png, cars/toyota-4runner.png, cars/toyota-camry.png. |
| PASS | replacement-active-runner-v2 | runner-v2 is active as the approved replacement for runner. |
| PASS | replacement-recoverable-runner-v2 | cars/toyota-4runner.png remains recoverable for runner. |
| PASS | replacement-active-camry-v2 | camry-v2 is active as the approved replacement for camry. |
| PASS | replacement-recoverable-camry-v2 | cars/toyota-camry.png remains recoverable for camry. |
| PASS | replacement-active-cx5-v2 | cx5-v2 is active as the approved replacement for cx5. |
| PASS | replacement-recoverable-cx5-v2 | cars/mazda-cx5.png remains recoverable for cx5. |
| PASS | replacement-recoverable-accord-v2 | cars/honda-accord.png remains recoverable for accord. |
