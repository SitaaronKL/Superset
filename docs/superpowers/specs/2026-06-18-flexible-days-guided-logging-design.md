# Superset v2 — Flexible Days, Picked Exercises, Guided Per-Set Logging

Date: 2026-06-18
Status: Approved design, pre-implementation

## Problem

The app's training flow doesn't match how the user actually trains (as evidenced
by his Obsidian gym logs in `~/Documents/Ext-Brain/Improvement/Gym`):

1. **Days are fixed and uneditable.** Only three seeded days exist (Chest & Arms,
   Shoulders & Back, Legs) with locked exercise lists. The user can't create or
   customize days.
2. **Picking a day implies doing every exercise.** The user does NOT do every
   exercise every session. He does his favorites first, in his preferred order,
   and only gets to the rest if he has extra time. Some exercises he routinely
   skips.
3. **Logging is one-set-at-a-time** through two input boxes plus a coaching engine
   that prescribes a single top weight and hard-stops sets. His real flow is a
   fast table fill (Obsidian: `Set: Weight × Reps + note`) with per-set guidance.

The user still wants coaching — but driven by his own history for that exercise,
set-by-set, following the Naoufal program's ramping ("Nadapt") method, plus the
ability to talk to the coach mid-exercise.

## Source of truth: the Naoufal program (the "Nadapt Method")

From `~/Documents/Ext-Brain/Improvement/Gym/Naoufal's Gym Program.md`, working
sets **ramp**: weight climbs each set, reps fall as weight rises, top sets land
heavy. Examples:

- Compounds (Bench, Shoulder Press, Squat/Leg Press): warmups + ~5 working sets,
  "ramp to 80–85% of PR, aim for 6–7 reps on top sets."
- Skullcrushers: 1 warmup + 4 ramping sets (65 → 115×10 → 135×7 → 145×3–4).
- Curls / Hammer Curls: 4 sets, gradually heavier, last 2 = 6–7 reps max effort.
- Isolation machines (Chest Fly, Reverse Fly, Rows, Pulldowns): ~4 sets at a
  weight where the last reps are near failure (8–12 range).
- Leg Extension: 1 heavy set ×7–8 + 3 dropsets.

The user's logged sessions (8-7-25, 8-18-25, 9-8-25) confirm the ramp pattern.

## Non-goals

- No change to Meds, Nudges, History, Settings, Auth, or the voice-ingest agent
  boundary (LLM never picks numbers — see Architectural Invariant).
- No new medication/dosing logic.
- Not rebuilding the exercise library schema; reusing `exercises` as-is.

## Architectural invariant (hybrid, engine-bounded)

The engine (`engine.ts`, pure functions, no LLM) sets the **baseline** weight/rep
target and the stop decision from the user's real history. The LLM (`agent.ts`)
may, in addition to (1) parsing natural language into structured sets and (2)
rephrasing output, now (3) **propose a small adjustment** to the baseline based on
free-form context the user gives ("shoulder felt tweaky", "slept badly", "felt
easy").

The guardrail is enforced by the **engine, not the LLM**: the model returns a
proposed weight/reps + reason, and a pure function `clampAdjustment` bounds the
change to **at most ±1 `weightIncrement` and ±2 reps** off the engine baseline
before anything is shown or logged. If the model proposes something outside the
band, it is clamped. The LLM never produces an unbounded number, and the user
always sees the baseline plus the reason for any nudge (e.g. "Engine: 45×8 —
nudged to 40×8 because you said your shoulder felt tweaky").

## Design

### 1. Data model (`convex/schema.ts`)

- **`programDays` becomes user-editable.** Table already exists; add CRUD. The
  `exerciseIds` array order encodes the user's **preferred exercise order** for
  that day (favorites first). No schema field change required for ordering — array
  order is the order.
- **`sessions` gains `extraExerciseIds: optional(array(id))`** — exercises added
  ad-hoc during a session that are not in the day template. (The template's
  ordered list is the menu; this captures one-offs.)
- **No `selectedExerciseIds`.** There is no upfront subset selection. "Done vs not
  done" is derived from whether any `sets` exist for an exercise in the session —
  exactly like a blank row in the Obsidian table.

### 2. Backend mutations/queries (`convex/workouts.ts`)

New mutations:
- `createProgramDay({ name })` → new empty day at next order.
- `renameProgramDay({ id, name })`.
- `deleteProgramDay({ id })`.
- `reorderProgramDays({ orderedIds })` → rewrites `order` fields.
- `setDayExercises({ id, exerciseIds })` → sets the ordered exercise list
  (also used for drag-to-reorder within a day).
- `createExercise({ name, muscleGroup, isCompound })` → quick-add with defaults:
  `repRangeMin/Max`, `restSeconds`, `weightIncrement` filled by `isCompound`
  (compound: 5–7 reps / 150s / 5lb; isolation: 8–12 reps / 90s / 5lb). Editable
  later in Settings.
- `addExerciseToSession({ sessionId, exerciseId })` → appends to
  `extraExerciseIds`.

New/changed queries:
- `lastSessionSetsFor({ exerciseId })` → the most recent completed session's sets
  for an exercise (warmups + working), used to pre-fill warmups and to drive the
  ramp targets.
- Existing `prescriptionFor`, `exerciseHistory`, `sessionSets`, `listExercises`,
  `listProgramDays` stay.

### 3. Engine (`convex/engine.ts`)

Keep `prescribe`, `warmupRamp`, `shouldStop`, `e1RM`, `fatigueToRIR`,
`roundToIncrement`, `bestE1RM`.

Add the ramp model:

- **`rampPlan(cfg, lastSessionSets)`** → returns the planned set list for this
  session as `{ warmups: {weight,reps}[]; workingTargets: {weight,reps}[] }`:
  - Warmups: copied from `lastSessionSets` warmups (warmups "stay the same"); if
    none, fall back to `warmupRamp`.
  - Working targets: one entry per working set the user did last time (min count
    by `cfg.isCompound`: 5 compound / 4 isolation if no history). Each target is
    last session's matching-rung set with **progressive overload applied**:
    - If last rung hit the top of its rep band with reps-in-reserve → +1
      `weightIncrement`, reps reset toward the rung's target.
    - Else → repeat weight, chase +1 rep.
  This preserves the ramp shape (each rung relative to the same rung last time)
  while pushing overload set-by-set.

- **`clampAdjustment(baseline, proposed, increment)`** → enforces the hybrid
  guardrail. Given the engine baseline `{weight, reps}` and the LLM's proposed
  `{weight, reps}`, returns a result bounded to **±1 `increment` weight and ±2
  reps** off baseline. This is the safety boundary — the LLM can suggest, the
  engine decides what is allowed. Pure, unit-testable.

- **`nextSetTarget(cfg, setsSoFarThisSession, rampPlan)`** → the adaptive layer:
  given what's actually been logged this session, return the next row's suggested
  `{weight, reps}`. Normally returns `rampPlan.workingTargets[nextIndex]`, but
  adapts to live performance:
  - Last logged set beat its target with RIR → bump next rung.
  - Last set was `failure`/`tooTired` or fell short → hold or drop the next rung.
  - Falls through to `shouldStop` for the "you've got the stimulus — move on" hint
    (soft, not a hard block).

All pure functions; unit-testable in isolation.

### 4. TODAY screen (`src/components/superset/SessionView.tsx` → `DayPicker`)

- Lists editable day templates + Freestyle + "Not going today" (kept).
- **"+ New day"**: name it, save (empty), then add exercises.
- Each day row has an **edit affordance** (rename, delete, manage exercises).
- Tapping a day starts the session and goes to the active view (no checklist gate).

### 5. Active session (`SessionView` → `ActiveSession` + `ExerciseCard`)

- Header: day name, VOICE (kept), DONE (kept).
- **Full ordered exercise menu always visible** — every exercise in the day, in
  the template's saved order (favorites first). Plus any `extraExerciseIds`.
- **Drag to reorder**; the new order persists to the template via
  `setDayExercises` (so priority sticks for next time).
- Exercises **not done in a while** render muted with a faint "rarely done" tag
  (derived from `exerciseHistory` recency). They sink visually without
  disappearing.
- **+ add an exercise** (search library or quick-add) → `addExerciseToSession`.
- Tapping an exercise expands the guided logger:
  - **Warmup row(s)** pre-filled from last time; tap to confirm/tweak.
  - **Working-set rows**, each showing a faint ramp target ("Set 1 — try 35×12").
    Tap weight/reps to record actuals; tap an effort chip (EZ/HARD/FAIL/DEAD).
    On save, `nextSetTarget` recomputes and the next row's target updates.
  - **Chat box** beneath the rows: type or speak. Two paths:
    - Reporting a completed set ("dropped to 30 for 7, brutal") → `agent.ingest`
      parses → logged set → engine recomputes next row.
    - Giving context before a set ("shoulder feels tweaky today") → a new
      `agent.adjustTarget` action proposes a nudge to the engine baseline;
      `clampAdjustment` bounds it; the row shows the adjusted target + reason
      ("nudged 45→40 because your shoulder felt tweaky").
    Optional one-line coach reply via `coachNote`. The number shown is always the
    engine baseline or the engine-clamped adjustment — never an unbounded LLM
    value.
- An exercise with zero sets at DONE is simply not done (no penalty, no warning).

### 6. OpenAI models (`convex/agent.ts`)

The code currently calls `gpt-5.2`, which OpenAI retired from ChatGPT on
2026-06-12. Upgrade to the current flagship, **GPT-5.5** (released 2026-04-23):

- `ingest` (voice/text → structured sets): `gpt-5.5` — fast, structured-output
  parsing; high reasoning not needed.
- `coachNote` (rephrase engine output): `gpt-5.5`.
- `adjustTarget` (NEW — reason about free-form context to propose a bounded
  nudge): `gpt-5.5` with a high reasoning tier, since this is the only
  judgment-bearing call. Its output is still clamped by `clampAdjustment`.

Model id is centralized in one constant in `agent.ts` so future upgrades are a
one-line change. Graceful degradation already exists (no key → engine rationale
shown verbatim) and is preserved.

## Testing

- **Engine unit tests** (pure functions): `rampPlan` and `nextSetTarget` against
  the user's seeded history (e.g., Seated Shoulder Press 25×12/35×12/45×7/45×4 →
  next-session ramp should push the matching rungs). Cover: overload bump, hold,
  drop on failure, no-history fallback, warmup carry-over.
- **`clampAdjustment` tests**: proposal within band passes through; over-band weight
  clamps to ±1 increment; over-band reps clamp to ±2; baseline returned when no
  proposal.
- **Mutation tests**: day CRUD, reorder, quick-add exercise defaults,
  add-to-session.
- **Manual UI pass**: create a custom day, reorder exercises, log a ramped
  exercise via taps, log one via the chat box, finish with some exercises blank.

## Out of scope / future

- Per-exercise advanced editing UI (rep bands, rest) beyond quick-add defaults —
  a minimal Settings editor only if needed.
- Dropset-specific modeling for Leg Extension (treat as normal ramp for v2).
