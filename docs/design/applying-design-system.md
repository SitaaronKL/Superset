# Applying the Design System to Superset

A single, prioritized design document. Every recommendation is grounded in a cited note-cluster principle (from `~/Documents/Ext-Brain/Tech/Design`) and the verified code baseline (`src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/superset/*`). No em dashes anywhere, per the hard product rule. Every changelist item names the file and the concrete edit so it is buildable without re-reading the tree.

Constraints threaded throughout: this is a web PWA, not native, so every effect must have a CSS or web fallback (three-tap reachability, remove-then-add before layering, one consistent system, no em dashes, web-not-native).

## 1. Design North Star

Superset is a dense, black-and-white PWA where one user accent is the single signal for "your live focus." Every screen has exactly one job and its primary action is the loudest, most reachable thing on it, sitting in the bottom-third thumb arc within about three taps of app open (Foundations "one job per screen"; Layout "primary action loudest"; iOS ergonomics "thumb arc + three-tap"). The system is the product: one spacing ladder, one type scale, one radius scale, one feedback primitive, and one accent-with-computed-foreground, so the app feels designed rather than assembled, and so a restyle is a token edit not thirty inline-style edits (iOS "consistency = trust = retention"). Motion exists only to explain what changed and where it came from, using transform and opacity on the chrome layer, always yielding to reduced-motion and reduced-transparency. Retention comes from honest compounding value (a Coach that visibly learns you, streaks that unlock kept artifacts, comparison against your own past self) and never from body-data leaderboards, guilt, or randomizing the numbers the engine owns (Gamification White-Hat spine; Intelligence Trap "make the value visible").

**Remove-then-add discipline:** before adding glass, motion, or squircles, first delete the contradictions already in the tree (the dead radius line, the brutalist `rounded-none` surfaces, the four radii per card, the hardcoded whites). A layered effect on top of an inconsistent base just multiplies the inconsistency.

## 2. Foundations to Standardize Now

### Spacing scale (4/8pt)
Baseline: spacing is mostly on-scale but ad hoc, with half-steps (`p-2.5`, `mt-0.5`, `gap-1.5` across DayEditor/SettingsView/WaterCard), per-file page padding (`p-3` most views, `p-4` in HistoryView SessionDetail, `px-3` in page header/nav), and no shared page-padding token. The shadcn `Card` primitive already exposes `--card-spacing` defaulting to `--spacing(4)` (`card.tsx:15`); build on it.
- Adopt one ladder and purge half-steps: **4 / 8 / 12 / 16 / 24 / 32**. e.g. `SessionView.tsx:675` `p-2.5 mt-0.5` -> `p-3 mt-1`; `:429` `gap-1.5` -> `gap-2`; `WaterCard.tsx:45`, `SettingsView.tsx:135` `gap-1.5` -> `gap-2`.
- Add one `--page-padding: --spacing(4)` in `globals.css`, apply to each view's outer container (SessionView `:107,393`, FoodView `:71`, HistoryView `:39`, SettingsView `:56`, CoachView rows) and the header/nav `px-3` (`page.tsx:54,71`).
- One card internal padding via `--card-spacing` (16px) for stat cards; `p-6` only for a full-width hero.
- One vertical section beat: `gap-4` between dashboard cards (already in FoodView/HistoryView); bring SessionView `:107,:393` up; keep `gap-2` only inside a card's set table.
- Proximity signal: label-to-value `gap-1`, card-to-card `gap-4`, so tighten-inside / widen-between carries meaning.

### Type scale
Baseline (biggest debt): no scale. Raw sizes everywhere, arbitrary `text-[9px]/[10px]/[11px]` (nav labels, badges, stat labels) up through `text-5xl`, no enforced body line-height.
- Define a 6-step token ladder in `globals.css @theme`, min 12px (sub-12px illegible in mobile Safari): `--text-caption:12px` (replaces all `[9/10/11px]`), `--text-body:14px` (line-height 1.5), `--text-title:17px`, `--text-h2:22px`, `--text-h1:28px`, `--text-display:40px+` (Anton, hero numbers/RestTimer).
- Fix heading font alias: `--font-heading` aliases `--font-sans` (`globals.css:12`), so every shadcn `CardTitle`/`DrawerTitle` renders in Hanken not Anton. Point it at `var(--font-display)`.
- Fix mono alias (the `.num` bug): `globals.css:11` `--font-mono: var(--font-geist-mono)` overrides the layout's real IBM Plex Mono with an undefined var, so `.num` falls back to system monospace. Delete that line (let `layout.tsx:15` win).
- Reserve `leading-none`/tabular for `.num` + Anton. Prose at 1.5: Coach bubbles (`CoachView.tsx:88`), VoiceLog readback (`:125`), InsightCard body (`:45`).

### Radius / squircle
Baseline: `--radius` set twice, dead shadcn `0.625rem` (`globals.css:75`) then Superset `1.35rem` (`:134`, wins). Same "card" surface drawn with FIVE radii: Card `rounded-xl`; inline stat cards `rounded-3xl`; SessionView `card` const `rounded-2xl`; ExerciseCard `rounded-xl` + rows `rounded-lg`; and brutalist `rounded-none border-2 border-foreground` on VoiceLog + RestTimer.
- Delete dead `--radius: 0.625rem` (`:75`).
- Add one `--radius-card` token, consume in `card.tsx:15`, the three stat cards, SessionView `card` const `:55`, ExerciseCard `:646`. Remove per-card overrides.
- Retire brutalist surfaces: RestTimer (`:35`) and VoiceLog dialog+controls (`:107-136`) to `--radius-card`/`rounded-full` + hairline border. Remove-then-add: cannot claim a squircle language with two hard-edged core surfaces.
- Concentric rule: inner radius = outer minus padding.
- Squircle look via `corner-shape: superellipse()` with `border-radius` fallback on cards + Drawer sheet tops. Pills are already visually continuous.

### Color + contrast
Verified defects:
1. Accent used as text on tiny type (`InsightCard.tsx:37`, `SessionView.tsx:89`, `:677`, `VoiceLog.tsx:140`) fails contrast for light accents (Volt/Cyan/Tangerine).
2. White hardcoded on accent fills: `CoachView.tsx:80,90,106,111`; `SessionView.tsx:124,432,513,742,763`; `CardioLogger.tsx:25,181,191,238`; `MedsView.tsx:38`; `SettingsView.tsx:76,139`; plus root `--accent-foreground: oklch(1 0 0)` at `globals.css:147`. Light accent -> near-invisible text on all of them.

Rules:
- Compute `--accent-foreground` from accent lightness in `AccentSync.tsx` (parse OKLCH L; black when L>~0.7 else white), then replace every hardcoded white-on-accent with `var(--accent-foreground)`. One change fixes Coach bubbles/puck, Session FAB/toggles/pills, all four Cardio chips, Meds, Settings day picker + swatch check.
- Never use accent as text below caption tier; move accent to icon/underline or darken via `color-mix(in oklch, var(--accent-user), black 25%)`.
- Constrain accent to one meaning ("live focus / primary action"): keep on Train FAB, Coach send/mic, active set target, single goal-bar fill. Remove from decorative spots (SUPERSET COACH label, Coach avatar puck, InsightCard label, always-red RestTimer bar).
- Two semantic tokens: add `--success` (goal hit / streak alive), use existing `--destructive` (over-budget/stop). Apply: FoodView calorie bar -> destructive when over; Session stop-note destructive tint; danger fatigue pill -> destructive; ProteinStreak flame + Water "reached" -> success.
- Tokenize accent tint: `--accent-tint` (12%), `--accent-tint-strong` (18%) replacing inline `color-mix` (`SessionView.tsx:675,728,734`, `CoachView.tsx:73`).
- Divider/ring: one `--hairline` (~foreground/12) for card rings + dividers, one `--rule` (~foreground/80) for header/nav only. Replace ad hoc `opacity-50/60/70` text with `text-muted-foreground`.

### Dark mode
Near-inversion today (bg pure black, card `0.11`, border `1/14%`), almost no elevation.
- Lift dark card to ~`oklch(0.16 0 0)`, bg to ~`oklch(0.02 0 0)`, border to ~20%; desaturate accent slightly in dark (in AccentSync) to avoid OLED glare.

## 3. Per-Screen Application

### Signin / Onboarding (roadmap: guest mode)
Greenfield (app opens straight into SessionView today).
- Value before account: let a guest log one food photo or get one Coach rec before signup.
- Aha reflected as future payoff: after goals, "At this rate you hit [goal] by [date]" with the WeightCard Sparkline.
- Multi-intent goals wired to `settings.set` (proteinGoal/calorieGoal/weightGoal/waterGoal).
- Persistent `Item`-based checklist (Set goals / Log first meal / Log first session / Reminder / Accent), not pop-ups.
- Prime before the OS reminder permission prompt (soft explainer sheet).
- Train empty state (`SessionView.tsx:115-119`) doubles as onboarding: teach + invite.

### Train (dashboard + day sheet + active session)
- Focal point (dashboard) = the FAB: give it the sole accent fill; demote the three StatTile deltas (`:89`) to `--muted-foreground`. `bottom-[72px]` -> `--fab-offset` token shared with a Food camera FAB.
- Focal point (active session) = the current set target: promote the rec target (`:690`) to `.num.display` at `--text-display`; dim non-active cards + future-target rows to muted.
- Ramp table as a real CSS grid (set / weight / reps / done) so targets align across LoggedRow, active row, futureTargets.
- Day-picker Drawer detents: open compact, expand for full list; order `days.map` by real usage; keep New day / Freestyle as secondary dashed rows.
- Micro-feedback: set-log button (`:707`) gets the shared `confirm()` primitive.
- Spatial continuity: picked day tile -> ActiveSession via shared `view-transition-name`.
- Empty state -> shadcn `Empty` pointing at the FAB.
- Swipe axis Train<->History on `main` before adding tabs.

### History
- Fixed left date rail so the scan holds; add `truncate` to `ItemTitle` (`:59`).
- Glanceable rows: muscle-group dot or mini set-count bar (add dominant `muscleGroup` to `sessionSummaries`).
- Spatial continuity: row -> SessionDetail shared `view-transition-name` (replace the `selected` swap `:36`).
- Exercise names in SessionDetail link to that lift's PR trend (reuse Sparkline).
- Extract one shared `SetTable` used by SessionDetail rows + active-session LoggedRow.

### Coach
- Focal point = input/send; keep accent on send+mic, remove from avatar puck (`:73-74`).
- Chatbot patterns: streaming/fade reveal + Skeleton instead of the plain busy ellipsis; surface reasoning in the bubble.
- Live taste-led suggestion chips from state ("40g under protein", "Legs is due") replacing static SUGGESTIONS (`:16-21`).
- Bubbles line-height 1.5 + inter-turn spacing; replace `calc(100dvh-7.5rem)` with `--chat-height`.
- Add inline error bubble on `submit` failure (currently swallowed).

### Food
- One hero number: promote net-calories to the top; render goal bars, protein streak, water, weight as a secondary row.
- Unify into one `StatCard` (kill the three local `const ACCENT`, one caption tier, one hero size, one top-right icon at opacity-50); bring ProteinStreak + Insight into it.
- Camera FAB mirroring Train FAB (same coords/size) opening `AddFoodDrawer` so "accent circle = add" is learned.
- Fix the worst hitbox: food-card delete is a 28px `Trash2` on the tap-to-expand photo with no confirm (`:134-137`). Move behind swipe/long-press or AlertDialog, 44px, dead-zone from the image tap.
- PhotoPicker clear `X` (24px, `:162-167`) -> 44px hit area, label "Remove photo".
- Empty state gets a real "Log your first meal" button; `AddFoodDrawer.submit` gets a `catch` + inline error.
- Photo thumbnail -> food card via shared `view-transition-name`.
- Progressive disclosure: tapping a food card expands to the stored AI `summary` + back label (stored but never shown).

### Settings
- Nav-order sanity: Settings sits in prime thumb real estate while least-used; validate `TABS` order (keep Coach center). Replace the `Apple` icon standing in for Food with a nutrition glyph.
- Micro-feedback on swatch/theme/goal/day-pill selection.
- Unify delete iconography: `Trash2` = delete saved thing, `X` = clear unsaved input. `X` wrongly means "remove saved exercise" in DayEditor (`SessionView.tsx:249`).
- 44px targets: default Button `h-8`, Input `h-8`, various `h-9` icon buttons and the 28px food delete are sub-44px. Raise primitive defaults toward `h-11`/`size-11` (majority already pass `h-11`).

## 4. Motion & Feedback Plan (web-appropriate)

Baseline: essentially no system motion. A few `active:scale-95` + Button `active:translate-y-px`; no `startViewTransition`; `navigator.vibrate` only in RestTimer completion `[200,100,200]`; nav `LoopIcon` auto-loops every 3.2s decoupled from interaction. Constraints: animate transform/opacity only; honor `prefers-reduced-motion`/`-transparency`/`-contrast`; `navigator.vibrate` is progressive enhancement (unsupported in iOS Safari), never the sole channel; glass on chrome only.

One feedback primitive (`src/lib/confirm.ts`): `confirm(el, {haptic:8})` = 120-160ms scale pop + opacity, guarded `navigator.vibrate`, optional muted-respecting WebAudio tick, skipped under reduced-motion. Wire into: set-log button first (core loop); RestTimer completion (keep its `[200,100,200]`, add ring-pulse, do not weaken); Food photo success vs failure; Water add/remove; ProteinStreak increments; Settings toggles. Destructive actions break the pattern: AlertDialog, no optimistic pop.

Spatial continuity via View Transitions / CSS (gate on reduced-motion): History row->detail; Train day->session; five-tab directional slide (reverse on back); Food photo->entry; CSS scroll-driven `view()` entrances for Food cards + History month groups.

Easing tokens: `--ease-out: cubic-bezier(.32,.72,0,1)`, `--ease-spring: cubic-bezier(.34,1.56,.64,1)`; ban `linear` on UI motion (RestTimer bar, goal-bar width). Retire/gate the 3.2s LoopIcon auto-loop; trigger the icon draw-on on tap/selection instead.

Squircle radii: superellipse on stat cards + Drawer sheet tops with `border-radius` fallback; concentric inner radii from `--radius-card`.

Glass / backdrop-filter (chrome only): floating glass bottom nav (`blur(20px) saturate(180%)` + hairline top border); translucent condensing header (extend `SessionView.tsx:394` to `page.tsx:54`); Drawer sheets one glass layer; Coach input dock. Do NOT glassify ramp/set tables, goal bars, history tables. `@supports` opaque fallback + near-opaque under reduced-transparency; never let glass cost `.num` legibility.

## 5. Retention & Gamification (White-Hat only)

- Streak/scoreboard as a mirror: upgrade ProteinStreakCard from a plain consecutive counter to a compounding streak with milestones (7/30/100) unlocking kept artifacts + an earned freeze. Dashboard cards become self-referential (net vs 7-day avg, this week vs last, streak vs personal best). One "since day one" lifetime accumulator line (total sessions/volume/days).
- Goal progress with no dead-end: WeightCard "reached" (`:183`) and Water "reached" (`:27`) offer the next horizon instead of a terminal state.
- Coach as compounding intelligence (the moat): visible deposit line ("learned from N sessions / 48 days of food logs") in CoachView empty state + Settings "what the coach knows"; automate + surface the deposit; occasional unpredictable White-Hat "noticing" via `insight.dailyInsight`; streak-break = partnership copy, not guilt.
- Guest-mode onboarding: personalized first Coach moment before the account step.
- Lead with intrinsic drives (Epic Meaning copy, honest Accomplishment via PRs/streaks, Empowerment via voice notes/drag/accent/Coach).

Black-Hat to AVOID: no public body/weight/calorie leaderboards; no guilt/distressed-mascot streak escalation; no randomizing engine-owned numbers (engine stays deterministic + clampAdjustment-bounded, surprise only in Coach callout timing); no parallel XP currency; no fake scarcity; no hidden lock-in (keep intelligence visible).

## 6. Prioritized Changelist

### P0 (quick, high-impact: token + micro-feedback + real bug fixes)
- Fix `--accent-foreground` in AccentSync (compute black/white from accent L); replace every hardcoded white-on-accent (CoachView 80,90,106,111; SessionView 124,432,513,742,763; CardioLogger 25,181,191,238; MedsView 38; SettingsView 76,139) and remove forced `oklch(1 0 0)` at globals.css:147.
- Stop accent-as-text below caption tier (InsightCard:37, SessionView:89, :677, VoiceLog:140).
- Add 6-step type scale tokens; replace all `[9/10/11px]` with `--text-caption` (min 12px); body/caption line-height 1.5.
- Fix both font aliases in globals.css: `--font-heading` -> display (`:12`); delete the `--font-mono: var(--font-geist-mono)` override (`:11`) so `.num` uses real Plex.
- Delete dead `--radius: 0.625rem` (`:75`); add `--radius-card`, consume in card.tsx:15 + the 3 stat cards + SessionView card const :55.
- De-brutalize RestTimer (`:35`) and VoiceLog (`:107-136`): `rounded-none border-2` -> `--radius-card`/`rounded-full` + hairline.
- Add `--accent-tint`/`--accent-tint-strong`, `--success`, `--hairline` tokens; replace inline color-mix and ad hoc `opacity-50/60/70` text.
- Standardize spacing: purge half-steps; add `--page-padding` on each view + page header/nav.
- Add shared `confirm(el,{haptic})` (`src/lib/confirm.ts`); wire the set-log button first.
- Add easing tokens; press-in `active:scale` on cards/rows/FAB lacking it.
- Raise default Button/Input/icon-button heights toward 44px (aligning the already-h-11 majority).
- Tune dark mode (card 0.16, bg 0.02, border 20%).

### P1 (per-screen structure)
- Food: camera FAB; fix food-card delete (44px + confirm/swipe); PhotoPicker X 44px; catch+inline error on submit; empty-state invite button; promote net-calories hero; extract one `StatCard`.
- Session: active-set target as `--text-display` focal; ramp table as CSS grid; destructive tokens on the finish/discard dialog; Train empty state -> `Empty` at FAB.
- History: fixed date rail + `truncate`; glanceable per-row visual; link exercise names to PR trend.
- Coach: remove accent from puck; live suggestion chips; 1.5 bubbles + inter-turn spacing; catch error bubble; tokenize chat height.
- Cross-screen: unify delete iconography; one back affordance; shared `SetTable`; replace Apple food-nav icon; `Empty` + `Skeleton` on every zero-data surface.

### P2 (deeper: motion, gamification, onboarding)
- Glass bottom nav + condensing header with fallbacks.
- View Transitions (History row->detail, tab switches, Train day->session, Food photo->entry), reduced-motion gated.
- CSS scroll-driven `view()` entrances; retire/gate the 3.2s LoopIcon auto-loop.
- Superellipse corners + concentric radii.
- Gamification: compounding streak + milestone artifacts + earned freeze; lifetime accumulators; goal "next horizon"; self-comparison mirrors.
- Coach intelligence: visible "learned from N sessions" line; unpredictable White-Hat noticing; partnership streak-break copy.
- Onboarding/guest mode: value-before-account first Coach moment; aha future-payoff graph; multi-intent goals; persistent checklist; prime-before-permission.

---

## Verified corrections captured during review
- The `.num` mono bug: `globals.css:11` overrides the layout's real IBM Plex Mono with an undefined `--font-geist-mono`, so numbers silently render in system monospace. Delete that override line.
- RestTimer already vibrates `[200,100,200]` on completion; preserve it (do not weaken to a light tap). The genuinely missing haptic is the set-log loop.
- `--card-spacing` already exists (`card.tsx:15`); build on it.
- Brutalist `rounded-none border-2 border-foreground` on RestTimer + VoiceLog contradicts the squircle language (P0 de-brutalize).
- `X` is overloaded: correct for clearing a PhotoPicker file, wrong for "remove saved exercise" in DayEditor (`SessionView.tsx:249`).

Source: distilled from `~/Documents/Ext-Brain/Tech/Design/*` (Foundations, Typography, Color, Layout, iOS Native Design, Apple HIG, Apple's Design Principles, Interaction & Motion, CSS/GSAP motion, Components & Patterns, UX & Flows, Instagram/Apple Music critiques, Gamification Architecture, Octalysis, The Intelligence Trap, Onboarding Flows/Length, Top 5 Trends, Moodboards, Lessons & Hardships) + `Tech/Extra/UX DESIGN GUIDE.md`, mapped against the current Superset code.
