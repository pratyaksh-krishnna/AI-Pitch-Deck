import { chromium, type Browser } from "playwright";

type TimelineWindow = { __timelines?: Record<string, { seek(time: number, suppressEvents: boolean): unknown }> };

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  browserPromise ??= chromium.launch();
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = null;
  await browser.close();
}

/** Screenshot one scene of an assembled document at an absolute timeline time. */
export async function screenshotScene(html: string, sceneId: string, atSeconds: number): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.setContent(html, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForFunction(
      (id) => Boolean((window as unknown as TimelineWindow).__timelines?.[id]),
      sceneId,
      { timeout: 15_000 },
    );
    await page.evaluate(
      async ({ id, t }) => {
        await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined)));
        (window as unknown as TimelineWindow).__timelines![id].seek(t, false);
      },
      { id: sceneId, t: atSeconds },
    );
    const scene = page.locator(`[data-composition-id="${sceneId}"]`);
    return await scene.screenshot({ type: "png" });
  } finally {
    await page.close();
  }
}
