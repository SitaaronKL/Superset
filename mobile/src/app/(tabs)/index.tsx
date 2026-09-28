import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Host, RNHostView } from "@expo/ui";
import { Button, ConfirmationDialog, Picker, Text as SwiftText } from "@expo/ui/swift-ui";
import { labelsHidden, pickerStyle, tag, tint } from "@expo/ui/swift-ui/modifiers";
import { Screen, ScreenFades, useScreenInsets, TAB_BAR_TOP } from "@/components/screen";
import { Sheet } from "@/components/ui/sheet";
import { TrainDayRow, symbolForDay } from "@/components/ui/train-day-row";
import { useMutation, useQuery } from "convex/react";
import { SymbolView } from "expo-symbols";
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import {
  rampPlan, nextSetTarget, explainNextSet, type SetRecord, type SetTarget,
} from "../../../../convex/engine";
import { useRouter } from "expo-router";
import {
  EmptyState, Eyebrow, Field, FloatingAction, GlassPill, IconButton, Num, Pill, ScreenTitle, Section,
  Skeleton, Stat, T,
  gap, motion, radius, space, squircle, type,
} from "@/components/ui/kit";
import { WeekDots, weekHits } from "@/components/week-dots";
import { RestDock } from "@/components/rest-dock";
import { success, tap } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";

const FATIGUE = [
  { id: "ez", label: "Easy" },
  { id: "struggle", label: "Hard" },
  { id: "failure", label: "Fail" },
  { id: "tooTired", label: "Tired" },
] as const;
type FatigueId = (typeof FATIGUE)[number]["id"];

const SET_LAYOUT = LinearTransition.duration(motion.duration.base);

const exerciseCount = (n: number) => (n === 1 ? "1 exercise" : `${n} exercises`);

export default function TrainScreen() {
  const session = useQuery(api.workouts.activeSession);
  const days = useQuery(api.workouts.listProgramDays);
  const pad = useScreenInsets();
  const monthName = useMemo(
    () => new Date().toLocaleDateString(undefined, { month: "long" }),
    [],
  );

  if (session === undefined || days === undefined) {
    return (
      <Screen>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: gap.screen,
            paddingTop: pad.top,
            paddingBottom: pad.bottom,
            gap: gap.group,
          }}
        >
          <ScreenTitle title="Train" subtitle={monthName} accessory={<SettingsGear />} />
          <Skeleton height={120} />
          <Skeleton height={72} />
          <View style={{ flexDirection: "row", gap: gap.group }}>
            <Skeleton height={72} style={{ flex: 1 }} />
            <Skeleton height={72} style={{ flex: 1 }} />
            <Skeleton height={72} style={{ flex: 1 }} />
          </View>
        </ScrollView>
        <ScreenFades />
      </Screen>
    );
  }
  if (!session) return <TrainHome days={days} monthName={monthName} />;
  return <ActiveSession session={session} days={days} />;
}

function SettingsGear() {
  const router = useRouter();
  return (
    <GlassPill>
      <IconButton
        name="gearshape"
        variant="plain"
        accessibilityLabel="Settings"
        onPress={() => router.push("/settings")}
      />
    </GlassPill>
  );
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

function monthDelta(thisVal: number | undefined, lastVal: number | undefined) {
  if (thisVal === undefined || lastVal === undefined) return undefined;
  if (thisVal === 0 && lastVal === 0) return undefined;
  return thisVal - lastVal;
}

function nextProgramDay(
  days: Doc<"programDays">[],
  recent: Doc<"sessions">[] | undefined,
): Doc<"programDays"> | null {
  if (days.length === 0 || recent === undefined) return null;
  const lastDone = recent.find((s) => s.status === "done" && s.programDayId);
  if (!lastDone?.programDayId) return days[0] ?? null;
  const idx = days.findIndex((d) => d._id === lastDone.programDayId);
  if (idx < 0) return days[0] ?? null;
  return days[(idx + 1) % days.length] ?? null;
}

function TrainHome({ days, monthName }: { days: Doc<"programDays">[]; monthName: string }) {
  const insets = useSafeAreaInsets();
  const pad = useScreenInsets();
  const [bounds] = useState(() => monthBounds(new Date()));
  const thisMonth = useQuery(api.workouts.rangeStats, { start: bounds.start, end: bounds.end });
  const lastMonth = useQuery(api.workouts.rangeStats, { start: bounds.prevStart, end: bounds.prevEnd });
  const recent = useQuery(api.workouts.recentSessions);
  const start = useMutation(api.workouts.startSession);
  const [pickOpen, setPickOpen] = useState(false);

  const nextDay = useMemo(() => nextProgramDay(days, recent), [days, recent]);
  const trained = weekHits((recent ?? []).filter((s) => s.status === "done").map((s) => s.date));
  const pickLabel = days.length > 0 ? "Pick day" : "Start";

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: gap.screen,
          paddingTop: pad.top,
          paddingBottom: pad.bottom + space[56],
          gap: gap.section,
        }}
      >
        <ScreenTitle title="Train" subtitle={monthName} accessory={<SettingsGear />} />

        {recent === undefined ? (
          <Skeleton height={120} />
        ) : nextDay ? (
          <View style={{ gap: space[8] }}>
            <T variant="headline">Next up</T>
            <T variant="title2">{nextDay.name}</T>
            <T variant="subhead">{exerciseCount(nextDay.exerciseIds.length)}</T>
            <Pill
              label="Start"
              kind="primary"
              onPress={() => void start({ programDayId: nextDay._id })}
              style={{ alignSelf: "flex-start" }}
            />
          </View>
        ) : (
          <EmptyState
            symbol="dumbbell.fill"
            title="No program days"
            message="Start a freestyle session with no template."
          />
        )}

        <View style={{ gap: space[12] }}>
          <T variant="headline">This week</T>
          <WeekDots hits={trained} />
        </View>

        {thisMonth && lastMonth ? (
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Stat
              label="Workouts"
              value={thisMonth.workouts}
              delta={monthDelta(thisMonth.workouts, lastMonth.workouts)}
              style={{ flex: 1 }}
            />
            <Stat
              label="Sets"
              value={thisMonth.sets}
              delta={monthDelta(thisMonth.sets, lastMonth.sets)}
              style={{ flex: 1 }}
            />
            <Stat
              label="Volume"
              value={thisMonth.volume}
              delta={monthDelta(thisMonth.volume, lastMonth.volume)}
              format={fmtVolume}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: gap.group }}>
            <Skeleton height={72} style={{ flex: 1 }} />
            <Skeleton height={72} style={{ flex: 1 }} />
            <Skeleton height={72} style={{ flex: 1 }} />
          </View>
        )}
      </ScrollView>
      <ScreenFades />

      <FloatingAction
        icon="plus"
        label={pickLabel}
        bottom={TAB_BAR_TOP + space[12]}
        onPress={() => setPickOpen(true)}
      />

      <Sheet isPresented={pickOpen} onDismiss={() => setPickOpen(false)} title="What are we training?">
        <View>
          {days.map((d) => (
            <TrainDayRow
              key={d._id}
              title={d.name}
              subtitle={exerciseCount(d.exerciseIds.length)}
              symbol={symbolForDay(d.name)}
              onPress={() => { setPickOpen(false); void start({ programDayId: d._id }); }}
            />
          ))}
          <TrainDayRow
            title="Freestyle session"
            subtitle="No template"
            symbol="plus"
            onPress={() => { setPickOpen(false); void start({}); }}
          />
        </View>
      </Sheet>
    </Screen>
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
  const [leaveOpen, setLeaveOpen] = useState(false);

  const day = days.find((d) => d._id === session.programDayId) ?? null;
  const insets = useSafeAreaInsets();
  const sessionPad = useScreenInsets(space[56]);

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

  const working = (sets ?? []).filter((s) => !s.isWarmup).length;
  const leave = () => {
    if (sets === undefined) return;
    if (working === 0) { void discard({ sessionId: session._id }); return; }
    setLeaveOpen(true);
  };

  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: gap.screen,
          gap: gap.group,
          paddingTop: sessionPad.top,
          paddingBottom: sessionPad.bottom + space[56],
        }}
      >
        {exercises && sets ? orderedIds.map((id) => {
          const ex = byId.get(id);
          if (!ex) return null;
          const exSets = sets.filter((s) => s.exerciseId === id);
          return (
            <ExerciseCard key={id} exercise={ex} sessionId={session._id} sets={exSets}
              isActive={activeExercise === id}
              onActivate={() => setActiveExercise(activeExercise === id ? null : id)}
              onRest={(seconds, nextLabel) => setTimer({ startedAt: Date.now(), seconds, nextLabel })} />
          );
        }) : (
          <>
            <Skeleton height={64} />
            <Skeleton height={64} />
            <Skeleton height={64} />
          </>
        )}
      </ScrollView>
      <ScreenFades topFade={space[56] + space[16]} />

      <View style={{
        position: "absolute", top: insets.top, left: 0, right: 0,
        flexDirection: "row", alignItems: "center", gap: space[12],
        paddingHorizontal: gap.screen, paddingVertical: space[8],
      }}>
        <Host matchContents colorScheme="dark" seedColor={t.accent} style={{ width: 40, height: 40 }}>
          <ConfirmationDialog
            title="Leave this session?"
            isPresented={leaveOpen}
            onIsPresentedChange={setLeaveOpen}
            titleVisibility="visible"
          >
            <ConfirmationDialog.Trigger>
              <RNHostView matchContents>
                <IconButton
                  name="chevron.left"
                  variant="glass"
                  accessibilityLabel="Back"
                  onPress={leave}
                />
              </RNHostView>
            </ConfirmationDialog.Trigger>
            <ConfirmationDialog.Message>
              <SwiftText>{`You've logged ${working} set(s).`}</SwiftText>
            </ConfirmationDialog.Message>
            <ConfirmationDialog.Actions>
              <Button label="Keep going" role="cancel" />
              <Button label="Finish & save" onPress={() => void finish({ sessionId: session._id })} />
              <Button label="Discard" role="destructive" onPress={() => void discard({ sessionId: session._id })} />
            </ConfirmationDialog.Actions>
          </ConfirmationDialog>
        </Host>
        <T variant="title2" style={{ flex: 1 }} numberOfLines={1}>{day?.name ?? "Freestyle"}</T>
        <IconButton
          name="checkmark"
          variant="glass"
          accessibilityLabel="Finish"
          disabled={sets === undefined}
          onPress={() => void finish({ sessionId: session._id })}
        />
      </View>

      {timer && (
        <RestDock seconds={timer.seconds} startedAt={timer.startedAt} nextLabel={timer.nextLabel}
          onSkip={() => setTimer(null)} />
      )}
    </Screen>
  );
}

function EffortPills({ value, onChange }: { value: FatigueId | null; onChange: (f: FatigueId | null) => void }) {
  const t = useTheme();
  const danger = value === "failure" || value === "tooTired";
  return (
    <Host matchContents={{ vertical: true }} colorScheme="dark" style={{ minHeight: 34, backgroundColor: "transparent" }}>
      <Picker<FatigueId | "none">
        label="Effort"
        selection={value ?? "none"}
        onSelectionChange={(next) => onChange(next === "none" ? null : next)}
        modifiers={[pickerStyle("segmented"), labelsHidden(), tint(danger ? t.destructive : t.accent)]}
      >
        <SwiftText modifiers={[tag("none")]}>None</SwiftText>
        {FATIGUE.map((f) => (
          <SwiftText key={f.id} modifiers={[tag(f.id)]}>{f.label}</SwiftText>
        ))}
      </Picker>
    </Host>
  );
}

function FreshPop({ fresh, children }: { fresh: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const pop = fresh && !reduced;
  const scale = useSharedValue(pop ? 0.96 : 1);
  const opacity = useSharedValue(pop ? 0.35 : 1);

  useEffect(() => {
    if (!pop) return;
    scale.set(withSpring(1, motion.spring.snappy));
    opacity.set(withTiming(1, { duration: motion.duration.fast }));
  }, [pop, scale, opacity]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));

  return <Animated.View style={anim}>{children}</Animated.View>;
}

function SetRow({
  label, detail, meta, dim, fresh, onPress, onLongPress,
}: {
  label: string;
  detail: string;
  meta?: ReactNode;
  dim?: boolean;
  fresh?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const t = useTheme();
  const inner = (
    <View style={{
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: space[12],
      paddingVertical: space[8],
      paddingHorizontal: space[16],
      opacity: dim ? 0.55 : 1,
    }}>
      <Eyebrow style={{ width: 52 }}>{label}</Eyebrow>
      <Num size={type.subhead.fontSize} weight="semibold" color={dim ? t.secondaryLabel : t.label}>{detail}</Num>
      {meta}
    </View>
  );
  const body = fresh ? <FreshPop fresh>{inner}</FreshPop> : inner;
  if (!onPress && !onLongPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? t.elevated2 : "transparent" })}
    >
      {body}
    </Pressable>
  );
}

function FatigueChip({ fatigue }: { fatigue: FatigueId }) {
  const t = useTheme();
  const hot = fatigue === "failure" || fatigue === "tooTired";
  return (
    <View style={{
      marginLeft: "auto",
      borderRadius: radius.sm,
      ...squircle,
      paddingHorizontal: space[8],
      paddingVertical: 2,
      backgroundColor: hot ? t.destructive : t.elevated2,
    }}>
      <T variant="caption" color={hot ? t.label : t.secondaryLabel}>
        {FATIGUE.find((f) => f.id === fatigue)?.label}
      </T>
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
  const [justLoggedId, setJustLoggedId] = useState<Id<"sets"> | null>(null);

  const workingDone = sets.filter((s) => !s.isWarmup).length;
  const done = sets.length > 0;

  const titleRow = (
    <Pressable
      onPress={() => { tap(); onActivate(); }}
      style={({ pressed }) => ({
        minHeight: 52,
        paddingVertical: space[12],
        paddingHorizontal: space[16],
        flexDirection: "row",
        alignItems: "center",
        gap: space[12],
        backgroundColor: pressed ? t.elevated2 : "transparent",
      })}
    >
      <T variant="headline" style={{ flex: 1 }} numberOfLines={2}>{exercise.name}</T>
      <T variant="footnote">
        {isActive
          ? `${exercise.repRangeMin}-${exercise.repRangeMax} reps`
          : done ? `${workingDone} sets` : "Tap to start"}
      </T>
      {!isActive && (
        <SymbolView name="chevron.right" size={14} tintColor={t.tertiaryLabel} weight="semibold" />
      )}
    </Pressable>
  );

  if (!isActive) {
    return <Section>{titleRow}</Section>;
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

  const afterLog = (setId: Id<"sets">, warmup: boolean) => {
    setJustLoggedId(setId);
    success();
    setWeight(""); setReps(""); setFatigue(null);
    if (!warmup) {
      const next = plan.workingTargets[loggedWorking.length + 1];
      onRest(exercise.restSeconds, next && next.weight > 0 ? `${next.weight} × ${next.reps}` : null);
    }
  };

  const submit = async (warmup: boolean) => {
    const w = Number(weight), r = Number(reps);
    if (!w || !r) return;
    const result = await logSet({
      sessionId, exerciseId: exercise._id, setIndex: sets.length,
      weight: w, reps: r, fatigue: warmup ? undefined : fatigue ?? undefined, isWarmup: warmup,
    });
    afterLog(result.setId, warmup);
  };

  const logSuggested = async (tg: SetTarget, warmup: boolean) => {
    const result = await logSet({
      sessionId, exerciseId: exercise._id, setIndex: sets.length,
      weight: tg.weight, reps: tg.reps, isWarmup: warmup,
    });
    afterLog(result.setId, warmup);
  };

  const warmupRows = [
    ...loggedWarmups.map((s) => ({ key: s._id, kind: "logged" as const, set: s })),
    ...suggestionWarmups.map((tg, i) => ({ key: `sw${i}`, kind: "suggest" as const, tg })),
  ];
  const workingRows = loggedWorking.map((s, i) => ({ set: s, index: i }));

  return (
    <Section>
      {titleRow}
      {warmupRows.map((row) => (
        <Animated.View key={row.key} layout={SET_LAYOUT}>
          {row.kind === "logged" ? (
            <SetRow
              label="Warm"
              detail={`${row.set.weight} × ${row.set.reps}`}
              fresh={row.set._id === justLoggedId}
              onLongPress={() => confirmDelete(row.set._id)}
            />
          ) : (
            <SetRow
              label="Warm"
              detail={`${row.tg.weight} × ${row.tg.reps}`}
              dim
              meta={<T variant="caption" color={t.tertiaryLabel} style={{ marginLeft: "auto" }}>Tap to log</T>}
              onPress={() => void logSuggested(row.tg, true)}
            />
          )}
        </Animated.View>
      ))}
      {workingRows.map((row) => (
        <Animated.View key={row.set._id} layout={SET_LAYOUT}>
          <SetRow
            label={`Set ${row.index + 1}`}
            detail={`${row.set.weight} × ${row.set.reps}`}
            fresh={row.set._id === justLoggedId}
            meta={row.set.fatigue ? <FatigueChip fatigue={row.set.fatigue} /> : null}
            onLongPress={() => confirmDelete(row.set._id)}
          />
        </Animated.View>
      ))}
      <View style={{ padding: space[16], gap: gap.row }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[8] }}>
          {ghost && <T variant="footnote">Last {ghost.weight} × {ghost.reps}</T>}
          <T variant="footnote" style={{ marginLeft: "auto" }}>Set {workingDone + 1}</T>
        </View>
        {target.weight > 0 ? (
          <Pressable onPress={() => { setWeight(String(target.weight)); setReps(String(target.reps)); }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[8] }}>
              <Num size={48} weight="semibold">{target.weight}</Num>
              <T variant="title2" color={t.secondaryLabel}>× {target.reps}</T>
            </View>
            <T variant="footnote">{recReason}. Tap to use</T>
          </Pressable>
        ) : (
          <T variant="footnote">{recReason}</T>
        )}
        <View style={{ flexDirection: "row", gap: gap.row }}>
          <Field mono value={weight} onChangeText={setWeight} placeholder={target.weight > 0 ? `${target.weight} lb` : "weight"}
            keyboardType="decimal-pad" style={{ flex: 1, textAlign: "center" }} />
          <Field mono value={reps} onChangeText={setReps} placeholder={target.reps > 0 ? `${target.reps} reps` : "reps"}
            keyboardType="number-pad" style={{ flex: 1, textAlign: "center" }} />
        </View>
        <EffortPills value={fatigue} onChange={setFatigue} />
        <View style={{ flexDirection: "row", gap: gap.row }}>
          <Pill label={`Log set ${workingDone + 1}`} onPress={() => void submit(false)}
            disabled={!weight || !reps} haptic={false} style={{ flex: 1 }} />
          <Pill label="Warm" kind="outline" onPress={() => void submit(true)} disabled={!weight || !reps} haptic={false} />
        </View>
      </View>
      {futureTargets.map((tg, i) => (
        <SetRow
          key={`ft${i}`}
          label={`Set ${workingDone + 2 + i}`}
          detail={tg.weight > 0 ? `${tg.weight} × ${tg.reps}` : "·"}
          dim
          meta={<T variant="caption" color={t.tertiaryLabel} style={{ marginLeft: "auto" }}>Planned</T>}
        />
      ))}
    </Section>
  );

  function confirmDelete(setId: Id<"sets">) {
    Alert.alert("Delete this set?", undefined, [
      { text: "Keep", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteSet({ setId }) },
    ]);
  }
}
