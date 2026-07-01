"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "./StatCard";
import { Sparkline } from "./Sparkline";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Scale, Trash2 } from "lucide-react";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const fmtDelta = (n: number) => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));
const dateLabel = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

type Entry = { _id: Id<"bodyWeight">; weight: number; loggedAt: number; note?: string };

export default function WeightCard() {
  const weights = useQuery(api.weight.listWeights) as Entry[] | undefined;
  const settings = useQuery(api.settings.getAll);
  const logWeight = useMutation(api.weight.logWeight);
  const deleteWeight = useMutation(api.weight.deleteWeight);

  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const latest = weights?.[0];
  const prev = weights?.[1];
  const goal = Number(settings?.weightGoal) || 0;

  // Progress from the first weigh-in toward the goal (works for losing or gaining).
  const goalProgress = useMemo(() => {
    if (!goal || !weights || weights.length === 0) return null;
    const start = weights[weights.length - 1].weight;
    const current = weights[0].weight;
    const total = Math.abs(start - goal);
    const done = Math.abs(start - current);
    const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : (current === goal ? 100 : 0);
    const toGo = Math.abs(current - goal);
    return { pct, toGo, reached: toGo < 0.05 };
  }, [goal, weights]);

  const weekAgo = useMemo(() => {
    if (!weights || weights.length === 0) return undefined;
    const target = latest!.loggedAt - WEEK_MS;
    // find the entry closest in time to ~7 days ago (excluding the latest).
    let best: Entry | undefined;
    let bestDiff = Infinity;
    for (const e of weights) {
      if (e._id === latest!._id) continue;
      const diff = Math.abs(e.loggedAt - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = e;
      }
    }
    return best;
  }, [weights, latest]);

  const deltaLast = latest && prev ? latest.weight - prev.weight : undefined;
  const deltaWeek = latest && weekAgo ? latest.weight - weekAgo.weight : undefined;

  const submit = async () => {
    const n = parseFloat(value);
    if (!Number.isFinite(n) || n <= 0 || busy) return;
    setBusy(true);
    try {
      await logWeight({ weight: n });
      setValue("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <StatCard label="Body weight" icon={<Scale />}>
      {weights === undefined ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      ) : weights.length === 0 ? (
        <Empty className="py-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Scale className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No weigh-ins yet</EmptyTitle>
            <EmptyDescription>Log your weight to start tracking.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <span className="num display text-5xl leading-none">
              {latest!.weight.toFixed(1)}
            </span>
            <span className="mb-1 text-sm text-muted-foreground">lb</span>
          </div>

          {(deltaLast !== undefined || deltaWeek !== undefined) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {deltaLast !== undefined && (
                <Badge variant="secondary" className="num font-normal">
                  {fmtDelta(deltaLast)} vs last
                </Badge>
              )}
              {deltaWeek !== undefined && (
                <Badge variant="secondary" className="num font-normal">
                  {fmtDelta(deltaWeek)} this week
                </Badge>
              )}
            </div>
          )}

          <Sparkline values={[...weights].reverse().map((w) => w.weight)} />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{dateLabel(weights[weights.length - 1].loggedAt)}</span>
            <span>{dateLabel(latest!.loggedAt)}</span>
          </div>

          {goalProgress && (
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="uppercase tracking-widest text-muted-foreground">Goal {goal} lb</span>
                <span className="num">{goalProgress.reached ? "reached" : `${goalProgress.toGo.toFixed(1)} lb to go`}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${goalProgress.pct}%`, background: "var(--accent-user)" }} />
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2">
        <Input
          inputMode="decimal"
          placeholder="Weight (lb)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <Button onClick={submit} disabled={busy || value.trim() === ""}>
          Log
        </Button>
      </div>

      {weights && weights.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="num">
            Last: {latest!.weight.toFixed(1)} lb on {dateLabel(latest!.loggedAt)}
          </span>
          <button
            type="button"
            onClick={() => deleteWeight({ id: latest!._id })}
            className="flex items-center gap-1 opacity-70 hover:opacity-100"
            aria-label="Delete latest weigh-in"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </StatCard>
  );
}
