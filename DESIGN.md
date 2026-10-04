---
name: Portugal Agora
description: The national hazard picture as the evening TV weather bulletin; one blue stage, one map coloured by the IPMA levels, one sentence.
colors:
  stage: "#0a2a4a"
  stage-2: "#0f3560"
  stage-ink: "#ffffff"
  stage-ink-2: "#b8cbe0"
  stage-line: "rgb(255 255 255 / 0.16)"
  stage-accent: "#8fd6ff"
  land-none: "#4f9d63"
  land-yellow: "#f2c200"
  land-orange: "#f07f1a"
  land-red: "#d7262b"
  land-unknown: "#8797a3"
  ink-on-land: "#0a1d2e"
  bg: "#eef2f5"
  surface: "#ffffff"
  surface-2: "#e2e9ef"
  ink: "#0a1d2e"
  ink-2: "#45586a"
  line: "#cdd7df"
  accent: "#0b5cad"
  sev-none: "#2e7d4f"
  sev-none-bg: "#e2f1e7"
  sev-none-ink: "#1c5535"
  sev-yellow: "#e8b000"
  sev-yellow-bg: "#fff3c7"
  sev-yellow-ink: "#634800"
  sev-orange: "#e0661b"
  sev-orange-bg: "#fde5d3"
  sev-orange-ink: "#843505"
  sev-red: "#c62828"
  sev-red-bg: "#fbe0e0"
  sev-red-ink: "#8b1a1a"
  sev-unknown: "#7c8b94"
  sev-unknown-bg: "#e6ebee"
  sev-unknown-ink: "#3d4a52"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, sans-serif"
    fontSize: "clamp(2.1rem, 1.3rem + 2.6vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Barlow Semi Condensed, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Barlow Semi Condensed, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title-sm:
    fontFamily: "Barlow Semi Condensed, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
  label:
    fontFamily: "Barlow Semi Condensed, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Atkinson Hyperlegible Next, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "\"tnum\" 1"
  body-sm:
    fontFamily: "Atkinson Hyperlegible Next, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  chip: "3px"
  sm: "0.25rem"
  md: "0.375rem"
  lg: "0.5rem"
  full: "9999px"
spacing:
  gutter: "1rem"
  gutter-sm: "1.5rem"
  stack-stage: "2rem"
  stack-section: "3.5rem"
  container: "80rem"
components:
  lower-third:
    backgroundColor: "{colors.stage-ink}"
    textColor: "{colors.ink-on-land}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "64px"
  topic-row:
    textColor: "{colors.stage-ink}"
    typography: "{typography.title}"
    padding: "12px 0"
  level-mark:
    backgroundColor: "{colors.land-yellow}"
    textColor: "{colors.ink-on-land}"
    rounded: "{rounded.sm}"
    size: "40px"
  severity-badge:
    backgroundColor: "{colors.sev-yellow-bg}"
    textColor: "{colors.sev-yellow-ink}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  button-stage:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.stage-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "48px"
  button-stage-hover:
    backgroundColor: "{colors.stage-2}"
  button-text:
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "44px"
  select-district:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 44px 0 16px"
    height: "48px"
  section-nav-link:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "0 12px"
    height: "48px"
  count-chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: "0 6px"
  forecast-strip:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.stage-ink}"
    rounded: "{rounded.sm}"
    padding: "16px 12px"
---

# Design System: Portugal Agora

## Overview

**Creative North Star: "The Evening Weather Bulletin"**

Portugal Agora reads like the boletim meteorológico at the end of the evening news. The first viewport is a deep broadcast-blue stage (the sea) that stays blue in both themes. On it sits one flat map of the country, every distrito filled with its official IPMA level and outlined in white, with Açores and Madeira boxed as insets in the sea. Beside the map, a presenter's summary: a date-and-time stamp, one headline at display size, and four topic lines. Below the map, a light lower-third bar carries the level legend and a live caption that follows whatever distrito the visitor points at.

Below the stage the page turns into a calm, cool, light reading ground: a sticky section index, then the grouped detail (avisos, incêndios, sismos, risco e ar, distritos) set as ruled lists, not cards. Colour does almost no decorative work. The four IPMA levels carry the only saturated colour; everything else is blue-grey ink on cool paper, or white on sea.

Density is low on the stage and moderate below it. Type is large (an 18px root that honours the visitor's own font size), contrast is high, and every level is spoken three ways: colour, icon shape and word. Motion is restricted to the bulletin itself: the lower third wipes in once, the caption crossfades, and that is all.

**Key Characteristics:**
- Full-bleed broadcast-blue stage owns the first viewport, identical in light and dark.
- Flat district fills in the IPMA scale with white borders; no gradients, no relief, no basemap on the stage.
- Condensed broadcast sans for headlines, numbers, captions and controls; a hyperlegible sans for reading text.
- Lower-third caption bar as the signature component, driven by pointing at the map.
- Below the stage: ruled lists on a cool light ground; one interaction accent per context.

## Colors

A two-ground palette: a navy sea for the bulletin, cool blue-grey paper for the detail, with the IPMA severity scale as the only chromatic voice.

### Primary
- **Broadcast Sea** (`stage`): the ground of the bulletin and of the brand mark. Owns the first viewport on every page and does not change between light and dark (dark only deepens it slightly, see sidecar). Also the fill of the one solid header button ("Perto de mim") and of the warning pictograms on the map.
- **Deep Sea Panel** (`stage-2`): the second tone of the stage; the forecast strip and the hover state of stage-coloured buttons.

### Secondary
- **Studio Cyan** (`stage-accent`): the single interaction accent on the stage. The outline of the pointed distrito, focus rings on the stage, the forecast pictograms and the earthquake rings.
- **Bulletin Blue** (`accent`): the single interaction accent on the page ground. Links, text buttons, focus rings, selection tint, caret.

### Tertiary: the IPMA scale
Two parallel sets of the same four levels, one per ground. Never mix them.
- **Map fills** (`land-none`, `land-yellow`, `land-orange`, `land-red`, `land-unknown`): saturated broadcast fills for the map, the level marks and legend chips on the stage. Fixed across themes. Text on them is `ink-on-land`, except on red, which takes white.
- **Page severity** (`sev-*`, `sev-*-bg`, `sev-*-ink`): the solid / soft background / readable ink triplet for each level on the page ground; used by the severity badge and the source-failure notices. These are theme-aware.

### Neutral
- **Cool Paper** (`bg`): the page ground below the stage and the sticky section index.
- **Card White** (`surface`): header, inputs, map overlay panels.
- **Mist** (`surface-2`): count chips, selected list rows, quiet fills.
- **Night Ink** (`ink`): body text and headings on the page; also the ink on map colours (`ink-on-land`).
- **Slate Ink** (`ink-2`): secondary text, source lines, meta.
- **Hairline** (`line`): every rule and border on the page.
- **Stage Inks** (`stage-ink`, `stage-ink-2`, `stage-line`): white text, pale blue secondary text and translucent white rules on the stage.

### Named Rules
**The Only Colour Is Severity Rule.** Saturated colour appears only as an IPMA level (or the fire marker, which is a hazard of its own). Decoration, emphasis and branding stay inside the blues and greys.

**The Two Grounds Rule.** Stage components use `stage-*` and `land-*` tokens; page components use the neutrals and `sev-*`. A component placed on the stage adds the `on-stage` context so links, focus and selection switch to stage colours.

**The Three Ways Rule.** No level is ever shown by colour alone: every mark carries its icon shape (circle-check, triangle, diamond, octagon, question circle) and, nearby or in assistive text, its word (Sem aviso, Amarelo, Laranja, Vermelho, Sem dados).

## Typography

**Display Font:** Barlow Semi Condensed 500/600/700 (`--font-display`)
**Body Font:** Atkinson Hyperlegible Next (`--font-sans`)

**Character:** Barlow is the caption face of a broadcast graphic: condensed, upright, bold, good with numbers. Atkinson is designed for low-vision readers and carries every sentence a visitor actually reads.

### Hierarchy
- **Display** (700, fluid 2.1rem to 3.5rem, 1.04, -0.01em): the bulletin headline only, one per page, balanced.
- **Headline** (700, 2.25rem, 1.25): section titles in the main column below the stage.
- **Title** (700, 1.5rem, 1.25): topic values on the stage, caption names in the lower third, warning group titles, sidebar section titles, forecast heading.
- **Title small** (700, 1.25rem, 1.25): event rows (fires, quakes).
- **Label** (600, 1.125rem): bulletin stamp, section index links, district picker, stage buttons, forecast day names.
- **Body** (400, 1rem = 18px, 1.55, tabular numerals): reading text; warning descriptions held to 70ch.
- **Body small** (400, 0.875rem): source lines, legend, notes under the stage.

### Named Rules
**The Caption Face Rule.** Barlow is for what a TV graphic would set: headlines, numbers, names, labels, controls. Sentences are always Atkinson, even inside a Barlow line (the topic detail drops to Atkinson at body size).

**The Generous Root Rule.** The root is 112.5% of the user's setting; never set text in px, and never go below body small.

## Layout

One centred container (80rem, gutters 1rem, 1.5rem from 640px). The stage is full-bleed colour with the container inside it.

- **National stage:** at 1024px and up, a 12-column grid: map in the left 7 columns, the bulletin panel (headline, stamp, topic list, note) in the right 5, vertically centred; the lower third and legend span all 12 below. Below 1024px, headline and topic lines come first and the map follows at full width (max 380px, 440px at 640px, 480px at 1280px).
- **District stage:** the split inverts in weight (map 5, panel 7); the forecast strip spans all 12 at the bottom.
- **Below the stage:** a sticky section index (48px tall, horizontally scrollable), then a two-column body at 1024px: main column plus a 21rem aside that sticks under the index. Sections stack with 3.5rem between them in the main column, 3rem in the aside.
- **Rhythm:** 2rem stage padding and gaps, 1.75rem inside the bulletin panel, 1rem to 1.25rem row padding in lists.

## Elevation & Depth

Flat. Depth comes from the two grounds (sea above, paper below) and from hairline rules, not from shadow. One exception is native to the world: the lower third and the overlay panel on the detailed map float above their ground with a soft broadcast drop, the way a caption graphic sits over the picture.

### Shadow Vocabulary
- **Caption drop** (`box-shadow: 0 10px 30px -12px rgb(0 0 0 / 0.55)`): the lower third on the stage (0.45 alpha for the map overlay panel on the page).

### Named Rules
**The Flat Map Rule.** The bulletin map is flat fills with white borders. No relief, gradients, glows or drop shadows on districts; emphasis is a thicker outline (white for the focused distrito, cyan for the pointed one), and other distritos dim to a muted sea tone on a district page.

## Shapes

Small, square-ish corners everywhere (0.25rem): lower third, level marks, forecast strip, buttons, select, count chips. Legend and index chips go tighter (3px). Full rounds are reserved for things that are round by nature: the severity badge pill, fire and earthquake markers, icon-only buttons. On the map, the warning pictograms keep distinct silhouettes per level: triangle (amarelo), diamond (laranja), octagon (vermelho). The Açores and Madeira insets are plain rectangles drawn in `stage-line`.

## Components

### Lower Third (signature)
The bulletin's caption bar. A white bar on the stage with a level block on the left (map fill, icon and level word in Barlow) and the caption beside it: distrito name at title size, one sentence of status in body, and an "Abrir [distrito]" link. Pointing at a distrito (hover, keyboard focus, first tap on touch) swaps the caption; with nothing pointed, it shows the national caption. Wipes in once on load (clip-path left to right, 700ms, expo-out, 150ms delay); each caption change fades up 4px in 180ms. Minimum 64px tall; on phones the action drops under the text with a 44px target.

### Topic List
Four rows on the stage between translucent white rules: a 40px level mark, a small pale label, the value in Barlow at title size with optional detail in Atkinson, and an arrow that nudges right on hover. Each row links to its section below.

### Level Mark and Legend Chips
Square blocks in the map fill with the level icon: 40px with a 20px icon in topic rows, 24px in the district index, 20px with a white ring in the map legend.

### Severity Badge
The page-ground expression of a level: a pill with the soft background and readable ink of the level, icon plus word in bold. Medium (body small) in lists, large (body) where a level needs more weight.

### Buttons
- **Stage button:** solid sea fill, white Barlow label with icon, 48px tall, small corners; hover moves to the deeper sea panel. Used for "Perto de mim" in the header.
- **Text button:** accent-blue bold body text with icon, 44px target, underline on hover ("Ver no mapa").
- **Focus:** a 3px accent outline at 3px offset everywhere; cyan on the stage, ink on the lower third.

### Inputs / Fields
- **District picker:** a native select, 48px, white with hairline border, Barlow label weight, chevron at right; border darkens to ink on hover. Full width on phones, 16rem from 640px.

### Navigation
- **Header:** white bar with hairline bottom, brand mark (a sea-blue tile with a green Portugal outline) and the name in Barlow, then picker and stage button.
- **Section index:** sticky, page ground, Barlow label links 48px tall with a 2px bottom border that turns ink on hover, each followed by a count chip in mist with tabular numerals.
- **Emergency bar:** a thin ink band above the header with the 112 line; it inverts to mist in dark.

### Lists (instead of cards)
Detail is set as ruled lists: a hairline above the list, a hairline under each item, no boxes. Warning groups show badge plus type at title size, the IPMA text once, and each time window with its places. Event rows add a meta line and a "Ver no mapa" text button; the selected row fills with mist. Empty states are a line of large slate text between two rules.

### Forecast Strip
Five days in one deep-sea panel with translucent dividers: day name in Barlow, a cyan weather pictogram, max in Barlow bold with min in pale ink, rain chance in body small. Wipes in like the lower third.

### District Index
A two-column ruled list of every distrito and região, sorted by level then name, each with a 24px level chip; the text path to the map.

## Do's and Don'ts

### Do:
- **Do** open every hazard page with the stage: sea ground, flat level map, one display headline, the lower third.
- **Do** show each level with its map fill or severity triplet, its icon shape and its word.
- **Do** set headlines, numbers, names and controls in Barlow Semi Condensed and every sentence in Atkinson Hyperlegible Next.
- **Do** keep one interaction accent per ground: Studio Cyan on the stage, Bulletin Blue on the page.
- **Do** group repeated official text once and list its places, in ruled lists.
- **Do** keep touch targets at 44px or more and respect reduced motion.

### Don't:
- **Don't** use saturated colour for anything that is not a level or a hazard marker.
- **Don't** put `land-*` fills on the page ground or `sev-*` triplets on the stage.
- **Don't** turn the stage light in the light theme; it is the sea in both.
- **Don't** wrap detail in cards or columns of equal-weight boxes; use rules.
- **Don't** add shadows beyond the caption drop, or relief and gradients to the map.
- **Don't** animate anything beyond the lower-third wipe, the forecast wipe, the caption fade and short hover feedback (the topic arrow nudge).
