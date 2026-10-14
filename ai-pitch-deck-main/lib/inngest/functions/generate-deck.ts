import { NonRetriableError } from "inngest";

import { AgentRefusalError } from "@/lib/agents/agent-errors";
import { planDeck } from "@/lib/agents/slide-builder";
import { sectionById, sceneIdFor, type SectionId } from "@/lib/deck/sections";
import { deckFailureMessage } from "@/lib/deck/slide-context";
import { recordUsage } from "@/lib/deck/usage";
import { failedUpdate, idFromFailureEvent } from "@/lib/deck/workflow-failure";
import { prisma } from "@/lib/db";
import { DeckStatus } from "@/lib/generated/prisma/client";
import { assembleDeckHtml } from "@/lib/hyperframes/assemble-deck";
import { inngest } from "@/lib/inngest/client";
import { pickBestVersion } from "@/lib/quality/rules";
import { DeckThemeSchema } from "@/lib/schemas/deck-theme";
import { SlideDraftSchema } from "@/lib/schemas/slide-draft";

import { generateSlide } from "./generate-slide";

/** A Slide loop can run 4 Opus builds, screenshots and reviews; never wait on it forever. */
export const SLIDE_INVOKE_TIMEOUT = "2h";

/**
 * Orchestrator (ADR 0002): plan → one child workflow per Slide, in parallel → assemble.
 * Every step is retryable and visible in the Inngest dev UI. Any failure that exhausts
 * retries (including non-retriable ones) ends in onFailure, which marks the Deck FAILED.
 */
export const generateDeck = inngest.createFunction(
  {
    id: "generate-deck",
    triggers: [{ event: "deck/generate" }],
    onFailure: async ({ event, error, step }) => {
      const deckId = idFromFailureEvent(event, "deckId");
      if (!deckId) return;
      await step.run("mark-deck-failed", async () => {
        await prisma.deck.updateMany({ where: { id: deckId }, data: failedUpdate(error, "Could not generate this deck.") });
      });
    },
  },
  async ({ event, step }) => {
    const { deckId } = event.data;

    const deck = await step.run("load-deck", async () => {
      const record = await prisma.deck.findUnique({ where: { id: deckId } });
      if (!record) throw new NonRetriableError(`Deck not found: ${deckId}`);
      return record;
    });

    await step.run("mark-generating", async () => {
      await prisma.deck.update({ where: { id: deckId }, data: { status: DeckStatus.GENERATING, errorMessage: null } });
    });

    const slideIds = await step.run("plan-deck", async () => {
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

    const results = await Promise.allSettled(
      slideIds.map((slideId, i) => step.invoke(`slide-${i + 1}`, { function: generateSlide, data: { slideId }, timeout: SLIDE_INVOKE_TIMEOUT })),
    );
    const failure = deckFailureMessage(results);
    if (failure) throw new NonRetriableError(failure);

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
