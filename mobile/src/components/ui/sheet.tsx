import type { ReactNode } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { BottomSheet, RNHostView } from "@expo/ui";
import { presentationBackground } from "@expo/ui/swift-ui/modifiers";
import { T } from "@/components/ui/kit";
import { space, useTheme } from "@/lib/theme";

// The one bottom sheet every screen uses. Spacing and color live here so no
// sheet can drift:
// - One surface color (the native sheet background). Content is transparent
//   and full width, so no band of a second color shows at the edges or corners.
// - A fixed top offset below the drag handle, so titles never touch or clip.
// - iOS 26 sheets float above the home indicator on their own, so the bottom
//   padding is a small constant, never the safe-area inset (that doubles it).

/** Clearance below the native drag handle before the first line of content. */
const TOP = 28;
/** Side gutters inside the sheet. */
const SIDE = 20;
/** Space under the last row. The native sheet already clears the home indicator. */
const BOTTOM = space[8];

export function Sheet({
  isPresented,
  onDismiss,
  title,
  subtitle,
  scroll = false,
  fraction = 0.92,
  children,
}: {
  isPresented: boolean;
  onDismiss: () => void;
  title?: string;
  subtitle?: string;
  /** Tall content that scrolls inside a fixed-height sheet. Otherwise the sheet fits its content. */
  scroll?: boolean;
  /** Sheet height as a fraction of the screen, for `scroll` sheets. */
  fraction?: number;
  children: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const t = useTheme();
  const bottom = BOTTOM;

  const header = title ? (
    <View style={{ gap: space[4], marginBottom: space[4] }}>
      <T variant="title2">{title}</T>
      {subtitle ? <T variant="subhead" color={t.secondaryLabel}>{subtitle}</T> : null}
    </View>
  ) : null;

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      showDragIndicator
      snapPoints={scroll ? [{ fraction }] : undefined}
      modifiers={[presentationBackground(t.sheet)]}
    >
      <RNHostView matchContents>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            style={{ width, height: Math.round(height * fraction), backgroundColor: "transparent" }}
            contentContainerStyle={{ paddingHorizontal: SIDE, paddingTop: TOP, paddingBottom: bottom, gap: space[16] }}
          >
            {header}
            {children}
          </ScrollView>
        ) : (
          <View style={{ width, paddingHorizontal: SIDE, paddingTop: TOP, paddingBottom: bottom, gap: space[16] }}>
            {header}
            {children}
          </View>
        )}
      </RNHostView>
    </BottomSheet>
  );
}

/** Content width inside a Sheet, for things that need an explicit width (charts, images). */
export function useSheetContentWidth() {
  return useWindowDimensions().width - SIDE * 2;
}
