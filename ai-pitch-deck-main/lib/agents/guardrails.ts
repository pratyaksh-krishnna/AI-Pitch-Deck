import { Agent, run, type InputGuardrail, type OutputGuardrail } from "@openai/agents";
import { z } from "zod";

// ---------------------------------------------------------------------------
// INPUT GUARDRAIL — runs BEFORE the agent, blocks bad user input early
// ---------------------------------------------------------------------------

/** Turn agent input (string or message list) into plain text we can check. */
function getInputText(input: string | unknown[]): string {
  if (typeof input === "string") {
    return input;
  }
  return JSON.stringify(input);
}

/**
 * Rejects ideas that are too short to generate a meaningful pitch deck.
 * This is a simple rule-based guardrail — no extra AI call needed.
 */
export const validProjectIdeaGuardrail: InputGuardrail = {
  name: "valid_project_idea",
  execute: async ({ input }) => {
    const text = getInputText(input).trim();
    const tooShort = text.length < 20;

    return {
      tripwireTriggered: tooShort,
      outputInfo: tooShort
        ? { reason: "Project idea must be at least 20 characters." }
        : undefined,
    };
  },
};

// ---------------------------------------------------------------------------
// OUTPUT GUARDRAIL — runs AFTER the agent, checks the generated deck
// ---------------------------------------------------------------------------

/** What the quality-checker agent returns (also uses structured output). */
const QualityCheckSchema = z.object({
  isValid: z.boolean(),
  reason: z.string().optional(),
});

/**
 * A small helper agent that reviews the pitch deck content.
 * We use a separate agent here to show LLM-based output guardrails.
 */
const qualityCheckerAgent = new Agent({
  name: "PitchDeckQualityChecker",
  model: "gpt-4.1-mini",
  instructions: `You review pitch deck JSON for a beginner learning app.

Return isValid: false if ANY of these are true:
- Profanity, hate speech, or violent content
- Placeholder text like "TBD", "lorem ipsum", "[insert here]", "coming soon"
- Slides with empty or meaningless filler content
- Content that is clearly not a business pitch deck

Otherwise return isValid: true.
If invalid, explain why in the reason field.`,
  outputType: QualityCheckSchema as any,
});

/**
 * Sends the generated deck to the checker agent before we save it.
 * If quality fails, the whole run is blocked.
 */
export const pitchDeckQualityGuardrail: OutputGuardrail = {
  name: "pitch_deck_quality",
  execute: async ({ agentOutput }) => {
    const deckJson = JSON.stringify(agentOutput, null, 2);
    const checkResult = await run(qualityCheckerAgent, deckJson);
    const check = QualityCheckSchema.parse(checkResult.finalOutput as unknown);

    const isValid = check.isValid;

    return {
      tripwireTriggered: !isValid,
      outputInfo: isValid ? undefined : { reason: check.reason ?? "Deck failed quality checks." },
    };
  },
};
