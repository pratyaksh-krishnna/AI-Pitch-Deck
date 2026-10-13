import { NonRetriableError } from "inngest";

import { AgentRefusalError } from "@/lib/agents/agent-errors";
import { planDeck } from "@/lib/agents/slide-builder";
import { sectionById, sceneIdFor, type SectionId } from "@/lib/deck/sections";
import { deckFailureMessage } from "@/lib/deck/slide-context";
import { recordUsage } from "@/lib/deck/usage";
import { prisma } from "@/lib/db";
import { DeckStatus } from "@/lib/generated/prisma/client";
import { assembleDeckHtml } from "@/lib/hyperframes/assemble-deck";
import { inngest } from "@/lib/inngest/client";
import { pickBestVersion } from "@/lib/quality/rules";
import { DeckThemeSchema } from "@/lib/schemas/deck-theme";
import { SlideDraftSchema } from "@/lib/schemas/slide-draft";

import { generateSlide } from "./generate-slide";

/**
 * Orchestrator (ADR 0002): plan → one child workflow per Slide, in parallel → assemble.
 * Every step is retryable and visible in the Inngest dev UI.
 */
export const generateDeck = inngest.createFunction(
  { id: "generate-deck", triggers: [{ event: "deck/generate" }] },
  async ({ event, step }) => {
    const { deckId } = event.data;

    const deck = await step.run("load-deck", async () => {
      const record = await prisma.deck.findUnique({ where: { id: deckId } });
      if (!record) throw new NonRetriableError(`Deck not found: ${deckId}`);
      return record;
    });

    const fail = (message: string) =>
      step.run("mark-failed", async () => {
        await prisma.deck.update({ where: { id: deckId }, data: { status: DeckStatus.FAILED, errorMessage: message } });
      });

    await step.run("mark-generating", async () => {
      await prisma.deck.update({ where: { id: deckId }, data: { status: DeckStatus.GENERATING, errorMessage: null } });
    });

    let slideIds: string[];
    try {
      slideIds = await step.run("plan-deck", async () => {
        const plan = await planDeck(deck.idea).catch((error) => {
          if (error instanceof AgentRefusalError) throw new NonRetriableError(error.message);
          throw error;
        });
        await recordUsage(deckId, "slide-builder", plan.usage);
        return prisma.$transaction(async (tx) => {
          await tx.deck.update({ where: { id: deckId }, data: { title: plan.output.deckTitle, theme: plan.output.theme } });
          await tx.slide.deleteMany({ where: { deckId } });
          const rows = await Promise.all(plan.output.outline.map((item, i) =>
            tx.slide.create({ data: { deckId, order: i + 1, sectionId: item.sectionId, keyMessage: item.keyMessage } })));
          return rows.map((r) => r.id);
        });
      });
    } catch (error) {
      await fail(error instanceof Error ? error.message : "Could not plan the deck");
      throw error;
    }

    const results = await Promise.allSettled(
      slideIds.map((slideId, i) => step.invoke(`slide-${i + 1}`, { function: generateSlide, data: { slideId } })),
    );
    const failure = deckFailureMessage(results);
    if (failure) {
      await fail(failure);
      throw new NonRetriableError(failure);
    }

    await step.run("assemble-deck", async () => {
      const record = await prisma.deck.findUniqueOrThrow({
        where: { id: deckId },
        include: { slides: { orderBy: { order: "asc" }, include: { versions: true } } },
      });
      const theme = DeckThemeSchema.parse(record.theme);
      const scenes = record.slides.map((slide) => {
        const best = pickBestVersion(slide.versions);
        if (!best) throw new Error(`Slide ${slide.order} has no versions`);
        return {
          sceneId: sceneIdFor(slide.order, slide.sectionId as SectionId),
          label: sectionById(slide.sectionId as SectionId).label,
          draft: SlideDraftSchema.parse(best.draft),
          imageUrl: best.imageUrl,
        };
      });
      await prisma.deck.update({
        where: { id: deckId },
        data: { deckHtml: assembleDeckHtml(theme, scenes), status: DeckStatus.COMPLETE },
      });
    });

    return { deckId, slides: slideIds.length };
  },
);
