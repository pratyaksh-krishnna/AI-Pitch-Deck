import { describe, expect, it } from "vitest";

import { toDeckDetail } from "@/lib/deck/to-deck-detail";
import { CreateDeckSchema } from "@/lib/schemas/create-deck";
import { validDraft, validTheme } from "@/lib/schemas/fixtures";

const version = (round: number, score: number | null, fix = "") => ({
  id: `v${round}`, slideId: "sl1", round, draft: { ...validDraft, headline: `Headline r${round}` }, imageUrl: null,
  score, lintErrors: [], createdAt: new Date(0),
  review: score === null ? null : {
    clarity: { score, fix }, persuasiveness: { score: 9, fix: "" }, visualDesign: { score: 9, fix: "" },
    readability: { score: 9, fix: "" }, imageFit: { score: 9, fix: "" }, regenerateImage: false, newImagePrompt: null,
  },
});

const record = {
  id: "d1", idea: "Rent splitting", title: "RoomiePay", status: "COMPLETE", errorMessage: null,
  theme: null, deckHtml: "<html></html>", createdAt: new Date(0), updatedAt: new Date(0),
  slides: [{
    id: "sl1", deckId: "d1", order: 2, sectionId: "problem", keyMessage: "k", status: "FLAGGED", round: 3,
    errorMessage: null, createdAt: new Date(0), updatedAt: new Date(0),
    versions: [version(1, 7, "Cut to one idea."), version(0, 5, "Too wordy."), version(2, null), version(3, 7, "Still two ideas.")],
  }],
} as never;

describe("toDeckDetail", () => {
  it("shows each slide's best version and its score", () => {
    const slide = toDeckDetail(record).slides[0];
    expect(slide).toMatchObject({ sectionLabel: "Problem", status: "FLAGGED", score: 7, headline: "Headline r3" });
  });

  it("lists the revision history in round order with feedback", () => {
    expect(toDeckDetail(record).slides[0].history).toEqual([
      { round: 0, score: 5, feedback: ["clarity (5/10): Too wordy."] },
      { round: 1, score: 7, feedback: ["clarity (7/10): Cut to one idea."] },
      { round: 2, score: null, feedback: [] },
      { round: 3, score: 7, feedback: ["clarity (7/10): Still two ideas."] },
    ]);
  });
});

describe("toDeckDetail slideHtml (per-slide player documents)", () => {
  it("assembles a one-slide document from each slide's best version once the deck is complete", () => {
    const complete = { ...(record as object), theme: validTheme } as never;
    const { slideHtml } = toDeckDetail(complete);
    expect(slideHtml).toHaveLength(1);
    expect(slideHtml[0]).toContain('data-composition-id="s2-problem" data-start="0"');
    expect(slideHtml[0]).toContain('<h1 id="s2-problem-headline">');
  });

  it("is empty while the deck is still generating", () => {
    const generating = { ...(record as object), theme: validTheme, status: "GENERATING" } as never;
    expect(toDeckDetail(generating).slideHtml).toEqual([]);
  });
});

describe("CreateDeckSchema", () => {
  it("trims the idea and enforces 20–2000 characters", () => {
    expect(CreateDeckSchema.parse({ idea: `  ${"a".repeat(25)}  ` }).idea).toHaveLength(25);
    expect(() => CreateDeckSchema.parse({ idea: "too short" })).toThrow();
    expect(() => CreateDeckSchema.parse({ idea: "a".repeat(2001) })).toThrow();
  });
});
