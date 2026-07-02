"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

// The signature in-session moment: when a set is logged, a glass dock rises
// above the tab bar. One draining accent ring, one big mono countdown, the
// engine's next prescription, and exactly two actions (+15s / skip).
export function RestTimer({ seconds, startedAt, nextLabel, onSkip, onDone }: {
  seconds: number;
  startedAt: number;
  nextLabel?: string | null;
  onSkip?: () => void;
  onDone?: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [extra, setExtra] = useState(0);
  const doneFired = useRef(false);

  useEffect(() => {
    doneFired.current = false;
    setExtra(0);
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const total = seconds + extra;
  const elapsed = Math.floor((now - startedAt) / 1000);
  const remaining = Math.max(0, total - elapsed);

  useEffect(() => {
    if (remaining === 0 && !doneFired.current) {
      doneFired.current = true;
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      onDone?.();
    }
  }, [remaining, onDone]);

  const pct = total > 0 ? remaining / total : 0;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const done = remaining === 0;

  // Draining ring
  const R = 20;
  const C = 2 * Math.PI * R;

  return (
    <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-(--page-padding)">
      <div className="glass rise-in rounded-card ring-1 ring-foreground/15 shadow-lg p-3 flex items-center gap-3">
        <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0 -rotate-90" aria-hidden>
          <circle cx="24" cy="24" r={R} fill="none" stroke="var(--muted)" strokeWidth="4" />
          <circle cx="24" cy="24" r={R} fill="none" stroke="var(--accent-user)" strokeWidth="4"
            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-300 ease-linear" />
        </svg>

        <div className="min-w-0 flex-1 flex items-center gap-3">
          <span className="display text-4xl leading-none tabular-nums shrink-0"
            style={done ? { color: "var(--accent-user)" } : undefined}>
            {done ? "GO" : `${mm}:${ss}`}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {done ? "Go" : "Next"}
            </p>
            {nextLabel && (
              <p className="num text-base truncate">{nextLabel}</p>
            )}
          </div>
        </div>

        {!done && (
          <button onClick={() => setExtra((e) => e + 15)}
            className="num h-9 px-3 rounded-full ring-1 ring-foreground/15 text-sm shrink-0 active:bg-muted">
            +15
          </button>
        )}
        <button onClick={onSkip} aria-label={done ? "Dismiss" : "Skip rest"}
          className="h-9 w-9 grid place-items-center rounded-full ring-1 ring-foreground/15 shrink-0 active:bg-muted">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
