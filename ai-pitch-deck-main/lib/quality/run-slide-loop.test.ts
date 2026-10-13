import { describe, expect, it, vi } from "vitest";

import { runSlideLoop, type Inspection, type SlideLoopDeps } from "@/lib/quality/run-slide-loop";
import { validDraft } from "@/lib/schemas/fixtures";
import type { SlideReview } from "@/lib/schemas/slide-review";

const reviewWith = (score: number, regenerateImage = false): SlideReview => ({
  clarity: { score, fix: score < 8 ? "Tighten the headline." : "" },
  persuasiveness: { score: 9, fix: "" }, visualDesign: { score: 9, fix: "" },
  readability: { score: 9, fix: "" }, imageFit: { score: 9, fix: "" },
  regenerateImage, newImagePrompt: regenerateImage ? "A clearer photo of a rent split app" : null,
});

function makeDeps(inspections: Inspection[]) {
  const queue = [...inspections];
  return {
    build: vi.fn(async () => validDraft),
    revise: vi.fn(async (round: number) => ({ ...validDraft, headline: `Revised headline ${round}` })),
    makeImage: vi.fn(async (round: number) => `https://img/${round}.png`),
    inspect: vi.fn(async () => queue.shift()!),
    saveVersion: vi.fn(async () => {}),
    setStatus: vi.fn(async () => {}),
  } satisfies SlideLoopDeps;
}

const passing: Inspection = { lintErrors: [], review: reviewWith(9), score: 9 };
const failing: Inspection = { lintErrors: [], review: reviewWith(6), score: 6 };

describe("runSlideLoop", () => {
  it("accepts a slide that passes on the first build", async () => {
    const deps = makeDeps([passing]);
    await expect(runSlideLoop(deps)).resolves.toEqual({ outcome: "PASSED", rounds: 0 });
    expect(deps.revise).not.toHaveBeenCalled();
    expect(deps.saveVersion).toHaveBeenCalledTimes(1);
    expect(deps.setStatus).toHaveBeenLastCalledWith("PASSED", 0);
  });

  it("revises with feedback until the slide passes", async () => {
    const deps = makeDeps([failing, passing]);
    await expect(runSlideLoop(deps)).resolves.toEqual({ outcome: "PASSED", rounds: 1 });
    expect(deps.revise).toHaveBeenCalledWith(1, validDraft, ["clarity (6/10): Tighten the headline."]);
    expect(deps.setStatus).toHaveBeenCalledWith("REVISING", 1);
  });

  it("flags after the revision limit with 4 saved versions", async () => {
    const deps = makeDeps([failing, failing, failing, failing]);
    await expect(runSlideLoop(deps)).resolves.toEqual({ outcome: "FLAGGED", rounds: 3 });
    expect(deps.saveVersion).toHaveBeenCalledTimes(4);
    expect(deps.revise).toHaveBeenCalledTimes(3);
    expect(deps.setStatus).toHaveBeenLastCalledWith("FLAGGED", 3);
  });

  it("regenerates the image only when feedback asks, using the suggested prompt", async () => {
    const deps = makeDeps([{ lintErrors: [], review: reviewWith(6, true), score: 6 }, passing]);
    await runSlideLoop(deps);
    expect(deps.makeImage).toHaveBeenNthCalledWith(1, 0, validDraft.imagePrompt, "landscape");
    expect(deps.makeImage).toHaveBeenNthCalledWith(2, 1, "A clearer photo of a rent split app", "landscape");
    expect(deps.inspect).toHaveBeenLastCalledWith(1, expect.anything(), "https://img/1.png");
  });

  it("keeps the previous image when feedback does not ask for a new one", async () => {
    const deps = makeDeps([failing, passing]);
    await runSlideLoop(deps);
    expect(deps.makeImage).toHaveBeenCalledTimes(1);
    expect(deps.inspect).toHaveBeenLastCalledWith(1, expect.anything(), "https://img/0.png");
  });

  it("marks the slide FAILED with the error message when the builder throws", async () => {
    const deps = makeDeps([]);
    deps.build.mockRejectedValueOnce(new Error("Slide Builder refused: cyber"));
    await expect(runSlideLoop(deps)).rejects.toThrow("Slide Builder refused: cyber");
    expect(deps.setStatus).toHaveBeenLastCalledWith("FAILED", 0, "Slide Builder refused: cyber");
  });
});
