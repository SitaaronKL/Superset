import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { LinearTransition, useReducedMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { Body, Eyebrow, Num } from "@/components/ui/kit";
import { fonts, useTheme } from "@/lib/theme";
import { CheckCircle } from "./check-circle";
import { Group, Hairline } from "./group";
import { productParts, SLOTS, type PlannedRow } from "./types";

export function SlotList({ steps, products, onToggle, onComplete }: {
  steps: PlannedRow[];
  products: { name: string; brand?: string | null }[];
  onToggle: (stepId: string) => void;
  onComplete: (ids: string[]) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      {SLOTS.map((slot) => {
        const rows = steps.filter((s) => s.slot === slot.id);
        if (rows.length === 0) return null;
        return (
          <SlotSection
            key={slot.id}
            title={slot.label}
            rows={rows}
            products={products}
            onToggle={onToggle}
            onComplete={onComplete}
          />
        );
      })}
    </View>
  );
}

function SlotSection({ title, rows, products, onToggle, onComplete }: {
  title: string;
  rows: PlannedRow[];
  products: { name: string; brand?: string | null }[];
  onToggle: (stepId: string) => void;
  onComplete: (ids: string[]) => void;
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const [opened, setOpened] = useState(false);
  const doneCount = rows.filter((r) => r.done).length;
  const allDone = doneCount === rows.length && rows.length > 0;
  const collapsed = allDone && !opened;

  return (
    <Animated.View layout={reduced ? undefined : LinearTransition.duration(220)} style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", paddingHorizontal: 4 }}>
        <Eyebrow style={{ flex: 1 }}>{title}</Eyebrow>
        <Num size={12} color={t.mutedFg}>{doneCount} of {rows.length}</Num>
        {!allDone && (
          <Pressable
            onPress={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onComplete(rows.map((r) => r.id));
            }}
            hitSlop={8}
            style={{ marginLeft: 12 }}
          >
            <Body size={13} color={t.accent} style={{ fontFamily: fonts.sansSemiBold }}>Done all</Body>
          </Pressable>
        )}
      </View>

      <Group>
        {collapsed ? (
          <Pressable
            onPress={() => setOpened(true)}
            accessibilityLabel={`${title} complete. Tap to expand.`}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 16,
              backgroundColor: pressed ? t.muted : "transparent",
            })}
          >
            <View
              style={{
                width: 26, height: 26, borderRadius: 13, backgroundColor: t.accent,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <SymbolView name="checkmark" tintColor={t.accentFg} weight="bold" style={{ width: 12, height: 12 }} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Body size={17} style={{ fontFamily: fonts.sansSemiBold }}>{title} done</Body>
              <Body size={13} color={t.mutedFg}>{rows.length} {rows.length === 1 ? "step" : "steps"}</Body>
            </View>
          </Pressable>
        ) : (
          rows.map((row, i) => (
            <View key={row.id}>
              {i > 0 && <Hairline inset={52} />}
              <StepRow row={row} index={i + 1} products={products} onToggle={() => onToggle(row.id)} />
            </View>
          ))
        )}
      </Group>
      {allDone && opened && (
        <Pressable onPress={() => setOpened(false)} style={{ alignSelf: "center", paddingVertical: 4 }}>
          <Body size={13} color={t.mutedFg}>Collapse</Body>
        </Pressable>
      )}
    </Animated.View>
  );
}

function StepRow({ row, index, products, onToggle }: {
  row: PlannedRow;
  index: number;
  products: { name: string; brand?: string | null }[];
  onToggle: () => void;
}) {
  const t = useTheme();
  const { name, brand } = productParts(row.productName, products);
  return (
    <Pressable
      onPress={() => {
        if (!row.done) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: row.done }}
      accessibilityLabel={`Mark ${name} ${row.done ? "not done" : "done"}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        opacity: row.done ? 0.45 : 1,
        backgroundColor: pressed ? t.muted : "transparent",
      })}
    >
      <Num size={13} color={t.mutedFg} style={{ width: 18, marginTop: 6, textAlign: "right" }}>{index}</Num>
      <View style={{ flex: 1, gap: 2, paddingTop: 2 }}>
        <Body size={17} style={{ fontFamily: fonts.sansMedium }}>{name}</Body>
        {brand ? <Body size={13} color={t.mutedFg}>{brand}</Body> : null}
        {row.howTo ? <Body size={15} color={t.mutedFg}>{row.howTo}</Body> : null}
        {row.note ? (
          <Body size={15} color={t.accent} style={{ fontFamily: fonts.sansMedium }}>{row.note}</Body>
        ) : null}
      </View>
      <CheckCircle
        checked={row.done}
        onToggle={onToggle}
        interactive={false}
        label={`Mark ${name} ${row.done ? "not done" : "done"}`}
      />
    </Pressable>
  );
}
