export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // OpenAI-compatible chat-completions endpoint (OpenAI, OpenRouter, Gemini,
  // a local gateway, etc.). Leave blank to fall back to deterministic text.
  llmApiUrl: process.env.LLM_API_URL ?? "",
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "",
  // Shared secret guarding the Vercel Cron monitor endpoint.
  cronSecret: process.env.CRON_SECRET ?? "",
};
