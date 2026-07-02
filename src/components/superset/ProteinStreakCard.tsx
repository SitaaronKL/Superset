"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StatCard } from "./StatCard";
import { WeekDots } from "./WeekDots";
import { Flame } from "lucide-react";

const DAY = 24 * 60 * 60 * 1000;
const dayKey = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export default function ProteinStreakCard() {
  const logs = useQuery(api.food.listFoodLogs);
  const settings = useQuery(api.settings.getAll);
  const proteinGoal = Number(settings?.proteinGoal) || 0;
  const [todayKey] = useState(() => dayKey(Date.now()));

  const byDay = useMemo(() => {
    const map = new Map<number, { cal: number; pro: number }>();
    for (const l of logs ?? []) {
      const k = dayKey(l.loggedAt);
      const cur = map.get(k) ?? { cal: 0, pro: 0 };
      cur.cal += l.calories ?? 0;
      cur.pro += l.protein ?? 0;
      map.set(k, cur);
    }
    return map;
  }, [logs]);

  // Streak: consecutive days (ending today or yesterday) hitting the protein goal.
  const streak = useMemo(() => {
    if (!proteinGoal) return 0;
    const hits = (k: number) => (byDay.get(k)?.pro ?? 0) >= proteinGoal;
    let cursor = hits(todayKey) ? todayKey : hits(todayKey - DAY) ? todayKey - DAY : null;
    if (cursor === null) return 0;
    let n = 0;
    while (hits(cursor)) { n++; cursor -= DAY; }
    return n;
  }, [byDay, proteinGoal, todayKey]);

  // 7-day averages across days that have any logs.
  const avg = useMemo(() => {
    let cal = 0, pro = 0, days = 0;
    for (let i = 0; i < 7; i++) {
      const k = todayKey - i * DAY;
      const d = byDay.get(k);
      if (d) { cal += d.cal; pro += d.pro; days++; }
    }
    return days ? { cal: Math.round(cal / days), pro: Math.round(pro / days), days } : null;
  }, [byDay, todayKey]);

  return (
    <StatCard label="Protein streak"
      icon={<Flame style={{ color: streak > 0 ? "var(--success)" : undefined }} />}>
      <div className="flex items-end gap-2">
        <span className="num display text-5xl leading-none"
          style={streak > 0 ? { color: "var(--success)" } : undefined}>
          {streak}
        </span>
        <span className="mb-1 text-sm text-muted-foreground">{streak === 1 ? "day" : "days"}</span>
      </div>
      {!proteinGoal ? (
        <p className="text-xs text-muted-foreground">Set a protein goal in Settings to start a streak.</p>
      ) : (
        <>
          <WeekDots size={22}
            hits={Array.from({ length: 7 }, (_, i) => (byDay.get(todayKey - (6 - i) * DAY)?.pro ?? 0) >= proteinGoal)} />
          {avg && (
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">protein / day (7d)</span>
                <span className="num font-semibold">{avg.pro}g</span>
              </div>
            </div>
          )}
        </>
      )}
    </StatCard>
  );
}
