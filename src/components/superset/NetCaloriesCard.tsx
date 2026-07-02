"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StatCard } from "./StatCard";
import { Flame } from "lucide-react";

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

  const [since] = useState(() => startOfToday());

  const inCals = Math.round(sumToday(food, since));
  const outCals = Math.round(sumToday(cardio, since));
  const net = inCals - outCals;

  const loading = food === undefined || cardio === undefined;
  const goal = Number(settings?.calorieGoal) || 0;
  const remaining = goal ? goal - net : 0;

  return (
    <StatCard label="Calories in vs out" icon={<Flame />}>
      {loading ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      ) : goal > 0 ? (
        <>
          {/* The derived budget is the hero; the arithmetic stays visible so
              the number is never a mystery. */}
          <div className="flex items-end gap-2">
            <span className="num display text-6xl leading-none"
              style={{ color: remaining >= 0 ? "var(--accent-user)" : "var(--destructive)" }}>
              {Math.abs(remaining)}
            </span>
            <span className="mb-1 text-sm text-muted-foreground">
              kcal {remaining >= 0 ? "left today" : "over today"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Goal</span>
              <span className="num text-lg leading-tight">{goal}</span>
            </div>
            <div className="flex flex-col rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">− Food</span>
              <span className="num text-lg leading-tight">{inCals}</span>
            </div>
            <div className="flex flex-col rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">+ Burn</span>
              <span className="num text-lg leading-tight">{outCals}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <span className="num display text-6xl leading-none" style={{ color: "var(--accent-user)" }}>
              {net > 0 ? "+" : ""}
              {net}
            </span>
            <span className="mb-1 text-sm text-muted-foreground">net kcal</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">In</span>
              <span className="num text-lg leading-tight">{inCals}</span>
            </div>
            <div className="flex flex-col rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Out</span>
              <span className="num text-lg leading-tight">{outCals}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Set a calorie goal in Settings to see what you have left.</p>
        </>
      )}
    </StatCard>
  );
}
