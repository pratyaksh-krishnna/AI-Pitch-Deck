import { NonRetriableError } from "inngest";
import { describe, expect, it } from "vitest";

import { AgentOutputError, AgentRefusalError, AgentTruncatedError } from "@/lib/agents/agent-errors";
import { nonRetriable } from "@/lib/inngest/non-retriable";

describe("nonRetriable", () => {
  it("passes results through", async () => {
    await expect(nonRetriable(async () => 42)).resolves.toBe(42);
  });

  it("stops Inngest retrying a refusal", async () => {
    const error = await nonRetriable(async () => { throw new AgentRefusalError("Slide Builder", "cyber"); }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NonRetriableError);
    expect((error as Error).message).toBe("Slide Builder declined this request (cyber). Try rephrasing the idea.");
  });

  it("stops Inngest retrying output cut off at max_tokens, keeping the readable message", async () => {
    const error = await nonRetriable(async () => { throw new AgentTruncatedError("Slide Builder", "the slide"); }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NonRetriableError);
    expect((error as Error).message).toContain("the slide was too long to finish");
  });

  it("lets schema misses and other errors retry", async () => {
    const schemaMiss = new AgentOutputError("Slide Builder", "markup: Too big");
    await expect(nonRetriable(async () => { throw schemaMiss; })).rejects.toBe(schemaMiss);
    const network = new Error("socket hang up");
    await expect(nonRetriable(async () => { throw network; })).rejects.toBe(network);
  });
});
