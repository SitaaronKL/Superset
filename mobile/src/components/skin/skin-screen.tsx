import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Host } from "@expo/ui";
import { Picker, Text as SwiftText } from "@expo/ui/swift-ui";
import { labelsHidden, pickerStyle, tag, tint } from "@expo/ui/swift-ui/modifiers";
import { SymbolView } from "expo-symbols";
import { api } from "../../../../convex/_generated/api";
import { Screen, ScreenFades, useScreenInsets } from "@/components/screen";
import { Body, Display, Num, Pill } from "@/components/ui/kit";
import { sf, useTheme } from "@/lib/theme";
import { formatLongDate, todayKey, weekdayNarrow } from "@/lib/day";
import { AskSection } from "./ask-section";
import { Group } from "./group";
import { PhotosStrip } from "./photos-strip";
import { ProposeSheet } from "./propose-sheet";
import { SlotList } from "./slot-list";
import { productParts, rampLabel, type PlannedRow, type SkinDay } from "./types";

export function SkinScreen() {
  const t = useTheme();
  const pad = useScreenInsets();
  const dayKey = todayKey();
  const day = useQuery(api.skin.day, { dayKey });
  const routine = useQuery(api.skin.routine, { todayKey: dayKey });
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposePath, setProposePath] = useState<"import" | "recommend" | null>(null);

  const openPropose = (path: "import" | "recommend" | null = null) => {
    setProposePath(path);
    setProposeOpen(true);
  };

  if (day === undefined) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingTop: pad.top, paddingBottom: pad.bottom }}>
          <Display size={34}>Skin</Display>
          <View style={{ height: 16, width: 180, borderRadius: 8, backgroundColor: t.muted }} />
          <View style={{ height: 72, borderRadius: 22, backgroundColor: t.card }} />
          <View style={{ height: 160, borderRadius: 22, backgroundColor: t.card }} />
          <View style={{ height: 160, borderRadius: 22, backgroundColor: t.card }} />
        </ScrollView>
        <ScreenFades />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ padding: 16, gap: 24, paddingTop: pad.top, paddingBottom: pad.bottom }}
        >
          <View style={{ gap: 6 }}>
            <Display size={34}>Skin</Display>
            <Body size={15} color={t.mutedFg}>{formatLongDate(day.dayKey)}</Body>
          </View>

          {day.hasRoutine ? (
            <LoadedBody
              day={day}
              products={routine?.products ?? []}
              onPropose={openPropose}
            />
          ) : (
            <EmptyRoutine onPropose={openPropose} />
          )}

          <PhotosStrip dayKey={dayKey} />
          <AskSection dayKey={dayKey} />
        </ScrollView>
      </KeyboardAvoidingView>
      <ScreenFades />
      <ProposeSheet
        open={proposeOpen}
        initialPath={proposePath}
        onClose={() => {
          setProposeOpen(false);
          setProposePath(null);
        }}
      />
    </Screen>
  );
}

function LoadedBody({ day, products, onPropose }: {
  day: SkinDay;
  products: { name: string; brand?: string | null }[];
  onPropose: (path?: "import" | "recommend" | null) => void;
}) {
  const t = useTheme();
  const toggleStep = useMutation(api.skin.toggleStep);
  const completeSlot = useMutation(api.skin.completeSlot);
  const setShaved = useMutation(api.skin.setShaved);
  const steps: PlannedRow[] = [...day.am, ...day.pm, ...day.shower];
  const active = day.pm.find((s) => s.kind === "Active");
  const tonight = active
    ? `Tonight: ${productParts(active.productName, products).name}`
    : day.pm.length === 0
      ? "Tonight: nothing planned"
      : null;

  return (
    <>
      <View style={{ gap: 10 }}>
        <View style={{ gap: 4 }}>
          <Body size={22} style={{ ...sf.semibold }}>
            {day.shaved ? "Shave day" : "No shave"}
          </Body>
          <Body size={15} color={t.mutedFg}>{rampLabel(day.rampWeek)}</Body>
          {tonight ? <Body size={15} color={t.mutedFg}>{tonight}</Body> : null}
        </View>
        <Host matchContents={{ vertical: true }} colorScheme="dark" seedColor={t.accent} style={{ minHeight: 36 }}>
          <Picker<"shave" | "noshave">
            label="Shave"
            selection={day.shaved ? "shave" : "noshave"}
            onSelectionChange={(next) => {
              void Haptics.selectionAsync();
              void setShaved({ dayKey: day.dayKey, shaved: next === "shave" });
            }}
            modifiers={[pickerStyle("segmented"), labelsHidden(), tint(t.accent)]}
          >
            <SwiftText modifiers={[tag("shave")]}>Shave today</SwiftText>
            <SwiftText modifiers={[tag("noshave")]}>No shave</SwiftText>
          </Picker>
        </Host>
        {!day.shaveIsDefault && (
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              void setShaved({ dayKey: day.dayKey, shaved: null });
            }}
            hitSlop={6}
          >
            <Body size={13} color={t.accent}>Use usual shave days</Body>
          </Pressable>
        )}
      </View>

      <Accountability day={day} products={products} />

      <SlotList
        steps={steps}
        products={products}
        onToggle={(stepId) => void toggleStep({ dayKey: day.dayKey, stepId })}
        onComplete={(stepIds) => void completeSlot({ dayKey: day.dayKey, stepIds })}
      />

      <View style={{ gap: 8 }}>
        <Pressable
          onPress={() => router.push("/skin/routine")}
          style={({ pressed }) => ({
            flexDirection: "row", alignItems: "center", gap: 10,
            paddingVertical: 14, paddingHorizontal: 16,
            backgroundColor: t.card, borderRadius: 22, borderCurve: "continuous",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <SymbolView name="list.bullet" tintColor={t.fg} style={{ width: 16, height: 16 }} />
          <Body size={17} style={{ flex: 1, ...sf.medium }}>My routine</Body>
          <SymbolView name="chevron.right" tintColor={t.mutedFg} style={{ width: 12, height: 12 }} />
        </Pressable>
        <Pressable
          onPress={() => onPropose(null)}
          style={({ pressed }) => ({
            flexDirection: "row", alignItems: "center", gap: 10,
            paddingVertical: 14, paddingHorizontal: 16,
            backgroundColor: t.card, borderRadius: 22, borderCurve: "continuous",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <SymbolView name="square.and.pencil" tintColor={t.fg} style={{ width: 16, height: 16 }} />
          <Body size={17} style={{ flex: 1, ...sf.medium }}>Bring your own</Body>
          <SymbolView name="chevron.right" tintColor={t.mutedFg} style={{ width: 12, height: 12 }} />
        </Pressable>
      </View>
    </>
  );
}

function Accountability({ day, products }: {
  day: SkinDay;
  products: { name: string; brand?: string | null }[];
}) {
  const t = useTheme();
  const missed = day.missedYesterday;
  const adherence = day.adherence14;
  // Name at most three things, so a fully skipped day reads as one calm line.
  const missedNames = missed.map((m) => {
    const { name } = productParts(m.productName, products);
    const tagLabel = m.slot === "pm" ? " (PM)" : m.slot === "shower" ? " (shower)" : "";
    return `${name}${tagLabel}`;
  });
  const missedLine = missedNames.length === 0
    ? null
    : missedNames.length > 3
      ? `Yesterday you skipped ${missedNames.slice(0, 2).join(", ")} and ${missedNames.length - 2} more. Today is a fresh start.`
      : `Yesterday you skipped: ${missedNames.join(", ")}.`;

  return (
    <View style={{ gap: 10 }}>
      <Group style={{ padding: 16, gap: 14, overflow: "visible" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <Display size={40}>{day.streak}</Display>
            <Body size={13} color={t.mutedFg} style={{ marginBottom: 6 }}>day streak</Body>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
            <Num size={17}>
              {adherence === null ? "New" : `${Math.round(adherence * 100)}%`}
            </Num>
            <Body size={11} color={t.mutedFg}>{adherence === null ? "adherence starts tomorrow" : "14-day adherence"}</Body>
          </View>
        </View>
        <WeekRings week={day.week} />
      </Group>
      {missedLine && (
        <View style={{ backgroundColor: t.muted, borderRadius: 16, borderCurve: "continuous", paddingHorizontal: 14, paddingVertical: 12 }}>
          <Body size={15} color={t.mutedFg}>{missedLine}</Body>
        </View>
      )}
    </View>
  );
}

function WeekRings({ week }: { week: SkinDay["week"] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      {week.map((d, i) => {
        const isToday = i === week.length - 1;
        const full = d.completion >= 1;
        const some = d.completion > 0 && !full;
        return (
          <View key={d.dayKey} style={{ alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: 28, height: 28, borderRadius: 14,
                alignItems: "center", justifyContent: "center",
                backgroundColor: full ? t.fg : some ? t.accent : "transparent",
                borderWidth: full ? 0 : 1.5,
                borderColor: isToday ? t.accent : t.border,
              }}
            >
              {full && (
                <SymbolView name="checkmark" tintColor="#000" weight="bold" style={{ width: 11, height: 11 }} />
              )}
              {some && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.accentFg }} />
              )}
            </View>
            <Body size={11} color={isToday ? t.fg : t.mutedFg}>{weekdayNarrow(d.dayKey)}</Body>
          </View>
        );
      })}
    </View>
  );
}

function EmptyRoutine({ onPropose }: { onPropose: (path?: "import" | "recommend" | null) => void }) {
  const t = useTheme();
  return (
    <View style={{ gap: 16, paddingVertical: 12 }}>
      <View
        style={{
          width: 56, height: 56, borderRadius: 28, backgroundColor: t.card,
          alignItems: "center", justifyContent: "center",
        }}
      >
        <SymbolView name="drop.fill" tintColor={t.accent} style={{ width: 24, height: 24 }} />
      </View>
      <View style={{ gap: 6 }}>
        <Body size={22} style={{ ...sf.semibold }}>Start with today</Body>
        <Body size={15} color={t.mutedFg}>
          Paste the routine you already use, or get a calm starter built around your goals.
        </Body>
      </View>
      <Pill label="Paste my routine" kind="accent" onPress={() => onPropose("import")} />
      <Pill label="Recommend one for me" kind="primary" onPress={() => onPropose("recommend")} />
      <Pressable onPress={() => router.push("/skin/routine")} hitSlop={8} style={{ alignSelf: "center" }}>
        <Body size={13} color={t.mutedFg}>I'll add products myself</Body>
      </Pressable>
    </View>
  );
}
