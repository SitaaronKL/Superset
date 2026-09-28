import { Pressable, View } from "react-native";
import { T } from "@/components/ui/kit";
import { tap } from "@/lib/haptics";
import { radius, space, squircle, useTheme } from "@/lib/theme";

export function PillTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[4] }}>
      {options.map((opt) => {
        const on = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return;
              tap();
              onChange(opt.id);
            }}
            style={{
              paddingHorizontal: space[12],
              paddingVertical: space[8],
              borderRadius: radius.full,
              ...squircle,
              backgroundColor: on ? t.elevated2 : "transparent",
            }}
          >
            <T variant="subhead" color={on ? t.label : t.secondaryLabel}>
              {opt.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
