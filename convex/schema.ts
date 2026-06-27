import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const fatigueValidator = v.union(
  v.literal("ez"),
  v.literal("struggle"),
  v.literal("failure"),
  v.literal("tooTired")
);

export default defineSchema({
  ...authTables,

  exercises: defineTable({
    name: v.string(),
    muscleGroup: v.string(),
    repRangeMin: v.number(),
    repRangeMax: v.number(),
    restSeconds: v.number(),
    weightIncrement: v.number(),
    isCompound: v.boolean(),
    archived: v.optional(v.boolean()),
  }).index("by_name", ["name"]),

  programDays: defineTable({
    name: v.string(),
    order: v.number(),
    exerciseIds: v.array(v.id("exercises")),
  }).index("by_order", ["order"]),

  sessions: defineTable({
    programDayId: v.optional(v.id("programDays")),
    date: v.number(),
    status: v.union(v.literal("active"), v.literal("done"), v.literal("skipped")),
    notes: v.optional(v.string()),
    // Exercises added ad-hoc during this session that aren't in the day template.
    // The template's ordered list is the menu; this captures one-offs.
    extraExerciseIds: v.optional(v.array(v.id("exercises"))),
  }).index("by_date", ["date"]),

  sets: defineTable({
    sessionId: v.id("sessions"),
    exerciseId: v.id("exercises"),
    setIndex: v.number(),
    weight: v.number(),
    reps: v.number(),
    fatigue: v.optional(fatigueValidator),
    isWarmup: v.boolean(),
    loggedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_exercise", ["exerciseId", "loggedAt"]),

  nudges: defineTable({
    kind: v.string(), // freezeBottle | chargePhone | leaveNow | planPreview | custom
    label: v.string(),
    minutesBeforeGym: v.number(),
    enabled: v.boolean(),
    lastSentAt: v.optional(v.number()),
  }),

  excuses: defineTable({
    date: v.number(),
    reason: v.string(),
  }).index("by_date", ["date"]),

  medications: defineTable({
    name: v.string(),
    kind: v.string(), // glp1 | peptide | supplement | other
    protocol: v.string(), // user-entered, e.g. "0.5mg weekly, Sunday AM"
    reminderHourLocal: v.optional(v.number()),
    reminderDays: v.optional(v.array(v.number())), // 0-6
    archived: v.optional(v.boolean()),
  }),

  medLogs: defineTable({
    medicationId: v.id("medications"),
    takenAt: v.number(),
    dose: v.string(),
    site: v.optional(v.string()), // injection site rotation
    notes: v.optional(v.string()),
  }).index("by_med", ["medicationId", "takenAt"]),

  memories: defineTable({
    // Long-term agent memory about the user. Shapes tone and nudges,
    // never training numbers — those come only from the engine.
    fact: v.string(),
    category: v.string(), // preference | pattern | injury | motivation
    source: v.string(), // which interaction produced it
    createdAt: v.number(),
    archived: v.optional(v.boolean()),
  }).index("by_category", ["category"]),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  // Food / consumption log. Each entry is an item with a photo (and optional
  // second photo of the back / nutrition label), recorded for the day.
  foodLogs: defineTable({
    loggedAt: v.number(),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
    itemImage: v.id("_storage"),
    backImage: v.optional(v.id("_storage")),
  }).index("by_time", ["loggedAt"]),
});
