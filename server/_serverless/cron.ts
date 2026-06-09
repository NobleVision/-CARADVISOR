import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runMonitor } from "../monitor";
import { ENV } from "../_core/env";

/**
 * Source for the Vercel Cron monitor entry. Bundled by esbuild into
 * `api/cron/monitor.js`. Vercel includes `Authorization: Bearer ${CRON_SECRET}`
 * on scheduled invocations; we reject anything else when a secret is set.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (ENV.cronSecret && req.headers.authorization !== `Bearer ${ENV.cronSecret}`) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  try {
    const result = await runMonitor();
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/monitor] failed:", error);
    res.status(500).json({ ok: false, error: String(error) });
  }
}
