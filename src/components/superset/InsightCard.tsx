"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Sparkle, RotateCw } from "lucide-react";

export default function InsightCard() {
  const dailyInsight = useAction(api.insight.dailyInsight);
  const [todayStart] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ran = useRef(false);

  const fetchInsight = async () => {
    setLoading(true);
    try {
      setText(await dailyInsight({ todayStart }));
    } catch {
      setText("Could not load an insight right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void fetchInsight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--accent-user)" }}>
          <Sparkle size={12} /> Coach insight
        </span>
        <button onClick={() => void fetchInsight()} disabled={loading} aria-label="Refresh insight"
          className="text-muted-foreground p-1 disabled:opacity-40">
          <RotateCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <p className="text-sm leading-snug">
        {loading && text === null ? "Reading your day…" : text ?? "…"}
      </p>
    </Card>
  );
}
