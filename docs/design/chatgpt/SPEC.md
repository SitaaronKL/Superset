# Superset × ChatGPT iOS design spec

The user asked for Superset to copy the ChatGPT iOS app "as much as possible".
This spec is the translation. Reference screens (from Mobbin) live next to this
file; open them. They are light mode; Superset is dark mode, so map white
surfaces to the dark tokens below, never invert the layout.

Superset stays dark only, keeps the user's accent color (ChatGPT has an accent
setting too), and keeps its content. Everything else follows ChatGPT.

## 1. Typography: SF Pro only

- The system font (SF Pro) everywhere. No Anton, no Hanken Grotesk, no uppercase
  display titles, no letter-spaced uppercase eyebrows.
- Numbers use SF with tabular figures (`fontVariant: ["tabular-nums"]`), not a
  monospace font.
- Ramp (dark mode):
  - Large page title: 28 bold (the sidebar's "ChatGPT").
  - Nav bar / sheet title: 17 semibold, centered.
  - Section header in a list: 17 semibold, label color, sentence case ("Recents").
  - Grouped-section header above an inset card: 15 regular, secondary label, sentence case ("Account").
  - Body / row title: 17 regular.
  - Row subtitle / secondary: 15 regular, secondary label.
  - Footnote under a group: 13 regular, secondary label.
  - Big metric (the one hero number on a screen): 44 to 56 semibold, tabular.
- Weight carries hierarchy. Never uppercase for emphasis.

## 2. Color (dark)

| Token | Value | Use |
| --- | --- | --- |
| bg | `#000000` | Page. ChatGPT dark is true black. |
| surface | `#1c1c1e` | Inset-grouped cards, composer, suggestion cards |
| surface2 | `#2c2c2e` | Tiles in sheets, pressed rows, chips |
| sheet | `#1c1c1e` | Bottom sheets and form sheets |
| label | `#ffffff` | |
| secondaryLabel | `rgba(235,235,245,0.6)` | |
| tertiaryLabel | `rgba(235,235,245,0.3)` | chevrons, placeholders |
| separator | `rgba(84,84,88,0.6)` hairline | only between rows inside a grouped card |
| accent | user accent | links, toggles on, selection, the one primary action |

The primary button is white fill with black text (ChatGPT's black send button,
inverted for dark). Accent is used sparingly.

## 3. Page chrome

- No big boxed headers. A page is: large title top left (28 bold), optional
  gray subtitle, and top-right a **glass pill** holding 1 to 2 circular icon
  buttons (SF Symbols, 20pt, e.g. `gearshape`, `plus`, `magnifyingglass`).
  See `sidebar.webp`, `chat-thread-simple.webp`.
- Floating circular glass buttons (44pt) for back / close / menu, never a
  bordered circle.
- The primary create action is a **floating dark pill** bottom right above the
  tab bar: icon + label ("Log food", "Start"), like the sidebar's "Chat" button.
  Not a round accent FAB.
- Content scrolls edge to edge and fades under the status bar and tab bar
  (keep `Screen` + `ScreenFades`).

## 4. Lists and grouping

- Two list styles, pick per content:
  - **Plain list** (`sidebar.webp`): rows directly on the page, icon (SF Symbol,
    22pt, label color) + 17 regular title, ~52pt tall, no separators, no card.
    Sections separated by a 17 semibold header and 24 to 32pt of space.
    Use for navigation lists, history, recents.
  - **Inset grouped** (`settings-*.webp`): rounded card (radius 26, continuous)
    in `surface`, rows with a leading SF Symbol icon, title, trailing gray value
    and/or chevron, hairline separators inset past the icon. Section header
    above in 15 secondary, footnote below in 13 secondary.
    Use for settings, forms, a day's checklist.
- Never nest a card in a card. Never outline a card with a border.

## 5. Sheets (`sheet-attach-tiles.webp`, `sheet-add-sources.webp`, `sheet-list-sources.webp`)

- Use `Sheet` from `@/components/ui/sheet` for every bottom sheet. It already
  handles the surface color, drag handle clearance, gutters, and bottom spacing.
- Sheet header like ChatGPT: centered 17 semibold title, circular glass close
  button (X) on the right, optional pill text action ("Save") on the right
  instead. Left: circular back when nested.
- Action sheets: an optional top row of 2 to 3 square tiles (surface2, radius 18,
  SF Symbol over a 15pt label: Camera / Photos / Files), then plain rows:
  icon + title + gray subtitle, no separators.
- Content inside sheets is transparent over the sheet surface.

## 6. Chat (Coach and Skin "Ask")

- `chat-thread-*.webp`. Assistant: no bubble, full-width 17pt text, **bold**
  lead-ins, bullets, numbered lists, and a thin rule between sections. Under
  each assistant reply a row of small (18pt) gray action icons: copy, speaker,
  thumbs up, thumbs down, share, more. Implement copy (expo-clipboard if
  installed, otherwise omit), others optional.
- User: right-aligned bubble in `surface2`, radius 20, 17pt, max 80% width.
- Composer: floating capsule, `surface`, height 52: `+` on the left, placeholder
  "Ask anything", mic glyph, and a 36pt round white send button with a black
  arrow (turns into the button when text is present).
- Empty thread: nearly blank; two-line suggestion cards (bold 15 title, gray 15
  subtitle, surface, radius 18) in a horizontal scroll right above the composer
  (`empty-cards-dark.webp`), or a short icon + label list (`empty-list.webp`).
- Thinking state: a small pulsing dot, then text streams in.

## 7. Menus, toasts, dialogs

- Long-press = native context menu with SF Symbol icons, destructive item red
  (`context-menu.webp`, `archived-menu.webp`).
- Confirmations = native alert / confirmation dialog.
- Transient status = a small glass pill toast at the top ("Saved").

## 8. Motion

- Native feel: sheets and menus are native. Presses dim to 0.6 or highlight the
  row, no bouncy scaling on rows. Checkmarks can spring. No staggered entrances.

## 9. Superset specifics

- Train, Food, Skin, History are "home" screens: large title + glass pill
  actions + content. The one hero number on a screen (calories left, streak)
  is the only big type.
- Keep all data wiring. This spec changes presentation only.
- No em dashes or en dashes in any copy.

## 10. More patterns (from the second Mobbin sweep)

- `sheet-photo-strip.webp`: an attach sheet whose first row is a camera tile
  followed by a horizontal strip of recent photos, with a small header row
  ("ChatGPT" left, "All Photos" accent link right). Use it for logging food and
  adding face photos.
- `project-tabs.webp`: a page title with an icon, then small pill tabs
  ("Chats" / "Sources"), selected tab in surface2, others plain secondary text.
  Use it for switching views inside a tab (Skin: Today / Routine / Photos).
- `apps-list.webp`: a rounded pill search field, then rows with a 40pt rounded
  icon, title, gray subtitle, chevron. Use it for product and exercise lists.
- `edit-sheet.webp`: sheet with centered title, X on the right, a full-width
  rounded field, and a full-width pill primary button pinned at the bottom.
- `checklist-card.webp` (and the user's screenshot of the research plan with
  filled checkmarks and a progress bar): a single card with a 17 semibold
  title, rows of circle checkboxes that fill white with a black check when done,
  multi-line 17pt text, and a thin progress bar with a status line at the
  bottom. This is the model for the Skin checklist (one card per slot).
- `login-sheet.webp`: centered logo, 22 title "Log in or sign up", gray
  subtitle, rounded email field, full-width pill primary "Continue", an OR
  divider, then outline pill buttons. Model for the sign-in screen. The
  "Welcome to ChatGPT" screen (large left title, icon + bold title + gray
  body rows, pill Continue at the bottom) is the model for any intro screen.
- `share-sheet-footer-button.webp`: a sheet whose primary action is a
  full-width pill pinned to the bottom.

## 11. Onboarding, forms, feedback (from the user's Mobbin screenshots)

- Auth and setup steps are sheets: circular glass back (left) and X (right),
  centered monochrome logo, 20 regular title, 15 gray subtitle centered,
  fields, then the full-width pill primary. The primary is gray/disabled until
  the form is valid, then white (dark mode). Tiny underlined footer links.
- Fields: rounded rect (radius 12, surface, 1px faint outline), floating label:
  placeholder alone when empty, a 11pt label above the value once filled.
- Choice lists: plain rows with a circle radio on the left (17 regular), the
  selected one filled. Question as a centered 26 regular title above.
- Moments: centered text ("You're all set." with a small filled check,
  "Nice to meet you, Dhruv.") on an empty page.
- Tour / feature intro: a floating card at the bottom (surface, radius 28):
  22 regular centered title, 15 gray text, full-width pill "Next", plain text
  "Skip Tour" / "Not now" below.
- Toast: small glass pill at the top ("Message copied", "Saved"), auto-hides.
- Share/preview sheet: circular X left, circular ? right, centered title,
  gray explanatory paragraph, a preview card, full-width accent button.
