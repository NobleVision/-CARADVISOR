import path from "node:path";
import {
  STAGED_ROOT,
  assertSafeKey,
  candidateCutoutPath,
  exitWithError,
  findCandidate,
  getFlag,
  getPngDimensions,
  loadSources,
  parseArgs,
  toRepoRelative,
  writeCandidateManifest,
  writeJson,
} from "./lib.mts";

function parsePoint(value: string | undefined, fallback: number[]): number[] {
  if (!value) return fallback;
  const [x, y] = value.split(",").map((part) => Number(part.trim()));
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`Invalid point ${value}; expected x,y.`);
  return [x, y];
}

async function main(): Promise<void> {
  const args = parseArgs();
  const key = assertSafeKey(getFlag(args, "key") ?? args.positionals[0] ?? "");
  if (!key) throw new Error("Usage: tsx scripts/hero-cars/generate-meta.mts --key <candidate-key> --headlight 0.35,0.45 --ground 0.97");

  const sources = await loadSources();
  const candidate = findCandidate(sources, key);
  const cutout = getFlag(args, "cutout") ?? (await candidateCutoutPath(key));
  if (!cutout) throw new Error(`No staged cutout found for ${key}. Run process-cutout.mts first.`);

  const dimensions = await getPngDimensions(cutout);
  if (!dimensions) throw new Error(`${toRepoRelative(cutout)} is not a readable PNG.`);

  const ground = Number(getFlag(args, "ground") ?? 0.97);
  if (!Number.isFinite(ground) || ground < 0.7 || ground > 1.05) throw new Error("--ground must be between 0.7 and 1.05.");
  const headlight = parsePoint(getFlag(args, "headlight"), [0.35, 0.46]);

  const meta = {
    src: `cars/${key}.png`,
    w: dimensions.w,
    h: dimensions.h,
    // Coarse preview polygon. Refine after visual review if the generated rim line needs closer tracing.
    poly: [
      [0.03, 0.82],
      [0.08, 0.42],
      [0.25, 0.22],
      [0.48, 0.12],
      [0.76, 0.22],
      [0.95, 0.48],
      [0.97, 0.84],
      [0.78, 0.95],
      [0.22, 0.95],
    ],
    headlights: [headlight],
    ground,
  };

  const metaPath = path.join(STAGED_ROOT, key, "meta.json");
  await writeJson(metaPath, meta);
  await writeCandidateManifest(key, {
    key,
    vehicleName: candidate.vehicleName,
    action: candidate.action,
    replacesKey: candidate.replacesKey ?? null,
    generatedMeta: toRepoRelative(metaPath),
    meta,
    visualApproved: false,
    imported: false,
    validationNotes: [
      "Generated metadata is staged only; import requires explicit visual approval.",
      "Review ground/headlight/polygon against preview sheet before approval.",
    ],
    updatedAt: new Date().toISOString(),
  });

  console.log(`Wrote staged metadata for ${key}: ${toRepoRelative(metaPath)}`);
}

main().catch(exitWithError);
