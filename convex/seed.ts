// One-time seed. Personal training history is intentionally NOT committed
// anywhere else in the repo — run `npx convex run seed:run` once on your own
// deployment. Open-source users edit or skip this file.
import { mutation } from "./_generated/server";

const DAY = 24 * 60 * 60 * 1000;

type SeedSet = [weight: number, reps: number, fatigue?: "ez" | "struggle" | "failure" | "tooTired", warmup?: boolean];

const EXERCISES: {
  name: string;
  muscleGroup: string;
  repRange: [number, number];
  rest: number;
  increment: number;
  compound: boolean;
}[] = [
  { name: "Bench Press", muscleGroup: "Chest", repRange: [5, 7], rest: 150, increment: 5, compound: true },
  { name: "Machine Chest Fly", muscleGroup: "Chest", repRange: [8, 10], rest: 90, increment: 10, compound: false },
  { name: "Incline Dumbbell Press", muscleGroup: "Chest", repRange: [8, 10], rest: 90, increment: 5, compound: false },
  { name: "Skullcrushers", muscleGroup: "Triceps", repRange: [8, 12], rest: 90, increment: 5, compound: false },
  { name: "Tricep Pushdown", muscleGroup: "Triceps", repRange: [8, 12], rest: 75, increment: 5, compound: false },
  { name: "Bicep Curls", muscleGroup: "Biceps", repRange: [8, 10], rest: 75, increment: 5, compound: false },
  { name: "Hammer Curls", muscleGroup: "Biceps", repRange: [8, 10], rest: 75, increment: 5, compound: false },
  { name: "Seated Shoulder Press (DB)", muscleGroup: "Shoulders", repRange: [8, 12], rest: 120, increment: 5, compound: true },
  { name: "Lateral Raises", muscleGroup: "Shoulders", repRange: [10, 12], rest: 60, increment: 5, compound: false },
  { name: "Reverse Fly Machine", muscleGroup: "Shoulders", repRange: [8, 12], rest: 75, increment: 10, compound: false },
  { name: "Horizontal Row Machine", muscleGroup: "Back", repRange: [8, 12], rest: 90, increment: 10, compound: false },
  { name: "Lat Pulldown", muscleGroup: "Back", repRange: [10, 12], rest: 90, increment: 7, compound: false },
  { name: "Leg Press", muscleGroup: "Legs", repRange: [8, 12], rest: 150, increment: 10, compound: true },
  { name: "Leg Extension", muscleGroup: "Legs", repRange: [6, 8], rest: 90, increment: 10, compound: false },
];

// From the Obsidian logs, Aug–Sep 2025. Best/most recent session per lift.
const HISTORY: Record<string, { daysAgo: number; sets: SeedSet[] }> = {
  "Bench Press": {
    daysAgo: 275,
    sets: [
      [45, 12, undefined, true],
      [90, 10, undefined, true],
      [135, 6],
      [145, 6],
      [150, 4, "struggle"],
      [160, 3, "failure"],
      [135, 6, "struggle"],
    ],
  },
  "Machine Chest Fly": {
    daysAgo: 275,
    sets: [
      [90, 10],
      [110, 10],
      [120, 8, "struggle"],
      [130, 5, "failure"],
    ],
  },
  "Incline Dumbbell Press": {
    daysAgo: 275,
    sets: [
      [35, 8],
      [35, 5, "failure"],
    ],
  },
  Skullcrushers: {
    daysAgo: 275,
    sets: [
      [30, 12],
      [40, 10],
      [50, 8, "struggle"],
      [60, 7, "failure"],
    ],
  },
  "Tricep Pushdown": {
    daysAgo: 275,
    sets: [
      [33, 12],
      [44, 10],
      [44, 8, "struggle"],
    ],
  },
  "Bicep Curls": {
    daysAgo: 275,
    sets: [
      [25, 10],
      [30, 6, "struggle"],
      [35, 4, "failure"],
      [30, 6],
    ],
  },
  "Hammer Curls": {
    daysAgo: 275,
    sets: [
      [25, 10],
      [30, 8],
      [35, 6, "struggle"],
      [40, 3, "failure"],
    ],
  },
  "Seated Shoulder Press (DB)": {
    daysAgo: 265,
    sets: [
      [20, 12, undefined, true],
      [25, 12],
      [30, 12],
      [35, 7, "struggle"],
      [40, 6, "failure"],
    ],
  },
  "Lat Pulldown": {
    daysAgo: 265,
    sets: [
      [105, 12],
      [119, 10],
      [126, 10, "struggle"],
    ],
  },
  "Horizontal Row Machine": {
    daysAgo: 265,
    sets: [
      [90, 10],
      [110, 7, "failure"],
    ],
  },
  "Leg Press": {
    daysAgo: 260,
    sets: [
      [180, 12, undefined, true],
      [240, 12],
      [280, 12, "struggle"],
      [300, 3, "failure"],
    ],
  },
};

const PROGRAM: [string, string[]][] = [
  ["Chest & Arms", ["Bench Press", "Machine Chest Fly", "Incline Dumbbell Press", "Skullcrushers", "Tricep Pushdown", "Bicep Curls", "Hammer Curls"]],
  ["Shoulders & Back", ["Seated Shoulder Press (DB)", "Lateral Raises", "Reverse Fly Machine", "Horizontal Row Machine", "Lat Pulldown"]],
  ["Legs", ["Leg Press", "Leg Extension"]],
];

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("exercises").collect();
    if (existing.length > 0) return "Already seeded — aborting.";

    const ids = new Map<string, any>();
    for (const e of EXERCISES) {
      ids.set(
        e.name,
        await ctx.db.insert("exercises", {
          name: e.name,
          muscleGroup: e.muscleGroup,
          repRangeMin: e.repRange[0],
          repRangeMax: e.repRange[1],
          restSeconds: e.rest,
          weightIncrement: e.increment,
          isCompound: e.compound,
        })
      );
    }

    let order = 0;
    for (const [name, exNames] of PROGRAM) {
      await ctx.db.insert("programDays", {
        name,
        order: order++,
        exerciseIds: exNames.map((n) => ids.get(n)),
      });
    }

    const now = Date.now();
    const sessionDates = new Map<number, any>();
    for (const [exName, h] of Object.entries(HISTORY)) {
      const date = now - h.daysAgo * DAY;
      if (!sessionDates.has(h.daysAgo)) {
        sessionDates.set(
          h.daysAgo,
          await ctx.db.insert("sessions", { date, status: "done", notes: "Imported from Obsidian logs" })
        );
      }
      const sessionId = sessionDates.get(h.daysAgo);
      let i = 0;
      for (const [weight, reps, fatigue, warmup] of h.sets) {
        await ctx.db.insert("sets", {
          sessionId,
          exerciseId: ids.get(exName),
          setIndex: i++,
          weight,
          reps,
          fatigue,
          isWarmup: warmup ?? false,
          loggedAt: date,
        });
      }
    }

    const defaultNudges: [string, string, number][] = [
      ["freezeBottle", "Put a water bottle in the freezer now.", 600],
      ["chargePhone", "Plug your phone in so it's at 100% by gym time.", 240],
      ["planPreview", "Here's today's plan — leave soon.", 45],
    ];
    for (const [kind, label, mins] of defaultNudges) {
      await ctx.db.insert("nudges", { kind, label, minutesBeforeGym: mins, enabled: true });
    }

    return `Seeded ${EXERCISES.length} exercises, ${PROGRAM.length} program days, history for ${Object.keys(HISTORY).length} lifts.`;
  },
});
