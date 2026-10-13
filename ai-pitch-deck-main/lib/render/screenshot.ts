import { chromium, type Browser, type BrowserContext } from "playwright";

import { GSAP_SRC } from "@/lib/hyperframes/assemble-deck";

type TimelineWindow = { __timelines?: Record<string, { seek(time: number, suppressEvents: boolean): unknown }> };

/** Hard cap on one screenshot: the scene is untrusted model output and may never yield. */
export const SCREENSHOT_DEADLINE_MS = 45_000;
/** How long to wait for a context or browser to close before giving up on it. */
const CLOSE_TIMEOUT_MS = 5_000;

/**
 * The scene's markup, CSS and animation code are written by a model, and this Chromium
 * runs on our server. Only the GSAP script and hosted slide images may load; every other
 * request (localhost, cloud metadata, LAN, arbitrary hosts) is aborted.
 */
const ALLOWED_URL_PREFIXES = [GSAP_SRC, "https://ik.imagekit.io/"];
const ALLOWED_SCHEMES = ["data:", "blob:", "about:"];

export function isAllowedRequest(url: string): boolean {
  return ALLOWED_SCHEMES.some((s) => url.startsWith(s)) || ALLOWED_URL_PREFIXES.some((p) => url.startsWith(p));
}

export class ScreenshotTimeoutError extends Error {
  constructor(sceneId: string, timeoutMs: number) {
    super(`Screenshot of ${sceneId} did not finish within ${timeoutMs} ms`);
    this.name = "ScreenshotTimeoutError";
  }
}

let browserPromise: Promise<Browser> | null = null;

function launchBrowser(): Promise<Browser> {
  const launching = chromium.launch();
  // Never cache a failed launch.
  launching.catch(() => {
    if (browserPromise === launching) browserPromise = null;
  });
  return launching;
}

/** The shared Chromium, relaunched if it failed to start, crashed or was closed. */
export async function getBrowser(): Promise<Browser> {
  const current = browserPromise;
  if (current) {
    const browser = await current.catch(() => null);
    if (browser?.isConnected()) return browser;
    if (browserPromise === current) browserPromise = null;
  }
  browserPromise ??= launchBrowser();
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  const current = browserPromise;
  browserPromise = null;
  const browser = await current?.catch(() => null);
  await browser?.close().catch(() => undefined);
}

function within<T>(promise: Promise<T>, ms: number): Promise<T | "timeout"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Closes a context; if Chromium does not respond, drops and closes the whole shared browser. */
async function disposeContext(context: BrowserContext, browser: Browser): Promise<void> {
  const closed = await within(context.close().catch(() => undefined), CLOSE_TIMEOUT_MS);
  if (closed !== "timeout") return;
  if (browserPromise) {
    const shared = await browserPromise.catch(() => null);
    if (shared === browser) browserPromise = null;
  }
  await within(browser.close().catch(() => undefined), CLOSE_TIMEOUT_MS);
}

async function capture(context: BrowserContext, html: string, sceneId: string, atSeconds: number, timeoutMs: number) {
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  await page.setContent(html, { waitUntil: "networkidle", timeout: timeoutMs });
  await page.waitForFunction(
    (id) => Boolean((window as unknown as TimelineWindow).__timelines?.[id]),
    sceneId,
    { timeout: Math.min(15_000, timeoutMs) },
  );
  await page.evaluate(
    async ({ id, t }) => {
      await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined)));
      (window as unknown as TimelineWindow).__timelines![id].seek(t, false);
    },
    { id: sceneId, t: atSeconds },
  );
  return page.locator(`[data-composition-id="${sceneId}"]`).screenshot({ type: "png", timeout: timeoutMs });
}

/**
 * Screenshot one scene of an assembled document at an absolute timeline time.
 * Each call gets a fresh, network-restricted browser context and a hard deadline.
 */
export async function screenshotScene(
  html: string,
  sceneId: string,
  atSeconds: number,
  options: { timeoutMs?: number } = {},
): Promise<Buffer> {
  const timeoutMs = options.timeoutMs ?? SCREENSHOT_DEADLINE_MS;
  const browser = await getBrowser();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, serviceWorkers: "block" });
  await context.route("**/*", (route) =>
    isAllowedRequest(route.request().url()) ? route.continue() : route.abort("blockedbyclient"),
  );
  await context.routeWebSocket(/.*/, (ws) => ws.close());

  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ScreenshotTimeoutError(sceneId, timeoutMs)), timeoutMs);
  });
  try {
    return await Promise.race([capture(context, html, sceneId, atSeconds, timeoutMs), deadline]);
  } finally {
    clearTimeout(timer);
    await disposeContext(context, browser);
  }
}
