import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import { api } from "../../../../convex/_generated/api";
import { Body, Card, Display, Eyebrow, Field, Pill } from "@/components/ui/kit";
import { accentFromSetting, palette, useTheme } from "@/lib/theme";

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

function GoalField({ label, settingKey, placeholder, current }: {
  label: string; settingKey: string; placeholder: string; current?: string;
}) {
  const setSetting = useMutation(api.settings.set);
  const [value, setValue] = useState<string | null>(null);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Body size={14}>{label}</Body>
      <Field mono value={value ?? current ?? ""} onChangeText={setValue} placeholder={placeholder}
        keyboardType="decimal-pad" style={{ width: 120, height: 40, textAlign: "center" }}
        onBlur={() => { if (value !== null) void setSetting({ key: settingKey, value }); }} />
    </View>
  );
}

export default function SettingsScreen() {
  const t = useTheme();
  const { signOut } = useAuthActions();
  const settings = useQuery(api.settings.getAll);
  const setSetting = useMutation(api.settings.set);

  if (!settings) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}><Body color={t.mutedFg} style={{ padding: 24 }}>Loading…</Body></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        <Display size={26}>Settings</Display>

        <Card>
          <Eyebrow>Accent</Eyebrow>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {ACCENTS.map((a) => {
              const hex = accentFromSetting(a.value);
              const active = (settings.accent ?? ACCENTS[0].value) === a.value;
              return (
                <Pressable key={a.name} accessibilityLabel={a.name}
                  onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void setSetting({ key: "accent", value: a.value }); }}
                  style={{
                    width: 42, height: 42, borderRadius: 21, backgroundColor: hex.hex,
                    alignItems: "center", justifyContent: "center",
                    borderWidth: active ? 2 : 0, borderColor: t.fg,
                  }}>
                  {active && <Check size={16} color={hex.fg} strokeWidth={3} />}
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card>
          <Eyebrow>Daily goals</Eyebrow>
          <GoalField label="Protein (g)" settingKey="proteinGoal" placeholder="e.g. 180" current={settings.proteinGoal} />
          <GoalField label="Calories" settingKey="calorieGoal" placeholder="e.g. 2400" current={settings.calorieGoal} />
          <GoalField label="Goal weight (lb)" settingKey="weightGoal" placeholder="e.g. 175" current={settings.weightGoal} />
          <GoalField label="Water (cups)" settingKey="waterGoal" placeholder="e.g. 8" current={settings.waterGoal} />
        </Card>

        <Body size={12} color={t.mutedFg}>
          Program days, reminders, and coach memory are managed on the web app. Everything here syncs live with it.
        </Body>

        <Pill label="Sign out" kind="outline" onPress={() => void signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}
