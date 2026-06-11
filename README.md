# SUPERSET

**No excuses. Log, lift, progress.**

A single-user, mobile-first gym + health PWA. Its job is to remove your excuses before they happen and make logging a set faster than not logging it.

## The core principle

**The LLM never invents a number.** Every weight, rep target, deload, and stop decision comes from a deterministic TypeScript engine ([`convex/engine.ts`](convex/engine.ts)) you can read and test. The model is only allowed to:

1. **Ingest** — parse voice/text ("skullcrushers 50 for 8, brutal") into structured sets, read back for confirmation before saving.
2. **Explain** — phrase the engine's prescription like a coach.

Medication tracking is a logbook + reminders only — the app never advises dosing.

## Features

- **Progressive overload engine** — double progression, fatigue tags (`EZ / HARD / FAIL / DEAD`) mapped to reps-in-reserve, automatic layoff deloads, warmup ramp generation, junk-volume auto-stop.
- **Two-tap set logging** with the engine's prescribed weight pre-filled, auto-starting rest timers.
- **Voice logging** via Web Speech API + LLM parsing (confirm before save).
- **Excuse-killer nudges** — scheduled emails (Resend) timed backward from your gym time ("freeze the water bottle", "charge your phone"), an excuse ledger, and weekly streaks.
- **Coach memory** — the agent accumulates durable facts about you (injuries, patterns, preferences) that shape its tone and nudges — never the numbers. Inspect and delete them in Settings.
- **e1RM history charts** per exercise.
- **Black & white UI** with a user-choosable accent color.

## Stack

Next.js (App Router) · Convex (DB, scheduled functions, auth) · Convex Auth (password) · shadcn/ui + Tailwind v4 · OpenAI (ingest/coach only)

## Setup

```bash
npm install
npx convex dev          # creates/links a deployment, pushes functions
npx @convex-dev/auth    # generates auth keys on the deployment
npx convex run seed:run # optional: seed exercises + program (edit convex/seed.ts first)
npm run dev
```

Optional env vars on the Convex deployment (`npx convex env set KEY value`):

- `OPENAI_API_KEY` — enables voice ingest + coach phrasing (app degrades gracefully without it)
- `RESEND_API_KEY`, `NUDGE_FROM` — enables nudge emails

In the app: Settings → set your gym days, gym hour, and nudge email.

## Personal data

`convex/seed.ts` is the only place personal training history lives. Replace its contents with your own lifts (or strip `HISTORY` entirely) before seeding.
