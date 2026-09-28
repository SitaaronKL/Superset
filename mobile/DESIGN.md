> **Superseded in part (Sep 2026):** the app now copies the ChatGPT iOS design.
> Read `docs/design/chatgpt/SPEC.md` first; where it conflicts with this file
> (fonts, uppercase eyebrows, title style, colors), the spec wins. SF Pro
> replaced Anton, Hanken Grotesk, and Plex Mono. Use `Sheet` for every bottom sheet.

# Mobile design system

Dark-only iOS. Feels like a first-party Apple app crossed with ChatGPT iOS: dense, calm, surface contrast instead of boxes. Import tokens from `@/lib/theme`. Import components from `@/components/ui/kit`.

Anton (uppercase) for page titles and hero numbers only. Hanken Grotesk for all UI text. IBM Plex Mono for numbers (`Num`). One user accent from `useTheme().accent`. Continuous-curve corners (`squircle` / `borderCurve: "continuous"`). No em dashes or en dashes in any copy.

## Tokens

### Space (4pt grid)

`space`: 4, 8, 12, 16, 20, 24, 32, 40, 56.

Spacing tiers, never a flat 16 everywhere:

| Tier | Token | Use |
| --- | --- | --- |
| Row | `gap.row` (8) | Inside a card or between stacked rows |
| Group | `gap.group` (16) | Between sibling cards / clusters |
| Section | `gap.section` (32) | Between titled blocks on a screen |
| Screen edge | `gap.screen` (16) | Scroll content padding on the x-axis |

`useScreenInsets()` already clears the status bar and tab bar. Do not add extra top/bottom safe-area hacks.

### Type

Use `<T variant="...">` or the named primitives. Do not invent font sizes.

| Variant | Size | Font | Use |
| --- | --- | --- | --- |
| `title` | 34 | Anton | Page titles (`ScreenTitle`) |
| `title2` | 22 | Hanken semibold | In-screen section titles |
| `headline` | 17 semibold | Hanken | Row titles, emphasized UI |
| `body` | 17 | Hanken | Default reading text |
| `callout` | 16 | Hanken | Secondary paragraphs |
| `subhead` | 15 | Hanken | Subtitles, supporting copy |
| `footnote` | 13 | Hanken | Section headers/footers, hints |
| `caption` | 12 | Hanken | Eyebrows, chips, meta |

`Display` is Anton (titles). `Num` is IBM Plex Mono with tabular figures. `Eyebrow` is uppercase caption.

### Radius

`sm` 10, `control` 14 (44pt pills/fields), `card` 22, `sheet` 28. Pair every non-capsule radius with `squircle`.

### Surfaces (dark)

Hierarchy from luminance, not 1px borders.

| Token | Hex | Use |
| --- | --- | --- |
| `bg` | `#070707` | Screen root |
| `groupedBg` | `#0c0c0e` | Grouped list page behind sections |
| `elevated` | `#1c1c1e` | Cards, inset-grouped blocks |
| `elevated2` | `#2c2c2e` | Nested chips, pressed rows, fields |
| `separator` | hairline white 12% | List row rules only |
| `label` / `secondaryLabel` / `tertiaryLabel` | white steps | Primary / secondary / tertiary text |

Legacy aliases still work: `card` = elevated, `fg` = label, `mutedFg` = secondaryLabel, `hairline` = separator.

### Elevation

`elevation.rest`, `raised`, `overlay` (`boxShadow` strings). iOS is a low-shadow platform. Prefer surface contrast. Reach for elevation on floating controls (FAB) and overlays, not on every card.

### Motion

`motion.duration`: press 120, fast 150, base 250, slow 400.
`motion.spring.snappy` `{ duration: 280, dampingRatio: 0.86 }`.
`motion.spring.gentle` `{ duration: 400, dampingRatio: 1 }`.

Press feedback is under 150ms. Sheets and checks may spring. Tab switches never slide. Do not stagger fade-in on every visit. Respect `useReducedMotion()`.

Haptics (`@/lib/haptics`): `tap()` on buttons and rows, `success()` on completion (CheckCircle), `warning()` on blocked/destructive. One haptic per user action, same frame as the visual.

## Components

| Component | When to use |
| --- | --- |
| `Screen` + `ScreenFades` + `useScreenInsets` | Every tab screen. Fades after scroll content, before FABs. No solid black bars. |
| `ScreenTitle` | Large Anton title, optional subtitle, right accessory (gear, etc.). |
| `T` | All UI copy. Pick a variant. Do not set `fontSize` on screens. |
| `Display` | Anton titles when you need a custom size. Prefer `ScreenTitle` at the top of a tab. |
| `Body` | Existing screens. New copy should use `T`. |
| `Eyebrow` | Uppercase micro-label above a group. |
| `Num` | Weights, reps, calories, any numeric value. |
| `Card` | A single grouped cluster (week dots, a metric stack). No border. Do not wrap every row in its own Card. |
| `Section` + `Row` | Inset-grouped lists (settings-style). Header, rows with hairlines, footer. |
| `Row` | Title, subtitle, leading icon, trailing value/chevron. Highlight on press, never scale. |
| `Pill` | Primary/outline/accent actions. Scales to 0.97. |
| `IconButton` | Circular SF Symbol control. `glass` or `plain`. |
| `Field` | Text input on `elevated2`, 44pt, control radius. |
| `Stat` | Label + mono number + delta chip. |
| `Skeleton` | Known-layout loading. Never a flashing "Loading..." line. |
| `EmptyState` | True empty (fetch already resolved with nothing). SF Symbol, not emoji. |
| `CheckCircle` | Completable items. Scale spring + success haptic when checking. |

Native controls from `@expo/ui` for sheets, pickers, toggles, menus, confirmation dialogs. SF Symbols via `expo-symbols` `SymbolView` (or `IconButton`). Do not introduce Lucide/emoji for new chrome.

Press roles: **buttons** scale 0.97 or dim. **Rows** highlight background (`elevated2`). Never `TouchableOpacity`.

## Do

- Group with background + hairlines. One Card (or `Section`) per cluster.
- Lead with the task under `ScreenTitle`. Content fades under status bar and tab bar.
- Keep stale content while refetching. Skeletons only for the first load of a known layout.
- Present pickers and settings as native sheets (`formSheet` or `@expo/ui` BottomSheet) with a grabber.
- Fire haptics on the user action, not on mount.

## Don't

- Wireframe borders on every container. Hairlines are for list rows.
- Nested cards, or a card around each row (Everything's a Card).
- Emoji as icons. Custom floating pill tab bars. Staggered list entrance on every visit.
- Scale a full-width row on press (The Squish Reflex).
- Centered web modals or an X-only sheet with no swipe-to-dismiss.
- `alert()` for success or routine undoable actions.
- Hardcoded hex, font sizes, or spacing outside the theme, except a commented optical nudge.
