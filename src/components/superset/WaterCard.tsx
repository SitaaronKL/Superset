"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StatCard } from "./StatCard";
import { Button } from "@/components/ui/button";
import { Droplet, Droplets, Minus, Plus } from "lucide-react";
import { confirmTap } from "@/lib/confirm";

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
    <StatCard label="Water" icon={<Droplets />}>
      <div className="flex items-end gap-2">
        <span className="num display text-5xl leading-none" style={reached ? { color: "var(--success)" } : undefined}>
          {count}
        </span>
        <span className="mb-1 text-sm text-muted-foreground">/ {goal} cups</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: pips }).map((_, i) => (
          <Droplet
            key={i}
            className="size-5"
            style={{
              color: i < count ? "var(--accent-user)" : "var(--muted-foreground)",
              fill: i < count ? "var(--accent-user)" : "transparent",
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
          onClick={(e) => { confirmTap(e.currentTarget); void removeCup({ start }); }}
          disabled={count === 0}
          aria-label="Remove a cup"
        >
          <Minus className="size-4" />
        </Button>
        <Button className="flex-1 gap-1.5" onClick={(e) => { confirmTap(e.currentTarget); void addCup(); }} aria-label="Add a cup">
          <Plus className="size-4" /> Add cup
        </Button>
      </div>
    </StatCard>
  );
}
