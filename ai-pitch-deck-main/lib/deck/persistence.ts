import { Prisma } from "@/lib/generated/prisma/client";
import type { SlideDraft } from "@/lib/schemas/slide-draft";
import type { SlideReview } from "@/lib/schemas/slide-review";

export type SaveVersionInput = {
  slideId: string;
  round: number;
  draft: SlideDraft;
  imageUrl: string | null;
  score: number | null;
  review: SlideReview | null;
  lintErrors: string[];
};

export function slideVersionUpsertArgs(input: SaveVersionInput): Prisma.SlideVersionUpsertArgs {
  const data = {
    draft: input.draft as Prisma.InputJsonValue,
    imageUrl: input.imageUrl,
    score: input.score,
    review: input.review === null ? Prisma.JsonNull : (input.review as Prisma.InputJsonValue),
    lintErrors: input.lintErrors as Prisma.InputJsonValue,
  };
  return {
    where: { slideId_round: { slideId: input.slideId, round: input.round } },
    create: { slideId: input.slideId, round: input.round, ...data },
    update: data,
  };
}
