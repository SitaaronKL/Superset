import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { MaskedView } from "@expo/ui/community/masked-view";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useTheme, space } from "@/lib/theme";

// Every tab screen scrolls edge to edge: under the clock and battery at the top
// and under the floating tab bar at the bottom. Instead of solid black bars,
// each edge gets a blur that fades out toward the content.

/**
 * Distance from the bottom of the screen to the top of the floating tab bar,
 * home-indicator area included (measured on iPhone 17 Pro Max, icons only).
 * Never add the safe-area bottom inset on top of this; that double counts.
 */
export const TAB_BAR_TOP = 84;

/** Content padding so the first and last rows start clear of the edges. */
export function useScreenInsets(extraTop = 0, opts?: { tabBar?: boolean }) {
  const insets = useSafeAreaInsets();
  const bottom = opts?.tabBar === false ? insets.bottom + space[24] : TAB_BAR_TOP + space[24];
  return { top: insets.top + space[12] + extraTop, bottom };
}

/** Page root: the page color, edge to edge. Put <ScreenFades /> right after the scroll content. */
export function Screen({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <View style={{ flex: 1, backgroundColor: t.bg }}>{children}</View>;
}

/** Blurred, fading top and bottom edges. Render after the scroll content, before floating buttons. */
export function ScreenFades({ topFade = 28, bottom = true }: {
  /** How far past the status bar the top fade reaches (grow it under a fixed header). */
  topFade?: number;
  bottom?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <EdgeFade edge="top" height={insets.top + topFade} />
      {bottom && <EdgeFade edge="bottom" height={TAB_BAR_TOP + space[16]} />}
    </>
  );
}

/** Blur masked by a gradient: fully blurred at the screen edge, clear toward the content. */
export function EdgeFade({ edge, height }: { edge: "top" | "bottom"; height: number }) {
  const t = useTheme();
  const stops = edge === "top"
    ? [[0, 1], [0.45, 0.9], [1, 0]]
    : [[0, 0], [0.4, 0.75], [1, 1]];
  const gradient = (id: string, color: string, scale: number) => (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map(([offset, opacity]) => (
            <Stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity * scale} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, height, [edge]: 0 }}>
      <MaskedView style={StyleSheet.absoluteFill} maskElement={gradient(`mask-${edge}`, "#000", 1)}>
        <BlurView tint={t.isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} intensity={60} style={StyleSheet.absoluteFill} />
      </MaskedView>
      {gradient(`wash-${edge}`, t.bg, 0.92)}
    </View>
  );
}
