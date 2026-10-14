# AI Pitch Deck

Generate investor pitch decks from a project idea — a Claude Slide Builder designs animated HyperFrames slides, an Image Agent illustrates them, and a Feedback Agent scores every slide until it reaches 8/10.

Domain terms are defined in [CONTEXT.md](./CONTEXT.md); the design is in [docs/superpowers/specs/2026-10-14-multi-agent-slides-design.md](./docs/superpowers/specs/2026-10-14-multi-agent-slides-design.md).

## Quick start

```bash
pnpm install
cp .env.example .env   # fill in your keys, including ANTHROPIC_API_KEY (Slide Builder)
# optional dev cost cap: set DECK_SLIDE_LIMIT=2 in .env to build only the first N sections
pnpm db:direct migrate deploy   # apply migrations over Neon's direct (non-pooler) host
./node_modules/.bin/prisma generate

# Terminal 1
pnpm dev

# Terminal 2
pnpm inngest:dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build guide

Step-by-step chapters (agenda, packages, file paths, how each part connects). The chapters build the original single-agent version; the multi-agent pipeline that replaced it is summarised at the top of the guide:

**[docs/CHAPTERS.md](./docs/CHAPTERS.md)**

| Chapter | Topic |
|---------|-------|
| 1 | Project setup & environment |
| 2 | Database (Prisma + Neon) |
| 3 | Zod schemas & service helpers |
| 4 | AI agents & structured output (now the Claude Slide Builder and Feedback Agent) |
| 5 | Image generation (OpenAI) + ImageKit |
| 6 | Inngest background jobs |
| 7 | API routes |
| 8 | UI pages & components |

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Next.js dev server |
| `pnpm inngest:dev` | Inngest dev UI (localhost:8288) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:direct <prisma args>` | Run a Prisma CLI command against Neon's direct host (e.g. `migrate deploy`) |
| `pnpm test` | Run the Vitest suite |

## Dev shortcut

Set `USE_PLACEHOLDER_IMAGES=true` in `.env` to skip OpenAI image API costs while testing the UI flow.
