import type { VercelRequest, VercelResponse } from "@vercel/node";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../routers";
import { createContext } from "../_core/context";

/**
 * Source for the Vercel serverless tRPC entry. This file is BUNDLED by esbuild
 * into `api/trpc/[trpc].js` (see scripts/build-functions.mjs) so that all
 * relative/server imports are resolved at build time — Node's production ESM
 * loader does not support directory or extensionless imports. The same
 * `appRouter` + `createContext` also run under the local Express dev server.
 */

/** Derive the tRPC procedure path from Vercel's query, falling back to the URL. */
function getTrpcPath(req: VercelRequest): string {
  const raw = (req.query as Record<string, string | string[] | undefined>)?.trpc;
  if (raw) return Array.isArray(raw) ? raw.join("/") : raw;
  const url = req.url ?? "";
  return url.split("?")[0].replace(/^\/api\/trpc\/?/, "");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await nodeHTTPRequestHandler({
      router: appRouter,
      createContext,
      req,
      res,
      path: getTrpcPath(req),
      onError({ error, path }) {
        console.error(`[tRPC] error on '${path ?? "<no-path>"}':`, error);
      },
    });
  } catch (error) {
    // tRPC normally formats errors as JSON itself; this guards the rare case
    // where the handler throws before responding, so the client still receives
    // parseable JSON instead of a plain-text "A server error has occurred".
    console.error("[tRPC] unhandled handler error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          error: {
            message: "Internal server error",
            code: -32603,
            data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
          },
        }),
      );
    }
  }
}
