import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react-native";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Body, Card, Display, Eyebrow, Num } from "@/components/ui/kit";
import { SparkLine } from "@/components/spark-line";
import { fonts, palette, useTheme } from "@/lib/theme";

const monthKey = (d: number) => new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" });
const dayLabel = (d: number) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const shortDate = (d: number) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const weekday = (d: number) => new Date(d).toLocaleDateString(undefined, { weekday: "short" });

export default function HistoryScreen() {
  const t = useTheme();
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
    return <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}><Body color={t.mutedFg} style={{ padding: 24 }}>Loading…</Body></SafeAreaView>;
  }
  if (selected) return <SessionDetail sessionId={selected} onBack={() => setSelected(null)} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
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
                  backgroundColor: t.card, borderRadius: 22, padding: 14,
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
    </SafeAreaView>
  );
}

function SessionDetail({ sessionId, onBack }: { sessionId: Id<"sessions">; onBack: () => void }) {
  const t = useTheme();
  const detail = useQuery(api.workouts.sessionDetail, { sessionId });
  const [trend, setTrend] = useState<{ id: Id<"exercises">; name: string } | null>(null);

  if (detail === undefined) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}><Body color={t.mutedFg} style={{ padding: 24 }}>Loading…</Body></SafeAreaView>;
  }
  if (!detail) return <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}><Body color={t.mutedFg} style={{ padding: 24 }}>Session not found.</Body></SafeAreaView>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={onBack} accessibilityLabel="Back"
            style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color={t.fg} />
          </Pressable>
          <View>
            <Display size={22}>{detail.dayName}</Display>
            <Body size={12} color={t.mutedFg}>{dayLabel(detail.date)}</Body>
          </View>
        </View>

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
                    marginLeft: "auto", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
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

      <TrendModal trend={trend} onClose={() => setTrend(null)} />
    </SafeAreaView>
  );
}

function TrendModal({ trend, onClose }: {
  trend: { id: Id<"exercises">; name: string } | null;
  onClose: () => void;
}) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const data = useQuery(api.workouts.exerciseTrend, trend ? { exerciseId: trend.id } : "skip");

  return (
    <Modal visible={trend !== null} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 20, gap: 14 }}>
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
            <SparkLine values={data.points.map((p) => p.topWeight)} width={width - 40}
              refValue={Math.max(...data.points.map((p) => p.topWeight))} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Body size={11} color={t.mutedFg}>{shortDate(data.points[0].date)}</Body>
              <Body size={11} color={t.mutedFg}>{data.points.length} sessions</Body>
              <Body size={11} color={t.mutedFg}>{shortDate(data.points[data.points.length - 1].date)}</Body>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
