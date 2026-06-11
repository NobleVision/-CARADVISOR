import { afterEach, describe, expect, it, vi } from "vitest";

const { searchRecordsMock, namespaceMock, pineconeCtorMock } = vi.hoisted(() => {
  const searchRecordsMock = vi.fn();
  const namespaceMock = vi.fn(() => ({ searchRecords: searchRecordsMock }));
  const pineconeCtorMock = vi.fn(() => ({
    index: vi.fn(() => ({ namespace: namespaceMock })),
  }));
  return { searchRecordsMock, namespaceMock, pineconeCtorMock };
});

vi.mock("@pinecone-database/pinecone", () => ({ Pinecone: pineconeCtorMock }));

/** pinecone.ts reads ENV at import time → fresh module per scenario. */
async function loadVector(vars: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value);
  return await import("./pinecone");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.resetModules();
  searchRecordsMock.mockReset();
  namespaceMock.mockClear();
  pineconeCtorMock.mockClear();
});

const HITS_RESPONSE = {
  result: {
    hits: [
      { _id: "lst_001", _score: 0.91, fields: {} },
      { _id: "lst_044", _score: 0.83, fields: {} },
    ],
  },
};

describe("semanticSearchListings", () => {
  it("returns null and never loads the SDK when unconfigured", async () => {
    const mod = await loadVector({});
    expect(mod.vectorConfigured()).toBe(false);
    expect(await mod.semanticSearchListings("reliable sedan")).toBeNull();
    expect(pineconeCtorMock).not.toHaveBeenCalled();
  });

  it("maps hits to {id, score} when configured", async () => {
    const mod = await loadVector({ PINECONE_API_KEY: "pc-test" });
    searchRecordsMock.mockResolvedValue(HITS_RESPONSE);
    const hits = await mod.semanticSearchListings("reliable sedan", { topK: 5 });
    expect(hits).toEqual([
      { id: "lst_001", score: 0.91 },
      { id: "lst_044", score: 0.83 },
    ]);
    expect(pineconeCtorMock).toHaveBeenCalledWith({ apiKey: "pc-test" });
    expect(namespaceMock).toHaveBeenCalledWith("listings");
    expect(searchRecordsMock).toHaveBeenCalledWith({
      query: { topK: 5, inputs: { text: "reliable sedan" } },
    });
  });

  it("serves repeat queries from the cache", async () => {
    const mod = await loadVector({ PINECONE_API_KEY: "pc-test" });
    searchRecordsMock.mockResolvedValue(HITS_RESPONSE);
    await mod.semanticSearchListings("reliable sedan");
    await mod.semanticSearchListings("  Reliable SEDAN "); // normalized to same key
    expect(searchRecordsMock).toHaveBeenCalledTimes(1);
  });

  it("returns null on errors and does not cache the failure", async () => {
    const mod = await loadVector({ PINECONE_API_KEY: "pc-test" });
    searchRecordsMock.mockRejectedValueOnce(new Error("boom"));
    expect(await mod.semanticSearchListings("suv")).toBeNull();
    searchRecordsMock.mockResolvedValueOnce(HITS_RESPONSE);
    const second = await mod.semanticSearchListings("suv");
    expect(second).toHaveLength(2);
    expect(searchRecordsMock).toHaveBeenCalledTimes(2);
  });

  it("times out slow searches with null", async () => {
    vi.useFakeTimers();
    const mod = await loadVector({ PINECONE_API_KEY: "pc-test" });
    searchRecordsMock.mockImplementation(() => new Promise(() => {}));
    const pending = mod.semanticSearchListings("never resolves");
    await vi.advanceTimersByTimeAsync(3600);
    expect(await pending).toBeNull();
  });

  it("warms the cache when a timed-out search eventually resolves", async () => {
    const mod = await loadVector({ PINECONE_API_KEY: "pc-test" });
    // Memoize the (mocked) SDK client under real timers first — its dynamic
    // import resolves via real I/O that fake timers can't flush.
    searchRecordsMock.mockResolvedValueOnce(HITS_RESPONSE);
    await mod.semanticSearchListings("warmup");

    vi.useFakeTimers();
    let resolveLate!: (v: unknown) => void;
    searchRecordsMock.mockImplementationOnce(() => new Promise((r) => (resolveLate = r)));
    const first = mod.semanticSearchListings("slow query");
    await vi.advanceTimersByTimeAsync(3600);
    expect(await first).toBeNull(); // timed out
    resolveLate(HITS_RESPONSE); // …but the in-flight search lands later
    await vi.advanceTimersByTimeAsync(0);
    const second = await mod.semanticSearchListings("slow query");
    expect(second).toHaveLength(2); // served from the warmed cache
    expect(searchRecordsMock).toHaveBeenCalledTimes(2); // warmup + slow, no third
  });
});

describe("semanticSearchKnowledge", () => {
  it("queries the knowledge namespace", async () => {
    const mod = await loadVector({ PINECONE_API_KEY: "pc-test" });
    searchRecordsMock.mockResolvedValue({
      result: { hits: [{ _id: "kb_cvt", _score: 0.8, fields: {} }] },
    });
    const hits = await mod.semanticSearchKnowledge("are CVTs reliable?", 2);
    expect(hits).toEqual([{ id: "kb_cvt", score: 0.8 }]);
    expect(namespaceMock).toHaveBeenCalledWith("knowledge");
  });
});
