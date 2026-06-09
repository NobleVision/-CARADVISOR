export type BodyStyle =
  | "Sedan" | "SUV" | "Truck" | "Coupe" | "Hatchback" | "Minivan" | "Convertible" | "Wagon";
export type FuelKind = "Gas" | "Hybrid" | "EV" | "Diesel";
export type Condition = "New" | "Used";
export type SellerType = "Franchise Dealer" | "Independent Dealer" | "Private Seller";

export type ListingPhoto = {
  url: string;
  source: "dealer" | "stock" | "placeholder";
  caption?: string;
};

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
  price: number;
  msrp?: number;
  mileage: number;
  mpg: number;
  exteriorColor: string;
  sellerType: SellerType;
  dealerName: string;
  sellerTenure?: string;
  city: string;
  state: string;
  distanceMiles: number;
  zip: string;
  photos: ListingPhoto[];
  dealerBlurb: string;
  warranty?: string;
  modelReputation?: string;
  regionFlags?: string[];
};

export type CarNarrative = {
  listingId: string;
  whyPicked: string;
  advantages: string[];
  disadvantages: string[];
  watchFor: string[];
};

export type RankedMatch = {
  listing: Listing;
  matchScore: number;
  qualityScore: number;
  qualityGrade: string;
  fit: {
    price: number;
    reliability: number;
    efficiency: number;
    distance: number;
    mileage: number;
  };
  reasons: string[];
  narrative: CarNarrative | null;
};

export type SearchResult = {
  scanned: number;
  eligible: number;
  shortlisted: number;
  zipApplied: boolean;
  matches: RankedMatch[];
};

export type BuyerCriteria = {
  condition: "New" | "Used" | "Any";
  maxPrice: number;
  minPrice?: number;
  zip?: string;
  maxDistance: number;
  bodyStyles: BodyStyle[];
  fuels: FuelKind[];
  sellerTypes: SellerType[];
  maxMileage: number;
  priceVsReliability: number;
  efficiencyPriority: number;
  limit?: number;
};

export const ALL_BODY_STYLES: BodyStyle[] = [
  "Sedan", "SUV", "Truck", "Coupe", "Hatchback", "Minivan", "Convertible", "Wagon",
];
export const ALL_FUELS: FuelKind[] = ["Gas", "Hybrid", "EV", "Diesel"];
export const ALL_SELLER_TYPES: SellerType[] = [
  "Franchise Dealer", "Independent Dealer", "Private Seller",
];

/** Primary/cover photo for a listing (first photo), with a safe fallback. */
export function coverPhoto(listing: Listing): ListingPhoto | null {
  return listing.photos && listing.photos.length > 0 ? listing.photos[0] : null;
}

/** True when a listing has at least one genuine dealer/seller-supplied photo. */
export function hasDealerPhotos(listing: Listing): boolean {
  return !!listing.photos?.some((p) => p.source === "dealer");
}

export function formatUSD(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function matchColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-primary";
  if (score >= 55) return "text-amber-400";
  return "text-rose-400";
}

export function sellerBadge(sellerType: SellerType): { label: string; tone: string } {
  switch (sellerType) {
    case "Franchise Dealer":
      return { label: "Franchise Dealer", tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
    case "Independent Dealer":
      return { label: "Independent Dealer", tone: "bg-sky-500/15 text-sky-300 border-sky-500/30" };
    case "Private Seller":
      return { label: "Private Seller", tone: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  }
}
