import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { MaskedView } from "@expo/ui/community/masked-view";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { palette } from "@/lib/theme";

// Every tab screen scrolls edge to edge: under the clock and battery at the top
// and under the floating tab bar at the bottom. Instead of solid black bars,
// each edge gets a blur that fades out toward the content.

// Space the floating native tab bar takes above the home indicator.
const TAB_BAR = 84;

/** Content padding so the first and last rows start clear of the edges. */
export function useScreenInsets(extraTop = 0) {
  const insets = useSafeAreaInsets();
  return { top: insets.top + 12 + extraTop, bottom: insets.bottom + TAB_BAR + 24 };
}

/** Page root: the page color, edge to edge. Put <ScreenFades /> right after the scroll content. */
export function Screen({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: palette.bg }}>{children}</View>;
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
      {bottom && <EdgeFade edge="bottom" height={insets.bottom + TAB_BAR + 16} />}
    </>
  );
}

/** Blur masked by a gradient: fully blurred at the screen edge, clear toward the content. */
export function EdgeFade({ edge, height }: { edge: "top" | "bottom"; height: number }) {
  const id = `fade-${edge}`;
  const solidAtEdge = edge === "top" ? { from: 1, to: 0 } : { from: 0, to: 1 };
  const gradient = (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity={solidAtEdge.from} />
          <Stop offset="0.55" stopColor="#000" stopOpacity={edge === "top" ? 0.7 : 0.3} />
          <Stop offset="1" stopColor="#000" stopOpacity={solidAtEdge.to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, height, [edge]: 0 }}>
      <MaskedView style={StyleSheet.absoluteFill} maskElement={gradient}>
        <BlurView tint="systemChromeMaterialDark" intensity={40} style={StyleSheet.absoluteFill} />
        {/* A wash of the page color so text under the blur stays quiet. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.bg, opacity: 0.55 }]} />
      </MaskedView>
    </View>
  );
}
