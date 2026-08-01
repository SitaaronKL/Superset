import { Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { fonts, useTheme } from "@/lib/theme";

const DAY_MS = 24 * 60 * 60 * 1000;

// The consistency motif shared with the web app: last seven days as circles,
// filled (inverted) when the thing happened, today ringed in accent.
export function WeekDots({ hits, size = 30 }: { hits: boolean[]; size?: number }) {
  const t = useTheme();
  const today = new Date();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      {hits.map((hit, i) => {
        const d = new Date(today.getTime() - (6 - i) * DAY_MS);
        const label = d.toLocaleDateString(undefined, { weekday: "narrow" });
        const isToday = i === 6;
        return (
          <View key={i} style={{ alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: size, height: size, borderRadius: size / 2,
                alignItems: "center", justifyContent: "center",
                backgroundColor: hit ? t.fg : "transparent",
                borderWidth: hit ? 0 : 1, borderColor: t.border,
                ...(isToday ? { shadowColor: "transparent", borderColor: t.accent, borderWidth: 2 } : {}),
              }}
            >
              {hit && <Check size={size * 0.45} strokeWidth={3} color="#000" />}
            </View>
            <Text style={{ color: t.mutedFg, fontSize: 11, fontFamily: fonts.sans }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function weekHits(timestamps: number[]): boolean[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todayStart = start.getTime();
  const hits = new Array(7).fill(false) as boolean[];
  for (const ts of timestamps) {
    const offset = Math.floor((ts - todayStart) / DAY_MS);
    if (offset <= 0 && offset > -7) hits[6 + offset] = true;
  }
  return hits;
}
