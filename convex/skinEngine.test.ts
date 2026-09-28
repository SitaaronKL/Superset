import { describe, expect, it } from "vitest";
import {
  SHAVE_STEP_ID, addDays, isShaveDay, planFor, rampWeekFor, refillDaysLeft, streak, weekdayOf,
  type StepConfig,
} from "./skinEngine";
import { SEED_STEPS } from "./skinSeed";

const steps: StepConfig[] = SEED_STEPS.map((s, i) => ({ ...s, id: `${s.slot}-${s.product}-${i}`, productName: s.product, kind: s.product }));
const names = (list: { productName: string }[]) => list.map((p) => p.productName);

// 2026-09-27 is a Sunday.
const SUN = "2026-09-27", MON = "2026-09-28", WED = "2026-09-30", SAT = "2026-10-03";

describe("calendar helpers", () => {
  it("reads weekdays and adds days", () => {
    expect(weekdayOf(SUN)).toBe(0);
    expect(weekdayOf(MON)).toBe(1);
    expect(addDays(SUN, 6)).toBe(SAT);
    expect(addDays(MON, -1)).toBe(SUN);
  });
  it("counts ramp weeks from the start date", () => {
    expect(rampWeekFor(MON, MON)).toBe(1);
    expect(rampWeekFor(MON, addDays(MON, 6))).toBe(1);
    expect(rampWeekFor(MON, addDays(MON, 7))).toBe(2);
    expect(rampWeekFor(undefined, MON)).toBe(99);
  });
  it("defaults shave days to Sun Tue Thu, with overrides", () => {
    expect(isShaveDay(SUN, undefined)).toBe(true);
    expect(isShaveDay(MON, undefined)).toBe(false);
    expect(isShaveDay(MON, true)).toBe(true);
    expect(isShaveDay(SUN, false)).toBe(false);
  });
});

describe("steady-state week", () => {
  it("Monday: full AM, BHA night, benzoyl peroxide shower", () => {
    const p = planFor(steps, { dayKey: MON, shaved: false, rampWeek: 99 });
    expect(names(p.am)).toEqual(["cleanser", "vitc", "niacinamide", "moisturizer", "spf"]);
    expect(names(p.pm)).toEqual(["cleanser", "bha", "moisturizer"]);
    expect(names(p.shower)).toEqual(["shield", "moisturizer"]);
  });
  it("Sunday shave day: shave after cleanse, azelaic above the jaw, acid body wash", () => {
    const p = planFor(steps, { dayKey: SUN, shaved: true, rampWeek: 99 });
    expect(p.am[1].id).toBe(SHAVE_STEP_ID);
    expect(p.am.find((s) => s.productName === "vitc")?.note).toMatch(/neck and jaw/);
    expect(names(p.pm)).toEqual(["cleanser", "azelaic", "moisturizer"]);
    expect(p.pm[1].note).toMatch(/Above the jawline/);
    expect(names(p.shower)).toEqual(["somebymi", "moisturizer"]);
  });
  it("shaving on a BHA night swaps to azelaic and the acid wash", () => {
    const p = planFor(steps, { dayKey: WED, shaved: true, rampWeek: 99 });
    expect(names(p.pm)).toEqual(["cleanser", "azelaic", "moisturizer"]);
    expect(names(p.shower)).toEqual(["somebymi", "moisturizer"]);
  });
  it("Saturday: azelaic full face, no shave notes", () => {
    const p = planFor(steps, { dayKey: SAT, shaved: false, rampWeek: 99 });
    expect(names(p.pm)).toEqual(["cleanser", "azelaic", "moisturizer"]);
    expect(p.pm[1].note).toBeUndefined();
    expect(p.am.some((s) => s.id === SHAVE_STEP_ID)).toBe(false);
  });
  it("never schedules two PM actives or two body washes", () => {
    for (let i = 0; i < 7; i++) for (const shaved of [true, false]) {
      const p = planFor(steps, { dayKey: addDays(SUN, i), shaved, rampWeek: 99 });
      expect(p.pm.filter((s) => s.productName === "bha" || s.productName === "azelaic").length).toBeLessThanOrEqual(1);
      expect(p.shower.filter((s) => s.productName === "shield" || s.productName === "somebymi").length).toBe(1);
    }
  });
});

describe("ramp-up", () => {
  it("week 1: no vitamin C, no BHA, acid wash every shower", () => {
    const p = planFor(steps, { dayKey: MON, shaved: false, rampWeek: 1 });
    expect(names(p.am)).toEqual(["cleanser", "niacinamide", "moisturizer", "spf"]);
    expect(names(p.pm)).toEqual(["cleanser", "moisturizer"]);
    expect(names(p.shower)).toEqual(["somebymi", "moisturizer"]);
  });
  it("week 2: BHA on Wednesday only, benzoyl peroxide Monday and Friday", () => {
    expect(names(planFor(steps, { dayKey: WED, shaved: false, rampWeek: 2 }).pm)).toContain("bha");
    expect(names(planFor(steps, { dayKey: MON, shaved: false, rampWeek: 2 }).pm)).not.toContain("bha");
    expect(names(planFor(steps, { dayKey: MON, shaved: false, rampWeek: 2 }).shower)).toContain("shield");
    expect(names(planFor(steps, { dayKey: WED, shaved: false, rampWeek: 2 }).shower)).toContain("somebymi");
  });
  it("week 4 adds vitamin C", () => {
    expect(names(planFor(steps, { dayKey: MON, shaved: false, rampWeek: 3 }).am)).not.toContain("vitc");
    expect(names(planFor(steps, { dayKey: MON, shaved: false, rampWeek: 4 }).am)).toContain("vitc");
  });
});

describe("accountability", () => {
  const day = (k: string, planned: number, done: number) => ({
    dayKey: k, planned: Array.from({ length: planned }, (_, i) => `s${i}`), done: Array.from({ length: done }, (_, i) => `s${i}`),
  });
  it("counts the streak, forgiving an unfinished today", () => {
    expect(streak([day("a", 3, 3), day("b", 3, 3), day("c", 3, 1)])).toBe(2);
    expect(streak([day("a", 3, 3), day("b", 3, 2), day("c", 3, 3)])).toBe(1);
    expect(streak([day("a", 3, 0)])).toBe(0);
  });
  it("estimates refill days", () => {
    expect(refillDaysLeft("2026-09-01", 42, "2026-09-28")).toBe(15);
    expect(refillDaysLeft(undefined, 42, "2026-09-28")).toBeNull();
  });
});
