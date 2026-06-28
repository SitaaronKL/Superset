<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Superset project conventions

Read `README.md` for the full architecture. When working here:

- **No em dashes** in any user-facing copy, UI string, or AI output. Use commas,
  periods, or parentheses. This is a hard product rule.
- **Engine owns the numbers.** All weights/reps/stop logic come from pure
  functions in `convex/engine.ts` (unit-tested in `engine.test.ts` via vitest —
  run `npm test`). The LLM may parse, phrase, or propose a nudge that
  `clampAdjustment` bounds; it must never emit an unbounded lifting number.
- **Design language:** Apple-style pills (`rounded-full` buttons/inputs, large
  `--radius`), shadcn/ui components everywhere (Item, Card, Drawer bottom-sheets,
  ButtonGroup, Empty, AlertDialog, Popover), lucide-animated nav icons. Fonts:
  Anton (display), Hanken Grotesk (UI), IBM Plex Mono for numbers (`.num`).
  Black & white + one user accent (`var(--accent-user)`). Keep it dense.
- **LLM model:** GPT-5.5 everywhere (centralized constants in `agent.ts` /
  `coach.ts` / `food.ts`).
- **Verify before claiming done:** `npx tsc --noEmit`, `npm test`, `npm run build`.
  Push to Convex with `npx convex dev --once`; deploy frontend with
  `npx vercel --prod --yes --scope sitaaronkls-projects`.
- **Deployments:** Convex Cloud `resolute-mammoth-282`; Vercel project `superset`
  (alias `superset-lime.vercel.app`). `convex/seed.ts` holds personal training
  data; `seed:reseed` wipes and re-imports.
