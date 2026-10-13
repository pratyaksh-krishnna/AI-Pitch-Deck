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

export type AgentUsage = { model: string; inputTokens: number; outputTokens: number; imageCount: number };
export type AgentResult<T> = { output: T; usage: AgentUsage };
