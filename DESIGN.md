---
name: My OJ
description: A calm paper desk for competitive programming, where cobalt is the pen and verdicts are the stamps.
colors:
  cobalt-ink: "oklch(52% 0.19 258)"
  cobalt-ink-hover: "oklch(43% 0.2 262)"
  cobalt-wash: "oklch(95% 0.028 256)"
  cobalt-text: "oklch(43% 0.2 262)"
  paper: "oklch(98.6% 0.005 250)"
  raised-paper: "oklch(99.4% 0.003 250)"
  ink: "oklch(21% 0.028 262)"
  ink-2: "oklch(36% 0.022 260)"
  muted-ink: "oklch(50% 0.018 258)"
  well: "oklch(96.2% 0.008 252)"
  hairline: "oklch(90% 0.009 252)"
  rule-2: "oklch(83% 0.012 252)"
  field-edge: "oklch(64% 0.02 256)"
  skeleton: "oklch(92% 0.009 252)"
  destructive: "oklch(52% 0.19 27)"
  destructive-soft: "oklch(96% 0.025 27)"
  destructive-ink: "oklch(50% 0.19 27)"
  success: "oklch(60% 0.14 150)"
  success-soft: "oklch(96% 0.03 150)"
  success-ink: "oklch(50% 0.12 150)"
  warning: "oklch(72% 0.15 75)"
  warning-soft: "oklch(96.5% 0.04 85)"
  warning-ink: "oklch(52% 0.12 70)"
  verdict-accepted: "oklch(0.72 0.16 150)"
  verdict-accepted-ink: "oklch(0.45 0.12 150)"
  verdict-wrong-answer: "oklch(0.56 0.2 27)"
  verdict-wrong-answer-ink: "oklch(0.48 0.18 27)"
  verdict-time-limit: "oklch(0.76 0.15 80)"
  verdict-time-limit-ink: "oklch(0.47 0.1 70)"
  verdict-memory-limit: "oklch(0.6 0.15 50)"
  verdict-memory-limit-ink: "oklch(0.47 0.12 48)"
  verdict-runtime-error: "oklch(0.5 0.19 350)"
  verdict-runtime-error-ink: "oklch(0.46 0.17 350)"
  verdict-compile-error: "oklch(0.68 0.13 295)"
  verdict-compile-error-ink: "oklch(0.46 0.15 295)"
  verdict-system-error: "oklch(0.55 0.02 260)"
  verdict-system-error-ink: "oklch(0.45 0.02 260)"
  verdict-partial: "oklch(0.66 0.1 190)"
  verdict-partial-ink: "oklch(0.45 0.08 195)"
  verdict-pending: "oklch(0.7 0.015 260)"
  verdict-pending-ink: "oklch(0.48 0.02 260)"
  verdict-judging: "oklch(0.53 0.19 262)"
  verdict-judging-ink: "oklch(0.45 0.17 262)"
  chart-1: "oklch(52% 0.19 258)"
  chart-2: "oklch(0.62 0.13 210)"
  chart-3: "oklch(0.65 0.12 160)"
  chart-4: "oklch(0.7 0.14 80)"
  chart-5: "oklch(0.6 0.12 30)"
typography:
  display:
    fontFamily: "Familjen Grotesk, system-ui, sans-serif"
    fontSize: "1.728rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.028em"
  wordmark:
    fontFamily: "Familjen Grotesk, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.028em"
  title:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.25rem
  label:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SF Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt-ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-ink-hover}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.paper}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
    height: "36px"
  badge-neutral:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 6px"
    height: "22px"
  badge-primary:
    backgroundColor: "{colors.cobalt-wash}"
    textColor: "{colors.cobalt-text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 6px"
    height: "22px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  dialog:
    backgroundColor: "{colors.raised-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  verdict-tile:
    textColor: "{colors.verdict-pending-ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.lg}"
    size: "36px"
  verdict-pill:
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 9px"
    height: "22px"
---

# Design System: My OJ

## Overview

**Creative North Star: "The Judge's Desk"**

My OJ is a quiet paper desk where the only colour is the ruling. The canvas is a cool, near-white paper; the text is a blue-black ink; structure is drawn with hairlines and shallow wells rather than fills or shadows. One cobalt accent is the pen: it marks the single primary action on a screen, the links, the active navigation item and the focus ring, and it appears nowhere else. The verdicts are the stamps: a ten-colour vocabulary, validated for colour-vision deficiency, that is spent only on the judge's answer and never borrowed for decoration or status elsewhere.

The mood is calm, precise and trustworthy. The system never competes with the problem statement or the contestant's code; on the solve screen everything recedes so that the judge's answer, arriving test by test in the ladder of numbered tiles, is the loudest object. Density comes from a tight 1.2 type ratio, tabular figures and 36px controls rather than from cramped spacing. Dark mode is derived from the same Cobalt palette with the hues held fixed, not inverted, and every shadow becomes a one-pixel inset hairline.

Three confirmed rejections: no gradients or decorative colour; no resting shadows on cards or tables; no entrance animation on contestant-facing pages.

**Key Characteristics:**
- Paper, then a hairline, then a well, then a card: depth is tonal, four steps deep, and flat at rest.
- One accent (Cobalt Ink) spent on action, link, focus and the active nav underline only.
- Verdict colours belong to verdicts; status elsewhere uses the three semantic inks (success, warning, destructive).
- Three typefaces with strict jobs: Familjen Grotesk for the page title and wordmark, IBM Plex Sans for everything else, JetBrains Mono for code, sample I/O and machine identifiers.
- Radii never exceed 8px; motion is a 120ms or 220ms state change, never a flourish.

## Colors

A cool-cast neutral family with one saturated accent and a reserved verdict vocabulary; colour is spent on meaning only.

### Primary
- **Cobalt Ink** (oklch(52% 0.19 258)): the one accent. Primary button fill, link colour, focus ring, the active nav item's 2px underline, the judging tile's pulse and chart series one. Deepens to **Cobalt Ink Hover** (oklch(43% 0.2 262)) on hover, which is also the **Cobalt Text** ink used on the primary badge.
- **Cobalt Wash** (oklch(95% 0.028 256)): the accent as a tint. Primary badge background and the avatar fallback. Text selection uses the accent at 22% over transparent.

### Neutral
- **Paper** (oklch(98.6% 0.005 250)): page canvas, card and sidebar background. Cards do not change tone from the page; a hairline separates them.
- **Raised Paper** (oklch(99.4% 0.003 250)): popovers, dialogs, dropdown menus and the switch thumb. The only surface lighter than the page, so an overlay reads as lifted.
- **Ink** (oklch(21% 0.028 262)): body text, headings, values.
- **Ink 2** (oklch(36% 0.022 260)): secondary text, inactive nav items, ghost button labels, neutral badge text.
- **Muted Ink** (oklch(50% 0.018 258)): table headers, labels in metadata pairs, placeholders, slugs, scrollbar thumb.
- **Well** (oklch(96.2% 0.008 252)): the recessed tone. Hover rows, hover on secondary and ghost buttons, the segmented control track, inline code background, disabled inputs.
- **Hairline** (oklch(90% 0.009 252)): default border on cards, dividers, table body rows, header bottom edge, badge border.
- **Rule 2** (oklch(83% 0.012 252)): the firmer edge. Table head bottom border, secondary and outline button border, metadata separators.
- **Field Edge** (oklch(64% 0.02 256)): input border, chosen for 3:1 against paper; also the hover border on secondary buttons.
- **Skeleton** (oklch(92% 0.009 252)): loading placeholders, swept toward oklch(96.8% 0.007 252).

### Semantic status (not verdicts)
- **Destructive** (oklch(52% 0.19 27)) with **Destructive Soft** (oklch(96% 0.025 27)) and **Destructive Ink** (oklch(50% 0.19 27)): the delete button, danger badge text, invalid field border, the 3px left rule on a warned table row.
- **Success** (oklch(60% 0.14 150)) with **Success Soft** (oklch(96% 0.03 150)) and **Success Ink** (oklch(50% 0.12 150)): online judge servers, saved toasts, success badge text.
- **Warning** (oklch(72% 0.15 75)) with **Warning Soft** (oklch(96.5% 0.04 85)) and **Warning Ink** (oklch(52% 0.12 70)): stale servers, the contest-mode notice strip on the solve screen.

### Verdict vocabulary
Each verdict has a **mark** colour (fills, tiles, chart slices, icons) and an **ink** (text). Adjacent pairs were validated at a colour-vision-deficiency ΔE of at least 9.8.
- **Accepted** mark oklch(0.72 0.16 150), ink oklch(0.45 0.12 150).
- **Wrong Answer** mark oklch(0.56 0.2 27), ink oklch(0.48 0.18 27).
- **Time Limit Exceeded** mark oklch(0.76 0.15 80), ink oklch(0.47 0.1 70).
- **Memory Limit Exceeded** mark oklch(0.6 0.15 50), ink oklch(0.47 0.12 48).
- **Runtime Error** mark oklch(0.5 0.19 350), ink oklch(0.46 0.17 350).
- **Compile Error** mark oklch(0.68 0.13 295), ink oklch(0.46 0.15 295).
- **System Error** mark oklch(0.55 0.02 260), ink oklch(0.45 0.02 260).
- **Partial** mark oklch(0.66 0.1 190), ink oklch(0.45 0.08 195).
- **Pending** mark oklch(0.7 0.015 260), ink oklch(0.48 0.02 260).
- **Judging** mark oklch(0.53 0.19 262), ink oklch(0.45 0.17 262). The judging mark is the accent's hue, so a running submission visibly belongs to the pen.

Dark mode redefines every token above on `:root[data-theme="dark"]` in `src/assets/main.css` with the hue held: paper becomes oklch(17% 0.012 262), ink oklch(94% 0.008 255), and Cobalt Ink lightens to oklch(62% 0.16 258). Verdict inks brighten for text contrast while the marks keep their chroma.

### Named Rules
**The One Pen Rule.** Cobalt Ink appears on the one primary action of a view, on links, on the focus ring and on the active nav underline. Never on a heading, an icon, a border or a background.

**The Stamp Rule.** Verdict colours are spent only on verdicts: chips, tiles, pills, chart slices and the console badge. Any other status uses success, warning or destructive. A passed test stays quiet (an 11% tint) so the failures carry the colour.

**The Soft Tint Rule.** A coloured surface is always the mark mixed into the card at 11% to 24% in OKLCH, never a flat fill; the only solid fills in the system are the primary and destructive buttons.

## Typography

**Display Font:** Familjen Grotesk (with system-ui, sans-serif)
**Body Font:** IBM Plex Sans (with ui-sans-serif, system-ui, Segoe UI, sans-serif)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, SF Mono, monospace)

**Character:** A tight grotesk headline over a plain, highly legible humanist sans, with a true monospace reserved for what a machine produced. The pairing reads as an engineer's desk, not a magazine: the display face is confined to two places, so the page is almost entirely Plex and Mono.

### Hierarchy
The scale ratio is 1.2 and every size carries its own line height: xs 0.75rem/1rem, sm 0.875rem/1.25rem, base 1rem/1.5rem, lg 1.2rem/1.6, xl 1.44rem/1.3, 2xl 1.728rem/1.15.
- **Display** (Familjen Grotesk 600, 1.728rem, line height 1.1, tracking -0.028em): the page h1 only. The `.font-display` class sits outside the layers so its tracking and weight hold against any size utility.
- **Wordmark** (Familjen Grotesk 600, 1.2rem): the "MOJ" mark in the header; the second and last permitted use of the display face.
- **Title** (IBM Plex Sans 600, 1.2rem, line height 1.3): section headings and the h1/h2 inside rich problem statements. Admin section headings use 500.
- **Body** (IBM Plex Sans 400, 1rem, line height 1.55): statements and long reading. Rich statements use 1.65 and paragraph spacing of 0.5rem.
- **Body small** (IBM Plex Sans 400 or 500, 0.875rem, line height 1.25rem): the working size of the interface. Tables, controls, nav items, metadata pairs and button labels (500).
- **Label** (IBM Plex Sans 500, 0.75rem, line height 1): badges, table slugs, small verdict chips, the test-detail pill (600).
- **Mono** (JetBrains Mono, 0.75rem, 600): the test ladder's numbers, the console badge, machine identifiers. Inline code and sample I/O use Mono at 0.875em of the surrounding text.

### Named Rules
**The Three Hands Rule.** Familjen Grotesk for the page title and the wordmark, IBM Plex Sans for everything a person wrote, JetBrains Mono for everything a machine produced: code, sample input and output, slugs, permission keys, hostnames, timestamps and test numbers.

**The Tabular Figures Rule.** Numbers that sit in a column or a strip (times, memory, counts, metadata values) keep the body face and switch on `tabular-nums`. Mono is not a shortcut for aligning digits.

## Layout

The contestant site is a single centered column, 84rem wide at most, with side gutters of 16px on phones, 24px from the md breakpoint and 40px from lg, and 32px of vertical padding. A 64px sticky header carries the wordmark, a text nav and the account menu; under md the nav moves into a left sheet behind a menu button. A single-line footer closes the page.

The solve screen is the exception: on desktop it splits into two resizable panes, statement on the left (minimum 28%) and editor with the verdict area on the right (minimum 34%), with a breadcrumb and an actions slot above. On phones the same content becomes a three-way segmented control (problem, code, result) in a well-toned track with a card-toned active segment, and a sticky bottom bar with the submit actions above the safe-area inset.

The admin console renders its own full-height shell: a 232px sidebar on card tone with a right hairline, collapsing to a 56px icon rail and, under lg, to an off-canvas drawer with a 40% black scrim; the content area carries a top bar with the page title, breadcrumb and admin identity. Only the sidebar items the account has permission for are shown.

Spacing rhythm follows 4px steps and clusters at 6px (tile gaps), 8px (control gaps, metadata row gap), 12px (table cell padding), 16px (metadata separators, page gutter), 24px (card padding) and 32px (page padding). Controls are 36px tall, small controls 32px, table rows 48px with 36px heads; every control under 44px gets an invisible `::after` that pads its hit target to 44px.

## Elevation & Depth

Flat by default. Depth is conveyed by four tones (paper, hairline, well, card) and by raised paper for anything that floats. Only overlays cast a shadow in light mode: popovers, dropdown menus, dialogs and toasts share one soft overlay shadow, and the small shadow appears only on the active segment of the segmented control and the switch thumb. In dark mode every shadow token resolves to a one-pixel inset hairline, so depth there is entirely tonal plus an edge.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 1px 2px oklch(21% 0.028 262 / 0.06), 0 12px 32px -6px oklch(21% 0.028 262 / 0.16)`): dialogs, popovers, dropdown menus, toasts. The only shadow a floating surface may use.
- **Small** (`box-shadow: 0 1px 2px oklch(21% 0.028 262 / 0.06)`): the active segment of a segmented control and the switch thumb.
- **Medium** (`box-shadow: 0 1px 2px oklch(21% 0.028 262 / 0.05), 0 4px 12px -2px oklch(21% 0.028 262 / 0.08)`): defined and used once; treat as reserved.
- **Dark mode** (`box-shadow: inset 0 0 0 1px var(--border)`): what every shadow above becomes under `[data-theme="dark"]`.

### Named Rules
**The Flat Desk Rule.** Surfaces are flat at rest. Cards, tables, panels and the sidebar are separated from the page by a hairline, never by a shadow. A shadow means the element floats above the desk.

## Shapes

Small, consistent corners: 4px for badges, inline code and skeletons, 6px for buttons, inputs and pre blocks, 8px for cards, dialogs, verdict tiles and the segmented control's active segment, and a full pill only for the verdict pill. Nothing exceeds 8px except the 10px segmented control track that wraps 7px segments. Borders are one pixel, in Hairline on surfaces and Rule 2 on control edges; the pending tile is the one dashed border in the system. Form language is rectilinear and quiet; the only circles are avatars, the switch thumb and the verdict chip's spinner.

### Named Rules
**The 8px Ceiling Rule.** No radius above 8px on any surface or control. Pills are for a verdict name only.

## Components

Refined and restrained: hairline edges, text-first badges, small radii, and state changes that take 120ms. Nothing is tactile or playful; the one press cue is a one-pixel downward shift on active buttons.

### Buttons
- **Shape:** gently rounded (6px), 36px tall, 16px horizontal padding (12px when an icon leads); small variant 32px tall with 12px padding; icon variants are 36px or 32px squares. Label is Plex 500 at 0.875rem with an 8px gap to a 16px icon.
- **Primary:** Cobalt Ink fill, paper text; hover deepens to Cobalt Ink Hover. One per view.
- **Secondary / Outline:** transparent with a Rule 2 border and ink text; hover fills with Well and firms the border to Field Edge.
- **Ghost:** no border, Ink 2 text; hover fills with Well and lifts the text to Ink.
- **Destructive:** Destructive fill, paper text; hover mixes 14% ink into the fill; focus ring in destructive.
- **Link:** Cobalt Ink text, underline on hover with a 4px offset.
- **Focus / Active / Disabled:** 2px Cobalt Ink outline offset 2px; active shifts down 1px; disabled drops to 55% opacity and blocks pointer events. Transitions are 120ms on colour and transform and are removed under reduced motion.

### Badges
- **Style:** text first. 22px tall, 4px radius, 6px padding, Plex 500 at 0.75rem, a Hairline border and no fill. Neutral reads in Ink 2; success, warning and danger keep their status ink on the same hairline; the mono variant switches to JetBrains Mono for keys and ids.
- **Primary:** the one filled badge, Cobalt Wash with Cobalt Text and no border.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** Paper, the same tone as the page.
- **Shadow Strategy:** none; see The Flat Desk Rule.
- **Border:** 1px Hairline.
- **Internal Padding:** 24px vertical with 24px content gap; header, content and footer sections share the card's horizontal padding.

### Inputs / Fields
- **Style:** transparent background, 1px Field Edge border, 6px radius, 36px tall, 10px horizontal padding, body size on phones and 0.875rem from md. Placeholder in Muted Ink. Hover darkens the border by mixing 40% ink into Field Edge.
- **Focus:** 2px Cobalt Ink outline drawn one pixel inside the border, so the field does not grow.
- **Error / Disabled:** `aria-invalid` turns the border and focus outline destructive; disabled fills with Well at 60% opacity.

### Dialogs and overlays
- **Style:** Raised Paper, 1px Hairline border, 8px radius, 24px padding, the Overlay shadow, 32rem wide at most on desktop and full width minus 32px on phones. Enter and exit with a 200ms fade and a 95% zoom. The close control is a 16px icon at 70% opacity in the top right with a hit area padded to 44px.

### Tables
- **Style:** full width, 0.875rem, collapsed borders. Heads are 36px, Plex 500 in Muted Ink over a Rule 2 bottom border; body rows are 48px over Hairline dividers, the last row open. Hover fills the row with Well in 120ms; a leaving row fades to 35%. Numeric cells right-align with tabular figures; slugs drop to Mono 0.75rem in Muted Ink; a warned row carries a 3px destructive rule on its first cell. Wide tables scroll inside their container, never the page.

### Navigation
- **Style:** a 64px sticky header on Paper with a Hairline bottom edge. Items are Plex 500 at 0.875rem in Ink 2, filling the header height; hover lifts to Ink; the active item is Ink with a 2px Cobalt Ink underline sitting on the header's bottom edge. The account menu is a 32px avatar whose fallback is initials on Cobalt Wash. Under md the nav becomes a left sheet. The admin sidebar uses the same ink and well tones with a card background and an active item on the well tone.

### The Test Ladder (signature)
Under the editor, one 36px square tile per test, 6px apart, wrapping as needed. Each tile shows its test number in JetBrains Mono 600 at 0.75rem on its verdict's tint: the mark mixed into the card at 16%, with a 30% mark inset ring. Passed tests fall to an 11% tint and weight 500 so the failures carry the colour. A pending tile is a dashed 55% mark border on no fill; a running tile takes the judging colour and pulses between 16% and 24% every second; a newly judged tile reveals with a 3px rise over 220ms. The open tile wears a 2px card gap and a 4px ring in its mark colour under the global focus outline. While the stream has not yet started, ghost tiles sit under a judging-coloured sweep. Every animation here is removed under reduced motion.

The ladder fills live (2026-11-08). The judge reports each test as it finishes (the stream's `started` and `progress` events, see the go-judge-server design §13), so before the verdict the ladder is the real one: as many tiles as the judge says it has (else the last verdict's count, else twelve), each judged tile taking its verdict's tint as it lands while the rest keep running, and a count beside the heading ("3 / 12 judged") in tabular figures. The sweep stops at the first judged test; the pulse carries the motion from there. The ladder before the verdict is read-only: its tiles are spans, not buttons; the verdict replaces them with the real, openable tiles. The heading moves from "Waiting in the queue…" to "Running tests…" at 1.2rem 600, and the verdict title lands one step louder at 1.44rem 700 in the verdict's ink: the loudest text on the screen while the judge speaks, and still Plex (Familjen Grotesk stays the h1's).

**While judging, the console is the screen.** A submit hands the console the larger share of the editor column (55%, never shrinking a split the reader already widened) and the statement recedes to 70% opacity over 220ms until the verdict lands; a phone, which shows one part at a time, keeps its views. **Focus mode** (the editor toolbar's expand button, Escape to leave) is an in-page layer at `z-40` filling the viewport with the whole workspace: editor, console, Run and Submit (which move into the console tab bar), while menus, dialogs and toasts at `z-50` stay on top. It is not the browser's Fullscreen API, which hid every portaled element and the action bar. **A stream that gives up** (20 s of silence restarts on every progress event; then polling, then the 10-minute deadline or a 404) leaves the console on "No verdict yet" with two ways on: Check Submissions and Refresh. **Load code** replaces the editor's content, so its toast carries Undo for 8 s when the editor was not empty.

### Verdict chip and pill
A verdict in text is a chip: the verdict's ink, Plex 500 at 0.875rem, an 8px gap to a 16px icon, no fill and no border; large chips go to 1rem and 600, small to 0.75rem. A running verdict shows a 14px two-pixel ring spinner in the current colour. In the test-detail header the verdict becomes a 22px pill, 9px padding, on a 14% tint of its mark.

## Do's and Don'ts

### Do:
- **Do** spend Cobalt Ink on the one primary action, links, focus and the active nav underline, and nowhere else (The One Pen Rule).
- **Do** use the verdict vocabulary for verdicts only; status elsewhere is success, warning or destructive (The Stamp Rule).
- **Do** separate surfaces with a 1px Hairline and keep them flat; reserve the Overlay shadow for things that float (The Flat Desk Rule).
- **Do** set every machine-produced string in JetBrains Mono and every column of numbers in tabular figures of the body face.
- **Do** keep controls at 36px and 32px with a hit target padded to 44px, and keep every radius at or below 8px.
- **Do** build every list and detail with explicit loading (skeleton sweep), empty (an invitation to act) and error (what happened, plus retry) states.
- **Do** make state changes in 120ms or 220ms with the standard ease-out, and remove them under `prefers-reduced-motion`.
- **Do** verify both themes: dark is the same palette with the hue held, and every shadow becomes an inset hairline.

### Don't:
- **Don't** use gradients, decorative colour or a solid fill on anything other than the primary and destructive buttons.
- **Don't** put a resting shadow on a card, table, panel or the sidebar.
- **Don't** use Familjen Grotesk outside the page h1 and the wordmark; the verdict title is the 1.44rem 700 step of Plex in the verdict's ink.
- **Don't** animate an entrance on contestant-facing pages; the quiet `enter-up` is admin-only.
- **Don't** render a verdict in a filled, bordered pill except the test-detail header; a verdict in running text is a chip of ink and icon.
- **Don't** let a passed test shout: the 11% tint and weight 500 are deliberate so failures carry the colour.
- **Don't** exceed a 10px radius anywhere; the segmented control track is the only 10px.
