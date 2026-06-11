import { describe, expect, it } from "vitest";
import type { ListingPhoto } from "../inventory/types";
import {
  applyManifest,
  cloudNameFromUrl,
  deliveryUrl,
  imagesConfigured,
  type PhotoManifest,
} from "./cloudinary";

const PHOTOS: ListingPhoto[] = [
  { url: "https://cdn.example.com/a.webp", source: "stock", caption: "rep image" },
  { url: "https://cdn.example.com/b.webp", source: "dealer", caption: "seller photo" },
];

const MANIFEST: PhotoManifest = {
  lst_001: [
    { publicId: "gogetter/src/abc123", version: 1765000000, format: "webp" },
    null, // second slot failed to upload — must pass through
  ],
};

describe("cloudNameFromUrl", () => {
  it("extracts the cloud name and never the credentials", () => {
    expect(cloudNameFromUrl("cloudinary://12345:s3cr3t@demo-cloud")).toBe("demo-cloud");
    expect(cloudNameFromUrl("cloudinary://k:s@my_cloud-2")).toBe("my_cloud-2");
  });

  it("returns null for malformed values", () => {
    expect(cloudNameFromUrl("")).toBeNull();
    expect(cloudNameFromUrl("https://res.cloudinary.com/demo")).toBeNull();
    expect(cloudNameFromUrl("cloudinary://missing-at-sign")).toBeNull();
  });
});

describe("deliveryUrl", () => {
  it("builds the versioned, transformed delivery URL", () => {
    const url = deliveryUrl(
      { publicId: "gogetter/src/abc123", version: 1765000000, format: "webp" },
      "f_auto,q_auto,w_1000,c_limit",
      "demo-cloud",
    );
    expect(url).toBe(
      "https://res.cloudinary.com/demo-cloud/image/upload/f_auto,q_auto,w_1000,c_limit/v1765000000/gogetter/src/abc123.webp",
    );
  });

  it("returns null without an entry or a cloud name", () => {
    expect(deliveryUrl(null, "t", "demo-cloud")).toBeNull();
    expect(
      deliveryUrl({ publicId: "x", version: 1, format: "webp" }, "t", null),
    ).toBeNull();
  });
});

describe("applyManifest", () => {
  it("swaps only the slots with uploaded assets, preserving provenance", () => {
    const out = applyManifest("lst_001", PHOTOS, MANIFEST, "demo-cloud");
    expect(out[0].url).toContain("res.cloudinary.com/demo-cloud");
    expect(out[0].url).toContain("gogetter/src/abc123.webp");
    expect(out[0].source).toBe("stock");
    expect(out[0].caption).toBe("rep image");
    // Failed slot passes through untouched.
    expect(out[1]).toEqual(PHOTOS[1]);
  });

  it("passes everything through when the listing has no manifest entry", () => {
    const out = applyManifest("lst_999", PHOTOS, MANIFEST, "demo-cloud");
    expect(out).toEqual(PHOTOS);
  });

  it("passes everything through when Cloudinary is unconfigured", () => {
    const out = applyManifest("lst_001", PHOTOS, MANIFEST, null);
    expect(out).toBe(PHOTOS);
  });

  it("is unconfigured under the hermetic test env", () => {
    // CLOUDINARY_URL is blanked by vitest.config.ts — the runtime default
    // path must be the passthrough.
    expect(imagesConfigured()).toBe(false);
  });
});
