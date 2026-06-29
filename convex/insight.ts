import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";

const MODEL = "gpt-5.5";

// One short coaching line about today's nutrition. The client passes its local
// start-of-today so "today" matches the rest of the Food page.
export const dailyInsight = action({
  args: { todayStart: v.number() },
  handler: async (ctx, { todayStart }): Promise<string> => {
    const logs: { loggedAt: number; calories: number | null; protein: number | null }[] =
      await ctx.runQuery(api.food.listFoodLogs, {});
    const settings: Record<string, string> = await ctx.runQuery(api.settings.getAll, {});

    const todays = logs.filter((l) => l.loggedAt >= todayStart);
    const cal = todays.reduce((s, l) => s + (l.calories ?? 0), 0);
    const pro = todays.reduce((s, l) => s + (l.protein ?? 0), 0);
    const proteinGoal = Number(settings.proteinGoal) || 0;
    const calorieGoal = Number(settings.calorieGoal) || 0;
    const items = todays.length;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      if (items === 0) return "Nothing logged yet today. Snap your first meal to get coaching.";
      const proLeft = proteinGoal ? Math.max(0, proteinGoal - pro) : 0;
      return proteinGoal
        ? `${pro}g protein so far today, ${proLeft}g to hit your goal.`
        : `${cal} cal and ${pro}g protein logged today.`;
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a concise, encouraging fitness nutrition coach. Reply with exactly ONE short, punchy sentence about the user's day so far. " +
            "Focus on protein and calories relative to their goals (protein remaining, calorie surplus or deficit). No medical or dosing advice. Never use em dashes.",
        },
        {
          role: "user",
          content:
            `Today so far: ${cal} calories, ${pro}g protein, across ${items} logged item(s). ` +
            `Goals: ${proteinGoal || "none"} g protein, ${calorieGoal || "none"} calories. Give me one line.`,
        },
      ],
    });
    return response.choices[0].message.content?.trim() || "Keep logging, you're doing great.";
  },
});
