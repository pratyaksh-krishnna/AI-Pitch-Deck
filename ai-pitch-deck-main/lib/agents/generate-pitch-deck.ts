import {
  run,
  InputGuardrailTripwireTriggered,
  OutputGuardrailTripwireTriggered,
} from "@openai/agents";

import { pitchDeckAgent } from "@/lib/agents/pitch-deck-agent";
import { PitchDeckSchema, type PitchDeck } from "@/lib/schemas/pitch-deck";

/**
 * A friendly error when a guardrail blocks generation.
 * Inngest catches this and saves the message on the Deck record.
 */
export class PitchDeckGenerationError extends Error {
  readonly reason?: string;

  constructor(message: string, reason?: string) {
    super(message);
    this.name = "PitchDeckGenerationError";
    this.reason = reason;
  }
}

/** Did a guardrail block the agent? (input or output) */
function isGuardrailError(error: unknown): boolean {
  return (
    error instanceof InputGuardrailTripwireTriggered ||
    error instanceof OutputGuardrailTripwireTriggered
  );
}

/** Read the reason string from a guardrail error, if the guardrail provided one. */
function getGuardrailReason(error: unknown): string {
  if (
    error instanceof InputGuardrailTripwireTriggered ||
    error instanceof OutputGuardrailTripwireTriggered
  ) {
    const info = error.result.output.outputInfo as { reason?: string } | undefined;
    return info?.reason ?? "Pitch deck generation was blocked by a guardrail.";
  }

  return "Pitch deck generation was blocked by a guardrail.";
}

/** Validate the agent's JSON output against our Zod schema. */
function parseAgentOutput(rawOutput: unknown): PitchDeck {
  return PitchDeckSchema.parse(rawOutput);
}

/**
 * Generate a pitch deck from a project idea.
 *
 * What happens inside (you don't call these yourself — the agent does):
 *   1. Input guardrail  → rejects ideas that are too short
 *   2. Agent            → writes slide JSON matching PitchDeckSchema
 *   3. Output guardrail → quality-checks the generated deck
 *
 * @param idea - The user's startup / project description
 * @returns A validated pitch deck with title + slides
 * @throws PitchDeckGenerationError when a guardrail blocks the run
 */
export async function generatePitchDeck(idea: string): Promise<PitchDeck> {
  const trimmedIdea = idea.trim();

  try {
    // Step 1: run the agent (guardrails fire automatically)
    const agentResult = await run(pitchDeckAgent, trimmedIdea);

    // Step 2: validate the JSON shape with Zod
    return parseAgentOutput(agentResult.finalOutput);
  } catch (error) {
    // Guardrail blocked us — throw a readable error
    if (isGuardrailError(error)) {
      const reason = getGuardrailReason(error);
      throw new PitchDeckGenerationError(reason, reason);
    }

    // Something else went wrong (API error, network, etc.) — let it bubble up
    throw error;
  }
}
