import { NonRetriableError } from "inngest";

import {
  generatePitchDeck,
  PitchDeckGenerationError,
} from "@/lib/agents/generate-pitch-deck";
import { prisma } from "@/lib/db";
import { DeckStatus } from "@/lib/generated/prisma/client";
import { uploadSlideImage } from "@/lib/imagekit";
import { inngest } from "@/lib/inngest/client";
import { generateSlideImage } from "@/lib/openai";

/**
 * Background job: turn a project idea into a full pitch deck with images.
 *
 * Triggered by the "deck/generate" event (sent from the API in Phase 6).
 * Each step.run() is a separate retryable step visible in the Inngest dev UI.
 */
export const generateDeck = inngest.createFunction(
  {
    id: "generate-deck",
    triggers: [{ event: "deck/generate" }],
  },
  async ({ event, step }) => {
    const { deckId } = event.data;

    // Step 1 — load the deck from the database
    const deck = await step.run("load-deck", async () => {
      const record = await prisma.deck.findUnique({ where: { id: deckId } });

      if (!record) {
        throw new NonRetriableError(`Deck not found: ${deckId}`);
      }

      return record;
    });

    try {
      // Step 2 — tell the UI we are generating
      await step.run("mark-generating", async () => {
        await prisma.deck.update({
          where: { id: deckId },
          data: { status: DeckStatus.GENERATING },
        });
      });

      // Step 3 — run the AI agent (guardrails + structured output)
      const pitchDeck = await step.run("run-agent", async () => {
        return generatePitchDeck(deck.idea);
      });

      // Step 4 — save the generated title
      await step.run("save-title", async () => {
        await prisma.deck.update({
          where: { id: deckId },
          data: { title: pitchDeck.deckTitle },
        });
      });

      // Step 5 — for each slide: generate image → upload to ImageKit → save to DB
      for (let index = 0; index < pitchDeck.slides.length; index++) {
        const slide = pitchDeck.slides[index];
        const order = index + 1;

        const imageUrl = await step.run(`image-${order}`, async () => {
          const imageBuffer = await generateSlideImage(slide.imagePrompt);
          const fileName = `deck-${deckId}-slide-${order}.png`;
          return uploadSlideImage(imageBuffer, fileName);
        });

        await step.run(`save-slide-${order}`, async () => {
          await prisma.slide.create({
            data: {
              deckId,
              order,
              title: slide.title,
              content: slide.content,
              imagePrompt: slide.imagePrompt,
              imageUrl,
            },
          });
        });
      }

      // Step 6 — done!
      await step.run("mark-complete", async () => {
        await prisma.deck.update({
          where: { id: deckId },
          data: { status: DeckStatus.COMPLETE },
        });
      });

      return { deckId, slideCount: pitchDeck.slides.length };
    } catch (error) {
      const message =
        error instanceof PitchDeckGenerationError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error during deck generation";

      await step.run("mark-failed", async () => {
        await prisma.deck.update({
          where: { id: deckId },
          data: {
            status: DeckStatus.FAILED,
            errorMessage: message,
          },
        });
      });

      // Don't retry guardrail failures or missing decks — they won't succeed on retry
      if (
        error instanceof PitchDeckGenerationError ||
        error instanceof NonRetriableError
      ) {
        throw new NonRetriableError(message);
      }

      throw error;
    }
  },
);
