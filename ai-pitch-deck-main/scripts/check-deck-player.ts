/** Usage: pnpm dev (in another terminal), then: pnpm dlx tsx scripts/check-deck-player.ts */
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000/dev/deck-player";
const out = process.argv[3] ?? "/tmp";

// No top-level await: package.json has no "type": "module", so tsx runs this file as CJS.
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${out}/deck-player-1.png` });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/deck-player-2.png` });

  const leaked = await page.evaluate(() => typeof (window as unknown as { __timelines?: unknown }).__timelines);
  const sandbox = await page.evaluate(
    () => (document.querySelector("hyperframes-player") as (HTMLElement & { iframeElement?: HTMLIFrameElement }) | null)
      ?.iframeElement?.getAttribute("sandbox") ?? null,
  );
  console.log(JSON.stringify({ errors, parentSeesTimelines: leaked !== "undefined", sandbox }, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
