---
name: Portugal Agora
description: The national hazard picture as the TV weather bulletin; one sea-blue stage, one map coloured by the IPMA levels, one sentence.
colors:
  stage: "#dcebf5"
  stage-2: "#c6dcec"
  stage-ink: "#0a1d2e"
  stage-ink-2: "#3a5168"
  stage-line: "rgb(10 29 46 / 0.15)"
  stage-accent: "#0b5cad"
  caption: "#ffffff"
  land-none: "#4f9d63"
  land-yellow: "#f2c200"
  land-orange: "#f07f1a"
  land-red: "#d7262b"
  land-unknown: "#8797a3"
  land-info: "#8fd6ff"
  land-dim: "#b5cbdd"
  fire: "#e2401b"
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
    fontFeature: '"tnum" 1'
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
    backgroundColor: "{colors.caption}"
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
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "48px"
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
  section-tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    padding: "0 12px"
    height: "48px"
  section-tab-active:
    textColor: "{colors.ink}"
  map-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  map-chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
  forecast-strip:
    backgroundColor: "{colors.stage-2}"
    textColor: "{colors.stage-ink}"
    rounded: "{rounded.sm}"
    padding: "16px 12px"
---

# Design System: Portugal Agora

## Overview

**Creative North Star: "The Evening Weather Bulletin"**

Portugal Agora reads like the boletim meteorológico on the evening news. The first viewport is a sea-blue stage: a pale morning sea in the light theme, a deep night sea in the dark one. On it sits one flat map of the country, every distrito filled with its official IPMA level and outlined in white, with Açores and Madeira boxed as insets in the sea. Beside the map, a presenter's summary: a date-and-time stamp, one headline at display size, and four topic lines. Below the map, a white lower-third bar carries the level legend and a live caption that follows whatever distrito the visitor points at.

Below the stage the page turns into a calm, cool, light reading ground. Each topic (avisos, incêndios, sismos, risco e ar) has its own page: the detailed map of that one topic first, then the grouped detail set as ruled lists, not cards. Colour does almost no decorative work. The four IPMA levels carry the only saturated colour; everything else is blue-grey ink on cool paper, or navy ink on the pale sea (white on the night sea).

Density is low on the stage and moderate below it. Type is large (an 18px root that honours the visitor's own font size), contrast is high, and every level is spoken three ways: colour, icon shape and word. Motion is restricted to the bulletin itself: the lower third wipes in once, the caption crossfades, and that is all.

**Key Characteristics:**

- Full-bleed sea stage owns the first viewport: pale sea-blue in the light theme, night navy in the dark one.
- Flat district fills in the IPMA scale with white borders; no gradients, no relief, no basemap on the stage.
- Condensed broadcast sans for headlines, numbers, captions and controls; a hyperlegible sans for reading text.
- Lower-third caption bar as the signature component, driven by pointing at the map.
- Below the stage: ruled lists on a cool light ground; one interaction accent per context.

## Colors

A two-ground palette: a sea for the bulletin (pale by day, navy by night), cool blue-grey paper for the detail, with the IPMA severity scale as the only chromatic voice. The stage tokens are the ones whose character changes between themes; the front matter lists the light values, and the dark values are given below.

### Primary

- **Sea** (`stage`): the ground of the bulletin and of the header band on every topic page. **Morning Sea** `#dcebf5` in the light theme, **Night Sea** `#071f38` in the dark one. Also the background of the app icons and the theme colour of the installed app.
- **Sea Panel** (`stage-2`): the second tone of the stage, used for the forecast strip. `#c6dcec` light, `#0b2b4c` dark.

### Secondary

- **Stage Accent** (`stage-accent`): the single interaction accent on the stage. The outline of the pointed distrito, focus rings on the stage, the forecast pictograms and the earthquake rings. Bulletin Blue `#0b5cad` on the light sea; **Studio Cyan** `#8fd6ff` on the night sea.
- **Bulletin Blue** (`accent`): the single interaction accent on the page ground. Links, text buttons, focus rings, selection tint, caret. `#0b5cad` light, `#7fc7ff` dark.

### Tertiary: the IPMA scale

Two parallel sets of the same four levels, one per ground. Never mix them.

- **Map fills** (`land-none`, `land-yellow`, `land-orange`, `land-red`, `land-unknown`): saturated broadcast fills for the map, the level marks and legend chips on the stage. Fixed across themes. Text on them is `ink-on-land`, except on red, which takes white.
- **Information** (`land-info`, `#8fd6ff`): the level mark for a topic that is notable but not a warning (for example, a felt earthquake).
- **Dimmed land** (`land-dim`): the other distritos on a district page, so the focused one stands out. `#b5cbdd` light, `#2b4f75` dark.
- **Fire** (`fire`, `#e2401b`): the active-wildfire marker on the bulletin map and in its legend. A hazard of its own, not a level.
- **Page severity** (`sev-*`, `sev-*-bg`, `sev-*-ink`): the solid / soft background / readable ink triplet for each level on the page ground; used by the severity badge and the source-failure notices. These are theme-aware.

### Neutral

- **Cool Paper** (`bg`): the page ground below the stage; also the wash over the rest of the country on a district's detailed map.
- **Card White** (`surface`): header and section tabs, inputs, unselected map chips, map overlay panels.
- **Mist** (`surface-2`): selected list rows, map chip hover, the map frame while it loads, quiet fills.
- **Night Ink** (`ink`): body text and headings on the page; also the ink on map colours (`ink-on-land`).
- **Slate Ink** (`ink-2`): secondary text, source lines, meta.
- **Hairline** (`line`): every rule and border on the page.
- **Stage Inks** (`stage-ink`, `stage-ink-2`, `stage-line`): text, secondary text and rules on the stage. Navy `#0a1d2e`, slate blue `#3a5168` and 15% navy rules on the light sea; white, pale blue `#b8cbe0` and 16% white rules on the night sea.
- **Caption White** (`caption`, `#ffffff`): the lower-third bar, white in both themes like a broadcast caption. Its text is `ink-on-land`.

### Named Rules

**The Only Colour Is Severity Rule.** Saturated colour appears only as an IPMA level (or the fire marker, which is a hazard of its own). Decoration, emphasis and branding stay inside the blues and greys.

**The Caption Stays White Rule.** The lower third uses `caption`, never `stage-ink`: `stage-ink` is navy in the light theme, so as a background it would put navy text on navy.

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
- **Label** (600, 1.125rem): bulletin stamp, section tabs, district picker, solid buttons, map chips, forecast day names.
- **Body** (400, 1rem = 18px, 1.55, tabular numerals): reading text; warning descriptions held to 70ch.
- **Body small** (400, 0.875rem): source lines, legend, notes under the stage.

### Named Rules

**The Caption Face Rule.** Barlow is for what a TV graphic would set: headlines, numbers, names, labels, controls. Sentences are always Atkinson, even inside a Barlow line (the topic detail drops to Atkinson at body size).

**The Generous Root Rule.** The root is 112.5% of the user's setting; never set text in px, and never go below body small.

## Layout

One centred container (80rem, gutters 1rem, 1.5rem from 640px). The stage is full-bleed colour with the container inside it.

- **National stage:** at 1024px and up, a 12-column grid: map in the left 7 columns, the bulletin panel (headline, stamp, topic list, note) in the right 5, vertically centred; the lower third and legend span all 12 below. Below 1024px, headline and topic lines come first and the map follows at full width (max 380px, 440px at 640px, 480px at 1280px).
- **District stage:** the split inverts in weight (map 5, panel 7); the forecast strip spans all 12 at the bottom.
- **Topic pages:** a stage page head (back link on district pages, display title, intro), then the detailed map first and the lists after it. From 1024px the two sit side by side in two equal columns (2.5rem gap): the map section sticks to the top of the viewport on the left while the list scrolls on the right. Below 1024px they stack, map on top. A "Saltar o mapa" skip link, visible only on keyboard focus, jumps from the map heading straight to the list. Sections in the list stack 3.5rem apart; on the risk page fire risk and air split into two columns when the list column is wide enough.
- **Rhythm:** 2rem stage padding and gaps, 1.75rem inside the bulletin panel, 1rem to 1.25rem row padding in lists.

## Elevation & Depth

Flat. Depth comes from the two grounds (sea above, paper below) and from hairline rules, not from shadow. One exception is native to the world: the lower third and the overlay panel on the detailed map float above their ground with a soft broadcast drop, the way a caption graphic sits over the picture.

### Shadow Vocabulary

- **Caption drop** (`box-shadow: 0 10px 30px -12px rgb(0 0 0 / 0.55)`): the lower third on the stage (0.45 alpha for the map overlay panel on the page).

### Named Rules

**The Flat Map Rule.** The bulletin map is flat fills with white borders (island districts take a 5px outline in their own fill instead, so they hold up at inset scale). No relief, gradients, glows or drop shadows on districts; emphasis is a thicker outline (white for the focused distrito, `stage-accent` for the pointed one), and other distritos dim to `land-dim` on a district page.

## Shapes

Small, square-ish corners everywhere (0.25rem): lower third, level marks, forecast strip, buttons, select, map chips, the detailed map frame. Legend and index chips go tighter (3px). Full rounds are reserved for things that are round by nature: the severity badge pill, fire and earthquake markers, icon-only buttons. On the map, the warning pictograms keep distinct silhouettes per level: triangle (amarelo), diamond (laranja), octagon (vermelho). The Açores and Madeira insets are plain rectangles drawn in `stage-line`, cropped tight around the islands so they render large; each is named above its frame in Barlow semibold `stage-ink-2` (30 viewBox units on phones, about 13px on a 390px screen; 24 from 1024px). Island shapes carry their own-colour outline as a halo and a wider invisible touch area.

## Components

### Lower Third (signature)

The bulletin's caption bar. A white bar (`caption`) on the stage with a level block on the left (map fill, icon and level word in Barlow) and the caption beside it: distrito name at title size, one sentence of status in body, and an "Abrir [distrito]" link. Pointing at a distrito (hover, keyboard focus, first tap on touch) swaps the caption; with nothing pointed, it shows the national caption. Wipes in once on load (clip-path left to right, 700ms, expo-out, 150ms delay); each caption change fades up 4px in 180ms. Minimum 64px tall; on phones the action drops under the text with a 44px target.

### Topic List

Four rows on the stage between translucent white rules: a 40px level mark, a small pale label, the value in Barlow at title size with optional detail in Atkinson, and an arrow that nudges right on hover. Each row links to its section below.

### Level Mark and Legend Chips

Square blocks in the map fill with the level icon: 40px with a 20px icon in topic rows, 24px in the district index, 20px with a white ring in the map legend.

### Severity Badge

The page-ground expression of a level: a pill with the soft background and readable ink of the level, icon plus word in bold. Medium (body small) in lists, large (body) where a level needs more weight.

### Buttons

- **Solid button:** `ink` fill with a `bg` label in Barlow with icon, 48px tall, small corners; hover lowers the opacity. Navy with a white label in the light theme, near-white with a navy label in the dark one. Used for "Perto de mim" in the header, which always shows its text label beside the icon (shortened to "Perto" under 400px; the accessible name stays "Perto de mim").
- **Text button:** accent-blue bold body text with icon, 44px target, underline on hover ("Ver no mapa").
- **Focus:** a 3px accent outline at 3px offset everywhere; `stage-accent` on the stage, `ink-on-land` on the lower third.

### Inputs / Fields

- **District picker:** a native select, 48px, white with hairline border, Barlow label weight, chevron at right; border darkens to ink on hover. Below 1024px it fills its row beside "Perto de mim"; from 1024px it sits in the header bar at 15rem.

### Navigation

- **Header:** white bar; brand mark (the mainland outline in `ink` with a dot in the national level colour) and the name in Barlow bold at normal leading, so descenders are never clipped (below 360px only the mark shows; the name stays for screen readers). From 1024px the district picker and "Perto de mim" sit in the bar beside the theme toggle and the PT | EN switch; below 1024px they move to their own row under the logo, the picker filling the width and the button beside it.
- **Section tabs:** a row under the header on `surface` with a hairline bottom: Resumo, Avisos, Incêndios, Sismos, Risco e ar (on a district page the same tabs lead to that district's pages). Barlow label, 48px tall, a 3px bottom border: `accent` with `ink` text on the current page, transparent with `ink-2` text otherwise, hairline and `ink` on hover. Under 640px all five fit a 360px screen: short labels ("Risco"; in English "Quakes" and "Risk"), 0.375rem side padding, no gap, spread edge to edge, and the text drops one step (currently a fixed 17px). The full name stays as the accessible name; if the row still overflows it scrolls sideways with the current tab centred.
- **Emergency bar:** a thin ink band above the header with the 112 line; it inverts to mist in dark.

### Lists (instead of cards)

Detail is set as ruled lists: a hairline above the list, a hairline under each item, no boxes. Warning groups show badge plus type at title size, the IPMA text once, and each time window with its places. Event rows add a meta line and a "Ver no mapa" text button; the selected row fills with mist. Empty states are a line of large slate text between two rules.

### Detailed Map (topic pages)

The interactive map on every topic page shows one layer only: that page's topic. The risk page offers fire risk or air quality as a radio pair of map chips, one at a time, and, for fire risk on the continente, a Hoje | Amanhã radio pair; national pages add a Continente / Açores / Madeira choice. Map chips are 44px, small corners, Barlow label: `ink` fill with a `bg` label when selected, `surface` with a hairline border (mist on hover) otherwise. The frame has a hairline border and small corners; it is 45vh tall on phones (at least 300px), 62vh from 640px, and at most 680px from 1024px. Under it, a legend for the shown layer only, in body small slate: round swatches for levels, square ones for the five fire-risk classes.

On a district page the rest of the country is washed over with the page ground and the district is outlined in a heavy dark line; a link leads to the same topic for the whole country. Selecting a distrito, fire or quake outlines or rings it and opens a white overlay panel with the caption drop at the foot of the map; selecting the same thing again, or closing the panel, clears it and zooms back out.

### Share Image

The 1200 x 630 image each page shares, per locale. The light soft background of the national or district level fills the card, with a 28px bar in that level's solid colour down the left edge. Top row: the site logo as a silhouette (the mainland in ink with the level dot ringed in the background colour), "Portugal Agora" in Barlow Semi Condensed bold, the place in Atkinson. Middle: the headline in Barlow Semi Condensed bold (size steps down with length, 1.08 leading, at most four lines). Foot: the data timestamp in Atkinson bold, then the sources line in slate. No level pill: the bar, the dot and the headline carry the level. Fonts come from the project's own font files, not the network.

### Forecast Strip

Five days in one `stage-2` panel with `stage-line` dividers: day name in Barlow, a `stage-accent` weather pictogram, max in Barlow bold with min in `stage-ink-2`, rain chance in body small. Wipes in like the lower third.

### District Index

A two-column ruled list of every distrito and região, sorted by level then name, each with a 24px level chip; the text path to the map.

## Do's and Don'ts

### Do:

- **Do** open every hazard page with the stage: sea ground, flat level map, one display headline, the lower third.
- **Do** show each level with its map fill or severity triplet, its icon shape and its word.
- **Do** set headlines, numbers, names and controls in Barlow Semi Condensed and every sentence in Atkinson Hyperlegible Next.
- **Do** keep one interaction accent per ground: `stage-accent` on the stage, `accent` on the page.
- **Do** group repeated official text once and list its places, in ruled lists.
- **Do** keep touch targets at 44px or more and respect reduced motion.

### Don't:

- **Don't** use saturated colour for anything that is not a level or a hazard marker.
- **Don't** put `land-*` fills on the page ground or `sev-*` triplets on the stage.
- **Don't** use `stage-ink` as a background; it flips from navy to white between themes. Fixed white surfaces on the stage use `caption`.
- **Don't** wrap detail in cards or columns of equal-weight boxes; use rules.
- **Don't** add shadows beyond the caption drop, or relief and gradients to the map.
- **Don't** animate anything beyond the lower-third wipe, the forecast wipe, the caption fade and short hover feedback (the topic arrow nudge).
