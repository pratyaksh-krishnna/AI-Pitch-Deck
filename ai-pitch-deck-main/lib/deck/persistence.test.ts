import { describe, expect, it } from "vitest";

import { slideVersionUpsertArgs } from "@/lib/deck/persistence";
import { validDraft } from "@/lib/schemas/fixtures";

describe("slideVersionUpsertArgs", () => {
  it("upserts on (slideId, round) so a retried step never duplicates a version", () => {
    const args = slideVersionUpsertArgs({
      slideId: "slide_1", round: 2, draft: validDraft, imageUrl: null,
      score: 7, review: null, lintErrors: [],
    });
    expect(args.where).toEqual({ slideId_round: { slideId: "slide_1", round: 2 } });
    expect(args.create).toMatchObject({ slideId: "slide_1", round: 2, score: 7 });
    expect(args.update).toMatchObject({ score: 7 });
  });
});
