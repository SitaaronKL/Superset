import { Pressable, View } from "react-native";
import { T } from "@/components/ui/kit";
import { tap } from "@/lib/haptics";
import { radius, sf, space, useTheme } from "@/lib/theme";
import { WEEKDAYS } from "./types";

export function WeekdayChips({ selected, onChange }: {
  selected: number[];
  onChange: (next: number[]) => void;
}) {
  const t = useTheme();
  const set = new Set(selected);
  return (
    <View style={{ flexDirection: "row", gap: space[4] }}>
      {WEEKDAYS.map((d) => {
        const on = set.has(d.n);
        return (
          <Pressable
            key={d.n}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={d.label}
            onPress={() => {
              tap();
              const next = on ? selected.filter((n) => n !== d.n) : [...selected, d.n].sort((a, b) => a - b);
              onChange(next);
            }}
            style={{
              flex: 1,
              height: 36,
              borderRadius: radius.full,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: on ? t.label : t.elevated2,
            }}
          >
            <T variant="footnote" color={on ? "#000000" : t.secondaryLabel} style={sf.semibold}>
              {d.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
