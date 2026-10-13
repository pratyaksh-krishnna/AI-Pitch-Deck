import { describe, expect, it } from "vitest";

import {
  builderFeedback, clampRating, decideNext, pickBestVersion, PASSING_SCORE, REVISION_LIMIT, slideScore,
} from "@/lib/quality/rules";
import type { SlideReview } from "@/lib/schemas/slide-review";

const review = (scores: Partial<Record<keyof SlideReview, number>> = {}): SlideReview => ({
  clarity: { score: scores.clarity ?? 9, fix: scores.clarity && scores.clarity < 8 ? "Cut to one idea." : "" },
  persuasiveness: { score: scores.persuasiveness ?? 9, fix: "" },
  visualDesign: { score: scores.visualDesign ?? 9, fix: "" },
  readability: { score: scores.readability ?? 9, fix: scores.readability && scores.readability < 8 ? "Body text is 32px; use 48px." : "" },
  imageFit: { score: scores.imageFit ?? 9, fix: "" },
  regenerateImage: false,
  newImagePrompt: null,
});

describe("constants", () => {
  it("match the agreed quality bar", () => {
    expect(PASSING_SCORE).toBe(8);
    expect(REVISION_LIMIT).toBe(3);
  });
});

describe("slideScore", () => {
  it("is the lowest rubric rating, not the average", () => {
    expect(slideScore(review({ readability: 6 }))).toBe(6);
  });

  it("clamps out-of-range and fractional ratings to integers 1–10", () => {
    expect(clampRating(0)).toBe(1);
    expect(clampRating(11)).toBe(10);
    expect(clampRating(7.6)).toBe(8);
    expect(clampRating(Number.NaN)).toBe(1);
    expect(slideScore(review({ clarity: 11, imageFit: 0 }))).toBe(1);
  });
});

describe("decideNext", () => {
  it("accepts a slide at the passing score with no lint errors", () => {
    expect(decideNext({ score: 8, lintErrors: [], round: 0 })).toBe("accept");
  });

  it("never accepts a slide with lint errors, whatever its score", () => {
    expect(decideNext({ score: 10, lintErrors: ["x: y"], round: 0 })).toBe("revise");
  });

  it("revises below-passing slides until the revision limit, then flags", () => {
    expect(decideNext({ score: 7, lintErrors: [], round: 0 })).toBe("revise");
    expect(decideNext({ score: 7, lintErrors: [], round: REVISION_LIMIT - 1 })).toBe("revise");
    expect(decideNext({ score: 7, lintErrors: [], round: REVISION_LIMIT })).toBe("flag");
    expect(decideNext({ score: null, lintErrors: ["x: y"], round: REVISION_LIMIT })).toBe("flag");
  });
});

describe("pickBestVersion", () => {
  it("picks the highest score, preferring the later round on ties, unscored last", () => {
    const best = pickBestVersion([
      { round: 0, score: 6 }, { round: 1, score: 7 }, { round: 2, score: null }, { round: 3, score: 7 },
    ]);
    expect(best).toEqual({ round: 3, score: 7 });
    expect(pickBestVersion([{ round: 0, score: null }])).toEqual({ round: 0, score: null });
    expect(pickBestVersion([])).toBeNull();
  });
});

describe("builderFeedback", () => {
  it("lists lint errors first, then a fix per criterion below the passing score", () => {
    expect(builderFeedback({ review: review({ clarity: 6, readability: 5 }), lintErrors: ["gsap_css_transform_conflict: …"] }))
      .toEqual([
        "Fix HyperFrames lint error — gsap_css_transform_conflict: …",
        "clarity (6/10): Cut to one idea.",
        "readability (5/10): Body text is 32px; use 48px.",
      ]);
  });
});
