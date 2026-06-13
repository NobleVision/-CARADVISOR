import path from "node:path";
import {
  HERO_ROOT,
  REPORTS_ROOT,
  STAGED_ROOT,
  activeRotation,
  candidateCutoutPath,
  candidateMetaPath,
  ensureDir,
  exitWithError,
  fileExists,
  getFlag,
  htmlEscape,
  loadMeta,
  loadRotation,
  loadSources,
  parseArgs,
  readJson,
  toRepoRelative,
  writeText,
} from "./lib.mts";

function relForHtml(fromFile: string, targetFile: string): string {
  return path.relative(path.dirname(fromFile), targetFile).split(path.sep).join("/");
}

function imageTag(outFile: string, imagePath: string | null, alt: string): string {
  if (!imagePath) return `<div class="placeholder">No staged cutout yet</div>`;
  return `<img src="${htmlEscape(relForHtml(outFile, imagePath))}" alt="${htmlEscape(alt)}" />`;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const outFile = path.resolve(getFlag(args, "out") ?? path.join(REPORTS_ROOT, "hero-car-rotation-preview.html"));
  const [rotation, meta, sources] = await Promise.all([loadRotation(), loadMeta(), loadSources()]);
  const active = activeRotation(rotation);

  const cards: string[] = [];
  for (const candidate of [...sources.candidates].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))) {
    const stagedCutout = await candidateCutoutPath(candidate.key);
    const stagedMetaPath = await candidateMetaPath(candidate.key);
    const stagedMeta = stagedMetaPath && (await fileExists(stagedMetaPath)) ? await readJson<Record<string, unknown>>(stagedMetaPath) : null;
    const currentMeta = candidate.replacesKey ? meta[candidate.replacesKey] : null;
    const currentAsset = currentMeta ? path.join(HERO_ROOT, currentMeta.src) : null;
    const source = candidate.sourceCandidates?.[0];
    const notes = [
      candidate.approval?.source ? "source approved" : "source approval pending",
      candidate.approval?.visual ? "visual approved" : "visual approval pending",
      stagedCutout ? "processed cutout staged" : "processed cutout missing",
      stagedMeta ? "staged metadata present" : "staged metadata missing",
    ];

    cards.push(`
      <article class="card ${candidate.action}">
        <header>
          <div>
            <p class="eyebrow">${htmlEscape(candidate.action)}${candidate.replacesKey ? ` for ${htmlEscape(candidate.replacesKey)}` : ""}</p>
            <h2>${htmlEscape(candidate.key)}</h2>
            <p>${htmlEscape(candidate.vehicleName)} · ${htmlEscape(candidate.tag)}</p>
          </div>
          <span class="status">${htmlEscape(candidate.status ?? "pending")}</span>
        </header>
        <div class="grid">
          <section>
            <h3>Current cutout</h3>
            ${imageTag(outFile, currentAsset, `${candidate.vehicleName} current cutout`)}
          </section>
          <section>
            <h3>Processed replacement/addition</h3>
            ${imageTag(outFile, stagedCutout, `${candidate.vehicleName} staged cutout`)}
          </section>
        </div>
        <dl>
          <div><dt>Source</dt><dd>${source ? `<a href="${htmlEscape(source.url)}">${htmlEscape(source.domain ?? source.url)}</a>` : "No source recorded"}</dd></div>
          <div><dt>Ground line</dt><dd>${htmlEscape((stagedMeta?.ground ?? currentMeta?.ground ?? "pending") as string)}</dd></div>
          <div><dt>Headlight point</dt><dd>${htmlEscape(JSON.stringify(stagedMeta?.headlights ?? currentMeta?.headlights ?? "pending"))}</dd></div>
          <div><dt>Validation notes</dt><dd>${notes.map((note) => `<span>${htmlEscape(note)}</span>`).join(" ")}</dd></div>
        </dl>
      </article>`);
  }

  const activeImgs = active
    .map((car) => {
      const m = meta[car.key];
      return `<figure>${m ? imageTag(outFile, path.join(HERO_ROOT, m.src), car.name) : ""}<figcaption>${htmlEscape(car.name)}</figcaption></figure>`;
    })
    .join("\n");

  const proposed = sources.candidates
    .filter((candidate) => candidate.action === "add" && candidate.status !== "alternate")
    .map((candidate) => `<li>${htmlEscape(candidate.vehicleName)} <code>${htmlEscape(candidate.key)}</code></li>`)
    .join("\n");

  const replacements = sources.candidates
    .filter((candidate) => candidate.action === "replacement")
    .map(
      (candidate) =>
        `<li>${htmlEscape(candidate.vehicleName)} <code>${htmlEscape(candidate.key)}</code>${candidate.replacesKey ? ` replaces <code>${htmlEscape(candidate.replacesKey)}</code>` : ""}</li>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>CarAdvisor Hero Car Rotation Preview</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #0b0b0d; color: #f2ede3; }
    body { margin: 0; padding: 32px; }
    a { color: #e0bd7c; }
    code { color: #e0bd7c; }
    .hero { max-width: 1180px; margin: 0 auto 28px; }
    .summary, .card { border: 1px solid rgba(224,189,124,.22); background: rgba(255,255,255,.035); border-radius: 22px; padding: 22px; box-shadow: 0 18px 70px rgba(0,0,0,.28); }
    .summary { margin-bottom: 22px; }
    .strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; }
    figure { margin: 0; min-height: 130px; display: grid; align-content: center; gap: 8px; }
    figcaption, .eyebrow, dt { color: rgba(242,237,227,.55); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
    img { max-width: 100%; max-height: 190px; object-fit: contain; filter: drop-shadow(0 18px 28px rgba(0,0,0,.45)); }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(430px, 1fr)); gap: 18px; }
    .card header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
    .card h2 { margin: 2px 0; font-size: 23px; }
    .status { border: 1px solid rgba(224,189,124,.3); border-radius: 999px; padding: 7px 10px; color: #e0bd7c; font-size: 12px; white-space: nowrap; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0; }
    section { border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 14px; min-height: 210px; }
    section h3 { margin: 0 0 10px; font-size: 13px; color: rgba(242,237,227,.72); }
    .placeholder { min-height: 150px; display: grid; place-items: center; border: 1px dashed rgba(224,189,124,.35); border-radius: 14px; color: rgba(242,237,227,.45); text-align: center; padding: 12px; }
    dl { display: grid; gap: 9px; }
    dl div { display: grid; grid-template-columns: 115px 1fr; gap: 12px; }
    dd { margin: 0; color: rgba(242,237,227,.74); }
    dd span { display: inline-block; border-radius: 999px; background: rgba(224,189,124,.09); padding: 4px 8px; margin: 0 5px 5px 0; }
  </style>
</head>
<body>
  <main class="hero">
    <h1>CarAdvisor Hero Car Rotation Preview</h1>
    <p>This is a review sheet only. No candidate is imported into <code>rotation.json</code> until exact keys are approved and the approval-gated import/replace scripts are run.</p>
    <section class="summary">
      <h2>Old/current active rotation</h2>
      <div class="strip">${activeImgs}</div>
      <h2>Proposed additions for visual review</h2>
      <ul>${proposed}</ul>
      <h2>Proposed replacements for visual review</h2>
      <ul>${replacements}</ul>
    </section>
    <section class="cards">${cards.join("\n")}</section>
  </main>
</body>
</html>`;

  await ensureDir(path.dirname(outFile));
  await writeText(outFile, html);
  console.log(`Wrote ${toRepoRelative(outFile)}`);
}

main().catch(exitWithError);
