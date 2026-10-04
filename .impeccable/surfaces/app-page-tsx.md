---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/[distrito]/page.tsx"]
---

## Scope

Home (`/`) and district pages (`/[distrito]`). Mode: Operate. Audience: curious, informed users; national summary first, detail one deliberate step away. Complaint being answered: "too much information about everything" (home page was ~9000px, the same IPMA text repeated per district).

## Direction contract

THESIS: Portugal as the evening TV weather bulletin (boletim meteorológico): one flat map of the country coloured by the official IPMA level, and a presenter's one-line summary. Refuses the category dashboard of map + equal-weight card columns + every record printed in full.

OWN-WORLD: Deep broadcast-blue "stage" (sea) that owns the first viewport in both themes; districts as flat fills in the IPMA levels (verde/amarelo/laranja/vermelho) with white borders; Açores and Madeira as boxed insets in the sea; a lower-third caption bar. Condensed broadcast sans (Barlow Semi Condensed) for headline, numbers and captions; Atkinson Hyperlegible Next for reading text. Light cool page ground below the stage; one interaction accent (cyan on stage, deep blue on page).

STORY: The visitor sees in one glance which parts of the country have a warning and how serious, reads one sentence that says it, sees four topic lines (tempo, incêndios, sismos, risco/ar) with counts, and only then opens the grouped detail they care about. Same identical warning text is shown once with its districts listed, never repeated.

FIRST VIEWPORT: Full-bleed blue stage under a slim header. Desktop: right 5 columns = boletim panel (date/time stamp, headline at display size, four topic lines linking to their sections); left 7 columns = server-rendered SVG map (continente large, Açores + Madeira insets), active fires and notable quakes as pictograms. Bottom of stage: lower-third bar with level legend (colour + icon + word) and the live caption. Mobile: headline + topic lines first, map below at full width. Primary action: tap a district (map or chip) → district page.

FORM: TV weather bulletin (my grounded list #1, chosen by the user as pick over the rolled Carta Militar). Seed key 4cce2f67 (re-roll 1). Signature interaction: hovering/focusing/tapping a district on the map drives the lower-third caption like a presenter pointing (name, level, warning types, until when, link). Motion: lower-third wipes in once on load (clip-path, expo-out), caption crossfades; nothing else animates; reduced motion respected.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Interactive MapLibre map moves below the detail as "Mapa detalhado" (layers incl. risco and ar); kept for "Ver no mapa".
