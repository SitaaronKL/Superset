import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const sweat = v.union(
  v.literal("light"),
  v.literal("medium"),
  v.literal("heavy"),
  v.literal("soaked"),
);

// Log a cardio entry. Optionally attach it to an active workout session.
export const addCardio = mutation({
  args: {
    sessionId: v.optional(v.id("sessions")),
    type: v.string(),
    description: v.optional(v.string()),
    minutes: v.optional(v.number()),
    calories: v.optional(v.number()),
    sweat: v.optional(sweat),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cardio", {
      sessionId: args.sessionId,
      type: args.type,
      description: args.description,
      minutes: args.minutes,
      calories: args.calories,
      sweat: args.sweat,
      loggedAt: Date.now(),
    });
  },
});

// All cardio entries for a session, oldest first.
export const sessionCardio = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("cardio")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return rows.sort((a, b) => a.loggedAt - b.loggedAt);
  },
});

// Newest-first cardio entries across all sessions, for dashboard aggregation.
export const recentCardio = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cardio").withIndex("by_time").order("desc").take(300);
  },
});

// Remove a single cardio entry.
export const deleteCardio = mutation({
  args: { id: v.id("cardio") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
