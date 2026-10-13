# Multi-agent slide generation — design

Status: agreed 2026-10-14 (grilling session). Glossary: [CONTEXT.md](../../../CONTEXT.md). Decisions: [ADR 0001](../../adr/0001-html-slides-before-mp4.md), [ADR 0002](../../adr/0002-code-orchestrator.md).

## Goal

Replace the single OpenAI text agent with four roles that produce a 7-slide animated HyperFrames deck in which every Slide reaches a Slide Score of at least 8/10, or is flagged after 3 Revision Rounds.

## Roles

| Role | Implementation | Model |
|---|---|---|
| Orchestrator | Inngest workflow (code, no LLM) | — |
| Slide Builder | Claude API (`@anthropic-ai/sdk`), structured output, HyperFrames rules vendored into the system prompt | `claude-opus-5-5`, effort `high`, server-side refusal fallback `"default"` |
| Image Agent | Plain OpenAI Images call + ImageKit upload | `gpt-image-2` (placeholder images while `USE_PLACEHOLDER_IMAGES=true`) |
| Feedback Agent | OpenAI Responses API, structured output, sees a screenshot + slide text/HTML | `gpt-6-luna` (verified to accept image input on 2026-10-14) |

## Pipeline (one Deck)

1. **Plan** (Slide Builder): deck title, Deck Theme, one key message per section.
2. For each of the 7 sections, in parallel (one child workflow per Slide):
   1. **Build** (Slide Builder) a Slide draft: headline, body bullets, speaker notes, image description + aspect, and a HyperFrames scene (markup, scoped CSS, GSAP animation body).
   2. **Image** (Image Agent) at the requested aspect.
   3. **Inspect**: assemble a one-slide HyperFrames document → `@hyperframes/lint` → Playwright screenshot of the rest frame → Feedback Agent rates the five Rubric criteria.
   4. **Decide** (code): Slide Score = lowest Rubric rating. Pass if ≥ 8 and no lint errors. Otherwise revise (edit the previous version using Feedback; regenerate the image if Feedback asks) — up to 3 Revision Rounds — then flag, keeping the best-scoring Slide Version.
3. **Assemble** the full deck document from each Slide's best version; store it; mark the Deck complete.

## Deck format

- One HTML document per Deck in HyperFrames **slideshow** format: one top-level scene (`data-composition-id`) per Slide, a `application/hyperframes-slideshow+json` island listing slides and speaker notes, GSAP timelines registered on `window.__timelines`.
- Slide Builder output is position-independent (no absolute times); the assembler assigns each scene its start time, wraps markup in a full-scene clip, scopes ids/CSS, and injects the Slide Image URL.
- Viewer: `<hyperframes-slideshow>` + `<hyperframes-player>` with `sandbox-origin="opaque"` (AI-written HTML/JS must not reach the app page).

## Fixed deck structure

Title · Problem · Solution · Market · Product · Business Model · The Ask.

## Rubric

Clarity · Persuasiveness · Visual design · Readability · Image fit — each 1–10; Slide Score = minimum; Feedback = one concrete fix per criterion below 8.

## Data

Every Slide Version is kept (draft, image URL, score, review, lint errors). Per-call model usage is logged per Deck for cost measurement; no hard spend cap. Pre-existing decks are deleted by the migration.

## UI

While generating: one card per Slide showing state (building / scoring / revising round n of 3 / passed n/10 / flagged n/10). When complete: the slideshow player, plus per-slide score and Feedback history.

## Out of scope (later)

MP4 Export; hosting (local now, container host planned — avoid Vercel-only choices); model A/B comparisons beyond the image-model check.
