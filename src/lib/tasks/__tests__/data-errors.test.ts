import { describeDataError, isNetworkFailure } from "@/lib/tasks/data-errors";

describe("isNetworkFailure", () => {
  it("is false when there is no error", () => {
    expect(isNetworkFailure({ status: 200, error: null })).toBe(false);
  });

  it("is true for status 0, which no HTTP reply can produce", () => {
    expect(isNetworkFailure({ status: 0, error: { message: "anything" } })).toBe(true);
  });

  it("recognises React Native's own wording", () => {
    // This is the one that matters for the port: RN's fetch rejects with
    // "Network request failed", not the browser phrasings.
    expect(isNetworkFailure({ status: 500, error: { message: "Network request failed" } })).toBe(true);
  });

  it("recognises the browser phrasings the web build relied on", () => {
    for (const message of ["Failed to fetch", "NetworkError when attempting to fetch", "Load failed"]) {
      expect(isNetworkFailure({ status: 500, error: { message } })).toBe(true);
    }
  });

  it("is false for an error the database actually returned", () => {
    // A refused write must fail loudly rather than queue to the outbox.
    expect(isNetworkFailure({ status: 400, error: { message: "duplicate key value" } })).toBe(false);
  });
});

describe("describeDataError", () => {
  const describe_ = (over: Record<string, unknown>) =>
    describeDataError({ message: "", details: "", hint: "", code: "", ...over } as never);

  it("maps a missing migration to an actionable sentence", () => {
    expect(describe_({ code: "42703" })).toMatch(/migration/i);
    expect(describe_({ code: "PGRST204" })).toMatch(/migration/i);
  });

  it("maps a vanished or unowned row", () => {
    expect(describe_({ code: "PGRST116" })).toMatch(/no longer exists/i);
    expect(describe_({ code: "23503" })).toMatch(/no longer exists/i);
  });

  it("maps a uniqueness violation", () => {
    expect(describe_({ code: "23505" })).toMatch(/already exists/i);
  });

  it("never leaks a raw database message", () => {
    const message = describe_({ code: "XX000", message: "PANIC: internal detail" });
    expect(message).not.toMatch(/PANIC/);
  });
});
