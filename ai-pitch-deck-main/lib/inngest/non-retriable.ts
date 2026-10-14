import { NonRetriableError } from "inngest";

import { AgentRefusalError, AgentTruncatedError } from "@/lib/agents/agent-errors";
import { AssemblyError } from "@/lib/hyperframes/assemble-deck";

/**
 * Runs a step body and marks the failures a retry cannot fix as non-retriable:
 * refusals (AgentRefusalError), output cut off at max_tokens (AgentTruncatedError — the
 * same prompt would hit the same limit) and deck assembly errors (AssemblyError — same
 * drafts, same error). Every other error, including a schema miss (plain
 * AgentOutputError), is rethrown unchanged so Inngest retries the step.
 */
export function nonRetriable<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error: unknown) => {
    if (error instanceof AgentRefusalError || error instanceof AgentTruncatedError || error instanceof AssemblyError) {
      throw new NonRetriableError(error.message, { cause: error });
    }
    throw error;
  });
}
