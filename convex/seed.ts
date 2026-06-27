// One-time seed of personal training history from the Obsidian gym logs
// (~/Documents/Ext-Brain/Improvement/Gym). Personal history is intentionally
// NOT committed anywhere else in the repo. Run on your own deployment:
//   npx convex run seed:run       (fresh install; aborts if already seeded)
//   npx convex run seed:reseed    (wipes workout data and re-imports)
// Open-source users edit or skip this file.
import { mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type SeedSet = [weight: number, reps: number, fatigue?: "ez" | "struggle" | "failure" | "tooTired", warmup?: boolean];

// Set counts and rep ranges follow Naoufal's program (the Nadapt Method).
const EXERCISES: {
  name: string;
  muscleGroup: string;
  repRange: [number, number];
  rest: number;
  increment: number;
  compound: boolean;
  sets: number; // prescribed working sets
}[] = [
  { name: "Bench Press", muscleGroup: "Chest", repRange: [6, 7], rest: 150, increment: 5, compound: true, sets: 5 },
  { name: "Machine Chest Fly", muscleGroup: "Chest", repRange: [9, 10], rest: 90, increment: 10, compound: false, sets: 4 },
  { name: "Incline Dumbell Press", muscleGroup: "Chest", repRange: [8, 10], rest: 90, increment: 5, compound: false, sets: 2 },
  { name: "Skullcrushers", muscleGroup: "Triceps", repRange: [3, 10], rest: 90, increment: 5, compound: false, sets: 4 },
  { name: "Tricep Pushdown", muscleGroup: "Triceps", repRange: [5, 10], rest: 75, increment: 5, compound: false, sets: 4 },
  { name: "Bicep Curls", muscleGroup: "Biceps", repRange: [6, 8], rest: 75, increment: 5, compound: false, sets: 4 },
  { name: "Hammer Curls", muscleGroup: "Biceps", repRange: [4, 8], rest: 75, increment: 5, compound: false, sets: 4 },
  { name: "Sitting Shoulder Press (Dumbbells)", muscleGroup: "Shoulders", repRange: [7, 12], rest: 120, increment: 5, compound: true, sets: 4 },
  { name: "Lateral Raises", muscleGroup: "Shoulders", repRange: [10, 12], rest: 60, increment: 5, compound: false, sets: 3 },
  { name: "Reverse Fly Machine", muscleGroup: "Shoulders", repRange: [8, 12], rest: 75, increment: 10, compound: false, sets: 4 },
  { name: "Horizontal Row Machine", muscleGroup: "Back", repRange: [8, 12], rest: 90, increment: 10, compound: false, sets: 4 },
  { name: "Lat Pull-Down Machine", muscleGroup: "Back", repRange: [10, 12], rest: 90, increment: 7, compound: false, sets: 4 },
  { name: "Squats/ Leg Press", muscleGroup: "Legs", repRange: [8, 12], rest: 150, increment: 10, compound: true, sets: 5 },
  { name: "Leg Extension", muscleGroup: "Legs", repRange: [6, 8], rest: 90, increment: 10, compound: false, sets: 4 },
];

const PROGRAM: [string, string[]][] = [
  ["Day 1: Chest & Arms", ["Bench Press", "Machine Chest Fly", "Incline Dumbell Press", "Skullcrushers", "Tricep Pushdown", "Bicep Curls", "Hammer Curls"]],
  ["Day 3: Shoulders & Back", ["Sitting Shoulder Press (Dumbbells)", "Lateral Raises", "Reverse Fly Machine", "Horizontal Row Machine", "Lat Pull-Down Machine"]],
  ["Day 4: Legs", ["Squats/ Leg Press", "Leg Extension"]],
];

// Each real session from the Obsidian logs, oldest → newest, with its calendar
// date [year, month(1-12), day]. Effort notes mapped: ez/easier → ez;
// hard/struggle → struggle; failed/failure → failure; way too tired → tooTired.
const SESSIONS: { date: [number, number, number]; day: string; entries: [string, SeedSet[]][] }[] = [
  {
    // Day 1 numbers from the Naoufal template (representative chest/arms session).
    date: [2025, 8, 5],
    day: "Day 1: Chest & Arms",
    entries: [
      ["Bench Press", [[45, 12, undefined, true], [90, 10, undefined, true], [135, 6], [145, 6], [150, 4, "struggle"], [160, 3, "failure"], [136, 6, "struggle"]]],
      ["Machine Chest Fly", [[90, 10], [110, 10], [120, 8, "struggle"], [130, 5, "failure"]]],
      ["Incline Dumbell Press", [[35, 8], [35, 5, "failure"]]],
      ["Skullcrushers", [[30, 12], [40, 10], [50, 8, "struggle"], [60, 7, "failure"]]],
      ["Tricep Pushdown", [[33, 12], [44, 10], [44, 8, "struggle"]]],
      ["Bicep Curls", [[25, 10], [30, 6, "struggle"], [35, 4, "failure"], [30, 6]]],
      ["Hammer Curls", [[25, 10], [30, 8], [35, 6, "struggle"], [40, 3, "failure"]]],
    ],
  },
  {
    date: [2025, 8, 7],
    day: "Day 3: Shoulders & Back",
    entries: [
      ["Sitting Shoulder Press (Dumbbells)", [[20, 12, "ez", true], [25, 12, "ez"], [35, 12, "struggle"], [45, 8, "failure"], [45, 4, "failure"]]],
      ["Lateral Raises", [[20, 10, "struggle"], [25, 10, "struggle"], [30, 7, "failure"]]],
      ["Reverse Fly Machine", [[70, 7, "struggle"], [70, 6, "struggle"], [80, 3, "failure"], [60, 10, "tooTired"]]],
      ["Horizontal Row Machine", [[88, 12, "struggle"], [99, 11, "failure"], [104, 10, "struggle"], [110, 7, "failure"]]],
      ["Lat Pull-Down Machine", [[104, 12, "ez"], [110, 12, "ez"], [115, 10, "failure"], [121, 8, "failure"]]],
    ],
  },
  {
    date: [2025, 8, 8],
    day: "Day 4: Legs",
    entries: [
      ["Squats/ Leg Press", [[200, 12], [240, 12], [280, 8, "struggle"], [280, 6, "struggle"], [300, 3, "failure"]]],
      ["Leg Extension", [[125, 12], [165, 12], [185, 12, "struggle"], [205, 8, "failure"]]],
    ],
  },
  {
    date: [2025, 8, 18],
    day: "Day 3: Shoulders & Back",
    entries: [
      ["Sitting Shoulder Press (Dumbbells)", [[25, 12, "ez", true], [30, 12, "ez"], [35, 12, "struggle"], [40, 8, "failure"], [45, 5, "failure"]]],
      ["Lateral Raises", [[20, 10, "struggle"], [25, 12, "ez"], [30, 14, "failure"]]],
      ["Reverse Fly Machine", [[60, 10, "failure"], [70, 6, "failure"], [70, 5, "failure"], [70, 3, "failure"]]],
      ["Horizontal Row Machine", [[88, 12, "struggle"], [99, 12, "struggle"], [104, 6, "failure"], [110, 2, "failure"]]],
      ["Lat Pull-Down Machine", [[104, 12, "ez"], [115, 12, "struggle"], [121, 10, "struggle"], [126, 10, "failure"]]],
    ],
  },
  {
    date: [2025, 9, 8],
    day: "Day 3: Shoulders & Back",
    entries: [
      ["Sitting Shoulder Press (Dumbbells)", [[25, 12, "ez", true], [35, 12, "struggle"], [40, 12, "struggle"], [45, 7, "failure"], [30, 8, "failure"]]],
      ["Lateral Raises", [[25, 12], [30, 12], [35, 12]]],
      ["Lat Pull-Down Machine", [[104, 12]]],
    ],
  },
];

const DEFAULT_NUDGES: [string, string, number][] = [
  ["freezeBottle", "Put a water bottle in the freezer now.", 600],
  ["chargePhone", "Plug your phone in so it's at 100% by gym time.", 240],
  ["planPreview", "Here's today's plan. Leave soon.", 45],
];

async function populate(ctx: MutationCtx) {
  const ids = new Map<string, Id<"exercises">>();
  for (const e of EXERCISES) {
    ids.set(e.name, await ctx.db.insert("exercises", {
      name: e.name, muscleGroup: e.muscleGroup,
      repRangeMin: e.repRange[0], repRangeMax: e.repRange[1],
      restSeconds: e.rest, weightIncrement: e.increment, isCompound: e.compound, workingSets: e.sets,
    }));
  }

  let order = 0;
  const dayIds = new Map<string, Id<"programDays">>();
  for (const [name, exNames] of PROGRAM) {
    const dayId = await ctx.db.insert("programDays", { name, order: order++, exerciseIds: exNames.map((n) => ids.get(n)!) });
    dayIds.set(name, dayId);
  }

  let sets = 0;
  for (const s of SESSIONS) {
    const date = Date.UTC(s.date[0], s.date[1] - 1, s.date[2], 18, 0, 0);
    const sessionId = await ctx.db.insert("sessions", {
      programDayId: dayIds.get(s.day), date, status: "done", notes: "Imported from Obsidian logs",
    });
    let i = 0;
    for (const [exName, exSets] of s.entries) {
      const exerciseId = ids.get(exName)!;
      for (const [weight, reps, fatigue, warmup] of exSets) {
        await ctx.db.insert("sets", {
          sessionId, exerciseId, setIndex: i++, weight, reps, fatigue, isWarmup: warmup ?? false, loggedAt: date,
        });
        sets++;
      }
    }
  }

  for (const [kind, label, mins] of DEFAULT_NUDGES) {
    await ctx.db.insert("nudges", { kind, label, minutesBeforeGym: mins, enabled: true });
  }

  return `Seeded ${EXERCISES.length} exercises, ${PROGRAM.length} days, ${SESSIONS.length} sessions, ${sets} sets.`;
}

async function wipe(ctx: MutationCtx) {
  for (const table of ["sets", "sessions", "programDays", "exercises", "nudges"] as const) {
    const rows = await ctx.db.query(table).collect();
    for (const r of rows) await ctx.db.delete(r._id);
  }
}

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("exercises").collect();
    if (existing.length > 0) return "Already seeded, use seed:reseed to replace.";
    return await populate(ctx);
  },
});

export const reseed = mutation({
  args: {},
  handler: async (ctx) => {
    await wipe(ctx);
    return await populate(ctx);
  },
});
