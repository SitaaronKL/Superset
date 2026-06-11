// Medication tracking is a logbook + reminders only. Nothing in this app —
// engine or agent — ever suggests a dose or schedule change.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const meds = await ctx.db.query("medications").collect();
    return meds.filter((m) => !m.archived);
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    kind: v.string(),
    protocol: v.string(),
    reminderHourLocal: v.optional(v.number()),
    reminderDays: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => await ctx.db.insert("medications", args),
});

export const archive = mutation({
  args: { id: v.id("medications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { archived: true });
  },
});

export const logDose = mutation({
  args: {
    medicationId: v.id("medications"),
    dose: v.string(),
    site: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    await ctx.db.insert("medLogs", { ...args, takenAt: Date.now() }),
});

export const logsFor = query({
  args: { medicationId: v.id("medications") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("medLogs")
      .withIndex("by_med", (q) => q.eq("medicationId", args.medicationId))
      .order("desc")
      .take(50),
});
