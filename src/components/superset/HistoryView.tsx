"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup } from "@/components/ui/item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp } from "lucide-react";
import { CardioSummary } from "./CardioLogger";
import { Sparkline } from "./Sparkline";

const FATIGUE_LABEL: Record<string, string> = { ez: "EZ", struggle: "HARD", failure: "FAIL", tooTired: "DEAD" };
const monthKey = (d: number) => new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" });
const dayLabel = (d: number) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const shortDate = (d: number) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const weekday = (d: number) => new Date(d).toLocaleDateString(undefined, { weekday: "short" });

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

      {summaries.length > 0 && (
        <div className="flex items-end gap-2 pb-1">
          <span className="num display text-6xl leading-none">{summaries.length}</span>
          <span className="mb-1 text-sm text-muted-foreground">sessions since day one</span>
        </div>
      )}

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
                    {/* Fixed date rail: the scan column for date-first history */}
                    <span className="flex w-11 shrink-0 flex-col items-center leading-none">
                      <span className="num display text-lg">{new Date(s.date).getDate()}</span>
                      <span className="text-xs uppercase text-muted-foreground mt-0.5">{weekday(s.date)}</span>
                    </span>
                    <ItemContent>
                      <ItemTitle className="display text-base truncate">{s.dayName.toUpperCase()}</ItemTitle>
                      <ItemDescription>
                        {s.exerciseCount} exercises · {s.setCount} sets
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      {s.muscleGroup && (
                        <Badge variant="secondary" className="text-xs uppercase">{s.muscleGroup}</Badge>
                      )}
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
  const [trend, setTrend] = useState<{ id: Id<"exercises">; name: string } | null>(null);

  if (detail === undefined) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!detail) return <p className="p-6 text-sm text-muted-foreground">Session not found.</p>;

  return (
    <div className="p-(--page-padding) flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} aria-label="Back"
          className="h-10 w-10 grid place-items-center rounded-full ring-1 ring-foreground/15 active:bg-muted shrink-0">
          <ChevronLeft size={17} />
        </button>
        <div>
          <h2 className="display text-2xl leading-none">{detail.dayName.toUpperCase()}</h2>
          <p className="text-xs text-muted-foreground mt-1">{dayLabel(detail.date)}</p>
        </div>
      </div>

      {detail.groups.map((g) => (
        <Card key={g.exerciseName} className="gap-0 py-0 overflow-hidden">
          <CardHeader className="py-3 gap-0">
            <button onClick={() => setTrend({ id: g.exerciseId, name: g.exerciseName })}
              className="text-left active:opacity-70">
              <CardTitle className="text-sm flex items-center gap-1.5">
                {g.exerciseName}
                <TrendingUp size={13} className="text-muted-foreground" />
              </CardTitle>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{g.muscleGroup}</p>
            </button>
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

      <ExerciseTrendDrawer trend={trend} onClose={() => setTrend(null)} />
    </div>
  );
}

// Tap an exercise name anywhere in history to see how that lift is moving:
// top-set weight per session plus best estimated 1RM.
function ExerciseTrendDrawer({ trend, onClose }: {
  trend: { id: Id<"exercises">; name: string } | null;
  onClose: () => void;
}) {
  const data = useQuery(api.workouts.exerciseTrend, trend ? { exerciseId: trend.id } : "skip");

  return (
    <Drawer open={trend !== null} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-w-md mx-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle className="display text-2xl">{trend?.name}</DrawerTitle>
        </DrawerHeader>
        {data === undefined ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        ) : data.points.length < 2 ? (
          <p className="text-sm text-muted-foreground pb-4">
            Not enough sessions yet. Log this lift a couple more times and the trend shows up here.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-2">
                <span className="num display text-4xl leading-none">{data.points[data.points.length - 1].topWeight}</span>
                <span className="mb-0.5 text-sm text-muted-foreground">top set last time</span>
              </div>
              <div className="text-right">
                <p className="num text-lg leading-none">{data.bestE1RM}</p>
                <p className="text-xs text-muted-foreground">best est. 1RM</p>
              </div>
            </div>
            <Sparkline values={data.points.map((p) => p.topWeight)} height={56}
              refValue={Math.max(...data.points.map((p) => p.topWeight))} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{shortDate(data.points[0].date)}</span>
              <span>{data.points.length} sessions</span>
              <span>{shortDate(data.points[data.points.length - 1].date)}</span>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
