import { NonRetriableError } from "inngest";

import { AgentRefusalError, AgentTruncatedError } from "@/lib/agents/agent-errors";

/**
 * Runs an agent call and marks the failures a retry cannot fix as non-retriable:
 * refusals (AgentRefusalError) and output cut off at max_tokens (AgentTruncatedError —
 * the same prompt would hit the same limit). Every other error, including a schema miss
 * (plain AgentOutputError), is rethrown unchanged so Inngest retries the step.
 */
export function nonRetriable<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error: unknown) => {
    if (error instanceof AgentRefusalError || error instanceof AgentTruncatedError) {
      throw new NonRetriableError(error.message, { cause: error });
    }
    throw error;
  });
}
