import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { api } from "../../../convex/_generated/api";
import { Screen } from "@/components/screen";
import { Sheet } from "@/components/ui/sheet";
import {
  Eyebrow, Field, IconButton, Row, Section, Skeleton, T,
  gap, radius, space,
} from "@/components/ui/kit";
import { tap, warning } from "@/lib/haptics";
import { accentFromSetting, useTheme, type AppearancePref } from "@/lib/theme";
import { Host } from "@expo/ui";
import { Picker, Text as SwiftText } from "@expo/ui/swift-ui";
import { labelsHidden, pickerStyle, tag, tint } from "@expo/ui/swift-ui/modifiers";

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

function Leading({ name }: { name: SFSymbol }) {
  const t = useTheme();
  return (
    <SymbolView
      name={name}
      size={22}
      tintColor={t.label}
      weight="regular"
      resizeMode="scaleAspectFit"
    />
  );
}

function sectionHeader(label: string) {
  return <Eyebrow style={{ paddingHorizontal: space[16] }}>{label}</Eyebrow>;
}

function GoalRow({ label, settingKey, placeholder, current, icon }: {
  label: string; settingKey: string; placeholder: string; current?: string; icon: SFSymbol;
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
    <Row
      title={label}
      leading={<Leading name={icon} />}
      accessory={
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
            height: 28,
            backgroundColor: "transparent",
            paddingHorizontal: 0,
            textAlign: "right",
            color: t.secondaryLabel,
          }}
        />
      }
    />
  );
}

function SettingsHeader({ onClose }: { onClose: () => void }) {
  // Settings is always a form sheet; this clears the drag handle, nothing more.
  const topPad = space[20];
  return (
    <View style={{ paddingTop: topPad, paddingBottom: space[8] }}>
      <View style={{ height: 44, justifyContent: "center", paddingHorizontal: gap.screen }}>
        <T variant="headline" style={{ textAlign: "center" }}>Settings</T>
        <View style={{ position: "absolute", right: gap.screen, top: 2 }}>
          <IconButton
            name="xmark"
            variant="glass"
            accessibilityLabel="Close"
            onPress={onClose}
          />
        </View>
      </View>
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
  const [accentOpen, setAccentOpen] = useState(false);
  // Opened without a back stack (deep link, reload), fall back to Train instead of erroring.
  const dismiss = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (!settings) {
    return (
      <Screen>
        <SettingsHeader onClose={dismiss} />
        <View style={{ paddingHorizontal: gap.screen, gap: gap.section, paddingTop: space[8] }}>
          <Skeleton height={52} />
          <Skeleton height={176} />
          <Skeleton height={120} />
          <Skeleton height={52} />
        </View>
      </Screen>
    );
  }

  const accent = settings.accent ?? ACCENTS[0].value;
  const accentMeta = ACCENTS.find((a) => a.value === accent) ?? ACCENTS[0];
  const accentHex = accentFromSetting(accent);
  const shaveDays = parseShaveDays(settings.skinShaveDays);
  const startDate = parseStartDate(settings.skinStartDate);

  const toggleShaveDay = (day: number) => {
    tap();
    const next = shaveDays.includes(day)
      ? shaveDays.filter((d) => d !== day)
      : [...shaveDays, day].sort((a, b) => a - b);
    void setSetting({ key: "skinShaveDays", value: JSON.stringify(next) });
  };

  const pickAccent = (value: string) => {
    tap();
    void setSetting({ key: "accent", value });
    setAccentOpen(false);
  };

  return (
    <Screen>
      {/* Header lives inside the scroll content: an iOS 26 form sheet shifts its
          first ScrollView under anything fixed above it, which overlapped the list. */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentInsetAdjustmentBehavior="never"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: gap.screen,
          paddingTop: 0,
          paddingBottom: (insets.top > 0 ? insets.bottom : 0) + space[24],
          gap: gap.section,
        }}
      >
        <View style={{ marginHorizontal: -gap.screen, marginBottom: -gap.section + space[8] }}>
          <SettingsHeader onClose={dismiss} />
        </View>
        <Section header={sectionHeader("App")}>
          <Row
            title="Accent"
            leading={<Leading name="paintpalette" />}
            onPress={() => setAccentOpen(true)}
            accessory={
              <View style={{ flexDirection: "row", alignItems: "center", gap: space[8] }}>
                <T variant="body" color={t.secondaryLabel} numberOfLines={1}>{accentMeta.name}</T>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: accentHex.hex,
                  }}
                />
                <SymbolView name="chevron.right" size={14} tintColor={t.tertiaryLabel} weight="semibold" />
              </View>
            }
          />
          <Row
            title="Appearance"
            leading={<Leading name="circle.lefthalf.filled" />}
            accessory={
              // ChatGPT style: the current value with an up-down chevron, opening a native menu.
              <Host matchContents colorScheme={t.scheme}>
                <Picker<AppearancePref>
                  label="Appearance"
                  selection={t.appearance}
                  onSelectionChange={(next) => {
                    tap();
                    void setSetting({ key: "theme", value: next });
                  }}
                  modifiers={[pickerStyle("menu"), labelsHidden(), tint(t.secondaryLabel)]}
                >
                  <SwiftText modifiers={[tag("system")]}>System</SwiftText>
                  <SwiftText modifiers={[tag("light")]}>Light</SwiftText>
                  <SwiftText modifiers={[tag("dark")]}>Dark</SwiftText>
                </Picker>
              </Host>
            }
          />
        </Section>

        <Section header={sectionHeader("Daily goals")}>
          <GoalRow
            label="Protein (g)"
            settingKey="proteinGoal"
            placeholder="e.g. 180"
            current={settings.proteinGoal}
            icon="fork.knife"
          />
          <GoalRow
            label="Calories"
            settingKey="calorieGoal"
            placeholder="e.g. 2400"
            current={settings.calorieGoal}
            icon="flame"
          />
          <GoalRow
            label="Goal weight (lb)"
            settingKey="weightGoal"
            placeholder="e.g. 175"
            current={settings.weightGoal}
            icon="scalemass"
          />
          <GoalRow
            label="Water (cups)"
            settingKey="waterGoal"
            placeholder="e.g. 8"
            current={settings.waterGoal}
            icon="drop"
          />
        </Section>

        <Section
          header={sectionHeader("Skin")}
          footer="Days you typically shave. The AM routine adds the shave step on these days."
        >
          <Row
            title="Routine start"
            leading={<Leading name="calendar" />}
            accessory={
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
            }
          />
          <View style={{ paddingVertical: space[12], paddingHorizontal: space[16], gap: space[12] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space[12] }}>
              <Leading name="scissors" />
              <T variant="body" style={{ flex: 1 }}>Default shave days</T>
            </View>
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
                    })}
                  >
                    <T variant="caption" color={on ? t.accentFg : t.secondaryLabel}>{day.label}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Section>

        <Section>
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
                flexDirection: "row",
                alignItems: "center",
                gap: space[12],
              }}
            >
              <Leading name="rectangle.portrait.and.arrow.right" />
              <T variant="body" style={{ flex: 1 }}>Sign out</T>
            </View>
          </Pressable>
        </Section>
      </ScrollView>

      <Sheet
        isPresented={accentOpen}
        onDismiss={() => setAccentOpen(false)}
        title="Accent"
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: space[16],
            justifyContent: "center",
            paddingVertical: space[8],
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
                onPress={() => pickAccent(a.value)}
                style={({ pressed }) => ({
                  alignItems: "center",
                  gap: space[8],
                  opacity: pressed ? 0.78 : 1,
                  width: 72,
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: hex.hex,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {active ? (
                    <SymbolView name="checkmark" size={16} tintColor={hex.fg} weight="bold" />
                  ) : null}
                </View>
                <T variant="caption" numberOfLines={1} style={{ textAlign: "center" }}>{a.name}</T>
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </Screen>
  );
}
