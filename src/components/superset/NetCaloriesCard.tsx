"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Flame } from "lucide-react";

const ACCENT = "var(--accent-user)";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const sumToday = (
  rows: ReadonlyArray<{ loggedAt: number; calories?: number | null }> | undefined,
  since: number,
) =>
  (rows ?? []).reduce(
    (total, r) => (r.loggedAt >= since ? total + (r.calories ?? 0) : total),
    0,
  );

export default function NetCaloriesCard() {
  const food = useQuery(api.food.listFoodLogs);
  const cardio = useQuery(api.cardio.recentCardio);
  const settings = useQuery(api.settings.getAll);

  const since = useMemo(startOfToday, []);

  const inCals = Math.round(sumToday(food, since));
  const outCals = Math.round(sumToday(cardio, since));
  const net = inCals - outCals;

  const loading = food === undefined || cardio === undefined;
  const goal = Number(settings?.calorieGoal) || 0;
  const remaining = goal ? goal - net : 0;

  return (
    <Card className="rounded-3xl p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium opacity-70">Calories in vs out</span>
        <Flame className="size-4 opacity-50" />
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <>
          <div className="flex items-end gap-2">
            <span className="num display text-5xl leading-none" style={{ color: ACCENT }}>
              {net > 0 ? "+" : ""}
              {net}
            </span>
            <span className="mb-1 text-sm opacity-60">net kcal</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col rounded-2xl bg-muted/50 px-3 py-2">
              <span className="text-[10px] uppercase tracking-widest opacity-50">In</span>
              <span className="num text-lg leading-tight">{inCals}</span>
            </div>
            <div className="flex flex-col rounded-2xl bg-muted/50 px-3 py-2">
              <span className="text-[10px] uppercase tracking-widest opacity-50">Out</span>
              <span className="num text-lg leading-tight">{outCals}</span>
            </div>
          </div>

          {goal > 0 && (
            <div className="flex items-baseline justify-between text-xs pt-1">
              <span className="uppercase tracking-widest text-muted-foreground text-[10px]">
                Goal {goal} kcal
              </span>
              <span className="num">
                {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
              </span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
