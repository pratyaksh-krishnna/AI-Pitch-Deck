import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { assembleDeckHtml, REST_OFFSET_SECONDS } from "@/lib/hyperframes/assemble-deck";
import { closeBrowser, getBrowser, screenshotScene } from "@/lib/render/screenshot";
import { validDraft, validTheme } from "@/lib/schemas/fixtures";
import type { SlideDraft } from "@/lib/schemas/slide-draft";

afterAll(closeBrowser);

function pngSize(png: Buffer) {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function sceneHtml(overrides: Partial<SlideDraft>) {
  return assembleDeckHtml(validTheme, [{
    sceneId: "s1-title", label: "Title", imageUrl: null,
    draft: {
      ...validDraft,
      markup: '<div id="s1-title-box" style="position:absolute;inset:0;background:#ff0000"></div>',
      css: "",
      animation: 'tl.fromTo("#s1-title-box", { opacity: 0 }, { opacity: 1, duration: 1 }, t0 + 0.5);',
      ...overrides,
    },
  }]);
}

describe("screenshotScene", () => {
  it("renders the rest frame of a scene as a 1920×1080 PNG with animations finished", async () => {
    const png = await screenshotScene(sceneHtml({}), "s1-title", REST_OFFSET_SECONDS);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(pngSize(png)).toEqual({ width: 1920, height: 1080 });

    // Opacity tween finished → the frame is red, not the dark theme background.
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.setContent(`<img id="i" src="data:image/png;base64,${png.toString("base64")}">`);
      const [r, g, b] = await page.evaluate(async () => {
        const img = document.getElementById("i") as HTMLImageElement;
        await img.decode();
        const c = document.createElement("canvas"); c.width = 10; c.height = 10;
        const ctx = c.getContext("2d")!; ctx.drawImage(img, -960, -540);
        return Array.from(ctx.getImageData(0, 0, 1, 1).data);
      });
      expect(r).toBeGreaterThan(200); expect(g).toBeLessThan(40); expect(b).toBeLessThan(40);
    } finally {
      await browser.close();
    }
  });
});

describe("screenshotScene sandboxing (untrusted model output)", () => {
  let server: Server;
  let origin: string;
  const hits: string[] = [];

  beforeAll(async () => {
    server = createServer((req, res) => {
      hits.push(req.url ?? "");
      res.end("ok");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("blocks requests to local or private addresses from markup, CSS and animation code", async () => {
    const html = sceneHtml({
      markup: `<div id="s1-title-box" style="position:absolute;inset:0;background:#ff0000"></div><img id="s1-title-leak" src="${origin}/img.png" alt="">`,
      css: `#s1-title-box { background-image: url(${origin}/css.png); }`,
      animation: `fetch("${origin}/fetch").catch(() => {}); tl.fromTo("#s1-title-box", { opacity: 0 }, { opacity: 1, duration: 1 }, t0 + 0.5);`,
    });
    const png = await screenshotScene(html, "s1-title", REST_OFFSET_SECONDS);
    expect(pngSize(png)).toEqual({ width: 1920, height: 1080 });
    expect(hits).toEqual([]);
  });

  it("gives up on a scene whose code never yields, then keeps working", async () => {
    const started = Date.now();
    await expect(
      screenshotScene(sceneHtml({ animation: "while (true) {}" }), "s1-title", REST_OFFSET_SECONDS, { timeoutMs: 3_000 }),
    ).rejects.toThrow(/did not finish within 3000 ms/);
    expect(Date.now() - started).toBeLessThan(15_000);

    const png = await screenshotScene(sceneHtml({}), "s1-title", REST_OFFSET_SECONDS);
    expect(pngSize(png)).toEqual({ width: 1920, height: 1080 });
  });
});

describe("shared browser recovery", () => {
  it("relaunches after the shared browser has died", async () => {
    const browser = await getBrowser();
    await browser.close();
    const png = await screenshotScene(sceneHtml({}), "s1-title", REST_OFFSET_SECONDS);
    expect(pngSize(png)).toEqual({ width: 1920, height: 1080 });
  });

  it("does not cache a failed launch", async () => {
    await closeBrowser();
    const launch = vi.spyOn(chromium, "launch").mockRejectedValueOnce(new Error("launch failed"));
    try {
      await expect(screenshotScene(sceneHtml({}), "s1-title", REST_OFFSET_SECONDS)).rejects.toThrow("launch failed");
    } finally {
      launch.mockRestore();
    }
    const png = await screenshotScene(sceneHtml({}), "s1-title", REST_OFFSET_SECONDS);
    expect(pngSize(png)).toEqual({ width: 1920, height: 1080 });
  });
});
