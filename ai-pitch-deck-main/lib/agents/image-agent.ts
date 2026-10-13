import type OpenAI from "openai";

import type { AgentUsage } from "@/lib/agents/agent-errors";
import { getOpenAIClient } from "@/lib/openai";
import type { ImageAspect } from "@/lib/schemas/slide-draft";

export const IMAGE_MODEL = "gpt-image-2";

const SIZES = { landscape: "1536x1024", portrait: "1024x1536", square: "1024x1024" } as const;

export function sizeForAspect(aspect: ImageAspect): (typeof SIZES)[ImageAspect] {
  return SIZES[aspect];
}

/** Dev shortcut: a free stock photo of the same shape. Enable with USE_PLACEHOLDER_IMAGES=true. */
async function placeholder(aspect: ImageAspect): Promise<Buffer> {
  const [w, h] = sizeForAspect(aspect).split("x");
  const response = await fetch(`https://picsum.photos/${w}/${h}`);
  if (!response.ok) throw new Error("Could not download placeholder image");
  return Buffer.from(await response.arrayBuffer());
}

export async function generateSlideImage(
  prompt: string, aspect: ImageAspect, client?: OpenAI,
): Promise<{ buffer: Buffer; usage: AgentUsage }> {
  if (process.env.USE_PLACEHOLDER_IMAGES === "true") {
    return { buffer: await placeholder(aspect), usage: { model: "placeholder", inputTokens: 0, outputTokens: 0, imageCount: 0 } };
  }

  const openai = client ?? getOpenAIClient();
  const response = await openai.images.generate({ model: IMAGE_MODEL, prompt, n: 1, size: sizeForAspect(aspect) });
  const base64 = response.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI returned no image — check your API credits or try again");
  return {
    buffer: Buffer.from(base64, "base64"),
    usage: { model: IMAGE_MODEL, inputTokens: 0, outputTokens: 0, imageCount: 1 },
  };
}
