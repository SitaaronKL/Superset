"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
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
    <Card className="gap-2 p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Flame size={18} style={{ color: streak > 0 ? "var(--success)" : "var(--muted-foreground)" }} />
          <span className="num display text-xl">{streak}</span>
          <span className="text-xs text-muted-foreground">day protein streak</span>
        </span>
        {!proteinGoal && <span className="text-xs text-muted-foreground">set a protein goal</span>}
      </div>
      {avg && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-baseline gap-1">
            <span className="num text-base font-semibold">{avg.pro}</span>
            <span className="text-muted-foreground">g protein / day (7d)</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="num text-base font-semibold">{avg.cal}</span>
            <span className="text-muted-foreground">cal / day (7d)</span>
          </div>
        </div>
      )}
    </Card>
  );
}
