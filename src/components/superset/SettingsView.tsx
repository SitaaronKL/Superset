"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const ACCENTS: { name: string; value: string }[] = [
  { name: "Signal Red", value: "oklch(0.55 0.22 25)" },
  { name: "Volt", value: "oklch(0.85 0.25 130)" },
  { name: "Cobalt", value: "oklch(0.55 0.2 260)" },
  { name: "Tangerine", value: "oklch(0.7 0.19 50)" },
  { name: "Hot Pink", value: "oklch(0.65 0.26 350)" },
  { name: "Cyan", value: "oklch(0.75 0.15 210)" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SettingsView() {
  const { signOut } = useAuthActions();
  const settings = useQuery(api.settings.getAll);
  const setSetting = useMutation(api.settings.set);
  const nudges = useQuery(api.nudges.list);
  const upsertNudge = useMutation(api.nudges.upsert);
  const memories = useQuery(api.memories.list);
  const forget = useMutation(api.memories.forget);

  const [email, setEmail] = useState<string | null>(null);
  const [gymHour, setGymHour] = useState<string | null>(null);

  if (!settings) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  const gymDays: number[] = settings.gymDays ? JSON.parse(settings.gymDays) : [];
  const toggleDay = (d: number) => {
    const next = gymDays.includes(d) ? gymDays.filter((x) => x !== d) : [...gymDays, d];
    setSetting({ key: "gymDays", value: JSON.stringify(next) });
    setSetting({ key: "tzOffsetMinutes", value: String(new Date().getTimezoneOffset()) });
  };

  return (
    <div className="p-4 flex flex-col gap-6">
      <h2 className="display text-3xl">SETTINGS</h2>

      <section className="flex flex-col gap-2">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">Accent color</h3>
        <div className="grid grid-cols-6 gap-2">
          {ACCENTS.map((a) => (
            <button key={a.name} title={a.name} onClick={() => setSetting({ key: "accent", value: a.value })}
              className="aspect-square border-2"
              style={{
                background: a.value,
                borderColor: settings.accent === a.value ? "var(--foreground)" : "transparent",
              }} />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs">Light mode</span>
          <Switch checked={settings.theme === "light"}
            onCheckedChange={(on) => setSetting({ key: "theme", value: on ? "light" : "dark" })} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">Gym schedule (drives nudges)</h3>
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((d, i) => (
            <button key={d} onClick={() => toggleDay(i)} className="border-2 border-foreground py-2 text-[10px]"
              style={gymDays.includes(i) ? { background: "var(--accent-user)", borderColor: "var(--accent-user)", color: "white" } : undefined}>
              {d.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input inputMode="numeric" placeholder="gym hour (0-23)"
            value={gymHour ?? settings.gymHour ?? ""}
            onChange={(e) => setGymHour(e.target.value)}
            onBlur={() => gymHour !== null && setSetting({ key: "gymHour", value: gymHour })}
            className="rounded-none border-2 border-foreground" />
          <Input type="email" placeholder="nudge email"
            value={email ?? settings.email ?? ""}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => email !== null && setSetting({ key: "email", value: email })}
            className="rounded-none border-2 border-foreground" />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">Nudges (minutes before gym time)</h3>
        {nudges?.map((n) => (
          <div key={n._id} className="flex items-center gap-3 border-2 border-foreground p-3">
            <Switch checked={n.enabled}
              onCheckedChange={(on) => upsertNudge({ id: n._id, kind: n.kind, label: n.label, minutesBeforeGym: n.minutesBeforeGym, enabled: on })} />
            <div className="flex-1 text-xs">{n.label}</div>
            <span className="text-xs tabular-nums text-muted-foreground">-{n.minutesBeforeGym}m</span>
          </div>
        ))}
      </section>

      {memories && memories.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">What the coach knows about you</h3>
          {memories.map((m) => (
            <div key={m._id} className="flex items-start gap-2 text-xs border-b border-muted pb-1">
              <span className="flex-1">{m.fact}</span>
              <button className="text-muted-foreground underline" onClick={() => forget({ id: m._id })}>forget</button>
            </div>
          ))}
        </section>
      )}

      <Button variant="outline" className="rounded-none border-2 border-foreground" onClick={() => void signOut()}>
        SIGN OUT
      </Button>
    </div>
  );
}
