// The deterministic progressive-overload engine.
// Pure functions only — no LLM anywhere in this file. Every weight, rep
// target, and stop decision the app ever shows comes from here.

export type Fatigue = "ez" | "struggle" | "failure" | "tooTired";

export interface SetRecord {
  weight: number;
  reps: number;
  fatigue?: Fatigue;
  isWarmup: boolean;
}

export interface ExerciseConfig {
  repRangeMin: number;
  repRangeMax: number;
  weightIncrement: number;
  isCompound: boolean;
}

export interface Prescription {
  topWeight: number;
  targetRepsMin: number;
  targetRepsMax: number;
  warmups: { weight: number; reps: number }[];
  workingSets: number;
  rationale: string;
  isRebuild: boolean;
}

/** Fatigue tag → estimated reps in reserve. */
export function fatigueToRIR(f: Fatigue | undefined): number {
  switch (f) {
    case "ez":
      return 3;
    case "struggle":
      return 1;
    case "failure":
      return 0;
    case "tooTired":
      return 0;
    default:
      return 2;
  }
}

/** Epley estimated 1RM. */
export function e1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function bestE1RM(sets: SetRecord[]): number {
  return Math.max(0, ...sets.filter((s) => !s.isWarmup).map((s) => e1RM(s.weight, s.reps)));
}

/** Round to the nearest loadable increment. */
export function roundToIncrement(weight: number, increment: number): number {
  return Math.max(increment, Math.round(weight / increment) * increment);
}

const LAYOFF_MS = 21 * 24 * 60 * 60 * 1000; // ~3 weeks

/**
 * Core prescription. Reads the last session's working sets for an exercise
 * and produces the next session's plan.
 *
 * Rules (double progression):
 * - Top of rep range hit with RIR >= 1 → add one increment.
 * - Inside the range → repeat weight, chase one more rep.
 * - Below the floor → hold; two sessions in a row below floor → deload 10%.
 * - Gap > 3 weeks → rebuild from 75–80% of old e1RM.
 */
export function prescribe(
  cfg: ExerciseConfig,
  lastSets: SetRecord[],
  lastSessionDate: number | null,
  now: number,
  prevSessionBelowFloor: boolean
): Prescription {
  const working = lastSets.filter((s) => !s.isWarmup);

  if (working.length === 0 || lastSessionDate === null) {
    return {
      topWeight: 0,
      targetRepsMin: cfg.repRangeMin,
      targetRepsMax: cfg.repRangeMax,
      warmups: [],
      workingSets: cfg.isCompound ? 5 : 4,
      rationale: "No history for this exercise — pick a weight you can do for the top of the rep range with 2–3 reps in reserve.",
      isRebuild: false,
    };
  }

  const top = working.reduce((a, b) => (e1RM(b.weight, b.reps) > e1RM(a.weight, a.reps) ? b : a));
  const oldMax = bestE1RM(working);
  const gap = now - lastSessionDate;

  if (gap > LAYOFF_MS) {
    const weeks = Math.round(gap / (7 * 24 * 60 * 60 * 1000));
    const factor = gap > 90 * 24 * 60 * 60 * 1000 ? 0.75 : 0.8;
    const target = roundToIncrement(oldMax * factor * 0.85, cfg.weightIncrement);
    return {
      topWeight: target,
      targetRepsMin: cfg.repRangeMin,
      targetRepsMax: cfg.repRangeMax,
      warmups: warmupRamp(target, cfg),
      workingSets: cfg.isCompound ? 4 : 3,
      rationale: `Last trained ${weeks} weeks ago at ${top.weight}×${top.reps} (e1RM ${Math.round(oldMax)}). Rebuilding from ${Math.round(factor * 100)}% — don't ego-lift the first week; you'll be back fast.`,
      isRebuild: true,
    };
  }

  const rir = fatigueToRIR(top.fatigue);
  let topWeight = top.weight;
  let rationale: string;

  if (top.reps >= cfg.repRangeMax && rir >= 1) {
    topWeight = top.weight + cfg.weightIncrement;
    rationale = `You hit ${top.weight}×${top.reps} with reps in reserve — moving up to ${topWeight}.`;
  } else if (top.reps >= cfg.repRangeMin) {
    rationale = `Repeat ${top.weight} and try for ${Math.min(top.reps + 1, cfg.repRangeMax)} reps.`;
  } else if (prevSessionBelowFloor) {
    topWeight = roundToIncrement(top.weight * 0.9, cfg.weightIncrement);
    rationale = `Two sessions below ${cfg.repRangeMin} reps — deloading 10% to ${topWeight} to rebuild momentum.`;
  } else {
    rationale = `Last time ${top.weight}×${top.reps} fell below the ${cfg.repRangeMin}-rep floor. Hold ${top.weight} and get back in range.`;
  }

  return {
    topWeight: roundToIncrement(topWeight, cfg.weightIncrement),
    targetRepsMin: cfg.repRangeMin,
    targetRepsMax: cfg.repRangeMax,
    warmups: warmupRamp(topWeight, cfg),
    workingSets: cfg.isCompound ? 5 : 4,
    rationale,
    isRebuild: false,
  };
}

/** Auto-build the warmup ladder toward the top working weight. */
export function warmupRamp(topWeight: number, cfg: ExerciseConfig): { weight: number; reps: number }[] {
  if (!cfg.isCompound || topWeight <= 0) return [];
  const ramp: { weight: number; reps: number }[] = [];
  const bar = 45;
  if (topWeight >= 95) ramp.push({ weight: bar, reps: 12 });
  const steps: [number, number][] = [
    [0.55, 8],
    [0.75, 4],
  ];
  for (const [pct, reps] of steps) {
    const w = roundToIncrement(topWeight * pct, cfg.weightIncrement);
    if (w > bar && w < topWeight) ramp.push({ weight: w, reps });
  }
  return ramp;
}

/**
 * Should the lifter stop this exercise now?
 * Stops grinding junk volume: reps collapsing below the floor, or two
 * consecutive tooTired sets.
 */
export function shouldStop(cfg: ExerciseConfig, setsSoFar: SetRecord[]): { stop: boolean; reason?: string } {
  const working = setsSoFar.filter((s) => !s.isWarmup);
  const n = working.length;
  if (n >= 2) {
    const lastTwo = working.slice(-2);
    if (lastTwo.every((s) => s.fatigue === "tooTired")) {
      return { stop: true, reason: "Two sets flagged too tired in a row — extra sets from here are junk fatigue. Move on." };
    }
  }
  if (n >= 3) {
    const last = working[n - 1];
    if (last.reps < Math.max(2, Math.floor(cfg.repRangeMin / 2))) {
      return { stop: true, reason: `Reps collapsed to ${last.reps} — you've gotten the stimulus. Move on.` };
    }
  }
  return { stop: false };
}
