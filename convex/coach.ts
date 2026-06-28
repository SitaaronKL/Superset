import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";

const MODEL = "gpt-5.5";

// The user's program lives here so the coach can recite it on demand (a built-in
// reminder of the source guide).
const NAOUFAL_PROGRAM = `NAOUFAL'S PROGRAM (the "Nadapt Method": ramp weight up each working set; the last 2 sets should be brutal, ~3-4 reps).
Day 1 Chest & Arms: Bench Press (2 warmup + 5 working, ramp to 80-85% PR, top sets 6-7 reps); Machine Chest Fly (4 sets, 9th-10th rep near impossible); Incline Dumbbell Press (2 sets, isolation feel); Skullcrushers (1 warmup + 4 ramping, holy grail for triceps); Tricep Pushdown small bar (4 sets: 2x10 to failure, 2x5 heavy); Standing Bicep Curls (4 sets, last 2 past 6-7 reps, train heavy like armwrestlers); Hammer Curls (4 sets gradually heavier).
Day 2 Rest (cardio 400 cal if cutting).
Day 3 Shoulders & Back: Seated DB Shoulder Press (1 warmup + 4 working, top sets impossible past 7 reps); Lateral Raises (3 sets, ~10 rep range); Reverse Fly Machine (4 sets, rear delt); Horizontal Row Machine (4 sets); Lat Pulldown Machine (4 sets).
Day 4 Legs: Squats/Leg Press (5 sets, go really heavy); Leg Extension (1 heavy set 7-8 reps + 3 dropsets).
Day 5 Rest.
Eat clean: salmon, eggs, grass-fed meat, fruit, raw honey; cut industrial sugar.`;

export const history = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("chatMessages").withIndex("by_time").order("asc").take(200),
});

export const clearChat = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("chatMessages").collect();
    for (const m of all) await ctx.db.delete(m._id);
  },
});

export const addMessage = internalMutation({
  args: { role: v.union(v.literal("user"), v.literal("assistant")), content: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", { ...args, createdAt: Date.now() });
  },
});

export const send = action({
  args: { content: v.string() },
  handler: async (ctx, { content }): Promise<string> => {
    await ctx.runMutation(internal.coach.addMessage, { role: "user", content });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const m = "Add your OpenAI key on the Convex deployment to enable the coach.";
      await ctx.runMutation(internal.coach.addMessage, { role: "assistant", content: m });
      return m;
    }

    const [days, summaries, memories, convo]: [
      { name: string; exerciseIds: unknown[] }[],
      { dayName: string; date: number; exerciseCount: number; setCount: number }[],
      { fact: string }[],
      { role: "user" | "assistant"; content: string }[],
    ] = await Promise.all([
      ctx.runQuery(api.workouts.listProgramDays, {}),
      ctx.runQuery(api.workouts.sessionSummaries, {}),
      ctx.runQuery(api.memories.list, {}),
      ctx.runQuery(api.coach.history, {}),
    ]);

    const recent = summaries.slice(0, 8)
      .map((s) => `${new Date(s.date).toLocaleDateString()}: ${s.dayName} (${s.setCount} sets)`).join("; ");
    const dayList = days.map((d) => `${d.name} (${d.exerciseIds.length} exercises)`).join("; ");

    const system =
      `You are the Superset coach: the user's personal training and health agent. Be concise, direct, and motivating. ` +
      `You help them lock in (workouts, morning/night routines, recovery, nutrition). ` +
      `When asked about the program, use this guide verbatim where relevant:\n${NAOUFAL_PROGRAM}\n\n` +
      `Their training days: ${dayList || "none yet"}.\n` +
      `Recent sessions: ${recent || "none logged recently"}.\n` +
      `Known facts about them: ${memories.map((m) => m.fact).join("; ") || "none"}.\n` +
      `Never invent specific weights to lift; for exact set targets, tell them the in-app coach on each exercise handles the numbers. No medical or dosing advice.`;

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: system }, ...convo.map((m) => ({ role: m.role, content: m.content }))],
    });
    const reply = response.choices[0].message.content ?? "Sorry, I blanked. Try again.";
    await ctx.runMutation(internal.coach.addMessage, { role: "assistant", content: reply });
    return reply;
  },
});
