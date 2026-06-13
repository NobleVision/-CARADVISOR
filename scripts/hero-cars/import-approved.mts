import path from "node:path";
import {
  CARS_ROOT,
  type MetaEntry,
  STAGED_ROOT,
  activeRotation,
  assertSafeKey,
  candidateCutoutPath,
  candidateMetaPath,
  copyFileEnsured,
  exitWithError,
  findCandidate,
  getFlag,
  hasFlag,
  loadMeta,
  loadRotation,
  loadSources,
  parseArgs,
  readJson,
  requireApprovedKeys,
  saveMeta,
  saveRotation,
  saveSources,
  toRepoRelative,
} from "./lib.mts";

const APPROVAL_ERROR = "No approved candidate keys supplied";

async function main(): Promise<void> {
  const args = parseArgs();
  const approvedKeys = requireApprovedKeys(args);
  const dryRun = hasFlag(args, "dry-run");
  const rotation = await loadRotation();
  const meta = await loadMeta();
  const sources = await loadSources();
  const activeKeys = new Set(activeRotation(rotation).map((car) => car.key));

  for (const rawKey of approvedKeys) {
    const key = assertSafeKey(rawKey);
    const candidate = findCandidate(sources, key);
    if (candidate.action !== "add") throw new Error(`${key} is not an add candidate. Use replace-approved.mts for replacements.`);
    if (activeKeys.has(key)) throw new Error(`${key} is already active in rotation.json.`);

    const cutout = await candidateCutoutPath(key);
    const stagedMeta = await candidateMetaPath(key);
    if (!cutout || !stagedMeta) throw new Error(`${key} needs staged cutout.png and meta.json before import.`);
    const newMeta = await readJson<MetaEntry>(stagedMeta);
    const destination = path.join(CARS_ROOT, `${key}.png`);

    console.log(`${dryRun ? "Would import" : "Importing"} ${key}: ${toRepoRelative(cutout)} -> ${toRepoRelative(destination)}`);
    if (!dryRun) {
      await copyFileEnsured(cutout, destination);
      meta[key] = {
        src: `cars/${key}.png`,
        w: newMeta.w,
        h: newMeta.h,
        poly: newMeta.poly,
        headlights: newMeta.headlights,
        ground: newMeta.ground,
      };
      rotation.push({ key, name: candidate.vehicleName, tag: candidate.tag, destW: candidate.destW, status: "active" });
      if (!sources.approvedCandidates?.includes(key)) (sources.approvedCandidates ??= []).push(key);
      const sourceCandidate = sources.candidates.find((entry) => entry.key === key);
      if (sourceCandidate) {
        sourceCandidate.status = "imported-active";
        sourceCandidate.approval = { ...(sourceCandidate.approval ?? {}), import: true, visual: true };
      }
    }
  }

  if (!dryRun) {
    await saveMeta(meta);
    await saveRotation(rotation);
    await saveSources(sources);
  }

  console.log(dryRun ? "Dry run complete; rotation unchanged." : "Approved additions imported. Run validate-rotation.mts next.");
}

main().catch((error) => {
  if (error instanceof Error && error.message.includes(APPROVAL_ERROR)) {
    console.error(`${APPROVAL_ERROR}. Re-run with --approved <key>[,<key>] after visual approval.`);
    process.exit(1);
  }
  exitWithError(error);
});
