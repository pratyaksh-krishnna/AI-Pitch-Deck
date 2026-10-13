# AI Pitch Deck

Turns a founder's project idea into an investor pitch deck of animated slides, each reviewed and revised until it meets a quality bar.

## Language

### Decks and slides

**Idea**:
The free-text description of a startup or project that a user submits to start a Deck.
_Avoid_: Prompt, input, brief

**Deck**:
The ordered set of Slides generated from one Idea.
_Avoid_: Presentation, pitch

**Slide**:
One page of a Deck: its text, its Slide Composition, its Slide Image, and its Slide Score.
_Avoid_: Page, frame

**Deck Theme**:
The visual rules shared by every Slide in a Deck (colors, typefaces, spacing, motion style), decided once before any Slide is built.
_Avoid_: Style, template, branding

**Slide Composition**:
The animated HTML document that renders a Slide, written in HyperFrames conventions.
_Avoid_: Template, layout, HTML

**Slide Image**:
The illustration generated for a Slide and placed inside its Slide Composition.
_Avoid_: Picture, asset

**MP4 Export**:
A video rendering of a Deck's Slide Compositions, produced on request after the Deck is complete.
_Avoid_: Video deck, render

### Agents

**Orchestrator**:
The fixed workflow that runs the other agents in order and decides, from Slide Scores, which Slides need another Revision Round.
_Avoid_: Supervisor, manager agent, router

**Slide Builder**:
The agent that writes a Slide's text and its Slide Composition, and revises both in response to Feedback.
_Avoid_: HyperFrames agent, Claude agent, designer

**Image Agent**:
The agent that produces a Slide Image from the image description the Slide Builder supplies.
_Avoid_: ChatGPT agent, illustrator

**Feedback Agent**:
The agent that assigns a Slide Score to a Slide and explains what would raise it.
_Avoid_: Judge, critic, reviewer, quality checker

### Quality loop

**Rubric**:
The five criteria a Slide is rated on: clarity, persuasiveness, visual design, readability and image fit.
_Avoid_: Checklist, criteria list

**Slide Score**:
A whole-number rating from 1 to 10 the Feedback Agent gives a Slide: the lowest of its five Rubric ratings.
_Avoid_: Grade, rating, quality

**Passing Score**:
The minimum Slide Score a Slide must reach to be accepted: 8.
_Avoid_: Threshold, bar

**Feedback**:
The Feedback Agent's specific, actionable explanation of what keeps a Slide below the Passing Score.
_Avoid_: Critique, review, comments

**Slide Version**:
One build or revision of a Slide, kept with its own Slide Score and Feedback; a Slide shows its best-scoring version.
_Avoid_: Draft, revision, snapshot

**Revision Round**:
One pass in which the Slide Builder revises a below-passing Slide using its Feedback, followed by a fresh Slide Score.
_Avoid_: Iteration, retry, attempt

**Revision Limit**:
The maximum number of Revision Rounds a Slide may receive: 3.
_Avoid_: Max retries

**Flagged Slide**:
A Slide still below the Passing Score after the Revision Limit; the Deck keeps its best-scoring version and marks it.
_Avoid_: Failed slide, rejected slide
