import { describe, expect, it } from "vitest";
import { findDemoAccount } from "./demoAuth";

describe("demo credential matching", () => {
  it("accepts the admin/admin demo credentials", () => {
    const account = findDemoAccount("admin", "admin");
    expect(account).not.toBeNull();
    expect(account?.openId).toBe("demo_admin");
    expect(account?.role).toBe("admin");
  });

  it("is case-insensitive on the username", () => {
    expect(findDemoAccount("ADMIN", "admin")).not.toBeNull();
  });

  it("rejects a wrong password", () => {
    expect(findDemoAccount("admin", "wrong")).toBeNull();
  });

  it("rejects an unknown username", () => {
    expect(findDemoAccount("nobody", "admin")).toBeNull();
  });
});
