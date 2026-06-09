import type { VercelRequest, VercelResponse } from "@vercel/node";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

/**
 * Vercel serverless entry for the whole tRPC API. The same `appRouter` +
 * `createContext` also runs under the local Express dev server (see
 * server/_core/index.ts). tRPC's node-http adapter reads the already-parsed
 * `req.body` that Vercel provides, so no extra body handling is needed.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.trpc;
  const path = Array.isArray(raw) ? raw.join("/") : (raw ?? "");

  await nodeHTTPRequestHandler({
    router: appRouter,
    createContext,
    req,
    res,
    path,
  });
}
