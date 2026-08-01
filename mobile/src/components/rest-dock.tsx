import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import { Eyebrow, Num } from "@/components/ui/kit";
import { fonts, useTheme } from "@/lib/theme";

// The signature in-session moment, native edition: a glass dock floating
// above the tab bar with a draining accent ring, one big countdown, the
// engine's next prescription, and exactly two actions.
export function RestDock({ seconds, startedAt, nextLabel, onSkip }: {
  seconds: number;
  startedAt: number;
  nextLabel?: string | null;
  onSkip: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  const [extra, setExtra] = useState(0);
  const doneFired = useRef(false);

  useEffect(() => {
    doneFired.current = false;
    setExtra(0);
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const total = seconds + extra;
  const remaining = Math.max(0, total - Math.floor((now - startedAt) / 1000));

  useEffect(() => {
    if (remaining === 0 && !doneFired.current) {
      doneFired.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [remaining]);

  const pct = total > 0 ? remaining / total : 0;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const done = remaining === 0;

  const R = 19;
  const C = 2 * Math.PI * R;

  return (
    <View pointerEvents="box-none"
      style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 64 }}>
      <BlurView intensity={40} tint="systemChromeMaterialDark"
        style={{
          borderRadius: 22, overflow: "hidden", flexDirection: "row", alignItems: "center",
          gap: 12, padding: 12, borderWidth: 1, borderColor: t.hairline,
        }}>
        <Svg width={46} height={46} style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={23} cy={23} r={R} fill="none" stroke={t.muted} strokeWidth={4} />
          <Circle cx={23} cy={23} r={R} fill="none" stroke={t.accent} strokeWidth={4}
            strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={C * (1 - pct)} />
        </Svg>

        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={{
            fontFamily: fonts.display, fontSize: 34, color: done ? t.accent : t.fg,
            fontVariant: ["tabular-nums"],
          }}>
            {done ? "GO" : `${mm}:${ss}`}
          </Text>
          <View style={{ flexShrink: 1 }}>
            <Eyebrow>{done ? "Go" : "Next"}</Eyebrow>
            {nextLabel && <Num size={15}>{nextLabel}</Num>}
          </View>
        </View>

        {!done && (
          <Pressable onPress={() => setExtra((e) => e + 15)}
            style={{ height: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" }}>
            <Num size={13}>+15</Num>
          </Pressable>
        )}
        <Pressable onPress={onSkip} accessibilityLabel={done ? "Dismiss" : "Skip rest"}
          style={{ height: 36, width: 36, borderRadius: 999, borderWidth: 1, borderColor: t.border, alignItems: "center", justifyContent: "center" }}>
          <X size={15} color={t.fg} />
        </Pressable>
      </BlurView>
    </View>
  );
}
