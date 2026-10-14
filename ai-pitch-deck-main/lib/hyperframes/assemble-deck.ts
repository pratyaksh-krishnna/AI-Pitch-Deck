import { FONT_STACKS, type DeckTheme } from "@/lib/schemas/deck-theme";
import type { SlideDraft } from "@/lib/schemas/slide-draft";

export const SLIDE_SECONDS = 6;
/** The slideshow rests at a scene's midpoint; screenshots use the same frame. */
export const REST_OFFSET_SECONDS = 3;
/**
 * What a one-slide player plays (ruling R8): from 0 so the entrance animation runs, ending
 * at the rest frame, where the player holds the last frame before range-end.
 */
export const SLIDE_PLAYER_RANGE = { start: 0, end: REST_OFFSET_SECONDS } as const;
/** The only script the assembled document loads; the screenshot allowlist depends on it. */
export const GSAP_SRC = "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js";

export type SceneInput = {
  sceneId: string;
  label: string;
  draft: SlideDraft;
  imageUrl: string | null;
};

export class AssemblyError extends Error {
  constructor(sceneId: string, reason: string) {
    super(`Slide ${sceneId}: ${reason}`);
    this.name = "AssemblyError";
  }
}

export function sceneStart(index: number): number {
  return index * SLIDE_SECONDS;
}

function assertSafe(scene: SceneInput) {
  const { markup, css, animation } = scene.draft;
  if (/<\s*script/i.test(markup)) throw new AssemblyError(scene.sceneId, "markup must not contain <script>");
  if (/\son[a-z]+\s*=/i.test(markup)) throw new AssemblyError(scene.sceneId, "markup must not use inline event handlers");
  if (/<\/?\s*(style|script)/i.test(css)) throw new AssemblyError(scene.sceneId, "css must not contain <style> or <script> tags");
  if (/<\/\s*script/i.test(animation)) throw new AssemblyError(scene.sceneId, "animation must not contain </script>");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** JSON that is safe inside <script>: no "<" can close the element. */
function scriptSafeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function withImage(markup: string, imageUrl: string | null): string {
  const tag = /<img\b[^>]*\bdata-slide-image\b[^>]*>/gi;
  if (!imageUrl) return markup.replace(tag, "");
  return markup.replace(tag, (img) =>
    img.replace(/\ssrc\s*=\s*"[^"]*"/i, "").replace(/<img/i, `<img src="${escapeAttr(imageUrl)}"`),
  );
}

function themeCss(theme: DeckTheme): string {
  /* Fonts are written as concrete generic stacks, never var(): HyperFrames lint treats
     tokenized font-family values as unresolved fonts. */
  return `:root {
  --hf-bg: ${theme.background}; --hf-surface: ${theme.surface}; --hf-text: ${theme.text};
  --hf-muted: ${theme.mutedText}; --hf-accent: ${theme.accent};
}
body { margin: 0; background: var(--hf-bg); }
[data-composition-id] { position: relative; width: 1920px; height: 1080px; overflow: hidden;
  background: var(--hf-bg); color: var(--hf-text); font-family: ${FONT_STACKS[theme.bodyFont]}; }
[data-composition-id] h1, [data-composition-id] h2, [data-composition-id] h3 {
  font-family: ${FONT_STACKS[theme.headingFont]}; margin: 0; }`;
}

export function assembleDeckHtml(theme: DeckTheme, scenes: SceneInput[]): string {
  scenes.forEach(assertSafe);

  const manifest = {
    slides: scenes.map((s) => ({ sceneId: s.sceneId, notes: s.draft.speakerNotes })),
  };

  const sceneDivs = scenes
    .map((s, i) => {
      const start = sceneStart(i);
      return `<div data-composition-id="${s.sceneId}" data-start="${start}" data-duration="${SLIDE_SECONDS}" data-label="${escapeAttr(s.label)}" data-width="1920" data-height="1080">
<section class="clip" data-start="${start}" data-duration="${SLIDE_SECONDS}" data-track-index="1" style="position: absolute; inset: 0">
${withImage(s.draft.markup, s.imageUrl)}
</section>
</div>`;
    })
    .join("\n");

  const timelines = scenes
    .map(
      (s, i) => `(function () {
  const tl = gsap.timeline({ paused: true });
  (function (tl, t0) {
${s.draft.animation}
  })(tl, ${sceneStart(i)});
  window.__timelines[${JSON.stringify(s.sceneId)}] = tl;
})();`,
    )
    .join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<script src="${GSAP_SRC}"></script>
<style>
${themeCss(theme)}
${scenes.map((s) => s.draft.css).join("\n")}
</style>
</head>
<body>
<script type="application/hyperframes-slideshow+json">${scriptSafeJson(manifest)}</script>
${sceneDivs}
<script>
window.__timelines = window.__timelines || {};
${timelines}
</script>
</body>
</html>`;
}
