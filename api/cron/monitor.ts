import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runMonitor } from "../../server/monitor";
import { ENV } from "../../server/_core/env";

/**
 * Vercel Cron entry for the price-drop / new-match monitor. Vercel includes
 * `Authorization: Bearer ${CRON_SECRET}` on scheduled invocations; we reject
 * anything else when a secret is configured. Schedule is set in vercel.json.
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
    res.status(500).json({ ok: false, error: String(error) });
  }
}
