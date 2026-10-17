# Flip You For It: Build and Visual Notes (alpha 2)

For the build phase. Records what the alpha prototype actually does for visuals, interaction, sound and structure, so the real build can match it, or knowingly change it. Where the brief and this file differ, the brief is the design intent and this file is "what the prototype does today".

Sources: `fyfi-prototype-source/style.css`, `assets.js`, `app.js`, and the preview images `caps-preview.png`, `board-cement.png`, `board-pavement.png`.

## 1. Vocabulary used in the UI

| Spec / engine word | Shown to players as |
| --- | --- |
| card | cap |
| match (one game on the board) | bout |
| series of bouts | match (Best Of 3 or 5) |
| Same | Match-Up |
| Same Wall | Wall Match |
| Combo | Chain Reaction |
| Quick Match | Quick Deal |
| Draft | Swap Pile |
| held card of the second placer | Pocket Cap |
| Sudden Death | Tie-Breaker (the code and log still say `sd`) |
| turn timer | Flip Clock |
| settings screen | House Rules |
| simulation screen | Balance lab (testing only, does not ship) |

Player colours: Player 1 is **cobalt**, Player 2 is **tangerine**. Unclaimed caps in the pile are grey (neutral).

## 2. Cap

A cap is one SVG drawn in a 100 x 100 box (`capSVG(card, owner)` in `assets.js`). It is rendered at any size by scaling the SVG.

- **Layers, back to front:** outer tier band (r 48.7), dark rim base (r 47.6), face with a radial gradient in the owner colour (r 40.4), sticker art clipped to the face and tilted by a stable per-cap angle of -6 to +6 degrees, an edge-fade ring, a thin dark outline, four rim arcs with a highlight line, four number plates.
- **Number plates:** white circles (r 10.7) on a ring (r 12.4) at top (50, 12), right (88, 50), bottom (50, 88), left (12, 50). Digit in Fredoka 700, 17.5 px in the box, dark ink. **S** is shown in amber (`#b45309`), slightly larger (18.5), with a gold ring.
- **Owner colours:** cobalt face gradient `#7ab0ff` to `#2563eb` to `#1d4ed8`, rim `#1e3a8a`. Tangerine `#ffc48a` to `#f97316` to `#ea580c`, rim `#c2410c`. Neutral `#e7e5e4` to `#b4aea8` to `#8b847d`.
- **Tier is shown on the band only** (the player never sees budget numbers):
  - Legend: holographic gradient band plus a soft gold glow around the whole cap.
  - Veteran: chrome (silver) gradient band.
  - Specialist: dashed pale-gold band.
  - Wildcard: no band.
- **Sticker art:** 21 placeholder drawings keyed by name (list in `assets.js`, `STICKER_NAMES`). Each sits in a 100 x 100 box, about 70 units wide, with a white outline and shadow added by a shared filter (`#stk`). **To use real art:** each cap needs a `<symbol id="st-<slug>">` (or an `<image>`) that draws in a 100 x 100 box. Keep ~15 units clear at the edge so number plates do not cover the picture.
- **Accessibility:** each cap has `role="img"` and an `aria-label` that reads the name and the four edges.
- **Drop shadow:** `drop-shadow(0 2.5px 2px rgba(0,0,0,.38))`.

## 3. Board

- Square, rounded 24 px, background `--board` (dark cement `#444446` or light pavement `#cfcbc6`; choose with the Board surface setting). Both are previewed in the PNGs.
- A noise filter (`feTurbulence`, 2 octaves) gives the asphalt speckle; a second displacement filter makes the chalk lines look hand-drawn.
- The 3 x 3 grid is inset 14 % on every side and drawn in chalk (stroke width 1.15 in a 100-unit box, round caps). Colour `--chalk` (`#f7f6f3` on cement, `#3f3b38` on pavement).
- **Wall numbers** are chalk numerals (Fredoka 700, size 10.5) centred on each of the four outer edges at 7.4 / 92.6 units from the board edge. They are shown only when Wall Match is on.
- Cells: caps fill 90 % of the cell width. A tap target cell shows a dashed chalk circle; a cell with a chosen cap pending shows the same circle solid. The cap placed last has a gold ring (3 px).
- Perspective 700 px on the grid so caps can flip in 3D.

## 4. Layout

- One phone-width column: `#app` max width 460 px, side padding 16 px (the Balance lab widens to 760 px).
- **Play screen, top to bottom:** top bar (leave button, bout and round label, "?" rules button), score bar (two player chips with name, score and a sub-line; the Flip Clock sits between them), status line, board, your tray of 5 caps (and a Pocket Cap label above the held cap for the second placer in the final round).
- **Swap Pile:** 4-column grid of the 12 caps with a tier label under each, a "taken" dim for chosen caps, and a mini-hand row for each player (5 slots).
- **Overlays:** bottom sheet for inspect and rules, centred panel for results. Scrim `rgba(28,25,23,.55)` (`.65` in dark mode). They respect safe-area insets.
- **Dark mode:** follows the system, with a `data-theme` override for testing. Background `#1c1917`, ink `#f5f5f4`.
- **Type:** Fredoka (600/700) for headings, scores, numbers and the wall numerals. Figtree (400 to 700) for body text. Body size 15 px.
- **Controls:** primary button is cobalt with a 3 px darker lower edge that presses down. Minimum touch height 48 px (38 px for the small variant).

## 5. Interaction

| Action | What happens |
| --- | --- |
| Tap a cap in your tray | Selects it. It lifts 7 px and grows 4 %. Tap again to deselect. |
| Tap an empty cell | Marks it as the target (dashed circle). |
| Tap the same cell again with a cap selected, or tap "Place cap" | Places the cap. A status line under the score bar prompts each step ("Now tap a cell", "Tap the same cell again to place"). |
| Drag a cap from the tray to a cell | Lets go over a cell: cap and cell are both selected, and tapping "Place cap" (or the same cell again) confirms. A floating 84 px copy follows the finger. |
| Long-press any cap (480 ms) | Opens the inspect sheet: large cap, four edges labelled. Works on the board, the pile and the tray. |
| Swap Pile: tap a cap | Opens a pick overlay with a large cap and a Take button. |
| Hidden hands, two humans | A gate screen sits between turns. Tapping it reveals the next player's tray. Gates can be switched off in testing options. |

Open Hands shows both trays at all times; hidden hands shows only the player whose turn it is.

## 6. Animation and timing

| Moment | Spec |
| --- | --- |
| Cap placed | `pop`: scale 1.35 to 1 and opacity 0.2 to 1 over 0.22 s, ease-out. |
| Wait before flips | 260 ms. |
| Flip | Y-axis rotation 0 to 90 degrees in 130 ms (ease-in), swap colour, then -90 to 0 in 150 ms (ease-out). |
| Flip order | Match-Up flips together as one step, then plain flips together as one step, then each Chain Reaction depth, one step per depth. 110 ms pause between steps, 220 ms after the last. |
| Coin toss | 1.7 s: rises 70 px, spins, lands on the winner. Result is shown at 1.75 s. |
| Bot "thinking" | Random pause of 0.65 to 1.15 s before the bot acts, so it feels like a person. (The Hard bot's search itself takes about 0.3 to 0.5 s.) |
| Auto package choice by the bot | 1 s. |
| Flip Clock | 60 s per pick or placement; random legal move on expiry; the clock pill turns red when low. |
| Reduced motion | The coin finishes at once, the pop is off, lifts and button presses do not animate. |

## 7. Sound (all generated with Web Audio; starts after the first tap)

| Event | Sound |
| --- | --- |
| Place | Triangle wave, 180 Hz sliding to 70 Hz, 0.10 s, volume 0.30. |
| Flip | Square wave, 520 Hz down to 300 Hz, 0.07 s, volume 0.07. Each later step in a chain is a semitone-and-a-bit higher (x1.12 per step). |
| Match-Up | Two sine tones, 880 Hz and 1320 Hz, 0.35 s. |
| Clock tick | Square 1100 Hz, 0.03 s. |
| Coin | Six rising triangle blips, 120 ms apart. |
| Win | Triangle arpeggio 523, 659, 784, 1046 Hz. |
| Draw | Two 440 Hz notes. |
| Sound setting | On / Off in testing options, saved. |

## 8. Settings and defaults (saved in `localStorage`, key `fyfi-alpha`)

| Setting | Key | Default |
| --- | --- | --- |
| The Deal | `mode` | `quick` (Quick Deal) |
| Hands | `openHands` | `false` (hidden) |
| Wall Match | `sameWall` | on |
| Wall numbers | `wallHigh` | on = 7 to 9 (off = 1 to 9) |
| Plus | `plus` | off |
| Chain Match | `chain` | off |
| Best Of | `bestOf` | 3 |
| Flip Clock | `timer` | off |
| Opponent | `opponent` | `ptp` (pass the phone) |
| Bot skill | `botLevel` | 1 (Medium) |
| Pass-the-phone gates | `gates` | on |
| Board surface | `board` | `cement` |
| Sound | `sound` | on |
| Names | `names` | Player 1 / Player 2 |

These are the prototype's defaults for testing. The brief's recommended shipping defaults (section 2) win where they differ.

## 9. Game log (for playtests)

- Saved in `localStorage` under `fyfi-log`, the last 40 matches, as JSON.
- Opened from the home screen ("Game log"). The Copy button puts the JSON on the clipboard (with a fallback to a read-only text box for browsers that block clipboard access).
- Per match: settings and hands visibility, per bout the seed, who placed first, the walls and the hands; per move the cap, the cell, auto or manual, time taken, flips as `[cell, kind, depth]` (kind `s` Match-Up, `b` basic, `c` chain), flags for Same / wall-decided / combo, and for bot moves the search depth and number of sampled opponent hands.
- `tools/playtest-*.js` replay these logs through the engine. Keep the format stable, or update those scripts together with it.

## 10. Build-phase pointers

- **Keep:** `engine.js` as it is (pure, deterministic from a seed, no DOM). Its tests (`test.js`) are the rules contract. If a rule changes, change the test first.
- **Replace:** `assets.js` placeholder art; `app.js` is prototype UI and is expected to be rebuilt for the gamebox shell (menu, MDLM lobby, host-authoritative sync). The engine functions to call from a host: `generatePool`, `dealQuick`, `rollWalls`, `newState`, `legalMoves`, `place`, `score`, `outcome`, `suddenDeath`, and `botMove` for the bot seat.
- **Host-authoritative notes:** all randomness comes from a seed (`mulberry32`), so a host can send seed plus settings and each client rebuilds the same pool. Hidden hands are then a UI matter only; do not send the opponent's hand to a client in Quick Deal.
- **Bots must not read hidden hands.** `botMove` receives `{unseen, samples, nodes}` in hidden mode and never looks at the other hand. A test checks this (swap the hidden hand, the move must not change).
- **Not built yet:** MDLM lobby and sync, real stickers, tutorial and hint system (brief section 23), whole-match simulation, accessibility pass beyond cap labels, localisation.
- **Open decisions that affect the build** (brief sections 19 and 22): Quick Deal information gap for the Hard bot, Hard difficulty level (may be too strong), first-placer fallback rule, whether Plus ships on by default.
