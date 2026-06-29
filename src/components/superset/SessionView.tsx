"use client";

import { useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { rampPlan, nextSetTarget, explainNextSet, type SetRecord, type SetTarget } from "../../../convex/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Item, ItemContent, ItemTitle, ItemActions } from "@/components/ui/item";
import { ButtonGroup } from "@/components/ui/button-group";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RestTimer } from "./RestTimer";
import { VoiceLog } from "./VoiceLog";
import { CardioLogger } from "./CardioLogger";
import {
  Check, Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, ArrowUpDown,
  Mic, MicOff, ChevronRight, ChevronLeft, GripVertical, Search,
} from "lucide-react";

interface SpeechRec {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

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
  if (!session) return <TrainHome days={days} />;
  return <ActiveSession session={session} days={days} />;
}

// ---------------------------------------------------------------------------
// Train home, monthly dashboard + a FAB that opens the day picker
// ---------------------------------------------------------------------------

function monthBounds(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  const prevStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  return { start, end, prevStart, prevEnd: start };
}

const fmtVolume = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));

function StatTile({ label, value, delta, fmt = (n: number) => String(n) }: {
  label: string; value: number | undefined; delta: number | undefined; fmt?: (n: number) => string;
}) {
  const d = delta ?? 0;
  return (
    <Card className="gap-0 py-3 px-3 items-start">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="num display text-2xl leading-tight">{value === undefined ? "·" : fmt(value)}</span>
      <span className="num text-[11px]" style={{ color: d > 0 ? "var(--accent-user)" : "var(--muted-foreground)" }}>
        {d > 0 ? "▲" : d < 0 ? "▼" : "·"} {fmt(Math.abs(d))} vs last mo
      </span>
    </Card>
  );
}

function TrainHome({ days }: { days: Doc<"programDays">[] }) {
  const [bounds] = useState(() => monthBounds(new Date()));
  const [monthName] = useState(() => new Date().toLocaleDateString(undefined, { month: "long" }).toUpperCase());
  const thisMonth = useQuery(api.workouts.rangeStats, { start: bounds.start, end: bounds.end });
  const lastMonth = useQuery(api.workouts.rangeStats, { start: bounds.prevStart, end: bounds.prevEnd });
  const [pickOpen, setPickOpen] = useState(false);

  const delta = (k: "workouts" | "sets" | "volume") =>
    thisMonth && lastMonth ? thisMonth[k] - lastMonth[k] : undefined;

  return (
    <div className="p-3 flex flex-col gap-3">
      <h2 className="display text-3xl mt-1">{monthName}</h2>
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Workouts" value={thisMonth?.workouts} delta={delta("workouts")} />
        <StatTile label="Sets" value={thisMonth?.sets} delta={delta("sets")} />
        <StatTile label="Volume" value={thisMonth?.volume} delta={delta("volume")} fmt={fmtVolume} />
      </div>

      {thisMonth && thisMonth.workouts === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          No workouts logged this month yet. Tap <span className="font-semibold">+</span> to start one.
        </p>
      )}

      {/* FAB → what kind of day */}
      <button onClick={() => setPickOpen(true)} aria-label="Start a workout"
        className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-20 h-14 w-14 rounded-full grid place-items-center shadow-lg active:scale-95 transition-transform"
        style={{ background: "var(--accent-user)", color: "#fff" }}>
        <Plus size={26} />
      </button>

      <DayPicker days={days} open={pickOpen} onOpenChange={setPickOpen} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day picker, editable templates
// ---------------------------------------------------------------------------

function DayPicker({ days, open, onOpenChange }: {
  days: Doc<"programDays">[]; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const start = useMutation(api.workouts.startSession);
  const createDay = useMutation(api.workouts.createProgramDay);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Doc<"programDays"> | null>(null);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-md mx-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle className="display text-2xl">What are we training?</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-2 overflow-y-auto pb-2">
          {days.map((d) => (
            <div key={d._id} className={`flex items-stretch overflow-hidden ${card}`}>
              <button onClick={() => start({ programDayId: d._id })}
                className="flex-1 px-4 py-3 text-left flex items-center justify-between gap-3 active:bg-muted transition-colors">
                <span className="display text-base leading-none truncate">{d.name.toUpperCase()}</span>
                <span className="text-[11px] text-muted-foreground shrink-0">{d.exerciseIds.length} exercises</span>
              </button>
              <button onClick={() => setEditing(d)} aria-label="Edit day"
                className="px-3.5 text-muted-foreground active:bg-muted border-l border-border">
                <Pencil size={15} />
              </button>
            </div>
          ))}

          {adding ? (
            <div className={`p-3 flex flex-col gap-2 ${card}`}>
              <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Day name (e.g. Push, Pull, Custom Leg Day)" className="h-11" />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-10" onClick={() => { setAdding(false); setNewName(""); }}>
                  Cancel
                </Button>
                <Button className="h-10" disabled={!newName.trim()}
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
              className="rounded-xl border border-dashed border-muted-foreground/40 px-4 py-3 text-left text-xs text-muted-foreground flex items-center gap-2 active:bg-muted">
              <Plus size={15} /> New day
            </button>
          )}

          <button onClick={() => start({})}
            className="rounded-xl border border-dashed border-muted-foreground/40 px-4 py-3 text-left text-xs text-muted-foreground active:bg-muted">
            Freestyle session (no template)
          </button>
        </div>

        {editing && <DayEditor day={editing} onClose={() => setEditing(null)} />}
      </DrawerContent>
    </Drawer>
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
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-w-md mx-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="px-0 text-left"><DrawerTitle className="display text-2xl">Edit day</DrawerTitle></DrawerHeader>

        <div className="flex flex-col gap-3 overflow-y-auto">
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
            <Button className="h-11 rounded-xl" disabled={!name.trim() || name === liveDay.name}
              onClick={() => rename({ id: liveDay._id, name: name.trim() })}>Save</Button>
          </div>

          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Order = your priority</p>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {ids.map((id, i) => (
              <div key={id} className="flex items-center gap-1 rounded-xl bg-muted px-3 py-2">
                <span className="flex-1 text-sm">{byId.get(id)?.name ?? "·"}</span>
                <button onClick={() => move(i, i - 1)} disabled={i === 0} className="p-1.5 disabled:opacity-30"><ChevronUp size={16} /></button>
                <button onClick={() => move(i, i + 1)} disabled={i === ids.length - 1} className="p-1.5 disabled:opacity-30"><ChevronDown size={16} /></button>
                <button onClick={() => setExercises({ id: liveDay._id, exerciseIds: ids.filter((x) => x !== id) })}
                  className="p-1.5 text-muted-foreground"><X size={16} /></button>
              </div>
            ))}
            {ids.length === 0 && <p className="text-xs text-muted-foreground py-2">No exercises yet, add some below.</p>}
          </div>

          <AddExerciseDialog existingIds={new Set(ids)}
            onPick={(exId) => setExercises({ id: liveDay._id, exerciseIds: [...ids, exId] })}
            trigger={<Button variant="outline" className="h-11 rounded-xl gap-2"><Plus size={16} /> Add exercise</Button>} />

          <button onClick={async () => { await remove({ id: liveDay._id }); onClose(); }}
            className="mt-1 mb-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 self-start">
            <Trash2 size={13} /> Delete this day
          </button>
        </div>
      </DrawerContent>
    </Drawer>
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
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="max-w-md mx-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="px-0 text-left"><DrawerTitle className="display text-2xl">Add exercise</DrawerTitle></DrawerHeader>

        <div className="flex flex-col gap-3 overflow-y-auto">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" className="h-11 pl-10 bg-muted/60" />
          </div>
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
            {available.map((e) => (
              <button key={e._id} onClick={() => { onPick(e._id); setOpen(false); setQ(""); }}
                className="rounded-full bg-muted px-4 py-3 text-left text-sm active:bg-foreground active:text-background transition-colors flex justify-between items-center">
                <span>{e.name}</span>
                <span className="text-[10px] text-muted-foreground uppercase">{e.muscleGroup}</span>
              </button>
            ))}
            {available.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 px-1">
                {q ? `No match for "${q}".` : "No more exercises."} Create it below.
              </p>
            )}
          </div>

          <div className="border-t border-border pt-3 flex flex-col gap-2 mb-2">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Create a new exercise</p>
            <Input value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="What's it called? (e.g. Cable Crossover)" className="h-11" />
            <div className="flex gap-2">
              <Input value={quickGroup} onChange={(e) => setQuickGroup(e.target.value)} placeholder="Muscle group (e.g. Chest)" className="h-11 flex-1" />
              <button onClick={() => setCompound(!compound)}
                className="rounded-full px-4 text-[11px] tracking-widest whitespace-nowrap ring-1 ring-foreground/15"
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
        </div>
      </DrawerContent>
    </Drawer>
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
  const discard = useMutation(api.workouts.discardSession);
  const addToSession = useMutation(api.workouts.addExerciseToSession);
  const setDayExercises = useMutation(api.workouts.setDayExercises);

  const [activeExercise, setActiveExercise] = useState<Id<"exercises"> | null>(null);
  const [reordering, setReordering] = useState(false);
  const [now] = useState(() => Date.now());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!day || !over || active.id === over.id) return;
    const ids = day.exerciseIds;
    const oldIndex = ids.indexOf(active.id as Id<"exercises">);
    const newIndex = ids.indexOf(over.id as Id<"exercises">);
    if (oldIndex < 0 || newIndex < 0) return;
    setDayExercises({ id: day._id, exerciseIds: arrayMove(ids, oldIndex, newIndex) });
  };

  const iconBtn = "h-9 w-9 grid place-items-center rounded-full ring-1 ring-foreground/15 active:bg-muted";

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 sticky top-0 -mx-3 px-3 py-1.5 bg-background/90 backdrop-blur z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          {sets.length === 0 ? (
            <button className={iconBtn} onClick={() => discard({ sessionId: session._id })} aria-label="Back">
              <ChevronLeft size={17} />
            </button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className={iconBtn} aria-label="Back"><ChevronLeft size={17} /></button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave this session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You&apos;ve logged {sets.filter((s) => !s.isWarmup).length} set(s). Finishing keeps them in your history;
                    discarding deletes them.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-2">
                  <AlertDialogCancel className="rounded-xl">Keep going</AlertDialogCancel>
                  <AlertDialogAction className="rounded-xl" onClick={() => finish({ sessionId: session._id })}>
                    Finish &amp; save
                  </AlertDialogAction>
                  <AlertDialogAction
                    className="rounded-xl bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => discard({ sessionId: session._id })}>
                    Discard
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <h2 className="display text-2xl truncate">{(day?.name ?? "FREESTYLE").toUpperCase()}</h2>
        </div>
        <div className="flex gap-1.5">
          {day && (
            <button className={iconBtn} onClick={() => setReordering((r) => !r)} aria-label="Reorder"
              style={reordering ? { background: "var(--accent-user)", color: "#fff" } : undefined}>
              <ArrowUpDown size={16} />
            </button>
          )}
          <VoiceLog sessionId={session._id} nextIndexFor={(exId) => (sets ?? []).filter((s) => s.exerciseId === exId).length} />
          <button className={iconBtn} onClick={() => finish({ sessionId: session._id })} aria-label="Finish">
            <Check size={18} />
          </button>
        </div>
      </div>

      {reordering && day ? (
        <>
          <p className="text-[11px] text-muted-foreground px-1 -mb-0.5">Drag to reorder. Order saves to the day.</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={onDragEnd}>
            <SortableContext items={day.exerciseIds} strategy={verticalListSortingStrategy}>
              {day.exerciseIds.map((id) => {
                const ex = byId.get(id);
                if (!ex) return null;
                return <SortableExerciseRow key={id} id={id} name={ex.name} />;
              })}
            </SortableContext>
          </DndContext>
        </>
      ) : (
        orderedIds.map((id) => {
          const ex = byId.get(id);
          if (!ex) return null;
          const exSets = sets.filter((s) => s.exerciseId === id);
          const last = recency?.[id];
          const muted = exSets.length === 0 && (!last || now - last > RARELY_DONE_DAYS * DAY_MS);
          return (
            <ExerciseCard key={id} exercise={ex} sessionId={session._id} sets={exSets} muted={muted}
              isActive={activeExercise === id} onActivate={() => setActiveExercise(activeExercise === id ? null : id)} />
          );
        })
      )}

      {!reordering && (
        <AddExerciseDialog existingIds={new Set(orderedIds)}
          onPick={(exId) => addToSession({ sessionId: session._id, exerciseId: exId })}
          trigger={
            <button className="rounded-xl border border-dashed border-muted-foreground/40 px-4 py-2.5 text-left text-xs text-muted-foreground flex items-center gap-2 active:bg-muted">
              <Plus size={15} /> Add an exercise
            </button>
          } />
      )}

      {!reordering && <CardioLogger sessionId={session._id} />}
    </div>
  );
}

function SortableExerciseRow({ id, name }: { id: Id<"exercises">; name: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 10 : undefined }}
      className={`flex items-center gap-2 px-3 py-3 touch-none cursor-grab active:cursor-grabbing ${card}`}>
      <GripVertical size={16} className="text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm font-medium truncate">{name}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise card, full editable table
// ---------------------------------------------------------------------------

function EffortPills({ value, onChange }: { value: FatigueId | null; onChange: (f: FatigueId | null) => void }) {
  return (
    <ButtonGroup className="w-full [&>*]:flex-1">
      {FATIGUE.map((f) => {
        const on = value === f.id;
        const danger = f.id === "failure" || f.id === "tooTired";
        return (
          <Button key={f.id} type="button" size="sm"
            variant={on ? "default" : "outline"}
            onClick={() => onChange(on ? null : f.id)}
            className="text-[11px] font-semibold tracking-wide"
            style={on && danger ? { background: "var(--accent-user)", borderColor: "var(--accent-user)", color: "#fff" } : undefined}>
            {f.label}
          </Button>
        );
      })}
    </ButtonGroup>
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
  const adjust = useAction(api.agent.adjustTarget);

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [fatigue, setFatigue] = useState<FatigueId | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [stopNote, setStopNote] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<Id<"sets"> | null>(null);
  const [note, setNote] = useState("");
  const [coachMsg, setCoachMsg] = useState<string | null>(null);
  const [adjusted, setAdjusted] = useState<SetTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  const workingDone = sets.filter((s) => !s.isWarmup).length;

  if (!isActive) {
    const done = sets.length > 0;
    return (
      <Item variant="outline" asChild className="rounded-2xl cursor-pointer active:bg-muted">
        <button onClick={onActivate}>
          <ItemContent>
            <ItemTitle className="text-base">{exercise.name}</ItemTitle>
          </ItemContent>
          <ItemActions>
            {done ? (
              <Badge variant="secondary" className="num">{workingDone} sets</Badge>
            ) : (
              <span className="text-xs text-muted-foreground">{muted ? "rarely done" : "tap to start"}</span>
            )}
            <ChevronRight size={16} className="text-muted-foreground" />
          </ItemActions>
        </button>
      </Item>
    );
  }

  const last: SetRecord[] = (lastSets ?? []) as SetRecord[];
  const plan = rampPlan(exercise, last);
  const baseline = nextSetTarget(exercise, sets as SetRecord[], plan);
  const target = adjusted ?? baseline;
  const recReason = explainNextSet(exercise, sets as SetRecord[], plan, last.filter((s) => !s.isWarmup));

  // No silent autofill, the lifter applies the coach's recommendation explicitly.
  const wVal = weight;
  const rVal = reps;
  const applyRec = () => { setWeight(target.weight > 0 ? String(target.weight) : ""); setReps(target.reps > 0 ? String(target.reps) : ""); };

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

  // Per-set note: give the agent context for THIS set; it nudges the rec
  // (engine-clamped). Logging itself happens via the inputs / global coach.
  const sendNote = async (text: string) => {
    if (!text.trim()) return;
    setBusy(true); setCoachMsg(null);
    try {
      const res = await adjust({
        exerciseName: exercise.name, baselineWeight: baseline.weight, baselineReps: baseline.reps,
        weightIncrement: exercise.weightIncrement, userContext: text,
      });
      setAdjusted({ weight: res.weight, reps: res.reps });
      setWeight(String(res.weight)); setReps(String(res.reps));
      setCoachMsg(res.reason + (res.clamped ? " (kept in a safe range)" : ""));
      setNote("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setCoachMsg(msg.includes("OPENAI_API_KEY") ? "OpenAI key not set on Convex." : "Couldn't process that.");
    } finally { setBusy(false); }
  };

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { setCoachMsg("Voice not supported here, type instead."); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
      const final = text.trim();
      setNote(final);
      void sendNote(final);
    };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-foreground/10 p-3 flex flex-col gap-2">
      <button onClick={onActivate} className="flex justify-between items-baseline text-left">
        <span className="display text-lg leading-none">{exercise.name.toUpperCase()}</span>
        <span className="text-[10px] text-muted-foreground">{exercise.repRangeMin}–{exercise.repRangeMax} reps</span>
      </button>

      {/* Table of sets */}
      <div className="flex flex-col gap-1">
        {loggedWarmups.map((s) =>
          editingId === s._id
            ? <EditRow key={s._id} set={s} onSave={(p) => { updateSet({ setId: s._id, ...p }); setEditingId(null); }} onDelete={() => { deleteSet({ setId: s._id }); setEditingId(null); }} onCancel={() => setEditingId(null)} />
            : <LoggedRow key={s._id} label="WARM" set={s} onTap={() => setEditingId(s._id)} />
        )}
        {suggestionWarmups.map((t, i) => (
          <button key={`sw${i}`} onClick={() => logWarmupSuggestion(t)}
            className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-1.5 text-left text-muted-foreground">
            <span className="text-[10px] font-semibold tracking-wide w-11">WARM</span>
            <span className="num flex-1 text-sm">{t.weight} <span className="text-muted-foreground">×</span> {t.reps}</span>
            <span className="text-[10px]">tap to log</span>
          </button>
        ))}

        {loggedWorking.map((s, i) =>
          editingId === s._id
            ? <EditRow key={s._id} set={s} onSave={(p) => { updateSet({ setId: s._id, ...p }); setEditingId(null); }} onDelete={() => { deleteSet({ setId: s._id }); setEditingId(null); }} onCancel={() => setEditingId(null)} />
            : <LoggedRow key={s._id} label={`SET ${i + 1}`} set={s} onTap={() => setEditingId(s._id)} />
        )}

        {/* Active next-set row, coach recommendation + entry */}
        <div className="rounded-lg p-2.5 flex flex-col gap-2 mt-0.5" style={{ background: "color-mix(in oklch, var(--accent-user) 12%, transparent)" }}>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold tracking-widest" style={{ color: "var(--accent-user)" }}>
              SUPERSET COACH
            </span>
            <span className="text-[10px] text-muted-foreground">· set {workingDone + 1}</span>
            {adjusted && <span className="text-[10px] text-muted-foreground ml-auto">adjusted</span>}
          </div>

          {/* The recommendation, explicit, tap to apply (no silent autofill) */}
          {target.weight > 0 ? (
            <button onClick={applyRec}
              className="rounded-md bg-card/70 ring-1 ring-foreground/10 px-2.5 py-2 text-left active:opacity-70">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">rec</span>
                <span className="num text-lg font-semibold">{target.weight} <span className="text-sm text-muted-foreground">× {target.reps}</span></span>
                <span className="text-[10px] text-muted-foreground ml-auto">tap to use →</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{adjusted ? (coachMsg ?? "Adjusted from what you told me.") : recReason}</p>
            </button>
          ) : (
            <p className="text-[11px] text-muted-foreground px-1">{recReason}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Input inputMode="decimal" value={wVal} placeholder={target.weight > 0 ? `${target.weight} lb` : "weight"}
              onChange={(e) => setWeight(e.target.value)} className="num h-11 rounded-lg text-lg text-center" />
            <Input inputMode="numeric" value={rVal} placeholder={target.reps > 0 ? `${target.reps} reps` : "reps"}
              onChange={(e) => setReps(e.target.value)} className="num h-11 rounded-lg text-lg text-center" />
          </div>
          <EffortPills value={fatigue} onChange={setFatigue} />
          <div className="flex gap-2">
            <Button onClick={() => submit(false)} disabled={!wVal || !rVal} className="flex-1 h-10 rounded-lg text-sm font-semibold">
              Log set {workingDone + 1}
            </Button>
            <Button variant="outline" onClick={() => submit(true)} disabled={!wVal || !rVal} className="h-10 rounded-lg px-3 text-sm" title="Log as warmup">
              Warm
            </Button>
          </div>
        </div>

        {/* What's coming after, the ramp ahead */}
        {futureTargets.map((t, i) => (
          <div key={`ft${i}`} className="flex items-center gap-3 px-3 py-1 text-muted-foreground/60">
            <span className="text-[10px] font-semibold tracking-wide w-11">SET {workingDone + 2 + i}</span>
            <span className="num flex-1 text-sm">{t.weight > 0 ? `${t.weight} × ${t.reps}` : "·"}</span>
            <span className="text-[10px]">planned</span>
          </div>
        ))}
      </div>

      {timerStart && <RestTimer seconds={exercise.restSeconds} startedAt={timerStart} />}
      {stopNote && (
        <p className="text-xs rounded-lg px-3 py-2" style={{ background: "color-mix(in oklch, var(--accent-user) 12%, transparent)" }}>{stopNote}</p>
      )}

      {/* Per-set note: text or voice context for the agent on this set */}
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        {coachMsg && (
          <p className="text-xs rounded-lg px-3 py-2" style={{ background: "color-mix(in oklch, var(--accent-user) 10%, transparent)" }}>{coachMsg}</p>
        )}
        <div className="flex items-center gap-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void sendNote(note); }}
            placeholder="Note for this set (e.g. shoulder felt tweaky)" className="h-10 flex-1" />
          <button onClick={toggleMic} aria-label="Voice note"
            className="h-10 w-10 grid place-items-center rounded-full ring-1 ring-foreground/15 shrink-0"
            style={listening ? { background: "var(--accent-user)", color: "#fff" } : undefined}>
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <Button className="h-10 shrink-0" disabled={!note.trim() || busy} onClick={() => sendNote(note)}>
            {busy ? "…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoggedRow({ label, set, onTap }: { label: string; set: Doc<"sets">; onTap: () => void }) {
  return (
    <button onClick={onTap} className="flex items-center gap-3 rounded-lg bg-muted px-3 py-1.5 text-left active:opacity-70">
      <span className="text-[10px] font-semibold tracking-wide w-11 text-muted-foreground">{label}</span>
      <span className="num flex-1 font-medium text-sm">{set.weight} <span className="text-muted-foreground">×</span> {set.reps}</span>
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
