import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";

export type SkinDay = FunctionReturnType<typeof api.skin.day>;
export type SkinRoutine = FunctionReturnType<typeof api.skin.routine>;
export type SkinPhotos = FunctionReturnType<typeof api.skin.photos>;
export type SkinPhoto = SkinPhotos[number];
export type SkinAsks = FunctionReturnType<typeof api.skin.asks>;
export type SkinAsk = SkinAsks[number];
export type PlannedRow = SkinDay["am"][number];
export type Slot = PlannedRow["slot"];
export type RoutineProduct = SkinRoutine["products"][number];
export type RoutineStep = SkinRoutine["steps"][number];
export type ShaveMode = "normal" | "skip" | "include";

export type Proposal = {
  summary: string;
  products: {
    key: string;
    name: string;
    brand?: string;
    zone: string;
    kind: string;
    why?: string;
  }[];
  steps: {
    product: string;
    slot: Slot;
    order: number;
    howTo?: string;
    days?: number[];
    onShaveDay?: ShaveMode;
    shaveNote?: string;
    group?: string;
  }[];
};

export const SLOTS: { id: Slot; label: string }[] = [
  { id: "am", label: "Morning" },
  { id: "pm", label: "Night" },
  { id: "shower", label: "Shower" },
];

export const WEEKDAYS = [
  { n: 0, label: "Su" },
  { n: 1, label: "M" },
  { n: 2, label: "T" },
  { n: 3, label: "W" },
  { n: 4, label: "Th" },
  { n: 5, label: "F" },
  { n: 6, label: "Sa" },
] as const;

export const KINDS = [
  "Cleanser", "Serum", "Active", "Moisturizer", "Sunscreen", "Body wash", "Treatment", "Other",
] as const;

export const ZONES = ["face", "body", "face+body"] as const;

export function productParts(
  productName: string,
  products: { name: string; brand?: string | null }[],
): { name: string; brand: string | null } {
  for (const p of products) {
    const full = p.brand ? `${p.brand} ${p.name}` : p.name;
    if (full === productName || p.name === productName) {
      return { name: p.name, brand: p.brand ?? null };
    }
  }
  return { name: productName, brand: null };
}

export function rampLabel(week: number): string {
  if (week >= 99) return "Steady state";
  return `Week ${week} of ramp-up`;
}
