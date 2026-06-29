"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Scale, Trash2 } from "lucide-react";

const ACCENT = "var(--accent-user)";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const fmtDelta = (n: number) => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));
const dateLabel = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

type Entry = { _id: Id<"bodyWeight">; weight: number; loggedAt: number; note?: string };

function Sparkline({ entries }: { entries: Entry[] }) {
  // entries are newest first; chart oldest left to newest right.
  const points = useMemo(() => [...entries].reverse(), [entries]);
  if (points.length < 2) return null;

  const W = 100;
  const H = 48;
  const pad = 4;
  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (p.weight - min) / span) * (H - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const last = coords[coords.length - 1].split(",");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: 48 }}
      aria-hidden
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={ACCENT}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={ACCENT} />
    </svg>
  );
}

export default function WeightCard() {
  const weights = useQuery(api.weight.listWeights) as Entry[] | undefined;
  const logWeight = useMutation(api.weight.logWeight);
  const deleteWeight = useMutation(api.weight.deleteWeight);

  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const latest = weights?.[0];
  const prev = weights?.[1];

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
    <Card className="rounded-3xl p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium opacity-70">Body weight</span>
        <Scale className="size-4 opacity-50" />
      </div>

      {weights === undefined ? (
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
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
            <span className="mb-1 text-sm opacity-60">lb</span>
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

          <Sparkline entries={weights} />

          <div className="flex items-center justify-between text-[11px] opacity-50">
            <span>{dateLabel(weights[weights.length - 1].loggedAt)}</span>
            <span>{dateLabel(latest!.loggedAt)}</span>
          </div>
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
        <div className="flex items-center justify-between text-xs opacity-60">
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
    </Card>
  );
}
