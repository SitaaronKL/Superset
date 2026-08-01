import { useMemo, useState } from "react";
import {
  Alert, Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAction, useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Camera, Droplet, Flame, Minus, Plus, Scale, Trash2 } from "lucide-react-native";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Body, Card, Display, Eyebrow, Field, Num, Pill } from "@/components/ui/kit";
import { WeekDots } from "@/components/week-dots";
import { SparkLine } from "@/components/spark-line";
import { fonts, palette, useTheme } from "@/lib/theme";

const DAY = 24 * 60 * 60 * 1000;
const dayKey = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };

export default function FoodScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const logs = useQuery(api.food.listFoodLogs);
  const settings = useQuery(api.settings.getAll);
  const del = useMutation(api.food.deleteFoodLog);
  const [addOpen, setAddOpen] = useState(false);

  const [todayStart] = useState(() => dayKey(Date.now()));
  const today = useMemo(() => {
    let cal = 0, pro = 0;
    for (const l of logs ?? []) if (l.loggedAt >= todayStart) { cal += l.calories ?? 0; pro += l.protein ?? 0; }
    return { cal, pro };
  }, [logs, todayStart]);

  const proteinGoal = Number(settings?.proteinGoal) || 0;
  const calorieGoal = Number(settings?.calorieGoal) || 0;

  const confirmDelete = (id: Id<"foodLogs">) =>
    Alert.alert("Delete this entry?", "Its calories and protein come off today's totals.", [
      { text: "Keep it", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void del({ id }) },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 160 }}>
        <Display size={26}>Food</Display>

        <NetCaloriesCard calorieGoal={calorieGoal} todayStart={todayStart} />

        <Card>
          <GoalBar label="Protein today" value={today.pro} goal={proteinGoal} unit="g" moreIsGood />
          <GoalBar label="Calories today" value={today.cal} goal={calorieGoal} unit="cal" />
        </Card>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <ProteinStreakCard todayStart={todayStart} />
          <WaterCard />
        </View>

        <WeightCard />

        {(logs ?? []).length > 0 && (
          <View style={{ gap: 8 }}>
            <Eyebrow>Logged</Eyebrow>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(logs ?? []).slice(0, 24).map((l) => (
                <Pressable key={l._id} onLongPress={() => confirmDelete(l._id)}
                  style={{ width: "48%", backgroundColor: t.card, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: t.hairline }}>
                  {l.itemUrl && <Image source={{ uri: l.itemUrl }} style={{ width: "100%", aspectRatio: 1 }} />}
                  <View style={{ padding: 10, gap: 2 }}>
                    <Body size={13} numberOfLines={1} style={{ fontFamily: fonts.sansMedium }}>{l.name || "Logged"}</Body>
                    <Num size={11} color={t.mutedFg}>{l.calories ?? 0} cal · {l.protein ?? 0}g</Num>
                  </View>
                </Pressable>
              ))}
            </View>
            <Body size={11} color={t.mutedFg}>Long-press an entry to delete it.</Body>
          </View>
        )}
      </ScrollView>

      {/* Camera FAB, same learned spot as Train's + */}
      <Pressable
        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAddOpen(true); }}
        accessibilityLabel="Log food"
        style={({ pressed }) => ({
          position: "absolute", bottom: insets.bottom + 70, alignSelf: "center",
          width: 58, height: 58, borderRadius: 29, backgroundColor: t.accent,
          alignItems: "center", justifyContent: "center",
          shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
          transform: [{ scale: pressed ? 0.94 : 1 }],
        })}
      >
        <Camera size={26} color={t.accentFg} />
      </Pressable>

      <AddFoodModal open={addOpen} onClose={() => setAddOpen(false)} />
    </SafeAreaView>
  );
}

function GoalBar({ label, value, goal, unit, moreIsGood }: {
  label: string; value: number; goal: number; unit: string; moreIsGood?: boolean;
}) {
  const t = useTheme();
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  const met = goal > 0 && value >= goal;
  const fill = met ? (moreIsGood ? t.success : t.destructive) : t.accent;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Eyebrow style={{ fontSize: 10 }}>{label}</Eyebrow>
        <Num size={12}>{value}{goal > 0 ? ` / ${goal}` : ""} {unit}</Num>
      </View>
      <View style={{ height: 10, borderRadius: 999, backgroundColor: t.muted, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${pct}%`, borderRadius: 999, backgroundColor: fill }} />
      </View>
    </View>
  );
}

function NetCaloriesCard({ calorieGoal, todayStart }: { calorieGoal: number; todayStart: number }) {
  const t = useTheme();
  const food = useQuery(api.food.listFoodLogs);
  const cardio = useQuery(api.cardio.recentCardio);

  const inCals = Math.round((food ?? []).reduce((s, r) => (r.loggedAt >= todayStart ? s + (r.calories ?? 0) : s), 0));
  const outCals = Math.round((cardio ?? []).reduce((s, r) => (r.loggedAt >= todayStart ? s + (r.calories ?? 0) : s), 0));
  const net = inCals - outCals;
  const remaining = calorieGoal ? calorieGoal - net : 0;

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow>Calories</Eyebrow>
        <Flame size={15} color={t.mutedFg} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <Text style={{
          fontFamily: fonts.display, fontSize: 52, lineHeight: 62, fontVariant: ["tabular-nums"],
          color: calorieGoal ? (remaining >= 0 ? t.accent : t.destructive) : t.accent,
        }}>
          {calorieGoal ? Math.abs(remaining) : net}
        </Text>
        <Body size={13} color={t.mutedFg} style={{ marginBottom: 6 }}>
          {calorieGoal ? (remaining >= 0 ? "kcal left today" : "kcal over today") : "net kcal"}
        </Body>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(calorieGoal
          ? [["Goal", calorieGoal], ["− Food", inCals], ["+ Burn", outCals]]
          : [["In", inCals], ["Out", outCals]]
        ).map(([label, v]) => (
          <View key={String(label)} style={{ flex: 1, backgroundColor: t.muted, borderRadius: 12, padding: 10, gap: 2 }}>
            <Eyebrow style={{ fontSize: 10 }}>{label}</Eyebrow>
            <Num size={16}>{v}</Num>
          </View>
        ))}
      </View>
    </Card>
  );
}

function ProteinStreakCard({ todayStart }: { todayStart: number }) {
  const t = useTheme();
  const logs = useQuery(api.food.listFoodLogs);
  const settings = useQuery(api.settings.getAll);
  const proteinGoal = Number(settings?.proteinGoal) || 0;

  const byDay = useMemo(() => {
    const map = new Map<number, number>();
    for (const l of logs ?? []) {
      const k = dayKey(l.loggedAt);
      map.set(k, (map.get(k) ?? 0) + (l.protein ?? 0));
    }
    return map;
  }, [logs]);

  const streak = useMemo(() => {
    if (!proteinGoal) return 0;
    const hits = (k: number) => (byDay.get(k) ?? 0) >= proteinGoal;
    let cursor = hits(todayStart) ? todayStart : hits(todayStart - DAY) ? todayStart - DAY : null;
    if (cursor === null) return 0;
    let n = 0;
    while (hits(cursor)) { n++; cursor -= DAY; }
    return n;
  }, [byDay, proteinGoal, todayStart]);

  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow style={{ fontSize: 10 }}>Protein streak</Eyebrow>
        <Flame size={14} color={streak > 0 ? t.success : t.mutedFg} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 48, color: streak > 0 ? t.success : t.fg, fontVariant: ["tabular-nums"] }}>
          {streak}
        </Text>
        <Body size={12} color={t.mutedFg} style={{ marginBottom: 5 }}>{streak === 1 ? "day" : "days"}</Body>
      </View>
      {proteinGoal > 0 ? (
        <WeekDots size={17}
          hits={Array.from({ length: 7 }, (_, i) => (byDay.get(todayStart - (6 - i) * DAY) ?? 0) >= proteinGoal)} />
      ) : (
        <Body size={11} color={t.mutedFg}>Set a protein goal in Settings.</Body>
      )}
    </Card>
  );
}

function WaterCard() {
  const t = useTheme();
  const [start] = useState(() => dayKey(Date.now()));
  const cups = useQuery(api.water.todayCups, { start });
  const settings = useQuery(api.settings.getAll);
  const addCup = useMutation(api.water.addCup);
  const removeCup = useMutation(api.water.removeCup);

  const goal = Number(settings?.waterGoal) || 8;
  const count = cups ?? 0;

  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow style={{ fontSize: 10 }}>Water</Eyebrow>
        <Droplet size={14} color={t.mutedFg} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 48, color: count >= goal ? t.success : t.fg, fontVariant: ["tabular-nums"] }}>
          {count}
        </Text>
        <Body size={12} color={t.mutedFg} style={{ marginBottom: 5 }}>/ {goal} cups</Body>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void removeCup({ start }); }}
          disabled={count === 0} accessibilityLabel="Remove a cup"
          style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center", opacity: count === 0 ? 0.4 : 1 }}>
          <Minus size={15} color={t.fg} />
        </Pressable>
        <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void addCup(); }}
          accessibilityLabel="Add a cup"
          style={{ flex: 1, height: 38, borderRadius: 19, backgroundColor: t.fg, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4 }}>
          <Plus size={15} color="#000" />
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 12, color: "#000" }}>Add</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function WeightCard() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const weights = useQuery(api.weight.listWeights);
  const settings = useQuery(api.settings.getAll);
  const logWeight = useMutation(api.weight.logWeight);
  const [value, setValue] = useState("");

  const latest = weights?.[0];
  const goal = Number(settings?.weightGoal) || 0;

  const submit = async () => {
    const n = parseFloat(value);
    if (!Number.isFinite(n) || n <= 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await logWeight({ weight: n });
    setValue("");
  };

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow>Body weight</Eyebrow>
        <Scale size={15} color={t.mutedFg} />
      </View>
      {latest && (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 53, color: t.fg, fontVariant: ["tabular-nums"] }}>
            {latest.weight.toFixed(1)}
          </Text>
          <Body size={13} color={t.mutedFg} style={{ marginBottom: 5 }}>lb{goal ? ` · goal ${goal}` : ""}</Body>
        </View>
      )}
      {weights && weights.length >= 2 && (
        <SparkLine values={[...weights].reverse().map((w) => w.weight)} width={width - 64} height={48} />
      )}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Field mono value={value} onChangeText={setValue} placeholder="Weight (lb)" keyboardType="decimal-pad" style={{ flex: 1 }} />
        <Pill label="Log" onPress={() => void submit()} disabled={!value.trim()} />
      </View>
    </Card>
  );
}

function AddFoodModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTheme();
  const generateUploadUrl = useMutation(api.food.generateUploadUrl);
  const analyze = useAction(api.food.analyze);
  const addFoodLog = useMutation(api.food.addFoodLog);

  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pick = async (fromCamera: boolean) => {
    const fn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const res = await fn({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets[0]) setPhoto(res.assets[0]);
  };

  const submit = async () => {
    if (!photo) return;
    setBusy(true);
    setError(null);
    try {
      setStage("Uploading…");
      const uploadUrl = await generateUploadUrl();
      const blob = await (await fetch(photo.uri)).blob();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": photo.mimeType ?? "image/jpeg" },
        body: blob,
      });
      const { storageId } = await res.json();
      setStage("Reading the photo…");
      const a = await analyze({ itemImage: storageId as Id<"_storage"> });
      await addFoodLog({
        itemImage: storageId as Id<"_storage">,
        name: name.trim() || a.name || undefined,
        calories: a.calories || undefined,
        protein: a.protein || undefined,
        summary: a.summary || undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhoto(null); setName(""); onClose();
    } catch {
      setError("Couldn't read that photo. Try again, or type a name and save without analysis.");
    } finally {
      setBusy(false); setStage("");
    }
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 20, gap: 12 }}>
        <Display size={24}>Log food</Display>

        <Pressable onPress={() => void pick(true)}
          style={{ aspectRatio: 1.4, borderRadius: 22, borderWidth: 1, borderStyle: photo ? "solid" : "dashed", borderColor: t.border, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: t.card }}>
          {photo
            ? <Image source={{ uri: photo.uri }} style={{ width: "100%", height: "100%" }} />
            : <View style={{ alignItems: "center", gap: 8 }}>
                <Camera size={26} color={t.mutedFg} />
                <Body size={12} color={t.mutedFg}>Snap the meal</Body>
              </View>}
        </Pressable>
        <Pill label="Choose from library" kind="outline" onPress={() => void pick(false)} />

        <Field value={name} onChangeText={setName} placeholder="Name (optional, AI fills it in)" />
        <Pill label={busy ? (stage || "Saving…") : "Save to today"} kind="accent"
          onPress={() => void submit()} disabled={!photo || busy} />
        {error && <Body size={12} color={t.destructive}>{error}</Body>}
        <Body size={11} color={t.mutedFg} style={{ textAlign: "center" }}>
          The coach reads your photo to name it and pull calories + protein.
        </Body>
        <Pill label="Cancel" kind="outline" onPress={onClose} />
      </View>
    </Modal>
  );
}
