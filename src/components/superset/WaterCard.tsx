"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplet, Droplets, Minus, Plus } from "lucide-react";

const ACCENT = "var(--accent-user)";

export default function WaterCard() {
  const [start] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  const cups = useQuery(api.water.todayCups, { start });
  const settings = useQuery(api.settings.getAll);
  const addCup = useMutation(api.water.addCup);
  const removeCup = useMutation(api.water.removeCup);

  const goal = Number(settings?.waterGoal) || 8;
  const count = cups ?? 0;
  const reached = count >= goal;

  // Show one pip per goal cup, plus any extras logged beyond the goal.
  const pips = Math.max(goal, count);

  return (
    <Card className="rounded-3xl p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium opacity-70">Water</span>
        <Droplets className="size-4 opacity-50" />
      </div>

      <div className="flex items-end gap-2">
        <span className="num display text-5xl leading-none" style={reached ? { color: ACCENT } : undefined}>
          {count}
        </span>
        <span className="mb-1 text-sm opacity-60">/ {goal} cups</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: pips }).map((_, i) => (
          <Droplet
            key={i}
            className="size-5"
            style={{
              color: i < count ? ACCENT : "var(--muted-foreground)",
              fill: i < count ? ACCENT : "transparent",
              opacity: i < count ? 1 : 0.4,
            }}
            aria-hidden
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => removeCup({ start })}
          disabled={count === 0}
          aria-label="Remove a cup"
        >
          <Minus className="size-4" />
        </Button>
        <Button className="flex-1 gap-1.5" onClick={() => addCup()} aria-label="Add a cup">
          <Plus className="size-4" /> Add cup
        </Button>
      </div>
    </Card>
  );
}
