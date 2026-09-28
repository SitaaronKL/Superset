// Pure skincare schedule engine. No LLM, no database: given the routine's steps
// and a calendar day, it decides exactly what to use, in what order, AM and PM,
// including the shave-day rules and the first-month ramp-up. The AI may explain
// or answer questions about the plan; it never decides it.

export type Slot = "am" | "pm" | "shower";
export type ShaveMode = "normal" | "skip" | "include";

export interface StepConfig {
  id: string;
  slot: Slot;
  order: number;
  productName: string;
  kind: string;
  howTo?: string;
  /** Weekdays (0 = Sunday) the step runs. Omitted means every day. */
  days?: number[];
  /** Ramp-up: the first routine week (1-based) this step appears in. */
  startWeek?: number;
  /** Ramp-up: during a given week, use these days instead of `days`. */
  ramp?: { week: number; days: number[] }[];
  /** On a shave day: `skip` drops it, `include` forces it in, `normal` follows the schedule. */
  onShaveDay?: ShaveMode;
  /** Extra instruction shown on shave days. */
  shaveNote?: string;
  /** At most one step per group per day; the lowest `order` wins. */
  group?: string;
}

export interface PlannedStep {
  id: string;
  slot: Slot;
  order: number;
  productName: string;
  kind: string;
  howTo?: string;
  note?: string;
}

export interface DayPlan {
  dayKey: string;
  weekday: number;
  shaved: boolean;
  rampWeek: number;
  am: PlannedStep[];
  pm: PlannedStep[];
  shower: PlannedStep[];
}

/** The synthesized shave step, inserted into the AM routine on shave days. */
export const SHAVE_STEP_ID = "shave";
export const DEFAULT_SHAVE_DAYS = [0, 2, 4];
/** Returned when no start date is set: past the ramp, so the full routine applies. */
export const STEADY_STATE_WEEK = 99;

/** Weekday of a calendar date key (YYYY-MM-DD). Timezone independent. */
export function weekdayOf(dayKey: string): number {
  return new Date(`${dayKey}T00:00:00Z`).getUTCDay();
}

/** Calendar key `n` days after `dayKey` (negative for before). */
export function addDays(dayKey: string, n: number): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 1-based routine week for `dayKey`, counted from the routine start date. */
export function rampWeekFor(startKey: string | undefined, dayKey: string): number {
  if (!startKey) return STEADY_STATE_WEEK;
  const days = Math.floor(
    (Date.parse(`${dayKey}T00:00:00Z`) - Date.parse(`${startKey}T00:00:00Z`)) / 86_400_000,
  );
  if (days < 0) return 1;
  return Math.floor(days / 7) + 1;
}

/** Whether `dayKey` is a shave day: an explicit override wins, else the default shave weekdays. */
export function isShaveDay(dayKey: string, override: boolean | undefined, shaveDays = DEFAULT_SHAVE_DAYS): boolean {
  return override ?? shaveDays.includes(weekdayOf(dayKey));
}

export const SHAVE_HOW_TO =
  "Safety razor and cream, with the grain only. Shave after cleansing, before serums. Rinse cold after.";

export function planFor(
  steps: StepConfig[],
  opts: { dayKey: string; shaved: boolean; rampWeek: number },
): DayPlan {
  const weekday = weekdayOf(opts.dayKey);
  const kept: PlannedStep[] = [];

  for (const s of steps) {
    if (s.startWeek && opts.rampWeek < s.startWeek) continue;
    const override = s.ramp?.find((r) => r.week === opts.rampWeek);
    const days = override ? override.days : s.days;
    const scheduled = !days || days.includes(weekday);

    const mode = s.onShaveDay ?? "normal";
    let include = scheduled;
    if (opts.shaved && mode === "skip") include = false;
    if (opts.shaved && mode === "include") include = true;
    if (!include) continue;

    kept.push({
      id: s.id,
      slot: s.slot,
      order: s.order,
      productName: s.productName,
      kind: s.kind,
      howTo: s.howTo,
      note: opts.shaved ? s.shaveNote : undefined,
    });
  }

  // One step per group per day (e.g. a single PM active, a single body wash).
  const groups = new Map(steps.filter((s) => s.group).map((s) => [s.id, s.group!]));
  const seen = new Set<string>();
  const plan = kept
    .sort((a, b) => a.order - b.order)
    .filter((p) => {
      const g = groups.get(p.id);
      if (!g) return true;
      if (seen.has(g)) return false;
      seen.add(g);
      return true;
    });

  const am = plan.filter((p) => p.slot === "am");
  if (opts.shaved) {
    // Shave after the first step (cleanse), before any serum.
    const shave: PlannedStep = {
      id: SHAVE_STEP_ID, slot: "am", order: (am[0]?.order ?? 0) + 0.5,
      productName: "Shave", kind: "shave", howTo: SHAVE_HOW_TO,
    };
    am.splice(am.length ? 1 : 0, 0, shave);
  }

  return {
    dayKey: opts.dayKey,
    weekday,
    shaved: opts.shaved,
    rampWeek: opts.rampWeek,
    am,
    pm: plan.filter((p) => p.slot === "pm"),
    shower: plan.filter((p) => p.slot === "shower"),
  };
}

export function plannedIds(plan: DayPlan): string[] {
  return [...plan.am, ...plan.pm, ...plan.shower].map((p) => p.id);
}

export interface DayRecord { dayKey: string; planned: string[]; done: string[] }

export function completion(day: DayRecord): number {
  if (day.planned.length === 0) return 1;
  const done = new Set(day.done);
  return day.planned.filter((id) => done.has(id)).length / day.planned.length;
}

/**
 * Consecutive fully completed days ending today, or ending yesterday when
 * today is still in progress. `days` is ordered oldest to newest, today last.
 */
export function streak(days: DayRecord[]): number {
  let i = days.length - 1;
  if (i >= 0 && completion(days[i]) < 1) i -= 1;
  let n = 0;
  for (; i >= 0 && completion(days[i]) === 1; i--) n += 1;
  return n;
}

/** Days until a product runs out, from when it was opened and how long a unit lasts. */
export function refillDaysLeft(openedKey: string | undefined, lastsDays: number | undefined, todayKey: string): number | null {
  if (!openedKey || !lastsDays) return null;
  const used = Math.floor((Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${openedKey}T00:00:00Z`)) / 86_400_000);
  return lastsDays - used;
}
