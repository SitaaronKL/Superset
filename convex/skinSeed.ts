// The author's routine, transcribed from the Obsidian note "Skincare Weekly
// Schedule" (built Sep 28, 2026). Forks: replace this with your own routine or
// start empty and build one in the app.

import type { ShaveMode, Slot } from "./skinEngine";

export interface SeedProduct {
  key: string;
  name: string;
  brand: string;
  zone: "face" | "body" | "face+body";
  kind: string;
  why: string;
  lastsDays?: number;
}

export interface SeedStep {
  product: string; // SeedProduct.key
  slot: Slot;
  order: number;
  howTo?: string;
  days?: number[];
  startWeek?: number;
  ramp?: { week: number; days: number[] }[];
  onShaveDay?: ShaveMode;
  shaveNote?: string;
  group?: string;
}

const ALL = [0, 1, 2, 3, 4, 5, 6];

export const SEED_PRODUCTS: SeedProduct[] = [
  { key: "cleanser", name: "Foaming Facial Cleanser", brand: "CeraVe", zone: "face", kind: "Cleanser",
    why: "Removes oil and sunscreen without stripping. The actives do the work; the cleanser just clears the canvas. Never scrub, lukewarm water only." },
  { key: "niacinamide", name: "Niacinamide 10% + Zinc 1%", brand: "The Ordinary", zone: "face", kind: "Serum",
    why: "Regulates oil output over weeks, fades marks, strengthens the barrier. Makes everything else tolerable.", lastsDays: 60 },
  { key: "vitc", name: "The Glow Maker (vitamin C)", brand: "Maelove", zone: "face", kind: "Serum",
    why: "Antioxidant and brightening. Backs up sunscreen during the day. Goes on first in the AM because it has the lowest pH." },
  { key: "spf", name: "UV Clear Tinted SPF 46", brand: "EltaMD", zone: "face", kind: "Sunscreen",
    why: "The single most important product. UV and visible light drive hyperpigmentation on brown skin; the tint blocks the visible light clear sunscreen misses. Indoors near windows still counts.", lastsDays: 42 },
  { key: "azelaic", name: "Azelaic Acid Suspension 10%", brand: "The Ordinary", zone: "face", kind: "Active",
    why: "Main pigment fader. Evens tone, calms redness, helps acne, safe on darker skin. Can tingle for the first couple of weeks; burning is not normal.", lastsDays: 60 },
  { key: "bha", name: "2% BHA Liquid Exfoliant", brand: "Paula's Choice", zone: "face", kind: "Active",
    why: "Leave-on salicylic acid. Clears pores, prevents milia, smooths skin so shaving is cleaner. Most likely to tip into over-exfoliation, so it gets the fewest nights.", lastsDays: 60 },
  { key: "moisturizer", name: "Daily Moisturizing Lotion", brand: "CeraVe", zone: "face+body", kind: "Moisturizer",
    why: "Ceramides and hyaluronic acid. Repairs the barrier the actives stress. Light enough for oily skin; the same bottle does face and body." },
  { key: "somebymi", name: "AHA BHA PHA 30 Days Miracle Acne Clear Body Cleanser", brand: "Some By Mi", zone: "body", kind: "Body wash",
    why: "Chemical exfoliation for the body with tea tree and centella to calm. The everyday body acne wash." },
  { key: "shield", name: "Body Acne Wash, 10% Benzoyl Peroxide", brand: "Shield Labs", zone: "body", kind: "Body wash",
    why: "The strong one for back, chest, and shoulders. Bleaches fabric and is drying, so it never shares a shower with the acid wash.", lastsDays: 60 },
];

export const SEED_STEPS: SeedStep[] = [
  // AM, top to bottom.
  { product: "cleanser", slot: "am", order: 1, howTo: "Lukewarm water, no scrubbing." },
  { product: "vitc", slot: "am", order: 2, startWeek: 4, howTo: "3 to 4 drops, wait 1 to 2 minutes.",
    shaveNote: "Skip the neck and jaw today. It stings on freshly shaved skin." },
  { product: "niacinamide", slot: "am", order: 3, howTo: "A few drops." },
  { product: "moisturizer", slot: "am", order: 4, howTo: "Thin layer." },
  { product: "spf", slot: "am", order: 5, howTo: "Two finger-lengths for face and neck. Last step, always." },

  // PM: cleanse, one active, moisturize.
  { product: "cleanser", slot: "pm", order: 1 },
  { product: "azelaic", slot: "pm", order: 2, group: "pm-active", days: [0, 2, 4, 6], onShaveDay: "include",
    howTo: "Pea-size, spread thin. If it stings too much, moisturize first and put azelaic on top.",
    shaveNote: "Above the jawline only. Neck and jaw get moisturizer only." },
  { product: "bha", slot: "pm", order: 3, group: "pm-active", days: [1, 3, 5], startWeek: 2,
    ramp: [{ week: 2, days: [3] }], onShaveDay: "skip",
    howTo: "Fingers or a cotton pad. Wait 10 to 20 minutes before moisturizer." },
  { product: "moisturizer", slot: "pm", order: 4, howTo: "PM always ends here." },

  // Shower: one body wash.
  { product: "somebymi", slot: "shower", order: 1, group: "body-wash", days: [0, 2, 4, 6], ramp: [{ week: 1, days: ALL }, { week: 2, days: [0, 2, 3, 4, 6] }],
    onShaveDay: "include", howTo: "Leave on 1 to 2 minutes before rinsing." },
  { product: "shield", slot: "shower", order: 2, group: "body-wash", days: [1, 3, 5], startWeek: 2,
    ramp: [{ week: 2, days: [1, 5] }], onShaveDay: "skip",
    howTo: "Leave on 1 to 2 minutes. Rinse thoroughly, dry with a white towel." },
  { product: "moisturizer", slot: "shower", order: 3, howTo: "Back, chest, and shoulders after the shower." },
];

/** The rules the AI must respect when answering questions about the routine. */
export const SKIN_RULES = `Shave with a safety razor and cream, with the grain only (against the grain causes ingrowns and dark spots on the neck and jaw).
Shave in the AM after cleansing, before serums. Rinse cold after.
On a shave day: skip vitamin C on the neck and jaw that morning; no BHA anywhere that night; azelaic above the jawline only; body wash is the acid wash, never benzoyl peroxide.
If shaving on a BHA night, that night becomes azelaic above the jaw. Never make up a missed BHA night later in the week.
Never shave and use BHA or benzoyl peroxide on the same skin the same day.
Normal in the first 2 to 3 weeks: light tingling from azelaic, mild neck dryness, small purging pimples, tight body skin after benzoyl peroxide.
Not normal (stop the newest product for 3 days, then reintroduce at half frequency): burning that lasts more than a minute, peeling, red patches, itching.
Over-exfoliation signs: shiny tight skin, stinging from plain water, sudden new dark patches. Then drop BHA to 1 night a week and benzoyl peroxide to 1 shower a week for two weeks.
Results: oil control 3 to 4 weeks, body acne 4 to 6 weeks, smoother shave 6 to 8 weeks, dark spots 8 to 12 weeks and only with daily SPF.
Once tretinoin arrives from the dermatologist, it becomes the PM anchor on non-BHA nights and the week gets re-mapped.`;
