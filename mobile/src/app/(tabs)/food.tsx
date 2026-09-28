import { useMemo, useState, type ReactElement } from "react";
import {
  Alert, Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions,
  type StyleProp, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAction, useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { BottomSheet, Host } from "@expo/ui";
import { Button, ContextMenu, ProgressView, RNHostView } from "@expo/ui/swift-ui";
import { frame, presentationBackground, progressViewStyle, tint } from "@expo/ui/swift-ui/modifiers";
import { SymbolView } from "expo-symbols";
import Animated, { LinearTransition, useReducedMotion } from "react-native-reanimated";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Card, Display, Eyebrow, Field, IconButton, Num, Pill, Row, ScreenTitle, Section,
  Skeleton, T, gap, motion, radius, space, squircle,
} from "@/components/ui/kit";
import { Screen, ScreenFades, useScreenInsets } from "@/components/screen";
import { WeekDots } from "@/components/week-dots";
import { SparkLine } from "@/components/spark-line";
import { success, tap } from "@/lib/haptics";
import { elevation, palette, type, useTheme } from "@/lib/theme";

const DAY = 24 * 60 * 60 * 1000;
const dayKey = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const round1 = (n: number) => Math.round(n * 10) / 10;
const dayLabel = (key: number, todayStart: number) => {
  if (key >= todayStart) return "Today";
  if (key >= todayStart - DAY) return "Yesterday";
  return new Date(key).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};
const todayDateLabel = () =>
  new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

export default function FoodScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pad = useScreenInsets();
  const { width: screenWidth } = useWindowDimensions();
  const reduced = useReducedMotion();
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
  const cardWidth = (screenWidth - gap.screen * 2 - gap.row) / 2;
  const loading = logs === undefined;

  const confirmDelete = (id: Id<"foodLogs">) =>
    Alert.alert("Delete this entry?", "Its calories and protein come off today's totals.", [
      { text: "Keep it", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void del({ id }) },
    ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{
        paddingHorizontal: gap.screen,
        paddingTop: pad.top,
        paddingBottom: pad.bottom,
        gap: gap.section,
      }}>
        <View style={{ gap: gap.group }}>
          <ScreenTitle title="Food" subtitle={todayDateLabel()} />

          {loading ? (
            <View style={{ gap: gap.row }}>
              <Skeleton width={160} height={52} />
              <Skeleton height={type.footnote.lineHeight} />
              <Skeleton height={8} />
            </View>
          ) : (
            <CaloriesHero calorieGoal={calorieGoal} todayStart={todayStart} protein={today.pro} proteinGoal={proteinGoal} />
          )}

          <View style={{ flexDirection: "row", gap: gap.row }}>
            {loading ? (
              <>
                <View style={{ flex: 1 }}><Skeleton height={120} /></View>
                <View style={{ flex: 1 }}><Skeleton height={120} /></View>
              </>
            ) : (
              <>
                <ProteinStreakCard todayStart={todayStart} />
                <WaterCard />
              </>
            )}
          </View>
        </View>

        <WeightRow />

        {days.map((day) => day.key >= todayStart ? (
          <View key={day.key} style={{ gap: gap.row }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Eyebrow>{day.label}</Eyebrow>
              <Num size={type.caption.fontSize} color={t.secondaryLabel}>{day.cal} cal · {round1(day.pro)}g</Num>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gap.row }}>
              {day.items.map((l) => (
                <Animated.View
                  key={l._id}
                  layout={reduced ? undefined : LinearTransition.duration(motion.duration.base)}
                  style={{ width: cardWidth }}
                >
                  <EntryMenu onDelete={() => confirmDelete(l._id)} style={{ width: cardWidth }}>
                    <View style={{
                      width: cardWidth, backgroundColor: t.elevated, borderRadius: radius.card,
                      ...squircle, overflow: "hidden",
                    }}>
                      {l.itemUrl && <Image source={{ uri: l.itemUrl }} style={{ width: "100%", aspectRatio: 1 }} />}
                      <View style={{ padding: space[12], gap: space[4] }}>
                        <T variant="subhead" color={t.label} numberOfLines={1}>{l.name || "Logged"}</T>
                        <Num size={type.caption.fontSize} color={t.secondaryLabel}>{l.calories ?? 0} cal · {l.protein ?? 0}g</Num>
                      </View>
                    </View>
                  </EntryMenu>
                </Animated.View>
              ))}
            </View>
          </View>
        ) : (
          <PastDayPill key={day.key} day={day} open={openDay === day.key}
            onToggle={() => setOpenDay(openDay === day.key ? null : day.key)}
            onDelete={confirmDelete} />
        ))}
        {days.length > 0 && (
          <T variant="caption">Press and hold an entry, then tap Delete.</T>
        )}
      </ScrollView>
      <ScreenFades />

      {/* Camera FAB, same learned spot as Train's +. After the fades so the blur does not cover it. */}
      <Pressable
        onPress={() => { tap(); setAddOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel="Log food"
        style={({ pressed }) => ({
          position: "absolute", bottom: insets.bottom + 28, alignSelf: "center",
          width: 56, height: 56, borderRadius: 28, backgroundColor: t.accent,
          alignItems: "center", justifyContent: "center",
          boxShadow: elevation.overlay,
          opacity: pressed ? 0.86 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <SymbolView name="camera.fill" size={22} tintColor={t.accentFg} weight="medium" resizeMode="scaleAspectFit" />
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

function CaloriesHero({ calorieGoal, todayStart, protein, proteinGoal }: {
  calorieGoal: number; todayStart: number; protein: number; proteinGoal: number;
}) {
  const t = useTheme();
  const food = useQuery(api.food.listFoodLogs);
  const cardio = useQuery(api.cardio.recentCardio);

  const inCals = Math.round((food ?? []).reduce((s, r) => (r.loggedAt >= todayStart ? s + (r.calories ?? 0) : s), 0));
  const outCals = Math.round((cardio ?? []).reduce((s, r) => (r.loggedAt >= todayStart ? s + (r.calories ?? 0) : s), 0));
  const net = inCals - outCals;
  const remaining = calorieGoal ? calorieGoal - net : 0;
  const over = calorieGoal > 0 && remaining < 0;
  const hero = calorieGoal ? Math.abs(remaining) : net;
  const unit = calorieGoal ? (over ? "kcal over today" : "kcal left today") : "net kcal";
  const mathLine = calorieGoal
    ? `${calorieGoal} goal  ·  ${inCals} food  ·  ${outCals} burn`
    : `${inCals} food  ·  ${outCals} burn`;
  const proRatio = proteinGoal > 0 ? Math.min(1, protein / proteinGoal) : 0;
  const proMet = proteinGoal > 0 && protein >= proteinGoal;

  return (
    <View style={{ gap: gap.row }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space[8] }}>
        <Display
          size={52}
          color={over ? t.destructive : t.accent}
          style={{ lineHeight: 56 }} // optical: Anton caps clip at the default 1.18 ratio
        >
          {hero}
        </Display>
        <T variant="subhead" style={{ marginBottom: 6 }}>{unit}</T> {/* optical baseline with Display 52 */}
      </View>
      <T variant="footnote">{mathLine}</T>
      <View style={{ gap: space[8] }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <T variant="footnote">Protein</T>
          <Num size={type.footnote.fontSize}>
            {round1(protein)}{proteinGoal > 0 ? ` / ${proteinGoal}` : ""} g
          </Num>
        </View>
        {proteinGoal > 0 ? (
          <Host colorScheme="dark" style={{ height: 8, alignSelf: "stretch" }}>
            <ProgressView
              value={proRatio}
              modifiers={[
                progressViewStyle("linear"),
                tint(proMet ? t.success : t.accent),
                frame({ maxWidth: Infinity, height: 6 }),
              ]}
            />
          </Host>
        ) : (
          <T variant="caption">Set a protein goal in Settings.</T>
        )}
      </View>
    </View>
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
    <Card style={{ flex: 1, padding: space[12], gap: space[8] }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow>Streak</Eyebrow>
        <SymbolView
          name="flame.fill"
          size={14}
          tintColor={streak > 0 ? t.success : t.tertiaryLabel}
          weight="medium"
        />
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space[4] }}>
        <Num size={28} weight="semibold" color={streak > 0 ? t.success : t.label}>{streak}</Num>
        <T variant="footnote" style={{ marginBottom: 3 }}>{streak === 1 ? "day" : "days"}</T> {/* optical baseline with Num 28 */}
      </View>
      {proteinGoal > 0 ? (
        <WeekDots size={17}
          hits={Array.from({ length: 7 }, (_, i) => (byDay.get(todayStart - (6 - i) * DAY) ?? 0) >= proteinGoal)} />
      ) : (
        <T variant="caption">Set a protein goal in Settings.</T>
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
  const met = count >= goal;

  return (
    <Card style={{ flex: 1, padding: space[12], gap: space[8] }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow>Water</Eyebrow>
        <SymbolView name="drop.fill" size={14} tintColor={met ? t.success : t.tertiaryLabel} weight="medium" />
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space[4] }}>
        <Num size={28} weight="semibold" color={met ? t.success : t.label}>{count}</Num>
        <T variant="footnote" style={{ marginBottom: 3 }}>/ {goal}</T> {/* optical baseline with Num 28 */}
      </View>
      <View style={{ flexDirection: "row", gap: space[8] }}>
        <IconButton
          name="minus"
          accessibilityLabel="Remove a cup"
          disabled={count === 0}
          onPress={() => { void removeCup({ start }); }}
          style={{ backgroundColor: t.elevated2 }}
        />
        <IconButton
          name="plus"
          accessibilityLabel="Add a cup"
          onPress={() => { void addCup(); }}
          style={{ backgroundColor: t.elevated2 }}
        />
      </View>
    </Card>
  );
}

function WeightRow() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const weights = useQuery(api.weight.listWeights);
  const settings = useQuery(api.settings.getAll);
  const logWeight = useMutation(api.weight.logWeight);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const latest = weights?.[0];
  const prev = weights?.[1];
  const goal = Number(settings?.weightGoal) || 0;
  const sheetWidth = width - gap.screen * 2;

  const delta = latest && prev ? round1(latest.weight - prev.weight) : null;
  const trend =
    latest == null ? "Tap to log"
      : delta == null ? (goal ? `Goal ${goal} lb` : "Latest log")
        : delta === 0 ? "No change from last"
          : delta > 0 ? `Up ${delta} lb from last`
            : `Down ${Math.abs(delta)} lb from last`;
  const subtitle = latest && goal && delta != null
    ? `Goal ${goal} lb · ${trend}`
    : trend;

  const submit = async () => {
    const n = parseFloat(value);
    if (!Number.isFinite(n) || n <= 0) return;
    await logWeight({ weight: n });
    success();
    setValue("");
    setOpen(false);
  };

  return (
    <>
      <Section>
        <Row
          title="Body weight"
          subtitle={subtitle}
          value={latest ? `${latest.weight.toFixed(1)} lb` : "Log"}
          leading={<SymbolView name="scalemass" size={22} tintColor={t.secondaryLabel} />}
          onPress={() => setOpen(true)}
        />
      </Section>

      <BottomSheet
        isPresented={open}
        onDismiss={() => setOpen(false)}
        showDragIndicator
        modifiers={[presentationBackground(palette.bg)]}
      >
        <RNHostView matchContents>
          <View style={{
            width: sheetWidth,
            gap: gap.group,
            paddingTop: space[16],
            paddingBottom: insets.bottom + space[12],
          }}>
            <T variant="title2" color={t.label}>Log weight</T>
            {latest && (
              <T variant="footnote">
                Latest {latest.weight.toFixed(1)} lb{goal ? ` · goal ${goal}` : ""}
              </T>
            )}
            {weights && weights.length >= 2 && (
              <SparkLine values={[...weights].reverse().map((w) => w.weight)} width={sheetWidth} height={space[40]} />
            )}
            <Field
              value={value}
              onChangeText={setValue}
              placeholder="Weight (lb)"
              keyboardType="decimal-pad"
            />
            <Pill label="Save" kind="accent" onPress={() => void submit()} disabled={!value.trim()} />
          </View>
        </RNHostView>
      </BottomSheet>
    </>
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
      success();
      setPhoto(null); setName(""); onClose();
    } catch {
      setError("Couldn't read that photo. Try again, or type a name and save without analysis.");
    } finally {
      setBusy(false); setStage("");
    }
  };

  // The sheet pads 16 on each side. Give the hosted form a real size so the
  // photo and fields lay out inside the 92% detent instead of collapsing.
  const sheetWidth = width - gap.screen * 2;
  const sheetHeight = Math.max(360, Math.round(height * 0.92) - 36);

  return (
    <BottomSheet
      isPresented={open}
      onDismiss={onClose}
      showDragIndicator
      snapPoints={[{ fraction: 0.92 }]}
      modifiers={[presentationBackground(palette.bg)]}
    >
      <RNHostView matchContents>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ width: sheetWidth, height: sheetHeight, backgroundColor: t.bg }}
          contentContainerStyle={{
            gap: gap.group,
            paddingTop: space[20],
            paddingBottom: insets.bottom + space[12],
          }}
        >
          <T variant="title2" color={t.label}>Log food</T>

          <Pressable
            onPress={() => { tap(); void pick(true); }}
            accessibilityRole="button"
            accessibilityLabel="Snap the meal"
            style={({ pressed }) => ({
              aspectRatio: 1.4,
              borderRadius: radius.card,
              ...squircle,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.elevated,
              opacity: pressed ? 0.86 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            {photo
              ? <Image source={{ uri: photo.uri }} style={{ width: "100%", height: "100%" }} />
              : <View style={{ alignItems: "center", gap: space[8] }}>
                  <SymbolView name="camera.fill" size={26} tintColor={t.secondaryLabel} />
                  <T variant="footnote">Snap the meal</T>
                </View>}
          </Pressable>
          <Pill label="Choose from library" kind="outline" onPress={() => void pick(false)} />

          <Field value={name} onChangeText={setName} placeholder="Name (optional, AI fills it in)" />
          <Pill label={busy ? (stage || "Saving…") : "Save to today"} kind="accent"
            onPress={() => void submit()} disabled={!photo || busy} />
          {error && <T variant="footnote" color={t.destructive}>{error}</T>}
          <T variant="caption" style={{ textAlign: "center" }}>
            The coach reads your photo to name it and pull calories + protein.
          </T>
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
  const rowWidth = width - gap.screen * 2;
  return (
    <View style={{ backgroundColor: t.elevated, borderRadius: radius.card, ...squircle, overflow: "hidden" }}>
      <Pressable
        onPress={() => { tap(); onToggle(); }}
        accessibilityRole="button"
        accessibilityLabel={day.label}
        style={({ pressed }) => ({
          flexDirection: "row", alignItems: "center", gap: space[12],
          paddingHorizontal: space[16], paddingVertical: space[12],
          backgroundColor: pressed ? t.elevated2 : "transparent",
        })}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="headline" color={t.label}>{day.label}</T>
          <T variant="caption">{day.items.length} {day.items.length === 1 ? "item" : "items"}</T>
        </View>
        <Num size={type.caption.fontSize} color={t.secondaryLabel}>{day.cal} cal · {round1(day.pro)}g</Num>
        <SymbolView
          name={open ? "chevron.up" : "chevron.down"}
          size={14}
          tintColor={t.tertiaryLabel}
          weight="semibold"
        />
      </Pressable>
      {open && day.items.map((l) => (
        <View key={l._id}>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.separator, marginLeft: space[16] }} />
          <EntryMenu onDelete={() => onDelete(l._id)} style={{ width: rowWidth }}>
            <View style={{
              width: rowWidth, flexDirection: "row", alignItems: "center", gap: space[12],
              paddingHorizontal: space[16], paddingVertical: space[12],
            }}>
              <T variant="body" color={t.label} numberOfLines={1} style={{ flex: 1 }}>{l.name || "Logged"}</T>
              <Num size={type.caption.fontSize} color={t.secondaryLabel}>{l.calories ?? 0} cal · {l.protein ?? 0}g</Num>
            </View>
          </EntryMenu>
        </View>
      ))}
    </View>
  );
}
