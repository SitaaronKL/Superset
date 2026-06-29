import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const logWeight = mutation({
  args: { weight: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("bodyWeight", {
      weight: args.weight,
      note: args.note,
      loggedAt: Date.now(),
    });
  },
});

export const listWeights = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("bodyWeight")
      .withIndex("by_time")
      .order("desc")
      .take(365);
  },
});

export const deleteWeight = mutation({
  args: { id: v.id("bodyWeight") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
