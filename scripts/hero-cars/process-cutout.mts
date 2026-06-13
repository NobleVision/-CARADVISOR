import path from "node:path";
import {
  STAGED_ROOT,
  assertSafeKey,
  copyFileEnsured,
  ensureDir,
  exitWithError,
  fileExists,
  getFlag,
  getPngDimensions,
  parseArgs,
  readCandidateManifest,
  toAbsolute,
  toRepoRelative,
  writeCandidateManifest,
} from "./lib.mts";

async function main(): Promise<void> {
  const args = parseArgs();
  const key = assertSafeKey(getFlag(args, "key") ?? args.positionals[0] ?? "");
  if (!key) throw new Error("Usage: tsx scripts/hero-cars/process-cutout.mts --key <candidate-key> [--manual-cutout path/to/transparent.png]");

  const stagedDir = path.join(STAGED_ROOT, key);
  await ensureDir(stagedDir);
  const manifest = (await readCandidateManifest(key)) ?? { key, notes: [] };

  const manualCutout = getFlag(args, "manual-cutout");
  const sourcePath = manualCutout
    ? toAbsolute(manualCutout)
    : path.join(stagedDir, "source.png");

  if (!(await fileExists(sourcePath))) {
    throw new Error(
      `No processable PNG source found for ${key}. Provide a reviewed transparent PNG with --manual-cutout, or download a PNG source first.`,
    );
  }

  const dimensions = await getPngDimensions(sourcePath);
  if (!dimensions) throw new Error(`${toRepoRelative(sourcePath)} is not a PNG. Convert/background-remove manually, then pass --manual-cutout.`);

  const destination = path.join(stagedDir, "cutout.png");
  await copyFileEnsured(sourcePath, destination);
  await writeCandidateManifest(key, {
    ...manifest,
    processedCutout: toRepoRelative(destination),
    cutoutDimensions: dimensions,
    processingMode: manualCutout ? "manual-transparent-png" : "direct-approved-png-copy",
    visualApproved: false,
    imported: false,
    validationNotes: [
      "Transparent PNG staged for preview only; not imported into rotation.json.",
      "Normalize scale/ground/headlight metadata with generate-meta.mts before visual approval.",
    ],
    updatedAt: new Date().toISOString(),
  });

  console.log(`Processed ${key} candidate cutout -> ${toRepoRelative(destination)} (${dimensions.w}x${dimensions.h})`);
}

main().catch(exitWithError);
