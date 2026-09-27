import { describe, expect, it } from "vitest";
import { noEmDash, noEmDashDeep } from "./copy";

describe("noEmDash", () => {
  it("turns a mid-sentence em dash into a comma", () => {
    expect(noEmDash("Last 2 sets should be brutal — around 3 reps.")).toBe("Last 2 sets should be brutal, around 3 reps.");
  });
  it("handles em dashes without spaces", () => {
    expect(noEmDash("Tricep Pushdown—small bar")).toBe("Tricep Pushdown, small bar");
  });
  it("turns numeric ranges into hyphens", () => {
    expect(noEmDash("around 3–4 reps, 6—7 top sets")).toBe("around 3-4 reps, 6-7 top sets");
  });
  it("drops a dash that opens a line and ends one with a period", () => {
    expect(noEmDash("— start here\nfinish strong —")).toBe("start here\nfinish strong.");
  });
  it("does not leave a comma before other punctuation", () => {
    expect(noEmDash("Go heavy —.")).toBe("Go heavy.");
  });
  it("leaves clean text and plain hyphens alone", () => {
    const s = "2x10 to failure, 9th-10th rep.";
    expect(noEmDash(s)).toBe(s);
  });
  it("cleans nested JSON results", () => {
    expect(noEmDashDeep({ name: "Shake — chocolate", n: 3, list: ["a — b"] }))
      .toEqual({ name: "Shake, chocolate", n: 3, list: ["a, b"] });
  });
});
