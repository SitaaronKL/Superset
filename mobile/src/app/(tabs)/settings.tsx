import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { Host } from "@expo/ui";
import {
  Button,
  Form,
  LabeledContent,
  RNHostView,
  Section,
  TextField,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  autocorrectionDisabled,
  background,
  font,
  foregroundStyle,
  frame,
  keyboardType,
  listSectionSpacing,
  listStyle,
  monospacedDigit,
  multilineTextAlignment,
  onSubmit,
  scrollContentBackground,
  scrollDismissesKeyboard,
  submitLabel,
  textFieldStyle,
  textInputAutocapitalization,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import { api } from "../../../../convex/_generated/api";
import { Screen, ScreenFades, useScreenInsets } from "@/components/screen";
import { Body, Display, Eyebrow } from "@/components/ui/kit";
import { accentFromSetting, fonts, palette, useTheme } from "@/lib/theme";

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
  const text = useNativeState(current ?? "");
  const draft = useRef(current ?? "");
  const dirty = useRef(false);
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current || current === undefined || draft.current === current) return;
    draft.current = current;
    text.set(current);
  }, [current, text]);

  const save = () => {
    if (!dirty.current) return;
    const next = draft.current;
    dirty.current = false;
    if (next === (current ?? "")) return;
    void setSetting({ key: settingKey, value: next });
  };

  return (
    <LabeledContent label={label}>
      <TextField
        text={text}
        placeholder={placeholder}
        onTextChange={(value) => {
          draft.current = value;
          dirty.current = value !== (current ?? "");
        }}
        onFocusChange={(isFocused) => {
          focused.current = isFocused;
          if (!isFocused) save();
        }}
        modifiers={[
          textFieldStyle("plain"),
          keyboardType("decimal-pad"),
          textInputAutocapitalization("never"),
          autocorrectionDisabled(),
          submitLabel("done"),
          onSubmit(save),
          multilineTextAlignment("trailing"),
          font({ family: fonts.mono, size: 17 }),
          monospacedDigit(),
          frame({ width: 120, alignment: "trailing" }),
        ]}
      />
    </LabeledContent>
  );
}

export default function SettingsScreen() {
  const t = useTheme();
  const pad = useScreenInsets();
  const { signOut } = useAuthActions();
  const settings = useQuery(api.settings.getAll);
  const setSetting = useMutation(api.settings.set);

  if (!settings) {
    return (
      <Screen>
        <Body color={t.mutedFg} style={{ paddingHorizontal: 16, paddingTop: pad.top }}>Loading…</Body>
      </Screen>
    );
  }

  const accent = settings.accent ?? ACCENTS[0].value;

  return (
    <Screen>
      <Host
        style={{ flex: 1 }}
        colorScheme="dark"
        useViewportSizeMeasurement
        seedColor={t.accent}
        // iOS Host accepts "container" (under the status bar and home indicator,
        // keyboard still insets). The universal Host type only lists "all".
        ignoreSafeArea={"container" as "all"}
      >
        <Form
          modifiers={[
            scrollContentBackground("hidden"),
            background(palette.bg),
            tint(t.accent),
            listStyle("insetGrouped"),
            listSectionSpacing("compact"),
            scrollDismissesKeyboard("interactively"),
          ]}
        >
          <Section
            header={
              <RNHostView matchContents>
                <View style={{ paddingTop: pad.top, paddingBottom: 8, paddingLeft: 20, gap: 18 }}>
                  <Display size={34}>Settings</Display>
                  <Eyebrow style={{ paddingLeft: 20 }}>Accent</Eyebrow>
                </View>
              </RNHostView>
            }
          >
            <RNHostView matchContents>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 4, paddingLeft: 44 }}>
                {ACCENTS.map((a) => {
                  const hex = accentFromSetting(a.value);
                  const active = accent === a.value;
                  return (
                    <Pressable
                      key={a.name}
                      accessibilityLabel={a.name}
                      accessibilityRole="button"
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        void setSetting({ key: "accent", value: a.value });
                      }}
                      style={{
                        width: 42, height: 42, borderRadius: 21, backgroundColor: hex.hex,
                        alignItems: "center", justifyContent: "center",
                        borderWidth: active ? 2 : 0, borderColor: t.fg,
                      }}
                    >
                      {active && <Check size={16} color={hex.fg} strokeWidth={3} />}
                    </Pressable>
                  );
                })}
              </View>
            </RNHostView>
          </Section>

          <Section title="Daily goals">
            <GoalField label="Protein (g)" settingKey="proteinGoal" placeholder="e.g. 180" current={settings.proteinGoal} />
            <GoalField label="Calories" settingKey="calorieGoal" placeholder="e.g. 2400" current={settings.calorieGoal} />
            <GoalField label="Goal weight (lb)" settingKey="weightGoal" placeholder="e.g. 175" current={settings.weightGoal} />
            <GoalField label="Water (cups)" settingKey="waterGoal" placeholder="e.g. 8" current={settings.waterGoal} />
          </Section>

          <Section
            title="Account"
            footer={
              <RNHostView matchContents>
                <View style={{ height: pad.bottom }} />
              </RNHostView>
            }
          >
            <Button
              label="Sign out"
              role="destructive"
              modifiers={[foregroundStyle(palette.destructive)]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                void signOut();
              }}
            />
          </Section>
        </Form>
      </Host>
      <ScreenFades />
    </Screen>
  );
}
