import path from "node:path";
import {
  CARS_ROOT,
  type MetaEntry,
  assertSafeKey,
  candidateCutoutPath,
  candidateMetaPath,
  copyFileEnsured,
  ensureDir,
  exitWithError,
  fileExists,
  findCandidate,
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
  const promoteExistingKey = hasFlag(args, "promote-existing-key");
  const rotation = await loadRotation();
  const meta = await loadMeta();
  const sources = await loadSources();

  for (const rawKey of approvedKeys) {
    const key = assertSafeKey(rawKey);
    const candidate = findCandidate(sources, key);
    if (candidate.action !== "replacement" || !candidate.replacesKey) {
      throw new Error(`${key} is not a replacement candidate.`);
    }

    const targetIndex = rotation.findIndex((car) => car.key === candidate.replacesKey && car.status !== "inactive");
    if (targetIndex < 0) throw new Error(`${key} replacement target ${candidate.replacesKey} is not active in rotation.json.`);

    const oldMeta = meta[candidate.replacesKey];
    if (!oldMeta) throw new Error(`${candidate.replacesKey} is missing metadata; cannot prove rollback path.`);
    const oldAssetPath = path.join(CARS_ROOT, path.basename(oldMeta.src));
    if (!(await fileExists(oldAssetPath))) throw new Error(`Current asset ${oldMeta.src} is missing; cannot replace safely.`);

    const cutout = await candidateCutoutPath(key);
    const stagedMeta = await candidateMetaPath(key);
    if (!cutout || !stagedMeta) throw new Error(`${key} needs staged cutout.png and meta.json before replacement.`);
    const newMeta = await readJson<MetaEntry>(stagedMeta);

    const appliedAt = new Date().toISOString();
    const timestamp = appliedAt.replace(/[:.]/g, "-");
    const backupPath = path.join(CARS_ROOT, "backups", `${candidate.replacesKey}-${timestamp}.png`);
    const liveKey = promoteExistingKey ? candidate.replacesKey : key;
    const destination = promoteExistingKey ? oldAssetPath : path.join(CARS_ROOT, `${key}.png`);

    console.log(`${dryRun ? "Would replace" : "Replacing"} ${candidate.replacesKey} with ${key}.`);
    console.log(`Rollback copy: ${toRepoRelative(backupPath)}`);
    console.log(`New asset: ${toRepoRelative(destination)}`);

    if (!dryRun) {
      await ensureDir(path.dirname(backupPath));
      await copyFileEnsured(oldAssetPath, backupPath);
      await copyFileEnsured(cutout, destination);
      meta[liveKey] = {
        src: `cars/${path.basename(destination)}`,
        w: newMeta.w,
        h: newMeta.h,
        poly: newMeta.poly,
        headlights: newMeta.headlights,
        ground: newMeta.ground,
      };
      rotation[targetIndex] = {
        key: liveKey,
        name: candidate.vehicleName,
        tag: candidate.tag,
        destW: candidate.destW,
        status: "active",
      };
      if (!sources.approvedCandidates?.includes(key)) (sources.approvedCandidates ??= []).push(key);
      const sourceCandidate = sources.candidates.find((entry) => entry.key === key);
      if (sourceCandidate) {
        sourceCandidate.status = promoteExistingKey ? "replacement-promoted-active" : "replacement-active";
        sourceCandidate.approval = {
          ...(sourceCandidate.approval ?? {}),
          source: true,
          visual: true,
          import: true,
          approvedBy: sourceCandidate.approval?.approvedBy ?? "user",
          approvedAt: appliedAt,
        };
        sourceCandidate.liveReplacement = {
          replacedKey: candidate.replacesKey,
          liveKey,
          asset: toRepoRelative(destination),
          backup: toRepoRelative(backupPath),
          replacedAt: appliedAt,
          mode: promoteExistingKey ? "promote-existing-key" : "new-key",
        };
      }
    }
  }

  if (!dryRun) {
    await saveMeta(meta);
    await saveRotation(rotation);
    await saveSources(sources);
  }

  console.log(dryRun ? "Dry run complete; rotation unchanged." : "Approved replacements applied. Run validate-rotation.mts next.");
}

main().catch((error) => {
  if (error instanceof Error && error.message.includes(APPROVAL_ERROR)) {
    console.error(`${APPROVAL_ERROR}. Re-run with --approved <key>[,<key>] after visual approval.`);
    process.exit(1);
  }
  exitWithError(error);
});
