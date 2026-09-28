import { v } from "convex/values";
import { NO_EM_DASH_RULE, noEmDash } from "./copy";
import { action, internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";

const MODEL = "gpt-5.5";

// The user's program lives here so the coach can recite it on demand (a built-in
// reminder of the source guide).
const NAOUFAL_PROGRAM = `NAOUFAL'S PROGRAM (the "Nadapt Method": ramp weight up each working set; the last 2 sets should be brutal, ~3-4 reps).
Day 1 Chest & Arms: Bench Press (2 warmup + 5 working, ramp to 80-85% PR, top sets 6-7 reps); Machine Chest Fly (4 sets, 9th-10th rep near impossible); Incline Dumbbell Press (2 sets, isolation feel); Skullcrushers (1 warmup + 4 ramping, holy grail for triceps); Tricep Pushdown small bar (4 sets: 2x10 to failure, 2x5 heavy); Standing Bicep Curls (4 sets, last 2 past 6-7 reps, train heavy like armwrestlers); Hammer Curls (4 sets gradually heavier).
Day 2 Rest (cardio 400 cal if cutting).
Day 3 Shoulders & Back: Seated DB Shoulder Press (1 warmup + 4 working, top sets impossible past 7 reps); Lateral Raises (3 sets, ~10 rep range); Reverse Fly Machine (4 sets, rear delt); Horizontal Row Machine (4 sets); Lat Pulldown Machine (4 sets).
Day 4 Legs: Squats/Leg Press (5 sets, go really heavy); Leg Extension (1 heavy set 7-8 reps + 3 dropsets).
Day 5 Rest.
Eat clean: salmon, eggs, grass-fed meat, fruit, raw honey; cut industrial sugar.`;

const NEW_CHAT_TITLE = "New chat";

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

/** Chats for the sidebar, newest activity first. Pinned first, archived excluded. */
export const threads = query({
  args: { search: v.optional(v.string()), archived: v.optional(v.boolean()) },
  handler: async (ctx, { search, archived }) => {
    const all = await ctx.db.query("chatThreads").withIndex("by_updatedAt").order("desc").take(300);
    const wantArchived = archived === true;
    const q = search?.trim().toLowerCase();
    return all
      .filter((t) => Boolean(t.archived) === wantArchived)
      .filter((t) => !q || t.title.toLowerCase().includes(q))
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  },
});

export const thread = query({
  args: { threadId: v.id("chatThreads") },
  handler: async (ctx, { threadId }) => await ctx.db.get(threadId),
});

/** Messages in a chat, oldest first. Without a threadId: the most recent chat (web app compatibility). */
export const history = query({
  args: { threadId: v.optional(v.id("chatThreads")) },
  handler: async (ctx, { threadId }) => {
    let id = threadId;
    if (!id) {
      const latest = await ctx.db.query("chatThreads").withIndex("by_updatedAt").order("desc").first();
      if (!latest) return [];
      id = latest._id;
    }
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_threadId_and_createdAt", (q) => q.eq("threadId", id))
      .order("asc")
      .take(400);
    // Older replies were stored before the no-em-dash rule; clean them on the way out.
    return messages.map((m) => ({ ...m, content: noEmDash(m.content) }));
  },
});

export const createThread = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, { title }) => {
    const now = Date.now();
    return await ctx.db.insert("chatThreads", {
      title: title?.trim() || NEW_CHAT_TITLE,
      autoTitle: !title?.trim(),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const renameThread = mutation({
  args: { threadId: v.id("chatThreads"), title: v.string() },
  handler: async (ctx, { threadId, title }) => {
    const clean = noEmDash(title.trim()).slice(0, 80);
    if (!clean) return;
    await ctx.db.patch(threadId, { title: clean, autoTitle: false });
  },
});

export const setPinned = mutation({
  args: { threadId: v.id("chatThreads"), pinned: v.boolean() },
  handler: async (ctx, { threadId, pinned }) => { await ctx.db.patch(threadId, { pinned }); },
});

export const setArchived = mutation({
  args: { threadId: v.id("chatThreads"), archived: v.boolean() },
  handler: async (ctx, { threadId, archived }) => { await ctx.db.patch(threadId, { archived, pinned: archived ? false : undefined }); },
});

async function deleteThreadAndMessages(ctx: MutationCtx, threadId: Id<"chatThreads">) {
  const messages = await ctx.db
    .query("chatMessages")
    .withIndex("by_threadId_and_createdAt", (q) => q.eq("threadId", threadId))
    .take(1000);
  for (const m of messages) await ctx.db.delete(m._id);
  await ctx.db.delete(threadId);
}

export const deleteThread = mutation({
  args: { threadId: v.id("chatThreads") },
  handler: async (ctx, { threadId }) => { await deleteThreadAndMessages(ctx, threadId); },
});

/** Archived chats: delete them all at once (Settings, like ChatGPT). */
export const deleteArchived = mutation({
  args: {},
  handler: async (ctx) => {
    for (const t of await ctx.db.query("chatThreads").take(300)) {
      if (t.archived) await deleteThreadAndMessages(ctx, t._id);
    }
  },
});

/** Web app compatibility: clears the most recent chat. */
export const clearChat = mutation({
  args: { threadId: v.optional(v.id("chatThreads")) },
  handler: async (ctx, { threadId }) => {
    const id = threadId ?? (await ctx.db.query("chatThreads").withIndex("by_updatedAt").order("desc").first())?._id;
    if (id) await deleteThreadAndMessages(ctx, id);
  },
});

// ---------------------------------------------------------------------------
// Messages and replies
// ---------------------------------------------------------------------------

export const addMessage = internalMutation({
  args: {
    threadId: v.id("chatThreads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("chatMessages", { ...args, createdAt: now });
    await ctx.db.patch(args.threadId, { updatedAt: now });
  },
});

export const ensureThread = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("chatThreads", { title: NEW_CHAT_TITLE, autoTitle: true, createdAt: now, updatedAt: now });
  },
});

export const threadForTitle = internalQuery({
  args: { threadId: v.id("chatThreads") },
  handler: async (ctx, { threadId }) => await ctx.db.get(threadId),
});

export const setAutoTitle = internalMutation({
  args: { threadId: v.id("chatThreads"), title: v.string() },
  handler: async (ctx, { threadId, title }) => {
    const t = await ctx.db.get(threadId);
    if (t?.autoTitle) await ctx.db.patch(threadId, { title, autoTitle: false });
  },
});

/** Drop the last assistant reply so it can be generated again. */
export const dropLastReply = internalMutation({
  args: { threadId: v.id("chatThreads") },
  handler: async (ctx, { threadId }) => {
    const last = await ctx.db
      .query("chatMessages")
      .withIndex("by_threadId_and_createdAt", (q) => q.eq("threadId", threadId))
      .order("desc")
      .first();
    if (last?.role === "assistant") await ctx.db.delete(last._id);
  },
});

/** The coach's reply to the conversation so far, stored in the thread. */
async function replyInThread(
  ctx: import("./_generated/server").ActionCtx,
  threadId: Id<"chatThreads">,
  dayKey?: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const m = "Add your OpenAI key on the Convex deployment to enable the coach.";
    await ctx.runMutation(internal.coach.addMessage, { threadId, role: "assistant", content: m });
    return m;
  }

  const [days, summaries, memories, convo, skinToday]: [
    { name: string; exerciseIds: unknown[] }[],
    { dayName: string; date: number; exerciseCount: number; setCount: number }[],
    { fact: string }[],
    { role: "user" | "assistant"; content: string }[],
    string,
  ] = await Promise.all([
    ctx.runQuery(api.workouts.listProgramDays, {}),
    ctx.runQuery(api.workouts.sessionSummaries, {}),
    ctx.runQuery(api.memories.list, {}),
    ctx.runQuery(api.coach.history, { threadId }),
    ctx.runQuery(api.skin.describeDay, { dayKey: dayKey ?? new Date().toISOString().slice(0, 10) }),
  ]);

  const recent = summaries.slice(0, 8)
    .map((s) => `${new Date(s.date).toLocaleDateString()}: ${s.dayName} (${s.setCount} sets)`).join("; ");
  const dayList = days.map((d) => `${d.name} (${d.exerciseIds.length} exercises)`).join("; ");

  const system =
    `You are the Superset coach: the user's personal training and health agent. Be concise, direct, and motivating. ` +
    `You help them lock in (workouts, morning/night routines, recovery, nutrition). ` +
    `When asked about the program, use this guide verbatim where relevant:\n${NAOUFAL_PROGRAM}\n\n` +
    `Their training days: ${dayList || "none yet"}.\n` +
    `Recent sessions: ${recent || "none logged recently"}.\n` +
    `Known facts about them: ${memories.map((m) => m.fact).join("; ") || "none"}.\n` +
    `Today's skincare, computed by the app (authoritative, do not change it):\n${skinToday}\n` +
    `Never invent specific weights to lift; for exact set targets, tell them the in-app coach on each exercise handles the numbers. No medical or dosing advice. ${NO_EM_DASH_RULE}`;

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: system }, ...convo.map((m) => ({ role: m.role, content: m.content }))],
  });
  const reply = noEmDash(response.choices[0].message.content ?? "Sorry, I blanked. Try again.");
  await ctx.runMutation(internal.coach.addMessage, { threadId, role: "assistant", content: reply });

  // Name a new chat from its first exchange, like ChatGPT.
  const t: { autoTitle?: boolean } | null = await ctx.runQuery(internal.coach.threadForTitle, { threadId });
  if (t?.autoTitle && convo.length > 0) {
    try {
      const named = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: `Name this chat in 2 to 5 words, Title Case, no quotes, no trailing punctuation. ${NO_EM_DASH_RULE}` },
          { role: "user", content: `${convo[0].content}\n\nReply: ${reply.slice(0, 400)}` },
        ],
      });
      const title = noEmDash((named.choices[0].message.content ?? "").replace(/["'.]/g, "").trim()).slice(0, 60);
      if (title) await ctx.runMutation(internal.coach.setAutoTitle, { threadId, title });
    } catch {
      // Naming is best effort; the chat keeps "New chat".
    }
  }
  return reply;
}

/**
 * Send a message. Without threadId a new chat is created. Returns the thread
 * so the client can switch to it, and the reply.
 */
export const send = action({
  // dayKey (YYYY-MM-DD, the user's local date) lets the coach see today's skincare plan.
  args: { content: v.string(), dayKey: v.optional(v.string()), threadId: v.optional(v.id("chatThreads")) },
  handler: async (ctx, { content, dayKey, threadId }): Promise<{ threadId: Id<"chatThreads">; reply: string }> => {
    const id: Id<"chatThreads"> = threadId ?? (await ctx.runMutation(internal.coach.ensureThread, {}));
    await ctx.runMutation(internal.coach.addMessage, { threadId: id, role: "user", content });
    const reply = await replyInThread(ctx, id, dayKey);
    return { threadId: id, reply };
  },
});

/** Replace the last reply with a fresh one. */
export const regenerate = action({
  args: { threadId: v.id("chatThreads"), dayKey: v.optional(v.string()) },
  handler: async (ctx, { threadId, dayKey }): Promise<string> => {
    await ctx.runMutation(internal.coach.dropLastReply, { threadId });
    return await replyInThread(ctx, threadId, dayKey);
  },
});

/** One-time backfill: messages from before chats existed become one chat. */
export const backfillThreads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orphans = (await ctx.db.query("chatMessages").withIndex("by_time").order("asc").take(1000))
      .filter((m) => !m.threadId);
    if (orphans.length === 0) return "Nothing to backfill.";
    const first = orphans.find((m) => m.role === "user");
    const title = first ? first.content.slice(0, 40).trim() : "Earlier chat";
    const id = await ctx.db.insert("chatThreads", {
      title, autoTitle: false, createdAt: orphans[0].createdAt, updatedAt: orphans[orphans.length - 1].createdAt,
    });
    for (const m of orphans) await ctx.db.patch(m._id, { threadId: id });
    return `Moved ${orphans.length} messages into "${title}".`;
  },
});
