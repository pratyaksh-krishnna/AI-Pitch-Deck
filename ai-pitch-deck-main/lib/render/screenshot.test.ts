import { afterAll, describe, expect, it } from "vitest";

import { assembleDeckHtml, REST_OFFSET_SECONDS } from "@/lib/hyperframes/assemble-deck";
import { closeBrowser, screenshotScene } from "@/lib/render/screenshot";
import { validDraft, validTheme } from "@/lib/schemas/fixtures";

afterAll(closeBrowser);

function pngSize(png: Buffer) {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("screenshotScene", () => {
  it("renders the rest frame of a scene as a 1920×1080 PNG with animations finished", async () => {
    const html = assembleDeckHtml(validTheme, [{
      sceneId: "s1-title", label: "Title", imageUrl: null,
      draft: {
        ...validDraft,
        markup: '<div id="s1-title-box" style="position:absolute;inset:0;background:#ff0000"></div>',
        css: "",
        animation: 'tl.fromTo("#s1-title-box", { opacity: 0 }, { opacity: 1, duration: 1 }, t0 + 0.5);',
      },
    }]);

    const png = await screenshotScene(html, "s1-title", REST_OFFSET_SECONDS);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(pngSize(png)).toEqual({ width: 1920, height: 1080 });

    // Opacity tween finished → the frame is red, not the dark theme background.
    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(`<img id="i" src="data:image/png;base64,${png.toString("base64")}">`);
    const [r, g, b] = await page.evaluate(async () => {
      const img = document.getElementById("i") as HTMLImageElement;
      await img.decode();
      const c = document.createElement("canvas"); c.width = 10; c.height = 10;
      const ctx = c.getContext("2d")!; ctx.drawImage(img, -960, -540);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    });
    await browser.close();
    expect(r).toBeGreaterThan(200); expect(g).toBeLessThan(40); expect(b).toBeLessThan(40);
  });
});
