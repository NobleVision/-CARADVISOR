/**
 * One-time / idempotent Cloudinary sync: uploads every UNIQUE listing-photo
 * source URL (today's seeded inventory shares a handful of stock images —
 * each is uploaded exactly once, keyed by a hash of its URL), then writes the
 * committed manifest `server/inventory/photos.cloudinary.json` that the
 * runtime URL builder consumes. Re-run after inventory/photo changes:
 *   pnpm sync:cloudinary
 *
 * Idempotent: deterministic public_id + overwrite:false means re-runs return
 * the already-uploaded asset instead of re-uploading bytes. When a real
 * listings feed lands, distinct dealer URLs flow through unchanged — one
 * upload per unique image, same manifest contract.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { ENV } = await import("../server/_core/env");
if (!ENV.cloudinaryUrl) {
  console.error("CLOUDINARY_URL is not set — nothing to sync.");
  process.exit(1);
}

// The SDK auto-configures itself from the CLOUDINARY_URL env var.
const { v2: cloudinary } = await import("cloudinary");
const { inventoryProvider } = await import("../server/inventory/provider");
import type { ManifestPhoto, PhotoManifest } from "../server/images/cloudinary";

const listings = await inventoryProvider.getInventory();

// Memoize by source URL with the PROMISE as the value so concurrent photo
// slots sharing one URL never race into duplicate uploads.
const uploads = new Map<string, Promise<ManifestPhoto>>();
let uploadedCount = 0;

function uploadOnce(sourceUrl: string): Promise<ManifestPhoto> {
  const existing = uploads.get(sourceUrl);
  if (existing) return existing;

  const publicId = `gogetter/src/${createHash("sha1").update(sourceUrl).digest("hex").slice(0, 16)}`;
  const task: Promise<ManifestPhoto> = cloudinary.uploader
    .upload(sourceUrl, { public_id: publicId, overwrite: false, resource_type: "image" })
    .then((res) => {
      uploadedCount++;
      console.log(`  ✓ ${publicId} (${res.format}, v${res.version})`);
      return { publicId: res.public_id, version: res.version, format: res.format };
    })
    .catch((err: unknown) => {
      console.warn(`  ✗ upload failed for ${sourceUrl}: ${err instanceof Error ? err.message : err}`);
      return null;
    });
  uploads.set(sourceUrl, task);
  return task;
}

const manifest: PhotoManifest = {};
for (const listing of listings) {
  manifest[listing.id] = await Promise.all(listing.photos.map((p) => uploadOnce(p.url)));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(here, "..", "server", "inventory", "photos.cloudinary.json");
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const uniqueUrls = uploads.size;
const failed = (await Promise.all([...uploads.values()])).filter((e) => e === null).length;
console.log(
  `Manifest written: ${Object.keys(manifest).length} listings, ${uniqueUrls} unique images (${failed} failed).`,
);
if (failed > 0) {
  console.warn("Some uploads failed — affected photo slots will keep their original URLs.");
  process.exitCode = 1;
}
console.log("SYNC COMPLETE");
