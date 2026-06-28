import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import OpenAI from "openai";

const MODEL = "gpt-5.5";

// Step 1 of an upload: the client POSTs the image bytes to this short-lived URL
// and gets back a storage id.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

const ANALYZE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", description: "What the food/drink is, concise (e.g. 'Chobani vanilla yogurt')." },
    calories: { type: "number", description: "Calories for the item/serving shown. 0 if unknown." },
    protein: { type: "number", description: "Protein in grams. 0 if unknown." },
    summary: { type: "string", description: "One short line: key macros or a health note." },
  },
  required: ["name", "calories", "protein", "summary"],
} as const;

export interface FoodAnalysis { name: string; calories: number; protein: number; summary: string }

// GPT-5.5 vision reads the item photo (and the label, if provided) to identify
// the food and pull macros.
export const analyze = action({
  args: { itemImage: v.id("_storage"), backImage: v.optional(v.id("_storage")) },
  handler: async (ctx, args): Promise<FoodAnalysis> => {
    const apiKey = process.env.OPENAI_API_KEY;
    const fallback: FoodAnalysis = { name: "", calories: 0, protein: 0, summary: "" };
    if (!apiKey) return fallback;
    const itemUrl = await ctx.storage.getUrl(args.itemImage);
    const backUrl = args.backImage ? await ctx.storage.getUrl(args.backImage) : null;
    if (!itemUrl) return fallback;

    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: "Identify this food or drink. The first image is the item; the second (if present) is its nutrition label, so read exact numbers from it. Estimate for the portion shown if there's no label." },
      { type: "image_url", image_url: { url: itemUrl } },
    ];
    if (backUrl) content.push({ type: "image_url", image_url: { url: backUrl } });

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content }],
      response_format: { type: "json_schema", json_schema: { name: "food", strict: true, schema: ANALYZE_SCHEMA as any } },
    });
    return JSON.parse(response.choices[0].message.content ?? "{}");
  },
});

// Record the consumption entry referencing the uploaded image(s) + analysis.
export const addFoodLog = mutation({
  args: {
    itemImage: v.id("_storage"),
    backImage: v.optional(v.id("_storage")),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    summary: v.optional(v.string()),
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
        calories: l.calories ?? null,
        protein: l.protein ?? null,
        summary: l.summary ?? null,
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
