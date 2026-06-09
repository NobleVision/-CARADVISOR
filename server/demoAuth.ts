import { ONE_YEAR_MS } from "@shared/const";
import * as db from "./db";
import { sdk } from "./_core/sdk";

/**
 * Lightweight credential ("demo") login so the app can be tried without any
 * external account. This reuses the exact same JWT session mechanism as the
 * session service (see server/_core/sdk.ts), so a demo session is
 * indistinguishable from a real one to every downstream protected procedure.
 *
 * NOTE: This is a demo-only convenience. Credentials are checked against a
 * small in-code table. For a production multi-tenant auth system you would
 * store salted password hashes in the database and add rate limiting.
 */

export type DemoAccount = {
  username: string;
  password: string;
  openId: string;
  name: string;
  email: string;
  role: "user" | "admin";
};

/** The demo accounts available for credential login. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: "admin",
    password: "admin",
    openId: "demo_admin",
    name: "Demo Admin",
    email: "admin@gogetter.demo",
    role: "admin",
  },
];

export function findDemoAccount(
  username: string,
  password: string,
): DemoAccount | null {
  const normalized = username.trim().toLowerCase();
  const match = DEMO_ACCOUNTS.find(
    (a) => a.username.toLowerCase() === normalized && a.password === password,
  );
  return match ?? null;
}

/**
 * Validate credentials, ensure the backing user row exists, and mint a session
 * token. Returns the signed JWT (to be set as the session cookie) or null when
 * the credentials are invalid.
 */
export async function authenticateDemo(
  username: string,
  password: string,
): Promise<{ token: string; account: DemoAccount } | null> {
  const account = findDemoAccount(username, password);
  if (!account) return null;

  // Make sure the demo user exists / is refreshed in the users table so the
  // standard authenticateRequest() lookup succeeds.
  await db.upsertUser({
    openId: account.openId,
    name: account.name,
    email: account.email,
    loginMethod: "demo",
    role: account.role,
    lastSignedIn: new Date(),
  });

  const token = await sdk.createSessionToken(account.openId, {
    name: account.name,
    expiresInMs: ONE_YEAR_MS,
  });

  return { token, account };
}
