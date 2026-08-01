import { createContext, useContext } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Superset visual identity, translated to native. Values mirror the web
// app's oklch tokens as hex; the accent comes from the shared Convex
// settings (stored as oklch strings) and is mapped here.
export const palette = {
  bg: "#070707",
  card: "#1c1c1e",
  muted: "#161618",
  mutedFg: "#9d9da3",
  fg: "#ffffff",
  border: "rgba(255,255,255,0.14)",
  hairline: "rgba(255,255,255,0.10)",
  success: "#4cd97b",
  destructive: "#ff453a",
};

// The six accent presets exactly as stored in settings (oklch strings),
// mapped to native-renderable hex plus the readable foreground for fills.
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
  // Unknown oklch string: derive foreground from lightness like the web app.
  const m = setting?.match(/oklch\(\s*([\d.]+)/);
  const l = m ? Number(m[1]) : 0.55;
  return { hex: DEFAULT_ACCENT.hex, fg: l > 0.7 ? "#000000" : "#ffffff" };
}

export const fonts = {
  display: "Anton_400Regular",
  sans: "HankenGrotesk_400Regular",
  sansMedium: "HankenGrotesk_500Medium",
  sansSemiBold: "HankenGrotesk_600SemiBold",
  mono: "IBMPlexMono_400Regular",
  monoSemiBold: "IBMPlexMono_600SemiBold",
};

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
