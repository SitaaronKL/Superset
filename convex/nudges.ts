import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("nudges").collect(),
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("nudges")),
    kind: v.string(),
    label: v.string(),
    minutesBeforeGym: v.number(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    if (id) await ctx.db.patch(id, fields);
    else await ctx.db.insert("nudges", fields);
  },
});

export const remove = mutation({
  args: { id: v.id("nudges") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const logExcuse = mutation({
  args: { reason: v.string() },
  handler: async (ctx, args) =>
    await ctx.db.insert("excuses", { date: Date.now(), reason: args.reason }),
});

export const excuseLedger = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db.query("excuses").withIndex("by_date").order("desc").take(100),
});

/** Workout streak: consecutive calendar weeks (ending now) with >= 1 done session. */
export const streak = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").withIndex("by_date").order("desc").take(200);
    const done = sessions.filter((s) => s.status === "done" && s.notes !== "Imported from Obsidian logs");
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    let streak = 0;
    let cursor = Date.now();
    while (done.some((s) => s.date <= cursor && s.date > cursor - WEEK)) {
      streak++;
      cursor -= WEEK;
    }
    return { weeks: streak, totalWorkouts: done.length };
  },
});

// ---- Scheduled delivery ----------------------------------------------------

export const due = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").collect();
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const gymHour = map.gymHour ? Number(map.gymHour) : null; // local hour, e.g. 18
    const tzOffsetMinutes = map.tzOffsetMinutes ? Number(map.tzOffsetMinutes) : 0;
    const gymDays = map.gymDays ? (JSON.parse(map.gymDays) as number[]) : [];
    const email = map.email ?? null;
    if (gymHour === null || !email) return { toSend: [], email: null };

    const now = Date.now();
    const local = new Date(now - tzOffsetMinutes * 60 * 1000);
    if (!gymDays.includes(local.getUTCDay())) return { toSend: [], email: null };

    const gymTimeToday = Date.UTC(
      local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), gymHour
    ) + tzOffsetMinutes * 60 * 1000;

    const nudges = await ctx.db.query("nudges").collect();
    const WINDOW = 16 * 60 * 1000; // cron runs every 15 min
    const toSend = nudges.filter((n) => {
      if (!n.enabled) return false;
      const fireAt = gymTimeToday - n.minutesBeforeGym * 60 * 1000;
      const alreadyToday = n.lastSentAt && now - n.lastSentAt < 20 * 60 * 60 * 1000;
      return !alreadyToday && now >= fireAt && now - fireAt < WINDOW;
    });
    return { toSend, email };
  },
});

export const markSent = internalMutation({
  args: { id: v.id("nudges") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lastSentAt: Date.now() });
  },
});

export const deliver = internalAction({
  args: {},
  handler: async (ctx) => {
    const { toSend, email } = await ctx.runQuery(internal.nudges.due, {});
    if (!email || toSend.length === 0) return;
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("RESEND_API_KEY not set, would have sent:", toSend.map((n) => n.label));
      return;
    }
    for (const n of toSend) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.NUDGE_FROM ?? "Superset <onboarding@resend.dev>",
          to: [email],
          subject: `Superset: ${n.label}`,
          text: `${n.label}\n\nNo excuses today. Superset`,
        }),
      });
      if (res.ok) await ctx.runMutation(internal.nudges.markSent, { id: n._id });
      else console.error("Resend error", await res.text());
    }
  },
});
