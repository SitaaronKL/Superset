import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Log one cup of water now.
export const addCup = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.db.insert("waterLogs", { loggedAt: Date.now() });
  },
});

// Remove the most recent cup logged since the start of the day.
export const removeCup = mutation({
  args: { start: v.number() },
  handler: async (ctx, { start }) => {
    const latest = await ctx.db
      .query("waterLogs")
      .withIndex("by_time", (q) => q.gte("loggedAt", start))
      .order("desc")
      .first();
    if (latest) await ctx.db.delete(latest._id);
  },
});

// Count cups logged since the start of the day.
export const todayCups = query({
  args: { start: v.number() },
  handler: async (ctx, { start }) => {
    const rows = await ctx.db
      .query("waterLogs")
      .withIndex("by_time", (q) => q.gte("loggedAt", start))
      .collect();
    return rows.length;
  },
});
