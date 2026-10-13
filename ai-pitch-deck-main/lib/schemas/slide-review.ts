import { z } from "zod";

export const RUBRIC_CRITERIA = [
  "clarity", "persuasiveness", "visualDesign", "readability", "imageFit",
] as const;
export type RubricCriterion = (typeof RUBRIC_CRITERIA)[number];

const RatingSchema = z.object({
  score: z.number(),
  /** One concrete fix; empty string when the rating is 8 or more. */
  fix: z.string(),
});

/** What the Feedback Agent returns. OpenAI strict mode: every field required, nullable instead of optional. */
export const SlideReviewSchema = z.object({
  clarity: RatingSchema,
  persuasiveness: RatingSchema,
  visualDesign: RatingSchema,
  readability: RatingSchema,
  imageFit: RatingSchema,
  regenerateImage: z.boolean(),
  newImagePrompt: z.string().nullable(),
});

export type SlideReview = z.infer<typeof SlideReviewSchema>;
