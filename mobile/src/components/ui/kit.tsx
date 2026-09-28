import { Children, Fragment, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SymbolView, type SFSymbol } from "expo-symbols";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import {
  sf,
  gap,
  motion,
  radius,
  space,
  squircle,
  type,
  type TypeVariant,
  useTheme,
} from "@/lib/theme";
import { success as hapticSuccess, tap } from "@/lib/haptics";

export { gap, motion, radius, space, squircle, type };

const glassOk = () => isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

function hairlineStyle(color: string, inset: number): ViewStyle {
  return {
    height: StyleSheet.hairlineWidth,
    backgroundColor: color,
    marginLeft: inset,
  };
}

// ---------------------------------------------------------------------------
// Existing primitives (same props, restyled to tokens)
// ---------------------------------------------------------------------------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.elevated,
          borderRadius: radius.card,
          ...squircle,
          padding: space[16],
          gap: space[12],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Section label above a group: 15 regular, secondary, sentence case (ChatGPT style). */
export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return (
    <Text style={[{ color: t.secondaryLabel, ...type.subhead }, style]}>
      {children}
    </Text>
  );
}

export function Display({ children, size = type.title.fontSize, color, style, numberOfLines }: {
  children: ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          color: color ?? t.label,
          ...sf.bold,
          fontSize: size,
          lineHeight: Math.round(size * 1.2),
          letterSpacing: size >= 28 ? type.title.letterSpacing : -0.2,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Num({ children, size = 16, weight = "regular", color, style }: {
  children: ReactNode; size?: number; weight?: "regular" | "semibold"; color?: string; style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text
      selectable
      style={[
        {
          color: color ?? t.label,
          fontSize: size,
          lineHeight: Math.round(size * 1.25),
          ...(weight === "semibold" ? sf.tabularSemibold : sf.tabular),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Body({ children, size = type.body.fontSize, color, style, numberOfLines }: {
  children: ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          color: color ?? t.label,
          fontSize: size,
          ...sf.regular,
          lineHeight: Math.round(size * (type.body.lineHeight / type.body.fontSize)),
          letterSpacing: type.body.letterSpacing,
        },
        style,
      ]}
    >
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
  const bg = kind === "primary" ? t.label : kind === "accent" ? t.accent : "transparent";
  const fg = kind === "primary" ? t.inverseLabel : kind === "accent" ? t.accentFg : t.label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={4}
      pressRetentionOffset={16}
      onPress={() => {
        if (haptic) tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.control,
          ...squircle,
          height: 44,
          paddingHorizontal: space[16] + 2,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: kind === "outline" ? StyleSheet.hairlineWidth : 0,
          borderColor: t.separator,
          opacity: disabled ? 0.4 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <Text style={{ color: fg, ...sf.semibold, fontSize: type.subhead.fontSize, letterSpacing: type.subhead.letterSpacing }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field(props: React.ComponentProps<typeof TextInput> & { mono?: boolean }) {
  const t = useTheme();
  const { mono, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={t.tertiaryLabel}
      {...rest}
      style={[
        {
          height: 44,
          borderRadius: radius.control,
          ...squircle,
          backgroundColor: t.elevated2,
          paddingHorizontal: space[16],
          color: t.label,
          fontSize: type.subhead.fontSize,
          letterSpacing: type.subhead.letterSpacing,
          ...(mono ? sf.tabular : sf.regular),
        },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Text variants
// ---------------------------------------------------------------------------

const TONE: Record<TypeVariant, "label" | "secondaryLabel" | "tertiaryLabel"> = {
  title: "label",
  title2: "label",
  headline: "label",
  body: "label",
  callout: "label",
  subhead: "secondaryLabel",
  footnote: "secondaryLabel",
  caption: "secondaryLabel",
};

export function T({
  variant = "body",
  color,
  style,
  numberOfLines,
  selectable,
  children,
}: {
  variant?: TypeVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
  children: ReactNode;
}) {
  const t = useTheme();
  const step = type[variant];
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[{ color: color ?? t[TONE[variant]], ...step }, style]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Screen title
// ---------------------------------------------------------------------------

export function ScreenTitle({
  title,
  subtitle,
  accessory,
  style,
}: {
  title: string;
  subtitle?: string;
  accessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[12] }, style]}>
      <View style={{ flex: 1, gap: space[4] }}>
        <Display size={type.title.fontSize}>{title}</Display>
        {subtitle ? <T variant="subhead">{subtitle}</T> : null}
      </View>
      {accessory}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Icon button (SF Symbol, circular glass or plain)
// ---------------------------------------------------------------------------

export function IconButton({
  name,
  onPress,
  variant = "plain",
  size = 20,
  color,
  accessibilityLabel,
  disabled,
  style,
}: {
  name: SFSymbol;
  onPress?: () => void;
  variant?: "glass" | "plain";
  size?: number;
  color?: string;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const dim = 40;
  const tint = color ?? t.label;
  const useGlass = variant === "glass" && glassOk();
  const inner = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      pressRetentionOffset={16}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: useGlass ? "transparent" : variant === "glass" ? t.elevated2 : "transparent",
          opacity: disabled ? 0.4 : pressed ? 0.72 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <SymbolView name={name} size={size} tintColor={tint} weight="regular" resizeMode="scaleAspectFit" />
    </Pressable>
  );
  if (!useGlass) return inner;
  return (
    <GlassView
      isInteractive
      colorScheme={t.scheme}
      style={{ width: dim, height: dim, borderRadius: dim / 2 }}
    >
      {inner}
    </GlassView>
  );
}

// ---------------------------------------------------------------------------
// Glass pill (top-right action group) and floating action (ChatGPT's "Chat")
// ---------------------------------------------------------------------------

/** Groups 1 to 3 plain IconButtons in one glass capsule, like ChatGPT's top-right controls. */
export function GlassPill({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const row = <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: space[4], height: 44 }}>{children}</View>;
  if (!glassOk()) {
    return <View style={[{ borderRadius: 22, backgroundColor: t.elevated }, style]}>{row}</View>;
  }
  return (
    <GlassView isInteractive colorScheme={t.scheme} style={[{ borderRadius: 22 }, style]}>
      {row}
    </GlassView>
  );
}

/** The primary create action: a dark floating pill, bottom right, icon + label. */
export function FloatingAction({ icon, label, onPress, bottom, accessibilityLabel }: {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
  /** Distance from the bottom of the screen (clear the tab bar). */
  bottom: number;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({
        position: "absolute", right: space[16], bottom,
        flexDirection: "row", alignItems: "center", gap: space[8],
        height: 48, paddingHorizontal: space[20], borderRadius: 24,
        backgroundColor: t.elevated2,
        boxShadow: t.isDark ? "0 8px 24px rgba(0,0,0,0.45)" : "0 6px 20px rgba(0,0,0,0.14)",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <SymbolView name={icon} size={18} tintColor={t.label} weight="medium" />
      <Text style={{ color: t.label, ...type.headline }}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Inset-grouped section + row
// ---------------------------------------------------------------------------

export function Section({
  header,
  footer,
  children,
  style,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ gap: space[8] }, style]}>
      {header != null && header !== false ? (
        typeof header === "string" ? (
          <T variant="footnote" style={{ paddingHorizontal: space[16] }}>{header}</T>
        ) : (
          header
        )
      ) : null}
      <View style={{ backgroundColor: t.elevated, borderRadius: radius.card, ...squircle, overflow: "hidden" }}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={hairlineStyle(t.separator, space[16])} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
      {footer != null && footer !== false ? (
        typeof footer === "string" ? (
          <T variant="footnote" style={{ paddingHorizontal: space[16] }}>{footer}</T>
        ) : (
          footer
        )
      ) : null}
    </View>
  );
}

export function Row({
  title,
  subtitle,
  leading,
  value,
  accessory,
  onPress,
  destructive,
  style,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  value?: string;
  accessory?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  // iOS Settings style: a tappable row always shows its chevron, after the value if there is one.
  const chevron = onPress ? (
    <SymbolView name="chevron.right" size={14} tintColor={t.tertiaryLabel} weight="semibold" />
  ) : null;
  const trailing = accessory ?? (
    value != null ? (
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[8], flexShrink: 1 }}>
        <T variant="body" color={t.secondaryLabel} numberOfLines={1}>{value}</T>
        {chevron}
      </View>
    ) : chevron
  );
  const body = (
    <View
      style={[
        {
          minHeight: 44,
          paddingVertical: space[12],
          paddingHorizontal: space[16],
          flexDirection: "row",
          alignItems: "center",
          gap: space[12],
        },
        style,
      ]}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="body" color={destructive ? t.destructive : t.label} numberOfLines={2}>{title}</T>
        {subtitle ? <T variant="footnote" numberOfLines={2}>{subtitle}</T> : null}
      </View>
      {trailing}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ backgroundColor: pressed ? t.elevated2 : "transparent" })}
    >
      {body}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Stat
// ---------------------------------------------------------------------------

export function Stat({
  label,
  value,
  delta,
  format = String,
  style,
}: {
  label: string;
  value: number | string | undefined;
  delta?: number;
  format?: (n: number) => string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const d = delta ?? 0;
  const shown = typeof value === "number" ? format(value) : value ?? "·";
  const chip = typeof delta === "number"
    ? `${d > 0 ? "▲" : d < 0 ? "▼" : "·"} ${format(Math.abs(d))}`
    : null;
  return (
    <View style={[{ gap: space[4], alignItems: "flex-start" }, style]}>
      <Eyebrow>{label}</Eyebrow>
      <Num size={28} weight="semibold">{shown}</Num>
      {chip ? (
        <View
          style={{
            backgroundColor: t.muted,
            borderRadius: radius.full,
            paddingHorizontal: space[8],
            paddingVertical: 2,
          }}
        >
          <Num size={11} color={t.secondaryLabel}>{chip}</Num>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function Skeleton({
  width,
  height = 16,
  circle,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const r = circle ? height / 2 : radius.sm;
  return (
    <Animated.View
      style={[
        {
          width: width ?? "100%",
          height,
          borderRadius: r,
          ...squircle,
          backgroundColor: t.elevated2,
          opacity: 0.55,
          ...(reduced
            ? {}
            : {
                animationName: {
                  from: { opacity: 0.38 },
                  to: { opacity: 0.72 },
                },
                animationDuration: 900,
                animationIterationCount: "infinite" as const,
                animationDirection: "alternate" as const,
                animationTimingFunction: "ease-in-out" as const,
              }),
        },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export function EmptyState({
  symbol,
  title,
  message,
  action,
  style,
}: {
  symbol?: SFSymbol;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View style={[{ alignItems: "center", gap: space[12], paddingVertical: space[40], paddingHorizontal: space[24] }, style]}>
      {symbol ? (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: t.elevated,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SymbolView name={symbol} size={24} tintColor={t.secondaryLabel} />
        </View>
      ) : null}
      <T variant="headline" style={{ textAlign: "center" }}>{title}</T>
      {message ? <T variant="subhead" style={{ textAlign: "center" }}>{message}</T> : null}
      {action ? <Pill label={action.label} kind="accent" onPress={action.onPress} style={{ marginTop: space[8], alignSelf: "center" }} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Check circle (scale spring + success haptic)
// ---------------------------------------------------------------------------

export function CheckCircle({
  checked,
  onToggle,
  size = 28,
  color,
}: {
  checked: boolean;
  onToggle?: () => void;
  size?: number;
  color?: string;
}) {
  const t = useTheme();
  const fill = color ?? t.accent;
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const toggle = () => {
    if (!onToggle) return;
    if (!checked && !reduced) {
      scale.set(
        withSequence(
          withTiming(0.86, { duration: motion.duration.press }),
          withSpring(1, motion.spring.snappy),
        ),
      );
      hapticSuccess();
    } else {
      tap();
    }
    onToggle();
  };

  const inner = (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, anim]}>
      <SymbolView
        name={checked ? "checkmark.circle.fill" : "circle"}
        size={size}
        tintColor={checked ? fill : t.tertiaryLabel}
        weight="medium"
      />
    </Animated.View>
  );

  if (!onToggle) return inner;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={12}
      pressRetentionOffset={16}
      onPress={toggle}
      style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
    >
      {inner}
    </Pressable>
  );
}
