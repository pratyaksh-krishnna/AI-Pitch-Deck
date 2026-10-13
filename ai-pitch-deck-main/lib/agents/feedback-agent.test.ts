import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import { AgentOutputError } from "@/lib/agents/agent-errors";
import { FEEDBACK_MODEL, reviewSlide } from "@/lib/agents/feedback-agent";
import { validDraft, validTheme } from "@/lib/schemas/fixtures";

const goodReview = {
  clarity: { score: 9, fix: "" }, persuasiveness: { score: 8, fix: "" }, visualDesign: { score: 9, fix: "" },
  readability: { score: 7, fix: "Body is 36px; raise to 48px." }, imageFit: { score: 9, fix: "" },
  regenerateImage: false, newImagePrompt: null,
};

function fakeClient(output_parsed: unknown) {
  const parse = vi.fn().mockResolvedValue({ output_parsed, model: FEEDBACK_MODEL, usage: { input_tokens: 2000, output_tokens: 300 } });
  return { client: { responses: { parse } } as unknown as OpenAI, parse };
}

const input = {
  sectionId: "problem" as const, keyMessage: "Students lose hours chasing roommates.",
  theme: validTheme, draft: validDraft, screenshot: Buffer.from("fake-png"),
};

describe("Feedback Agent", () => {
  it("sends gpt-6-luna the screenshot as a high-detail PNG plus the slide text and HTML", async () => {
    const { client, parse } = fakeClient(goodReview);
    const result = await reviewSlide(input, client);
    const request = parse.mock.calls[0][0];
    expect(request.model).toBe("gpt-6-luna");
    const content = request.input[1].content;
    expect(content[1]).toEqual({ type: "input_image", image_url: `data:image/png;base64,${Buffer.from("fake-png").toString("base64")}`, detail: "high" });
    expect(content[0].text).toContain(validDraft.headline);
    expect(content[0].text).toContain(validDraft.markup);
    expect(result.output).toEqual(goodReview);
    expect(result.usage).toEqual({ model: "gpt-6-luna", inputTokens: 2000, outputTokens: 300, imageCount: 0 });
  });

  it("tells the reviewer the rubric and the passing score", async () => {
    const { client, parse } = fakeClient(goodReview);
    await reviewSlide(input, client);
    const system = parse.mock.calls[0][0].input[0].content as string;
    for (const word of ["clarity", "persuasiveness", "visualDesign", "readability", "imageFit", "8"]) {
      expect(system).toContain(word);
    }
  });

  it("throws AgentOutputError when the model returns nothing parseable", async () => {
    await expect(reviewSlide(input, fakeClient(null).client)).rejects.toBeInstanceOf(AgentOutputError);
  });
});
