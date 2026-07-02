"use client";

import { Check } from "lucide-react";

const DAY_MS = 24 * 60 * 60 * 1000;

// Consistency as space: the last seven days as one row of circles.
// Filled (inverted) = the thing happened that day. Today wears the accent
// ring because it is the live day. No copy, no guilt.
export function WeekDots({ hits, size = 28 }: {
  hits: boolean[]; // oldest -> today, length 7
  size?: number;
}) {
  const today = new Date();
  return (
    <div className="flex items-center justify-between gap-1">
      {hits.map((hit, i) => {
        const d = new Date(today.getTime() - (6 - i) * DAY_MS);
        const label = d.toLocaleDateString(undefined, { weekday: "narrow" });
        const isToday = i === 6;
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className={`grid place-items-center rounded-full transition-colors ${hit ? "" : "ring-1 ring-foreground/15"}`}
              style={{
                width: size,
                height: size,
                background: hit ? "var(--foreground)" : "transparent",
                color: "var(--background)",
                boxShadow: isToday ? "0 0 0 2px var(--accent-user)" : undefined,
              }}
            >
              <span className={hit ? "" : "opacity-0"}>
                <Check size={size * 0.45} strokeWidth={3} />
              </span>
            </span>
            <span className="text-xs text-muted-foreground leading-none">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Helper: bucket timestamps into the last-7-days hit array.
export function weekHits(timestamps: number[]): boolean[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todayStart = start.getTime();
  const hits = new Array(7).fill(false) as boolean[];
  for (const t of timestamps) {
    const offset = Math.floor((t - todayStart) / DAY_MS); // 0 = today, -1 = yesterday
    if (offset <= 0 && offset > -7) hits[6 + offset] = true;
  }
  return hits;
}
