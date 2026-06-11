"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Applies the user-chosen accent color + dark mode from settings to the DOM.
export function AccentSync() {
  const settings = useQuery(api.settings.getAll);
  useEffect(() => {
    if (!settings) return;
    if (settings.accent) {
      document.documentElement.style.setProperty("--accent-user", settings.accent);
    }
    document.documentElement.classList.toggle("dark", settings.theme !== "light");
  }, [settings]);
  return null;
}
