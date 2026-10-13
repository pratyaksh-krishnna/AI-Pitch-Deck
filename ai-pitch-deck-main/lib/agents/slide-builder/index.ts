import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

import { AgentOutputError, AgentRefusalError, type AgentResult } from "@/lib/agents/agent-errors";
import { getAnthropic } from "@/lib/agents/anthropic";
import type { SectionId } from "@/lib/deck/sections";
import { DeckPlanSchema, type DeckPlan } from "@/lib/schemas/deck-plan";
import type { DeckTheme } from "@/lib/schemas/deck-theme";
import { SlideDraftSchema, type SlideDraft } from "@/lib/schemas/slide-draft";

import { buildPrompt, PLAN_SYSTEM, revisePrompt, SLIDE_SYSTEM } from "./prompts";

export const SLIDE_BUILDER_MODEL = "claude-opus-5-5";
const AGENT = "Slide Builder";

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

async function callClaude<T extends z.ZodType>(
  client: Anthropic, system: string, userText: string, schema: T,
): Promise<AgentResult<z.infer<T>>> {
  const response = await client.beta.messages.parse({
    model: SLIDE_BUILDER_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userText }],
    output_config: { effort: "high", format: betaZodOutputFormat(schema) },
  });

  if (response.stop_reason === "refusal") {
    throw new AgentRefusalError(AGENT, response.stop_details?.category ?? null);
  }
  const parsed = schema.safeParse(response.parsed_output);
  if (!parsed.success) {
    throw new AgentOutputError(AGENT, parsed.error.issues[0]?.message ?? "empty output");
  }
  return {
    output: parsed.data,
    usage: {
      model: response.model ?? SLIDE_BUILDER_MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      imageCount: 0,
    },
  };
}

export function planDeck(idea: string, client: Anthropic = getAnthropic()): Promise<AgentResult<DeckPlan>> {
  return callClaude(client, PLAN_SYSTEM, `<idea>${idea}</idea>`, DeckPlanSchema);
}

export function buildSlide(ctx: SlideContext, client: Anthropic = getAnthropic()): Promise<AgentResult<SlideDraft>> {
  return callClaude(client, SLIDE_SYSTEM, buildPrompt(ctx), SlideDraftSchema);
}

export function reviseSlide(
  ctx: SlideContext, previous: SlideDraft, feedback: string[], client: Anthropic = getAnthropic(),
): Promise<AgentResult<SlideDraft>> {
  return callClaude(client, SLIDE_SYSTEM, revisePrompt(ctx, previous, feedback), SlideDraftSchema);
}
