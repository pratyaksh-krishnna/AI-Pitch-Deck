import { describe, expect, it } from "vitest";

import { DeckPlanSchema } from "@/lib/schemas/deck-plan";
import { DeckThemeSchema } from "@/lib/schemas/deck-theme";
import { validDraft, validTheme } from "@/lib/schemas/fixtures";
import { SlideDraftSchema } from "@/lib/schemas/slide-draft";
import { RUBRIC_CRITERIA, SlideReviewSchema } from "@/lib/schemas/slide-review";

describe("schemas", () => {
  it("accepts a valid theme and rejects non-hex colors", () => {
    expect(DeckThemeSchema.parse(validTheme)).toEqual(validTheme);
    expect(() => DeckThemeSchema.parse({ ...validTheme, accent: "blue" })).toThrow();
  });

  it("accepts a valid slide draft and rejects more than 4 bullets", () => {
    expect(SlideDraftSchema.parse(validDraft).imageAspect).toBe("landscape");
    expect(() => SlideDraftSchema.parse({ ...validDraft, body: ["a1", "b2", "c3", "d4", "e5"] })).toThrow();
  });

  it("requires a rating for every rubric criterion", () => {
    const rating = { score: 8, fix: "" };
    const review = Object.fromEntries(RUBRIC_CRITERIA.map((c) => [c, rating]));
    expect(SlideReviewSchema.parse({ ...review, regenerateImage: false, newImagePrompt: null })).toBeTruthy();
    const missing = Object.fromEntries(RUBRIC_CRITERIA.filter((c) => c !== "imageFit").map((c) => [c, rating]));
    expect(() => SlideReviewSchema.parse({ ...missing, regenerateImage: false, newImagePrompt: null })).toThrow();
  });

  it("requires exactly one outline entry per section", () => {
    const outline = ["title", "problem", "solution", "market", "product", "business-model", "ask"]
      .map((sectionId) => ({ sectionId, keyMessage: "A key message for this slide." }));
    expect(DeckPlanSchema.parse({ deckTitle: "RoomiePay", theme: validTheme, outline }).outline).toHaveLength(7);
    expect(() => DeckPlanSchema.parse({ deckTitle: "RoomiePay", theme: validTheme, outline: outline.slice(1) })).toThrow();
  });
});
