import { describe, expect, it } from "vitest";

import { slideStatusLabel } from "@/lib/deck/slide-status-label";

describe("slideStatusLabel", () => {
  it("describes every state a user can see", () => {
    expect(slideStatusLabel({ status: "PENDING", round: 0, score: null })).toBe("Waiting");
    expect(slideStatusLabel({ status: "BUILDING", round: 0, score: null })).toBe("Building");
    expect(slideStatusLabel({ status: "SCORING", round: 0, score: null })).toBe("Scoring");
    expect(slideStatusLabel({ status: "REVISING", round: 2, score: 6 })).toBe("Revising — round 2 of 3");
    expect(slideStatusLabel({ status: "PASSED", round: 1, score: 9 })).toBe("Passed — 9/10");
    expect(slideStatusLabel({ status: "FLAGGED", round: 3, score: 7 })).toBe("Flagged — best 7/10");
    expect(slideStatusLabel({ status: "FAILED", round: 0, score: null })).toBe("Failed");
  });
});
