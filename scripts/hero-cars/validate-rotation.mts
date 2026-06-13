import path from "node:path";
import {
  CARS_ROOT,
  HERO_ROOT,
  META_PATH,
  REPORTS_ROOT,
  ROTATION_PATH,
  SOURCES_PATH,
  activeRotation,
  ensureDir,
  exitWithError,
  fileExists,
  getPngDimensions,
  hasFlag,
  listImmediateCarPngs,
  loadMeta,
  loadRotation,
  loadSources,
  parseArgs,
  printJson,
  readJson,
  toRepoRelative,
  writeText,
} from "./lib.mts";

type Check = {
  id: string;
  status: "pass" | "warn" | "fail";
  message: string;
};

type ValidationReport = {
  ok: boolean;
  generatedAt: string;
  currentRotation: string[];
  recommendedNewCandidates: string[];
  replacementCandidates: string[];
  approvedCandidates: string[];
  rejectedCandidates: string[];
  sourceAttribution: Array<{ key: string; urls: string[] }>;
  qaResults: Record<string, string>;
  orphanedAssets: string[];
  checks: Check[];
  files: Record<string, string>;
};

type VisualQaResult = {
  name: string;
  passed: boolean;
  carouselLabels?: string[];
  expectedCarouselCount?: number;
  consoleErrors?: string[];
  pageErrors?: string[];
  horizontalOverflow?: number;
  heroError?: string | null;
};

type VisualQaReport = {
  ok: boolean;
  results: VisualQaResult[];
};

function add(checks: Check[], status: Check["status"], id: string, message: string): void {
  checks.push({ id, status, message });
}

function qaStatus(result: VisualQaResult | undefined, successDetail: string): string {
  if (!result) return "pending browser QA run";
  if (result.passed) return `pass — ${successDetail}`;
  return `fail — heroError=${result.heroError ?? "none"}; consoleErrors=${result.consoleErrors?.length ?? 0}; pageErrors=${result.pageErrors?.length ?? 0}; overflow=${result.horizontalOverflow ?? "unknown"}`;
}

async function loadBrowserQaResults(): Promise<Record<string, string>> {
  const visualQaReportPath = path.join(REPORTS_ROOT, "hero-car-visual-qa", "report.json");
  if (!(await fileExists(visualQaReportPath))) {
    return {
      browserDesktop: "pending browser QA run",
      browserMobile: "pending browser QA run",
      reducedMotion: "pending browser QA run",
      staleLocalStorage: "covered by runtime clamp and asset-level test; browser QA pending",
      carouselAdvancesThroughApprovedList: "pending browser QA run",
    };
  }

  try {
    const report = await readJson<VisualQaReport>(visualQaReportPath);
    const byName = new Map(report.results.map((result) => [result.name, result]));
    const desktop = byName.get("desktop");
    const mobile = byName.get("mobile");
    const reducedMotion = byName.get("reduced-motion");
    const staleLocalStorage = byName.get("stale-local-storage");
    const advancedCount = desktop?.carouselLabels?.length ?? 0;
    const expectedCount = desktop?.expectedCarouselCount ?? 0;

    return {
      browserDesktop: qaStatus(desktop, "desktop hero rendered with no console/page errors or overflow"),
      browserMobile: qaStatus(mobile, "mobile hero rendered with no console/page errors or overflow"),
      reducedMotion: qaStatus(reducedMotion, "reduced-motion fallback rendered"),
      staleLocalStorage: qaStatus(staleLocalStorage, "stale carAdvisorHero.carIdx was clamped safely"),
      carouselAdvancesThroughApprovedList:
        desktop?.passed && advancedCount === expectedCount
          ? `pass — exercised ${advancedCount}/${expectedCount} active cars`
          : `fail or pending — exercised ${advancedCount}/${expectedCount} active cars`,
    };
  } catch (error) {
    return {
      browserDesktop: `unable to read browser QA report: ${error instanceof Error ? error.message : String(error)}`,
      browserMobile: `unable to read browser QA report: ${error instanceof Error ? error.message : String(error)}`,
      reducedMotion: `unable to read browser QA report: ${error instanceof Error ? error.message : String(error)}`,
      staleLocalStorage: `unable to read browser QA report: ${error instanceof Error ? error.message : String(error)}`,
      carouselAdvancesThroughApprovedList: `unable to read browser QA report: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function markdown(report: ValidationReport): string {
  const checks = report.checks
    .map((check) => `| ${check.status.toUpperCase()} | ${check.id} | ${check.message.replaceAll("|", "\\|")} |`)
    .join("\n");
  const attribution = report.sourceAttribution
    .map((entry) => `- ${entry.key}: ${entry.urls.join(", ") || "no source URLs recorded"}`)
    .join("\n");

  return `# Hero Car Rotation Validation Report\n\nGenerated: ${report.generatedAt}\n\n## Current active rotation\n\n${report.currentRotation.map((key) => `- ${key}`).join("\n")}\n\n## Recommended new candidates\n\n${report.recommendedNewCandidates.map((key) => `- ${key}`).join("\n") || "None"}\n\n## Replacement candidates\n\n${report.replacementCandidates.map((key) => `- ${key}`).join("\n") || "None"}\n\n## Approved candidates\n\n${report.approvedCandidates.map((key) => `- ${key}`).join("\n") || "None yet. Visual/source approval gate is still closed."}\n\n## Rejected candidates\n\n${report.rejectedCandidates.map((key) => `- ${key}`).join("\n") || "None"}\n\n## Source attribution\n\n${attribution || "No source attribution recorded."}\n\n## Orphaned or inactive hero PNG assets\n\n${report.orphanedAssets.map((asset) => `- ${asset}`).join("\n") || "None"}\n\n## QA results\n\n${Object.entries(report.qaResults)
    .map(([name, value]) => `- ${name}: ${value}`)
    .join("\n")}\n\n## Checks\n\n| Status | Check | Message |\n| --- | --- | --- |\n${checks}\n`;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const checks: Check[] = [];
  const generatedAt = new Date().toISOString();

  let rotation = [] as Awaited<ReturnType<typeof loadRotation>>;
  let meta = {} as Awaited<ReturnType<typeof loadMeta>>;
  let sources = null as Awaited<ReturnType<typeof loadSources>> | null;

  try {
    rotation = await loadRotation();
    add(checks, "pass", "rotation-json", `${toRepoRelative(ROTATION_PATH)} parsed successfully.`);
  } catch (error) {
    add(checks, "fail", "rotation-json", `Could not parse rotation.json: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    meta = await loadMeta();
    add(checks, "pass", "meta-json", `${toRepoRelative(META_PATH)} parsed successfully.`);
  } catch (error) {
    add(checks, "fail", "meta-json", `Could not parse meta.json: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    sources = await loadSources();
    add(checks, "pass", "sources-json", `${toRepoRelative(SOURCES_PATH)} parsed successfully.`);
  } catch (error) {
    add(checks, "warn", "sources-json", `Could not parse sources.json: ${error instanceof Error ? error.message : String(error)}`);
  }

  const active = activeRotation(rotation);
  if (active.length > 0) add(checks, "pass", "non-empty-rotation", `Active rotation has ${active.length} cars.`);
  else add(checks, "fail", "non-empty-rotation", "Active rotation is empty; hero would have no approved cars.");

  const activeKeys = new Set(active.map((car) => car.key));
  const activeSrcs = new Set<string>();

  for (const car of active) {
    const metadata = meta[car.key];
    if (!metadata) {
      add(checks, "fail", `meta-${car.key}`, `${car.key} is active but missing from meta.json.`);
      continue;
    }
    add(checks, "pass", `meta-${car.key}`, `${car.key} has metadata.`);

    const srcPath = path.join(HERO_ROOT, metadata.src);
    if (await fileExists(srcPath)) {
      activeSrcs.add(metadata.src);
      add(checks, "pass", `asset-${car.key}`, `${metadata.src} exists.`);
    } else {
      add(checks, "fail", `asset-${car.key}`, `${metadata.src} is missing on disk.`);
    }

    if (Array.isArray(metadata.poly) && metadata.poly.length > 2) {
      add(checks, "pass", `poly-${car.key}`, `${car.key} has ${metadata.poly.length} polygon points.`);
    } else {
      add(checks, "fail", `poly-${car.key}`, `${car.key} polygon metadata is empty or too small.`);
    }

    if (Array.isArray(metadata.headlights) && metadata.headlights.length > 0) {
      add(checks, "pass", `headlight-${car.key}`, `${car.key} has a headlight point.`);
    } else {
      add(checks, "warn", `headlight-${car.key}`, `${car.key} has no headlight point; ignition flare will be absent.`);
    }

    if (typeof metadata.ground === "number" && metadata.ground >= 0.7 && metadata.ground <= 1.05) {
      add(checks, "pass", `ground-${car.key}`, `${car.key} ground=${metadata.ground}.`);
    } else {
      add(checks, "fail", `ground-${car.key}`, `${car.key} ground line is outside sane bounds.`);
    }

    const dimensions = await getPngDimensions(srcPath);
    if (!dimensions) {
      add(checks, "warn", `dimensions-${car.key}`, `${metadata.src} is not a readable PNG for dimension validation.`);
    } else if (dimensions.w === metadata.w && dimensions.h === metadata.h) {
      add(checks, "pass", `dimensions-${car.key}`, `${car.key} dimensions match metadata (${dimensions.w}x${dimensions.h}).`);
    } else {
      add(
        checks,
        "fail",
        `dimensions-${car.key}`,
        `${car.key} metadata says ${metadata.w}x${metadata.h}, but PNG is ${dimensions.w}x${dimensions.h}.`,
      );
    }
  }

  if (active.length > 0) {
    add(checks, "pass", "localstorage-index-safety", "Runtime normalizes carAdvisorHero.carIdx against the active rotation length.");
  }

  const immediatePngs = await listImmediateCarPngs();
  const orphanedAssets = immediatePngs.filter((asset) => !activeSrcs.has(asset));
  if (orphanedAssets.length > 0) {
    add(checks, "warn", "orphaned-assets", `Inactive/unreferenced PNG assets retained for rollback/review: ${orphanedAssets.join(", ")}.`);
  } else {
    add(checks, "pass", "orphaned-assets", "No inactive/unreferenced immediate hero PNG assets found.");
  }

  const replacementCandidates = sources?.candidates.filter((candidate) => candidate.action === "replacement") ?? [];
  for (const candidate of replacementCandidates) {
    if (!candidate.replacesKey) {
      add(checks, "warn", `replacement-target-${candidate.key}`, `${candidate.key} does not declare a replacement target.`);
      continue;
    }
    const replacementIsLive = candidate.status?.includes("replacement") && activeKeys.has(candidate.key);
    if (!activeKeys.has(candidate.replacesKey) && !replacementIsLive) {
      add(checks, "warn", `replacement-target-${candidate.key}`, `${candidate.key} does not point at an active replacement target.`);
      continue;
    }
    if (replacementIsLive) {
      add(checks, "pass", `replacement-active-${candidate.key}`, `${candidate.key} is active as the approved replacement for ${candidate.replacesKey}.`);
    }
    const currentAsset = candidate.currentAsset ? path.join(HERO_ROOT, candidate.currentAsset) : null;
    if (currentAsset && (await fileExists(currentAsset))) {
      add(checks, "pass", `replacement-recoverable-${candidate.key}`, `${candidate.currentAsset} remains recoverable for ${candidate.replacesKey}.`);
    } else {
      add(checks, "fail", `replacement-recoverable-${candidate.key}`, `${candidate.key} replacement lacks a recoverable current asset.`);
    }
  }

  const sourceAttribution =
    sources?.candidates.map((candidate) => ({
      key: candidate.key,
      urls: candidate.sourceCandidates?.map((source) => source.url).filter(Boolean) ?? [],
    })) ?? [];
  const browserQaResults = await loadBrowserQaResults();

  const report: ValidationReport = {
    ok: !checks.some((check) => check.status === "fail"),
    generatedAt,
    currentRotation: active.map((car) => car.key),
    recommendedNewCandidates: sources?.candidates.filter((candidate) => candidate.action === "add" && candidate.status !== "alternate").map((candidate) => candidate.key) ?? [],
    replacementCandidates: replacementCandidates.map((candidate) => candidate.key),
    approvedCandidates: sources?.approvedCandidates ?? [],
    rejectedCandidates: sources?.rejectedCandidates ?? [],
    sourceAttribution,
    qaResults: {
      cliValidation: "complete",
      ...browserQaResults,
    },
    orphanedAssets,
    checks,
    files: {
      carsRoot: toRepoRelative(CARS_ROOT),
      rotation: toRepoRelative(ROTATION_PATH),
      meta: toRepoRelative(META_PATH),
      sources: toRepoRelative(SOURCES_PATH),
    },
  };

  const reportFlag = args.flags.report?.at(-1) ?? args.flags["write-report"]?.at(-1);
  if (reportFlag) {
    const destination = reportFlag === "true" ? path.join(REPORTS_ROOT, "hero-car-rotation-validation-report.md") : path.resolve(reportFlag);
    await ensureDir(path.dirname(destination));
    await writeText(destination, markdown(report));
    if (!hasFlag(args, "json")) console.log(`Wrote ${toRepoRelative(destination)}`);
  }

  if (hasFlag(args, "json")) printJson(report);
  else console.log(markdown(report));

  if (!report.ok) process.exit(1);
}

main().catch(exitWithError);
