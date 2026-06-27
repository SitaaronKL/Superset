"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dumbbell, History, Pill, Settings } from "lucide-react";
import SessionView from "@/components/superset/SessionView";
import HistoryView from "@/components/superset/HistoryView";
import MedsView from "@/components/superset/MedsView";
import SettingsView from "@/components/superset/SettingsView";
import { AccentSync } from "@/components/superset/AccentSync";

const TABS = [
  { id: "train", label: "Train", icon: Dumbbell },
  { id: "history", label: "History", icon: History },
  { id: "meds", label: "Meds", icon: Pill },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const [tab, setTab] = useState<TabId>("train");
  const [todayStart] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); });
  const dayStreak = useQuery(api.workouts.dayStreak, { todayStart });

  return (
    <div className="flex min-h-dvh flex-col max-w-md mx-auto w-full">
      <AccentSync />
      <header className="flex items-end justify-between border-b border-foreground/80 px-3 pt-3 pb-2">
        <h1 className="display text-2xl leading-none">
          SUPER<span style={{ color: "var(--accent-user)" }}>SET</span>
        </h1>
        <div className="text-right text-[11px] text-muted-foreground">
          <span className="display text-base text-foreground">{dayStreak ?? 0}</span> day stk
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {tab === "train" && <SessionView />}
        {tab === "history" && <HistoryView />}
        {tab === "meds" && <MedsView />}
        {tab === "settings" && <SettingsView />}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-foreground/80 bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex flex-col items-center gap-0.5 py-2 text-[9px] uppercase tracking-widest"
              style={tab === id ? { color: "var(--accent-user)" } : undefined}>
              <Icon size={18} strokeWidth={tab === id ? 2.5 : 1.5} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
