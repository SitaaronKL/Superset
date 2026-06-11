"use client";

import { useEffect, useRef, useState } from "react";

export function RestTimer({ seconds, startedAt, onDone }: {
  seconds: number;
  startedAt: number;
  onDone?: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const doneFired = useRef(false);

  useEffect(() => {
    doneFired.current = false;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const elapsed = Math.floor((now - startedAt) / 1000);
  const remaining = Math.max(0, seconds - elapsed);

  useEffect(() => {
    if (remaining === 0 && !doneFired.current) {
      doneFired.current = true;
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      onDone?.();
    }
  }, [remaining, onDone]);

  const pct = seconds > 0 ? remaining / seconds : 0;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="border-2 border-foreground p-3 flex items-center gap-4">
      <span className="display text-4xl tabular-nums" style={remaining === 0 ? { color: "var(--accent-user)" } : undefined}>
        {mm}:{ss}
      </span>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {remaining === 0 ? "GO — next set" : "Rest"}
        </div>
        <div className="h-2 w-full bg-muted">
          <div className="h-2 transition-all" style={{ width: `${pct * 100}%`, background: "var(--accent-user)" }} />
        </div>
      </div>
    </div>
  );
}
