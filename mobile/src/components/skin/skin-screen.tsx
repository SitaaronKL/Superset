import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { Host } from "@expo/ui";
import { Button, Image as SwiftImage, Menu, Picker, Text as SwiftText } from "@expo/ui/swift-ui";
import { labelsHidden, pickerStyle, tag, tint, frame } from "@expo/ui/swift-ui/modifiers";
import { SymbolView } from "expo-symbols";
import { api } from "../../../../convex/_generated/api";
import { Screen, ScreenFades, useScreenInsets } from "@/components/screen";
import {
  EmptyState, GlassPill, IconButton, Num, Pill, ScreenTitle, Skeleton, T,
  gap, space,
} from "@/components/ui/kit";
import { tap } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { formatLongDate, todayKey, weekdayNarrow } from "@/lib/day";
import { AskSection } from "./ask-section";
import { PhotosTab } from "./photos-strip";
import { PillTabs } from "./pill-tabs";
import { ProposeSheet } from "./propose-sheet";
import { RoutineEditor } from "./routine-editor";
import { SlotList } from "./slot-list";
import { productParts, rampLabel, type SkinDay } from "./types";

type Tab = "today" | "routine" | "photos";

const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "routine", label: "Routine" },
  { id: "photos", label: "Photos" },
];

export function SkinScreen() {
  const t = useTheme();
  const pad = useScreenInsets();
  const dayKey = todayKey();
  const day = useQuery(api.skin.day, { dayKey });
  const routine = useQuery(api.skin.routine, { todayKey: dayKey });
  const [tab, setTab] = useState<Tab>("today");
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposePath, setProposePath] = useState<"import" | "recommend" | null>(null);
  const [addPhotoOpen, setAddPhotoOpen] = useState(false);

  const openPropose = (path: "import" | "recommend" | null = null) => {
    setProposePath(path);
    setProposeOpen(true);
  };

  const chrome = (
    <View style={{ gap: gap.group }}>
      <ScreenTitle
        title="Skin"
        subtitle={day ? formatLongDate(day.dayKey) : undefined}
        accessory={
          <GlassPill>
            <IconButton
              name="camera"
              accessibilityLabel="Add a face photo"
              onPress={() => {
                setTab("photos");
                setAddPhotoOpen(true);
              }}
            />
            {/* Fixed 40pt host with a native SwiftUI label, so the menu button sits inside the pill. */}
            <Host colorScheme={t.scheme} style={{ width: 40, height: 40 }}>
              <Menu
                label={<SwiftImage systemName="ellipsis" size={18} color={t.label} modifiers={[frame({ width: 40, height: 40 })]} />}
              >
                <Button
                  label="My routine"
                  systemImage="list.bullet"
                  onPress={() => setTab("routine")}
                />
                <Button
                  label="Bring your own"
                  systemImage="square.and.pencil"
                  onPress={() => openPropose(null)}
                />
              </Menu>
            </Host>
          </GlassPill>
        }
      />
      <PillTabs value={tab} options={TABS} onChange={setTab} />
    </View>
  );

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{
            paddingHorizontal: gap.screen,
            paddingTop: pad.top,
            paddingBottom: pad.bottom,
            gap: gap.section,
          }}
        >
          {chrome}

          {day === undefined ? (
            <>
              <Skeleton height={22} width={220} />
              <Skeleton height={160} />
              <Skeleton height={160} />
            </>
          ) : tab === "today" ? (
            <>
              {day.hasRoutine ? (
                <TodayBody day={day} products={routine?.products ?? []} />
              ) : (
                <EmptyRoutine
                  onPaste={() => openPropose("import")}
                  onRecommend={() => openPropose("recommend")}
                  onManual={() => setTab("routine")}
                />
              )}
              <AskSection dayKey={dayKey} />
            </>
          ) : tab === "routine" ? (
            <RoutineEditor scroll={false} />
          ) : null}

          <PhotosTab
            dayKey={dayKey}
            visible={tab === "photos"}
            addOpen={addPhotoOpen}
            onOpenAdd={() => setAddPhotoOpen(true)}
            onCloseAdd={() => setAddPhotoOpen(false)}
          />
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

function TodayBody({ day, products }: {
  day: SkinDay;
  products: { name: string; brand?: string | null }[];
}) {
  const t = useTheme();
  const toggleStep = useMutation(api.skin.toggleStep);
  const completeSlot = useMutation(api.skin.completeSlot);
  const setShaved = useMutation(api.skin.setShaved);
  const steps = [...day.am, ...day.pm, ...day.shower];
  const hero = day.shaved ? "Shave day" : "No shave";

  return (
    <View style={{ gap: gap.section }}>
      <View style={{ gap: gap.row }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: space[4] }}>
          <T variant="headline">{hero}</T>
          <T variant="body" color={t.secondaryLabel}> · {rampLabel(day.rampWeek)}</T>
        </View>
        <Host matchContents={{ vertical: true }} colorScheme={t.scheme} seedColor={t.accent} style={{ minHeight: 36 }}>
          <Picker<"shave" | "noshave">
            label="Shave"
            selection={day.shaved ? "shave" : "noshave"}
            onSelectionChange={(next) => {
              tap();
              void setShaved({ dayKey: day.dayKey, shaved: next === "shave" });
            }}
            modifiers={[pickerStyle("segmented"), labelsHidden(), tint(t.accent)]}
          >
            <SwiftText modifiers={[tag("shave")]}>Shave today</SwiftText>
            <SwiftText modifiers={[tag("noshave")]}>No shave</SwiftText>
          </Picker>
        </Host>
        {!day.shaveIsDefault ? (
          <Pressable
            onPress={() => {
              tap();
              void setShaved({ dayKey: day.dayKey, shaved: null });
            }}
            hitSlop={6}
          >
            <T variant="footnote" color={t.accent}>Use usual shave days</T>
          </Pressable>
        ) : null}
      </View>

      <Accountability day={day} products={products} />

      <SlotList
        steps={steps}
        products={products}
        onToggle={(stepId) => void toggleStep({ dayKey: day.dayKey, stepId })}
        onComplete={(stepIds) => void completeSlot({ dayKey: day.dayKey, stepIds })}
      />
    </View>
  );
}

function Accountability({ day, products }: {
  day: SkinDay;
  products: { name: string; brand?: string | null }[];
}) {
  const missed = day.missedYesterday;
  const adherence = day.adherence14;
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
    <View style={{ gap: gap.row }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[12] }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: space[4] }}>
          <Num size={17} weight="semibold">{day.streak}</Num>
          <T variant="footnote">day streak</T>
        </View>
        <View style={{ flex: 1 }}>
          <WeekRings week={day.week} />
        </View>
        <T variant="footnote">
          {adherence === null ? "New" : `${Math.round(adherence * 100)}%`}
        </T>
      </View>
      {missedLine ? (
        <T variant="subhead">{missedLine}</T>
      ) : null}
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
          <View key={d.dayKey} style={{ alignItems: "center", gap: 2 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: full ? t.label : some ? t.accent : "transparent",
                borderWidth: full ? 0 : 1.5,
                borderColor: isToday ? t.accent : t.separator,
              }}
            >
              {full ? (
                <SymbolView name="checkmark" tintColor={t.inverseLabel} weight="bold" size={9} />
              ) : null}
              {some ? (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.accentFg }} />
              ) : null}
            </View>
            <T variant="caption" color={isToday ? t.label : t.secondaryLabel}>{weekdayNarrow(d.dayKey)}</T>
          </View>
        );
      })}
    </View>
  );
}

function EmptyRoutine({ onPaste, onRecommend, onManual }: {
  onPaste: () => void;
  onRecommend: () => void;
  onManual: () => void;
}) {
  return (
    <View style={{ gap: gap.group }}>
      <EmptyState
        symbol="drop.fill"
        title="Start with today"
        message="Paste the routine you already use, or get a calm starter built around your goals."
      />
      <Pill label="Paste my routine" kind="primary" onPress={onPaste} />
      <Pill label="Recommend one for me" kind="outline" onPress={onRecommend} />
      <Pressable onPress={onManual} hitSlop={8} style={{ alignSelf: "center" }}>
        <T variant="footnote">I'll add products myself</T>
      </Pressable>
    </View>
  );
}
