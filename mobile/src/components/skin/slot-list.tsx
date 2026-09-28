import { Pressable, View } from "react-native";
import { T } from "@/components/ui/kit";
import { success, tap } from "@/lib/haptics";
import { radius, space, squircle, sf, useTheme } from "@/lib/theme";
import { CheckCircle } from "./check-circle";
import { productParts, SLOTS, type PlannedRow } from "./types";

export function SlotList({ steps, products, onToggle, onComplete }: {
  steps: PlannedRow[];
  products: { name: string; brand?: string | null }[];
  onToggle: (stepId: string) => void;
  onComplete: (ids: string[]) => void;
}) {
  return (
    <View style={{ gap: space[16] }}>
      {SLOTS.map((slot) => {
        const rows = steps.filter((s) => s.slot === slot.id);
        if (rows.length === 0) return null;
        return (
          <SlotCard
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

function SlotCard({ title, rows, products, onToggle, onComplete }: {
  title: string;
  rows: PlannedRow[];
  products: { name: string; brand?: string | null }[];
  onToggle: (stepId: string) => void;
  onComplete: (ids: string[]) => void;
}) {
  const t = useTheme();
  const doneCount = rows.filter((r) => r.done).length;
  const allDone = doneCount === rows.length && rows.length > 0;
  const pct = rows.length === 0 ? 0 : doneCount / rows.length;

  return (
    <View
      style={{
        backgroundColor: t.elevated,
        borderRadius: radius.card,
        ...squircle,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space[8],
          paddingHorizontal: space[16],
          paddingTop: space[16],
          paddingBottom: space[8],
        }}
      >
        <T variant="headline" style={{ flex: 1 }}>{title}</T>
        {!allDone ? (
          <Pressable
            onPress={() => {
              success();
              onComplete(rows.map((r) => r.id));
            }}
            hitSlop={8}
          >
            <T variant="footnote" color={t.accent} style={sf.semibold}>Done all</T>
          </Pressable>
        ) : null}
        <T variant="subhead">{doneCount} of {rows.length}</T>
      </View>

      {rows.map((row) => (
        <StepRow
          key={row.id}
          row={row}
          products={products}
          onToggle={() => onToggle(row.id)}
        />
      ))}

      <View style={{ paddingHorizontal: space[16], paddingTop: space[8], paddingBottom: space[16] }}>
        <View
          style={{
            height: 3,
            borderRadius: 2,
            backgroundColor: t.elevated2,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.round(pct * 100)}%`,
              height: 3,
              backgroundColor: t.label,
            }}
          />
        </View>
      </View>
    </View>
  );
}

function StepRow({ row, products, onToggle }: {
  row: PlannedRow;
  products: { name: string; brand?: string | null }[];
  onToggle: () => void;
}) {
  const t = useTheme();
  const { name, brand } = productParts(row.productName, products);
  const detail = [brand, row.howTo].filter(Boolean).join(" · ");
  return (
    <Pressable
      onPress={() => {
        if (!row.done) success();
        else tap();
        onToggle();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: row.done }}
      accessibilityLabel={`Mark ${name} ${row.done ? "not done" : "done"}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "flex-start",
        gap: space[12],
        paddingHorizontal: space[16],
        paddingVertical: space[12],
        backgroundColor: pressed ? t.elevated2 : "transparent",
      })}
    >
      <CheckCircle
        checked={row.done}
        onToggle={onToggle}
        interactive={false}
        label={`Mark ${name} ${row.done ? "not done" : "done"}`}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="body" color={row.done ? t.secondaryLabel : t.label}>{name}</T>
        {detail ? <T variant="subhead">{detail}</T> : null}
        {row.note ? (
          <T variant="subhead" color={t.accent}>{row.note}</T>
        ) : null}
      </View>
    </Pressable>
  );
}
