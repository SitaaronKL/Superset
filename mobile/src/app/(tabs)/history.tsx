import { useMemo, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "@expo/ui";
import { RNHostView } from "@expo/ui/swift-ui";
import { presentationBackground } from "@expo/ui/swift-ui/modifiers";
import { SymbolView } from "expo-symbols";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { e1RM } from "../../../../convex/engine";
import { Screen, ScreenFades, useScreenInsets } from "@/components/screen";
import {
  EmptyState,
  IconButton,
  Num,
  Row,
  ScreenTitle,
  Section,
  Skeleton,
  Stat,
  T,
  gap,
  radius,
  space,
  squircle,
  type,
} from "@/components/ui/kit";
import { SparkLine } from "@/components/spark-line";
import { palette, useTheme } from "@/lib/theme";

const monthKey = (d: number) => new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" });
const dayLabel = (d: number) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const shortDate = (d: number) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const weekday = (d: number) => new Date(d).toLocaleDateString(undefined, { weekday: "short" });

const FATIGUE_LABEL = { ez: "EZ", struggle: "HARD", failure: "FAIL", tooTired: "DEAD" } as const;
type FatigueId = keyof typeof FATIGUE_LABEL;

const HEADER_EXTRA = space[40] + space[16];
const HEADER_FADE = space[56] + space[16];

function sessionSubtitle(exerciseCount: number, setCount: number) {
  const exercises = exerciseCount === 1 ? "exercise" : "exercises";
  const sets = setCount === 1 ? "set" : "sets";
  return `${exerciseCount} ${exercises}, ${setCount} ${sets}`;
}

function listPad(top: number, bottom: number) {
  return {
    paddingHorizontal: gap.screen,
    paddingTop: top,
    paddingBottom: bottom,
    gap: gap.section,
  };
}

export default function HistoryScreen() {
  const pad = useScreenInsets();
  const summaries = useQuery(api.workouts.sessionSummaries);
  const [selected, setSelected] = useState<Id<"sessions"> | null>(null);

  const months = useMemo(() => {
    const out: { label: string; items: NonNullable<typeof summaries> }[] = [];
    for (const s of summaries ?? []) {
      const label = monthKey(s.date);
      const bucket = out.find((m) => m.label === label);
      if (bucket) bucket.items.push(s);
      else out.push({ label, items: [s] });
    }
    return out;
  }, [summaries]);

  if (selected) return <SessionDetail sessionId={selected} onBack={() => setSelected(null)} />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={listPad(pad.top, pad.bottom)}>
        <View style={{ gap: gap.group }}>
          <ScreenTitle title="History" />
          {summaries === undefined ? (
            <View style={{ gap: space[4] }}>
              <Skeleton width={140} height={type.caption.fontSize} />
              <Skeleton width={56} height={28} />
            </View>
          ) : summaries.length > 0 ? (
            <Stat label="sessions since day one" value={summaries.length} />
          ) : null}
        </View>

        {summaries === undefined ? (
          <HistorySkeleton />
        ) : summaries.length === 0 ? (
          <EmptyState
            symbol="calendar"
            title="No sessions yet"
            message="Finish a workout and it shows up here."
          />
        ) : (
          months.map((m) => (
            <Section key={m.label} header={m.label}>
              {m.items.map((s) => (
                <SessionRow
                  key={s._id}
                  date={s.date}
                  dayName={s.dayName}
                  exerciseCount={s.exerciseCount}
                  setCount={s.setCount}
                  muscleGroup={s.muscleGroup}
                  onPress={() => setSelected(s._id)}
                />
              ))}
            </Section>
          ))
        )}
      </ScrollView>
      <ScreenFades />
    </Screen>
  );
}

function HistorySkeleton() {
  return (
    <View style={{ gap: space[8] }}>
      <Skeleton width={120} height={type.footnote.fontSize} style={{ marginHorizontal: space[16] }} />
      <Section>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ paddingHorizontal: space[16], paddingVertical: space[12], gap: space[8] }}>
            <Skeleton width="58%" height={type.body.fontSize} />
            <Skeleton width="42%" height={type.footnote.fontSize} />
          </View>
        ))}
      </Section>
    </View>
  );
}

function SessionRow({
  date,
  dayName,
  exerciseCount,
  setCount,
  muscleGroup,
  onPress,
}: {
  date: number;
  dayName: string;
  exerciseCount: number;
  setCount: number;
  muscleGroup: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Row
      title={dayName}
      subtitle={sessionSubtitle(exerciseCount, setCount)}
      onPress={onPress}
      leading={
        <View style={{ width: space[40], alignItems: "center" }}>
          <Num size={type.title2.fontSize} weight="semibold">{new Date(date).getDate()}</Num>
          <T variant="caption">{weekday(date)}</T>
        </View>
      }
      accessory={
        <View style={{ flexDirection: "row", alignItems: "center", gap: space[8] }}>
          {muscleGroup ? (
            <View
              style={{
                backgroundColor: t.elevated2,
                borderRadius: radius.full,
                paddingHorizontal: space[8],
                paddingVertical: space[4],
              }}
            >
              <T variant="caption" color={t.secondaryLabel} numberOfLines={1}>{muscleGroup}</T>
            </View>
          ) : null}
          <SymbolView name="chevron.right" size={14} tintColor={t.tertiaryLabel} weight="semibold" />
        </View>
      }
    />
  );
}

function SessionDetail({ sessionId, onBack }: { sessionId: Id<"sessions">; onBack: () => void }) {
  const pad = useScreenInsets(HEADER_EXTRA);
  const detail = useQuery(api.workouts.sessionDetail, { sessionId });
  const [trend, setTrend] = useState<{ id: Id<"exercises">; name: string } | null>(null);

  const bestIds = useMemo(() => {
    const ids = new Set<string>();
    if (!detail) return ids;
    let best = 0;
    for (const g of detail.groups) {
      for (const s of g.sets) {
        if (s.isWarmup) continue;
        const v = e1RM(s.weight, s.reps);
        if (v > best) {
          best = v;
          ids.clear();
          ids.add(s._id);
        } else if (v === best && best > 0) {
          ids.add(s._id);
        }
      }
    }
    return ids;
  }, [detail]);

  if (detail === undefined) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={listPad(pad.top, pad.bottom)}>
          <DetailSkeleton />
        </ScrollView>
        <ScreenFades topFade={HEADER_FADE} />
        <DetailHeader onBack={onBack} />
      </Screen>
    );
  }
  if (!detail) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={listPad(pad.top, pad.bottom)}>
          <EmptyState symbol="questionmark.circle" title="Session not found" />
        </ScrollView>
        <ScreenFades topFade={HEADER_FADE} />
        <DetailHeader onBack={onBack} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={listPad(pad.top, pad.bottom)}>
        {detail.groups.map((g) => (
          <Section
            key={g.exerciseName}
            header={
              <ExerciseHeader
                name={g.exerciseName}
                muscleGroup={g.muscleGroup}
                onPressTrend={() => setTrend({ id: g.exerciseId, name: g.exerciseName })}
              />
            }
          >
            {g.sets.map((s, i) => (
              <Row
                key={s._id}
                title={s.isWarmup ? "Warm" : `Set ${i + 1}`}
                accessory={
                  <SetTrailing
                    weight={s.weight}
                    reps={s.reps}
                    fatigue={s.fatigue}
                    personalBest={bestIds.has(s._id)}
                  />
                }
              />
            ))}
          </Section>
        ))}
      </ScrollView>
      <ScreenFades topFade={HEADER_FADE} />
      <DetailHeader onBack={onBack} title={detail.dayName} subtitle={dayLabel(detail.date)} />
      <TrendSheet trend={trend} onClose={() => setTrend(null)} />
    </Screen>
  );
}

function DetailSkeleton() {
  return (
    <View style={{ gap: gap.section }}>
      {[0, 1].map((n) => (
        <View key={n} style={{ gap: space[8] }}>
          <Skeleton width="46%" height={type.headline.fontSize} style={{ marginHorizontal: space[16] }} />
          <Section>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ paddingHorizontal: space[16], paddingVertical: space[12] }}>
                <Skeleton width="70%" height={type.body.fontSize} />
              </View>
            ))}
          </Section>
        </View>
      ))}
    </View>
  );
}

function ExerciseHeader({
  name,
  muscleGroup,
  onPressTrend,
}: {
  name: string;
  muscleGroup: string;
  onPressTrend: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: space[16], flexDirection: "row", alignItems: "center", gap: space[8] }}>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="headline" color={t.label} numberOfLines={2}>{name}</T>
        {muscleGroup ? <T variant="footnote">{muscleGroup}</T> : null}
      </View>
      <IconButton
        name="chart.xyaxis.line"
        size={18}
        color={t.secondaryLabel}
        accessibilityLabel={`${name} trend`}
        onPress={onPressTrend}
      />
    </View>
  );
}

function SetTrailing({
  weight,
  reps,
  fatigue,
  personalBest,
}: {
  weight: number;
  reps: number;
  fatigue?: string;
  personalBest: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[8] }}>
      {personalBest ? <T variant="caption" color={t.accent}>PB</T> : null}
      <Num size={type.subhead.fontSize} weight="semibold">{weight} x {reps}</Num>
      {fatigue ? <EffortTag fatigue={fatigue} /> : null}
    </View>
  );
}

function EffortTag({ fatigue }: { fatigue: string }) {
  const t = useTheme();
  const hard = fatigue === "failure" || fatigue === "tooTired";
  const label = FATIGUE_LABEL[fatigue as FatigueId] ?? fatigue.toUpperCase();
  return (
    <View
      style={{
        backgroundColor: hard ? t.destructive : t.elevated2,
        borderRadius: radius.sm,
        ...squircle,
        paddingHorizontal: space[8],
        paddingVertical: space[4],
        minWidth: space[40],
        alignItems: "center",
      }}
    >
      <T variant="caption" color={hard ? t.label : t.secondaryLabel}>{label}</T>
    </View>
  );
}

function DetailHeader({ onBack, title, subtitle }: { onBack: () => void; title?: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: "absolute",
        top: insets.top,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: space[12],
        paddingHorizontal: gap.screen,
        paddingVertical: space[8],
      }}
    >
      <IconButton name="chevron.left" variant="glass" accessibilityLabel="Back" onPress={onBack} />
      {title ? (
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="title2" numberOfLines={1}>{title}</T>
          {subtitle ? <T variant="subhead" numberOfLines={1}>{subtitle}</T> : null}
        </View>
      ) : null}
    </View>
  );
}

function TrendSheet({ trend, onClose }: {
  trend: { id: Id<"exercises">; name: string } | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const data = useQuery(api.workouts.exerciseTrend, trend ? { exerciseId: trend.id } : "skip");
  // The sheet already insets 16pt on each side.
  const contentWidth = Math.max(0, width - gap.screen * 2);

  return (
    <BottomSheet
      isPresented={trend !== null}
      onDismiss={onClose}
      modifiers={[presentationBackground(palette.bg)]}
    >
      <RNHostView matchContents>
        <View style={{ width: contentWidth, gap: gap.group, paddingBottom: Math.max(insets.bottom, space[12]) }}>
          <T variant="title2">{trend?.name}</T>
          {data === undefined ? (
            <View style={{ gap: space[12] }}>
              <Skeleton width="40%" height={28} />
              <Skeleton width="100%" height={56} />
            </View>
          ) : data.points.length < 2 ? (
            <T variant="subhead">Not enough sessions yet. Log this lift a couple more times and the trend shows up here.</T>
          ) : (
            <View style={{ gap: space[12] }}>
              <View style={{ flexDirection: "row", gap: gap.group }}>
                <Stat
                  label="top set last time"
                  value={data.points[data.points.length - 1].topWeight}
                  style={{ flex: 1 }}
                />
                <Stat label="best est. 1RM" value={data.bestE1RM} style={{ flex: 1 }} />
              </View>
              <SparkLine
                values={data.points.map((p) => p.topWeight)}
                width={contentWidth}
                refValue={Math.max(...data.points.map((p) => p.topWeight))}
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <T variant="caption">{shortDate(data.points[0].date)}</T>
                <T variant="caption">{data.points.length} sessions</T>
                <T variant="caption">{shortDate(data.points[data.points.length - 1].date)}</T>
              </View>
            </View>
          )}
        </View>
      </RNHostView>
    </BottomSheet>
  );
}
