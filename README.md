# SUPERSET

**No excuses. Log, lift, progress.**

An open-source, forkable, mobile-first health OS for people who want to improve
their health with the help of agents. Self-host it, bring your own backend and
your own LLM key, and make it yours. It's a training + nutrition + coaching PWA;
the goal is an all-in-one, agent-driven system for getting and staying in shape.

Live: https://superset-lime.vercel.app (the author's instance — fork your own).

## The core principle: engine-bounded coaching

**The LLM never produces an unbounded number.** Every weight, rep target,
deload, and stop decision is grounded in a deterministic TypeScript engine
([`convex/engine.ts`](convex/engine.ts), unit-tested in `engine.test.ts`). The
models are only allowed to:

1. **Ingest** — parse voice/text into structured sets.
2. **Explain** — phrase the engine's recommendation like a coach.
3. **Adjust (bounded)** — propose a small nudge from free-form context ("shoulder
   feels tweaky"), clamped by `clampAdjustment` to ±1 weight increment / ±2 reps.
4. **Converse / see** — the Coach chat and Food vision read your data and photos,
   but defer exact lifting numbers to the engine.

Recommendations are shown explicitly, attributed to the coach, and applied only
when you confirm them — never silently auto-filled.

## The app (5 tabs)

- **Train** — a monthly dashboard (workouts / sets / volume with month-over-month
  deltas). A `+` opens a "what are we training?" sheet of editable day templates.
  Inside a session: a full set table per exercise with the coach's per-set
  recommendation (ramping "Nadapt" plan from your history), warmups carried over,
  editable sets, a per-set text/voice note that nudges the rec, drag-to-reorder,
  and a back action that discards or finishes.
- **History** — date-first: sessions grouped by month, tap a day for its full
  set table.
- **Coach** (center) — an agentic chat that knows your program (the full Naoufal
  guide is built into its context), training history, and saved facts. Text +
  voice. Helps you lock in routines.
- **Food** — snap the item (and optional nutrition label); GPT-5.5 vision names
  it and pulls calories + protein. Logs per day with daily totals.
- **Settings** — accent color (swatch + popover), Light/Dark, customizable
  reminders (in hours), gym schedule, coach memories, sign out.

## Stack

Next.js 16 (App Router, Turbopack) · Convex (DB, file storage, scheduled
functions, auth) · Convex Auth (password) · OpenAI **GPT-5.5** (ingest / explain
/ bounded adjust / chat / food vision). UI: shadcn/ui + vaul (bottom sheets) +
dnd-kit (drag) + Tailwind v4 + lucide-animated icons.

## Design language

- **Apple-style pills**: large corner radius, `rounded-full` buttons and inputs.
- **shadcn/ui throughout** (Item, Card, Drawer, ButtonGroup, Empty, AlertDialog,
  Popover). Modals are bottom-sheet drawers.
- **Type**: Anton (display), Hanken Grotesk (UI), IBM Plex Mono for numbers
  (`.num`). Black & white with one user-chosen accent.
- **Animated nav icons** (lucide-animated), always looping.
- **No em dashes** anywhere in copy or AI output.

## Backend map (`convex/`)

- `engine.ts` — pure progression math (prescribe, rampPlan, nextSetTarget,
  explainNextSet, clampAdjustment, workingSetCount, shouldStop). No LLM.
- `workouts.ts` — exercises, editable day templates, sessions/sets, history
  queries, monthly `rangeStats`, `dayStreak`.
- `agent.ts` — GPT-5.5: ingest, coachNote, bounded adjustTarget.
- `coach.ts` — agentic chat (`chatMessages`) with full user context.
- `food.ts` — image upload + GPT-5.5 vision `analyze` + food log.
- `nudges.ts`, `memories.ts`, `settings.ts`, `meds.ts` (legacy), `seed.ts`.

## Setup

```bash
npm install
npx convex dev          # creates/links a deployment, pushes functions
npx @convex-dev/auth    # generates auth keys on the deployment
npx convex run seed:run # optional: seed exercises + program (edit seed.ts first; seed:reseed wipes & re-imports)
npm run dev
npm test                # engine unit tests (vitest)
```

Set on the Convex deployment (`npx convex env set KEY value`):

- `OPENAI_API_KEY` — enables ingest, coach chat, bounded adjust, and food vision
  (the deterministic engine still works without it).
- `RESEND_API_KEY`, `NUDGE_FROM` — optional, for reminder emails.

Frontend env (`.env.local`, also set in Vercel): `NEXT_PUBLIC_CONVEX_URL`,
`NEXT_PUBLIC_CONVEX_SITE_URL`.

## Deploy

Backend on Convex Cloud, frontend on Vercel; open the URL in mobile Safari and
**Add to Home Screen** for a full-screen PWA. Coach + Food vision call OpenAI, so
they bill against your key.

## Fork it

This is meant to be forked. Bring your own infrastructure:

1. Create your own **Convex** deployment (`npx convex dev`).
2. Generate your own auth keys (`npx @convex-dev/auth`).
3. Add your own **OpenAI** key on *your* deployment. No keys are bundled here.

PRs welcome — the repo includes Convex agent skills under `.claude/` and
`.agents/` to help coding agents (Claude / Codex) work on it.

## Personal data

`convex/seed.ts` ships with the author's own logged sessions (Naoufal's program,
Aug–Sep 2025) and per-exercise set counts as example data. **If you fork this,
replace `SESSIONS` with your own lifts (or empty it) before seeding.**
