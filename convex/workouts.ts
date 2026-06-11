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

export const recentSessions = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db.query("sessions").withIndex("by_date").order("desc").take(30),
});
