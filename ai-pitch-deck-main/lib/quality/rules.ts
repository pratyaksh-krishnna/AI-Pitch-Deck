import { RUBRIC_CRITERIA, type RubricCriterion, type SlideReview } from "@/lib/schemas/slide-review";

export const PASSING_SCORE = 8;
export const REVISION_LIMIT = 3;

export type Decision = "accept" | "revise" | "flag";

export function clampRating(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(10, Math.max(1, Math.round(n)));
}

export type ScoringOptions = {
  /** The image is a random dev placeholder (USE_PLACEHOLDER_IMAGES), so imageFit says nothing (ruling R9). */
  placeholderImage?: boolean;
};

/** The Rubric criteria that count: all five, or all but imageFit for a placeholder image. */
export function scoredCriteria({ placeholderImage = false }: ScoringOptions = {}): readonly RubricCriterion[] {
  return placeholderImage ? RUBRIC_CRITERIA.filter((c) => c !== "imageFit") : RUBRIC_CRITERIA;
}

/** Slide Score = the weakest Rubric criterion that counts. */
export function slideScore(review: SlideReview, options: ScoringOptions = {}): number {
  return Math.min(...scoredCriteria(options).map((c) => clampRating(review[c].score)));
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

export function builderFeedback(input: { review: SlideReview | null; lintErrors: string[] } & ScoringOptions): string[] {
  const lint = input.lintErrors.map((e) => `Fix HyperFrames lint error — ${e}`);
  const rubric = input.review
    ? scoredCriteria(input).filter((c) => clampRating(input.review![c].score) < PASSING_SCORE).map(
        (c) => `${c} (${clampRating(input.review![c].score)}/10): ${input.review![c].fix}`,
      )
    : [];
  return [...lint, ...rubric];
}
