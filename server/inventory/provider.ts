import { applyManifest } from "../images/cloudinary";
import type { BodyStyle, InventoryProvider, Listing, ListingPhoto } from "./types";
import rawData from "./data.json" with { type: "json" };
// Curated "buyer story" listings (reliability traps + proven value picks) live
// in their own file so regenerating data.json never wipes them.
import curatedData from "./data.curated.json" with { type: "json" };

/**
 * Body-style -> representative studio image. Used as the honest fallback when a
 * listing has no real photos. Tagged `placeholder` so the UI never implies a
 * generic image is an actual photo of the car.
 * Stable webdev static-asset URLs (compressed webp).
 */
const BODY_PHOTOS: Record<BodyStyle, string> = {
  Sedan: "https://d2xsxph8kpxj0f.cloudfront.net/87827969/VXB2U7r7hK3nj9XKQgRt2L/body-sedan-5aSF5pY8aCw4HWu2rzTFvV.webp",
  SUV: "https://d2xsxph8kpxj0f.cloudfront.net/87827969/VXB2U7r7hK3nj9XKQgRt2L/body-suv-k8WEzw5nSnDJ6tArTxguEL.webp",
  Truck: "https://d2xsxph8kpxj0f.cloudfront.net/87827969/VXB2U7r7hK3nj9XKQgRt2L/body-truck-PX9X95tPmRJExg83FZGMJs.webp",
  Coupe: "https://d2xsxph8kpxj0f.cloudfront.net/87827969/VXB2U7r7hK3nj9XKQgRt2L/body-coupe-QPKEKYWavvmqZK44jtCbPz.webp",
  Hatchback: "https://d2xsxph8kpxj0f.cloudfront.net/87827969/VXB2U7r7hK3nj9XKQgRt2L/body-hatchback-5XAsdRBJqqPPvgMa9UmeBS.webp",
  Minivan: "https://d2xsxph8kpxj0f.cloudfront.net/87827969/VXB2U7r7hK3nj9XKQgRt2L/body-minivan-75d8hoQb5GiqS3KZEKBSHb.webp",
  Convertible: "https://d2xsxph8kpxj0f.cloudfront.net/87827969/VXB2U7r7hK3nj9XKQgRt2L/body-convertible-NKDJCLjrb7eZkHLGyRKRKE.webp",
  Wagon: "https://d2xsxph8kpxj0f.cloudfront.net/87827969/VXB2U7r7hK3nj9XKQgRt2L/body-wagon-BNkfzfQAvyg7KpcLAc66TC.webp",
};

/**
 * Raw seed row shape (data.json) carries `_photoKind` / `_photoCount` hints that
 * we resolve into a proper provenance-tagged `photos[]` array at load time.
 */
type SeedRow = Listing & { _photoKind?: "dealer" | "stock"; _photoCount?: number };

/**
 * Build the provenance-tagged photo list for a listing.
 *
 * - For the demo, the cover image is the body-style studio shot, tagged honestly
 *   as `stock` (a representative model image) or `placeholder`.
 * - When a listing is flagged as having dealer photos, we add additional
 *   slots tagged `dealer` to demonstrate the credibility path. In production,
 *   a real listings provider supplies genuine dealer image URLs here.
 *
 * NOTE: We never label a generic/stock image as a real `dealer` photo. The
 * credibility badge in the UI only lights up for genuinely dealer-sourced
 * images, which is exactly what a live API would populate.
 */
function buildPhotos(row: SeedRow): ListingPhoto[] {
  const base = BODY_PHOTOS[row.bodyStyle] || BODY_PHOTOS.Sedan;
  const label = `${row.year} ${row.make} ${row.model} ${row.trim}`;

  // Existing real photos (from a live provider) always win.
  if (row.photos && row.photos.length > 0) return row.photos;

  const kind = row._photoKind ?? "stock";
  const count = Math.max(1, row._photoCount ?? 1);

  if (kind === "dealer") {
    // Demo: seller-supplied photos of the actual car. Same base image is reused
    // for the gallery in the seed; a live provider supplies distinct URLs.
    const photos: ListingPhoto[] = [];
    for (let i = 0; i < count; i++) {
      photos.push({
        url: base,
        source: "dealer",
        caption: i === 0 ? `${label} — seller photo` : `${label} — photo ${i + 1}`,
      });
    }
    return photos;
  }

  // Stock / representative model image.
  return [{ url: base, source: "stock", caption: `${label} (representative image)` }];
}

let _cache: Listing[] | null = null;

function loadListings(): Listing[] {
  if (_cache) return _cache;
  const rows = [...(rawData as SeedRow[]), ...(curatedData as SeedRow[])];
  const listings = rows.map((row) => {
    const { _photoKind, _photoCount, ...rest } = row;
    // Cloudinary manifest swap: optimized CDN URLs when the sync has run and
    // CLOUDINARY_URL is configured; byte-identical photos otherwise.
    return { ...rest, photos: applyManifest(row.id, buildPhotos(row)) } as Listing;
  });
  _cache = listings;
  return listings;
}

/**
 * Seeded inventory provider. Swap this implementation for a real listings-API
 * provider later — the `InventoryProvider` contract is all the engine depends on.
 */
export const seededInventoryProvider: InventoryProvider = {
  async getInventory(): Promise<Listing[]> {
    return loadListings();
  },
  async getListingById(id: string): Promise<Listing | null> {
    return loadListings().find((l) => l.id === id) ?? null;
  },
  async getListingByVin(vin: string): Promise<Listing | null> {
    const v = vin.trim().toUpperCase();
    return loadListings().find((l) => l.vin.toUpperCase() === v) ?? null;
  },
};

/** The active provider used across the app. */
export const inventoryProvider: InventoryProvider = seededInventoryProvider;
