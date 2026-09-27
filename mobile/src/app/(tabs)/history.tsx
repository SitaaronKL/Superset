import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "@expo/ui";
import { RNHostView } from "@expo/ui/swift-ui";
import { presentationBackground } from "@expo/ui/swift-ui/modifiers";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react-native";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Screen, ScreenFades, useScreenInsets } from "@/components/screen";
import { Body, Card, Display, Eyebrow, Num } from "@/components/ui/kit";
import { SparkLine } from "@/components/spark-line";
import { fonts, palette, useTheme } from "@/lib/theme";

const monthKey = (d: number) => new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" });
const dayLabel = (d: number) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const shortDate = (d: number) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const weekday = (d: number) => new Date(d).toLocaleDateString(undefined, { weekday: "short" });

export default function HistoryScreen() {
  const t = useTheme();
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

  if (summaries === undefined) {
    return (
      <Screen>
        <Body color={t.mutedFg} style={{ paddingHorizontal: 16, paddingTop: pad.top }}>Loading…</Body>
        <ScreenFades />
      </Screen>
    );
  }
  if (selected) return <SessionDetail sessionId={selected} onBack={() => setSelected(null)} />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingTop: pad.top, paddingBottom: pad.bottom }}>
        <Display size={26}>History</Display>

        {summaries.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 56, color: t.fg, lineHeight: 66, fontVariant: ["tabular-nums"] }}>
              {summaries.length}
            </Text>
            <Body color={t.mutedFg} style={{ marginBottom: 8 }}>sessions since day one</Body>
          </View>
        )}

        {summaries.length === 0 && (
          <Body color={t.mutedFg}>No sessions yet. Finish a workout and it shows up here.</Body>
        )}

        {months.map((m) => (
          <View key={m.label} style={{ gap: 8 }}>
            <Eyebrow>{m.label}</Eyebrow>
            {m.items.map((s) => (
              <Pressable key={s._id} onPress={() => setSelected(s._id)}
                style={({ pressed }) => ({
                  backgroundColor: t.card, borderRadius: 22, borderCurve: "continuous", padding: 14,
                  flexDirection: "row", alignItems: "center", gap: 12,
                  borderWidth: 1, borderColor: t.hairline, opacity: pressed ? 0.7 : 1,
                })}>
                <View style={{ width: 44, alignItems: "center" }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 20, color: t.fg, fontVariant: ["tabular-nums"] }}>
                    {new Date(s.date).getDate()}
                  </Text>
                  <Eyebrow style={{ fontSize: 10 }}>{weekday(s.date)}</Eyebrow>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Display size={15}>{s.dayName}</Display>
                  <Body size={12} color={t.mutedFg}>{s.exerciseCount} exercises · {s.setCount} sets</Body>
                </View>
                {!!s.muscleGroup && (
                  <View style={{ backgroundColor: t.muted, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Eyebrow style={{ fontSize: 10 }}>{s.muscleGroup}</Eyebrow>
                  </View>
                )}
                <ChevronRight size={16} color={t.mutedFg} />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
      <ScreenFades />
    </Screen>
  );
}

function SessionDetail({ sessionId, onBack }: { sessionId: Id<"sessions">; onBack: () => void }) {
  const t = useTheme();
  const pad = useScreenInsets(56);
  const detail = useQuery(api.workouts.sessionDetail, { sessionId });
  const [trend, setTrend] = useState<{ id: Id<"exercises">; name: string } | null>(null);

  if (detail === undefined) {
    return (
      <Screen>
        <Body color={t.mutedFg} style={{ paddingHorizontal: 16, paddingTop: pad.top }}>Loading…</Body>
        <ScreenFades topFade={72} />
        <DetailHeader onBack={onBack} />
      </Screen>
    );
  }
  if (!detail) {
    return (
      <Screen>
        <Body color={t.mutedFg} style={{ paddingHorizontal: 16, paddingTop: pad.top }}>Session not found.</Body>
        <ScreenFades topFade={72} />
        <DetailHeader onBack={onBack} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingTop: pad.top, paddingBottom: pad.bottom }}>
        {detail.groups.map((g) => (
          <Card key={g.exerciseName} style={{ gap: 8 }}>
            <Pressable onPress={() => setTrend({ id: g.exerciseId, name: g.exerciseName })}
              style={{ gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Display size={15}>{g.exerciseName}</Display>
                <TrendingUp size={13} color={t.mutedFg} />
              </View>
              <Eyebrow style={{ fontSize: 10 }}>{g.muscleGroup}</Eyebrow>
            </Pressable>
            {g.sets.map((s, i) => (
              <View key={s._id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4, borderTopWidth: i === 0 ? 0 : 1, borderColor: t.hairline }}>
                <Eyebrow style={{ width: 48, fontSize: 10 }}>{s.isWarmup ? "Warm" : `Set ${i + 1}`}</Eyebrow>
                <Num size={14} weight="semibold">{s.weight} × {s.reps}</Num>
                {s.fatigue && (
                  <View style={{
                    marginLeft: "auto", borderRadius: 6, borderCurve: "continuous", paddingHorizontal: 6, paddingVertical: 2,
                    backgroundColor: s.fatigue === "failure" || s.fatigue === "tooTired" ? t.destructive : t.muted,
                  }}>
                    <Text style={{ fontSize: 10, fontFamily: fonts.sansSemiBold, color: s.fatigue === "failure" || s.fatigue === "tooTired" ? "#fff" : t.mutedFg }}>
                      {s.fatigue === "ez" ? "EZ" : s.fatigue === "struggle" ? "HARD" : s.fatigue === "failure" ? "FAIL" : "DEAD"}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </Card>
        ))}
      </ScrollView>
      <ScreenFades topFade={72} />
      <DetailHeader onBack={onBack} title={detail.dayName} subtitle={dayLabel(detail.date)} />
      <TrendSheet trend={trend} onClose={() => setTrend(null)} />
    </Screen>
  );
}

function DetailHeader({ onBack, title, subtitle }: { onBack: () => void; title?: string; subtitle?: string }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: "absolute", top: insets.top, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
      <Pressable onPress={onBack} accessibilityLabel="Back"
        style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" }}>
        <ChevronLeft size={18} color={t.fg} />
      </Pressable>
      {title ? (
        <View style={{ flex: 1, flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Display size={22} numberOfLines={1} style={{ flexShrink: 1 }}>{title}</Display>
          {subtitle ? <Body size={12} color={t.mutedFg} numberOfLines={1}>{subtitle}</Body> : null}
        </View>
      ) : null}
    </View>
  );
}

function TrendSheet({ trend, onClose }: {
  trend: { id: Id<"exercises">; name: string } | null;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const data = useQuery(api.workouts.exerciseTrend, trend ? { exerciseId: trend.id } : "skip");
  // The sheet already insets 16pt on each side.
  const contentWidth = Math.max(0, width - 32);

  return (
    <BottomSheet
      isPresented={trend !== null}
      onDismiss={onClose}
      modifiers={[presentationBackground(palette.bg)]}
    >
      <RNHostView matchContents>
        <View style={{ width: contentWidth, gap: 14, paddingBottom: Math.max(insets.bottom, 12) }}>
          <Display size={24}>{trend?.name}</Display>
          {data === undefined ? (
            <Body color={t.mutedFg}>Loading…</Body>
          ) : data.points.length < 2 ? (
            <Body color={t.mutedFg}>Not enough sessions yet. Log this lift a couple more times and the trend shows up here.</Body>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 44, color: t.fg, fontVariant: ["tabular-nums"] }}>
                    {data.points[data.points.length - 1].topWeight}
                  </Text>
                  <Body size={12} color={t.mutedFg} style={{ marginBottom: 6 }}>top set last time</Body>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Num size={18}>{data.bestE1RM}</Num>
                  <Body size={11} color={t.mutedFg}>best est. 1RM</Body>
                </View>
              </View>
              <SparkLine values={data.points.map((p) => p.topWeight)} width={contentWidth}
                refValue={Math.max(...data.points.map((p) => p.topWeight))} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Body size={11} color={t.mutedFg}>{shortDate(data.points[0].date)}</Body>
                <Body size={11} color={t.mutedFg}>{data.points.length} sessions</Body>
                <Body size={11} color={t.mutedFg}>{shortDate(data.points[data.points.length - 1].date)}</Body>
              </View>
            </View>
          )}
        </View>
      </RNHostView>
    </BottomSheet>
  );
}
