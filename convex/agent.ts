// The LLM harness. The model is allowed to do exactly three things:
//   1. ingest , parse voice/text into structured set data (confirmed by the
//                user before saving)
//   2. explain, phrase the deterministic engine's output like a coach
//   3. adjust , propose a SMALL nudge to the engine's baseline from free-form
//                context (e.g. "shoulder feels tweaky"). The proposal is bounded
//                by engine.clampAdjustment (+/- 1 increment, +/- 2 reps), the
//                engine, not the model, decides what is allowed.
// It never chooses a medication dose, and never produces an unbounded weight or
// rep number. Every number shown to the user originates in or is clamped by
// engine.ts.
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { clampAdjustment } from "./engine";
import OpenAI from "openai";

// Current OpenAI flagship (GPT-5.5, released 2026-04-23). Centralized so future
// upgrades are a one-line change.
const MODEL = "gpt-5.5";

const INGEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          exerciseName: { type: "string" },
          weight: { type: "number" },
          reps: { type: "number" },
          fatigue: { type: ["string", "null"], enum: ["ez", "struggle", "failure", "tooTired", null] },
          isWarmup: { type: "boolean" },
        },
        required: ["exerciseName", "weight", "reps", "fatigue", "isWarmup"],
      },
    },
    memoryCandidates: {
      type: "array",
      description: "Durable facts about the user worth remembering (injuries, preferences, patterns). Empty if none.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          fact: { type: "string" },
          category: { type: "string", enum: ["preference", "pattern", "injury", "motivation"] },
        },
        required: ["fact", "category"],
      },
    },
    readback: { type: "string", description: "One short sentence reading the parsed sets back for confirmation." },
  },
  required: ["sets", "memoryCandidates", "readback"],
} as const;

export interface IngestResult {
  sets: {
    exerciseName: string;
    weight: number;
    reps: number;
    fatigue: "ez" | "struggle" | "failure" | "tooTired" | null;
    isWarmup: boolean;
  }[];
  memoryCandidates: { fact: string; category: string }[];
  readback: string;
}

export const ingest = action({
  args: { transcript: v.string() },
  handler: async (ctx, args): Promise<IngestResult> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set on the Convex deployment.");
    const exercises: { name: string }[] = await ctx.runQuery(api.workouts.listExercises, {});
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            `Parse the user's gym log speech into structured sets. Match exercise names to this list (exact strings): ${exercises.map((e) => e.name).join(", ")}. ` +
            `Map effort words: easy/light → ez; hard/tough/struggle → struggle; failed/couldn't/brutal → failure; exhausted/dead/too tired → tooTired. ` +
            `Only record what the user actually said they did. Never invent weights or reps. If a value is missing, omit that set and mention it in the readback.`,
        },
        { role: "user", content: args.transcript },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "ingest", strict: true, schema: INGEST_SCHEMA as any },
      },
    });
    return JSON.parse(response.choices[0].message.content ?? "{}");
  },
});

export const coachNote = action({
  args: {
    exerciseName: v.string(),
    rationale: v.string(),
    topWeight: v.number(),
    targetRepsMin: v.number(),
    targetRepsMax: v.number(),
  },
  handler: async (ctx, args): Promise<string> => {
    const apiKey = process.env.OPENAI_API_KEY;
    // Graceful degradation: the engine's rationale is already human-readable.
    if (!apiKey) return args.rationale;
    const memories: { fact: string }[] = await ctx.runQuery(api.memories.list, {});
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            `You are a terse, encouraging gym coach. Rephrase the engine's prescription in 1-2 sentences. ` +
            `You MUST keep every number exactly as given, never change or add weights, reps, or percentages. ` +
            `Never give medication or dosing advice. ` +
            `Known facts about the user (use for tone only): ${memories.map((m) => m.fact).join("; ") || "none"}`,
        },
        {
          role: "user",
          content: `${args.exerciseName}: top weight ${args.topWeight}, target ${args.targetRepsMin}-${args.targetRepsMax} reps. Engine says: ${args.rationale}`,
        },
      ],
    });
    return response.choices[0].message.content ?? args.rationale;
  },
});

const ADJUST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    weight: { type: "number", description: "Proposed weight for the next set." },
    reps: { type: "number", description: "Proposed rep target for the next set." },
    reason: { type: "string", description: "One short sentence on why, in a coach's voice." },
  },
  required: ["weight", "reps", "reason"],
} as const;

export interface AdjustResult {
  weight: number;
  reps: number;
  reason: string;
  clamped: boolean;
}

// Hybrid coaching: the model proposes a nudge to the engine's baseline given
// free-form context; the engine clamps it before it is ever returned.
export const adjustTarget = action({
  args: {
    exerciseName: v.string(),
    baselineWeight: v.number(),
    baselineReps: v.number(),
    weightIncrement: v.number(),
    userContext: v.string(),
  },
  handler: async (ctx, args): Promise<AdjustResult> => {
    const baseline = { weight: args.baselineWeight, reps: args.baselineReps };
    const apiKey = process.env.OPENAI_API_KEY;
    // Graceful degradation: no key → no adjustment, baseline stands.
    if (!apiKey) return { ...baseline, reason: "Sticking with the plan.", clamped: false };

    const memories: { fact: string }[] = await ctx.runQuery(api.memories.list, {});
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: MODEL,
      reasoning_effort: "high",
      messages: [
        {
          role: "system",
          content:
            `You are a gym coach adjusting the next set for the user. The engine's baseline is ` +
            `${args.baselineWeight} lb x ${args.baselineReps} reps. Based on the user's context, propose a ` +
            `weight and rep target. Stay within one weight increment (${args.weightIncrement} lb) and ~2 reps of ` +
            `the baseline, small nudges only; the system will clamp anything larger. If the context doesn't ` +
            `warrant a change, return the baseline unchanged. Never give medication advice. ` +
            `Known facts about the user (tone only): ${memories.map((m) => m.fact).join("; ") || "none"}`,
        },
        { role: "user", content: `Exercise: ${args.exerciseName}. Context: ${args.userContext}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "adjust", strict: true, schema: ADJUST_SCHEMA as any },
      },
    });
    const raw = JSON.parse(response.choices[0].message.content ?? "{}");
    const proposed = { weight: Number(raw.weight), reps: Number(raw.reps) };
    const bounded = clampAdjustment(baseline, proposed, args.weightIncrement);
    const clamped = bounded.weight !== proposed.weight || bounded.reps !== proposed.reps;
    return { ...bounded, reason: raw.reason ?? "Adjusted.", clamped };
  },
});
