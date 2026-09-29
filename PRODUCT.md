# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Friends and family playing short party word games on their own phones, in the same room or on a call. Casual mixed groups (kids and adults). Phone-first: one phone passed around, or each player on their own device joining a four-character room code. No accounts, no sign-in.

## Product Purpose
Little Sylly Games ("the Word series") is a shelf of 20 distinct party word games in one free, offline-capable installable web app (PWA). Each game has its own rules, colour and voice. Success is a group going from opening the app to playing in seconds, with the game's personality carrying the night.

## Positioning
Named for Sylvia ("Little Sylly"), the brand is one family-made shelf of many different word games, each with its own identity, rather than a single game. It is free, installable, works offline, and has no accounts, ads or backend. Another word-game site could not truthfully claim that brand and breadth.

## Operating Context
Played in living rooms, cars, cafes and on calls, often one-handed on a phone, sometimes under a timer. Modes: pass-the-phone (single device), team lobby, and multiplayer with each player on their own device over a room code. Also Solo and host-added bot seats (SW v247). Hosted on GitHub Pages; no backend beyond Firebase Realtime Database for lobbies.

## Capabilities and Constraints
- Vanilla JS, HTML, CSS, Tailwind (local file); no build step in the runtime, no external runtime dependencies, single-page app.
- Effects are synthesised audio; background music is the only audio file type.
- Install size matters: any new precached asset needs an agreed per-file ceiling.
- Australian English and metric units throughout.
- Test device: owner's iPhone SE (375x667, 375x548, 320x452 Display Zoom).
- `index.html` is generated from `src/screens/*.html`; edit the partials.
- Design rules live in `.claude/rules/ui-style.md` and `docs/rules/per-game-classes.md`. **The owner treats these as a guidebook, not law:** nothing in them is a hard prohibition, and they may be changed or updated when a better design earns it. Prefer them by default, and propose an update to the rule when departing from one.

## Brand Commitments
- The name "Little Sylly Games" and the Sylly Tone: playful, cheeky, Australian where natural, never forced.
- Every game keeps its own brand colour (see `CLAUDE.md` Per-Game Quick Index) and thematic voice; each has an identity doc in `docs/game-identities/`.
- Fredoka is the self-hosted typeface today.

## Evidence on Hand
- 20 shipped games with identity docs (`docs/game-identities/`), implementation notes, and verification harnesses under `tools/`.
- Real artwork exists for several games (core art packs in `data/art/`). No testimonials, user metrics or press exist; none should be invented.

## Product Principles
1. Seconds to play: nothing between opening the app and a round beginning.
2. Each game is its own world, but the shelf is unmistakably one family.
3. Phone in one hand: reachable controls, big targets, readable at a glance mid-round.
4. Works offline and stays light: no dependencies, small installs.
5. Playful, never forced: personality lives in the words and details.

## Accessibility & Inclusion
Mixed ages, including children. Minimum 44 px touch targets (settings pills 39 px by owner decision). Reduced motion is honoured globally and in JS animation loops. The owner has knowingly accepted low-contrast white button ink on four light-fill brand colours (FRT, YGI, COMB, CLD); revisit only if the owner asks.
