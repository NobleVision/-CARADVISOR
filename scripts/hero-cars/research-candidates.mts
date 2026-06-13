import {
  exitWithError,
  findCandidate,
  getFlag,
  hasFlag,
  loadSources,
  parseArgs,
  saveSources,
  assertSafeKey,
} from "./lib.mts";

async function main(): Promise<void> {
  const args = parseArgs();
  const sources = await loadSources();

  const addKey = getFlag(args, "add-key");
  if (addKey) {
    const key = assertSafeKey(addKey);
    const vehicleName = getFlag(args, "name");
    const url = getFlag(args, "url");
    if (!vehicleName || !url) throw new Error("--add-key requires --name and --url.");
    sources.candidates.push({
      key,
      vehicleName,
      tag: getFlag(args, "tag") ?? "pending tag",
      destW: Number(getFlag(args, "destW") ?? 800),
      action: (getFlag(args, "action") as "add" | "replacement") ?? "add",
      replacesKey: getFlag(args, "replaces-key"),
      priority: sources.candidates.length + 1,
      status: "needs-review",
      demandRationale: [getFlag(args, "rationale") ?? "Manual research candidate; demand rationale pending."],
      sourceCandidates: [
        {
          label: getFlag(args, "source-label") ?? vehicleName,
          url,
          domain: new URL(url).hostname,
          sourceType: getFlag(args, "source-type") ?? "manual-source",
          licenseStatus: "needs-final-license-review-before-download",
          approvedForDownload: false,
        },
      ],
      approval: { source: false, visual: false, import: false },
    });
    await saveSources(sources);
    console.log(`Recorded research candidate ${key}. It is not approved for download/import.`);
    return;
  }

  const key = getFlag(args, "key");
  if (key) {
    const candidate = findCandidate(sources, key);
    console.log(JSON.stringify(candidate, null, 2));
    return;
  }

  if (hasFlag(args, "json")) {
    console.log(JSON.stringify(sources, null, 2));
    return;
  }

  console.log("Hero car research candidates (source/visual approval still required):");
  for (const candidate of [...sources.candidates].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))) {
    const urls = candidate.sourceCandidates?.map((source) => `${source.domain ?? new URL(source.url).hostname}`).join(", ") ?? "no sources";
    const replaces = candidate.replacesKey ? ` replaces ${candidate.replacesKey}` : "";
    console.log(`- ${candidate.key}: ${candidate.vehicleName} [${candidate.action}${replaces}] status=${candidate.status ?? "pending"}; sources=${urls}`);
  }

  console.log("\nDemand/source references:");
  for (const source of sources.demandSources) {
    console.log(`- ${source.name}: ${source.url}`);
  }
}

main().catch(exitWithError);
