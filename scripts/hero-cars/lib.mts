import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { access, copyFile, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
export const HERO_ROOT = path.join(REPO_ROOT, "client", "public", "hero");
export const CARS_ROOT = path.join(HERO_ROOT, "cars");
export const STAGED_ROOT = path.join(CARS_ROOT, "staged");
export const ROTATION_PATH = path.join(CARS_ROOT, "rotation.json");
export const META_PATH = path.join(CARS_ROOT, "meta.json");
export const SOURCES_PATH = path.join(CARS_ROOT, "sources.json");
export const REPORTS_ROOT = path.join(REPO_ROOT, "docs", "reports");

export type RotationEntry = {
  key: string;
  name: string;
  tag: string;
  destW: number;
  status?: "active" | "inactive";
};

export type MetaEntry = {
  src: string;
  w: number;
  h: number;
  poly: number[][];
  headlights: number[][];
  ground: number;
};

export type CandidateSource = {
  label: string;
  url: string;
  domain?: string;
  sourcePage?: string;
  sourceType?: string;
  licenseStatus?: string;
  approvedForDownload?: boolean;
  notes?: string;
};

export type CandidateApproval = {
  source?: boolean;
  visual?: boolean;
  import?: boolean;
  approvedBy?: string;
  approvedAt?: string;
};

export type Candidate = {
  key: string;
  vehicleName: string;
  tag: string;
  destW: number;
  action: "add" | "replacement";
  replacesKey?: string;
  currentAsset?: string;
  priority?: number;
  status?: string;
  selectedSourceIndex?: number;
  stagedArtifacts?: Record<string, string>;
  liveReplacement?: {
    replacedKey: string;
    liveKey: string;
    asset: string;
    backup: string;
    replacedAt: string;
    mode: "new-key" | "promote-existing-key";
  };
  demandRationale?: string[];
  sourceCandidates?: CandidateSource[];
  approval?: CandidateApproval;
};

export type SourcesLibrary = {
  version: number;
  updatedAt: string;
  approvalPolicy: string;
  demandSources: Array<Record<string, unknown>>;
  candidates: Candidate[];
  approvedCandidates?: string[];
  rejectedCandidates?: string[];
};

export type CliArgs = {
  flags: Record<string, string[]>;
  positionals: string[];
};

export function parseArgs(argv = process.argv.slice(2)): CliArgs {
  const flags: Record<string, string[]> = {};
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const raw = arg.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      const name = raw.slice(0, eq);
      const value = raw.slice(eq + 1);
      (flags[name] ??= []).push(value);
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      (flags[raw] ??= []).push(next);
      i += 1;
    } else {
      (flags[raw] ??= []).push("true");
    }
  }

  return { flags, positionals };
}

export function getFlag(args: CliArgs, name: string): string | undefined {
  return args.flags[name]?.at(-1);
}

export function hasFlag(args: CliArgs, name: string): boolean {
  return Boolean(args.flags[name]?.length);
}

export function parseKeyList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

export function requireApprovedKeys(args: CliArgs): string[] {
  const approvedKeys = parseKeyList(getFlag(args, "approved"));
  if (!approvedKeys.length) {
    throw new Error("No approved candidate keys supplied. Re-run with --approved <key>[,<key>] after visual approval.");
  }
  return approvedKeys;
}

export function assertSafeKey(key: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) {
    throw new Error(`Unsafe hero car key: ${key}`);
  }
  return key;
}

export function toAbsolute(filePath: string, base = REPO_ROOT): string {
  return path.isAbsolute(filePath) ? filePath : path.join(base, filePath);
}

export function toHeroRelative(filePath: string): string {
  return path.relative(HERO_ROOT, filePath).split(path.sep).join("/");
}

export function toRepoRelative(filePath: string): string {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export async function writeText(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, "utf8");
}

export async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readText(filePath)) as T;
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await writeText(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export async function copyFileEnsured(source: string, destination: string): Promise<void> {
  await ensureDir(path.dirname(destination));
  await copyFile(source, destination);
}

export async function moveFileEnsured(source: string, destination: string): Promise<void> {
  await ensureDir(path.dirname(destination));
  await rename(source, destination);
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  hash.update(await readFile(filePath));
  return hash.digest("hex");
}

export function extensionFromUrl(url: string, fallback = ".bin"): string {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).toLowerCase();
    if (/^\.(png|jpg|jpeg|webp|avif)$/i.test(ext)) return ext;
  } catch {
    const ext = path.extname(url).toLowerCase();
    if (/^\.(png|jpg|jpeg|webp|avif)$/i.test(ext)) return ext;
  }
  return fallback;
}

export function readPngDimensions(buffer: Buffer): { w: number; h: number } | null {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) return null;
  const chunkType = buffer.subarray(12, 16).toString("ascii");
  if (chunkType !== "IHDR") return null;
  return { w: buffer.readUInt32BE(16), h: buffer.readUInt32BE(20) };
}

export async function getPngDimensions(filePath: string): Promise<{ w: number; h: number } | null> {
  if (!filePath.toLowerCase().endsWith(".png")) return null;
  return readPngDimensions(await readFile(filePath));
}

export async function loadRotation(): Promise<RotationEntry[]> {
  return readJson<RotationEntry[]>(ROTATION_PATH);
}

export async function saveRotation(rotation: RotationEntry[]): Promise<void> {
  await writeJson(ROTATION_PATH, rotation);
}

export async function loadMeta(): Promise<Record<string, MetaEntry>> {
  return readJson<Record<string, MetaEntry>>(META_PATH);
}

export async function saveMeta(meta: Record<string, MetaEntry>): Promise<void> {
  await writeJson(META_PATH, meta);
}

export async function loadSources(): Promise<SourcesLibrary> {
  return readJson<SourcesLibrary>(SOURCES_PATH);
}

export async function saveSources(sources: SourcesLibrary): Promise<void> {
  sources.updatedAt = new Date().toISOString().slice(0, 10);
  await writeJson(SOURCES_PATH, sources);
}

export function activeRotation(rotation: RotationEntry[]): RotationEntry[] {
  return rotation.filter((car) => car.status !== "inactive");
}

export async function listImmediateCarPngs(): Promise<string[]> {
  const entries = await readdir(CARS_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
    .map((entry) => `cars/${entry.name}`)
    .sort();
}

export async function readCandidateManifest(key: string): Promise<Record<string, unknown> | null> {
  const manifestPath = path.join(STAGED_ROOT, assertSafeKey(key), "manifest.json");
  if (!(await fileExists(manifestPath))) return null;
  return readJson<Record<string, unknown>>(manifestPath);
}

export async function writeCandidateManifest(key: string, manifest: Record<string, unknown>): Promise<void> {
  await writeJson(path.join(STAGED_ROOT, assertSafeKey(key), "manifest.json"), manifest);
}

export async function candidateCutoutPath(key: string): Promise<string | null> {
  const staged = path.join(STAGED_ROOT, assertSafeKey(key), "cutout.png");
  return (await fileExists(staged)) ? staged : null;
}

export async function candidateMetaPath(key: string): Promise<string | null> {
  const staged = path.join(STAGED_ROOT, assertSafeKey(key), "meta.json");
  return (await fileExists(staged)) ? staged : null;
}

export function findCandidate(sources: SourcesLibrary, key: string): Candidate {
  const candidate = sources.candidates.find((entry) => entry.key === key);
  if (!candidate) throw new Error(`No candidate found for key: ${key}`);
  return candidate;
}

export function htmlEscape(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function fileSize(filePath: string): Promise<number> {
  return (await stat(filePath)).size;
}

export function exitWithError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}

export function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}
