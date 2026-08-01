import { Pressable, Text, TextInput, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { fonts, useTheme } from "@/lib/theme";

// The Superset kit: dense cards, eyebrow caption labels, Anton display,
// Plex Mono numerals, pill controls. One system across every screen.

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        { backgroundColor: t.card, borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, borderColor: t.hairline },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return (
    <Text style={[{ color: t.mutedFg, fontFamily: fonts.sansSemiBold, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase" }, style]}>
      {children}
    </Text>
  );
}

export function Display({ children, size = 28, color, style, numberOfLines }: {
  children: React.ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text numberOfLines={numberOfLines}
      style={[{ color: color ?? t.fg, fontFamily: fonts.display, fontSize: size, textTransform: "uppercase", letterSpacing: 0.5 }, style]}>
      {children}
    </Text>
  );
}

export function Num({ children, size = 16, weight = "regular", color, style }: {
  children: React.ReactNode; size?: number; weight?: "regular" | "semibold"; color?: string; style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text style={[{
      color: color ?? t.fg, fontSize: size, fontVariant: ["tabular-nums"],
      fontFamily: weight === "semibold" ? fonts.monoSemiBold : fonts.mono,
    }, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, size = 14, color, style, numberOfLines }: {
  children: React.ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text numberOfLines={numberOfLines}
      style={[{ color: color ?? t.fg, fontSize: size, fontFamily: fonts.sans, lineHeight: size * 1.5 }, style]}>
      {children}
    </Text>
  );
}

export function Pill({ label, onPress, kind = "primary", disabled, style, haptic = true }: {
  label: string;
  onPress?: () => void;
  kind?: "primary" | "outline" | "accent";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
}) {
  const t = useTheme();
  const bg = kind === "primary" ? t.fg : kind === "accent" ? t.accent : "transparent";
  const fg = kind === "primary" ? "#000" : kind === "accent" ? t.accentFg : t.fg;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: bg, borderRadius: 999, height: 44, paddingHorizontal: 18,
          alignItems: "center", justifyContent: "center",
          borderWidth: kind === "outline" ? 1 : 0, borderColor: t.border,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontFamily: fonts.sansSemiBold, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: React.ComponentProps<typeof TextInput> & { mono?: boolean }) {
  const t = useTheme();
  const { mono, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={t.mutedFg}
      {...rest}
      style={[
        {
          height: 44, borderRadius: 999, borderWidth: 1, borderColor: t.border,
          paddingHorizontal: 16, color: t.fg, fontSize: 15,
          fontFamily: mono ? fonts.mono : fonts.sans,
        },
        style,
      ]}
    />
  );
}
