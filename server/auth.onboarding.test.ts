import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// Mock only the onboarding helper; everything else in ./db stays real so the
// rest of the router keeps working in other tests within this file's registry.
vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  updateUserOnboarding: vi.fn(),
}));

import { appRouter } from "./routers";
import { updateUserOnboarding } from "./db";

const updateMock = vi.mocked(updateUserOnboarding);

function baseUser(overrides: Partial<User>): User {
  return {
    id: 42,
    openId: "real_user_1",
    name: "Real User",
    email: "real@example.com",
    loginMethod: "oauth",
    role: "user",
    onboarding: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function ctxFor(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => {
  updateMock.mockReset();
});

describe("auth.setOnboarding", () => {
  it("rejects anonymous callers", async () => {
    const caller = appRouter.createCaller(ctxFor(null));
    await expect(
      caller.auth.setOnboarding({ status: "completed", variant: "quick" }),
    ).rejects.toThrow();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("persists the state shape for a real account", async () => {
    updateMock.mockResolvedValue(true);
    const caller = appRouter.createCaller(ctxFor(baseUser({})));
    const r = await caller.auth.setOnboarding({ status: "completed", variant: "full" });
    expect(r.persisted).toBe(true);
    expect(updateMock).toHaveBeenCalledTimes(1);
    const [userId, state] = updateMock.mock.calls[0];
    expect(userId).toBe(42);
    expect(state.status).toBe("completed");
    expect(state.variant).toBe("full");
    expect(Number.isNaN(Date.parse(state.at))).toBe(false); // ISO timestamp
  });

  it("reports persisted:false when the database is unavailable", async () => {
    updateMock.mockResolvedValue(false); // the helper's DB-null guard
    const caller = appRouter.createCaller(ctxFor(baseUser({})));
    const r = await caller.auth.setOnboarding({ status: "dismissed", variant: "quick" });
    expect(r.persisted).toBe(false);
  });

  it("never persists for the shared demo account", async () => {
    const caller = appRouter.createCaller(
      ctxFor(baseUser({ id: 7, openId: "demo_admin", loginMethod: "demo" })),
    );
    const r = await caller.auth.setOnboarding({ status: "completed", variant: "quick" });
    expect(r.persisted).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects invalid status values", async () => {
    const caller = appRouter.createCaller(ctxFor(baseUser({})));
    await expect(
      caller.auth.setOnboarding({
        status: "skipped" as never,
        variant: "quick",
      }),
    ).rejects.toThrow();
  });
});
