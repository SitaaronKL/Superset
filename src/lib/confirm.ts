// One shared feedback primitive so every commit-action in the app feels the
// same: a quick spring scale pop plus a light haptic where the platform
// supports it. Haptics are progressive enhancement (iOS Safari has no
// navigator.vibrate); the visual pop is skipped under prefers-reduced-motion.
export function confirmTap(el?: Element | null, opts: { haptic?: number | number[] } = {}) {
  const { haptic = 8 } = opts;
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(haptic);
  } catch {
    // vibration is best-effort
  }
  if (!el || !(el instanceof HTMLElement)) return;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  el.animate(
    [{ transform: "scale(1)" }, { transform: "scale(0.94)" }, { transform: "scale(1)" }],
    { duration: 150, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  );
}
