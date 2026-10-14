import { describe, expect, it } from "vitest";

import { slideLimitFrom } from "@/lib/deck/slide-limit";

describe("slideLimitFrom", () => {
  it("parses positive integers", () => {
    expect(slideLimitFrom("2")).toBe(2);
    expect(slideLimitFrom("7")).toBe(7);
  });

  it("trims whitespace", () => {
    expect(slideLimitFrom(" 3 ")).toBe(3);
  });

  it("returns undefined when unset or empty", () => {
    expect(slideLimitFrom(undefined)).toBeUndefined();
    expect(slideLimitFrom("")).toBeUndefined();
    expect(slideLimitFrom("   ")).toBeUndefined();
  });

  it("returns undefined for zero and negatives", () => {
    expect(slideLimitFrom("0")).toBeUndefined();
    expect(slideLimitFrom("-1")).toBeUndefined();
  });

  it("returns undefined for non-integers", () => {
    expect(slideLimitFrom("2.5")).toBeUndefined();
    expect(slideLimitFrom("abc")).toBeUndefined();
    expect(slideLimitFrom("2abc")).toBeUndefined();
  });
});
