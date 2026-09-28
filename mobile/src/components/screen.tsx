import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { MaskedView } from "@expo/ui/community/masked-view";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { palette, space } from "@/lib/theme";

// Every tab screen scrolls edge to edge: under the clock and battery at the top
// and under the floating tab bar at the bottom. Instead of solid black bars,
// each edge gets a blur that fades out toward the content.

const TAB_BAR = 84;

/** Content padding so the first and last rows start clear of the edges. */
export function useScreenInsets(extraTop = 0, opts?: { tabBar?: boolean }) {
  const insets = useSafeAreaInsets();
  const tab = opts?.tabBar === false ? 0 : TAB_BAR;
  return { top: insets.top + space[12] + extraTop, bottom: insets.bottom + tab + space[24] };
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
      {bottom && <EdgeFade edge="bottom" height={insets.bottom + TAB_BAR + space[16]} />}
    </>
  );
}

/** Blur masked by a gradient: fully blurred at the screen edge, clear toward the content. */
export function EdgeFade({ edge, height }: { edge: "top" | "bottom"; height: number }) {
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
        <BlurView tint="systemChromeMaterialDark" intensity={60} style={StyleSheet.absoluteFill} />
      </MaskedView>
      {gradient(`wash-${edge}`, palette.bg, 0.92)}
    </View>
  );
}
