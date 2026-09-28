import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { api } from "../../../convex/_generated/api";
import { Screen } from "@/components/screen";
import { Field, Section, Skeleton, T, gap, radius, space } from "@/components/ui/kit";
import { tap, warning } from "@/lib/haptics";
import { accentFromSetting, useTheme } from "@/lib/theme";

// Same preset accents as the web app; the oklch strings are what's stored
// in shared settings, the hexes are the native rendering.
const ACCENTS = [
  { name: "Signal Red", value: "oklch(0.55 0.22 25)" },
  { name: "Volt", value: "oklch(0.85 0.25 130)" },
  { name: "Cobalt", value: "oklch(0.55 0.2 260)" },
  { name: "Tangerine", value: "oklch(0.7 0.19 50)" },
  { name: "Hot Pink", value: "oklch(0.65 0.26 350)" },
  { name: "Cyan", value: "oklch(0.75 0.15 210)" },
];

const WEEKDAYS = [
  { label: "S", name: "Sunday" },
  { label: "M", name: "Monday" },
  { label: "T", name: "Tuesday" },
  { label: "W", name: "Wednesday" },
  { label: "T", name: "Thursday" },
  { label: "F", name: "Friday" },
  { label: "S", name: "Saturday" },
] as const;

// Matches convex/skinEngine DEFAULT_SHAVE_DAYS (Sun, Tue, Thu).
const DEFAULT_SHAVE_DAYS = [0, 2, 4];

function parseShaveDays(raw?: string): number[] {
  if (!raw) return DEFAULT_SHAVE_DAYS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((n) => typeof n === "number")) return parsed;
  } catch {
    /* keep default */
  }
  return DEFAULT_SHAVE_DAYS;
}

function parseStartDate(key?: string): Date {
  const noon = (d: Date) => {
    d.setHours(12, 0, 0, 0);
    return d;
  };
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return noon(new Date());
  const [y, m, d] = key.split("-").map(Number);
  return noon(new Date(y, m - 1, d));
}

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function GoalRow({ label, settingKey, placeholder, current }: {
  label: string; settingKey: string; placeholder: string; current?: string;
}) {
  const t = useTheme();
  const setSetting = useMutation(api.settings.set);
  const [value, setValue] = useState(current ?? "");
  const dirty = useRef(false);
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current || dirty.current || current === undefined) return;
    setValue(current);
  }, [current]);

  const save = () => {
    if (!dirty.current) return;
    const next = value;
    dirty.current = false;
    if (next === (current ?? "")) return;
    void setSetting({ key: settingKey, value: next });
  };

  return (
    <View
      style={{
        minHeight: 44,
        paddingVertical: space[8],
        paddingHorizontal: space[16],
        flexDirection: "row",
        alignItems: "center",
        gap: space[12],
      }}
    >
      <T variant="body" style={{ flex: 1 }}>{label}</T>
      <Field
        value={value}
        onChangeText={(next) => {
          dirty.current = next !== (current ?? "");
          setValue(next);
        }}
        onFocus={() => { focused.current = true; }}
        onBlur={() => {
          focused.current = false;
          save();
        }}
        onSubmitEditing={save}
        placeholder={placeholder}
        placeholderTextColor={t.tertiaryLabel}
        keyboardType="decimal-pad"
        returnKeyType="done"
        autoCapitalize="none"
        autoCorrect={false}
        mono
        style={{
          width: 112,
          backgroundColor: "transparent",
          paddingHorizontal: 0,
          textAlign: "right",
        }}
      />
    </View>
  );
}

function SheetHeader({ onDone }: { onDone: () => void }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: gap.screen,
        paddingTop: space[12],
        paddingBottom: space[8],
      }}
    >
      <T variant="title2">Settings</T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Done"
        hitSlop={8}
        onPress={() => {
          tap();
          onDone();
        }}
        style={({ pressed }) => ({
          minHeight: 44,
          minWidth: 44,
          alignItems: "flex-end",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <T variant="headline" color={t.accent}>Done</T>
      </Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const settings = useQuery(api.settings.getAll);
  const setSetting = useMutation(api.settings.set);
  const dismiss = () => router.back();

  if (!settings) {
    return (
      <Screen>
        <SheetHeader onDone={dismiss} />
        <View style={{ paddingHorizontal: gap.screen, gap: gap.section, paddingTop: space[8] }}>
          <Skeleton height={88} />
          <Skeleton height={176} />
          <Skeleton height={120} />
          <Skeleton height={44} />
        </View>
      </Screen>
    );
  }

  const accent = settings.accent ?? ACCENTS[0].value;
  const shaveDays = parseShaveDays(settings.skinShaveDays);
  const startDate = parseStartDate(settings.skinStartDate);

  const toggleShaveDay = (day: number) => {
    tap();
    const next = shaveDays.includes(day)
      ? shaveDays.filter((d) => d !== day)
      : [...shaveDays, day].sort((a, b) => a - b);
    void setSetting({ key: "skinShaveDays", value: JSON.stringify(next) });
  };

  return (
    <Screen>
      <SheetHeader onDone={dismiss} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: gap.screen,
          paddingTop: space[8],
          paddingBottom: insets.bottom + space[24],
          gap: gap.section,
        }}
      >
        <Section header="Accent">
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: gap.row,
              padding: space[16],
            }}
          >
            {ACCENTS.map((a) => {
              const hex = accentFromSetting(a.value);
              const active = accent === a.value;
              return (
                <Pressable
                  key={a.name}
                  accessibilityLabel={a.name}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    tap();
                    void setSetting({ key: "accent", value: a.value });
                  }}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: hex.hex,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.78 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  {active ? (
                    <SymbolView name="checkmark" size={16} tintColor={hex.fg} weight="bold" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section header="Daily goals">
          <GoalRow label="Protein (g)" settingKey="proteinGoal" placeholder="e.g. 180" current={settings.proteinGoal} />
          <GoalRow label="Calories" settingKey="calorieGoal" placeholder="e.g. 2400" current={settings.calorieGoal} />
          <GoalRow label="Goal weight (lb)" settingKey="weightGoal" placeholder="e.g. 175" current={settings.weightGoal} />
          <GoalRow label="Water (cups)" settingKey="waterGoal" placeholder="e.g. 8" current={settings.waterGoal} />
        </Section>

        <Section
          header="Skin"
          footer="Days you typically shave. The AM routine adds the shave step on these days."
        >
          <View
            style={{
              minHeight: 44,
              paddingVertical: space[8],
              paddingHorizontal: space[16],
              flexDirection: "row",
              alignItems: "center",
              gap: space[12],
            }}
          >
            <T variant="body" style={{ flex: 1 }}>Routine start</T>
            <DateTimePicker
              value={startDate}
              mode="date"
              display="compact"
              themeVariant="dark"
              accentColor={t.accent}
              onValueChange={(_event, date) => {
                const next = toDayKey(date);
                if (next === (settings.skinStartDate ?? "")) return;
                void setSetting({ key: "skinStartDate", value: next });
              }}
              style={{ width: 140, height: 36 }}
            />
          </View>
          <View style={{ padding: space[16], gap: gap.row }}>
            <T variant="body">Default shave days</T>
            <View style={{ flexDirection: "row", gap: space[4] }}>
              {WEEKDAYS.map((day, i) => {
                const on = shaveDays.includes(i);
                return (
                  <Pressable
                    key={day.name}
                    accessibilityRole="button"
                    accessibilityLabel={day.name}
                    accessibilityState={{ selected: on }}
                    onPress={() => toggleShaveDay(i)}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 36,
                      borderRadius: radius.full,
                      backgroundColor: on ? t.accent : t.elevated2,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.78 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}
                  >
                    <T variant="caption" color={on ? t.accentFg : t.secondaryLabel}>{day.label}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Section>

        <Section header="Account">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={() => {
              warning();
              void signOut();
            }}
            style={({ pressed }) => ({ backgroundColor: pressed ? t.elevated2 : "transparent" })}
          >
            <View
              style={{
                minHeight: 44,
                paddingVertical: space[12],
                paddingHorizontal: space[16],
                justifyContent: "center",
              }}
            >
              <T variant="body" color={t.destructive}>Sign out</T>
            </View>
          </Pressable>
        </Section>
      </ScrollView>
    </Screen>
  );
}
