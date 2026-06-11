// The LLM harness. The model is allowed to do exactly two things:
//   1. ingest  — parse voice/text into structured set data (confirmed by the
//                user before saving)
//   2. explain — phrase the deterministic engine's output like a coach
// It never chooses a weight, rep target, or medication dose. Numbers shown to
// the user always originate in engine.ts.
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";

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
      model: "gpt-5.2",
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
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content:
            `You are a terse, encouraging gym coach. Rephrase the engine's prescription in 1-2 sentences. ` +
            `You MUST keep every number exactly as given — never change or add weights, reps, or percentages. ` +
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
