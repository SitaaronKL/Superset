import { useMemo, useState } from "react";
import {
  Alert, FlatList, Modal, Pressable, ScrollView, Text, View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAction, useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react-native";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import {
  rampPlan, nextSetTarget, explainNextSet, type SetRecord, type SetTarget,
} from "../../../../convex/engine";
import { Body, Card, Display, Eyebrow, Field, Num, Pill } from "@/components/ui/kit";
import { WeekDots, weekHits } from "@/components/week-dots";
import { RestDock } from "@/components/rest-dock";
import { fonts, palette, useTheme } from "@/lib/theme";

const FATIGUE = [
  { id: "ez", label: "EZ" },
  { id: "struggle", label: "HARD" },
  { id: "failure", label: "FAIL" },
  { id: "tooTired", label: "DEAD" },
] as const;
type FatigueId = (typeof FATIGUE)[number]["id"];

export default function TrainScreen() {
  const session = useQuery(api.workouts.activeSession);
  const days = useQuery(api.workouts.listProgramDays);
  const t = useTheme();

  if (session === undefined || days === undefined) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}><Body color={t.mutedFg} style={{ padding: 24 }}>Loading…</Body></SafeAreaView>;
  }
  if (!session) return <TrainHome days={days} />;
  return <ActiveSession session={session} days={days} />;
}

// ---------------------------------------------------------------------------
// Train home
// ---------------------------------------------------------------------------

function monthBounds(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  const prevStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  return { start, end, prevStart, prevEnd: start };
}
const fmtVolume = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));

function StatTile({ label, value, delta, fmt = String }: {
  label: string; value: number | undefined; delta: number | undefined; fmt?: (n: number) => string;
}) {
  const t = useTheme();
  const d = delta ?? 0;
  return (
    <Card style={{ flex: 1, padding: 12, gap: 2, alignItems: "flex-start" }}>
      <Eyebrow style={{ fontSize: 10 }}>{label}</Eyebrow>
      <Text style={{ fontFamily: fonts.display, fontSize: 26, color: t.fg, fontVariant: ["tabular-nums"] }}>
        {value === undefined ? "·" : fmt(value)}
      </Text>
      <View style={{ backgroundColor: t.muted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 }}>
        <Num size={11} color={t.mutedFg}>{d > 0 ? "▲" : d < 0 ? "▼" : "·"} {fmt(Math.abs(d))}</Num>
      </View>
    </Card>
  );
}

function TrainHome({ days }: { days: Doc<"programDays">[] }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [bounds] = useState(() => monthBounds(new Date()));
  const [monthName] = useState(() => new Date().toLocaleDateString(undefined, { month: "long" }));
  const thisMonth = useQuery(api.workouts.rangeStats, { start: bounds.start, end: bounds.end });
  const lastMonth = useQuery(api.workouts.rangeStats, { start: bounds.prevStart, end: bounds.prevEnd });
  const recent = useQuery(api.workouts.recentSessions);
  const start = useMutation(api.workouts.startSession);
  const [pickOpen, setPickOpen] = useState(false);

  const delta = (k: "workouts" | "sets" | "volume") =>
    thisMonth && lastMonth ? thisMonth[k] - lastMonth[k] : undefined;
  const trained = weekHits((recent ?? []).filter((s) => s.status === "done").map((s) => s.date));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 140 }}>
        <Display size={34}>{monthName}</Display>

        <Card>
          <Eyebrow>This week</Eyebrow>
          <WeekDots hits={trained} />
        </Card>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatTile label="Workouts" value={thisMonth?.workouts} delta={delta("workouts")} />
          <StatTile label="Sets" value={thisMonth?.sets} delta={delta("sets")} />
          <StatTile label="Volume" value={thisMonth?.volume} delta={delta("volume")} fmt={fmtVolume} />
        </View>

        {thisMonth && thisMonth.workouts === 0 && (
          <View style={{ alignItems: "center", marginTop: 28 }}>
            <Display size={44}>Squat.</Display>
            <Display size={44} style={{ opacity: 0.55 }}>Bench.</Display>
            <Display size={44} style={{ opacity: 0.22 }}>Deadlift.</Display>
            <Body color={t.mutedFg} style={{ marginTop: 12 }}>Nothing logged this month. Tap + to pick a day.</Body>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPickOpen(true); }}
        accessibilityLabel="Start a workout"
        style={({ pressed }) => ({
          position: "absolute", bottom: insets.bottom + 70, alignSelf: "center",
          width: 58, height: 58, borderRadius: 29, backgroundColor: t.accent,
          alignItems: "center", justifyContent: "center",
          shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
          transform: [{ scale: pressed ? 0.94 : 1 }],
        })}
      >
        <Plus size={28} color={t.accentFg} />
      </Pressable>

      <Modal visible={pickOpen} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setPickOpen(false)}>
        <View style={{ flex: 1, backgroundColor: t.bg, padding: 20, gap: 10 }}>
          <Display size={26} style={{ marginBottom: 8 }}>What are we training?</Display>
          <FlatList
            data={days}
            keyExtractor={(d) => d._id}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item: d }) => (
              <Pressable
                onPress={() => { setPickOpen(false); void start({ programDayId: d._id }); }}
                style={({ pressed }) => ({
                  backgroundColor: t.card, borderRadius: 22, padding: 18,
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  borderWidth: 1, borderColor: t.hairline, opacity: pressed ? 0.7 : 1,
                })}
              >
                <Display size={17}>{d.name}</Display>
                <Num size={12} color={t.mutedFg}>{d.exerciseIds.length} exercises</Num>
              </Pressable>
            )}
            ListFooterComponent={
              <Pressable onPress={() => { setPickOpen(false); void start({}); }}
                style={{ borderRadius: 22, borderWidth: 1, borderStyle: "dashed", borderColor: t.border, padding: 18 }}>
                <Body color={t.mutedFg}>Freestyle session (no template)</Body>
              </Pressable>
            }
          />
          <Pill label="Cancel" kind="outline" onPress={() => setPickOpen(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Active session
// ---------------------------------------------------------------------------

function ActiveSession({ session, days }: { session: Doc<"sessions">; days: Doc<"programDays">[] }) {
  const t = useTheme();
  const exercises = useQuery(api.workouts.listExercises);
  const sets = useQuery(api.workouts.sessionSets, { sessionId: session._id });
  const finish = useMutation(api.workouts.finishSession);
  const discard = useMutation(api.workouts.discardSession);
  const [activeExercise, setActiveExercise] = useState<Id<"exercises"> | null>(null);
  const [timer, setTimer] = useState<{ startedAt: number; seconds: number; nextLabel: string | null } | null>(null);

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

  if (!exercises || !sets) return <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}><Body color={t.mutedFg} style={{ padding: 24 }}>Loading…</Body></SafeAreaView>;

  const leave = () => {
    const working = sets.filter((s) => !s.isWarmup).length;
    if (working === 0) { void discard({ sessionId: session._id }); return; }
    Alert.alert("Leave this session?", `You've logged ${working} set(s).`, [
      { text: "Keep going", style: "cancel" },
      { text: "Finish & save", onPress: () => void finish({ sessionId: session._id }) },
      { text: "Discard", style: "destructive", onPress: () => void discard({ sessionId: session._id }) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
        <Pressable onPress={leave} accessibilityLabel="Back"
          style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={18} color={t.fg} />
        </Pressable>
        <Display size={22} style={{ flex: 1 }} numberOfLines={1}>{day?.name ?? "Freestyle"}</Display>
        <Pressable onPress={() => void finish({ sessionId: session._id })} accessibilityLabel="Finish"
          style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" }}>
          <Check size={18} color={t.fg} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 180 }}>
        {orderedIds.map((id) => {
          const ex = byId.get(id);
          if (!ex) return null;
          const exSets = sets.filter((s) => s.exerciseId === id);
          return (
            <ExerciseCard key={id} exercise={ex} sessionId={session._id} sets={exSets}
              isActive={activeExercise === id}
              onActivate={() => setActiveExercise(activeExercise === id ? null : id)}
              onRest={(seconds, nextLabel) => setTimer({ startedAt: Date.now(), seconds, nextLabel })} />
          );
        })}
      </ScrollView>

      {timer && (
        <RestDock seconds={timer.seconds} startedAt={timer.startedAt} nextLabel={timer.nextLabel}
          onSkip={() => setTimer(null)} />
      )}
    </SafeAreaView>
  );
}

function EffortPills({ value, onChange }: { value: FatigueId | null; onChange: (f: FatigueId | null) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {FATIGUE.map((f) => {
        const on = value === f.id;
        const danger = f.id === "failure" || f.id === "tooTired";
        return (
          <Pressable key={f.id} onPress={() => onChange(on ? null : f.id)}
            style={{
              flex: 1, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center",
              backgroundColor: on ? (danger ? t.destructive : t.fg) : "transparent",
              borderWidth: on ? 0 : 1, borderColor: t.border,
            }}>
            <Text style={{
              fontFamily: fonts.sansSemiBold, fontSize: 12,
              color: on ? (danger ? "#fff" : "#000") : t.fg,
            }}>{f.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ExerciseCard({ exercise, sessionId, sets, isActive, onActivate, onRest }: {
  exercise: Doc<"exercises">;
  sessionId: Id<"sessions">;
  sets: Doc<"sets">[];
  isActive: boolean;
  onActivate: () => void;
  onRest: (seconds: number, nextLabel: string | null) => void;
}) {
  const t = useTheme();
  const lastSets = useQuery(api.workouts.lastSessionSetsFor, isActive ? { exerciseId: exercise._id } : "skip");
  const logSet = useMutation(api.workouts.logSet);
  const deleteSet = useMutation(api.workouts.deleteSet);

  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [fatigue, setFatigue] = useState<FatigueId | null>(null);

  const workingDone = sets.filter((s) => !s.isWarmup).length;

  if (!isActive) {
    const done = sets.length > 0;
    return (
      <Pressable onPress={onActivate}
        style={({ pressed }) => ({
          backgroundColor: t.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: t.hairline,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between", opacity: pressed ? 0.7 : 1,
        })}>
        <Body size={15} style={{ fontFamily: fonts.sansMedium }}>{exercise.name}</Body>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {done
            ? <Num size={12} color={t.mutedFg}>{workingDone} sets</Num>
            : <Body size={12} color={t.mutedFg}>tap to start</Body>}
          <ChevronRight size={16} color={t.mutedFg} />
        </View>
      </Pressable>
    );
  }

  const last: SetRecord[] = (lastSets ?? []) as SetRecord[];
  const lastWorking = last.filter((s) => !s.isWarmup);
  const ghost = lastWorking[workingDone] ?? null;
  const plan = rampPlan(exercise, last);
  const target = nextSetTarget(exercise, sets as SetRecord[], plan);
  const recReason = explainNextSet(exercise, sets as SetRecord[], plan, lastWorking);

  const loggedWarmups = sets.filter((s) => s.isWarmup);
  const loggedWorking = sets.filter((s) => !s.isWarmup);
  const suggestionWarmups = plan.warmups.slice(loggedWarmups.length);
  const futureTargets = plan.workingTargets.slice(loggedWorking.length + 1);

  const submit = async (warmup: boolean) => {
    const w = Number(weight), r = Number(reps);
    if (!w || !r) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logSet({
      sessionId, exerciseId: exercise._id, setIndex: sets.length,
      weight: w, reps: r, fatigue: warmup ? undefined : fatigue ?? undefined, isWarmup: warmup,
    });
    setWeight(""); setReps(""); setFatigue(null);
    if (!warmup) {
      // Next target after this set: recompute cheaply from the plan.
      const next = plan.workingTargets[loggedWorking.length + 1];
      onRest(exercise.restSeconds, next && next.weight > 0 ? `${next.weight} × ${next.reps}` : null);
    }
  };

  const logSuggested = (tg: SetTarget, warmup: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void logSet({ sessionId, exerciseId: exercise._id, setIndex: sets.length, weight: tg.weight, reps: tg.reps, isWarmup: warmup });
  };

  const rowStyle = { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 };

  return (
    <View style={{ backgroundColor: t.card, borderRadius: 22, padding: 14, gap: 8, borderWidth: 1, borderColor: t.hairline }}>
      <Pressable onPress={onActivate} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Display size={17}>{exercise.name}</Display>
        <Num size={11} color={t.mutedFg}>{exercise.repRangeMin}-{exercise.repRangeMax} reps</Num>
      </Pressable>

      {loggedWarmups.map((s) => (
        <Pressable key={s._id} onLongPress={() => confirmDelete(s._id)} style={[rowStyle, { backgroundColor: t.muted }]}>
          <Eyebrow style={{ width: 44, fontSize: 10 }}>Warm</Eyebrow>
          <Num size={14}>{s.weight} × {s.reps}</Num>
        </Pressable>
      ))}
      {suggestionWarmups.map((tg, i) => (
        <Pressable key={`sw${i}`} onPress={() => logSuggested(tg, true)} style={[rowStyle, { backgroundColor: t.muted, opacity: 0.6 }]}>
          <Eyebrow style={{ width: 44, fontSize: 10 }}>Warm</Eyebrow>
          <Num size={14} color={t.mutedFg}>{tg.weight} × {tg.reps}</Num>
          <Body size={11} color={t.mutedFg} style={{ marginLeft: "auto" }}>tap to log</Body>
        </Pressable>
      ))}
      {loggedWorking.map((s, i) => (
        <Pressable key={s._id} onLongPress={() => confirmDelete(s._id)} style={[rowStyle, { backgroundColor: t.accentTint }]}>
          <Eyebrow style={{ width: 44, fontSize: 10 }}>Set {i + 1}</Eyebrow>
          <Num size={14} weight="semibold">{s.weight} × {s.reps}</Num>
          {s.fatigue && (
            <View style={{
              marginLeft: "auto", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
              backgroundColor: s.fatigue === "failure" || s.fatigue === "tooTired" ? t.destructive : t.fg,
            }}>
              <Text style={{ fontSize: 10, fontFamily: fonts.sansSemiBold, color: s.fatigue === "failure" || s.fatigue === "tooTired" ? "#fff" : "#000" }}>
                {FATIGUE.find((f) => f.id === s.fatigue)?.label}
              </Text>
            </View>
          )}
        </Pressable>
      ))}

      {/* Coach block: the engine's prescription is the focal point */}
      <View style={{ backgroundColor: t.accentTint, borderRadius: 14, padding: 12, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Eyebrow style={{ fontSize: 10 }}>Target</Eyebrow>
          {ghost && <Num size={11} color={t.mutedFg}>last {ghost.weight} × {ghost.reps}</Num>}
          <Eyebrow style={{ fontSize: 10, marginLeft: "auto" }}>set {workingDone + 1}</Eyebrow>
        </View>
        {target.weight > 0 ? (
          <Pressable onPress={() => { setWeight(String(target.weight)); setReps(String(target.reps)); }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 38, color: t.fg, fontVariant: ["tabular-nums"] }}>
              {target.weight}
              <Text style={{ fontSize: 20, color: t.mutedFg }}> × {target.reps}</Text>
            </Text>
            <Body size={12} color={t.mutedFg}>{recReason} · tap to use</Body>
          </Pressable>
        ) : (
          <Body size={12} color={t.mutedFg}>{recReason}</Body>
        )}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Field mono value={weight} onChangeText={setWeight} placeholder={target.weight > 0 ? `${target.weight} lb` : "weight"}
            keyboardType="decimal-pad" style={{ flex: 1, textAlign: "center" }} />
          <Field mono value={reps} onChangeText={setReps} placeholder={target.reps > 0 ? `${target.reps} reps` : "reps"}
            keyboardType="number-pad" style={{ flex: 1, textAlign: "center" }} />
        </View>
        <EffortPills value={fatigue} onChange={setFatigue} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pill label={`Log set ${workingDone + 1}`} onPress={() => void submit(false)}
            disabled={!weight || !reps} style={{ flex: 1 }} />
          <Pill label="Warm" kind="outline" onPress={() => void submit(true)} disabled={!weight || !reps} />
        </View>
      </View>

      {futureTargets.map((tg, i) => (
        <View key={`ft${i}`} style={[rowStyle, { opacity: 0.45 }]}>
          <Eyebrow style={{ width: 44, fontSize: 10 }}>Set {workingDone + 2 + i}</Eyebrow>
          <Num size={14} color={t.mutedFg}>{tg.weight > 0 ? `${tg.weight} × ${tg.reps}` : "·"}</Num>
          <Body size={11} color={t.mutedFg} style={{ marginLeft: "auto" }}>planned</Body>
        </View>
      ))}
    </View>
  );

  function confirmDelete(setId: Id<"sets">) {
    Alert.alert("Delete this set?", undefined, [
      { text: "Keep", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteSet({ setId }) },
    ]);
  }
}
