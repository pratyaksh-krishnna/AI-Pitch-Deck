# AI Pitch Deck

Generate startup pitch decks from a project idea — powered by **OpenAI Agents** (guardrails + structured output), **Inngest** (background jobs), **ImageKit** (image CDN), and **Prisma** (Postgres).

## Quick start

```bash
pnpm install
cp .env.example .env   # fill in your keys
./node_modules/.bin/prisma migrate dev
./node_modules/.bin/prisma generate

# Terminal 1
pnpm dev

# Terminal 2
pnpm inngest:dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build guide

Step-by-step chapters (agenda, packages, file paths, how each part connects):

**[docs/CHAPTERS.md](./docs/CHAPTERS.md)**

| Chapter | Topic |
|---------|-------|
| 1 | Project setup & environment |
| 2 | Database (Prisma + Neon) |
| 3 | Zod schemas & service helpers |
| 4 | OpenAI Agent — guardrails & structured output |
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
| `pnpm test:agent` | Test AI agent in isolation |

## Dev shortcut

Set `USE_PLACEHOLDER_IMAGES=true` in `.env` to skip OpenAI image API costs while testing the UI flow.
