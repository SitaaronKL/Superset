import { Pressable, View } from "react-native";
import { T } from "@/components/ui/kit";
import { tap } from "@/lib/haptics";
import { sf, space, squircle, useTheme } from "@/lib/theme";

/**
 * Two-line ChatGPT empty-thread card: bold 15 title, gray 15 subtitle, surface, radius 18.
 * With `onPress` it is its own button (Skin); without, it is display-only for a
 * parent that already handles the tap (Coach wraps it in ThreadPrimitive.Suggestion).
 */
export function SuggestionCard({
  title,
  subtitle,
  onPress,
  disabled,
}: {
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  const box = {
    backgroundColor: t.elevated,
    borderRadius: 18,
    ...squircle,
    paddingHorizontal: space[16],
    paddingVertical: space[12],
    gap: 2,
    width: 184,
  } as const;
  const body = (
    <>
      <T variant="subhead" color={t.label} style={sf.semibold} numberOfLines={2}>{title}</T>
      <T variant="subhead" numberOfLines={2}>{subtitle}</T>
    </>
  );
  if (!onPress) return <View style={box}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ ...box, opacity: disabled ? 0.5 : pressed ? 0.78 : 1 })}
    >
      {body}
    </Pressable>
  );
}
