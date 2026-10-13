import { builderFeedback, decideNext } from "@/lib/quality/rules";
import type { ImageAspect, SlideDraft } from "@/lib/schemas/slide-draft";
import type { SlideReview } from "@/lib/schemas/slide-review";

export type Inspection = { lintErrors: string[]; review: SlideReview | null; score: number | null };

export type SlideLoopStatus = "BUILDING" | "SCORING" | "REVISING" | "PASSED" | "FLAGGED" | "FAILED";

export type SlideLoopDeps = {
  build(): Promise<SlideDraft>;
  revise(round: number, previous: SlideDraft, feedback: string[]): Promise<SlideDraft>;
  makeImage(round: number, prompt: string, aspect: ImageAspect): Promise<string>;
  inspect(round: number, draft: SlideDraft, imageUrl: string): Promise<Inspection>;
  saveVersion(v: { round: number; draft: SlideDraft; imageUrl: string } & Inspection): Promise<void>;
  setStatus(status: SlideLoopStatus, round: number, errorMessage?: string): Promise<void>;
};

export type SlideLoopResult = { outcome: "PASSED" | "FLAGGED"; rounds: number };

export async function runSlideLoop(deps: SlideLoopDeps): Promise<SlideLoopResult> {
  let round = 0;
  try {
    await deps.setStatus("BUILDING", round);
    let draft = await deps.build();
    let imageUrl = await deps.makeImage(round, draft.imagePrompt, draft.imageAspect);

    for (;;) {
      await deps.setStatus("SCORING", round);
      const inspection = await deps.inspect(round, draft, imageUrl);
      await deps.saveVersion({ round, draft, imageUrl, ...inspection });

      const decision = decideNext({ score: inspection.score, lintErrors: inspection.lintErrors, round });
      if (decision === "accept") {
        await deps.setStatus("PASSED", round);
        return { outcome: "PASSED", rounds: round };
      }
      if (decision === "flag") {
        await deps.setStatus("FLAGGED", round);
        return { outcome: "FLAGGED", rounds: round };
      }

      round += 1;
      await deps.setStatus("REVISING", round);
      const previous = draft;
      draft = await deps.revise(round, previous, builderFeedback(inspection));

      const wantsNewImage = inspection.review?.regenerateImage === true || draft.imageAspect !== previous.imageAspect;
      if (wantsNewImage) {
        const prompt = inspection.review?.newImagePrompt ?? draft.imagePrompt;
        imageUrl = await deps.makeImage(round, prompt, draft.imageAspect);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error while generating this slide";
    await deps.setStatus("FAILED", round, message);
    throw error;
  }
}
