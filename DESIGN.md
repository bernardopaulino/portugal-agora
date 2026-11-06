---
name: Portugal Agora
description: Mission control for the national hazard picture; Portugal in 3D, alone in the dark and lit by its IPMA levels, with glass panels that tell the story as the camera travels.
colors:
  bg: "#05080f"
  bg-2: "#0a111d"
  surface: "#0e1726"
  surface-2: "#17243a"
  ink: "#eef3f9"
  ink-2: "#9cadc0"
  line: "rgb(255 255 255 / 0.11)"
  accent: "#6fe3ff"
  accent-ink: "#03141c"
  glow: "rgb(111 227 255 / 0.32)"
  glass: "rgb(13 22 37 / 0.62)"
  glass-strong: "rgb(10 17 29 / 0.84)"
  glass-line: "rgb(255 255 255 / 0.10)"
  glass-hi: "rgb(255 255 255 / 0.14)"
  land-none: "#4f9d63"
  land-yellow: "#f2c200"
  land-orange: "#f07f1a"
  land-red: "#d7262b"
  land-unknown: "#8797a3"
  land-info: "#8fd6ff"
  land-dim: "#1c2b40"
  fire: "#ff5a2a"
  ink-on-land: "#0a1d2e"
  sev-none: "#4caf73"
  sev-none-bg: "rgb(76 175 115 / 0.16)"
  sev-none-ink: "#a6e6bd"
  sev-yellow: "#f2c230"
  sev-yellow-bg: "rgb(242 194 48 / 0.16)"
  sev-yellow-ink: "#f7dc84"
  sev-orange: "#f07a2e"
  sev-orange-bg: "rgb(240 122 46 / 0.18)"
  sev-orange-ink: "#fbbf96"
  sev-red: "#ef5350"
  sev-red-bg: "rgb(239 83 80 / 0.18)"
  sev-red-ink: "#f9b3b2"
  sev-unknown: "#8d9ba3"
  sev-unknown-bg: "rgb(141 155 163 / 0.16)"
  sev-unknown-ink: "#cbd5db"
typography:
  display:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(2.4rem, 1.2rem + 3.8vw, 4.75rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(1.6rem, 1.1rem + 1.6vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  kicker:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.72rem"
    fontWeight: 500
    letterSpacing: "0.14em"
    textTransform: uppercase
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
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  panel: "1.5rem"
  full: "9999px"
spacing:
  gutter: "1rem"
  gutter-sm: "1.5rem"
  container: "80rem"
components:
  glass-panel:
    backgroundColor: "{colors.glass}"
    border: "1px solid {colors.glass-line}"
    rounded: "{rounded.panel}"
    padding: "24px 32px"
    backdropFilter: "blur(18px) saturate(1.4)"
  header:
    backgroundColor: "{colors.glass-strong}"
    height: "64px"
  nav-pill:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.full}"
    height: "44px"
  nav-pill-active:
    backgroundColor: "accent at 14%"
    border: "accent at 45%"
    textColor: "{colors.ink}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.full}"
    height: "44px"
  button-glass:
    backgroundColor: "{colors.glass}"
    border: "1px solid {colors.glass-line}"
    rounded: "{rounded.full}"
    size: "44px"
  map-chip:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.full}"
    height: "44px"
  map-chip-selected:
    backgroundColor: "accent at 16%"
    border: "accent at 55%"
  severity-badge:
    backgroundColor: "{colors.sev-yellow-bg}"
    textColor: "{colors.sev-yellow-ink}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
---

# Design System: Portugal Agora

## Overview

**Creative North Star: "Mission Control"**

Portugal Agora is a live operations screen for the country. The home page is dark and almost empty: Portugal floats in 3D at the centre, the only light on the page, every distrito raised to a height and lit in the colour of its official IPMA level, with the Açores and Madeira on their own plates in the sea. The camera comes down from overhead on arrival, then travels with the visitor's scroll: from the whole country to the warnings, north to the fires (columns of light), out over the Atlantic to the earthquakes (rings), and back to the country recoloured by wildfire risk. Glass panels float over the scene and carry everything a visitor reads.

Topic and district pages keep the same ground and glass: a large Geist title, a mono timestamp, the interactive map in a glass frame (it opens in 3D), and the detail as ruled lists inside glass panels.

Colour does almost no decorative work. The IPMA levels carry the saturated colour; cyan is reserved for interaction and live data; everything else is near-black, blue-grey ink and glass. Every level is still spoken three ways: colour, icon shape and word.

Motion is cinematic once, then still: entrances happen once, the camera only moves when the visitor scrolls, points or chooses, and nothing loops, pulses or turns on its own. With reduced motion everything is in its final state.

**Key Characteristics:**

- One dark ground with a cold ambient glow; Portugal in 3D is the light source of the home page.
- Glass panels (blurred, hairline border, a light rim on top) instead of bands and cards.
- Geist for the interface voice, Geist Mono for labels and times, Atkinson Hyperlegible Next for reading.
- Height on a map always repeats a level, a class, or a real depth or terrain, and the legend says so.
- A "Dia" light theme with the same composition; dark is the house theme.

## Colors

### Ground

- **Night** (`bg` `#05080f`): the page ground, with two fixed radial glows (cyan from the top right, violet from the left). **Night Raised** (`bg-2`) for the emergency strip and the footer.
- **Surfaces** (`surface`, `surface-2`): opaque fills for inputs, menus and hover states.

### Glass

- **Glass** (`glass` at 62%, `glass-strong` at 84%): every panel, the header, the caption bar, the map frame and controls. Always with `glass-line` (a 10% white hairline), `glass-hi` (a 14% white rim on the top edge) and an 18px backdrop blur.

### Interaction

- **Signal Cyan** (`accent` `#6fe3ff`, `#0060c7` in Dia): links, focus rings, the active nav pill, selected chips, the primary button (with `accent-ink` text), the live dot and the quake rings. Its glow (`glow`) is used only behind the active pill and the primary button.

### The IPMA scale

- **Map fills** (`land-*`): the 3D districts, level marks and legend chips; fixed across themes. Text on them is `ink-on-land` (white on red).
- **Page severity** (`sev-*`, `sev-*-bg`, `sev-*-ink`): the badge triplets; in dark the backgrounds are translucent tints of the level.
- **Fire** (`fire`): the columns of light on the scene and the fire legend.

### Named Rules

**The Only Colour Is Severity Rule.** Saturated colour is an IPMA level or a hazard; cyan is interaction and live data; decoration stays in near-black, blue-grey and glass.

**The Three Ways Rule.** No level is ever shown by colour alone: every mark carries its icon shape (circle-check, triangle, diamond, octagon, question circle) and, nearby or in assistive text, its word.

**The Glass Over Light Rule.** Text never sits directly on the 3D scene: it sits on glass, and a vignette darkens the edges of the scene behind the panels.

## Typography

**Display:** Geist 500–700 (`--font-display`). **Data:** Geist Mono 500 (`--font-data`, Tailwind `font-mono`). **Body:** Atkinson Hyperlegible Next (`--font-sans`).

- **Display** (600, fluid 2.4rem to 4.75rem, 1.0, -0.035em): one page title. The home and district headlines use a smaller clamp (2.1rem to 3.6rem) inside their panel.
- **Title** (600, fluid 1.6rem to 2.5rem, -0.025em): section and panel titles, the big value of each topic panel.
- **Label** (500, 1rem): nav pills, chips, buttons, row titles.
- **Kicker** (Geist Mono 500, 0.72rem, 0.14em tracking, uppercase, `ink-2`): step counters ("02 / 04 · Incêndios"), timestamps, data read-outs, legend labels on the scene.
- **Body** (Atkinson 400, 1rem = 18px root, 1.55): every sentence.

**The Generous Root Rule.** The root is 112.5% of the visitor's setting; never set reading text in px, never below body small.

## Layout

One centred container (80rem; 1rem gutters, 1.5rem from 640px).

- **Header:** a glass bar. From 1440px one row (logo, nav pills, district picker, "Perto de mim", theme, language), sticky; below that the nav pills (in English especially) do not fit between the logo and the controls. From 1024px two rows (nav below), sticky. Below 1024px three rows (district and "Perto de mim" get their own row, then the nav) and it scrolls away with the page.
- **Home:** the scene is fixed behind the whole page. A full-height hero: on wide screens the bulletin panel on the left (6 of 12 columns) with the country on the right; on phones and tablets (below 1024px) the panels take the full width, so the country gets its own space between the header and the panel (`data-scene-frame`: at most 22rem, less on short screens so the headline shows on the first screen, and none below 600px of height, where the headline comes first). Then one stop per topic: on wide screens 92% of the viewport each, panel on the left; on phones a 42svh space above each panel where the camera frames that topic, then the panel scrolls over it. Finally all the distritos. Without the scene (loading, no WebGL, Save-Data) the flat SVG map sits in the hero space and the topic panels follow each other with no empty spaces.
- **District page:** the same, with the camera on the distrito (on phones, framed in the space above the panel) and the forecast below.
- **Topic pages:** title block, then the map (sticky under the header on wide screens) beside the lists in glass panels.

## Elevation & Depth

Depth is the 3D scene (perspective, fog, a faint grid floor), the glass over it, and one shadow (`0 24px 60px -24px` black at 75%) that every glass surface carries. No other shadows.

**The Relief Rule.** Height on a map always means something and the legend always says what: on the home and district scene it repeats the warning level (none 8, unknown 5, amarelo 24, laranja 40, vermelho 58 units) or, in the risk stop, the risk class (11 units per class); on the topic maps it is a real depth (earthquakes, ×3), real terrain (wildfires, ×2) or the risk class (concelhos). Emphasis is a lift and a cyan outline, never a glow on the land.

## Components

### Glass Panel (signature)

The container for everything a visitor reads: `glass`, 1.5rem corners on the home and district panels (1rem for sections), 24 to 32px padding. Sections inside pages are glass panels with a Geist title and their source line.

### Bulletin Panel

Kicker with a static cyan live dot ("Boletim nacional · ao vivo"), the headline, the mono timestamp, the compact topic rows (a 32px level mark, a small label, the value in Geist with Atkinson detail, an arrow) and the level rule.

### Caption Bar (lower third)

`glass-strong`, a rounded level block (map fill, icon, word) and the caption: distrito name in Geist, one sentence in Atkinson, an "Abrir [distrito]" link. Pointing at a distrito on the scene swaps it; a floating glass tag with the name and level also appears above that distrito. With a finger there is no pointing: the first tap shows the tag, with an "Abrir [distrito]" line, and the second tap (or a tap on the tag) opens the distrito; a tap on the sea clears it. The flat map works the same way.

### Topic Stop

One per topic on the home page: a kicker step ("02 / 04 · Incêndios"), a 48px level mark beside the value at title size, the detail, a short summary (the warned distritos as pills; the three largest active fires; the three latest notable earthquakes; the risk distribution bar), a one-line legend saying what the scene shows, and the primary button to the topic page.

### Header and Navigation

Glass header; the logo (mainland silhouette in `ink`, with a dot in the national level ringed in `bg`) and "Portugal Agora" in Geist 600. The nav is a pill group: 44px pills, `ink-2` text, the active one with a cyan-tinted fill, cyan hairline and glow; the active pill is the `nav-indicator` view transition, so it slides to the new page. Under 640px the labels are short and the five pills fit 360px. Buttons: "Perto de mim" is the primary cyan pill; theme and language are 44px round glass buttons; the district picker is a glass pill select.

### Buttons and Chips

- **Primary:** cyan pill, `accent-ink` label in Geist 600, 44 to 48px, soft cyan glow, brighter on hover.
- **Glass:** glass pill or circle with a hairline that turns cyan on hover.
- **Map chips:** 44px glass pills; selected chips take a cyan tint and hairline. A disabled 3D chip gets a dashed hairline and `ink-2`.
- **Focus:** a 3px `accent` outline at 3px offset everywhere.

### Lists

Ruled lists inside glass panels: hairlines between items, no inner boxes. Event rows: severity badge, title in Geist, meta in Atkinson, and a "Ver no mapa" glass pill; the selected row takes a cyan tint with rounded corners. Empty states are a dashed rounded box with large slate text.

### District Index

A grid of rounded glass tiles (2 columns, 3 from 640px, 4 from 1024px), each with a level chip and the name; the keyboard path to every distrito.

### Forecast Strip

Five days in one glass panel with hairline dividers: day name in Geist, a cyan weather pictogram, max and min, rain chance in body small.

### Severity Badge

A pill in the level's soft tint with its readable ink, icon plus word.

### Detailed Map (topic pages)

The interactive map on every topic page shows one layer only: that page's topic. The risk page offers fire risk or air quality as a radio pair of map chips, one at a time, and, for fire risk on the continente, a Hoje | Amanhã radio pair; national pages add a Continente / Açores / Madeira choice. Map chips are the glass pills described above. The frame is a glass panel with 1rem corners; it is 45vh tall on phones (at least 300px), 62vh from 640px, and at most 680px from 1024px. Under it, a legend for the shown layer only, in body small slate: round swatches for levels, square ones for the five fire-risk classes.

On a district page the rest of the country is washed over with the page ground and the district is outlined in a heavy dark line; a link leads to the same topic for the whole country. Selecting a distrito, fire or quake outlines or rings it and opens a glass overlay panel at the foot of the map; selecting the same thing again, or closing the panel, clears it and zooms back out.

#### The 3D view

The earthquake, wildfire and fire-risk maps (the risk page only on its fire-risk layer; air quality and warnings stay flat) open in a 3D view that shows what the flat map cannot. A **Mapa | 3D** radio pair of map chips sits with the other chips and takes the visitor back to the flat map; the choice lives in the page's client state and resets on the next page. Without WebGL2, or if the context is lost, the 3D chip is disabled (dashed hairline border, `ink-2` label) with a short body-small note above the frame, and the flat map carries on.

- **Earthquakes, "Profundidade":** a crust block of the chosen region (Continente, Açores or Madeira, with a margin of sea) seen from the south-south-west at 55°. Sea level is a translucent plane (sea blue at about 30%), the distritos are hairlines on it (the page's distrito in `ink`), and each quake is a sphere at its depth under the epicentre, joined to the surface by a faint drop line. Size follows magnitude on the same scale as the flat map; colour is the level from the map palette (`info` below 3.5); a felt quake carries a thin `ink` ring; older quakes are more transparent. A quake with no depth given stays at the surface with a dashed `ink` outline. The selected quake takes an outline in the interaction accent. Depth grid lines run round the block at 0, 10, 20, 50 and 100 km, only as deep as the data needs; their labels are real HTML text in body small on `surface` chips beside the nearest vertical edge, and a label that would overlap the one above it hides.
- **Wildfires, "Relevo 3D":** the same MapLibre map with Mapterhorn terrain, a discreet hillshade under the layers and a 55° pitch; fire markers sit on the ground. Rotation and the compass in the zoom control exist only in this view.
- **Fire risk, "Risco em altura":** each concelho is extruded to a height that repeats its risk class (1 to 5) in the class colour; no terrain.

Every 3D legend opens with one bold `ink` line saying what it exaggerates ("Profundidade exagerada 3×", "Relevo exagerado 2×", or that the height repeats the class and is not relief), then the usual level scale. The detail panel and the list still give each level by word and icon (the Three Ways Rule), and the selection is the one the flat map uses, so "Ver no mapa", the list and the panel behave the same in both views.

**Camera.** Each 3D view opens with one entry (1.8s, ease-in-out): on the earthquake block the camera comes down from overhead, further out and turned, to its home view while each quake sinks from the surface to its depth (a quake that arrives later sinks too); on the wildfire and risk maps the map tilts to 55° and turns 12°, and on the risk map the concelhos rise from the ground to their class. After that the camera moves only when the visitor moves it or chooses an event: choosing (or clearing) a quake glides there in 600ms, ease-out, and so do "Repor vista" and later switches between Mapa and 3D. With reduced motion every move is a jump. On the earthquake block, dragging orbits within limits (never under the sea plane, never upside down); zooming needs Ctrl/⌘ with the wheel or two fingers, as on the flat map, and a wheel without the key shows the same hint. Seven 44px buttons in two rows at the top right, clear of the detail panel even on a phone (round glass buttons) zoom, rotate, tilt and reset. The canvas is focusable: arrows rotate and tilt, + and − zoom. It is `role="img"` with a generated summary (how many quakes, the deepest in km); the list stays the text equivalent and "Saltar o mapa" still skips it.

### Share Image

The 1200 x 630 image each page shares, per locale. The light soft background of the national or district level fills the card, with a 28px bar in that level's solid colour down the left edge. Top row: the site logo as a silhouette (the mainland in ink with the level dot ringed in the background colour), "Portugal Agora" in Barlow Semi Condensed bold, the place in Atkinson. Middle: the headline in Barlow Semi Condensed bold (size steps down with length, 1.08 leading, at most four lines). Foot: the data timestamp in Atkinson bold, then the sources line in slate. No level pill: the bar, the dot and the headline carry the level. Fonts come from the project's own font files, not the network.

## Motion

Cinematic once, then still. Every transform is a perspective rotation or a move in depth, eased with expo-out (`cubic-bezier(0.16, 1, 0.3, 1)`) unless noted.

- **Home and district scene:** fades in over the flat SVG map that painted first; the camera comes down from overhead, further out and turned, to its first view while the distritos rise to their heights (1.6s). Then it moves only with the visitor: each section on the home page has a camera position, and the camera blends between them as the page scrolls (damped, never ahead of the scroll). On wide screens the country centres in the space under the sticky header; on phones each section's subject (the whole country, the mainland, the north, the Açores) is fitted to the space above its panel, with the target in the middle of that space (a lens shift, so the perspective does not change) and the fog pushed back as the camera pulls out. The island labels only show inside that space. The mouse tilts the camera a few degrees; pointing a distrito lifts it. In the risk stop the distritos recolour and re-extrude to the risk class; the fire columns and quake rings brighten in their own stops.
- **Titles:** tilt up into place (1000ms); only the transform moves, so the text reads from the first frame.
- **Caption bar:** flips up from its bottom edge while wiping open (950ms, 350ms delay); a caption change turns down into place like a split-flap board (340ms).
- **Topic rows and forecast days:** turn into place one after another (rows 800ms, 90ms apart; days from their left edge, 80ms apart).
- **Lists:** items below the screen tilt up from depth once as they scroll into view.
- **Topic maps:** see Detailed Map, Camera.
- **Page handover:** the old page recedes in depth (300ms); the new one rises from below, straightening (750ms, 120ms delay). The active nav pill slides to the new tab (280ms).
- **Live data:** a list item that arrived in the last refresh is tinted once (2.4s).
- **Reduced motion:** every animation jumps to its end; the scene appears in its final state with the camera at the overview and no parallax; topic maps jump; nothing waits hidden for a scroll.

## Do's and Don'ts

### Do:

- **Do** put everything a visitor reads on glass, never directly on the scene.
- **Do** show each level with its colour, its icon shape and its word.
- **Do** say in a legend what every height or exaggeration on a map means.
- **Do** keep the flat SVG map as the first paint and the no-WebGL fallback, and the district index as the keyboard path.
- **Do** set the interface in Geist, data and times in Geist Mono, and every sentence in Atkinson Hyperlegible Next.
- **Do** keep touch targets at 44px or more and respect reduced motion.

### Don't:

- **Don't** use saturated colour for anything that is not a level or a hazard; cyan is only interaction and live data.
- **Don't** let anything move on its own after its entrance: no idle orbit, no pulsing live dot, no loops, least of all on the red and orange levels.
- **Don't** add shadows beyond the glass shadow, or glows on the land.
- **Don't** put `land-*` fills behind reading text or use them for decoration.
- **Don't** make the scene the only way to reach information: every number on it is also in a panel or a list.
