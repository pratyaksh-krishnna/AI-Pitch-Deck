/**
 * Adapted from HeyGen HyperFrames skills — https://github.com/heygen-com/hyperframes
 * (skills/slideshow/SKILL.md and skills/hyperframes-core/SKILL.md, commit ab8a4da),
 * licensed Apache-2.0. Changes: trimmed to rules that apply to single-scene fragments
 * assembled by lib/hyperframes/assemble-deck.ts; font rules rewritten for that assembler.
 */
export const HYPERFRAMES_SLIDE_RULES = `
## Slide writing rules (HyperFrames slideshow)
These are hard constraints, not suggestions.
- Headline is a complete-sentence claim, not a label. Write "SMBs spend 14 hours/week on manual scheduling", not "Scheduling problem". The sentence should stand alone if the visual is ignored.
- One idea + one visual per slide. If you are tempted to add a second bullet cluster or a second chart, cut it.
- Lead with the punchline. The strongest point goes first. Investors read left-to-right, top-to-bottom, and they stop.
- Bottom-up market sizing only. Never write "$50B TAM" without showing the math. Build from unit economics up: accounts × ACV, or transactions × take-rate.
- Font minimum 30pt equivalent. At 1920×1080, a headline is 72–96px; body copy is 48px. Never go below 40px for any text the audience must read.

## Animation and layout rules (HyperFrames core)
- Center with flex or inset, not CSS transform: translate(-50%,-50%) on a node you then animate with GSAP x/y. Use fromTo or xPercent/yPercent.
- Never pair a CSS initial transform with a GSAP tween on the same property — the CSS value and the tween's start fight. Set the initial state inside the tween with gsap.fromTo(el, { x: -40 }, { x: 0 }) instead of a CSS transform: translateX(-40px).
- Never tween display, visibility or autoAlpha on a .clip element; the framework owns clip visibility. Animate a child element instead.
- Do not add a scene-exit tl.set(..., { visibility: "hidden" }); the runtime already hides timed clips.
- Never set font-family; the deck theme applies the fonts. Named fonts without a shipped @font-face fail lint.
- No render-time clocks, no unseeded Math.random, no network requests, no reading input state. repeat: -1 is not allowed; use a finite repeat count.
- No <br> in body text. Transformed elements must be block-level and sized. Pulsing absolute decorations need clearance at their peak size.
- Keep every id unique across the whole deck: prefix every id with the scene id (#<sceneId>-headline).
`;
