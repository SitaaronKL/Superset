"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Utensils, MessageCircle } from "lucide-react";
import { BicepsFlexedIcon } from "@/components/ui/biceps-flexed";
import { HistoryIcon } from "@/components/ui/history";
import { SettingsIcon } from "@/components/ui/settings";
import SessionView from "@/components/superset/SessionView";
import HistoryView from "@/components/superset/HistoryView";
import FoodView from "@/components/superset/FoodView";
import CoachView from "@/components/superset/CoachView";
import SettingsView from "@/components/superset/SettingsView";
import { AccentSync } from "@/components/superset/AccentSync";

type AnimatedIconHandle = { startAnimation: () => void; stopAnimation: () => void };
type AnimatedIcon = React.ForwardRefExoticComponent<
  { size?: number } & React.RefAttributes<AnimatedIconHandle>
>;

// Replays the icon's draw-on animation on a loop so the nav is always alive.
function LoopIcon({ Comp, size, delay }: { Comp: AnimatedIcon; size: number; delay: number }) {
  const ref = useRef<AnimatedIconHandle>(null);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(() => {
      ref.current?.startAnimation();
      interval = setInterval(() => ref.current?.startAnimation(), 3200);
    }, delay);
    return () => { clearTimeout(t); if (interval) clearInterval(interval); };
  }, [delay]);
  return <Comp ref={ref} size={size} />;
}

const TABS = [
  { id: "train", label: "Train", icon: BicepsFlexedIcon as unknown as AnimatedIcon },
  { id: "history", label: "History", icon: HistoryIcon as unknown as AnimatedIcon },
  { id: "coach", label: "Coach", icon: null }, // center, agentic chat
  { id: "food", label: "Food", icon: null }, // no animated food icon in the set yet
  { id: "settings", label: "Settings", icon: SettingsIcon as unknown as AnimatedIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const [tab, setTab] = useState<TabId>("train");
  const [todayStart] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const dayStreak = useQuery(api.workouts.dayStreak, { todayStart });

  return (
    <div className="flex min-h-dvh flex-col max-w-md mx-auto w-full">
      <AccentSync />
      <header className="flex items-end justify-between border-b border-foreground/80 px-(--page-padding) pt-3 pb-2">
        <h1 className="display text-2xl leading-none">
          SUPER<span style={{ color: "var(--accent-user)" }}>SET</span>
        </h1>
        <div className="text-right text-xs text-muted-foreground">
          <span className="display text-base text-foreground">{dayStreak ?? 0}</span> day stk
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {tab === "train" && <SessionView />}
        {tab === "history" && <HistoryView />}
        {tab === "coach" && <CoachView />}
        {tab === "food" && <FoodView />}
        {tab === "settings" && <SettingsView />}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-foreground/80 bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {TABS.map(({ id, label, icon: Icon }, i) => {
            if (id === "coach") {
              const active = tab === "coach";
              return (
                <button key={id} onClick={() => setTab("coach")}
                  className="flex flex-col items-center gap-1 py-2 text-xs uppercase tracking-wide">
                  <span className="h-9 w-9 grid place-items-center rounded-full -mt-3 shadow-md ring-2 ring-background"
                    style={{ background: "var(--accent-user)", color: "var(--accent-foreground)", opacity: active ? 1 : 0.85 }}>
                    <MessageCircle size={18} />
                  </span>
                  <span style={active ? { color: "var(--accent-user)" } : undefined}>{label}</span>
                </button>
              );
            }
            return (
              <button key={id} onClick={() => setTab(id)}
                className="flex flex-col items-center gap-1 py-2 text-xs uppercase tracking-wide"
                style={tab === id ? { color: "var(--accent-user)" } : undefined}>
                {Icon ? <LoopIcon Comp={Icon} size={20} delay={i * 500} /> : <Utensils size={20} strokeWidth={1.6} />}
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
