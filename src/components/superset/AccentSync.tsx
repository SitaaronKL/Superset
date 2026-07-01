"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Text on an accent fill must stay readable for every accent the user can
// pick: light accents (Volt, Cyan) need black text, dark ones need white.
function accentForeground(accent: string): string {
  const m = accent.match(/oklch\(\s*([\d.]+)/);
  const l = m ? Number(m[1]) : 0.5;
  return l > 0.7 ? "oklch(0 0 0)" : "oklch(1 0 0)";
}

// Applies the user-chosen accent color + dark mode from settings to the DOM.
export function AccentSync() {
  const settings = useQuery(api.settings.getAll);
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    if (settings.accent) {
      root.style.setProperty("--accent-user", settings.accent);
      root.style.setProperty("--accent-foreground", accentForeground(settings.accent));
    }
    root.classList.toggle("dark", settings.theme !== "light");
  }, [settings]);
  return null;
}
