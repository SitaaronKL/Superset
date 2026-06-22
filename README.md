# SUPERSET

**No excuses. Log, lift, progress.**

An open-source, forkable, mobile-first health OS for people who want to improve
their health with the help of agents. Self-host it, bring your own backend and
your own LLM key, and make it yours. Today it's a gym + health PWA; the goal is
an all-in-one, agent-driven system for training, recovery, and health habits.

## The core principle: engine-bounded coaching

**The LLM never produces an unbounded number.** Every weight, rep target,
deload, and stop decision is grounded in a deterministic TypeScript engine
([`convex/engine.ts`](convex/engine.ts)) you can read and test. The model is
only allowed to:

1. **Ingest** — parse voice/text ("skullcrushers 50 for 8, brutal") into
   structured sets, read back for confirmation before saving.
2. **Explain** — phrase the engine's recommendation like a coach.
3. **Adjust (bounded)** — propose a *small* nudge from free-form context
   ("shoulder feels tweaky") that the engine clamps to ±1 weight increment /
   ±2 reps via `clampAdjustment`. The engine, not the model, decides what's allowed.

Recommendations are shown explicitly, attributed to the coach, and applied only
when you confirm them — never silently auto-filled. Medication tracking is a
logbook + reminders only; the app never advises dosing.

## Features

- **Flexible training days** — create/rename/reorder your own day templates; pick a day and see every exercise in your priority order, do what you have time for (the rest just stay unlogged).
- **Ramping progressive-overload engine** — Naoufal-style ("Nadapt") ramping sets, double progression, fatigue tags (`EZ / HARD / FAIL / DEAD`) mapped to reps-in-reserve, layoff deloads, warmup carry-over, per-set targets that adapt to live performance.
- **Guided per-set logging** — a full set table with an attributed coach recommendation for the next set; tap to apply, edit any logged set, or log via the chat box. Auto-starting rest timers.
- **Voice + chat logging** via Web Speech API + LLM parsing (confirm before save).
- **Excuse-killer nudges** — scheduled emails (Resend) timed backward from your gym time ("freeze the water bottle", "charge your phone"), an excuse ledger, and weekly streaks.
- **Coach memory** — the agent accumulates durable facts about you (injuries, patterns, preferences) that shape its tone and nudges — never the numbers. Inspect and delete them in Settings.
- **e1RM history charts** per exercise.
- **Native-feeling black & white UI** (bottom-sheet drawers, mono numerals) with a user-choosable accent color.

## Stack

Next.js (App Router) · Convex (DB, scheduled functions, auth) · Convex Auth (password) · shadcn/ui + vaul + Tailwind v4 · OpenAI GPT-5.5 (ingest / explain / bounded adjust only)

## Setup

```bash
npm install
npx convex dev          # creates/links a deployment, pushes functions
npx @convex-dev/auth    # generates auth keys on the deployment
npx convex run seed:run # optional: seed exercises + program (edit convex/seed.ts first; seed:reseed wipes & re-imports)
npm run dev
```

Optional env vars on the Convex deployment (`npx convex env set KEY value`):

- `OPENAI_API_KEY` — enables voice ingest + coach phrasing (app degrades gracefully without it)
- `RESEND_API_KEY`, `NUDGE_FROM` — enables nudge emails

In the app: Settings → set your gym days, gym hour, and nudge email.

## Personal data

`convex/seed.ts` is the only place personal training history lives, and it ships with the author's own logged sessions as example data. **If you fork this, replace `SESSIONS` with your own lifts (or empty it) before seeding** so you don't inherit someone else's numbers.

## Fork it

This is meant to be forked. To run your own instance you bring your own infrastructure:

1. Create your own **Convex** deployment (`npx convex dev` links it to your account).
2. Generate your own auth keys (`npx @convex-dev/auth`).
3. Add your own **OpenAI** key on *your* deployment (`npx convex env set OPENAI_API_KEY ...`). No keys are bundled in this repo.

PRs welcome — the repo includes Convex agent skills under `.claude/` and `.agents/` to help coding agents (Claude / Codex) work on it.
