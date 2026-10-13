import { sceneIdFor, sectionById, type SectionId } from "@/lib/deck/sections";
import type { Deck, Slide, SlideVersion } from "@/lib/generated/prisma/client";
import { AssemblyError, assembleDeckHtml } from "@/lib/hyperframes/assemble-deck";
import { builderFeedback, pickBestVersion } from "@/lib/quality/rules";
import { DeckThemeSchema } from "@/lib/schemas/deck-theme";
import { SlideDraftSchema, type SlideDraft } from "@/lib/schemas/slide-draft";
import { SlideReviewSchema } from "@/lib/schemas/slide-review";
import type { DeckDetail, SlideStatus } from "@/lib/types/deck";

export type DeckWithSlides = Deck & { slides: (Slide & { versions: SlideVersion[] })[] };

type PreparedSlide = {
  slide: Slide;
  versions: SlideVersion[];
  best: SlideVersion | null;
  draft: SlideDraft | null;
};

function prepare(slide: Slide & { versions: SlideVersion[] }): PreparedSlide {
  const versions = [...slide.versions].sort((a, b) => a.round - b.round);
  const best = pickBestVersion(versions);
  const draft = best ? SlideDraftSchema.safeParse(best.draft) : null;
  return { slide, versions, best, draft: draft?.success ? draft.data : null };
}

/** One-slide documents (each Slide's best version) for the per-slide opaque player. */
function slideDocuments(theme: unknown, slides: PreparedSlide[]): string[] {
  const parsedTheme = DeckThemeSchema.safeParse(theme);
  if (!parsedTheme.success) return [];
  return slides.flatMap(({ slide, best, draft }) => {
    if (!best || !draft) return [];
    const sectionId = slide.sectionId as SectionId;
    try {
      return [assembleDeckHtml(parsedTheme.data, [{
        sceneId: sceneIdFor(slide.order, sectionId),
        label: sectionById(sectionId).label,
        draft,
        imageUrl: best.imageUrl,
      }])];
    } catch (error) {
      if (error instanceof AssemblyError) return [];
      throw error;
    }
  });
}

export function toDeckDetail(record: DeckWithSlides): DeckDetail {
  const slides = [...record.slides].sort((a, b) => a.order - b.order).map(prepare);
  return {
    id: record.id,
    idea: record.idea,
    title: record.title,
    status: record.status,
    errorMessage: record.errorMessage,
    deckHtml: record.deckHtml,
    slideHtml: record.status === "COMPLETE" ? slideDocuments(record.theme, slides) : [],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    slides: slides.map(({ slide, versions, best, draft }) => ({
      id: slide.id,
      order: slide.order,
      sectionId: slide.sectionId,
      sectionLabel: sectionById(slide.sectionId as SectionId).label,
      status: slide.status as SlideStatus,
      round: slide.round,
      score: best?.score ?? null,
      headline: draft?.headline ?? null,
      history: versions.map((v) => {
        const review = SlideReviewSchema.safeParse(v.review);
        const lintErrors = Array.isArray(v.lintErrors) ? (v.lintErrors as string[]) : [];
        return {
          round: v.round,
          score: v.score,
          feedback: builderFeedback({ review: review.success ? review.data : null, lintErrors }),
        };
      }),
    })),
  };
}
