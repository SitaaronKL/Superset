import { describe, it, expect } from "vitest";
import {
  rampPlan,
  nextSetTarget,
  clampAdjustment,
  explainNextSet,
  workingSetCount,
  type ExerciseConfig,
  type SetRecord,
} from "./engine";

describe("workingSetCount", () => {
  it("uses the prescribed count when set", () => {
    expect(workingSetCount({ repRangeMin: 8, repRangeMax: 10, weightIncrement: 5, isCompound: false, workingSets: 2 })).toBe(2);
  });
  it("defaults to 5 for compounds, 4 for isolation", () => {
    expect(workingSetCount({ repRangeMin: 5, repRangeMax: 7, weightIncrement: 5, isCompound: true })).toBe(5);
    expect(workingSetCount({ repRangeMin: 8, repRangeMax: 12, weightIncrement: 5, isCompound: false })).toBe(4);
  });
});

const SHOULDER: ExerciseConfig = {
  repRangeMin: 8,
  repRangeMax: 12,
  weightIncrement: 5,
  isCompound: true,
};

// Seeded Obsidian history for Seated Shoulder Press (DB).
const shoulderLast: SetRecord[] = [
  { weight: 20, reps: 12, isWarmup: true },
  { weight: 25, reps: 12, isWarmup: false },
  { weight: 30, reps: 12, isWarmup: false },
  { weight: 35, reps: 7, fatigue: "struggle", isWarmup: false },
  { weight: 40, reps: 6, fatigue: "failure", isWarmup: false },
];

describe("rampPlan", () => {
  it("carries warmups over verbatim from last session", () => {
    const plan = rampPlan(SHOULDER, shoulderLast);
    expect(plan.warmups).toEqual([{ weight: 20, reps: 12 }]);
  });

  it("produces one working target per working set last time, with overload applied", () => {
    const plan = rampPlan(SHOULDER, shoulderLast);
    expect(plan.workingTargets).toEqual([
      { weight: 30, reps: 8 }, // 25x12 maxed w/ reserve -> +5, reset to floor
      { weight: 35, reps: 8 }, // 30x12 maxed w/ reserve -> +5, reset to floor
      { weight: 35, reps: 8 }, // 35x7 struggle, in range -> same wt, +1 rep
      { weight: 40, reps: 6 }, // 40x6 failure -> match, no load added
    ]);
  });

  it("falls back to a default count of blank targets when there is no history", () => {
    const plan = rampPlan(SHOULDER, []);
    expect(plan.warmups).toEqual([]);
    expect(plan.workingTargets).toHaveLength(5); // compound default
    expect(plan.workingTargets.every((t) => t.weight === 0)).toBe(true);
  });

  it("uses 4 default working targets for isolation lifts", () => {
    const iso: ExerciseConfig = { ...SHOULDER, isCompound: false };
    expect(rampPlan(iso, []).workingTargets).toHaveLength(4);
  });
});

describe("nextSetTarget", () => {
  const plan = rampPlan(SHOULDER, shoulderLast);

  it("returns the first target when nothing logged yet", () => {
    expect(nextSetTarget(SHOULDER, [], plan)).toEqual({ weight: 30, reps: 8 });
  });

  it("advances to the next planned rung after a normal set", () => {
    const soFar: SetRecord[] = [{ weight: 30, reps: 8, fatigue: "struggle", isWarmup: false }];
    expect(nextSetTarget(SHOULDER, soFar, plan)).toEqual({ weight: 35, reps: 8 });
  });

  it("holds weight (no climb) after a failure set", () => {
    const soFar: SetRecord[] = [{ weight: 30, reps: 8, fatigue: "failure", isWarmup: false }];
    expect(nextSetTarget(SHOULDER, soFar, plan)).toEqual({ weight: 30, reps: 8 });
  });

  it("bumps load when the last set was easy and beat its target", () => {
    const soFar: SetRecord[] = [{ weight: 30, reps: 12, fatigue: "ez", isWarmup: false }];
    // planned rung1 was 35x8; easy beat -> +1 increment
    expect(nextSetTarget(SHOULDER, soFar, plan)).toEqual({ weight: 40, reps: 8 });
  });

  it("ignores warmups when counting working sets", () => {
    const soFar: SetRecord[] = [{ weight: 20, reps: 12, isWarmup: true }];
    expect(nextSetTarget(SHOULDER, soFar, plan)).toEqual({ weight: 30, reps: 8 });
  });
});

describe("explainNextSet", () => {
  const plan = rampPlan(SHOULDER, shoulderLast);
  const lastWorking = shoulderLast.filter((s) => !s.isWarmup);

  it("explains the opening set by reference to last session", () => {
    const msg = explainNextSet(SHOULDER, [], plan, lastWorking);
    expect(msg).toContain("25");
    expect(msg.toLowerCase()).toContain("beat");
  });

  it("explains holding after a failure set", () => {
    const soFar: SetRecord[] = [{ weight: 30, reps: 8, fatigue: "failure", isWarmup: false }];
    expect(explainNextSet(SHOULDER, soFar, plan, lastWorking).toLowerCase()).toContain("hold");
  });

  it("explains a bump after an easy set", () => {
    const soFar: SetRecord[] = [{ weight: 30, reps: 12, fatigue: "ez", isWarmup: false }];
    expect(explainNextSet(SHOULDER, soFar, plan, lastWorking).toLowerCase()).toMatch(/easy|bump|up/);
  });

  it("gives a no-history message when there is no plan data", () => {
    const empty = rampPlan(SHOULDER, []);
    expect(explainNextSet(SHOULDER, [], empty, []).toLowerCase()).toContain("history");
  });
});

describe("clampAdjustment", () => {
  it("passes through a proposal within the band", () => {
    expect(clampAdjustment({ weight: 45, reps: 8 }, { weight: 45, reps: 9 }, 5)).toEqual({
      weight: 45,
      reps: 9,
    });
  });

  it("clamps an over-band weight drop to one increment", () => {
    // user's shoulder felt tweaky, model proposes 30 from baseline 45
    expect(clampAdjustment({ weight: 45, reps: 8 }, { weight: 30, reps: 8 }, 5)).toEqual({
      weight: 40,
      reps: 8,
    });
  });

  it("clamps an over-band weight increase to one increment", () => {
    expect(clampAdjustment({ weight: 45, reps: 8 }, { weight: 80, reps: 8 }, 5)).toEqual({
      weight: 50,
      reps: 8,
    });
  });

  it("clamps reps to +/- 2 of baseline", () => {
    expect(clampAdjustment({ weight: 45, reps: 8 }, { weight: 45, reps: 20 }, 5)).toEqual({
      weight: 45,
      reps: 10,
    });
  });

  it("returns baseline when proposal equals baseline", () => {
    expect(clampAdjustment({ weight: 45, reps: 8 }, { weight: 45, reps: 8 }, 5)).toEqual({
      weight: 45,
      reps: 8,
    });
  });
});
