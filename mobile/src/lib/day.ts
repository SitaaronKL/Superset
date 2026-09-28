/** Local calendar date as YYYY-MM-DD. Never use toISOString (that is UTC). */
export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateFromKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatLongDate(dayKey: string): string {
  return dateFromKey(dayKey).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function weekdayNarrow(dayKey: string): string {
  return dateFromKey(dayKey).toLocaleDateString(undefined, { weekday: "narrow" });
}
