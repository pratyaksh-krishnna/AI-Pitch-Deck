import type Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage, BetaUsage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

import {
  AgentOutputError, AgentRefusalError, AgentTruncatedError, type AgentResult, type AgentUsage,
} from "@/lib/agents/agent-errors";
import { getAnthropic } from "@/lib/agents/anthropic";
import type { SectionId } from "@/lib/deck/sections";
import { DeckPlanSchema, type DeckPlan } from "@/lib/schemas/deck-plan";
import type { DeckTheme } from "@/lib/schemas/deck-theme";
import { SlideDraftSchema, type SlideDraft } from "@/lib/schemas/slide-draft";

import { buildPrompt, PLAN_SYSTEM, revisePrompt, SLIDE_SYSTEM } from "./prompts";

export const SLIDE_BUILDER_MODEL = "claude-opus-5-5";
/** Thinking and the JSON answer share this budget; streaming lets it exceed the non-streaming cap. */
export const SLIDE_BUILDER_MAX_TOKENS = 64000;
const AGENT = "Slide Builder";
const BETAS = ["server-side-fallback-2026-07-01"];
/** Sent by the SDK's own .parse() helper; kept so the wire request is unchanged. */
const STRUCTURED_OUTPUTS_BETA = "structured-outputs-2025-12-15";

export type { AgentResult } from "@/lib/agents/agent-errors";

export type SlideContext = {
  idea: string;
  deckTitle: string;
  theme: DeckTheme;
  order: number;
  sectionId: SectionId;
  keyMessage: string;
  outline: DeckPlan["outline"];
};

/** All input Claude read: uncached + written to cache + read from cache (no schema change, ruling R10). */
export function totalInputTokens(usage: Pick<BetaUsage, "input_tokens" | "cache_creation_input_tokens" | "cache_read_input_tokens">): number {
  return (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
}

function usageOf(message: BetaMessage): AgentUsage {
  return {
    model: message.model ?? SLIDE_BUILDER_MODEL,
    inputTokens: totalInputTokens(message.usage),
    outputTokens: message.usage.output_tokens,
    imageCount: 0,
  };
}

function issueText(issue: z.core.$ZodIssue | undefined): string {
  if (!issue) return "empty output";
  return issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message;
}

/**
 * Streams one structured-output call and validates it ourselves. The JSON schema is sent
 * without the SDK's auto-parse, so refusals and max_tokens are classified from stop_reason
 * before any parsing, and a schema miss is a readable AgentOutputError.
 */
async function callClaude<T extends z.ZodType>(
  client: Anthropic, system: string, userText: string, schema: T, what: string,
): Promise<AgentResult<z.infer<T>>> {
  const { type, schema: jsonSchema } = betaZodOutputFormat(schema);
  const message = await client.beta.messages
    .stream(
      {
        model: SLIDE_BUILDER_MODEL,
        max_tokens: SLIDE_BUILDER_MAX_TOKENS,
        betas: BETAS,
        fallbacks: "default",
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userText }],
        output_config: { effort: "high", format: { type, schema: jsonSchema } },
      },
      { headers: { "anthropic-beta": [...BETAS, STRUCTURED_OUTPUTS_BETA].join(",") } },
    )
    .finalMessage();

  if (message.stop_reason === "refusal") {
    throw new AgentRefusalError(AGENT, message.stop_details?.category ?? null);
  }
  if (message.stop_reason === "max_tokens" || message.stop_reason === "model_context_window_exceeded") {
    throw new AgentTruncatedError(AGENT, what);
  }

  const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
  if (!text.trim()) throw new AgentOutputError(AGENT, "empty output");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AgentOutputError(AGENT, "the reply was not valid JSON");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new AgentOutputError(AGENT, issueText(parsed.error.issues[0]));
  return { output: parsed.data, usage: usageOf(message) };
}

export function planDeck(idea: string, client: Anthropic = getAnthropic()): Promise<AgentResult<DeckPlan>> {
  return callClaude(client, PLAN_SYSTEM, `<idea>${idea}</idea>`, DeckPlanSchema, "the deck plan");
}

export function buildSlide(ctx: SlideContext, client: Anthropic = getAnthropic()): Promise<AgentResult<SlideDraft>> {
  return callClaude(client, SLIDE_SYSTEM, buildPrompt(ctx), SlideDraftSchema, "the slide");
}

export function reviseSlide(
  ctx: SlideContext, previous: SlideDraft, feedback: string[], client: Anthropic = getAnthropic(),
): Promise<AgentResult<SlideDraft>> {
  return callClaude(client, SLIDE_SYSTEM, revisePrompt(ctx, previous, feedback), SlideDraftSchema, "the slide");
}
