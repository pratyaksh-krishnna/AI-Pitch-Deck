import type OpenAI from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";

import { generateSlideImage, IMAGE_MODEL, placeholderImagesEnabled, sizeForAspect } from "@/lib/agents/image-agent";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Image Agent", () => {
  it("maps the slot aspect to a supported image size", () => {
    expect(sizeForAspect("landscape")).toBe("1536x1024");
    expect(sizeForAspect("portrait")).toBe("1024x1536");
    expect(sizeForAspect("square")).toBe("1024x1024");
  });

  it("reports placeholder mode only for USE_PLACEHOLDER_IMAGES=true", () => {
    expect(placeholderImagesEnabled({ USE_PLACEHOLDER_IMAGES: "true" })).toBe(true);
    expect(placeholderImagesEnabled({ USE_PLACEHOLDER_IMAGES: "false" })).toBe(false);
    expect(placeholderImagesEnabled({})).toBe(false);
  });

  it("calls gpt-image-2 at the right size and counts one image", async () => {
    vi.stubEnv("USE_PLACEHOLDER_IMAGES", "false");
    const generate = vi.fn().mockResolvedValue({ data: [{ b64_json: Buffer.from("png").toString("base64") }] });
    const client = { images: { generate } } as unknown as OpenAI;
    const result = await generateSlideImage("Students at a table", "portrait", client);
    expect(generate).toHaveBeenCalledWith({ model: IMAGE_MODEL, prompt: "Students at a table", n: 1, size: "1024x1536" });
    expect(result.buffer.toString()).toBe("png");
    expect(result.usage).toEqual({ model: "gpt-image-2", inputTokens: 0, outputTokens: 0, imageCount: 1 });
  });

  it("uses a free placeholder of the same shape when placeholders are on", async () => {
    vi.stubEnv("USE_PLACEHOLDER_IMAGES", "true");
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateSlideImage("anything", "landscape");
    expect(fetchMock).toHaveBeenCalledWith("https://picsum.photos/1536/1024");
    expect(result.usage.imageCount).toBe(0);
  });
});
