/**
 * Inventory domain types and the provider boundary.
 *
 * The whole discovery engine talks to inventory through a single
 * `InventoryProvider.getInventory()` method. Today that is backed by a seeded
 * in-memory dataset (see `data.json`). To go live with real dealer listings,
 * implement a new provider (e.g. a licensed marketplace listings API) that
 * returns the same `Listing[]` shape and swap it in `provider.ts` — no changes
 * needed anywhere else in the app.
 */

export type BodyStyle =
  | "Sedan"
  | "SUV"
  | "Truck"
  | "Coupe"
  | "Hatchback"
  | "Minivan"
  | "Convertible"
  | "Wagon";

export type FuelKind = "Gas" | "Hybrid" | "EV" | "Diesel";

/** Whether the vehicle is brand new (no history) or pre-owned. */
export type Condition = "New" | "Used";

/**
 * Who is selling the car. New cars are only sold by franchise dealers; used
 * cars can come from franchise dealers, independent used-car lots, or private
 * owners. The seller type drives trust cues and buying guidance.
 */
export type SellerType = "Franchise Dealer" | "Independent Dealer" | "Private Seller";

/** A photo attached to a listing, with provenance so the UI can label it. */
export type ListingPhoto = {
  url: string;
  /**
   * Where the image came from. "dealer" = real dealer/seller-supplied photo of
   * the actual car (highest credibility); "stock" = manufacturer/marketing
   * image of the model; "placeholder" = generic body-style image.
   */
  source: "dealer" | "stock" | "placeholder";
  caption?: string;
};

/** A single vehicle listing (new or used) available to the buyer. */
export type Listing = {
  id: string;
  vin: string;
  condition: Condition;
  year: number;
  make: string;
  model: string;
  trim: string;
  bodyStyle: BodyStyle;
  fuel: FuelKind;
  price: number; // USD (asking price for used; selling price for new)
  /** Manufacturer's Suggested Retail Price — primarily meaningful for new cars. */
  msrp?: number;
  mileage: number; // ~delivery miles for new cars
  /** Combined EPA-style estimate (mpg, or MPGe for EV). */
  mpg: number;
  exteriorColor: string;

  // --- Seller / provenance ---
  sellerType: SellerType;
  /** Dealer name, or the private seller's display name (e.g. "Private Seller — Mark T."). */
  dealerName: string;
  /** Years in business / member-since note for trust signalling. */
  sellerTenure?: string;
  city: string;
  state: string;
  /** Approximate straight-line distance from the buyer's location, in miles. */
  distanceMiles: number;
  /** Seller's ZIP code — used for ZIP-based distance recalculation. */
  zip: string;

  // --- Media ---
  /** Real listing photos when available; first is the primary/cover image. */
  photos: ListingPhoto[];

  /** Free-text dealer/seller blurb, mirroring a listing page. */
  dealerBlurb: string;

  // --- New-car specifics (reputation, not history) ---
  /** Manufacturer warranty summary (e.g. "3yr/36k basic · 5yr/60k powertrain"). */
  warranty?: string;
  /** Short model-reputation note for new cars (awards, ratings, redesign year). */
  modelReputation?: string;

  /**
   * Optional regional/history hint flags surfaced by the engine and used to
   * warn buyers (mirrors the kind of signal Carfax/CarGurus would later
   * confirm). Seeded for demo realism; clearly framed as unverified. Used cars
   * only — new cars have no history.
   */
  regionFlags?: string[];
};

export type BuyerCriteria = {
  /** New vs. used vs. either. */
  condition: "New" | "Used" | "Any";
  /** Max budget in USD (hard cap). */
  maxPrice: number;
  /** Optional minimum price (e.g. avoid suspiciously cheap cars). */
  minPrice?: number;
  /** Buyer's ZIP code (for distance recalculation); optional. */
  zip?: string;
  /** Max distance from the buyer in miles. */
  maxDistance: number;
  /** Desired body styles; empty = any. */
  bodyStyles: BodyStyle[];
  /** Desired fuel kinds; empty = any. */
  fuels: FuelKind[];
  /** Acceptable seller types; empty = any. */
  sellerTypes: SellerType[];
  /** Max acceptable mileage. */
  maxMileage: number;
  /**
   * Trade-off dial 0-100. 0 = price matters most (cheapest),
   * 100 = reliability/quality matters most. 50 = balanced.
   */
  priceVsReliability: number;
  /** How much fuel efficiency matters, 0-100. */
  efficiencyPriority: number;
};

/** A listing enriched with the engine's fit assessment. */
export type RankedMatch = {
  listing: Listing;
  /** 0-100 overall fit against the buyer's weighted criteria. */
  matchScore: number;
  /** GOGETTER quality score (0-100) reusing the existing scoring engine. */
  qualityScore: number;
  qualityGrade: string;
  /** Per-dimension fit breakdown (0-100). */
  fit: {
    price: number;
    reliability: number;
    efficiency: number;
    distance: number;
    mileage: number;
  };
  /** Short machine-generated reasons (pre-LLM, deterministic). */
  reasons: string[];
};

export interface InventoryProvider {
  /** Return all available listings the engine can rank. */
  getInventory(): Promise<Listing[]>;
  /** Look up a single listing by id (for detail views). */
  getListingById(id: string): Promise<Listing | null>;
  /** Look up a single listing by VIN (for deep links from the shortlist). */
  getListingByVin(vin: string): Promise<Listing | null>;
}
