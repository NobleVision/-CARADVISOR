import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { serialize as serializeCookie } from "cookie";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

/**
 * Minimal request/response shapes shared by the Express dev server and Vercel's
 * Node serverless functions. Both expose Node-compatible `headers` (read) and
 * `setHeader`/`getHeader` (write), so a single context factory serves both.
 */
type ReqLike = {
  headers: Record<string, string | string[] | undefined>;
};
type ResLike = {
  setHeader(name: string, value: string | string[]): void;
  getHeader(name: string): number | string | string[] | undefined;
};

export type CreateContextOptions = { req: ReqLike; res: ResLike };

export type TrpcContext = {
  user: User | null;
  /** Set the session cookie on the response (used by demo login). */
  setSessionCookie: (token: string) => void;
  /** Clear the session cookie (used by logout). */
  clearSessionCookie: () => void;
};

function headerValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v.join("; ") : v;
}

function isSecureRequest(req: ReqLike): boolean {
  const xfp = headerValue(req.headers["x-forwarded-proto"]);
  if (!xfp) return false;
  return xfp.split(",").some((p) => p.trim().toLowerCase() === "https");
}

/** Append a Set-Cookie value without clobbering any already on the response. */
function appendSetCookie(res: ResLike, cookieStr: string) {
  const prev = res.getHeader("Set-Cookie");
  const arr = !prev
    ? []
    : Array.isArray(prev)
      ? prev.map(String)
      : [String(prev)];
  arr.push(cookieStr);
  res.setHeader("Set-Cookie", arr);
}

export async function createContext({
  req,
  res,
}: CreateContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    user = await sdk.authenticateByCookieHeader(headerValue(req.headers.cookie));
  } catch {
    // Authentication is optional for public procedures.
    user = null;
  }

  const baseOpts = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: isSecureRequest(req),
  };

  return {
    user,
    setSessionCookie: (token: string) => {
      appendSetCookie(
        res,
        serializeCookie(COOKIE_NAME, token, {
          ...baseOpts,
          maxAge: Math.floor(ONE_YEAR_MS / 1000),
        })
      );
    },
    clearSessionCookie: () => {
      appendSetCookie(
        res,
        serializeCookie(COOKIE_NAME, "", {
          ...baseOpts,
          maxAge: 0,
          expires: new Date(0),
        })
      );
    },
  };
}
