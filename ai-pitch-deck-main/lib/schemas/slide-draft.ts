import { z } from "zod";

export const ImageAspectSchema = z.enum(["landscape", "portrait", "square"]);
export type ImageAspect = z.infer<typeof ImageAspectSchema>;

/** What the Slide Builder returns for one Slide (position-independent). */
export const SlideDraftSchema = z.object({
  headline: z.string().min(8).max(140),
  body: z.array(z.string().min(2).max(180)).max(4),
  speakerNotes: z.string().max(800),
  imagePrompt: z.string().min(10).max(500),
  imageAspect: ImageAspectSchema,
  /** Inner HTML of the 1920×1080 stage. Ids prefixed with the scene id. No <script>. */
  markup: z.string().min(20).max(15000),
  /** CSS; every selector starts with #<sceneId>. */
  css: z.string().max(15000),
  /** Body of a function(tl, t0) adding GSAP tweens at t0 + offset. */
  animation: z.string().max(8000),
});

export type SlideDraft = z.infer<typeof SlideDraftSchema>;
