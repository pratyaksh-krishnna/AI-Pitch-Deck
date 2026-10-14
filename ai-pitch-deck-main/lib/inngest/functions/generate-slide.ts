import { NonRetriableError } from "inngest";

import { reviewSlide } from "@/lib/agents/feedback-agent";
import { generateSlideImage, placeholderImagesEnabled } from "@/lib/agents/image-agent";
import { buildSlide, reviseSlide } from "@/lib/agents/slide-builder";
import { slideVersionUpsertArgs } from "@/lib/deck/persistence";
import { sectionById, sceneIdFor, type SectionId } from "@/lib/deck/sections";
import { slideContextFor } from "@/lib/deck/slide-context";
import { recordUsage } from "@/lib/deck/usage";
import { failedUpdate, idFromFailureEvent } from "@/lib/deck/workflow-failure";
import { prisma } from "@/lib/db";
import { assembleDeckHtml, AssemblyError, REST_OFFSET_SECONDS } from "@/lib/hyperframes/assemble-deck";
import { lintDeckHtml } from "@/lib/hyperframes/lint";
import { uploadSlideImage } from "@/lib/imagekit";
import { inngest } from "@/lib/inngest/client";
import { nonRetriable } from "@/lib/inngest/non-retriable";
import { runSlideLoop, type Inspection } from "@/lib/quality/run-slide-loop";
import { slideScore } from "@/lib/quality/rules";
import { screenshotScene } from "@/lib/render/screenshot";
import { StoredOutlineSchema } from "@/lib/schemas/deck-plan";

/**
 * One Slide's build → image → inspect → revise loop. Setup (load-slide, outline, context)
 * runs outside runSlideLoop's own FAILED handling, so onFailure covers every failure.
 */
export const generateSlide = inngest.createFunction(
  {
    id: "generate-slide",
    triggers: [{ event: "slide/generate" }],
    onFailure: async ({ event, error, step }) => {
      const slideId = idFromFailureEvent(event, "slideId");
      if (!slideId) return;
      await step.run("mark-slide-failed", async () => {
        await prisma.slide.updateMany({ where: { id: slideId }, data: failedUpdate(error, "Could not generate this slide.") });
      });
    },
  },
  async ({ event, step }) => {
    const { slideId } = event.data;

    const { slide, deck } = await step.run("load-slide", async () => {
      const record = await prisma.slide.findUnique({ where: { id: slideId }, include: { deck: { include: { slides: { orderBy: { order: "asc" } } } } } });
      if (!record) throw new NonRetriableError(`Slide not found: ${slideId}`);
      return { slide: record, deck: record.deck };
    });

    const outline = StoredOutlineSchema.parse(deck.slides.map((s) => ({ sectionId: s.sectionId, keyMessage: s.keyMessage })));
    const ctx = slideContextFor(deck, slide, outline);
    const sceneId = sceneIdFor(slide.order, slide.sectionId as SectionId);
    // Read once here and passed down, so scoring and feedback agree with the Image Agent (ruling R9).
    const placeholderImage = placeholderImagesEnabled();

    return runSlideLoop({
      placeholderImage,

      build: () => step.run("build", () => nonRetriable(async () => {
        const result = await buildSlide(ctx);
        await recordUsage(deck.id, "slide-builder", result.usage);
        return result.output;
      })),

      revise: (round, previous, feedback) => step.run(`revise-${round}`, () => nonRetriable(async () => {
        const result = await reviseSlide(ctx, previous, feedback);
        await recordUsage(deck.id, "slide-builder", result.usage);
        return result.output;
      })),

      makeImage: (round, prompt, aspect) => step.run(`image-${round}`, async () => {
        const { buffer, usage } = await generateSlideImage(prompt, aspect);
        await recordUsage(deck.id, "image-agent", usage);
        return uploadSlideImage(buffer, `deck-${deck.id}-slide-${slide.order}-r${round}.png`);
      }),

      // Renders untrusted model output (markup, CSS, animation JS) in server-side Chromium.
      // Safety relies on lib/render/screenshot.ts: per-call context, network allowlist
      // (GSAP CDN + ik.imagekit.io only) and a hard deadline. No other server-side path
      // fetches a URL derived from model output (images come from our own upload).
      inspect: (round, draft, imageUrl) => step.run(`inspect-${round}`, async (): Promise<Inspection> => {
        let html: string;
        try {
          html = assembleDeckHtml(ctx.theme, [{ sceneId, label: sectionById(ctx.sectionId).label, draft, imageUrl }]);
        } catch (error) {
          if (error instanceof AssemblyError) return { lintErrors: [`assembly: ${error.message}`], review: null, score: null };
          throw error;
        }
        const { errors } = await lintDeckHtml(html);
        if (errors.length > 0) return { lintErrors: errors, review: null, score: null };

        const screenshot = await screenshotScene(html, sceneId, REST_OFFSET_SECONDS);
        const result = await reviewSlide({
          idea: ctx.idea, sectionId: ctx.sectionId, keyMessage: ctx.keyMessage, theme: ctx.theme, draft, screenshot, placeholderImage,
        });
        await recordUsage(deck.id, "feedback-agent", result.usage);
        return { lintErrors: [], review: result.output, score: slideScore(result.output, { placeholderImage }) };
      }),

      // step.run resolves a void callback to null (JSON), so await it to keep Promise<void>.
      saveVersion: async (v) => {
        await step.run(`save-version-${v.round}`, async () => {
          await prisma.slideVersion.upsert(slideVersionUpsertArgs({ slideId, ...v }));
        });
      },

      setStatus: async (status, round, errorMessage) => {
        await step.run(`status-${status.toLowerCase()}-${round}`, async () => {
          await prisma.slide.update({ where: { id: slideId }, data: { status, round, errorMessage: errorMessage ?? null } });
        });
      },
    });
  },
);
