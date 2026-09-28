import { Pressable, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { T } from "@/components/ui/kit";
import { tap } from "@/lib/haptics";
import { space, useTheme } from "@/lib/theme";

/** Plain sheet row: SF Symbol + title + gray subtitle, no card, no hairline. */
export function TrainDayRow({
  title,
  subtitle,
  symbol,
  onPress,
}: {
  title: string;
  subtitle: string;
  symbol: SFSymbol;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        gap: space[12],
        paddingVertical: space[12],
        backgroundColor: pressed ? t.elevated2 : "transparent",
      })}
    >
      <SymbolView name={symbol} size={22} tintColor={t.label} weight="regular" />
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="body">{title}</T>
        <T variant="subhead">{subtitle}</T>
      </View>
    </Pressable>
  );
}

export function symbolForDay(name: string): SFSymbol {
  const n = name.toLowerCase();
  if (/leg|lower|squat|quad|glute/.test(n)) return "figure.strengthtraining.functional";
  if (/shoulder/.test(n)) return "figure.boxing";
  if (/chest|arm|push|bench/.test(n)) return "figure.strengthtraining.traditional";
  if (/back|pull|row|lat/.test(n)) return "figure.climbing";
  if (/core/.test(n)) return "figure.core.training";
  return "figure.strengthtraining.traditional";
}
