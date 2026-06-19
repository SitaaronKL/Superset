"use client";

import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { rampPlan, nextSetTarget, type SetRecord, type SetTarget } from "../../../convex/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RestTimer } from "./RestTimer";
import { VoiceLog } from "./VoiceLog";
import {
  Check, Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, ArrowUpDown,
  MessageCircle, ChevronRight,
} from "lucide-react";

const FATIGUE = [
  { id: "ez", label: "EZ" },
  { id: "struggle", label: "HARD" },
  { id: "failure", label: "FAIL" },
  { id: "tooTired", label: "DEAD" },
] as const;
type FatigueId = (typeof FATIGUE)[number]["id"];

const DAY_MS = 24 * 60 * 60 * 1000;
const RARELY_DONE_DAYS = 30;

const card = "rounded-2xl bg-card ring-1 ring-foreground/10 shadow-sm";

export default function SessionView() {
  const session = useQuery(api.workouts.activeSession);
  const days = useQuery(api.workouts.listProgramDays);

  if (session === undefined || days === undefined) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }
  if (!session) return <DayPicker days={days} />;
  return <ActiveSession session={session} days={days} />;
}

// ---------------------------------------------------------------------------
// Day picker — editable templates
// ---------------------------------------------------------------------------

function DayPicker({ days }: { days: Doc<"programDays">[] }) {
  const start = useMutation(api.workouts.startSession);
  const createDay = useMutation(api.workouts.createProgramDay);
  const logExcuse = useMutation(api.nudges.logExcuse);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Doc<"programDays"> | null>(null);
  const [excuseOpen, setExcuseOpen] = useState(false);
  const [excuse, setExcuse] = useState("");

  return (
    <div className="p-4 flex flex-col gap-3">
      <h2 className="display text-5xl mt-3">TODAY.</h2>
      <p className="text-sm text-muted-foreground mb-1">Pick the day. Everything&apos;s there — do what you have time for.</p>

      {days.map((d) => (
        <div key={d._id} className={`flex items-stretch overflow-hidden ${card}`}>
          <button onClick={() => start({ programDayId: d._id })}
            className="flex-1 p-5 text-left active:bg-muted transition-colors">
            <div className="display text-2xl">{d.name.toUpperCase()}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{d.exerciseIds.length} exercises</div>
          </button>
          <button onClick={() => setEditing(d)} aria-label="Edit day"
            className="px-4 text-muted-foreground active:bg-muted border-l border-border">
            <Pencil size={17} />
          </button>
        </div>
      ))}

      {adding ? (
        <div className={`p-3 flex flex-col gap-2 ${card}`}>
          <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Day name (e.g. Push, Pull, Custom Leg Day)" className="h-12 rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => { setAdding(false); setNewName(""); }}>
              Cancel
            </Button>
            <Button className="h-11 rounded-xl" disabled={!newName.trim()}
              onClick={async () => {
                const id = await createDay({ name: newName.trim() });
                setNewName(""); setAdding(false);
                setEditing({ _id: id, _creationTime: 0, name: newName.trim(), order: 999, exerciseIds: [] } as Doc<"programDays">);
              }}>
              Create
            </Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="rounded-2xl border border-dashed border-muted-foreground/40 p-4 text-left text-sm text-muted-foreground flex items-center gap-2 active:bg-muted">
          <Plus size={16} /> New day
        </button>
      )}

      <button onClick={() => start({})}
        className="rounded-2xl border border-dashed border-muted-foreground/40 p-4 text-left text-sm text-muted-foreground active:bg-muted">
        Freestyle session (no template)
      </button>

      {!excuseOpen ? (
        <button onClick={() => setExcuseOpen(true)} className="mt-5 text-xs text-muted-foreground underline self-start">
          Not going today
        </button>
      ) : (
        <div className="rounded-2xl p-3 flex flex-col gap-2 ring-1" style={{ ["--tw-ring-color" as string]: "var(--accent-user)" }}>
          <p className="text-xs uppercase tracking-widest">What&apos;s the excuse? It goes in the ledger.</p>
          <Input value={excuse} onChange={(e) => setExcuse(e.target.value)} placeholder="be honest" className="h-12 rounded-xl" />
          <Button className="h-11 rounded-xl" disabled={!excuse}
            onClick={async () => { await logExcuse({ reason: excuse }); setExcuse(""); setExcuseOpen(false); }}>
            Log it
          </Button>
        </div>
      )}

      {editing && <DayEditor day={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day editor
// ---------------------------------------------------------------------------

function DayEditor({ day, onClose }: { day: Doc<"programDays">; onClose: () => void }) {
  const liveDay = useQuery(api.workouts.listProgramDays)?.find((d) => d._id === day._id) ?? day;
  const exercises = useQuery(api.workouts.listExercises);
  const rename = useMutation(api.workouts.renameProgramDay);
  const remove = useMutation(api.workouts.deleteProgramDay);
  const setExercises = useMutation(api.workouts.setDayExercises);

  const [name, setName] = useState(liveDay.name);
  const byId = useMemo(() => new Map((exercises ?? []).map((e) => [e._id, e])), [exercises]);
  const ids = liveDay.exerciseIds;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setExercises({ id: liveDay._id, exerciseIds: next });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader><DialogTitle className="display text-2xl">Edit day</DialogTitle></DialogHeader>

        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
          <Button className="h-11 rounded-xl" disabled={!name.trim() || name === liveDay.name}
            onClick={() => rename({ id: liveDay._id, name: name.trim() })}>Save</Button>
        </div>

        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">Order = your priority</p>
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {ids.map((id, i) => (
            <div key={id} className="flex items-center gap-1 rounded-xl bg-muted px-3 py-2">
              <span className="flex-1 text-sm">{byId.get(id)?.name ?? "—"}</span>
              <button onClick={() => move(i, i - 1)} disabled={i === 0} className="p-1.5 disabled:opacity-30"><ChevronUp size={16} /></button>
              <button onClick={() => move(i, i + 1)} disabled={i === ids.length - 1} className="p-1.5 disabled:opacity-30"><ChevronDown size={16} /></button>
              <button onClick={() => setExercises({ id: liveDay._id, exerciseIds: ids.filter((x) => x !== id) })}
                className="p-1.5 text-muted-foreground"><X size={16} /></button>
            </div>
          ))}
          {ids.length === 0 && <p className="text-xs text-muted-foreground py-2">No exercises yet — add some below.</p>}
        </div>

        <AddExerciseDialog existingIds={new Set(ids)}
          onPick={(exId) => setExercises({ id: liveDay._id, exerciseIds: [...ids, exId] })}
          trigger={<Button variant="outline" className="h-11 rounded-xl gap-2"><Plus size={16} /> Add exercise</Button>} />

        <button onClick={async () => { await remove({ id: liveDay._id }); onClose(); }}
          className="mt-1 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 self-start">
          <Trash2 size={13} /> Delete this day
        </button>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add-exercise dialog
// ---------------------------------------------------------------------------

function AddExerciseDialog({ existingIds, onPick, trigger }: {
  existingIds: Set<Id<"exercises">>;
  onPick: (id: Id<"exercises">) => void;
  trigger: React.ReactNode;
}) {
  const exercises = useQuery(api.workouts.listExercises);
  const createExercise = useMutation(api.workouts.createExercise);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickGroup, setQuickGroup] = useState("");
  const [compound, setCompound] = useState(false);

  const available = (exercises ?? [])
    .filter((e) => !existingIds.has(e._id))
    .filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader><DialogTitle className="display text-2xl">Add exercise</DialogTitle></DialogHeader>

        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-11 rounded-xl" />
        <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
          {available.map((e) => (
            <button key={e._id} onClick={() => { onPick(e._id); setOpen(false); setQ(""); }}
              className="rounded-xl bg-muted px-3 py-3 text-left text-sm active:bg-foreground active:text-background transition-colors flex justify-between items-center">
              <span>{e.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase">{e.muscleGroup}</span>
            </button>
          ))}
          {available.length === 0 && <p className="text-xs text-muted-foreground py-2">No matches — quick-add below.</p>}
        </div>

        <div className="border-t border-border pt-3 flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Quick-add new</p>
          <Input value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="Exercise name" className="h-11 rounded-xl" />
          <div className="flex gap-2">
            <Input value={quickGroup} onChange={(e) => setQuickGroup(e.target.value)} placeholder="Muscle group" className="h-11 rounded-xl" />
            <button onClick={() => setCompound(!compound)}
              className="rounded-xl px-3 text-[11px] tracking-widest whitespace-nowrap ring-1 ring-foreground/15"
              style={compound ? { background: "var(--foreground)", color: "var(--background)" } : undefined}>
              {compound ? "COMPOUND" : "ISOLATION"}
            </button>
          </div>
          <Button className="h-11 rounded-xl" disabled={!quickName.trim() || !quickGroup.trim()}
            onClick={async () => {
              const id = await createExercise({ name: quickName.trim(), muscleGroup: quickGroup.trim(), isCompound: compound });
              onPick(id); setOpen(false);
              setQuickName(""); setQuickGroup(""); setCompound(false); setQ("");
            }}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Active session
// ---------------------------------------------------------------------------

function ActiveSession({ session, days }: { session: Doc<"sessions">; days: Doc<"programDays">[] }) {
  const exercises = useQuery(api.workouts.listExercises);
  const sets = useQuery(api.workouts.sessionSets, { sessionId: session._id });
  const recency = useQuery(api.workouts.exerciseRecency);
  const finish = useMutation(api.workouts.finishSession);
  const addToSession = useMutation(api.workouts.addExerciseToSession);
  const setDayExercises = useMutation(api.workouts.setDayExercises);

  const [activeExercise, setActiveExercise] = useState<Id<"exercises"> | null>(null);
  const [reordering, setReordering] = useState(false);
  const [now] = useState(() => Date.now());

  const day = days.find((d) => d._id === session.programDayId) ?? null;

  const orderedIds = useMemo(() => {
    const fromDay = day ? [...day.exerciseIds] : [];
    const extra = session.extraExerciseIds ?? [];
    const withSets = (sets ?? []).map((s) => s.exerciseId);
    const seen = new Set<string>();
    const out: Id<"exercises">[] = [];
    for (const id of [...fromDay, ...extra, ...withSets]) {
      if (!seen.has(id)) { seen.add(id); out.push(id); }
    }
    return out;
  }, [day, session.extraExerciseIds, sets]);

  const byId = useMemo(() => new Map((exercises ?? []).map((e) => [e._id, e])), [exercises]);

  if (!exercises || !sets) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  const moveInDay = (from: number, to: number) => {
    if (!day || to < 0 || to >= day.exerciseIds.length) return;
    const next = [...day.exerciseIds];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setDayExercises({ id: day._id, exerciseIds: next });
  };

  const iconBtn = "h-10 w-10 grid place-items-center rounded-xl ring-1 ring-foreground/15 active:bg-muted";

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 sticky top-0 -mx-4 px-4 py-2 bg-background/90 backdrop-blur z-10">
        <h2 className="display text-3xl truncate">{(day?.name ?? "FREESTYLE").toUpperCase()}</h2>
        <div className="flex gap-1.5">
          {day && (
            <button className={iconBtn} onClick={() => setReordering((r) => !r)} aria-label="Reorder"
              style={reordering ? { background: "var(--accent-user)", color: "#fff" } : undefined}>
              <ArrowUpDown size={17} />
            </button>
          )}
          <VoiceLog sessionId={session._id} nextIndexFor={(exId) => (sets ?? []).filter((s) => s.exerciseId === exId).length} />
          <button className={iconBtn} onClick={() => finish({ sessionId: session._id })} aria-label="Finish">
            <Check size={18} />
          </button>
        </div>
      </div>

      {orderedIds.map((id) => {
        const ex = byId.get(id);
        if (!ex) return null;
        const exSets = sets.filter((s) => s.exerciseId === id);
        const last = recency?.[id];
        const muted = exSets.length === 0 && (!last || now - last > RARELY_DONE_DAYS * DAY_MS);
        const inDay = day ? day.exerciseIds.includes(id) : false;

        if (reordering && inDay) {
          const dayIdx = day!.exerciseIds.indexOf(id);
          return (
            <div key={id} className={`flex items-center gap-1 px-4 py-3 ${card}`}>
              <span className="flex-1 text-sm font-medium">{ex.name}</span>
              <button onClick={() => moveInDay(dayIdx, dayIdx - 1)} disabled={dayIdx === 0} className="p-2 disabled:opacity-30"><ChevronUp size={18} /></button>
              <button onClick={() => moveInDay(dayIdx, dayIdx + 1)} disabled={dayIdx === day!.exerciseIds.length - 1} className="p-2 disabled:opacity-30"><ChevronDown size={18} /></button>
            </div>
          );
        }

        return (
          <ExerciseCard key={id} exercise={ex} sessionId={session._id} sets={exSets} muted={muted}
            isActive={activeExercise === id} onActivate={() => setActiveExercise(activeExercise === id ? null : id)} />
        );
      })}

      {!reordering && (
        <AddExerciseDialog existingIds={new Set(orderedIds)}
          onPick={(exId) => addToSession({ sessionId: session._id, exerciseId: exId })}
          trigger={
            <button className="rounded-2xl border border-dashed border-muted-foreground/40 p-4 text-left text-sm text-muted-foreground flex items-center gap-2 active:bg-muted">
              <Plus size={16} /> Add an exercise
            </button>
          } />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise card — full editable table
// ---------------------------------------------------------------------------

function EffortPills({ value, onChange }: { value: FatigueId | null; onChange: (f: FatigueId | null) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {FATIGUE.map((f) => {
        const on = value === f.id;
        const danger = f.id === "failure" || f.id === "tooTired";
        return (
          <button key={f.id} onClick={() => onChange(on ? null : f.id)}
            className="h-9 rounded-lg text-[11px] font-semibold tracking-wide transition-colors ring-1 ring-foreground/10"
            style={on
              ? { background: danger ? "var(--accent-user)" : "var(--foreground)", color: danger ? "#fff" : "var(--background)" }
              : { background: "var(--muted)", color: "var(--muted-foreground)" }}>
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

function ExerciseCard({ exercise, sessionId, sets, muted, isActive, onActivate }: {
  exercise: Doc<"exercises">;
  sessionId: Id<"sessions">;
  sets: Doc<"sets">[];
  muted: boolean;
  isActive: boolean;
  onActivate: () => void;
}) {
  const lastSets = useQuery(api.workouts.lastSessionSetsFor, isActive ? { exerciseId: exercise._id } : "skip");
  const logSet = useMutation(api.workouts.logSet);
  const updateSet = useMutation(api.workouts.updateSet);
  const deleteSet = useMutation(api.workouts.deleteSet);
  const ingest = useAction(api.agent.ingest);
  const adjust = useAction(api.agent.adjustTarget);
  const exercisesAll = useQuery(api.workouts.listExercises);

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [fatigue, setFatigue] = useState<FatigueId | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [stopNote, setStopNote] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<Id<"sets"> | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState("");
  const [coachMsg, setCoachMsg] = useState<string | null>(null);
  const [adjusted, setAdjusted] = useState<SetTarget | null>(null);
  const [busy, setBusy] = useState(false);

  const workingDone = sets.filter((s) => !s.isWarmup).length;

  if (!isActive) {
    return (
      <button onClick={onActivate} className={`p-4 text-left ${card}`} style={muted ? { opacity: 0.5 } : undefined}>
        <div className="flex justify-between items-center">
          <span className="font-semibold">{exercise.name}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {sets.length > 0 ? `${workingDone} sets` : muted ? "rarely done" : "tap to start"}
            <ChevronRight size={15} className="text-muted-foreground/60" />
          </span>
        </div>
      </button>
    );
  }

  const last: SetRecord[] = (lastSets ?? []) as SetRecord[];
  const plan = rampPlan(exercise, last);
  const baseline = nextSetTarget(exercise, sets as SetRecord[], plan);
  const target = adjusted ?? baseline;

  const wVal = weight !== "" ? weight : target.weight > 0 ? String(target.weight) : "";
  const rVal = reps !== "" ? reps : target.reps > 0 ? String(target.reps) : "";

  const loggedWarmups = sets.filter((s) => s.isWarmup);
  const loggedWorking = sets.filter((s) => !s.isWarmup);
  const suggestionWarmups = plan.warmups.slice(loggedWarmups.length);
  const futureTargets = plan.workingTargets.slice(loggedWorking.length + 1);

  const resetEntry = () => { setWeight(""); setReps(""); setFatigue(null); setAdjusted(null); };

  const submit = async (warmup: boolean) => {
    const w = Number(wVal), r = Number(rVal);
    if (!w || !r) return;
    const res = await logSet({
      sessionId, exerciseId: exercise._id, setIndex: sets.length,
      weight: w, reps: r, fatigue: warmup ? undefined : fatigue ?? undefined, isWarmup: warmup,
    });
    resetEntry();
    if (!warmup) { setTimerStart(Date.now()); setStopNote(res.stop ? (res.reason ?? null) : null); }
  };

  const logWarmupSuggestion = (t: SetTarget) =>
    logSet({ sessionId, exerciseId: exercise._id, setIndex: sets.length, weight: t.weight, reps: t.reps, isWarmup: true });

  const sendChat = async (mode: "log" | "adjust") => {
    if (!chat.trim()) return;
    setBusy(true); setCoachMsg(null);
    try {
      if (mode === "log") {
        const parsed = await ingest({ transcript: chat });
        for (const s of parsed.sets) {
          const ex = (exercisesAll ?? []).find((e) => e.name === s.exerciseName) ?? exercise;
          await logSet({ sessionId, exerciseId: ex._id, setIndex: sets.length, weight: s.weight, reps: s.reps, fatigue: s.fatigue ?? undefined, isWarmup: s.isWarmup });
        }
        setCoachMsg(parsed.readback); resetEntry();
      } else {
        const res = await adjust({ exerciseName: exercise.name, baselineWeight: baseline.weight, baselineReps: baseline.reps, weightIncrement: exercise.weightIncrement, userContext: chat });
        setAdjusted({ weight: res.weight, reps: res.reps });
        setWeight(String(res.weight)); setReps(String(res.reps));
        setCoachMsg(res.reason + (res.clamped ? " (kept within a safe range)" : ""));
      }
      setChat("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setCoachMsg(msg.includes("OPENAI_API_KEY") ? "OpenAI key not set on Convex." : "Couldn't process that.");
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl bg-card shadow-sm ring-2 p-4 flex flex-col gap-3" style={{ ["--tw-ring-color" as string]: "var(--accent-user)" }}>
      <button onClick={onActivate} className="flex justify-between items-baseline text-left">
        <span className="display text-xl">{exercise.name.toUpperCase()}</span>
        <span className="text-[11px] text-muted-foreground">{exercise.repRangeMin}–{exercise.repRangeMax} reps</span>
      </button>

      {/* Table of sets */}
      <div className="flex flex-col gap-1.5">
        {loggedWarmups.map((s) =>
          editingId === s._id
            ? <EditRow key={s._id} set={s} onSave={(p) => { updateSet({ setId: s._id, ...p }); setEditingId(null); }} onDelete={() => { deleteSet({ setId: s._id }); setEditingId(null); }} onCancel={() => setEditingId(null)} />
            : <LoggedRow key={s._id} label="WARM" set={s} onTap={() => setEditingId(s._id)} />
        )}
        {suggestionWarmups.map((t, i) => (
          <button key={`sw${i}`} onClick={() => logWarmupSuggestion(t)}
            className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5 text-left text-muted-foreground">
            <span className="text-[11px] font-semibold tracking-wide w-12">WARM</span>
            <span className="num flex-1">{t.weight} <span className="text-muted-foreground">×</span> {t.reps}</span>
            <span className="text-[11px]">tap to log</span>
          </button>
        ))}

        {loggedWorking.map((s, i) =>
          editingId === s._id
            ? <EditRow key={s._id} set={s} onSave={(p) => { updateSet({ setId: s._id, ...p }); setEditingId(null); }} onDelete={() => { deleteSet({ setId: s._id }); setEditingId(null); }} onCancel={() => setEditingId(null)} />
            : <LoggedRow key={s._id} label={`SET ${i + 1}`} set={s} onTap={() => setEditingId(s._id)} />
        )}

        {/* Active next-set row — the focal point */}
        <div className="rounded-xl p-3 flex flex-col gap-2.5" style={{ background: "color-mix(in oklch, var(--accent-user) 12%, transparent)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-widest" style={{ color: "var(--accent-user)" }}>
              SET {workingDone + 1} — DO THIS
            </span>
            {adjusted && <span className="text-[10px] text-muted-foreground">adjusted ↓</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">weight</span>
              <Input inputMode="decimal" value={wVal} onChange={(e) => setWeight(e.target.value)} className="num h-14 rounded-xl text-2xl text-center" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">reps</span>
              <Input inputMode="numeric" value={rVal} onChange={(e) => setReps(e.target.value)} className="num h-14 rounded-xl text-2xl text-center" />
            </label>
          </div>
          <EffortPills value={fatigue} onChange={setFatigue} />
          <div className="flex gap-2">
            <Button onClick={() => submit(false)} disabled={!wVal || !rVal} className="flex-1 h-12 rounded-xl text-base font-semibold">
              Log set {workingDone + 1}
            </Button>
            <Button variant="outline" onClick={() => submit(true)} disabled={!wVal || !rVal} className="h-12 rounded-xl px-4" title="Log as warmup">
              Warm
            </Button>
          </div>
        </div>

        {/* What's coming after — the ramp ahead */}
        {futureTargets.map((t, i) => (
          <div key={`ft${i}`} className="flex items-center gap-3 px-3 py-2 text-muted-foreground/60">
            <span className="text-[11px] font-semibold tracking-wide w-12">SET {workingDone + 2 + i}</span>
            <span className="num flex-1">{t.weight > 0 ? `${t.weight} × ${t.reps}` : "—"}</span>
            <span className="text-[10px]">planned</span>
          </div>
        ))}
      </div>

      {timerStart && <RestTimer seconds={exercise.restSeconds} startedAt={timerStart} />}
      {stopNote && (
        <p className="text-xs rounded-lg px-3 py-2" style={{ background: "color-mix(in oklch, var(--accent-user) 12%, transparent)" }}>{stopNote}</p>
      )}

      {/* Coach — tucked away until needed */}
      {!chatOpen ? (
        <button onClick={() => setChatOpen(true)} className="self-start text-xs text-muted-foreground flex items-center gap-1.5">
          <MessageCircle size={14} /> Talk to coach
        </button>
      ) : (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {coachMsg && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ background: "color-mix(in oklch, var(--accent-user) 10%, transparent)" }}>{coachMsg}</p>
          )}
          <Input value={chat} onChange={(e) => setChat(e.target.value)} placeholder='Log a set, or "shoulder feels tweaky"' className="h-11 rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-10 rounded-xl" disabled={!chat.trim() || busy} onClick={() => sendChat("log")}>{busy ? "…" : "Log it"}</Button>
            <Button variant="outline" className="h-10 rounded-xl" disabled={!chat.trim() || busy} onClick={() => sendChat("adjust")}>{busy ? "…" : "Ask coach"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LoggedRow({ label, set, onTap }: { label: string; set: Doc<"sets">; onTap: () => void }) {
  return (
    <button onClick={onTap} className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2.5 text-left active:opacity-70">
      <span className="text-[11px] font-semibold tracking-wide w-12 text-muted-foreground">{label}</span>
      <span className="num flex-1 font-medium">{set.weight} <span className="text-muted-foreground">×</span> {set.reps}</span>
      {set.fatigue && (
        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md"
          style={set.fatigue === "failure" || set.fatigue === "tooTired"
            ? { background: "var(--accent-user)", color: "#fff" }
            : { background: "var(--foreground)", color: "var(--background)" }}>
          {FATIGUE.find((f) => f.id === set.fatigue)?.label}
        </span>
      )}
      <Pencil size={13} className="text-muted-foreground/50" />
    </button>
  );
}

function EditRow({ set, onSave, onDelete, onCancel }: {
  set: Doc<"sets">;
  onSave: (p: { weight: number; reps: number; fatigue?: FatigueId; isWarmup?: boolean }) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [w, setW] = useState(String(set.weight));
  const [r, setR] = useState(String(set.reps));
  const [f, setF] = useState<FatigueId | null>((set.fatigue as FatigueId) ?? null);

  return (
    <div className="rounded-xl ring-1 ring-foreground/15 p-3 flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} className="num h-12 rounded-xl text-center" />
        <Input inputMode="numeric" value={r} onChange={(e) => setR(e.target.value)} className="num h-12 rounded-xl text-center" />
      </div>
      {!set.isWarmup && <EffortPills value={f} onChange={setF} />}
      <div className="flex gap-2">
        <Button className="flex-1 h-10 rounded-xl" disabled={!w || !r}
          onClick={() => onSave({ weight: Number(w), reps: Number(r), fatigue: f ?? undefined, isWarmup: set.isWarmup })}>
          Save
        </Button>
        <Button variant="outline" className="h-10 rounded-xl px-3" onClick={onCancel}>Cancel</Button>
        <Button variant="outline" className="h-10 rounded-xl px-3 text-destructive" onClick={onDelete} aria-label="Delete set">
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}
