import { createContext, useContext } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Superset visual identity, translated to native. Dark-only. Values mirror
// the web app's oklch tokens as hex; the accent comes from shared Convex
// settings (stored as oklch strings) and is mapped here.

// SF Pro (the iOS system font) everywhere, like ChatGPT. Weight carries
// hierarchy; numbers use tabular figures instead of a monospace font.
// See docs/design/chatgpt/SPEC.md.
export const sf = {
  regular: { fontWeight: "400" as const },
  medium: { fontWeight: "500" as const },
  semibold: { fontWeight: "600" as const },
  bold: { fontWeight: "700" as const },
  tabular: { fontVariant: ["tabular-nums" as const] },
  tabularSemibold: { fontWeight: "600" as const, fontVariant: ["tabular-nums" as const] },
};

// Surfaces step clearly in luminance so cards read without borders.
// Keep legacy keys (card, fg, mutedFg, hairline, border, muted) so existing
// screens keep compiling while new code uses the semantic names.
export const palette = {
  bg: "#000000",
  groupedBg: "#0c0c0e",
  // Bottom sheets: one step above the page so a sheet reads as lifted, below cards so cards inside still read.
  sheet: "#1c1c1e",
  elevated: "#1c1c1e",
  elevated2: "#2c2c2e",
  separator: "rgba(235,235,245,0.12)",
  label: "#ffffff",
  secondaryLabel: "rgba(235,235,245,0.60)",
  tertiaryLabel: "rgba(235,235,245,0.32)",
  success: "#4cd97b",
  destructive: "#ff453a",
  // Legacy aliases used by existing screens.
  card: "#1c1c1e",
  muted: "#161618",
  mutedFg: "rgba(235,235,245,0.60)",
  fg: "#ffffff",
  border: "rgba(255,255,255,0.14)",
  hairline: "rgba(235,235,245,0.12)",
};

export const space = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  56: 56,
} as const;

// row < group < section. Use these, not a flat 16 everywhere.
export const gap = {
  row: space[8],
  group: space[16],
  section: space[32],
  screen: space[16],
} as const;

export const radius = {
  sm: 10,
  control: 14,
  card: 22,
  sheet: 28,
  full: 9999,
} as const;

export const squircle = { borderCurve: "continuous" as const };

export const elevation = {
  rest: "0 1px 2px rgba(0, 0, 0, 0.22)",
  raised: "0 4px 12px rgba(0, 0, 0, 0.32)",
  overlay: "0 10px 28px rgba(0, 0, 0, 0.48)",
} as const;

export const motion = {
  duration: {
    press: 120,
    fast: 150,
    base: 250,
    slow: 400,
  },
  spring: {
    snappy: { duration: 280, dampingRatio: 0.86 },
    gentle: { duration: 400, dampingRatio: 1 },
  },
} as const;

export const type = {
  // Apple's SF text styles (size, leading, tracking).
  title: { ...sf.bold, fontSize: 28, lineHeight: 34, letterSpacing: 0.36 },
  title2: { ...sf.semibold, fontSize: 22, lineHeight: 28, letterSpacing: 0.35 },
  headline: { ...sf.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.43 },
  body: { ...sf.regular, fontSize: 17, lineHeight: 22, letterSpacing: -0.43 },
  callout: { ...sf.regular, fontSize: 16, lineHeight: 21, letterSpacing: -0.31 },
  subhead: { ...sf.regular, fontSize: 15, lineHeight: 20, letterSpacing: -0.23 },
  footnote: { ...sf.regular, fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
  caption: { ...sf.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
} as const;

export type TypeVariant = keyof typeof type;

const ACCENT_MAP: Record<string, { hex: string; fg: string }> = {
  "oklch(0.55 0.22 25)": { hex: "#cf2e2e", fg: "#ffffff" }, // Signal Red
  "oklch(0.85 0.25 130)": { hex: "#a9e814", fg: "#000000" }, // Volt
  "oklch(0.55 0.2 260)": { hex: "#3b63d8", fg: "#ffffff" }, // Cobalt
  "oklch(0.7 0.19 50)": { hex: "#ef7d1a", fg: "#ffffff" }, // Tangerine
  "oklch(0.65 0.26 350)": { hex: "#ed3d8f", fg: "#ffffff" }, // Hot Pink
  "oklch(0.75 0.15 210)": { hex: "#3cc0e8", fg: "#000000" }, // Cyan
};
const DEFAULT_ACCENT = ACCENT_MAP["oklch(0.55 0.22 25)"];

export function accentFromSetting(setting?: string | null) {
  if (setting && ACCENT_MAP[setting]) return ACCENT_MAP[setting];
  const m = setting?.match(/oklch\(\s*([\d.]+)/);
  const l = m ? Number(m[1]) : 0.55;
  return { hex: DEFAULT_ACCENT.hex, fg: l > 0.7 ? "#000000" : "#ffffff" };
}

type Theme = {
  accent: string;
  accentFg: string;
  accentTint: string;
} & typeof palette;

const ThemeContext = createContext<Theme>({
  ...palette,
  accent: DEFAULT_ACCENT.hex,
  accentFg: DEFAULT_ACCENT.fg,
  accentTint: DEFAULT_ACCENT.hex + "24",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const settings = useQuery(api.settings.getAll);
  const a = accentFromSetting(settings?.accent);
  return (
    <ThemeContext.Provider
      value={{ ...palette, accent: a.hex, accentFg: a.fg, accentTint: a.hex + "24" }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
