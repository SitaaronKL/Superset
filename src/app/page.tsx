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
  const streak = useQuery(api.nudges.streak);

  return (
    <div className="flex min-h-dvh flex-col max-w-md mx-auto w-full">
      <AccentSync />
      <header className="flex items-end justify-between border-b-2 border-foreground px-4 pt-5 pb-3">
        <h1 className="display text-3xl leading-none">
          SUPER<span style={{ color: "var(--accent-user)" }}>SET</span>
        </h1>
        <div className="text-right text-xs text-muted-foreground">
          <span className="display text-xl text-foreground">{streak?.weeks ?? 0}</span> wk streak
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {tab === "train" && <SessionView />}
        {tab === "history" && <HistoryView />}
        {tab === "meds" && <MedsView />}
        {tab === "settings" && <SettingsView />}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t-2 border-foreground bg-background">
        <div className="grid grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex flex-col items-center gap-1 py-3 text-[10px] uppercase tracking-widest"
              style={tab === id ? { color: "var(--accent-user)" } : undefined}>
              <Icon size={20} strokeWidth={tab === id ? 2.5 : 1.5} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
