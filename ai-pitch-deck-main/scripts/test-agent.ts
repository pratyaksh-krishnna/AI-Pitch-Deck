/**
 * Manual test script for the pitch deck agent.
 *
 * Usage:
 *   pnpm test:agent "A B2B SaaS for automated invoice reconciliation"
 *   pnpm test:agent "hi"   ← should trigger input guardrail
 */
import "dotenv/config";

import {
  generatePitchDeck,
  PitchDeckGenerationError,
} from "../lib/agents/generate-pitch-deck";

const DEFAULT_IDEA =
  "A B2B SaaS that uses AI to automate invoice reconciliation for mid-size companies";

async function main() {
  const idea = process.argv.slice(2).join(" ") || DEFAULT_IDEA;

  console.log("Testing pitch deck agent\n");
  console.log("Idea:", idea, "\n");

  try {
    const deck = await generatePitchDeck(idea);

    console.log("Success! Generated deck:\n");
    console.log(JSON.stringify(deck, null, 2));
  } catch (error) {
    if (error instanceof PitchDeckGenerationError) {
      console.error("Blocked by guardrail:", error.message);
      process.exit(1);
    }

    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
