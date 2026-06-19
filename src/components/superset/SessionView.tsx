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
import { Check, Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, ArrowUpDown } from "lucide-react";

const FATIGUE = [
  { id: "ez", label: "EZ" },
  { id: "struggle", label: "HARD" },
  { id: "failure", label: "FAIL" },
  { id: "tooTired", label: "DEAD" },
] as const;
type FatigueId = (typeof FATIGUE)[number]["id"];

const DAY_MS = 24 * 60 * 60 * 1000;
const RARELY_DONE_DAYS = 30;

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
      <h2 className="display text-5xl mt-4">TODAY.</h2>
      <p className="text-sm text-muted-foreground mb-2">Pick the day. Everything&apos;s there — do what you have time for.</p>

      {days.map((d) => (
        <div key={d._id} className="flex items-stretch gap-2">
          <button onClick={() => start({ programDayId: d._id })}
            className="flex-1 border-2 border-foreground p-5 text-left hover:bg-foreground hover:text-background transition-colors">
            <div className="display text-2xl">{d.name.toUpperCase()}</div>
            <div className="text-xs text-muted-foreground">{d.exerciseIds.length} exercises</div>
          </button>
          <button onClick={() => setEditing(d)} aria-label="Edit day"
            className="border-2 border-foreground px-3 hover:bg-foreground hover:text-background transition-colors">
            <Pencil size={16} />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="border-2 border-foreground p-3 flex flex-col gap-2">
          <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Day name (e.g. Push, Pull, Custom Leg Day)"
            className="rounded-none border-2 border-foreground" />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="rounded-none border-2" onClick={() => { setAdding(false); setNewName(""); }}>
              CANCEL
            </Button>
            <Button className="rounded-none" disabled={!newName.trim()}
              onClick={async () => {
                const id = await createDay({ name: newName.trim() });
                setNewName(""); setAdding(false);
                const day = { _id: id, _creationTime: 0, name: newName.trim(), order: 999, exerciseIds: [] } as Doc<"programDays">;
                setEditing(day);
              }}>
              CREATE
            </Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="border-2 border-dashed border-muted-foreground p-4 text-left text-sm text-muted-foreground flex items-center gap-2">
          <Plus size={16} /> New day
        </button>
      )}

      <button onClick={() => start({})}
        className="border-2 border-dashed border-muted-foreground p-4 text-left text-sm text-muted-foreground">
        Freestyle session (no template)
      </button>

      {!excuseOpen ? (
        <button onClick={() => setExcuseOpen(true)} className="mt-6 text-xs text-muted-foreground underline self-start">
          Not going today
        </button>
      ) : (
        <div className="border-2 p-3 flex flex-col gap-2" style={{ borderColor: "var(--accent-user)" }}>
          <p className="text-xs uppercase tracking-widest">What&apos;s the excuse? It goes in the ledger.</p>
          <Input value={excuse} onChange={(e) => setExcuse(e.target.value)} placeholder="be honest"
            className="rounded-none border-2 border-foreground" />
          <Button className="rounded-none" disabled={!excuse}
            onClick={async () => { await logExcuse({ reason: excuse }); setExcuse(""); setExcuseOpen(false); }}>
            LOG IT
          </Button>
        </div>
      )}

      {editing && <DayEditor day={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day editor — rename, delete, manage + reorder exercises
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
      <DialogContent className="border-2 border-foreground rounded-none max-w-md">
        <DialogHeader>
          <DialogTitle className="display text-2xl">EDIT DAY</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)}
            className="rounded-none border-2 border-foreground" />
          <Button className="rounded-none" disabled={!name.trim() || name === liveDay.name}
            onClick={() => rename({ id: liveDay._id, name: name.trim() })}>
            SAVE
          </Button>
        </div>

        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
          Order = your priority. Favorites at top.
        </p>
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {ids.map((id, i) => {
            const ex = byId.get(id);
            return (
              <div key={id} className="flex items-center gap-1 border-2 border-foreground px-2 py-1.5">
                <span className="flex-1 text-sm">{ex?.name ?? "—"}</span>
                <button onClick={() => move(i, i - 1)} disabled={i === 0} className="p-1 disabled:opacity-30"><ChevronUp size={14} /></button>
                <button onClick={() => move(i, i + 1)} disabled={i === ids.length - 1} className="p-1 disabled:opacity-30"><ChevronDown size={14} /></button>
                <button onClick={() => setExercises({ id: liveDay._id, exerciseIds: ids.filter((x) => x !== id) })}
                  className="p-1 text-muted-foreground hover:text-foreground"><X size={14} /></button>
              </div>
            );
          })}
          {ids.length === 0 && <p className="text-xs text-muted-foreground py-2">No exercises yet — add some below.</p>}
        </div>

        <AddExerciseDialog existingIds={new Set(ids)}
          onPick={(exId) => setExercises({ id: liveDay._id, exerciseIds: [...ids, exId] })}
          trigger={
            <Button variant="outline" className="rounded-none border-2 border-dashed gap-2"><Plus size={16} /> Add exercise</Button>
          } />

        <button onClick={async () => { await remove({ id: liveDay._id }); onClose(); }}
          className="mt-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 self-start">
          <Trash2 size={13} /> Delete this day
        </button>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add-exercise dialog — pick existing or quick-add new
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
      <DialogContent className="border-2 border-foreground rounded-none max-w-md">
        <DialogHeader>
          <DialogTitle className="display text-2xl">ADD EXERCISE</DialogTitle>
        </DialogHeader>

        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search…"
          className="rounded-none border-2 border-foreground" />
        <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
          {available.map((e) => (
            <button key={e._id} onClick={() => { onPick(e._id); setOpen(false); setQ(""); }}
              className="border-2 border-foreground px-3 py-2 text-left text-sm hover:bg-foreground hover:text-background transition-colors flex justify-between">
              <span>{e.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase self-center">{e.muscleGroup}</span>
            </button>
          ))}
          {available.length === 0 && <p className="text-xs text-muted-foreground py-2">No matches — quick-add below.</p>}
        </div>

        <div className="border-t-2 border-foreground pt-3 mt-1 flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Quick-add new</p>
          <Input value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="exercise name"
            className="rounded-none border-2 border-foreground" />
          <div className="flex gap-2">
            <Input value={quickGroup} onChange={(e) => setQuickGroup(e.target.value)} placeholder="muscle group"
              className="rounded-none border-2 border-foreground" />
            <button onClick={() => setCompound(!compound)}
              className="border-2 border-foreground px-3 text-[10px] tracking-widest whitespace-nowrap"
              style={compound ? { background: "var(--foreground)", color: "var(--background)" } : undefined}>
              {compound ? "COMPOUND" : "ISOLATION"}
            </button>
          </div>
          <Button className="rounded-none" disabled={!quickName.trim() || !quickGroup.trim()}
            onClick={async () => {
              const id = await createExercise({ name: quickName.trim(), muscleGroup: quickGroup.trim(), isCompound: compound });
              onPick(id); setOpen(false);
              setQuickName(""); setQuickGroup(""); setCompound(false); setQ("");
            }}>
            ADD
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Active session — full ordered menu
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

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="display text-3xl">{(day?.name ?? "FREESTYLE").toUpperCase()}</h2>
        <div className="flex gap-2">
          {day && (
            <Button variant="outline" className="rounded-none border-2 border-foreground px-3"
              onClick={() => setReordering((r) => !r)} aria-label="Reorder">
              <ArrowUpDown size={16} />
            </Button>
          )}
          <VoiceLog sessionId={session._id} nextIndexFor={(exId) => (sets ?? []).filter((s) => s.exerciseId === exId).length} />
          <Button variant="outline" className="rounded-none border-2 border-foreground"
            onClick={() => finish({ sessionId: session._id })}>
            <Check size={16} /> DONE
          </Button>
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
            <div key={id} className="flex items-center gap-1 border-2 border-foreground px-3 py-2">
              <span className="flex-1 text-sm">{ex.name}</span>
              <button onClick={() => moveInDay(dayIdx, dayIdx - 1)} disabled={dayIdx === 0} className="p-1 disabled:opacity-30"><ChevronUp size={16} /></button>
              <button onClick={() => moveInDay(dayIdx, dayIdx + 1)} disabled={dayIdx === day!.exerciseIds.length - 1} className="p-1 disabled:opacity-30"><ChevronDown size={16} /></button>
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
            <button className="border-2 border-dashed border-muted-foreground p-4 text-left text-sm text-muted-foreground flex items-center gap-2">
              <Plus size={16} /> Add an exercise
            </button>
          } />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise card — guided ramp rows + coach chat
// ---------------------------------------------------------------------------

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
  const ingest = useAction(api.agent.ingest);
  const adjust = useAction(api.agent.adjustTarget);
  const exercisesAll = useQuery(api.workouts.listExercises);

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [fatigue, setFatigue] = useState<FatigueId | null>(null);
  const [isWarmup, setIsWarmup] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [stopNote, setStopNote] = useState<string | null>(null);
  const [chat, setChat] = useState("");
  const [coachMsg, setCoachMsg] = useState<string | null>(null);
  const [adjusted, setAdjusted] = useState<SetTarget | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isActive) {
    return (
      <button onClick={onActivate} className="border-2 border-foreground p-4 text-left"
        style={muted ? { opacity: 0.5 } : undefined}>
        <div className="flex justify-between items-baseline">
          <span className="font-semibold">{exercise.name}</span>
          <span className="text-xs text-muted-foreground">
            {sets.length > 0 ? `${sets.filter((s) => !s.isWarmup).length} sets logged` : muted ? "rarely done" : "tap to start"}
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

  const reset = () => { setWeight(""); setReps(""); setFatigue(null); setIsWarmup(false); setAdjusted(null); };

  const submit = async () => {
    const w = Number(wVal), r = Number(rVal);
    if (!w || !r) return;
    const res = await logSet({
      sessionId, exerciseId: exercise._id, setIndex: sets.length,
      weight: w, reps: r, fatigue: fatigue ?? undefined, isWarmup,
    });
    reset();
    setTimerStart(Date.now());
    setStopNote(res.stop ? (res.reason ?? null) : null);
  };

  const logWarmup = (w: SetTarget) =>
    logSet({ sessionId, exerciseId: exercise._id, setIndex: sets.length, weight: w.weight, reps: w.reps, isWarmup: true });

  const sendChat = async (mode: "log" | "adjust") => {
    if (!chat.trim()) return;
    setBusy(true);
    setCoachMsg(null);
    try {
      if (mode === "log") {
        const parsed = await ingest({ transcript: chat });
        for (const s of parsed.sets) {
          const ex = (exercisesAll ?? []).find((e) => e.name === s.exerciseName) ?? exercise;
          await logSet({
            sessionId, exerciseId: ex._id, setIndex: sets.length,
            weight: s.weight, reps: s.reps, fatigue: s.fatigue ?? undefined, isWarmup: s.isWarmup,
          });
        }
        setCoachMsg(parsed.readback);
        reset();
      } else {
        const res = await adjust({
          exerciseName: exercise.name,
          baselineWeight: baseline.weight, baselineReps: baseline.reps,
          weightIncrement: exercise.weightIncrement, userContext: chat,
        });
        setAdjusted({ weight: res.weight, reps: res.reps });
        setWeight(String(res.weight)); setReps(String(res.reps));
        setCoachMsg(res.reason + (res.clamped ? " (kept within a safe range)" : ""));
      }
      setChat("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setCoachMsg(msg.includes("OPENAI_API_KEY") ? "OpenAI key not set on Convex." : "Couldn't process that.");
    } finally {
      setBusy(false);
    }
  };

  const workingDone = sets.filter((s) => !s.isWarmup).length;

  return (
    <div className="border-2 p-4 flex flex-col gap-3" style={{ borderColor: "var(--accent-user)" }}>
      <button onClick={onActivate} className="flex justify-between items-baseline text-left">
        <span className="display text-xl">{exercise.name.toUpperCase()}</span>
        <span className="text-[10px] text-muted-foreground uppercase">{exercise.repRangeMin}–{exercise.repRangeMax} reps</span>
      </button>

      {/* Warmup suggestions */}
      {plan.warmups.length > 0 && (
        <div className="text-xs text-muted-foreground flex flex-wrap gap-1 items-center">
          <span className="uppercase tracking-widest mr-1">warmup:</span>
          {plan.warmups.map((w, i) => (
            <button key={i} onClick={() => logWarmup(w)} className="border border-muted-foreground px-2 py-0.5 tabular-nums hover:bg-muted">
              {w.weight}×{w.reps}
            </button>
          ))}
        </div>
      )}

      {/* Logged sets */}
      {sets.length > 0 && (
        <div className="text-xs space-y-1">
          {sets.map((s) => (
            <div key={s._id} className="flex justify-between tabular-nums border-b border-muted pb-0.5">
              <span className="text-muted-foreground">{s.isWarmup ? "warmup" : `set ${s.setIndex + 1}`}</span>
              <span>{s.weight} × {s.reps} {s.fatigue ? `· ${s.fatigue}` : ""}</span>
            </div>
          ))}
        </div>
      )}

      {/* Next-set target */}
      {target.weight > 0 && (
        <div className="bg-muted p-2 text-xs">
          <span className="uppercase tracking-widest text-muted-foreground">next · set {workingDone + 1}</span>{" "}
          <span className="display text-lg">{target.weight} <span className="text-xs">× {target.reps}</span></span>
          {adjusted && <span className="ml-2 text-[10px] text-muted-foreground">(adjusted)</span>}
        </div>
      )}

      {timerStart && <RestTimer seconds={exercise.restSeconds} startedAt={timerStart} />}
      {stopNote && <p className="text-xs border-l-4 pl-2" style={{ borderColor: "var(--accent-user)" }}>{stopNote}</p>}

      {/* Manual entry */}
      <div className="grid grid-cols-2 gap-2">
        <Input inputMode="decimal" placeholder="weight" value={wVal} onChange={(e) => setWeight(e.target.value)}
          className="rounded-none border-2 border-foreground h-12 text-lg tabular-nums" />
        <Input inputMode="numeric" placeholder="reps" value={rVal} onChange={(e) => setReps(e.target.value)}
          className="rounded-none border-2 border-foreground h-12 text-lg tabular-nums" />
      </div>

      <div className="grid grid-cols-5 gap-1">
        {FATIGUE.map((f) => (
          <button key={f.id} onClick={() => setFatigue(fatigue === f.id ? null : f.id)}
            className="border-2 border-foreground py-2 text-[10px] tracking-widest"
            style={fatigue === f.id ? { background: "var(--accent-user)", color: "white", borderColor: "var(--accent-user)" } : undefined}>
            {f.label}
          </button>
        ))}
        <button onClick={() => setIsWarmup(!isWarmup)}
          className="border-2 border-dashed border-muted-foreground py-2 text-[10px] tracking-widest"
          style={isWarmup ? { background: "var(--foreground)", color: "var(--background)" } : undefined}>
          WARM
        </button>
      </div>

      <Button onClick={submit} disabled={!wVal || !rVal} className="rounded-none h-12 display text-lg">
        LOG {isWarmup ? "WARMUP" : `SET ${workingDone + 1}`}
      </Button>

      {/* Coach chat */}
      <div className="flex flex-col gap-2 border-t-2 border-muted pt-3">
        {coachMsg && <p className="text-xs border-l-4 pl-2" style={{ borderColor: "var(--accent-user)" }}>{coachMsg}</p>}
        <Input value={chat} onChange={(e) => setChat(e.target.value)}
          placeholder='log a set or tell the coach ("shoulder feels tweaky")'
          className="rounded-none border-2 border-foreground" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="rounded-none border-2" disabled={!chat.trim() || busy} onClick={() => sendChat("log")}>
            {busy ? "…" : "LOG IT"}
          </Button>
          <Button variant="outline" className="rounded-none border-2" disabled={!chat.trim() || busy} onClick={() => sendChat("adjust")}>
            {busy ? "…" : "ASK COACH"}
          </Button>
        </div>
      </div>
    </div>
  );
}
