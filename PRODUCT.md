# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Curious, informed people in Portugal (continente, Açores, Madeira) who want the current national picture of official hazards — weather warnings, active fires, earthquakes, fire risk, air quality — in one place, and then drill into a district. They are comfortable with maps and data, but do not want to read the same official text thirteen times. Readers of any age must still be able to use it (see Accessibility).

## Product Purpose

Answer "Como está Portugal agora?" in seconds, with official data, and let the visitor go deeper only where something is happening. Success: the first screen gives a correct, short national summary; detail is one deliberate step away, never dumped on the page.

## Positioning

One calm, non-commercial place that aggregates IPMA, Fogos.pt (ANEPC), Open-Meteo/CAMS and DGT data, normalises it to one severity scale (the official IPMA levels), and stays usable when a source fails (last good data, marked stale) or the visitor is offline.

## Operating Context

- Checked on phones and desktops; often when a storm or fire is in the news, otherwise as a quick daily look.
- Shared on WhatsApp/LinkedIn with dynamic preview images of the current state.
- Data refreshes every minute in the browser; sources update between 2 min and 1 h.

## Capabilities and Constraints

- National summary (headline level = highest IPMA warning in force or forecast), map with layers (warnings by district, fires, earthquakes, fire risk by concelho, air quality), district pages for 18 districts + Açores + Madeira (5-day forecast, warnings, fires, quakes, fire risk today/tomorrow, air quality, UV).
- "Perto de mim": location → district resolved on the device; nothing sent to the server.
- Resilience: stale/unavailable states per source must remain visible and honest.
- Stack: Next.js 16 App Router (Cache Components), React 19, Tailwind 4, MapLibre, SWR. Hosted on Vercel (cdg1).
- Language: European Portuguese only.

## Brand Commitments

- Name: Portugal Agora.
- Strictly non-profit: no ads, no donations, no monetisation (required by Fogos.pt and IPMA terms).
- Must attribute sources visibly (IPMA, Fogos.pt, Open-Meteo/Copernicus CAMS, OpenFreeMap/OSM, DGT CAOP).
- Must state it is informative and does not replace the authorities; emergency number 112.
- Severity always follows the official IPMA scale (verde/amarelo/laranja/vermelho).

## Evidence on Hand

Live official data only. No testimonials, user counts, or press exist; do not invent any.

## Product Principles

1. Summary first, detail on demand: never repeat official text that says the same thing for many places — group it.
2. Official and honest: show the source and freshness of every number; never hide a failed source.
3. Calm, not alarmist: severity is conveyed precisely, not dramatised.
4. Private by default: location stays on the device.

## Accessibility & Inclusion

WCAG 2.2 AA (verified with axe in Playwright). Severity never by colour alone (colour + icon + word). 44 px touch targets, light/dark themes, respects reduced motion. Readable for older users and low vision (generous base size).
