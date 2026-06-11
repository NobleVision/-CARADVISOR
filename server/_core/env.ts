// Resolved once at import time. The LLM block supports two configurations:
// an explicit OpenAI-compatible endpoint (LLM_API_URL + LLM_API_KEY always
// win), or — when BOTH are absent — Z.AI's GLM endpoint keyed by ZAI_API_KEY.
// The fallback only engages when the custom pair is fully absent so a custom
// endpoint can never silently receive the Z.AI credential.
const customLlmApiUrl = process.env.LLM_API_URL ?? "";
const customLlmApiKey = process.env.LLM_API_KEY ?? "";
const zaiApiKey = process.env.ZAI_API_KEY ?? "";
const usingZaiFallback = !customLlmApiUrl && !customLlmApiKey && Boolean(zaiApiKey);

export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // OpenAI-compatible chat-completions endpoint (OpenAI, OpenRouter, Gemini,
  // a local gateway, etc.). Leave blank to fall back to deterministic text —
  // unless ZAI_API_KEY is set, which lights the same features up via Z.AI.
  llmApiUrl: customLlmApiUrl || (usingZaiFallback ? "https://api.z.ai/api/paas/v4" : ""),
  llmApiKey: customLlmApiKey || (usingZaiFallback ? zaiApiKey : ""),
  // glm-4.5-flash is Z.AI's free tier and works without account balance
  // (verified live); set LLM_MODEL=glm-4.7 / glm-5.1 after adding credit.
  llmModel: process.env.LLM_MODEL || (usingZaiFallback ? "glm-4.5-flash" : ""),
  // GLM (Z.AI) supports response_format `json_object` but not `json_schema`;
  // when false, the LLM client downgrades schemas into a prompt instruction.
  // Set LLM_JSON_SCHEMA=on to force native schema mode on the Z.AI path.
  llmJsonSchemaSupported: !usingZaiFallback || process.env.LLM_JSON_SCHEMA === "on",
  // Shared secret guarding the Vercel Cron monitor endpoint.
  cronSecret: process.env.CRON_SECRET ?? "",

  // --- Optional real-data services (every feature degrades gracefully) ----
  // Pinecone vector index for semantic listing search / similarity.
  pineconeApiKey: process.env.PINECONE_API_KEY ?? "",
  // Cloudinary delivery (cloudinary://key:secret@cloud_name). The runtime only
  // derives the public cloud name from it; uploads happen in the sync script.
  cloudinaryUrl: process.env.CLOUDINARY_URL ?? "",
  // Mapbox public (pk.) token — served to the browser for the /map page and
  // used server-side for geocoding unknown buyer ZIPs.
  mapboxToken: process.env.MAPBOX_TOKEN ?? "",
  // Brave Search API (metered) — live market scan + model web intel.
  braveSearchApiKey: process.env.BRAVE_SEARCH_API_KEY ?? "",
};

/**
 * Which optional cloud services are live. Booleans only — safe to expose to
 * the client (config.public) so the UI can show/hide service-backed panels.
 */
export const SERVICES = {
  /** LLM: advisor chat, match narratives, intent parsing, contact drafts. */
  ai: Boolean(ENV.llmApiUrl && ENV.llmApiKey),
  /** Pinecone: semantic search blend, similar vehicles, advisor recall. */
  vector: Boolean(ENV.pineconeApiKey),
  /** Cloudinary: optimized CDN delivery for listing photos. */
  images: Boolean(ENV.cloudinaryUrl),
  /** Mapbox: /map explorer + buyer-ZIP geocoding. */
  map: Boolean(ENV.mapboxToken),
  /** Brave Search: live market scan + "from the web" intel. */
  websearch: Boolean(ENV.braveSearchApiKey),
};
