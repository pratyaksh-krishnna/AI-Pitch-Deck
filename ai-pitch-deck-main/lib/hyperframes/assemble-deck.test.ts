import { describe, expect, it } from "vitest";

import { AssemblyError, assembleDeckHtml, sceneStart, SLIDE_SECONDS } from "@/lib/hyperframes/assemble-deck";
import { lintDeckHtml } from "@/lib/hyperframes/lint";
import { validDraft, validTheme } from "@/lib/schemas/fixtures";
import type { SlideDraft } from "@/lib/schemas/slide-draft";

const scene = (n: number, overrides: Partial<SlideDraft> = {}) => ({
  sceneId: `s${n}-problem`,
  label: `Slide ${n}`,
  imageUrl: "https://ik.imagekit.io/demo/a.png",
  draft: {
    ...validDraft,
    markup: `<h1 id="s${n}-problem-headline">Headline ${n}</h1><img data-slide-image alt="">`,
    css: `#s${n}-problem-headline { font-size: 88px; }`,
    animation: `tl.from("#s${n}-problem-headline", { opacity: 0, y: 30, duration: 0.6 }, t0 + 0.2);`,
    ...overrides,
  },
});

function island(html: string) {
  const match = html.match(/<script type="application\/hyperframes-slideshow\+json">([\s\S]*?)<\/script>/);
  return JSON.parse(match![1]);
}

describe("assembleDeckHtml", () => {
  it("lists every scene in the island in order with its notes", () => {
    const html = assembleDeckHtml(validTheme, [scene(1), scene(2)]);
    expect(island(html).slides).toEqual([
      { sceneId: "s1-problem", notes: validDraft.speakerNotes },
      { sceneId: "s2-problem", notes: validDraft.speakerNotes },
    ]);
  });

  it("gives scenes sequential, non-overlapping start times", () => {
    const html = assembleDeckHtml(validTheme, [scene(1), scene(2), scene(3)]);
    expect(sceneStart(2)).toBe(2 * SLIDE_SECONDS);
    expect(html).toContain(`data-composition-id="s3-problem" data-start="${2 * SLIDE_SECONDS}" data-duration="${SLIDE_SECONDS}"`);
    expect(html).toContain(`(tl, ${2 * SLIDE_SECONDS})`);
  });

  it("injects the slide image url and drops the image when there is none", () => {
    expect(assembleDeckHtml(validTheme, [scene(1)])).toContain('src="https://ik.imagekit.io/demo/a.png"');
    const noImage = assembleDeckHtml(validTheme, [{ ...scene(1), imageUrl: null }]);
    expect(noImage).not.toContain("data-slide-image");
  });

  it("escapes notes so they cannot close the island script", () => {
    const html = assembleDeckHtml(validTheme, [scene(1, { speakerNotes: "</script><script>alert(1)</script>" })]);
    expect(island(html).slides[0].notes).toBe("</script><script>alert(1)</script>");
    expect(html.match(/<script/g)!.length).toBe(3); // gsap + island + timelines — nothing injected
  });

  it("rejects scripts in markup and style-breakouts in css", () => {
    expect(() => assembleDeckHtml(validTheme, [scene(1, { markup: '<h1>x</h1><script>alert(1)</script>' })])).toThrow(AssemblyError);
    expect(() => assembleDeckHtml(validTheme, [scene(1, { css: "</style><script>alert(1)</script>" })])).toThrow(AssemblyError);
    expect(() => assembleDeckHtml(validTheme, [scene(1, { markup: '<h1 onclick="alert(1)">x</h1>' })])).toThrow(AssemblyError);
  });

  it("produces a document HyperFrames lint accepts with zero errors", async () => {
    const result = await lintDeckHtml(assembleDeckHtml(validTheme, [scene(1), scene(2)]));
    expect(result.errors).toEqual([]);
  });
});
