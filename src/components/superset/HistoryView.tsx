"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup } from "@/components/ui/item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { CardioSummary } from "./CardioLogger";

const FATIGUE_LABEL: Record<string, string> = { ez: "EZ", struggle: "HARD", failure: "FAIL", tooTired: "DEAD" };
const monthKey = (d: number) => new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" });
const dayLabel = (d: number) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function HistoryView() {
  const summaries = useQuery(api.workouts.sessionSummaries);
  const [selected, setSelected] = useState<Id<"sessions"> | null>(null);

  // Group sessions by month, preserving newest-first order.
  const months = useMemo(() => {
    const out: { label: string; items: NonNullable<typeof summaries> }[] = [];
    for (const s of summaries ?? []) {
      const label = monthKey(s.date);
      const bucket = out.find((m) => m.label === label);
      if (bucket) bucket.items.push(s);
      else out.push({ label, items: [s] });
    }
    return out;
  }, [summaries]);

  if (summaries === undefined) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (selected) return <SessionDetail sessionId={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="p-(--page-padding) flex flex-col gap-4">
      <h2 className="display text-2xl mt-1">HISTORY</h2>

      {summaries.length === 0 ? (
        <Empty className="mt-10">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
            <EmptyTitle>No sessions yet</EmptyTitle>
            <EmptyDescription>Finish a workout and it’ll show up here, newest first.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        months.map((m) => (
          <div key={m.label} className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground px-1">{m.label}</p>
            <ItemGroup className="gap-2">
              {m.items.map((s) => (
                <Item key={s._id} variant="outline" asChild className="cursor-pointer active:bg-muted">
                  <button onClick={() => setSelected(s._id)}>
                    <ItemContent>
                      <ItemTitle className="display text-base">{s.dayName.toUpperCase()}</ItemTitle>
                      <ItemDescription>
                        {dayLabel(s.date)} · {s.exerciseCount} exercises · {s.setCount} sets
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </ItemActions>
                  </button>
                </Item>
              ))}
            </ItemGroup>
          </div>
        ))
      )}
    </div>
  );
}

function SessionDetail({ sessionId, onBack }: { sessionId: Id<"sessions">; onBack: () => void }) {
  const detail = useQuery(api.workouts.sessionDetail, { sessionId });

  if (detail === undefined) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!detail) return <p className="p-6 text-sm text-muted-foreground">Session not found.</p>;

  return (
    <div className="p-(--page-padding) flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={onBack} aria-label="Back">
          <ChevronLeft />
        </Button>
        <div>
          <h2 className="display text-2xl leading-none">{detail.dayName.toUpperCase()}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{dayLabel(detail.date)}</p>
        </div>
      </div>

      {detail.groups.map((g) => (
        <Card key={g.exerciseName} className="gap-0 py-0 overflow-hidden">
          <CardHeader className="py-3 gap-0">
            <CardTitle className="text-sm">{g.exerciseName}</CardTitle>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{g.muscleGroup}</p>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex flex-col gap-1">
              {g.sets.map((s, i) => (
                <div key={s._id} className="flex items-center gap-3 text-sm py-1 border-t border-border first:border-t-0">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground w-12">
                    {s.isWarmup ? "Warm" : `Set ${i + 1}`}
                  </span>
                  <span className="num flex-1 font-medium">{s.weight} <span className="text-muted-foreground">×</span> {s.reps}</span>
                  {s.fatigue && (
                    <Badge variant={s.fatigue === "failure" || s.fatigue === "tooTired" ? "destructive" : "secondary"}
                      className="text-xs">
                      {FATIGUE_LABEL[s.fatigue]}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <CardioSummary sessionId={sessionId} />
    </div>
  );
}
