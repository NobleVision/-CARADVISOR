import { ENV } from "../_core/env";
import manifestJson from "../inventory/photos.cloudinary.json" with { type: "json" };
import type { ListingPhoto } from "../inventory/types";

/**
 * Cloudinary delivery for listing photos — runtime side.
 *
 * Uploads happen once in `pnpm sync:cloudinary` (scripts/sync-cloudinary.mts),
 * which writes a committed manifest mapping each listing's photo slots to the
 * uploaded asset. At runtime this module is a pure URL builder: when the
 * cloud name (from CLOUDINARY_URL) and a manifest entry exist, photo URLs are
 * swapped to optimized f_auto/q_auto CDN delivery; otherwise the original
 * URLs pass through untouched. No SDK on the request path.
 */

export type ManifestPhoto = { publicId: string; version: number; format: string } | null;
export type PhotoManifest = Record<string, ManifestPhoto[]>;

const MANIFEST = manifestJson as PhotoManifest;

/** Extract the (public) cloud name from a cloudinary:// URL. Never the secret. */
export function cloudNameFromUrl(cloudinaryUrl: string): string | null {
  const match = /^cloudinary:\/\/[^:@]+:[^@]+@([a-z0-9][a-z0-9_-]*)/i.exec(cloudinaryUrl.trim());
  return match ? match[1] : null;
}

const CLOUD_NAME = cloudNameFromUrl(ENV.cloudinaryUrl);

/** Width-capped, auto-format/quality transform used for listing imagery. */
export const DEFAULT_TRANSFORM = "f_auto,q_auto,w_1000,c_limit";

export function imagesConfigured(): boolean {
  return Boolean(CLOUD_NAME);
}

export function deliveryUrl(
  entry: ManifestPhoto,
  transform: string = DEFAULT_TRANSFORM,
  cloudName: string | null = CLOUD_NAME,
): string | null {
  if (!entry || !cloudName) return null;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/v${entry.version}/${entry.publicId}.${entry.format}`;
}

/**
 * Swap a listing's photo URLs to Cloudinary delivery where the manifest has
 * an uploaded asset for that slot. Provenance/captions are preserved; photos
 * without a manifest entry (or when unconfigured) are returned unchanged.
 */
export function applyManifest(
  listingId: string,
  photos: ListingPhoto[],
  manifest: PhotoManifest = MANIFEST,
  cloudName: string | null = CLOUD_NAME,
): ListingPhoto[] {
  if (!cloudName) return photos;
  const entries = manifest[listingId];
  if (!entries || entries.length === 0) return photos;
  return photos.map((photo, i) => {
    const url = deliveryUrl(entries[i] ?? null, DEFAULT_TRANSFORM, cloudName);
    return url ? { ...photo, url } : photo;
  });
}
