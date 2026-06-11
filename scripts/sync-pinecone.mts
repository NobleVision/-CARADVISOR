/**
 * One-time / idempotent Pinecone sync: creates the integrated-inference index
 * (Pinecone-hosted llama-text-embed-v2 — no separate embedding key) if it
 * doesn't exist, then full-re-upserts every inventory listing and curated
 * knowledge entry. Re-run after editing data.json / data.curated.json /
 * knowledge entries:  pnpm sync:pinecone
 */
import "dotenv/config";

const { ENV } = await import("../server/_core/env");
if (!ENV.pineconeApiKey) {
  console.error("PINECONE_API_KEY is not set — nothing to sync.");
  process.exit(1);
}

const { Pinecone } = await import("@pinecone-database/pinecone");
const { inventoryProvider } = await import("../server/inventory/provider");
const { advisoriesForListing } = await import("../server/inventory/matching");
const { KNOWLEDGE_ENTRIES } = await import("../server/knowledge/data");
const { buildKnowledgeText, buildListingText } = await import("../server/vector/text");
const { KNOWLEDGE_NAMESPACE, LISTINGS_NAMESPACE, PINECONE_INDEX } = await import(
  "../server/vector/pinecone"
);

const pc = new Pinecone({ apiKey: ENV.pineconeApiKey });

const existing = await pc.listIndexes();
const hasIndex = (existing.indexes ?? []).some((i) => i.name === PINECONE_INDEX);
if (!hasIndex) {
  console.log(`Creating index "${PINECONE_INDEX}" (aws/us-east-1, llama-text-embed-v2)…`);
  await pc.createIndexForModel({
    name: PINECONE_INDEX,
    cloud: "aws",
    region: "us-east-1",
    embed: { model: "llama-text-embed-v2", fieldMap: { text: "text" } },
    waitUntilReady: true,
  });
  console.log("Index ready.");
} else {
  console.log(`Index "${PINECONE_INDEX}" exists.`);
}

const index = pc.index(PINECONE_INDEX);

const listings = await inventoryProvider.getInventory();
const listingRecords = listings.map((l) => ({
  id: l.id,
  text: buildListingText(l, advisoriesForListing(l)),
  year: l.year,
  make: l.make,
  model: l.model,
  bodyStyle: l.bodyStyle,
  fuel: l.fuel,
  condition: l.condition,
  price: l.price,
  mileage: l.mileage,
  sellerType: l.sellerType,
}));

const knowledgeRecords = KNOWLEDGE_ENTRIES.map((e) => ({
  id: e.id,
  text: buildKnowledgeText(e),
  severity: e.severity,
  make: e.make,
}));

// Hosted-embedding upserts are capped at 96 records per batch.
async function upsertAll(namespace: string, records: Record<string, string | number>[]) {
  const ns = index.namespace(namespace);
  for (let i = 0; i < records.length; i += 90) {
    const batch = records.slice(i, i + 90);
    await ns.upsertRecords({ records: batch });
    console.log(`  ${namespace}: ${Math.min(i + 90, records.length)}/${records.length} upserted`);
  }
}

await upsertAll(LISTINGS_NAMESPACE, listingRecords);
await upsertAll(KNOWLEDGE_NAMESPACE, knowledgeRecords);

const stats = await index.describeIndexStats();
console.log(
  "Namespace record counts:",
  Object.fromEntries(
    Object.entries(stats.namespaces ?? {}).map(([k, v]) => [k, v?.recordCount ?? 0]),
  ),
);
console.log("SYNC COMPLETE");
