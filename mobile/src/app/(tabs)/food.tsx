import { useMemo, useState, type ReactElement } from "react";
import {
  Alert, Image, Pressable, ScrollView, Text, View, useWindowDimensions,
  type StyleProp, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAction, useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { BottomSheet, Host } from "@expo/ui";
import { Button, ContextMenu, ProgressView, RNHostView } from "@expo/ui/swift-ui";
import { frame, presentationBackground, progressViewStyle, tint } from "@expo/ui/swift-ui/modifiers";
import { Camera, ChevronDown, ChevronUp, Droplet, Flame, Minus, Plus, Scale } from "lucide-react-native";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Body, Card, Display, Eyebrow, Field, Num, Pill } from "@/components/ui/kit";
import { Screen, ScreenFades, useScreenInsets } from "@/components/screen";
import { WeekDots } from "@/components/week-dots";
import { SparkLine } from "@/components/spark-line";
import { fonts, palette, useTheme } from "@/lib/theme";

const DAY = 24 * 60 * 60 * 1000;
const dayKey = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const round1 = (n: number) => Math.round(n * 10) / 10;
const dayLabel = (key: number, todayStart: number) => {
  if (key >= todayStart) return "Today";
  if (key >= todayStart - DAY) return "Yesterday";
  return new Date(key).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

export default function FoodScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pad = useScreenInsets();
  const { width: screenWidth } = useWindowDimensions();
  const logs = useQuery(api.food.listFoodLogs);
  const settings = useQuery(api.settings.getAll);
  const del = useMutation(api.food.deleteFoodLog);
  const [addOpen, setAddOpen] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(null);

  const [todayStart] = useState(() => dayKey(Date.now()));
  const today = useMemo(() => {
    let cal = 0, pro = 0;
    for (const l of logs ?? []) if (l.loggedAt >= todayStart) { cal += l.calories ?? 0; pro += l.protein ?? 0; }
    return { cal, pro };
  }, [logs, todayStart]);

  const days = useMemo(() => {
    const out: { key: number; label: string; cal: number; pro: number; items: NonNullable<typeof logs> }[] = [];
    for (const l of logs ?? []) {
      const key = dayKey(l.loggedAt);
      let day = out[out.length - 1];
      if (!day || day.key !== key) { day = { key, label: dayLabel(key, todayStart), cal: 0, pro: 0, items: [] }; out.push(day); }
      day.cal += l.calories ?? 0; day.pro += l.protein ?? 0; day.items.push(l);
    }
    return out;
  }, [logs, todayStart]);

  const proteinGoal = Number(settings?.proteinGoal) || 0;
  const calorieGoal = Number(settings?.calorieGoal) || 0;
  const cardWidth = (screenWidth - 32 - 8) / 2;

  const confirmDelete = (id: Id<"foodLogs">) =>
    Alert.alert("Delete this entry?", "Its calories and protein come off today's totals.", [
      { text: "Keep it", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void del({ id }) },
    ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingTop: pad.top, paddingBottom: pad.bottom }}>
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

        {days.map((day) => day.key >= todayStart ? (
          <View key={day.key} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Eyebrow>{day.label}</Eyebrow>
              <Num size={11} color={t.mutedFg}>{day.cal} cal · {round1(day.pro)}g</Num>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {day.items.map((l) => (
                <EntryMenu key={l._id} onDelete={() => confirmDelete(l._id)} style={{ width: cardWidth }}>
                  <View style={{ width: cardWidth, backgroundColor: t.card, borderRadius: 18, borderCurve: "continuous", overflow: "hidden", borderWidth: 1, borderColor: t.hairline }}>
                    {l.itemUrl && <Image source={{ uri: l.itemUrl }} style={{ width: "100%", aspectRatio: 1 }} />}
                    <View style={{ padding: 10, gap: 2 }}>
                      <Body size={13} numberOfLines={1} style={{ fontFamily: fonts.sansMedium }}>{l.name || "Logged"}</Body>
                      <Num size={11} color={t.mutedFg}>{l.calories ?? 0} cal · {l.protein ?? 0}g</Num>
                    </View>
                  </View>
                </EntryMenu>
              ))}
            </View>
          </View>
        ) : (
          <PastDayPill key={day.key} day={day} open={openDay === day.key}
            onToggle={() => setOpenDay(openDay === day.key ? null : day.key)}
            onDelete={confirmDelete} />
        ))}
        {days.length > 0 && <Body size={11} color={t.mutedFg}>Press and hold an entry, then tap Delete.</Body>}
      </ScrollView>
      <ScreenFades />

      {/* Camera FAB, same learned spot as Train's +. After the fades so the blur does not cover it. */}
      <Pressable
        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAddOpen(true); }}
        accessibilityLabel="Log food"
        style={({ pressed }) => ({
          position: "absolute", bottom: insets.bottom + 28, alignSelf: "center",
          width: 58, height: 58, borderRadius: 29, backgroundColor: t.accent,
          alignItems: "center", justifyContent: "center",
          shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
          transform: [{ scale: pressed ? 0.94 : 1 }],
        })}
      >
        <Camera size={26} color={t.accentFg} />
      </Pressable>

      <AddFoodSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </Screen>
  );
}

/** Long-press opens a native menu. Delete still confirms before the row is removed. */
function EntryMenu({ onDelete, children, style }: {
  onDelete: () => void;
  children: ReactElement;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Host matchContents={{ vertical: true }} colorScheme="dark" style={style}>
      <ContextMenu>
        <ContextMenu.Trigger>
          <RNHostView matchContents>{children}</RNHostView>
        </ContextMenu.Trigger>
        <ContextMenu.Items>
          <Button role="destructive" label="Delete" systemImage="trash" onPress={onDelete} />
        </ContextMenu.Items>
      </ContextMenu>
    </Host>
  );
}

function GoalBar({ label, value, goal, unit, moreIsGood }: {
  label: string; value: number; goal: number; unit: string; moreIsGood?: boolean;
}) {
  const t = useTheme();
  const ratio = goal > 0 ? Math.min(1, value / goal) : 0;
  const met = goal > 0 && value >= goal;
  const fill = met ? (moreIsGood ? t.success : t.destructive) : t.accent;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Eyebrow style={{ fontSize: 10 }}>{label}</Eyebrow>
        <Num size={12}>{value}{goal > 0 ? ` / ${goal}` : ""} {unit}</Num>
      </View>
      <Host colorScheme="dark" style={{ height: 10, alignSelf: "stretch" }}>
        <ProgressView
          value={ratio}
          modifiers={[
            progressViewStyle("linear"),
            tint(fill),
            frame({ maxWidth: Infinity, height: 8 }),
          ]}
        />
      </Host>
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
  const days = useMemo(() => {
    const out: { key: number; label: string; cal: number; pro: number; items: NonNullable<typeof logs> }[] = [];
    for (const l of logs ?? []) {
      const key = dayKey(l.loggedAt);
      let day = out[out.length - 1];
      if (!day || day.key !== key) { day = { key, label: dayLabel(key, todayStart), cal: 0, pro: 0, items: [] }; out.push(day); }
      day.cal += l.calories ?? 0; day.pro += l.protein ?? 0; day.items.push(l);
    }
    return out;
  }, [logs, todayStart]);

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

function AddFoodSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
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

  // The sheet pads 16 on each side. Give the hosted form a real size so the
  // photo and fields lay out inside the 92% detent instead of collapsing.
  const sheetWidth = width - 32;
  const sheetHeight = Math.max(360, Math.round(height * 0.92) - 36);

  return (
    <BottomSheet
      isPresented={open}
      onDismiss={onClose}
      snapPoints={[{ fraction: 0.92 }]}
      modifiers={[presentationBackground(palette.bg)]}
    >
      <RNHostView matchContents>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ width: sheetWidth, height: sheetHeight, backgroundColor: t.bg }}
          contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 12 }}
        >
          <Display size={24}>Log food</Display>

          <Pressable onPress={() => void pick(true)}
            style={{ aspectRatio: 1.4, borderRadius: 22, borderCurve: "continuous", borderWidth: 1, borderStyle: photo ? "solid" : "dashed", borderColor: t.border, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: t.card }}>
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
        </ScrollView>
      </RNHostView>
    </BottomSheet>
  );
}

// Past days collapse to one pill: label, count, totals. Tap to see the items
// as text rows (no photos). Each row has a native Delete menu.
function PastDayPill({ day, open, onToggle, onDelete }: {
  day: { label: string; cal: number; pro: number; items: { _id: Id<"foodLogs">; name: string | null; calories: number | null; protein: number | null }[] };
  open: boolean;
  onToggle: () => void;
  onDelete: (id: Id<"foodLogs">) => void;
}) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const rowWidth = width - 34;
  return (
    <View style={{ backgroundColor: t.card, borderRadius: 22, borderCurve: "continuous", borderWidth: 1, borderColor: t.hairline, overflow: "hidden" }}>
      <Pressable onPress={onToggle} style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, opacity: pressed ? 0.7 : 1,
      })}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body size={14} style={{ fontFamily: fonts.sansSemiBold }}>{day.label}</Body>
          <Body size={11} color={t.mutedFg}>{day.items.length} {day.items.length === 1 ? "item" : "items"}</Body>
        </View>
        <Num size={12} color={t.mutedFg}>{day.cal} cal · {round1(day.pro)}g</Num>
        {open ? <ChevronUp size={16} color={t.mutedFg} /> : <ChevronDown size={16} color={t.mutedFg} />}
      </Pressable>
      {open && day.items.map((l) => (
        <EntryMenu key={l._id} onDelete={() => onDelete(l._id)} style={{ width: rowWidth }}>
          <View style={{ width: rowWidth, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.hairline }}>
            <Body size={13} numberOfLines={1} style={{ flex: 1 }}>{l.name || "Logged"}</Body>
            <Num size={11} color={t.mutedFg}>{l.calories ?? 0} cal · {l.protein ?? 0}g</Num>
          </View>
        </EntryMenu>
      ))}
    </View>
  );
}
