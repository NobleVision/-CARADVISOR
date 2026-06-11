import { describe, expect, it } from "vitest";
import type { BraveResult } from "./brave";
import { hostnameOf, marketplaceFor, tagAndRankResults } from "./marketplaces";

const r = (url: string, title = "t"): BraveResult => ({ url, title, description: "" });

describe("marketplaceFor", () => {
  it("matches known marketplaces including subdomains", () => {
    expect(marketplaceFor("https://www.cars.com/shopping/")).toBe("Cars.com");
    expect(marketplaceFor("https://washingtondc.craigslist.org/cto/x.html")).toBe("Craigslist");
    expect(marketplaceFor("https://www.facebook.com/marketplace/item/1")).toBe(
      "Facebook Marketplace",
    );
  });

  it("returns null for general web pages and junk URLs", () => {
    expect(marketplaceFor("https://example.com/cars")).toBeNull();
    expect(marketplaceFor("not a url")).toBeNull();
    // No substring false positives: notcars.com is not cars.com.
    expect(marketplaceFor("https://notcars.com/")).toBeNull();
  });
});

describe("hostnameOf", () => {
  it("lowercases hostnames and rejects junk", () => {
    expect(hostnameOf("https://WWW.AutoTrader.com/x")).toBe("www.autotrader.com");
    expect(hostnameOf("::::")).toBeNull();
  });
});

describe("tagAndRankResults", () => {
  it("puts marketplace listings first while keeping each group's order", () => {
    const out = tagAndRankResults([
      r("https://example.com/blog", "blog"),
      r("https://www.cargurus.com/x", "cg"),
      r("https://another.example.org", "web2"),
      r("https://www.carmax.com/y", "cm"),
    ]);
    expect(out.map((x) => x.title)).toEqual(["cg", "cm", "blog", "web2"]);
    expect(out[0].marketplace).toBe("CarGurus");
    expect(out[2].marketplace).toBeNull();
  });
});
