import { v, type Infer } from "convex/values";
import { action, internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import OpenAI from "openai";
import {
  DEFAULT_SHAVE_DAYS, SHAVE_STEP_ID, addDays, completion, isShaveDay, planFor, plannedIds,
  rampWeekFor, refillDaysLeft, streak, type DayPlan, type StepConfig,
} from "./skinEngine";
import { SEED_PRODUCTS, SEED_STEPS, SKIN_RULES } from "./skinSeed";
import { NO_EM_DASH_RULE, noEmDash, noEmDashDeep } from "./copy";

const MODEL = "gpt-5.5";

// ---------------------------------------------------------------------------
// Shared loading
// ---------------------------------------------------------------------------

const slotValidator = v.union(v.literal("am"), v.literal("pm"), v.literal("shower"));
const shaveModeValidator = v.union(v.literal("normal"), v.literal("skip"), v.literal("include"));

async function loadSettings(ctx: QueryCtx) {
  const get = async (key: string) =>
    (await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", key)).unique())?.value;
  const startDate = await get("skinStartDate");
  const shaveDaysRaw = await get("skinShaveDays");
  let shaveDays = DEFAULT_SHAVE_DAYS;
  try { if (shaveDaysRaw) shaveDays = JSON.parse(shaveDaysRaw); } catch { /* keep default */ }
  return { startDate: startDate || undefined, shaveDays };
}

async function loadSteps(ctx: QueryCtx): Promise<StepConfig[]> {
  const products = new Map<Id<"skinProducts">, Doc<"skinProducts">>();
  for (const p of await ctx.db.query("skinProducts").take(200)) if (!p.archived) products.set(p._id, p);
  const steps = await ctx.db.query("skinSteps").take(500);
  return steps.flatMap((s) => {
    const p = products.get(s.productId);
    if (!p) return [];
    return [{
      id: s._id, slot: s.slot, order: s.order, productName: p.brand ? `${p.brand} ${p.name}` : p.name,
      kind: p.kind, howTo: s.howTo, days: s.days, startWeek: s.startWeek, ramp: s.ramp,
      onShaveDay: s.onShaveDay, shaveNote: s.shaveNote, group: s.group,
    }];
  });
}

async function dayRecord(ctx: QueryCtx, dayKey: string) {
  return await ctx.db.query("skinDays").withIndex("by_dayKey", (q) => q.eq("dayKey", dayKey)).unique();
}

function planForDay(steps: StepConfig[], settings: { startDate?: string; shaveDays: number[] }, dayKey: string, shavedOverride?: boolean): DayPlan {
  return planFor(steps, {
    dayKey,
    shaved: isShaveDay(dayKey, shavedOverride, settings.shaveDays),
    rampWeek: rampWeekFor(settings.startDate, dayKey),
  });
}

function describePlan(p: DayPlan): string {
  const list = (steps: DayPlan["am"]) =>
    steps.map((s, i) => `${i + 1}. ${s.productName}${s.note ? ` (${s.note})` : ""}`).join("; ") || "nothing";
  return `${p.dayKey} (${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][p.weekday]}), ${p.shaved ? "shave day" : "no shave"}, routine week ${p.rampWeek === 99 ? "steady state" : p.rampWeek}.
AM: ${list(p.am)}
PM: ${list(p.pm)}
Shower: ${list(p.shower)}`;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Today's checklist plus the accountability picture around it. */
export const day = query({
  args: { dayKey: v.string() },
  handler: async (ctx, { dayKey }) => {
    const [steps, settings] = await Promise.all([loadSteps(ctx), loadSettings(ctx)]);
    const today = await dayRecord(ctx, dayKey);
    const plan = planForDay(steps, settings, dayKey, today?.shaved);
    const done = new Set(today?.done ?? []);
    const mark = (list: DayPlan["am"]) => list.map((s) => ({ ...s, done: done.has(s.id) }));

    // The last 14 days, oldest first, today last.
    const history = [];
    for (let i = 13; i >= 0; i--) {
      const key = addDays(dayKey, -i);
      const rec = i === 0 ? today : await dayRecord(ctx, key);
      const p = planForDay(steps, settings, key, rec?.shaved);
      history.push({ dayKey: key, planned: plannedIds(p), done: rec?.done ?? [], plan: p });
    }
    const hasHistory = history.some((d) => d.done.length > 0);

    const yesterday = history[history.length - 2];
    const yDone = new Set(yesterday.done);
    const missedYesterday = hasHistory
      ? [...yesterday.plan.am, ...yesterday.plan.pm, ...yesterday.plan.shower]
          .filter((s) => !yDone.has(s.id))
          .map((s) => ({ slot: s.slot, productName: s.productName }))
      : [];

    const tomorrow = planForDay(steps, settings, addDays(dayKey, 1), (await dayRecord(ctx, addDays(dayKey, 1)))?.shaved);

    return {
      dayKey,
      shaved: plan.shaved,
      shaveIsDefault: today?.shaved === undefined,
      rampWeek: plan.rampWeek,
      startDate: settings.startDate ?? null,
      shaveDays: settings.shaveDays,
      am: mark(plan.am),
      pm: mark(plan.pm),
      shower: mark(plan.shower),
      streak: streak(history),
      week: history.slice(-7).map((d) => ({ dayKey: d.dayKey, completion: completion(d) })),
      adherence14: hasHistory ? history.slice(0, -1).reduce((a, d) => a + completion(d), 0) / 13 : null,
      missedYesterday,
      tomorrow: { shaved: tomorrow.shaved, pmActive: tomorrow.pm.find((s) => s.kind === "Active")?.productName ?? null },
      hasRoutine: steps.length > 0,
    };
  },
});

/** The routine as the editor shows it: products with refill status, steps grouped by slot. */
export const routine = query({
  args: { todayKey: v.string() },
  handler: async (ctx, { todayKey }) => {
    const products = (await ctx.db.query("skinProducts").take(200)).filter((p) => !p.archived);
    const byId = new Map(products.map((p) => [p._id, p]));
    const steps = (await ctx.db.query("skinSteps").take(500))
      .filter((s) => byId.has(s.productId))
      .sort((a, b) => a.order - b.order);
    return {
      products: await Promise.all(products.map(async (p) => ({
        ...p,
        imageUrl: p.image ? await ctx.storage.getUrl(p.image) : null,
        refillDaysLeft: refillDaysLeft(p.openedOn, p.lastsDays, todayKey),
      }))),
      steps: steps.map((s) => {
        const p = byId.get(s.productId)!;
        return { ...s, productName: p.name, brand: p.brand ?? null, kind: p.kind };
      }),
    };
  },
});

export const photos = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("skinPhotos").withIndex("by_takenAt").order("desc").take(60);
    return await Promise.all(rows.map(async (r) => ({ ...r, url: await ctx.storage.getUrl(r.image) })));
  },
});

export const asks = query({
  args: {},
  handler: async (ctx) =>
    (await ctx.db.query("skinAsks").withIndex("by_createdAt").order("desc").take(20)).reverse(),
});

/** Plain-text description of a day's plan; used by the coach and the Q&A action. */
export const describeDay = query({
  args: { dayKey: v.string() },
  handler: async (ctx, { dayKey }): Promise<string> => {
    const [steps, settings] = await Promise.all([loadSteps(ctx), loadSettings(ctx)]);
    if (steps.length === 0) return "No skincare routine set up yet.";
    const rec = await dayRecord(ctx, dayKey);
    const plan = planForDay(steps, settings, dayKey, rec?.shaved);
    const done = new Set(rec?.done ?? []);
    const checked = plannedIds(plan).filter((id) => done.has(id)).length;
    return `${describePlan(plan)}\nChecked off so far: ${checked} of ${plannedIds(plan).length}.`;
  },
});

// ---------------------------------------------------------------------------
// Daily check-off
// ---------------------------------------------------------------------------

export const toggleStep = mutation({
  args: { dayKey: v.string(), stepId: v.string() },
  handler: async (ctx, { dayKey, stepId }) => {
    const rec = await dayRecord(ctx, dayKey);
    if (!rec) {
      await ctx.db.insert("skinDays", { dayKey, done: [stepId] });
      return;
    }
    const done = rec.done.includes(stepId) ? rec.done.filter((d) => d !== stepId) : [...rec.done, stepId];
    await ctx.db.patch(rec._id, { done });
  },
});

/** Mark a whole slot done at once (the "did it all" tap). */
export const completeSlot = mutation({
  args: { dayKey: v.string(), stepIds: v.array(v.string()) },
  handler: async (ctx, { dayKey, stepIds }) => {
    const rec = await dayRecord(ctx, dayKey);
    if (!rec) { await ctx.db.insert("skinDays", { dayKey, done: stepIds }); return; }
    await ctx.db.patch(rec._id, { done: [...new Set([...rec.done, ...stepIds])] });
  },
});

/** Override today's shave status; `null` returns to the default shave weekdays. */
export const setShaved = mutation({
  args: { dayKey: v.string(), shaved: v.union(v.boolean(), v.null()) },
  handler: async (ctx, { dayKey, shaved }) => {
    const rec = await dayRecord(ctx, dayKey);
    const value = shaved === null ? undefined : shaved;
    if (!rec) { await ctx.db.insert("skinDays", { dayKey, shaved: value, done: [] }); return; }
    // Dropping the shave step's check when the shave is undone keeps the day honest.
    const done = value === false ? rec.done.filter((d) => d !== SHAVE_STEP_ID) : rec.done;
    await ctx.db.patch(rec._id, { shaved: value, done });
  },
});

// ---------------------------------------------------------------------------
// Routine editing
// ---------------------------------------------------------------------------

export const saveProduct = mutation({
  args: {
    id: v.optional(v.id("skinProducts")),
    name: v.string(),
    brand: v.optional(v.string()),
    zone: v.string(),
    kind: v.string(),
    why: v.optional(v.string()),
    image: v.optional(v.id("_storage")),
    lastsDays: v.optional(v.number()),
    openedOn: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    if (id) { await ctx.db.patch(id, fields); return id; }
    return await ctx.db.insert("skinProducts", fields);
  },
});

/** Archive a product and drop its steps from the routine. Past check-offs are kept. */
export const archiveProduct = mutation({
  args: { id: v.id("skinProducts") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { archived: true });
    for (const s of await ctx.db.query("skinSteps").take(500)) if (s.productId === id) await ctx.db.delete(s._id);
  },
});

export const saveStep = mutation({
  args: {
    id: v.optional(v.id("skinSteps")),
    productId: v.id("skinProducts"),
    slot: slotValidator,
    order: v.optional(v.number()),
    howTo: v.optional(v.string()),
    days: v.optional(v.array(v.number())),
    startWeek: v.optional(v.number()),
    onShaveDay: v.optional(shaveModeValidator),
    shaveNote: v.optional(v.string()),
    group: v.optional(v.string()),
  },
  handler: async (ctx, { id, order, ...fields }) => {
    if (id) { await ctx.db.patch(id, { ...fields, ...(order !== undefined ? { order } : {}) }); return id; }
    const last = await ctx.db.query("skinSteps")
      .withIndex("by_slot_and_order", (q) => q.eq("slot", fields.slot)).order("desc").first();
    return await ctx.db.insert("skinSteps", { ...fields, order: order ?? (last ? last.order + 1 : 1) });
  },
});

export const deleteStep = mutation({
  args: { id: v.id("skinSteps") },
  handler: async (ctx, { id }) => { await ctx.db.delete(id); },
});

/** Swap a step with its neighbor in the same slot. */
export const moveStep = mutation({
  args: { id: v.id("skinSteps"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, { id, direction }) => {
    const step = await ctx.db.get(id);
    if (!step) return;
    const siblings = await ctx.db.query("skinSteps")
      .withIndex("by_slot_and_order", (q) => q.eq("slot", step.slot)).collect();
    const i = siblings.findIndex((s) => s._id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= siblings.length) return;
    const other = siblings[j];
    await ctx.db.patch(step._id, { order: other.order });
    await ctx.db.patch(other._id, { order: step.order });
  },
});

// A proposed routine, from a recommendation or an import. Same shape the seed uses.
const proposalValidator = v.object({
  summary: v.string(),
  products: v.array(v.object({
    key: v.string(), name: v.string(), brand: v.optional(v.string()),
    zone: v.string(), kind: v.string(), why: v.optional(v.string()),
  })),
  steps: v.array(v.object({
    product: v.string(), slot: slotValidator, order: v.number(),
    howTo: v.optional(v.string()), days: v.optional(v.array(v.number())),
    onShaveDay: v.optional(shaveModeValidator), shaveNote: v.optional(v.string()), group: v.optional(v.string()),
  })),
});
export type Proposal = Infer<typeof proposalValidator>;

/** Replace the current routine with a proposal. Old products are archived, not deleted. */
export const applyRoutine = mutation({
  args: { proposal: proposalValidator, startDate: v.optional(v.string()) },
  handler: async (ctx, { proposal, startDate }) => {
    for (const p of await ctx.db.query("skinProducts").take(200)) if (!p.archived) await ctx.db.patch(p._id, { archived: true });
    for (const s of await ctx.db.query("skinSteps").take(500)) await ctx.db.delete(s._id);
    const ids = new Map<string, Id<"skinProducts">>();
    for (const { key, ...p } of proposal.products) ids.set(key, await ctx.db.insert("skinProducts", p));
    for (const { product, ...s } of proposal.steps) {
      const productId = ids.get(product);
      if (productId) await ctx.db.insert("skinSteps", { ...s, productId });
    }
    if (startDate) await upsertSetting(ctx, "skinStartDate", startDate);
  },
});

async function upsertSetting(ctx: { db: any }, key: string, value: string) {
  const existing = await ctx.db.query("settings").withIndex("by_key", (q: any) => q.eq("key", key)).unique();
  if (existing) await ctx.db.patch(existing._id, { value });
  else await ctx.db.insert("settings", { key, value });
}

/** One-time import of the author's routine from skinSeed.ts. No-op if a routine exists. */
export const seedMine = internalMutation({
  args: { startDate: v.optional(v.string()) },
  handler: async (ctx, { startDate }) => {
    const existing = (await ctx.db.query("skinProducts").take(200)).filter((p) => !p.archived);
    if (existing.length > 0) return "Routine already exists; nothing imported.";
    const ids = new Map<string, Id<"skinProducts">>();
    for (const { key, ...p } of SEED_PRODUCTS) ids.set(key, await ctx.db.insert("skinProducts", p));
    for (const { product, ...s } of SEED_STEPS) await ctx.db.insert("skinSteps", { ...s, productId: ids.get(product)! });
    await upsertSetting(ctx, "skinStartDate", startDate ?? "2026-09-28");
    await upsertSetting(ctx, "skinShaveDays", JSON.stringify(DEFAULT_SHAVE_DAYS));
    return `Imported ${SEED_PRODUCTS.length} products and ${SEED_STEPS.length} steps.`;
  },
});

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const addPhoto = mutation({
  args: { image: v.id("_storage"), note: v.optional(v.string()) },
  handler: async (ctx, args) => await ctx.db.insert("skinPhotos", { ...args, takenAt: Date.now() }),
});

export const deletePhoto = mutation({
  args: { id: v.id("skinPhotos") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return;
    await ctx.storage.delete(row.image);
    await ctx.db.delete(id);
  },
});

export const savePhotoAnalysis = internalMutation({
  args: {
    id: v.id("skinPhotos"),
    analysis: v.object({ summary: v.string(), observations: v.array(v.string()), suggestions: v.array(v.string()) }),
  },
  handler: async (ctx, { id, analysis }) => { await ctx.db.patch(id, { analysis }); },
});

export const photoUrl = query({
  args: { id: v.id("skinPhotos") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    return row ? await ctx.storage.getUrl(row.image) : null;
  },
});

// ---------------------------------------------------------------------------
// AI: answers, photo reads, routine proposals. The engine owns the schedule;
// the model explains it and never overrides it.
// ---------------------------------------------------------------------------

const SAFETY =
  "You are not a doctor. Never diagnose conditions and never recommend prescription medication or dosing. " +
  "For persistent or painful acne, spreading rashes, or changing moles, say to see a dermatologist.";

export const addAsk = internalMutation({
  args: { question: v.string(), answer: v.string() },
  handler: async (ctx, args) => { await ctx.db.insert("skinAsks", { ...args, createdAt: Date.now() }); },
});

export const clearAsks = mutation({
  args: {},
  handler: async (ctx) => { for (const a of await ctx.db.query("skinAsks").take(200)) await ctx.db.delete(a._id); },
});

/** Answer a question like "am I shaving today?" from the engine's plan and the routine's rules. */
export const ask = action({
  args: { question: v.string(), dayKey: v.string() },
  handler: async (ctx, { question, dayKey }): Promise<string> => {
    const [today, tomorrow, yesterday, recent]: [string, string, string, { question: string; answer: string }[]] = await Promise.all([
      ctx.runQuery(api.skin.describeDay, { dayKey }),
      ctx.runQuery(api.skin.describeDay, { dayKey: addDays(dayKey, 1) }),
      ctx.runQuery(api.skin.describeDay, { dayKey: addDays(dayKey, -1) }),
      ctx.runQuery(api.skin.asks, {}),
    ]);
    const apiKey = process.env.OPENAI_API_KEY;
    let answer: string;
    if (!apiKey) {
      answer = `Here is today: ${today}`;
    } else {
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              `You answer questions about the user's skincare and shaving routine. Be brief and specific: one to three short sentences, or a short numbered list when they ask for an order of steps. ` +
              `The schedule below is computed by the app and is authoritative; never contradict it or invent a different schedule.\n\n` +
              `Yesterday: ${yesterday}\n\nToday: ${today}\n\nTomorrow: ${tomorrow}\n\nRules:\n${SKIN_RULES}\n\n${SAFETY} ${NO_EM_DASH_RULE}`,
          },
          ...recent.slice(-6).flatMap((a) => [
            { role: "user" as const, content: a.question },
            { role: "assistant" as const, content: a.answer },
          ]),
          { role: "user", content: question },
        ],
      });
      answer = response.choices[0].message.content?.trim() || "I couldn't answer that. Try asking another way.";
    }
    answer = noEmDash(answer);
    await ctx.runMutation(internal.skin.addAsk, { question, answer });
    return answer;
  },
});

export interface PhotoAnalysis { summary: string; observations: string[]; suggestions: string[] }

const PHOTO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", description: "One or two sentences on what the photo shows, kind and specific." },
    observations: { type: "array", items: { type: "string" }, description: "2 to 4 short, neutral observations (oiliness, visible marks, texture, razor irritation)." },
    suggestions: { type: "array", items: { type: "string" }, description: "1 to 3 short suggestions that fit the user's current routine." },
  },
  required: ["summary", "observations", "suggestions"],
} as const;

/** Read a face photo against the current routine. Descriptive, never diagnostic. */
export const analyzePhoto = action({
  args: { id: v.id("skinPhotos"), dayKey: v.string() },
  handler: async (ctx, { id, dayKey }): Promise<PhotoAnalysis> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Add an OpenAI key on the Convex deployment to read photos.");
    const [url, today]: [string | null, string] = await Promise.all([
      ctx.runQuery(api.skin.photoUrl, { id }),
      ctx.runQuery(api.skin.describeDay, { dayKey }),
    ]);
    if (!url) throw new Error("Photo not found.");
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            `You look at a face progress photo for someone following this skincare routine:\n${today}\nRules:\n${SKIN_RULES}\n` +
            `Describe what you see neutrally and encouragingly, and relate suggestions to their routine. ${SAFETY} ${NO_EM_DASH_RULE}`,
        },
        { role: "user", content: [{ type: "image_url", image_url: { url } }] },
      ],
      response_format: { type: "json_schema", json_schema: { name: "skin_photo", strict: true, schema: PHOTO_SCHEMA as any } },
    });
    const analysis: PhotoAnalysis = noEmDashDeep(JSON.parse(response.choices[0].message.content ?? "{}"));
    await ctx.runMutation(internal.skin.savePhotoAnalysis, { id, analysis });
    return analysis;
  },
});

const NULLABLE_STRING = { type: ["string", "null"] } as const;
const PROPOSAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", description: "Two sentences: what the routine targets and how to start it." },
    products: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          key: { type: "string", description: "Short unique id, e.g. 'cleanser'." },
          name: { type: "string" },
          brand: NULLABLE_STRING,
          zone: { type: "string", enum: ["face", "body", "face+body"] },
          kind: { type: "string", enum: ["Cleanser", "Serum", "Active", "Moisturizer", "Sunscreen", "Body wash", "Treatment", "Other"] },
          why: NULLABLE_STRING,
        },
        required: ["key", "name", "brand", "zone", "kind", "why"],
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          product: { type: "string", description: "A product key." },
          slot: { type: "string", enum: ["am", "pm", "shower"] },
          order: { type: "number" },
          howTo: NULLABLE_STRING,
          days: { type: ["array", "null"], items: { type: "number" }, description: "Weekdays 0 (Sun) to 6. Null means every day." },
          onShaveDay: { type: ["string", "null"], enum: ["normal", "skip", "include", null] },
          shaveNote: NULLABLE_STRING,
          group: { type: ["string", "null"], description: "Same group = at most one per day, e.g. alternating PM actives." },
        },
        required: ["product", "slot", "order", "howTo", "days", "onShaveDay", "shaveNote", "group"],
      },
    },
  },
  required: ["summary", "products", "steps"],
} as const;

function cleanProposal(raw: any): Proposal {
  const orUndef = <T,>(x: T | null | undefined) => (x === null ? undefined : x);
  return {
    summary: noEmDash(String(raw.summary ?? "")),
    products: (raw.products ?? []).map((p: any) => ({
      key: String(p.key), name: noEmDash(String(p.name)), brand: orUndef(p.brand), zone: String(p.zone), kind: String(p.kind), why: orUndef(p.why) && noEmDash(p.why),
    })),
    steps: (raw.steps ?? []).map((s: any) => ({
      product: String(s.product), slot: s.slot, order: Number(s.order), howTo: orUndef(s.howTo) && noEmDash(s.howTo),
      days: orUndef(s.days), onShaveDay: orUndef(s.onShaveDay), shaveNote: orUndef(s.shaveNote) && noEmDash(s.shaveNote), group: orUndef(s.group),
    })),
  };
}

/**
 * Propose a routine. `recommend` builds one from goals (and an optional face
 * photo); `import` turns a pasted routine into structured steps. The user
 * reviews it and calls applyRoutine to adopt it.
 */
export const propose = action({
  args: {
    mode: v.union(v.literal("recommend"), v.literal("import")),
    text: v.optional(v.string()),
    photoId: v.optional(v.id("skinPhotos")),
  },
  handler: async (ctx, { mode, text, photoId }): Promise<Proposal> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Add an OpenAI key on the Convex deployment to build routines.");
    const url = photoId ? await ctx.runQuery(api.skin.photoUrl, { id: photoId }) : null;
    const instructions = mode === "import"
      ? `Convert the user's pasted skincare routine into structured products and steps. Keep their products, order, and schedule exactly; do not add products they did not mention. Use groups for products that alternate nights.`
      : `Build a simple, evidence-based starter routine from the user's goals (and photo, if given): cleanser, moisturizer, and daily SPF, plus at most two actives on alternating nights in the same group. Prefer widely available, fragrance-free products. Add a first-week note in the summary to introduce actives slowly. If they shave, add shave-day behavior (skip exfoliating actives on shave nights).`;
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: text?.trim() || "No extra details." },
    ];
    if (url) content.push({ type: "image_url", image_url: { url } });
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: `${instructions} Steps are ordered within each slot starting at 1. ${SAFETY} ${NO_EM_DASH_RULE}` },
        { role: "user", content },
      ],
      response_format: { type: "json_schema", json_schema: { name: "skin_routine", strict: true, schema: PROPOSAL_SCHEMA as any } },
    });
    return cleanProposal(JSON.parse(response.choices[0].message.content ?? "{}"));
  },
});
