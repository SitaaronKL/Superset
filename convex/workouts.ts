import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fatigueValidator } from "./schema";
import { prescribe, shouldStop, bestE1RM, type SetRecord } from "./engine";
import type { Doc, Id } from "./_generated/dataModel";

async function lastTwoSessionsFor(
  ctx: { db: any },
  exerciseId: Id<"exercises">
): Promise<{ sets: SetRecord[]; date: number }[]> {
  const recent = await ctx.db
    .query("sets")
    .withIndex("by_exercise", (q: any) => q.eq("exerciseId", exerciseId))
    .order("desc")
    .take(100);
  const bySession = new Map<string, { sets: SetRecord[]; date: number }>();
  for (const s of recent) {
    const k = s.sessionId as string;
    if (!bySession.has(k)) bySession.set(k, { sets: [], date: s.loggedAt });
    bySession.get(k)!.sets.push(s);
  }
  return [...bySession.values()].sort((a, b) => b.date - a.date).slice(0, 2);
}

export const listExercises = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("exercises").collect();
    return all.filter((e) => !e.archived);
  },
});

export const listProgramDays = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db.query("programDays").withIndex("by_order").collect(),
});

export const activeSession = query({
  args: {},
  handler: async (ctx) => {
    const recent = await ctx.db.query("sessions").withIndex("by_date").order("desc").take(5);
    return recent.find((s) => s.status === "active") ?? null;
  },
});

// ---- Day template editing -------------------------------------------------

export const createProgramDay = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("programDays").withIndex("by_order").collect();
    const nextOrder = all.reduce((m, d) => Math.max(m, d.order), -1) + 1;
    return await ctx.db.insert("programDays", { name: args.name, order: nextOrder, exerciseIds: [] });
  },
});

export const renameProgramDay = mutation({
  args: { id: v.id("programDays"), name: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { name: args.name });
  },
});

export const deleteProgramDay = mutation({
  args: { id: v.id("programDays") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const reorderProgramDays = mutation({
  args: { orderedIds: v.array(v.id("programDays")) },
  handler: async (ctx, args) => {
    await Promise.all(args.orderedIds.map((id, i) => ctx.db.patch(id, { order: i })));
  },
});

// Sets the ordered exercise list for a day. Array order IS the user's preferred
// order (favorites first) — also used by drag-to-reorder in the session view.
export const setDayExercises = mutation({
  args: { id: v.id("programDays"), exerciseIds: v.array(v.id("exercises")) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { exerciseIds: args.exerciseIds });
  },
});

// Quick-add a reusable exercise. Compound vs isolation picks sensible defaults
// for rep range / rest / increment; editable later in Settings.
export const createExercise = mutation({
  args: { name: v.string(), muscleGroup: v.string(), isCompound: v.boolean() },
  handler: async (ctx, args) => {
    const d = args.isCompound
      ? { repRangeMin: 5, repRangeMax: 7, restSeconds: 150, weightIncrement: 5 }
      : { repRangeMin: 8, repRangeMax: 12, restSeconds: 90, weightIncrement: 5 };
    return await ctx.db.insert("exercises", {
      name: args.name,
      muscleGroup: args.muscleGroup,
      isCompound: args.isCompound,
      ...d,
    });
  },
});

export const addExerciseToSession = mutation({
  args: { sessionId: v.id("sessions"), exerciseId: v.id("exercises") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    const extra = session.extraExerciseIds ?? [];
    if (!extra.includes(args.exerciseId)) {
      await ctx.db.patch(args.sessionId, { extraExerciseIds: [...extra, args.exerciseId] });
    }
  },
});

export const startSession = mutation({
  args: { programDayId: v.optional(v.id("programDays")) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      programDayId: args.programDayId,
      date: Date.now(),
      status: "active",
    });
  },
});

export const finishSession = mutation({
  args: { sessionId: v.id("sessions"), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { status: "done", notes: args.notes });
  },
});

// Exit a session without finishing it: deletes the session and any sets logged
// in it. Used by the "back" affordance so a started day isn't a dead end.
export const discardSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const s of sets) await ctx.db.delete(s._id);
    await ctx.db.delete(args.sessionId);
  },
});

export const logSet = mutation({
  args: {
    sessionId: v.id("sessions"),
    exerciseId: v.id("exercises"),
    setIndex: v.number(),
    weight: v.number(),
    reps: v.number(),
    fatigue: v.optional(fatigueValidator),
    isWarmup: v.boolean(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("sets", { ...args, loggedAt: Date.now() });
    const exercise = (await ctx.db.get(args.exerciseId))!;
    const sessionSets = await ctx.db
      .query("sets")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const thisExercise = sessionSets.filter((s) => s.exerciseId === args.exerciseId);
    const stop = shouldStop(exercise, thisExercise);
    return { setId: id, ...stop };
  },
});

export const updateSet = mutation({
  args: {
    setId: v.id("sets"),
    weight: v.number(),
    reps: v.number(),
    fatigue: v.optional(fatigueValidator),
    isWarmup: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { setId, ...patch } = args;
    await ctx.db.patch(setId, patch);
  },
});

export const deleteSet = mutation({
  args: { setId: v.id("sets") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.setId);
  },
});

export const sessionSets = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("sets")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect(),
});

export const prescriptionFor = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, args) => {
    const exercise = (await ctx.db.get(args.exerciseId))!;
    const history = await lastTwoSessionsFor(ctx, args.exerciseId);
    const last = history[0] ?? null;
    const prev = history[1] ?? null;
    const belowFloor = (s: { sets: SetRecord[] } | null) => {
      if (!s) return false;
      const working = s.sets.filter((x) => !x.isWarmup);
      return working.length > 0 && working.every((x) => x.reps < exercise.repRangeMin);
    };
    return prescribe(
      exercise,
      last?.sets ?? [],
      last?.date ?? null,
      Date.now(),
      belowFloor(prev)
    );
  },
});

export const exerciseHistory = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, args) => {
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_exercise", (q) => q.eq("exerciseId", args.exerciseId))
      .order("desc")
      .take(300);
    const bySession = new Map<string, Doc<"sets">[]>();
    for (const s of sets) {
      const k = s.sessionId as string;
      if (!bySession.has(k)) bySession.set(k, []);
      bySession.get(k)!.push(s);
    }
    return [...bySession.entries()]
      .map(([sessionId, ss]) => ({
        sessionId,
        date: Math.min(...ss.map((x) => x.loggedAt)),
        sets: ss.sort((a, b) => a.setIndex - b.setIndex),
        e1RM: Math.round(bestE1RM(ss)),
      }))
      .sort((a, b) => b.date - a.date);
  },
});

// The most recent COMPLETED session's sets for an exercise, ordered by setIndex.
// Drives warmup carry-over and the ramp plan. Excludes the active session so
// today's in-progress sets don't feed back into today's targets.
export const lastSessionSetsFor = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, args) => {
    const recent = await ctx.db
      .query("sets")
      .withIndex("by_exercise", (q) => q.eq("exerciseId", args.exerciseId))
      .order("desc")
      .take(100);
    const bySession = new Map<string, Doc<"sets">[]>();
    for (const s of recent) {
      const k = s.sessionId as string;
      if (!bySession.has(k)) bySession.set(k, []);
      bySession.get(k)!.push(s);
    }
    for (const [sessionId, ss] of [...bySession.entries()].sort(
      (a, b) => Math.max(...b[1].map((x) => x.loggedAt)) - Math.max(...a[1].map((x) => x.loggedAt))
    )) {
      const session = await ctx.db.get(sessionId as Id<"sessions">);
      if (session && session.status === "done") {
        return ss
          .sort((a, b) => a.setIndex - b.setIndex)
          .map((s) => ({ weight: s.weight, reps: s.reps, fatigue: s.fatigue, isWarmup: s.isWarmup }));
      }
    }
    return [];
  },
});

// Map of exerciseId -> last loggedAt, for the "rarely done" muting in the menu.
export const exerciseRecency = query({
  args: {},
  handler: async (ctx) => {
    const sets = await ctx.db.query("sets").collect();
    const last: Record<string, number> = {};
    for (const s of sets) {
      const k = s.exerciseId as string;
      if (!last[k] || s.loggedAt > last[k]) last[k] = s.loggedAt;
    }
    return last;
  },
});

export const recentSessions = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db.query("sessions").withIndex("by_date").order("desc").take(30),
});

// Consecutive-day training streak ending today or yesterday. The client passes
// the local start-of-today so day boundaries match the user's timezone.
export const dayStreak = query({
  args: { todayStart: v.number() },
  handler: async (ctx, { todayStart }) => {
    const DAY = 24 * 60 * 60 * 1000;
    const sessions = (
      await ctx.db.query("sessions").withIndex("by_date").order("desc").take(200)
    ).filter((s) => s.status === "done");
    const trained = new Set(sessions.map((s) => Math.floor((s.date - todayStart) / DAY)));
    // dayOffset 0 = today, -1 = yesterday, ...
    let streak = 0;
    let cursor = trained.has(0) ? 0 : trained.has(-1) ? -1 : null;
    if (cursor === null) return 0;
    while (trained.has(cursor)) {
      streak++;
      cursor--;
    }
    return streak;
  },
});

// Aggregate stats for a date range [start, end). Powers the Train dashboard's
// monthly metrics (workouts / working sets / total volume). The client passes
// calendar-month boundaries so the query stays deterministic.
export const rangeStats = query({
  args: { start: v.number(), end: v.number() },
  handler: async (ctx, { start, end }) => {
    const sessions = (
      await ctx.db
        .query("sessions")
        .withIndex("by_date", (q) => q.gte("date", start).lt("date", end))
        .collect()
    ).filter((s) => s.status === "done");
    let sets = 0;
    let volume = 0;
    for (const s of sessions) {
      const ss = await ctx.db
        .query("sets")
        .withIndex("by_session", (q) => q.eq("sessionId", s._id))
        .collect();
      for (const x of ss) {
        if (!x.isWarmup) {
          sets++;
          volume += x.weight * x.reps;
        }
      }
    }
    return { workouts: sessions.length, sets, volume };
  },
});

// Date-first history: one row per completed session, newest first, with the day
// name and a quick summary. The History tab lists these; tapping one opens detail.
export const sessionSummaries = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").withIndex("by_date").order("desc").take(200);
    const done = sessions.filter((s) => s.status === "done");
    return await Promise.all(
      done.map(async (s) => {
        const sets = await ctx.db
          .query("sets")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .collect();
        const day = s.programDayId ? await ctx.db.get(s.programDayId) : null;
        const exerciseIds = new Set(sets.map((x) => x.exerciseId as string));
        return {
          _id: s._id,
          date: s.date,
          dayName: day?.name ?? "Freestyle",
          exerciseCount: exerciseIds.size,
          setCount: sets.filter((x) => !x.isWarmup).length,
        };
      })
    );
  },
});

// Full log of one session, grouped by exercise (the Obsidian-style day table).
export const sessionDetail = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    const sets = await ctx.db
      .query("sets")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const day = session.programDayId ? await ctx.db.get(session.programDayId) : null;

    const groups = new Map<string, { exerciseName: string; muscleGroup: string; sets: Doc<"sets">[] }>();
    for (const s of sets.sort((a, b) => a.setIndex - b.setIndex)) {
      const key = s.exerciseId as string;
      if (!groups.has(key)) {
        const ex = await ctx.db.get(s.exerciseId);
        groups.set(key, { exerciseName: ex?.name ?? "—", muscleGroup: ex?.muscleGroup ?? "", sets: [] });
      }
      groups.get(key)!.sets.push(s);
    }
    return { date: session.date, dayName: day?.name ?? "Freestyle", groups: [...groups.values()] };
  },
});
