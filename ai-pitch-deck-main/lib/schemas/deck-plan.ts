import { z } from "zod";

import { SECTION_IDS } from "@/lib/deck/sections";
import { DeckThemeSchema } from "@/lib/schemas/deck-theme";

export const DeckPlanSchema = z.object({
  deckTitle: z.string().min(2).max(100),
  theme: DeckThemeSchema,
  outline: z
    .array(z.object({ sectionId: z.enum(SECTION_IDS), keyMessage: z.string().min(10).max(300) }))
    .length(SECTION_IDS.length)
    .refine((items) => items.every((item, i) => item.sectionId === SECTION_IDS[i]), {
      message: "Outline must list every section once, in deck order",
    }),
});

/** Outline as stored on Slide rows: a non-empty, in-order prefix of the sections (DECK_SLIDE_LIMIT may truncate it). */
export const StoredOutlineSchema = z
  .array(z.object({ sectionId: z.enum(SECTION_IDS), keyMessage: z.string().min(10).max(300) }))
  .min(1)
  .max(SECTION_IDS.length)
  .refine((items) => items.every((item, i) => item.sectionId === SECTION_IDS[i]), {
    message: "Outline must be a prefix of the sections, in deck order",
  });

export type DeckPlan = z.infer<typeof DeckPlanSchema>;
