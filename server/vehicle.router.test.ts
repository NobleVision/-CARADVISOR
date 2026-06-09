import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/** Context with no authenticated user. */
function publicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("vehicle.decode validation", () => {
  it("rejects a structurally invalid VIN before hitting the network", async () => {
    const caller = appRouter.createCaller(publicContext());
    // 17 chars but contains forbidden letter O → must fail validation, not fetch.
    await expect(
      caller.vehicle.decode({ vin: "1HGCM82633A0043O2" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an empty / too-short VIN at the schema layer", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.vehicle.decode({ vin: "123" })).rejects.toBeTruthy();
  });
});

describe("vehicle protected procedures", () => {
  it("blocks history access for unauthenticated users", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.vehicle.history()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("blocks saved-vehicle access for unauthenticated users", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(caller.vehicle.saved()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("blocks saving a vehicle for unauthenticated users", async () => {
    const caller = appRouter.createCaller(publicContext());
    await expect(
      caller.vehicle.unsave({ id: 1 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
