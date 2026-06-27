import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Step 1 of an upload: the client POSTs the image bytes to this short-lived URL
// and gets back a storage id.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

// Step 2: record the consumption entry referencing the uploaded image(s).
export const addFoodLog = mutation({
  args: {
    itemImage: v.id("_storage"),
    backImage: v.optional(v.id("_storage")),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("foodLogs", { ...args, loggedAt: Date.now() });
  },
});

// Newest-first list with resolved image URLs for display.
export const listFoodLogs = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("foodLogs").withIndex("by_time").order("desc").take(300);
    return await Promise.all(
      logs.map(async (l) => ({
        _id: l._id,
        loggedAt: l.loggedAt,
        name: l.name ?? null,
        notes: l.notes ?? null,
        itemUrl: await ctx.storage.getUrl(l.itemImage),
        backUrl: l.backImage ? await ctx.storage.getUrl(l.backImage) : null,
      }))
    );
  },
});

export const deleteFoodLog = mutation({
  args: { id: v.id("foodLogs") },
  handler: async (ctx, { id }) => {
    const log = await ctx.db.get(id);
    if (!log) return;
    await ctx.storage.delete(log.itemImage);
    if (log.backImage) await ctx.storage.delete(log.backImage);
    await ctx.db.delete(id);
  },
});
