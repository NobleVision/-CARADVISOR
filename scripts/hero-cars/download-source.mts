import path from "node:path";
import {
  STAGED_ROOT,
  assertSafeKey,
  ensureDir,
  exitWithError,
  extensionFromUrl,
  findCandidate,
  getFlag,
  hasFlag,
  loadSources,
  parseArgs,
  sha256File,
  toRepoRelative,
  writeCandidateManifest,
} from "./lib.mts";
import { writeFile } from "node:fs/promises";

async function main(): Promise<void> {
  const args = parseArgs();
  const key = assertSafeKey(getFlag(args, "key") ?? args.positionals[0] ?? "");
  if (!key) throw new Error("Usage: tsx scripts/hero-cars/download-source.mts --key <candidate-key> --url <approved-image-url> --approved-source");
  if (!hasFlag(args, "approved-source")) {
    throw new Error("Source download blocked. Verify source licensing/terms, then re-run with --approved-source.");
  }

  const sources = await loadSources();
  const candidate = findCandidate(sources, key);
  const sourceIndex = Number(getFlag(args, "source-index") ?? 0);
  const source = candidate.sourceCandidates?.[sourceIndex];
  const sourceUrl = getFlag(args, "url") ?? source?.url;
  if (!sourceUrl) throw new Error(`No source URL provided or recorded for ${key}.`);

  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      ...(source?.sourcePage ? { referer: source.sourcePage } : {}),
    },
  });
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${sourceUrl}`);

  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const ext = extensionFromUrl(sourceUrl, contentType.includes("png") ? ".png" : contentType.includes("jpeg") ? ".jpg" : ".bin");
  const stagedDir = path.join(STAGED_ROOT, key);
  await ensureDir(stagedDir);
  const destination = path.join(stagedDir, `source${ext}`);
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  const sha256 = await sha256File(destination);

  await writeCandidateManifest(key, {
    key,
    vehicleName: candidate.vehicleName,
    action: candidate.action,
    replacesKey: candidate.replacesKey ?? null,
    sourceUrl,
    sourceContentType: contentType,
    sourceFile: toRepoRelative(destination),
    sourceSha256: sha256,
    sourceApproved: true,
    visualApproved: false,
    imported: false,
    notes: ["Downloaded from an explicitly approved source URL; process/preview before import."],
    updatedAt: new Date().toISOString(),
  });

  console.log(`Downloaded ${sourceUrl}`);
  console.log(`Wrote ${toRepoRelative(destination)}`);
  console.log(`sha256=${sha256}`);
}

main().catch(exitWithError);
