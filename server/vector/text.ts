import type { Listing } from "../inventory/types";
import type { KnowledgeEntry, VehicleAdvisory } from "../knowledge/types";

/**
 * Embedding-text composers shared by the Pinecone sync script and the
 * runtime similar-vehicles query. Pure string builders: the wording is what
 * the vector index "understands" about each record, so it packs the buyer-
 * relevant facts (what/price/mileage/where/seller) plus the curated
 * reliability verdict into one natural sentence cluster.
 */

const severityPhrase = (a: VehicleAdvisory): string => {
  if (a.waivedByManual) return `note: ${a.title} (waived — manual transmission)`;
  if (a.severity === "avoid") return `known defect, avoid: ${a.title}`;
  if (a.severity === "caution") return `caution: ${a.title}`;
  return `proven value pick: ${a.title}`;
};

export function buildListingText(listing: Listing, advisories: VehicleAdvisory[]): string {
  const l = listing;
  const parts: string[] = [
    `${l.year} ${l.make} ${l.model}${l.trim ? ` ${l.trim}` : ""}`,
    `${l.condition.toLowerCase()} ${l.bodyStyle.toLowerCase()}`,
    `${l.fuel === "EV" ? "electric" : l.fuel.toLowerCase()} ${l.fuel === "EV" ? `${l.mpg} MPGe` : `${l.mpg} mpg`}`,
    `$${l.price.toLocaleString("en-US")}`,
    l.condition === "Used" ? `${l.mileage.toLocaleString("en-US")} miles` : "new, delivery miles",
    l.exteriorColor.toLowerCase(),
    `sold by ${l.sellerType.toLowerCase()} ${l.dealerName} in ${l.city}, ${l.state}`,
  ];
  if (advisories.length > 0) {
    parts.push(advisories.map(severityPhrase).join("; "));
  }
  if (l.dealerBlurb) parts.push(l.dealerBlurb);
  // Keep records comfortably inside the hosted embedding model's window.
  return parts.join(". ").slice(0, 1200);
}

export function buildKnowledgeText(entry: KnowledgeEntry): string {
  const head =
    entry.severity === "avoid"
      ? "Known defect — avoid"
      : entry.severity === "caution"
        ? "Caution"
        : "Proven value pick";
  const parts: string[] = [
    `${entry.make} ${entry.models[0]} ${entry.yearFrom}-${entry.yearTo}`,
    `${head}: ${entry.title}`,
    entry.detail,
    `categories: ${entry.categories.join(", ")}`,
  ];
  if (entry.transmissionCaveat) parts.push(entry.transmissionCaveat.note);
  if (entry.whyBuy?.length) parts.push(`why buy: ${entry.whyBuy.join("; ")}`);
  if (entry.watchFor.length) parts.push(`watch for: ${entry.watchFor.join("; ")}`);
  return parts.join(". ").slice(0, 1200);
}
