export class AgentRefusalError extends Error {
  constructor(agent: string, category: string | null) {
    super(`${agent} declined this request${category ? ` (${category})` : ""}. Try rephrasing the idea.`);
    this.name = "AgentRefusalError";
  }
}

export class AgentOutputError extends Error {
  constructor(agent: string, detail: string) {
    super(`${agent} returned output that did not match the expected format: ${detail}`);
    this.name = "AgentOutputError";
  }
}

/** The model hit its output limit before finishing; the same prompt would hit it again. */
export class AgentTruncatedError extends AgentOutputError {
  constructor(agent: string, what: string) {
    super(agent, `${what} was too long to finish`);
    this.message = `${agent} could not finish: ${what} was too long to finish. Try a shorter idea.`;
    this.name = "AgentTruncatedError";
  }
}

export type AgentUsage = { model: string; inputTokens: number; outputTokens: number; imageCount: number };
export type AgentResult<T> = { output: T; usage: AgentUsage };
