import type OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { AgentOutputError, type AgentResult } from "@/lib/agents/agent-errors";
import { sectionById, type SectionId } from "@/lib/deck/sections";
import { getOpenAIClient } from "@/lib/openai";
import { PASSING_SCORE } from "@/lib/quality/rules";
import type { DeckTheme } from "@/lib/schemas/deck-theme";
import type { SlideDraft } from "@/lib/schemas/slide-draft";
import { SlideReviewSchema, type SlideReview } from "@/lib/schemas/slide-review";

export const FEEDBACK_MODEL = "gpt-6-luna";

const INSTRUCTIONS = `You are a demanding pitch-deck reviewer for early-stage investors.
Rate ONE slide on five criteria, each an integer 1–10. ${PASSING_SCORE} means "an investor would not ask for changes".
- clarity: one clear message, graspable in 5 seconds
- persuasiveness: specific, credible, investor-relevant; numbers over buzzwords; bottom-up market math
- visualDesign: hierarchy, spacing, alignment, consistency with the deck theme
- readability: text amount, size (headline 72–96px, body ≥ 48px at 1920×1080), contrast, nothing clipped or overflowing
- imageFit: the image supports the message rather than decorating it
For every criterion below ${PASSING_SCORE}, "fix" must be one concrete instruction the designer can apply (name the element and the change). Leave "fix" empty otherwise.
Set regenerateImage true only if a different image is needed to reach ${PASSING_SCORE} on imageFit, and give newImagePrompt (no text in the image). Otherwise newImagePrompt is null.
Judge what you see in the screenshot; use the HTML only to name elements.`;

export async function reviewSlide(
  input: { sectionId: SectionId; keyMessage: string; theme: DeckTheme; draft: SlideDraft; screenshot: Buffer },
  client?: OpenAI,
): Promise<AgentResult<SlideReview>> {
  const openai = client ?? getOpenAIClient();
  const section = sectionById(input.sectionId);
  const text = `Slide: ${section.label} — ${section.guidance}
Key message it must land: ${input.keyMessage}
Deck theme: ${JSON.stringify(input.theme)}
Headline: ${input.draft.headline}
Body: ${input.draft.body.join(" | ")}
HTML:
${input.draft.markup}`;

  const response = await openai.responses.parse({
    model: FEEDBACK_MODEL,
    input: [
      { role: "system", content: INSTRUCTIONS },
      {
        role: "user",
        content: [
          { type: "input_text", text },
          { type: "input_image", image_url: `data:image/png;base64,${input.screenshot.toString("base64")}`, detail: "high" },
        ],
      },
    ],
    text: { format: zodTextFormat(SlideReviewSchema, "slide_review") },
  });

  const parsed = SlideReviewSchema.safeParse(response.output_parsed);
  if (!parsed.success) throw new AgentOutputError("Feedback Agent", parsed.error.issues[0]?.message ?? "empty output");
  return {
    output: parsed.data,
    usage: {
      model: response.model ?? FEEDBACK_MODEL,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      imageCount: 0,
    },
  };
}
