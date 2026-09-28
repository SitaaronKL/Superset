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
    workingSets: v.optional(v.number()), // prescribed working-set count (Naoufal/Nadapt)
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
    // never training numbers, those come only from the engine.
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

  // Agentic coach chat. One row per message in the conversation.
  chatMessages: defineTable({
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_time", ["createdAt"]),

  // Body-weight log: one entry per weigh-in.
  bodyWeight: defineTable({
    weight: v.number(),
    loggedAt: v.number(),
    note: v.optional(v.string()),
  }).index("by_time", ["loggedAt"]),

  // Cardio log: optionally tied to a workout session.
  cardio: defineTable({
    sessionId: v.optional(v.id("sessions")),
    type: v.string(), // e.g. "Incline walk", "Stairmaster", "Run"
    description: v.optional(v.string()),
    minutes: v.optional(v.number()),
    calories: v.optional(v.number()),
    sweat: v.optional(v.union(v.literal("light"), v.literal("medium"), v.literal("heavy"), v.literal("soaked"))),
    loggedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_time", ["loggedAt"]),

  // Food / consumption log. Each entry is an item with a photo (and optional
  // second photo of the back / nutrition label), recorded for the day.
  foodLogs: defineTable({
    loggedAt: v.number(),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
    itemImage: v.id("_storage"),
    backImage: v.optional(v.id("_storage")),
    // Filled by GPT-5.5 vision from the photos.
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    summary: v.optional(v.string()),
  }).index("by_time", ["loggedAt"]),

  // Hydration log: one row per cup of water.
  waterLogs: defineTable({
    loggedAt: v.number(),
  }).index("by_time", ["loggedAt"]),

  // ---- Skin ----
  // Products the user owns. A product can appear in several routine steps
  // (the moisturizer is AM, PM, and after the shower).
  skinProducts: defineTable({
    name: v.string(),
    brand: v.optional(v.string()),
    zone: v.string(), // "face" | "body" | "face+body"
    kind: v.string(), // Cleanser, Serum, Active, Moisturizer, Sunscreen, Body wash, ...
    why: v.optional(v.string()),
    image: v.optional(v.id("_storage")),
    lastsDays: v.optional(v.number()), // how long one unit lasts, for the refill watch
    openedOn: v.optional(v.string()), // YYYY-MM-DD the current unit was opened
    archived: v.optional(v.boolean()),
  }),

  // One step of the routine. The pure engine (skinEngine.ts) turns these into
  // a concrete AM / PM / shower checklist for any calendar day.
  skinSteps: defineTable({
    productId: v.id("skinProducts"),
    slot: v.union(v.literal("am"), v.literal("pm"), v.literal("shower")),
    order: v.number(),
    howTo: v.optional(v.string()),
    days: v.optional(v.array(v.number())),
    startWeek: v.optional(v.number()),
    ramp: v.optional(v.array(v.object({ week: v.number(), days: v.array(v.number()) }))),
    onShaveDay: v.optional(v.union(v.literal("normal"), v.literal("skip"), v.literal("include"))),
    shaveNote: v.optional(v.string()),
    group: v.optional(v.string()),
  }).index("by_slot_and_order", ["slot", "order"]),

  // What happened on a calendar day: whether they shaved (overrides the default
  // shave weekdays) and which planned steps were checked off.
  skinDays: defineTable({
    dayKey: v.string(), // YYYY-MM-DD in the user's local time
    shaved: v.optional(v.boolean()),
    done: v.array(v.string()), // skinSteps ids, plus "shave"
  }).index("by_dayKey", ["dayKey"]),

  // Face progress photos, with an optional GPT-5.5 read of each.
  skinPhotos: defineTable({
    image: v.id("_storage"),
    takenAt: v.number(),
    note: v.optional(v.string()),
    analysis: v.optional(v.object({
      summary: v.string(),
      observations: v.array(v.string()),
      suggestions: v.array(v.string()),
    })),
  }).index("by_takenAt", ["takenAt"]),

  // Questions asked on the Skin tab ("am I shaving today?") and the answers.
  skinAsks: defineTable({
    question: v.string(),
    answer: v.string(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
});
