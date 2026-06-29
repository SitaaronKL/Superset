"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ButtonGroup } from "@/components/ui/button-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Check } from "lucide-react";

const ACCENTS: { name: string; value: string }[] = [
  { name: "Signal Red", value: "oklch(0.55 0.22 25)" },
  { name: "Volt", value: "oklch(0.85 0.25 130)" },
  { name: "Cobalt", value: "oklch(0.55 0.2 260)" },
  { name: "Tangerine", value: "oklch(0.7 0.19 50)" },
  { name: "Hot Pink", value: "oklch(0.65 0.26 350)" },
  { name: "Cyan", value: "oklch(0.75 0.15 210)" },
];
const DEFAULT_ACCENT = ACCENTS[0].value;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const round1 = (n: number) => Math.round(n * 10) / 10;

export default function SettingsView() {
  const { signOut } = useAuthActions();
  const settings = useQuery(api.settings.getAll);
  const setSetting = useMutation(api.settings.set);
  const nudges = useQuery(api.nudges.list);
  const upsertNudge = useMutation(api.nudges.upsert);
  const removeNudge = useMutation(api.nudges.remove);
  const memories = useQuery(api.memories.list);
  const forget = useMutation(api.memories.forget);

  const [email, setEmail] = useState<string | null>(null);
  const [gymHour, setGymHour] = useState<string | null>(null);
  const [proteinGoal, setProteinGoal] = useState<string | null>(null);
  const [calorieGoal, setCalorieGoal] = useState<string | null>(null);
  const [weightGoal, setWeightGoal] = useState<string | null>(null);

  if (!settings) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  const accent = settings.accent ?? DEFAULT_ACCENT;
  const theme = settings.theme === "light" ? "light" : "dark";
  const gymDays: number[] = settings.gymDays ? JSON.parse(settings.gymDays) : [];
  const toggleDay = (d: number) => {
    const next = gymDays.includes(d) ? gymDays.filter((x) => x !== d) : [...gymDays, d];
    setSetting({ key: "gymDays", value: JSON.stringify(next) });
    setSetting({ key: "tzOffsetMinutes", value: String(new Date().getTimezoneOffset()) });
  };

  return (
    <div className="p-3 flex flex-col gap-6">
      <h2 className="display text-2xl mt-1">SETTINGS</h2>

      {/* Appearance */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">Appearance</h3>

        <div className="flex items-center justify-between">
          <span className="text-sm">Accent color</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-8 w-8 rounded-full ring-1 ring-foreground/25 active:scale-95 transition-transform"
                style={{ background: accent }} aria-label="Choose accent color" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto rounded-2xl p-3">
              <div className="grid grid-cols-3 gap-3">
                {ACCENTS.map((a) => (
                  <button key={a.name} title={a.name} onClick={() => setSetting({ key: "accent", value: a.value })}
                    className="h-9 w-9 rounded-full grid place-items-center ring-1 ring-foreground/15 active:scale-95"
                    style={{ background: a.value }}>
                    {accent === a.value && <Check size={16} className="text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Theme</span>
          <ButtonGroup>
            <Button size="sm" variant={theme === "light" ? "default" : "outline"}
              onClick={() => setSetting({ key: "theme", value: "light" })}>Light</Button>
            <Button size="sm" variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setSetting({ key: "theme", value: "dark" })}>Dark</Button>
          </ButtonGroup>
        </div>
      </section>

      {/* Daily nutrition goals */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">Daily goals</h3>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm shrink-0">Protein (g)</span>
          <Input inputMode="numeric" placeholder="e.g. 180"
            value={proteinGoal ?? settings.proteinGoal ?? ""}
            onChange={(e) => setProteinGoal(e.target.value)}
            onBlur={() => proteinGoal !== null && setSetting({ key: "proteinGoal", value: proteinGoal })}
            className="h-9 max-w-32 text-center num" />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm shrink-0">Calories</span>
          <Input inputMode="numeric" placeholder="e.g. 2400"
            value={calorieGoal ?? settings.calorieGoal ?? ""}
            onChange={(e) => setCalorieGoal(e.target.value)}
            onBlur={() => calorieGoal !== null && setSetting({ key: "calorieGoal", value: calorieGoal })}
            className="h-9 max-w-32 text-center num" />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm shrink-0">Goal weight (lb)</span>
          <Input inputMode="decimal" placeholder="e.g. 175"
            value={weightGoal ?? settings.weightGoal ?? ""}
            onChange={(e) => setWeightGoal(e.target.value)}
            onBlur={() => weightGoal !== null && setSetting({ key: "weightGoal", value: weightGoal })}
            className="h-9 max-w-32 text-center num" />
        </label>
      </section>

      {/* Gym schedule */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">Gym schedule</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d, i) => (
            <button key={d} onClick={() => toggleDay(i)}
              className="rounded-full py-2 text-[10px] font-semibold ring-1 ring-foreground/15"
              style={gymDays.includes(i) ? { background: "var(--accent-user)", color: "white" } : { background: "var(--muted)", color: "var(--muted-foreground)" }}>
              {d.toUpperCase()}
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm shrink-0">Usual gym time</span>
          <Input inputMode="numeric" placeholder="e.g. 18 (24h)"
            value={gymHour ?? settings.gymHour ?? ""}
            onChange={(e) => setGymHour(e.target.value)}
            onBlur={() => gymHour !== null && setSetting({ key: "gymHour", value: gymHour })}
            className="h-9 max-w-32 text-center" />
        </label>
        <p className="text-[11px] text-muted-foreground -mt-1">The hour (0–23) you usually train. Reminders are timed before it.</p>
        <Input type="email" placeholder="Email for reminders"
          value={email ?? settings.email ?? ""}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email !== null && setSetting({ key: "email", value: email })}
          className="h-9" />
      </section>

      {/* Reminders (no boxes, hours, customizable) */}
      <section className="flex flex-col gap-1">
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Reminders</h3>
        {nudges?.map((n) => (
          <NudgeRow key={n._id} nudge={n}
            onSave={(p) => upsertNudge({ id: n._id, kind: n.kind, label: p.label, minutesBeforeGym: p.minutes, enabled: p.enabled })}
            onDelete={() => removeNudge({ id: n._id })} />
        ))}
        <button onClick={() => upsertNudge({ kind: "custom", label: "New reminder", minutesBeforeGym: 60, enabled: true })}
          className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5 self-start">
          <Plus size={14} /> Add reminder
        </button>
      </section>

      {memories && memories.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground">What the coach knows about you</h3>
          {memories.map((m) => (
            <div key={m._id} className="flex items-start gap-2 text-xs border-b border-border pb-1">
              <span className="flex-1">{m.fact}</span>
              <button className="text-muted-foreground underline" onClick={() => forget({ id: m._id })}>forget</button>
            </div>
          ))}
        </section>
      )}

      <Button variant="outline" onClick={() => void signOut()}>Sign out</Button>
    </div>
  );
}

function NudgeRow({ nudge, onSave, onDelete }: {
  nudge: Doc<"nudges">;
  onSave: (p: { label: string; minutes: number; enabled: boolean }) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(nudge.label);
  const [hours, setHours] = useState(String(round1(nudge.minutesBeforeGym / 60)));

  const commit = (enabled = nudge.enabled) =>
    onSave({ label: label.trim() || "Reminder", minutes: Math.max(0, Math.round((Number(hours) || 0) * 60)), enabled });

  return (
    <div className="flex items-center gap-2 py-2 border-b border-border last:border-b-0">
      <Switch checked={nudge.enabled} onCheckedChange={(on) => commit(on)} />
      <Input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => commit()}
        className="h-8 flex-1 border-transparent bg-transparent px-1 focus-visible:bg-input/50" />
      <div className="flex items-center gap-1 shrink-0">
        <Input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} onBlur={() => commit()}
          className="h-8 w-14 text-center num" />
        <span className="text-[11px] text-muted-foreground">h before</span>
      </div>
      <button onClick={onDelete} aria-label="Delete reminder" className="text-muted-foreground p-1"><Trash2 size={14} /></button>
    </div>
  );
}
