import { Pressable } from "react-native";
import { T } from "@/components/ui/kit";
import { tap } from "@/lib/haptics";
import { sf, space, squircle, useTheme } from "@/lib/theme";

/** Two-line ChatGPT empty-thread card: bold 15 title, gray 15 subtitle, surface, radius 18. */
export function SuggestionCard({
  title,
  subtitle,
  onPress,
  disabled,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({
        backgroundColor: t.elevated,
        borderRadius: 18,
        ...squircle,
        paddingHorizontal: space[16],
        paddingVertical: space[12],
        gap: 2,
        minWidth: 168,
        maxWidth: 220,
        opacity: disabled ? 0.5 : pressed ? 0.78 : 1,
      })}
    >
      <T variant="subhead" color={t.label} style={sf.bold} numberOfLines={2}>{title}</T>
      <T variant="subhead" numberOfLines={2}>{subtitle}</T>
    </Pressable>
  );
}
