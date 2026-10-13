import type { SlideContext } from "@/lib/agents/slide-builder";
import { SECTION_IDS, type SectionId } from "@/lib/deck/sections";
import type { DeckPlan } from "@/lib/schemas/deck-plan";
import { DeckThemeSchema } from "@/lib/schemas/deck-theme";

export function slideContextFor(
  deck: { idea: string; title: string | null; theme: unknown },
  slide: { order: number; sectionId: string; keyMessage: string },
  outline: DeckPlan["outline"],
): SlideContext {
  if (!SECTION_IDS.includes(slide.sectionId as SectionId)) throw new Error(`Unknown section: ${slide.sectionId}`);
  return {
    idea: deck.idea,
    deckTitle: deck.title ?? "Untitled",
    theme: DeckThemeSchema.parse(deck.theme),
    order: slide.order,
    sectionId: slide.sectionId as SectionId,
    keyMessage: slide.keyMessage,
    outline,
  };
}

export function deckFailureMessage(results: PromiseSettledResult<unknown>[]): string | null {
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed.length === 0) return null;
  const first = failed[0].reason instanceof Error ? failed[0].reason.message : String(failed[0].reason);
  return `${failed.length} slide${failed.length === 1 ? "" : "s"} could not be generated: ${first}`;
}
