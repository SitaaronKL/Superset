// Long-term agent memory about the user. Memory shapes how the coach talks
// and when nudges fire — it never influences prescribed weights or reps.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("memories").collect();
    return all.filter((m) => !m.archived);
  },
});

export const remember = mutation({
  args: { fact: v.string(), category: v.string(), source: v.string() },
  handler: async (ctx, args) =>
    await ctx.db.insert("memories", { ...args, createdAt: Date.now() }),
});

export const forget = mutation({
  args: { id: v.id("memories") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { archived: true });
  },
});
