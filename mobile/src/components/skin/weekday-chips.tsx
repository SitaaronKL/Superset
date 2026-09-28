import { Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Body } from "@/components/ui/kit";
import { fonts, useTheme } from "@/lib/theme";
import { WEEKDAYS } from "./types";

export function WeekdayChips({ selected, onChange }: {
  selected: number[];
  onChange: (next: number[]) => void;
}) {
  const t = useTheme();
  const set = new Set(selected);
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {WEEKDAYS.map((d) => {
        const on = set.has(d.n);
        return (
          <Pressable
            key={d.n}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={d.label}
            onPress={() => {
              void Haptics.selectionAsync();
              const next = on ? selected.filter((n) => n !== d.n) : [...selected, d.n].sort((a, b) => a - b);
              onChange(next);
            }}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: on ? t.fg : t.muted,
            }}
          >
            <Body size={13} color={on ? "#000" : t.mutedFg} style={{ fontFamily: fonts.sansSemiBold }}>
              {d.label}
            </Body>
          </Pressable>
        );
      })}
    </View>
  );
}
