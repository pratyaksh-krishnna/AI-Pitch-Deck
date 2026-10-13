import { RUBRIC_CRITERIA, type SlideReview } from "@/lib/schemas/slide-review";

export const PASSING_SCORE = 8;
export const REVISION_LIMIT = 3;

export type Decision = "accept" | "revise" | "flag";

export function clampRating(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(10, Math.max(1, Math.round(n)));
}

/** Slide Score = the weakest Rubric criterion. */
export function slideScore(review: SlideReview): number {
  return Math.min(...RUBRIC_CRITERIA.map((c) => clampRating(review[c].score)));
}

export function decideNext(input: { score: number | null; lintErrors: string[]; round: number }): Decision {
  const passes = input.lintErrors.length === 0 && input.score !== null && input.score >= PASSING_SCORE;
  if (passes) return "accept";
  return input.round >= REVISION_LIMIT ? "flag" : "revise";
}

export function pickBestVersion<T extends { round: number; score: number | null }>(versions: T[]): T | null {
  let best: T | null = null;
  for (const v of versions) {
    if (!best) { best = v; continue; }
    const a = v.score ?? -1;
    const b = best.score ?? -1;
    if (a > b || (a === b && v.round > best.round)) best = v;
  }
  return best;
}

export function builderFeedback(input: { review: SlideReview | null; lintErrors: string[] }): string[] {
  const lint = input.lintErrors.map((e) => `Fix HyperFrames lint error — ${e}`);
  const rubric = input.review
    ? RUBRIC_CRITERIA.filter((c) => clampRating(input.review![c].score) < PASSING_SCORE).map(
        (c) => `${c} (${clampRating(input.review![c].score)}/10): ${input.review![c].fix}`,
      )
    : [];
  return [...lint, ...rubric];
}
