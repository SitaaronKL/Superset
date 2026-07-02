# Superset Moodboard: Gym + Nutrition Apps

Two research layers, built by parallel vision agents and merged here.

- **Part 1 (Mobbin)**: real in-app flows and screens from Mobbin's curated library. Every reference links to the screen on Mobbin so you can open it.
- **Part 2 (App Store)**: official screenshot sets from 16 apps, downloaded to `design-inspo/<slug>/` (gitignored). References cite local files.

Both layers apply the same rules: one focal number per screen, accent means "your live focus", engine owns all lifting numbers, White-Hat gamification only, no em dashes.

The two layers agree on the core steals (ghost previous-set rows, whole-row commit fill, rest as overlay with one giant countdown, calories-left hero, prior-period ghost charts, calm week-strip streaks), which is the strongest possible signal to build those first.

---

# Part 1
# Mobbin Inspiration Layer: real in-app gym + nutrition flows

A merged reference for Superset (dense, mobile-first, B&W + one user accent, Anton / Hanken Grotesk / IBM Plex Mono, Apple pills). Rules applied throughout: one focal number per screen, accent means "your live focus", engine owns all lifting numbers, White-Hat gamification only, no em dashes.

---

## 1. TL;DR: the 10 strongest ideas

1. **Ghost-previous set rows, check-to-commit** (Hevy): [active squat log](https://mobbin.com/screens/c6586a84-385d-4098-888f-6c95503d1784). Each row shows SET | PREVIOUS | KG | REPS with last time as ghost text; ticking the check commits the pre-filled numbers. Edit by exception, exactly the engine-owns-numbers model.
2. **Docked rest timer with next-rec preview** (Hevy): [logging flow](https://mobbin.com/flows/7b6374ff-8ff6-4d7b-babe-077e72b6ee1f) and [Live Activity](https://mobbin.com/screens/6f5fad08-23a6-4698-9868-2289969a1d5e). Countdown becomes the temporary focal number with -15 / +15 / Skip pills, and "Next: set 2 of 3 (110 kg x 5-6)" surfaces the coming prescription during rest.
3. **Rest as a bottom sheet over the log, never navigation** (Fitbod): [rest sheet](https://mobbin.com/screens/253d6da9-a4af-4e03-b74a-3662133cbcd9). The set list stays visible behind the countdown; dismissing returns you exactly where you were.
4. **One-accent summary tile grid** (The Outsiders): [week view](https://mobbin.com/screens/d81a7928-5359-4d12-b4e9-120918c6bec1). All tiles share one type scale; exactly one tile gets accent fill, every number carries its prior-period value in small muted text.
5. **7-day trained-dot row** (Hevy): [home](https://mobbin.com/screens/79a622bd-392f-4ab4-9eb7-18e3a85fcc5c). S M T W T F S circles, filled on trained days, outline on rest days. Consistency as space, zero guilt copy.
6. **Contributor rows that explain a system-owned number** (Ultrahuman): [Dynamic Recovery Score](https://mobbin.com/screens/f7f46f35-bed5-4de8-8729-a2f2685c9366). Hero number, its own 7-day history right under it, then metric + value + status chip rows. The template for "why this rec" under the engine number.
7. **Scan-line analyzing state with result-shaped skeletons** (Yazio): [AI camera flow](https://mobbin.com/flows/0b1a85b5-c663-4c49-b613-aed10479d33a). Sweep line over the photo, grey skeletons shaped like the confirm card to come, AI-badged editable item rows.
8. **"Calories left" countdown hero with visible arithmetic** (Cal AI + MyFitnessPal): [Cal AI dashboard](https://mobbin.com/screens/cccf7c90-05cb-40d1-87a2-a1e976f2334e), [MFP diary](https://mobbin.com/screens/91bb25b0-efdf-421a-a03b-6ccb359617d2). One big remaining number, macros demoted to satellites, "Goal - Food + Exercise = Remaining" shown as the header math.
9. **Dark-mode streak moment, one number and a week strip** (Opal): [streak screen](https://mobbin.com/screens/f3d63f0f-0f36-4b11-a212-23b0c4e962d0). Near-black field, the count as the only big element, dated dot row with checkmarks, accent only on the live element. Closest existing match to Superset's language.
10. **Goal-line ribbon and latest-point callout on the weight chart** (Noom): [weight graph](https://mobbin.com/screens/9111b88c-66a6-466f-82a9-60657783bf54). "GOAL: 59 KG" tag sits on the line inside the chart; the newest point carries a value + date bubble. Bonus: [Tonal's onboarding receipt](https://mobbin.com/flows/9f597ed6-aea4-4ec7-b573-48ea7484b164) ends personalization as a black contract card, nearly pure B&W already.

---

## 2. The eight themes

### 2.1 Set logging (Train)

- **Hevy's table is the universal grammar**: SET | PREVIOUS | KG | REPS | check, ghosted suggestions, warm-ups marked "W" and separated from working sets ([squat log](https://mobbin.com/screens/c6586a84-385d-4098-888f-6c95503d1784)). Commit floods the row green and docks a 02:29 rest bar with -15 / +15 / Skip; inline exercise notes live under the name ([logging flow](https://mobbin.com/flows/7b6374ff-8ff6-4d7b-babe-077e72b6ee1f), which also contains Ladder's ring gauge putting the countdown center with reps and weight as satellites).
- **Ladder spends accent on exactly one thing**: the active cell and the commit checks, on near-black, with an in-context keypad plus lb/kg segmented toggle ([Front Squat logger](https://mobbin.com/screens/3daed3ec-2832-48af-9f73-0aab0d428f51)). Closest palette discipline to Superset.
- **Tonal and Hevy make history self-referential**: Tonal's [set breakdown](https://mobbin.com/screens/65d7538d-e628-4c08-9cff-c99245270609) is a typographic table with progression badges and delta coloring only on changed weights, its [strength tab](https://mobbin.com/screens/49b9079a-87e6-434d-802e-25a9a9858077) pairs a 1RM headline with a chart above the same table. Hevy attaches tiny trophy chips (1RM, Weight, Volume) to the exact record-setting set ([Deadlift history](https://mobbin.com/screens/4d2233ca-a56c-4244-bde5-821bf3f1b6a9)) and gives each exercise a trend line with metric toggle pills ([exercise summary](https://mobbin.com/screens/80f164aa-c011-4469-ba7a-158116427cab)).
- **Records are always self-comparison**: Fitbod stacks Projected 1RM, per-type records, then raw history lines ([Ab Crunch detail](https://mobbin.com/screens/eaec425d-75fe-4f6e-972e-9ac2ba7700ff)); Centr shows the blank weight field as the single task with reps pre-filled ([logging flow](https://mobbin.com/flows/91d9a275-24f7-4dea-b152-c96d31c7cedd)).

Also reviewed, weaker: [WHOOP's bare log](https://mobbin.com/screens/5ed82947-4ee7-4151-bafe-c036f82b979a) (0/0 inputs, no guidance).

### 2.2 In-session and rest timer (Train)

- **Rest is an overlay, not navigation.** Fitbod's [bottom sheet](https://mobbin.com/screens/253d6da9-a4af-4e03-b74a-3662133cbcd9) keeps the log visible; Gymshark's [rest overlay](https://mobbin.com/screens/f4cdbd47-9666-4c67-ae63-c75f2094254d) echoes the countdown as a small header pill after dismissal, and its [B&W variant](https://mobbin.com/screens/64a8d801-5687-488a-bf00-b0d1f33f0596) proves the whole pattern survives monochrome.
- **One giant number, everything else whispers.** Ladder's [rest screen](https://mobbin.com/screens/78f3d376-0079-4965-a370-26d3225f96a1) is a full takeover: dimmed screen, "REST 0:32" in huge condensed type, thin session progress bar, nothing else.
- **Now vs Next is always explicit.** Hevy's [Live Activity](https://mobbin.com/screens/6f5fad08-23a6-4698-9868-2289969a1d5e) previews the next prescription inline with the countdown; Runna stacks CURRENT over UP NEXT above a giant ring ([in-run rest](https://mobbin.com/screens/d016e28e-df59-456a-8635-51345b522294)) and marks set cards Active / Complete with outlines and badges, rest as an inline button per card ([circuit log](https://mobbin.com/screens/ea07706a-2073-44c7-8672-f939616ec99d)).
- **Commits feel physical.** Peloton's swipe-to-complete slider and segmented block progress ([in-class](https://mobbin.com/screens/8a9854d1-c1f9-4629-b637-e3f99ee99078)); Bevel's tinted done-rows and lightweight "Workout complete" stat pill instead of a modal ([workout log](https://mobbin.com/screens/59b85c49-2f5f-49e2-b220-04500be76db5)).

Also reviewed, off-theme: [Tonal](https://mobbin.com/screens/50541d0f-6dd5-4652-946c-0d3b655e616f) and [Tempo](https://mobbin.com/screens/f3e665da-342e-4397-9d48-53746f3c354a) (video-class hardware UIs), [MyFitnessPal stretch video](https://mobbin.com/screens/6c72735b-463f-4f57-9cd4-57a66745722b), [Runna warm-up](https://mobbin.com/screens/2bcd311f-ae9f-4365-8f9a-7ca43544e6ee) (running-specific, but same Current / Up Next header).

### 2.3 Dashboards (Train monthly stats, History)

- **Strict three-band stack**: timescale segmented pill, comparison chart (current bold, prior period as a gray ghost line), summary tile grid. The Outsiders runs it identically at [week](https://mobbin.com/screens/d81a7928-5359-4d12-b4e9-120918c6bec1) and [year](https://mobbin.com/screens/a695fefc-6acf-4131-ac13-5cc56b65249c) scale, with filter state pinned as a dismissible accent banner ([filtered variant](https://mobbin.com/screens/51346f91-d6fd-419d-92e3-290a451c5cf8)). Focal tile marked by accent fill, not size.
- **Self-comparison is baked into every number**: prior value small and muted under the current one, tiny direction glyph. Hevy frames volume as "This week 18.7k / Last week 0" ([widget grid](https://mobbin.com/screens/2e109a73-9c45-4f56-94fb-062038f53a6e)) and shows 7 day-dots plus a tile sparkline ([home](https://mobbin.com/screens/79a622bd-392f-4ab4-9eb7-18e3a85fcc5c)).
- **Composite scores get explained**: WHOOP's number-first, meaning-second, evidence-third stack ([Recovery](https://mobbin.com/screens/7bea0326-7a57-4132-9667-0373012375f9)); Ultrahuman's hero with its own 7-day mini chart and contributor rows with status chips ([Recovery Score](https://mobbin.com/screens/f7f46f35-bed5-4de8-8729-a2f2685c9366)); Oura's labeled bars with text verdicts ([Readiness](https://mobbin.com/screens/3ebbaf31-1caa-414c-a070-334ea811881a)).
- **Consistency is spatial**: Bevel's two-month heat grid with a dot-density legend plus 30-day line vs muted baseline ([fitness, last 30 days](https://mobbin.com/screens/ac7933a1-0142-40f5-9b84-41c875470981)).

Anti-patterns noted: Bevel's three equal rings ([home](https://mobbin.com/screens/746c3b08-afd9-4790-945c-ac254f31f41c), [empty state](https://mobbin.com/screens/188be10c-cc97-4b4e-9091-b854089b71ec), [daily overview](https://mobbin.com/screens/cf4048bd-7a82-44ef-893a-9e7302db773c)) and WHOOP's three competing accents in one ring ([overview](https://mobbin.com/screens/6a012278-d01c-473e-b860-3c08e35311ed)) both violate one-focal-number. [Gentler Streak Activities](https://mobbin.com/screens/81ddb60b-a773-448c-b64a-92cef5221268) confirms the Outsiders layout with softer styling.

### 2.4 Food camera (Food)

- **Four-beat flow everywhere**: entry sheet, single-control camera, animated analyzing, editable result. MyFitnessPal's [log sheet](https://mobbin.com/flows/e5e452d7-f91e-4939-9fa0-59ea87b7d47a) puts the camera one tap from the dashboard; its [Meal Scan viewfinder](https://mobbin.com/flows/950930ba-b0d0-4998-8639-854f8c0fe62d) has exactly one shutter control.
- **Analyzing state sells the AI**: Yazio's sweep line plus result-shaped skeletons ([AI camera flow](https://mobbin.com/flows/0b1a85b5-c663-4c49-b613-aed10479d33a)); BitePal's circular photo crop with "Scanning plate" ([photo-log flow](https://mobbin.com/flows/32fc5ea2-6b32-4879-bec3-33fe6f5e46c4)).
- **Result leads with one big kcal number, then a segmented macro bar, then itemized rows**: BitePal's [result screen](https://mobbin.com/screens/21c14d44-1463-4f94-9c31-95cf7e8c8925) with a floating Done pill; per-ingredient detail includes an AI accuracy thumbs up/down ([ingredient card](https://mobbin.com/screens/7ca1bb91-f8d4-4ae6-8b6f-6ba455fee606)).
- **Trust scaffolding before commit**: MFP confirms one ingredient at a time with only serving fields editable ([Confirm Ingredient](https://mobbin.com/screens/6e156cdb-f00a-49ed-8616-116ee238e3a1)) and shows match provenance with "Find a better match" ([Add Food](https://mobbin.com/screens/f27a36dd-ce06-4f3a-bdf2-d880ce881822)). Post-commit, the reward is the dashboard number visibly moving plus a toast, not confetti.

Adjacent: MacroFactor's live scan pinning parsed values to a half-sheet under the viewfinder ([label scan](https://mobbin.com/screens/e5b7e049-b388-428e-bfdb-1c552cbe0ee3)); its other screens ([label sheet](https://mobbin.com/screens/13b83764-a6e9-49ef-a7c4-5dd159685489), [nutrient list](https://mobbin.com/screens/3a72d944-543b-4386-8a9f-965d0bae75b9)) are barcode OCR, pattern transfers but not photo-scan evidence. Skip BitePal's mascot gamification.

### 2.5 Macros (Food)

- **One big remaining number, three small macro satellites.** Cal AI's "2900 Calories left" ring with macros demoted to a side column and scan entry on the same card ([dashboard](https://mobbin.com/screens/cccf7c90-05cb-40d1-87a2-a1e976f2334e)); Lifesum's "1787 KCAL LEFT" circle with recommended per-meal ranges and gentle logged-meal sparkle ([diary home](https://mobbin.com/screens/f5b416dc-beaf-44c9-885c-71beae3c648c)).
- **Show the arithmetic.** MFP pins "Goal - Food + Exercise = Remaining" as the header, accent only on the final number ([diary](https://mobbin.com/screens/91bb25b0-efdf-421a-a03b-6ccb359617d2), [variant](https://mobbin.com/screens/cb70053a-a3d8-4af6-a923-de8586a0482b)). Bevel explains provenance ("Your daily maintenance (TDEE) is 1.892 kcal") in its segmented goal ring sheet ([nutrition goal](https://mobbin.com/screens/4c7df128-c55a-49cc-9397-bb6e3f949f0e)).
- **Density via abbreviation and tabular figures.** MacroFactor's week rail with per-macro fractions and hour-by-hour meal clusters, "88 kcal, 2 P, 4 F, 11 C" one-liners ([food log](https://mobbin.com/screens/d97e258d-0226-4607-bf87-3e73034c452f)). Meal groups always carry their own subtotals on the header row ([MFP food summary](https://mobbin.com/screens/d81fad09-9a1b-4857-8e5e-7c1db586f01e), [1853 cal variant](https://mobbin.com/screens/8edabf60-e408-437f-af5f-ba7504fcf3e2)).
- **Rings work in monochrome.** Lifesum renders three near-B&W rings over a plain ledger table ([stats detail](https://mobbin.com/screens/984557df-af51-4e3f-ac20-4b419e943cd2)), direct proof for Superset's palette.

Skipped: MFP macro pies ([1](https://mobbin.com/screens/ceeffbc1-24f3-4f36-a096-88a116412038), [2](https://mobbin.com/screens/6abce9e6-8ed7-4eb8-981f-c680266c03a5)) read poorly; Lifesum goal-comparison screens ([1](https://mobbin.com/screens/cbeabbd9-b40b-4a4a-a0d4-12ca89e41362), [2](https://mobbin.com/screens/d5dfe5ad-4417-4cb1-9ceb-34017995a061)) are settings education, not daily layouts.

### 2.6 Streaks (Train, Food, History)

- **Vertical formula everywhere**: flame, giant count (the one focal number), label, week strip, encouragement line, full-width pill CTA. Seen in [Duolingo](https://mobbin.com/screens/5d22bea8-1bb7-4b51-ae4b-5b3d75f1fed4), [Speak](https://mobbin.com/screens/7acbb2fc-3817-408f-9db3-25380bb43706), [Mimo](https://mobbin.com/screens/50b53621-5021-4d85-a1a3-488ce49bea8d), and best of all [Opal](https://mobbin.com/screens/f3d63f0f-0f36-4b11-a212-23b0c4e962d0), whose near-black screen with one glowing element maps 1:1 onto B&W + accent.
- **Milestones bridge to the next one, confirmations are re-pledges**: Yazio's "Now, let's go for the 7-day milestone" with "I'm Committed" ([3 Day Milestone](https://mobbin.com/screens/7c901d3e-fe7b-441f-bb89-75cd282d8c4c)); Me+ uses the same pill over a dimmed Today screen ([overlay](https://mobbin.com/screens/55df22a2-c3c6-4961-9e2e-b5eba22518a2)).
- **Locked state as ghost outline, earned as ink**: Nike Training Club's unearned trophy is a pale outline with the earn condition and a CTA routing to the earning action ([Twelve Months in a Row](https://mobbin.com/screens/53fe86f3-2eed-4701-8f31-91ddd0cb597c); grids: [achievements](https://mobbin.com/screens/a682f917-c6de-41e3-bd04-78ab26ca438c), [milestones](https://mobbin.com/screens/729e26ca-cd85-44f2-aaf6-ed6cf58cd517)).
- **Tiered progress plus quiet toasts**: Ladder's hero medal with a live "28 / 50" ring and per-badge running counts ([badges](https://mobbin.com/screens/596685a2-58bd-4f29-9766-5fa80836ed48)); its earn moment is a pill toast, not a takeover ([earn moment](https://mobbin.com/screens/7b497200-e56e-41f8-a058-50683b2c590b)). Deepstash teaches mechanics once at streak start so later celebrations stay wordless ([Streak Started](https://mobbin.com/screens/b6ff9a48-6196-4bcb-9997-66807ced786c), [sibling](https://mobbin.com/screens/4d3e1e86-117d-4a0f-b37b-bc73b759a3c7)).

Weak references, flat equal-weight badge grids with no focal number: [Tempo](https://mobbin.com/screens/cfa9b025-2494-47a1-bf96-73f2520d990c), [Aaptiv](https://mobbin.com/screens/af160eae-8e27-44c9-9b7b-bb2b7140a4a3), [ClassPass](https://mobbin.com/screens/d6e0ff25-dc8e-4331-8e1c-b6eaa1133cb8).

### 2.7 Progress: weight charts and PR moments (Food, History, Train)

- **Goal as a labeled ribbon inside the chart, latest point annotated**: Noom's "GOAL: 59 KG" tag on the line plus a value + date callout on the newest dot ([weight graph](https://mobbin.com/screens/9111b88c-66a6-466f-82a9-60657783bf54), [My progress variant](https://mobbin.com/screens/342f2fa2-7628-47bb-9039-7cfdbe9f7d2c)); logging is confirmed with a toast anchored to the new point on the chart itself ([logged state](https://mobbin.com/screens/1c0c44f5-473b-41ce-9df5-0f1e4b43d3b5)); forecasts terminate at a labeled goal marker, "120 lb by June 22" ([prediction](https://mobbin.com/screens/a617cbce-d0e0-4f6f-a2e1-3c74a6065931)).
- **Average as headline, range pills adjacent, actions under the chart**: Zero's weight sheet ([screen](https://mobbin.com/screens/3d22dad7-1473-4f48-bbf2-8c36ef488cf4)); Alma teaches the layout even with sparse data, dashed goal line, 1W/1M/6M/1Y pills, per-entry source badges ([empty card](https://mobbin.com/screens/06ca92f2-5573-47ff-a753-0adcd866334d), [populated](https://mobbin.com/screens/d5d1920d-5970-4437-92d8-e9097400bac1)).
- **Celebrations are metric-first, modal, forward-routing**: Zero's badge leads with the number and self-comparison copy ([streak badge](https://mobbin.com/screens/d32012ab-e874-4838-88fd-2e233bee7fd9)); MFP headlines the concrete stat and routes forward ([fast completion](https://mobbin.com/screens/f421e52f-7b7b-4c50-af74-7df022c37070)); Fitbit's "GOAL MET" status card under the trend chart is the goal-state feedback pattern, if visually cluttered ([weight screen](https://mobbin.com/screens/2707444c-e290-4e06-a09d-63d5317658d1)).
- **Notable gap**: no true "PR after a lift" screen surfaced anywhere on Mobbin; Superset gets to invent it by adapting the streak/completion modal structure.

Skipped as irrelevant: [Slowly](https://mobbin.com/screens/c07e763c-420a-4529-bdc5-dc6f72b94a05), [Skillshare](https://mobbin.com/screens/81762058-a358-4516-af84-c5cd091ee1dc), [Ahead](https://mobbin.com/screens/5e574d2f-5a35-4d35-9bfa-b8772a5998df), [YouTube](https://mobbin.com/screens/6eb5a002-1775-4e82-bb60-46727db30fbe), [Finch](https://mobbin.com/screens/daadf0e2-db9a-428c-9266-b5f1b8ed7db5) (achievement popups for other domains), and [Noom's Noomcoin](https://mobbin.com/screens/51261323-c198-47b1-a527-3b860399f268) (currency mechanics, off-brand for White-Hat rules).

### 2.8 Onboarding (first run, Settings)

- **One question per screen, thin progress bar, receipt at the end.** Tonal's flow ends with a black contract card, three labeled checkmark rows above one CONFIRM, and its height/weight rulers put the value huge with a single accent tick at the current position ([fitness profile flow](https://mobbin.com/flows/9f597ed6-aea4-4ec7-b573-48ea7484b164)).
- **Gather a real baseline, not just answers.** Equinox+ runs a physical self-assessment framed as "this helps us get a feel for your baseline", uses monochrome bordered chips with selection shown by border weight, and ends by stating program obligations up front ([program personalization flow](https://mobbin.com/flows/754cee5d-c1f4-44a7-9ae9-5e09474db3a3)).
- **Personalization converts to action inside the flow.** pliability asks one low-pressure question per screen then immediately offers a 5-minute session ([customize flow](https://mobbin.com/flows/55148cf9-a50f-41d4-b9b0-e8e836ca850d)); Apple Fitness has the user set their first number themselves, giant editable "250 CALORIES/DAY" with steppers and presets that instantly become the ring target ([onboarding flow](https://mobbin.com/flows/79b43469-df97-431e-adbb-8d59875ed7fc)).
- **Paywalls, if ever needed**: Gentler Streak's outcome checklist with "Cancel Anytime" beside the CTA ([paywall](https://mobbin.com/screens/84b5e474-c513-47c6-a408-970d25ef6df0)); Ladder's black screen, white headline, per-month price math, one yellow accent, is exactly the B&W-plus-one-accent recipe ([paywall](https://mobbin.com/screens/d5705369-7a8d-4cf8-bccc-59f5996fd8a5)).

Skipped: [Sweatcoin](https://mobbin.com/screens/7a044619-b43d-47ca-829e-0f640fc656f9) (Black-Hat coin mechanics), [Fitplan](https://mobbin.com/screens/3891a094-fc28-424f-af34-942024a25902) and [Aaptiv](https://mobbin.com/screens/39aaa99b-cbce-4685-8c83-125567ee66c5) (photography and social proof, off-system); Tonal's follow-your-friends screen conflicts with the no-leaderboards rule.

---

## 3. Prioritized steal list

Accent discipline for everything below: accent marks exactly one live element per screen (the rec, the next-rec line, the today dot, the goal tag, the protein segment). Done-states are ink inversion, never green; over-budget is plain black, never red.

### S (small)

| # | Steal | Screen | Source | Notes / backlog overlap |
|---|-------|--------|--------|-------------------------|
| S1 | Docked rest timer bar: mono countdown as temporary focal number, -15 / +15 pills, Skip separate | Train | [Hevy flow](https://mobbin.com/flows/7b6374ff-8ff6-4d7b-babe-077e72b6ee1f), [Live Activity](https://mobbin.com/screens/6f5fad08-23a6-4698-9868-2289969a1d5e) | Engine owns duration |
| S2 | Header echo pill of remaining rest after sheet dismissal, tap to reopen | Train | [Gymshark](https://mobbin.com/screens/f4cdbd47-9666-4c67-ae63-c75f2094254d) | **Overlaps P2 glass nav**: the echo pill should live in or beside the glass header so they ship as one surface |
| S3 | Active / Complete set treatment: 1px accent outline + ACTIVE mono badge on the current set, inverted check chip and dimmed text on done sets | Train | [Runna](https://mobbin.com/screens/ea07706a-2073-44c7-8672-f939616ec99d), [Bevel](https://mobbin.com/screens/59b85c49-2f5f-49e2-b220-04500be76db5) | |
| S4 | Optional full-screen "focus rest": black, REST + countdown in Anton, thin progress bar only | Train | [Ladder](https://mobbin.com/screens/78f3d376-0079-4965-a370-26d3225f96a1) | **Overlaps P2 View Transitions**: takeover in/out is the natural first VT |
| S5 | Inline PR chips (1RM, WT, VOL) on the exact record-setting set, B&W outline with accent text | History | [Hevy Deadlift history](https://mobbin.com/screens/4d2233ca-a56c-4244-bde5-821bf3f1b6a9) | Feeds existing PR trend drawers |
| S6 | One-accent monthly summary tile grid, prior-month value in muted `.num` plus direction glyph on every tile | Train stats | [The Outsiders](https://mobbin.com/screens/d81a7928-5359-4d12-b4e9-120918c6bec1) | |
| S7 | 7-day trained-dot row, accent-filled trained days, outline rest days, no guilt state | Train or History header | [Hevy home](https://mobbin.com/screens/79a622bd-392f-4ab4-9eb7-18e3a85fcc5c) | |
| S8 | Scan-line analyzing state over the photo with result-shaped skeletons, accent sweep line | Food camera | [Yazio](https://mobbin.com/flows/0b1a85b5-c663-4c49-b613-aed10479d33a) | Pure CSS |
| S9 | Commit toast + animated net-calorie hero counting to its new value ("Logged. +306 cal, +13g protein") | Food | [MFP flow](https://mobbin.com/flows/e5e452d7-f91e-4939-9fa0-59ea87b7d47a) | Reward is the number moving |
| S10 | Provenance caption under the AI estimate: "AI estimate" + thumbs or "Not right? Edit items" | Food confirm sheet | [BitePal](https://mobbin.com/screens/7ca1bb91-f8d4-4ae6-8b6f-6ba455fee606), [MFP](https://mobbin.com/screens/f27a36dd-ce06-4f3a-bdf2-d880ce881822) | Food AI only; engine numbers never on this surface |
| S11 | Countdown hero restyle: huge mono "kcal left" in accent with a gray "goal - eaten + burned = left" math line beneath | Food | [Cal AI](https://mobbin.com/screens/cccf7c90-05cb-40d1-87a2-a1e976f2334e), [MFP diary](https://mobbin.com/screens/91bb25b0-efdf-421a-a03b-6ccb359617d2) | |
| S12 | Protein / Carbs / Fat satellite trio with hairline black progress bars, protein first and slightly larger | Food | [Lifesum](https://mobbin.com/screens/f5b416dc-beaf-44c9-885c-71beae3c648c) | |
| S13 | Partial accent ring on the protein streak card with "12 / 14" mono scale to next milestone | Food | [Ladder badges](https://mobbin.com/screens/596685a2-58bd-4f29-9766-5fa80836ed48) | **Overlaps P2 compounding streaks** |
| S14 | Ghost-outline NEXT milestone numeral with earn condition and a "Start today's session" deep link to Train | History | [NTC](https://mobbin.com/screens/53fe86f3-2eed-4701-8f31-91ddd0cb597c) | **Overlaps P2 compounding streaks** |
| S15 | Coach milestone bridge chip: "7 days. Next stop, 14." Count from a pure engine-layer streak function, Coach only phrases it | Coach | [Yazio](https://mobbin.com/screens/7c901d3e-fe7b-441f-bb89-75cd282d8c4c) | **Overlaps P2 compounding streaks** |
| S16 | Log-in-place confirmation: new point animates onto the weight/water chart with an anchored "Logged 71.4" toast | Food | [Noom](https://mobbin.com/screens/1c0c44f5-473b-41ce-9df5-0f1e4b43d3b5) | |
| S17 | Range pills (1M/6M/1Y) that relabel the axis without reflowing the chart | History PR drawers | [Alma](https://mobbin.com/screens/06ca92f2-5573-47ff-a753-0adcd866334d), [Zero](https://mobbin.com/screens/3d22dad7-1473-4f48-bbf2-8c36ef488cf4) | |
| S18 | Tonal-style receipt confirmation ending first-run: inverted cards (YOUR GOAL / STARTING NUMBERS / PROTEIN TARGET), engine-computed starting weights visible from minute one | First run / Settings | [Tonal flow](https://mobbin.com/flows/9f597ed6-aea4-4ec7-b573-48ea7484b164) | **Overlaps P2 guest onboarding**: the receipt is the guest-to-account conversion moment |
| S19 | Monochrome chip grid for goal/equipment multi-select, 2px accent border on selected, capped picks, thin progress bar + "2/5" label | First run | [Equinox+ flow](https://mobbin.com/flows/754cee5d-c1f4-44a7-9ae9-5e09474db3a3) | **Overlaps P2 guest onboarding** |
| S20 | Immediate payoff close: "Start a 10-minute calibration session" with quiet "Not now", routing straight into Train | First run | [pliability flow](https://mobbin.com/flows/55148cf9-a50f-41d4-b9b0-e8e836ca850d) | **Overlaps P2 guest onboarding** |

### M (medium)

| # | Steal | Screen | Source | Notes / backlog overlap |
|---|-------|--------|--------|-------------------------|
| M1 | Ghost-previous set rows: SET \| LAST \| KG \| REPS under the focal rec, last session in muted ink, engine rec pre-filled in accent, one-tap round check to commit, accent advances to the next set | Train | [Hevy](https://mobbin.com/screens/c6586a84-385d-4098-888f-6c95503d1784) | The core Train upgrade; do first among Ms |
| M2 | Rest bottom Drawer with next-rec preview: huge mono countdown, -15s/+15s black pills, Skip ghost pill top-right, accent line "Next: 3 of 4, 82.5 kg x 6" straight from the engine | Train | [Fitbod](https://mobbin.com/screens/253d6da9-a4af-4e03-b74a-3662133cbcd9), [Hevy](https://mobbin.com/screens/6f5fad08-23a6-4698-9868-2289969a1d5e), [Runna](https://mobbin.com/screens/d016e28e-df59-456a-8635-51345b522294) | Supersedes S1 if built directly |
| M3 | Swipe-to-commit set logging: slide-to-complete pill labeled "SLIDE TO LOG 82.5 x 6" with engine numbers verbatim | Train | [Peloton](https://mobbin.com/screens/8a9854d1-c1f9-4629-b637-e3f99ee99078) | Prevents accidental logs |
| M4 | "Why this number" contributor strip under the rec: last result, trend, clamp bound, each row with a status chip; values from `engine.ts`, LLM phrases labels only | Train | [Ultrahuman](https://mobbin.com/screens/f7f46f35-bed5-4de8-8729-a2f2685c9366), [WHOOP](https://mobbin.com/screens/7bea0326-7a57-4132-9667-0373012375f9) | Trust-builder for engine-owned numbers |
| M5 | Override keypad Drawer: big custom keypad, kg/lb segmented pill, live "+2.5 vs rec" delta, Done runs `clampAdjustment` | Train | [Ladder](https://mobbin.com/screens/3daed3ec-2832-48af-9f73-0aab0d428f51) | M/L boundary |
| M6 | Exercise header stat strip in PR drawers: one huge accent 1RM, since-date in mono, sparkline, set table with per-set progression pills | History | [Tonal](https://mobbin.com/screens/65d7538d-e628-4c08-9cff-c99245270609), [strength tab](https://mobbin.com/screens/49b9079a-87e6-434d-802e-25a9a9858077), [Fitbod](https://mobbin.com/screens/eaec425d-75fe-4f6e-972e-9ac2ba7700ff) | |
| M7 | Ghost-line comparison in PR drawers: current e1RM in accent, prior period as thin gray, "vs. last 8 weeks" caption | History | [Outsiders year](https://mobbin.com/screens/a695fefc-6acf-4131-ac13-5cc56b65249c), [Gentler Streak](https://mobbin.com/screens/81ddb60b-a773-448c-b64a-92cef5221268) | |
| M8 | Food confirm sheet: huge mono kcal, B&W segmented macro bar (protein segment gets the accent), AI-badged deletable ingredient rows with per-row kcal, totals recompute live, single "Log it" pill | Food | [BitePal result](https://mobbin.com/screens/21c14d44-1463-4f94-9c31-95cf7e8c8925), [Yazio](https://mobbin.com/flows/0b1a85b5-c663-4c49-b613-aed10479d33a), [MFP confirm](https://mobbin.com/screens/6e156cdb-f00a-49ed-8616-116ee238e3a1) | |
| M9 | Meal-group ledger: Breakfast/Lunch/Dinner/Snack Item lists, group kcal right-aligned on headers, abbreviated P/C/F grams, one "+" pill per group opening the camera | Food | [MFP summary](https://mobbin.com/screens/d81fad09-9a1b-4857-8e5e-7c1db586f01e), [MacroFactor](https://mobbin.com/screens/d97e258d-0226-4607-bf87-3e73034c452f) | |
| M10 | Segmented goal ring in a Drawer for calorie/protein goal edits, engine target centered, provenance sentence ("Based on your weight and training volume") | Food settings | [Bevel](https://mobbin.com/screens/4c7df128-c55a-49cc-9397-bb6e3f949f0e) | |
| M11 | Streak moment overlay after session finish: streak count in Anton at hero size, accent week strip, mono day numbers, "I'm committed" pill; full-screen reserved for weekly milestones, day-to-day gets a quiet "Streak: 6" toast | Train | [Opal](https://mobbin.com/screens/f3d63f0f-0f36-4b11-a212-23b0c4e962d0), [Yazio](https://mobbin.com/screens/7c901d3e-fe7b-441f-bb89-75cd282d8c4c), [Ladder toast](https://mobbin.com/screens/7b497200-e56e-41f8-a058-50683b2c590b) | **Overlaps P2 compounding streaks + View Transitions** (overlay entrance) |
| M12 | PR moment as a metric-first Drawer: Anton "NEW PR", giant mono engine number, "Previous best 100 x 5, Mar 12", accent "Keep going" pill, quiet "View trend" link | Train | [Zero](https://mobbin.com/screens/d32012ab-e874-4838-88fd-2e233bee7fd9), [MFP](https://mobbin.com/screens/f421e52f-7b7b-4c50-af74-7df022c37070) | No app on Mobbin has this screen; net-new territory |
| M13 | Goal-line ribbon on the weight chart: accent "GOAL 72.0" pill tag on the line, accent ring + mono callout on the latest point, dashed-goal empty state as the zero-data teach | Food | [Noom](https://mobbin.com/screens/9111b88c-66a6-466f-82a9-60657783bf54), [Alma](https://mobbin.com/screens/06ca92f2-5573-47ff-a753-0adcd866334d) | |
| M14 | Big-number goal setter for protein and net-calorie targets: giant `.num`, round +/- steppers, Cut / Maintain / Gain presets from engine defaults, edits bounded by clamp-style limits | Food onboarding / Settings | [Apple Fitness flow](https://mobbin.com/flows/79b43469-df97-431e-adbb-8d59875ed7fc) | **Overlaps P2 guest onboarding** |

### L (large)

| # | Steal | Screen | Source | Notes |
|---|-------|--------|--------|-------|
| L1 | Two-month consistency heat grid: grayscale density, accent only on today, tap-to-jump into the existing date rail | History | [Bevel](https://mobbin.com/screens/ac7933a1-0142-40f5-9b84-41c875470981) | Needs per-day aggregation query plus rail wiring |
| L2 | Projected-goal tick on the weight card: dotted slope projection to the goal crossing, labeled "~Aug 14" in mono; computed by a pure `engine.ts`-territory function, never the LLM | Food | [Noom prediction](https://mobbin.com/screens/a617cbce-d0e0-4f6f-a2e1-3c74a6065931) | Edge cases: flat or diverging trends |
| L3 | Baseline calibration as the first Train session: 2-3 calibration sets per lift framed as measurement, rec number focal as usual, results feed `engine.ts` starting values | Train / first run | [Equinox+ flow](https://mobbin.com/flows/754cee5d-c1f4-44a7-9ae9-5e09474db3a3) | **Overlaps P2 guest onboarding**: the calibration session is the guest hook, pairs with S18-S20 |

### Suggested sequencing

1. **Train core loop first**: M1 + M2 (with S1-S3 folded in), then S5-S7 for stats and history. This is where engine-owned numbers become visible product.
2. **Food trust layer second**: S8-S12 + M8-M9, cheap wins that make the AI pipeline feel accountable.
3. **Streaks and celebration third**, shipped together with the P2 compounding-streaks work so S13-S15 and M11-M12 land as one system, not scattered confetti.
4. **Onboarding last but designed early**: S18-S20 + M14 + L3 define the guest-onboarding P2 item end to end; the receipt screen (S18) doubles as the account-creation conversion point.

---

# Part 2

# Gym + Nutrition App Moodboard for Superset

Sources: 16 valid apps analyzed (2 discarded as junk: `final-weight-loss-keep-lose-it` is shovelware, `whoop-triggerz-plus` is a church music tool, not fitness). Screenshots for every reference live in `design-inspo/<slug>/` (e.g. `design-inspo/strong-workout-tracker-gym-log/01.png`).

---

## 1. TL;DR: The 10 Strongest Ideas

1. **Ghost previous-set values inside the set input row** (Strong, echoed by Hevy and Ladder): last session's "40kg x 7" as muted text beside the engine's prescribed target. Self-comparison built directly into the table.
2. **Whole-row completion fill** (Strong, Hevy): completing a set floods the entire row, so the set table doubles as a session progress bar with zero extra chrome.
3. **Rest timer as a single focal countdown ring with exactly three actions** (-10s / +10s / Skip) (Strong, with gauge variants in Ladder, Gymshark, Yazio): the purest "one focal number per screen" moment in the whole space.
4. **"Calories left" as the Food hero, with eaten/burned satellites** (Cal AI, Lifesum, Foodvisor, Yazio): every serious nutrition app leads with the derived remaining budget, not raw intake.
5. **Itemized AI callout pills overlaid on the food photo** (Cal AI, fatsecret): the AI's estimate becomes explainable and per-item correctable, the single biggest trust pattern for photo logging.
6. **Prior-period ghost overlay plus delta chip on trend charts** (Strava): current window in accent, same window one period back as a solid muted ghost line with a removable comparison pill, "12% more" in plain language. The best White-Hat pattern anywhere in this set.
7. **"DAY 14 / 66" focal-fraction streak framing with a week of check circles** (Gymshark66, with calm ring-calendar variants in MacroFactor and Ladder): compounding commitment, no fire emoji, no guilt.
8. **One giant focal rep number in the live-set view with a "next up" footer** (40 Caliber Fitness follow-along player): context line, exercise name, one huge number, next exercise previewed in a slim bottom bar.
9. **Hero-stat-then-dense-list History layout** (Nike Training Club): one big numeral floating in whitespace above a tight reverse-chronological list. NTC is also the closest mainstream validation of Superset's whole B&W + condensed-caps identity.
10. **Active-set spotlight table** (Fitbod): current set as outlined editable inputs, future sets dimmed plain numerals, so one glance shows exactly which set is live and what the algorithm prescribes.

---

## 2. THEMES

### Dashboards and hero metrics
- **Nike Training Club** (`nike-training-club/04.png`): centered hero numeral "29 / Total Workouts", one small secondary stat, then a dense month-grouped session list. The strongest single screen in the whole corpus for History.
- **Fitbod** (`fitbod-gym-fitness-planner/03.png`): two-stat hero pair ("3 DAYS SINCE YOUR LAST WORKOUT / 5 FRESH MUSCLE GROUPS") that makes algorithm state visible and legible.
- **Strava** (`strava-run-bike-walk/04.png, 09.png`): borderless label-over-number stat grids, tiny gray label above a large number, units inside the number string.
- **MacroFactor** (`macrofactor-macro-tracker/08.png`): a 4x7 nutrition matrix (cal/P/F/C by day) with a "Consumed | Remaining" pill that reframes the entire grid in one tap.
- **Fito** (`fito-fitness-streak-calorie/02.png`): three-number month summary strip (kcal, hours, times) above the calendar.
- **Gymshark** (`gymshark-training-and-fitness/05.png`): "RESUME plan" hero card putting one clear next action above all stats.

**Superset application:** Train's monthly stats adopt the NTC/Fitbod hierarchy: one Anton-scale focal number (sessions or volume), one engine-derived companion stat ("3 days since last session"), Strava-style borderless mono stat grid below, and a single resume-style "what's next" pill on top.

### Workout logging and set tables
- **Strong** (`strong-workout-tracker-gym-log/01.png`): the crown jewel. Set # / Previous / kg / Reps / check columns; previous performance as ghost placeholder text; pending sets pre-filled for one-tap accept; per-exercise volume chip; quiet "+ Add Set" row.
- **Fitbod** (`fitbod-gym-fitness-planner/04.png`): active set as outlined inputs with floating labels, upcoming sets dimmed, set-number badges down the left rail, per-exercise pill row (rest, History, Replace).
- **Hevy** (`hevy-workout-tracker-gym-log/02.png`): sticky Duration/Volume/Sets strip pinned above the list, updating live; completed rows flood green.
- **Ladder** (`ladder-strength-training-plans/06.png`): "Previous" column beside the target, effort percentage in accent, rest blocks as first-class rows between exercises.
- **Gymshark** (`gymshark-training-and-fitness/04.png`): "Target 10 x 20 Kg" printed above the input, the app states the prescription and the user confirms.

**Superset application:** this theme is Superset's home turf. The Train set table combines Strong's ghost-previous and whole-row fill, Fitbod's live-row spotlight, Gymshark's eyebrow "TARGET 5 x 82.5 KG" line, and Hevy's sticky stat strip. Accent lives only on the live row; `convex/engine.ts` owns every printed number, and the ghost column makes that visibly true.

### Rest timers and in-session coaching
- **Strong** (`strong-workout-tracker-gym-log/04.png`): huge countdown in a ring, total small beneath, exactly -10s / +10s / Skip, auto-start on set completion.
- **Ladder** (`ladder-strength-training-plans/07.png`): semicircular gauge arc with next set's reps and weight flanking the countdown, "Set 1 of 3" pill.
- **Gymshark** (`gymshark-training-and-fitness/04.png`): thin accent ring countdown with round context and BACK/SKIP pills.
- **40 Caliber Fitness** (`40-caliber-fitness/08.png`): live-set hierarchy of context line, exercise name, one giant rep number, plus a "next up" footer bar previewing the following exercise.
- **Fito** (`fito-fitness-streak-calorie/01.png`): sticky full-width bottom bar carrying the live timer above the tab bar.
- **Yazio** (`ai-calorie-tracker-by-yazio/02.png`): full countdown-card anatomy (status line, ring, big time, pill CTA, two editable columns below) transplantable to rest.
- **FitOn** (`fiton-workouts-fitness-plans/04.png`): one-question-per-section pill chips, a model for bounded coach quick-replies instead of free text.

**Superset application:** rest becomes a takeover with one huge IBM Plex Mono countdown in a draining accent ring, the engine's next prescription flanking it, and three pill actions. When the coach needs input mid-session, it offers FitOn-style pill options that `clampAdjustment` bounds, never free numbers.

### Food logging and AI camera flows
- **Cal AI** (`cal-ai-calorie-tracker/02.png, 03.png`): the reference flow. Corner-bracket viewfinder, floating pill callouts naming each detected item with kcal, confirm sheet with serving stepper, editable stat tiles, and a "Fix Results" re-prompt pill.
- **fatsecret** (`calorie-counter-by-fatsecret/09.png`): per-ingredient callout pills plus a voice/text transcript card showing exactly what the AI parsed before committing.
- **Foodvisor** (`foodvisor-ai-calorie-counter/03.png`): result as one big kcal pill with macro chips demoted beneath, the exact hierarchy Superset wants.
- **MacroFactor** (`macrofactor-macro-tracker/03.png, 04.png`): batch-commit chip queue, persistent macro strip visible during camera and search, bottom-docked search field.
- **Lifesum** (`lifesum-ai-calorie-counter/04.png`): "Same as yesterday?" one-tap repeat, and a persistent daily-budget card that stays visible while logging.

**Superset application:** the Food camera keeps its pipeline but adopts brackets while framing (accent while analyzing), item callout pills on the result photo, a confirm Drawer with editable tiles and a deterministic serving stepper (multiplication in code, not the LLM), a "Fix Results" follow-up turn, and a slim persistent budget strip so day impact is visible before accepting. "Same as yesterday" is the cheapest friction win in the entire moodboard.

### Macro/calorie visualization (rings, bars, budgets)
- **Yazio** (`ai-calorie-tracker-by-yazio/01.png`): remaining-first ring hero with fractional macro meters (31/82g) beneath.
- **Cal AI** (`cal-ai-calorie-tracker/01.png`): countdown hero with state words ("Protein over", "Carbs left") so status reads without decoding a ring.
- **Foodvisor / Lifesum** (`foodvisor-ai-calorie-counter/08.png`, `lifesum-ai-calorie-counter/01.png`): eaten / burned / left triptych around the focal number; tap-to-fill glass icons for water; discrete fill-the-icon quotas.
- **Strava** (`strava-run-bike-walk/05.png`): segmented composition bar, dense proportional data in 16px of height, a native B&W alternative to tri-color rings.
- **MacroFactor** (`macrofactor-macro-tracker/03.png`): four hairline fraction bars in a slim persistent strip.

**Superset application:** net-calorie hero reframed as one giant mono "left" number with small eaten/burned satellites; below it one thin segmented bar (protein segment in accent, everything else gray) instead of multi-color rings; water as tap-to-fill outline glasses. One focal number per card, protein is the only colored macro because the streak is the live focus.

### Streaks, gamification, retention mechanics
- **Gymshark66** (`gymshark-training-and-fitness/01.png`): "DAY 1 / 66" with the day number focal and the denominator muted, day circles with checks, habit checklist. Commitment framing without guilt. Steal the framing only: the source's habit chips are full-bleed gradients, which anti-pattern 9 rejects.
- **MacroFactor** (`macrofactor-macro-tracker/05.png, 06.png`): ring-calendar month of circular day tokens, "Streak 624 days" as hero. The calmest, most adult streak treatment in the set.
- **Ladder** (`ladder-strength-training-plans/02.png, 03.png`): weekly check-chip strip, filled checks for done days, ring for today, plain letters ahead.
- **fatsecret** (`calorie-counter-by-fatsecret/01.png, 06.png`): streak header over the diary, plus a milestone ladder where locked badges show explicit criteria (14 / 21 / 28 days).
- **Strong** (`strong-workout-tracker-gym-log/05.png, 06.png`): lifetime counter (874 workouts) and a workouts-per-week bar chart with a target line; missed weeks render lighter, never red.
- **Fito** (`fito-fitness-streak-calorie/02.png`): photo-thumbnail month calendar and GitHub-style year heatmaps, "I showed up" texture.
- **fatsecret** (`calorie-counter-by-fatsecret/07.png`): Week in Review summary card as a retention touchpoint.

**Superset application:** protein streak becomes a Gymshark-style focal fraction with a week of check circles; History gains a MacroFactor ring calendar and a lifetime session counter; consistency charts get Strong's target line with reduced-opacity (never red) misses. All self-vs-self, all compounding, zero leaderboards.

### Progress charts and PR celebration
- **Strava** (`strava-run-bike-walk/07.png`): the standout. Current period in accent over a solid muted prior-period ghost line, delta chip, removable "Prior 3 months" comparison pill, plain-language summary strip ("You've logged 12% more distance").
- **Fitbod** (`fitbod-gym-fitness-planner/10.png`): estimated-strength hero card, one huge number, dotted goal line the trend visibly kisses, swipeable per-exercise cards.
- **Hevy** (`hevy-workout-tracker-gym-log/03.png`): PR ribbon badge overlapping the chart corner, pill toggles re-slicing one chart four ways (Heaviest, e1RM, Volume, Reps).
- **Ladder** (`ladder-strength-training-plans/08.png`): stat-tile quartet above the chart, dotted PR markers on the line.
- **MacroFactor** (`macrofactor-macro-tracker/01.png, 07.png`): Average plus signed Difference stat pair above every chart; raw scale weight thin, smoothed trend bold, teaching trust in the trend.
- **Gymshark** (`gymshark-training-and-fitness/05.png`): personal bests as thin-stroke circle badges, number and unit stacked inside, trophies without leaderboards.
- **Lifesum** (`lifesum-ai-calorie-counter/06.png`): sentence-first chart header ("Current weight: 63 kg"), chart demoted to evidence.
- **Foodvisor** (`foodvisor-ai-calorie-counter/07.png`): twin delta pills ("since start" / "since last weigh-in") over the trend.

**Superset application:** History PR drawers get the full stack: sentence-first Anton header, Average + Difference pair, pill metric toggles, dotted all-time-PR line, and the Strava prior-period ghost as the celebration mechanic. Weight tracking (roadmap) uses MacroFactor's dual-line smoothing computed in a pure Convex function. PB circle badges make a dense trophy row on History.

### Onboarding and value framing
- **Cal AI** (`cal-ai-calorie-tracker/01.png` through `04.png`, read as a marketing sequence): the whole pitch is a three-step story (snap, confirm, track), three-word benefit headlines.
- **MacroFactor** (`macrofactor-macro-tracker/02.png`): sells the algorithm and the ethics ("unique coaching algorithm that adapts to your metabolism", "no ads or ad networks" on `05.png`), the closest philosophical match to engine-owns-the-numbers.
- **Hevy** (`hevy-workout-tracker-gym-log/01.png`): verb-first promise rhythm (LOG / GET / STAY) with the payoff word in accent.
- **Ladder** (`ladder-strength-training-plans/09.png`): one question per screen, segmented progress dashes, SKIP always available.
- **Fitbod** (`fitbod-gym-fitness-planner/07.png`): dense grouped checklists instead of one-card-per-option bloat.
- **Yazio** (`ai-calorie-tracker-by-yazio/05.png`): difficulty-graded picker (its fasting-tracker chooser) with a recommended default pinned on top and one plain sentence per option. Steal the structure, strip the emoji mascots (anti-pattern 6).
- **NTC / FitOn / Lifesum** (`nike-training-club/01.png`, `fiton-workouts-fitness-plans/01.png`, `lifesum-ai-calorie-counter/08.png`): trust stacking with awards and press, but also before/after imagery, which Superset must skip.

**Superset application:** guest onboarding (P2 backlog) tells the Cal AI three-step story in Superset's voice ("Lift. The engine does the math."), uses Ladder's one-question flow with skip, and Yazio's graded picker for progression aggressiveness where every option shows real engine parameters in mono. Sell the engine like MacroFactor sells its algorithm.

---

## 3. VISUAL LANGUAGE TRENDS

**Two camps dominate the space.** Serious lifting apps go dark monochrome with one hot accent: Ladder (acid chartreuse), Strava (orange), Fitbod (pink-red), Gymshark (near-total B&W), NTC (B&W with volt only on the live number). Nutrition apps go pastel wellness: Foodvisor, Lifesum, Yazio, Fito, with serif or rounded type, mascots, and multi-hue macro coding. Superset should **conform to the first camp**, which is already its identity, and treat NTC and Ladder as proof the identity is commercially validated. The interesting move is applying the dark-discipline camp's language to the Food tab, where nobody else does; a B&W nutrition surface is genuinely differentiated.

**Conform:** pills are universal (chips, CTAs, segmented toggles) and match Superset's Apple-pill DNA; big-number-over-tiny-gray-label hierarchy is the industry standard stat unit; letterspaced all-caps eyebrow labels (Gymshark, Fitbod, Ladder, Lifesum) are the cheapest polish pattern in the set; condensed heavy caps display type (Gymshark, Ladder, NTC) validates Anton exactly; dark-first for training surfaces.

**Deliberately diverge:** almost nobody uses a true monospace numeral face, so IBM Plex Mono `.num` is a real differentiator for data density; reject multi-hue macro coding (universal in nutrition, from Cal AI's three hues to Foodvisor's four) in favor of protein-only accent; reject photography-as-structure (Gymshark, FitOn, 40 Caliber lean on photos where Superset uses type and data as texture); reject Strong's three-accent system (blue interactive, green done, purple data) and express those states through inversion, weight, and fill instead; reject NTC's severity of square corners, keeping the pill radius.

**Accent discipline is the through-line of the best apps.** NTC's volt appears only on the live rep count; Strava's orange only on the active thing; Ladder's chartreuse only on live/logged elements. Formalize it as one rule with a per-surface focus: **one accented element per screen, and it is always the live focus of that surface.** On Train during an active set, that is the engine's target number, decaying to the neutral ink on completion. On Food, it is the protein segment and streak, because protein is the goal under active pursuit. Rest takeover: the draining ring. Nothing else on the screen gets color.

---

## 4. ANTI-PATTERNS TO AVOID

1. **Rainbow accents per metric** (40 Caliber's green/blue/orange cards, Foodvisor and Lifesum macro hues, Strong's three-color system). Dilutes accent meaning; Superset encodes category with weight and fill, never hue.
2. **Leaderboards, social feeds, and head-to-head comparison** (Fito friend rankings, Hevy's STRONGER comparison and follower counts, Strava segments and CR crowns, fatsecret community). Explicitly banned; the only competitor is your past self.
3. **Before/after transformation proof** (Yazio, Foodvisor, FitOn). External-comparison bait, off-philosophy even in marketing.
4. **Unexplainable judgment scores** (Cal AI's "Health score 7/10" on `cal-ai-calorie-tracker/03.png`, Lifesum's "Life Score 105"). Vague numbers no engine owns; violates engine-owns-the-numbers. Foodvisor's one-word verdict chip from a fixed vocabulary is the acceptable alternative.
5. **Photography as structure and one-card-per-scroll density** (40 Caliber, FitOn). Airy photo cards read as template-grade and waste the screen; Superset stays dense.
6. **Mascots and emoji as iconography** (Yazio fox and emoji fasting plans, Foodvisor avocado, Fito bear). Softens data authority; lucide only.
7. **Instant-commit AI logging with no correction path.** The trustworthy apps (Cal AI, fatsecret, MacroFactor) all insert a verify step: callout pills, transcript cards, batch queues. Never let an LLM estimate write straight to the log.
8. **Guilt states** (red missed days, scolding copy). Strong's model is right: below-target renders at reduced opacity, empty days are neutral, praise is the only editorial voice.
9. **Decorative gradients and washes** (Lifesum aurora, fatsecret mountains, Gymshark66's gradient habit chips, MacroFactor marketing fields). They steal saturation from the one accent.

---

## 5. PRIORITIZED STEAL LIST

### Tier 1: Small cost, do first
| Item | Source | Superset screen | Notes |
|---|---|---|---|
| Ghost previous-set values in set rows | Strong 01, Hevy 02, Ladder 06 | Train set table | Engine target pre-filled, ghost display-only |
| Whole-row completion fill (invert or low-opacity accent) | Strong 01, Hevy 02 | Train set table | Table becomes session progress bar |
| "TARGET 5 x 82.5 KG" eyebrow above set inputs | Gymshark 04 | Train set table | Makes engine ownership visible |
| Eyebrow labels (letterspaced caps section headers) | Gymshark 05, Fitbod 10, Ladder | All tabs | Near-zero cost, systemwide polish |
| Dot-separated mono meta lines ("Push · 5 exercises · 42 min") | NTC 01, Fitbod, Yazio 03 | History rows, Food day headers | Density win everywhere |
| Hero-numeral-then-list History layout | NTC 04 | History | One big mono number, month headers, dense list |
| Delta chip beside focal numbers ("▲12% vs last month") | Strava 07 | Train stats, Food hero | Engine math, one line |
| "Left" hero with eaten/burned satellites | Lifesum 01, Foodvisor 08, Cal AI 01 | Food net-calorie hero | Restructure of existing card |
| Segmented macro bar, protein in accent | Strava 05, Yazio 01 | Food, under hero | Replaces any ring temptation |
| Tap-to-fill glass row for water | Foodvisor 08, Lifesum 07 | Food WaterCard | Outline glasses, accent fill |
| "Same as yesterday?" one-tap repeat | Lifesum 04 | Food | Biggest friction cut per line of code |
| "Fix Results" bounded re-prompt pill | Cal AI 03 | Food confirm Drawer | One follow-up LLM turn |
| Weekly check-chip strip | Ladder 02, Gymshark66 01, 40 Caliber 06 | Train header, Food streak | **Overlaps P2 compounding streaks** |
| "DAY N" focal-fraction streak header | Gymshark66 01 | Food protein streak | **Overlaps P2 compounding streaks**; no gradient chips |
| Target line on consistency bars, lifetime counter | Strong 05, 06 | Train monthly stats | Misses fade, never red |
| Inverted-chip selection state | NTC 08 | Filters, date rails | Selection = inversion, no tints |
| One-line session mood note | Strong 01 | Train finish, History rows | Also feeds Coach context |
| Text-labels-become-pill time range selector (1W 1M 3M ALL) | MacroFactor 01 | All chart drawers | shadcn ButtonGroup |
| Fading stacked Anton empty states ("SQUAT. BENCH. DEADLIFT.") | FitOn 03 | History, Food empty states | **Feeds guest onboarding (P2)** |
| Two-tone headline emphasis (accent on the one load-bearing word) | FitOn 03, Hevy 01 | PR drawer titles, heroes | One-line rule; counts as the screen's one accent |
| Comma-joined exercise preview under session titles | Hevy 04 | History cards | Month scannable in one pass |

### Tier 2: Medium cost, high payoff
| Item | Source | Superset screen | Notes |
|---|---|---|---|
| Rest-timer takeover: mono countdown in accent ring, -10/+10/Skip, next prescription flanking | Strong 04, Ladder 07, Gymshark 04 | Train | The signature in-session moment; pairs with **P2 View Transitions** for the set-to-rest morph |
| Active-set spotlight table (live row outlined, future rows dimmed) | Fitbod 04 | Train | Accent only on the live row |
| Sticky live session strip (Duration / Volume / Sets) | Hevy 02, Fito 01 | Train active session | Sticky bar is the natural home for the **P2 glass nav** treatment |
| Giant focal rep number + "next up" footer in live-set view | 40 Caliber 08 | Train | Purest one-number screen |
| AI callout pills on food photos | Cal AI 03, fatsecret 09 | Food result Drawer | LLM returns item array, code sums |
| Confirm sheet: editable stat tiles + deterministic serving stepper | Cal AI 03 | Food Drawer | Math in code, never the LLM |
| Persistent budget strip during camera/search | MacroFactor 03/04, Lifesum 04 | Food logging flow | Context never disappears |
| Batch-commit chip queue | MacroFactor 03 | Food | Correct AI output before it counts |
| Prior-period ghost overlay on trend charts | Strava 07 | History PR drawers | Best White-Hat celebration mechanic; ghost is solid muted, removable pill |
| PR drawer upgrade: sentence-first header, stat-tile quartet, dotted PR line, pill metric toggles, PR seal | Lifesum 06, Ladder 08, Fitbod 10, Hevy 03 | History | One composite component |
| Scale-vs-trend dual weight line + Average/Difference pair | MacroFactor 07, 01 | Food weight (roadmap) | Smoothing as pure Convex function |
| Ring-calendar month view for streaks | MacroFactor 05/06, Fito 02 | Food streak, Train stats | **Overlaps P2 compounding streaks** |
| Milestone ladder with visible locked criteria | fatsecret 06 | Streak surfaces | Monochrome medallions, accent when earned |
| PB circle badges row | Gymshark 05 | History | Tap opens existing trend drawer |
| Session detail bento grid | Fito 04, Strava 04 | History session drawer | Volume as hero tile |
| Pill-chip bounded coach quick-replies | FitOn 04 | Coach, Train sheets | LLM proposes, clampAdjustment bounds |
| Graded progression picker with real engine params in mono | Yazio 05 | Settings / onboarding | **Overlaps P2 guest onboarding**; structure only, no mascots |
| One-question onboarding with skip + three-step value story | Ladder 09, Cal AI 01-04 | Onboarding | **Directly is P2 guest onboarding** |
| Voice/photo transcript confirmation card | fatsecret 09 | Food | Verify inputs, code computes |
| Effort-percentage accent opacity | Ladder 06 | Train set table | Needs small engine.ts bucket function |

### Tier 3: Large cost, only if earning it
| Item | Source | Superset screen | Notes |
|---|---|---|---|
| Muscle heatmap silhouette on session detail | Strava 04, Fitbod 03 | History drawer | Needs exercise-to-muscle map + SVG assets; the one visual no dense list can replicate |
| Week in Review generated summary drawer | fatsecret 07 | Train or Food | Scheduled Convex job, coach copy bounded to engine stats |
| Year-view mini heatmaps | Fito 02 | History year toggle | After the ring calendar ships |

**P2 backlog cross-reference:** compounding streaks are the most heavily validated backlog item in this corpus (Gymshark66, MacroFactor, Ladder, fatsecret, Strong all converge on the same calm, self-referential mechanics); guest onboarding should copy the Ladder + Cal AI + MacroFactor trio (one question per screen, three-step story, sell the algorithm); glass nav's natural anchor is the sticky live-session strip from Hevy/Fito; View Transitions earn their keep on the set-row-to-rest-takeover morph and the card-to-drawer expansion in History.