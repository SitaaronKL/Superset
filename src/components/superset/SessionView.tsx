"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RestTimer } from "./RestTimer";
import { VoiceLog } from "./VoiceLog";
import { Check, X } from "lucide-react";

const FATIGUE = [
  { id: "ez", label: "EZ" },
  { id: "struggle", label: "HARD" },
  { id: "failure", label: "FAIL" },
  { id: "tooTired", label: "DEAD" },
] as const;

export default function SessionView() {
  const session = useQuery(api.workouts.activeSession);
  const days = useQuery(api.workouts.listProgramDays);

  if (session === undefined || days === undefined) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }
  if (!session) return <DayPicker days={days} />;
  return <ActiveSession session={session} days={days} />;
}

function DayPicker({ days }: { days: Doc<"programDays">[] }) {
  const start = useMutation(api.workouts.startSession);
  const logExcuse = useMutation(api.nudges.logExcuse);
  const [excuseOpen, setExcuseOpen] = useState(false);
  const [excuse, setExcuse] = useState("");

  return (
    <div className="p-4 flex flex-col gap-3">
      <h2 className="display text-5xl mt-4">TODAY.</h2>
      <p className="text-sm text-muted-foreground mb-2">Pick the day. Start. That's the whole decision.</p>
      {days.map((d) => (
        <button key={d._id} onClick={() => start({ programDayId: d._id })}
          className="border-2 border-foreground p-5 text-left hover:bg-foreground hover:text-background transition-colors">
          <div className="display text-2xl">{d.name.toUpperCase()}</div>
          <div className="text-xs text-muted-foreground">{d.exerciseIds.length} exercises</div>
        </button>
      ))}
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
          <p className="text-xs uppercase tracking-widest">What's the excuse? It goes in the ledger.</p>
          <Input value={excuse} onChange={(e) => setExcuse(e.target.value)} placeholder="be honest"
            className="rounded-none border-2 border-foreground" />
          <Button className="rounded-none" disabled={!excuse}
            onClick={async () => { await logExcuse({ reason: excuse }); setExcuse(""); setExcuseOpen(false); }}>
            LOG IT
          </Button>
        </div>
      )}
    </div>
  );
}

function ActiveSession({ session, days }: { session: Doc<"sessions">; days: Doc<"programDays">[] }) {
  const exercises = useQuery(api.workouts.listExercises);
  const sets = useQuery(api.workouts.sessionSets, { sessionId: session._id });
  const finish = useMutation(api.workouts.finishSession);
  const [activeExercise, setActiveExercise] = useState<Id<"exercises"> | null>(null);

  const day = days.find((d) => d._id === session.programDayId);
  const orderedExercises = useMemo(() => {
    if (!exercises) return [];
    if (!day) return exercises;
    const inDay = day.exerciseIds
      .map((id) => exercises.find((e) => e._id === id))
      .filter((e): e is NonNullable<typeof e> => !!e);
    const rest = exercises.filter((e) => !day.exerciseIds.includes(e._id));
    return [...inDay, ...rest];
  }, [exercises, day]);

  const nextIndexFor = (exerciseId: Id<"exercises">) =>
    (sets ?? []).filter((s) => s.exerciseId === exerciseId).length;

  if (!exercises || !sets) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="display text-3xl">{(day?.name ?? "FREESTYLE").toUpperCase()}</h2>
        <div className="flex gap-2">
          <VoiceLog sessionId={session._id} nextIndexFor={nextIndexFor} />
          <Button variant="outline" className="rounded-none border-2 border-foreground"
            onClick={() => finish({ sessionId: session._id })}>
            <Check size={16} /> DONE
          </Button>
        </div>
      </div>

      {orderedExercises.map((ex) => (
        <ExerciseCard key={ex._id} exercise={ex} sessionId={session._id}
          sets={sets.filter((s) => s.exerciseId === ex._id)}
          inProgram={!day || day.exerciseIds.includes(ex._id)}
          isActive={activeExercise === ex._id}
          onActivate={() => setActiveExercise(ex._id)} />
      ))}
    </div>
  );
}

function ExerciseCard({ exercise, sessionId, sets, inProgram, isActive, onActivate }: {
  exercise: Doc<"exercises">;
  sessionId: Id<"sessions">;
  sets: Doc<"sets">[];
  inProgram: boolean;
  isActive: boolean;
  onActivate: () => void;
}) {
  const prescription = useQuery(api.workouts.prescriptionFor, isActive ? { exerciseId: exercise._id } : "skip");
  const logSet = useMutation(api.workouts.logSet);
  const [weight, setWeight] = useState<string>("");
  const [reps, setReps] = useState<string>("");
  const [fatigue, setFatigue] = useState<(typeof FATIGUE)[number]["id"] | null>(null);
  const [isWarmup, setIsWarmup] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [stopNote, setStopNote] = useState<string | null>(null);

  if (!inProgram && sets.length === 0 && !isActive) return null;

  if (!isActive) {
    return (
      <button onClick={onActivate} className="border-2 border-foreground p-4 text-left">
        <div className="flex justify-between items-baseline">
          <span className="font-semibold">{exercise.name}</span>
          <span className="text-xs text-muted-foreground">{sets.length > 0 ? `${sets.length} sets logged` : "tap to start"}</span>
        </div>
      </button>
    );
  }

  const defaultWeight = weight || (prescription && prescription.topWeight > 0 ? String(prescription.topWeight) : "");

  const submit = async () => {
    const w = Number(defaultWeight);
    const r = Number(reps);
    if (!w || !r) return;
    const res = await logSet({
      sessionId,
      exerciseId: exercise._id,
      setIndex: sets.length,
      weight: w,
      reps: r,
      fatigue: fatigue ?? undefined,
      isWarmup,
    });
    setReps("");
    setFatigue(null);
    setIsWarmup(false);
    setTimerStart(Date.now());
    setStopNote(res.stop ? (res.reason ?? null) : null);
  };

  return (
    <div className="border-2 p-4 flex flex-col gap-3" style={{ borderColor: "var(--accent-user)" }}>
      <div className="flex justify-between items-baseline">
        <span className="display text-xl">{exercise.name.toUpperCase()}</span>
        <span className="text-[10px] text-muted-foreground uppercase">{exercise.repRangeMin}–{exercise.repRangeMax} reps</span>
      </div>

      {prescription && (
        <div className="bg-muted p-3 text-xs leading-relaxed">
          {prescription.topWeight > 0 && (
            <div className="display text-3xl mb-1">
              {prescription.topWeight} <span className="text-sm">lb × {prescription.targetRepsMin}–{prescription.targetRepsMax}</span>
            </div>
          )}
          <p>{prescription.rationale}</p>
          {prescription.warmups.length > 0 && (
            <p className="mt-1 text-muted-foreground">
              Warmup: {prescription.warmups.map((w) => `${w.weight}×${w.reps}`).join(" → ")}
            </p>
          )}
        </div>
      )}

      {timerStart && <RestTimer seconds={exercise.restSeconds} startedAt={timerStart} />}
      {stopNote && (
        <p className="text-xs border-l-4 pl-2" style={{ borderColor: "var(--accent-user)" }}>{stopNote}</p>
      )}

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

      <div className="grid grid-cols-2 gap-2">
        <Input inputMode="decimal" placeholder="weight" value={defaultWeight}
          onChange={(e) => setWeight(e.target.value)} className="rounded-none border-2 border-foreground h-12 text-lg tabular-nums" />
        <Input inputMode="numeric" placeholder="reps" value={reps}
          onChange={(e) => setReps(e.target.value)} className="rounded-none border-2 border-foreground h-12 text-lg tabular-nums" />
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

      <Button onClick={submit} disabled={!defaultWeight || !reps} className="rounded-none h-12 display text-lg">
        LOG SET {sets.filter((s) => !s.isWarmup).length + (isWarmup ? 0 : 1)}
      </Button>
    </div>
  );
}
