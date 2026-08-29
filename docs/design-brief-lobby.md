# Design Brief — Little Sylly Games: Title Screen (the Lobby)

Paste-ready context for Claude Design. Everything below is verified against the shipped
`index.html`, `css/styles.css`, `js/secret-mode.js` and the 18 identity docs as of 28 Aug 2026
(SW v211).

---

## 1. What the product is

**Little Sylly Games** — a single-page, offline-first PWA holding **18 party games** for a group of
people in the same room, each on their own phone (or passing one phone around). Tagline in the
manifest: *"Serious games for silly people."* Zero backend, zero third-party runtime dependencies,
GitHub Pages hosted. Everything renders from HTML/CSS/emoji — **there is not a single image asset
on the title screen today.**

The audience is friends around a table, mid-conversation, one-handed, on a mid-range phone.
Australian English throughout (colour, flavour, organise). Metric only.

---

## 2. The screen being redesigned

`#screen-lobby` — the app's front door, and the only screen not owned by a game. Current markup, in
order:

```
<section id="screen-lobby"
  class="relative flex flex-col items-center justify-center px-6 py-12
         w-full max-w-sm mx-auto text-center gap-6">

  🔊  .btn-open-sound            absolute top-4 right-4, text-xl text-stone-400
  🎮  #lobby-icon                text-6xl
      <h1> "Little Sylly"        text-5xl font-bold leading-tight text-stone-800
      <h1> "Games"               text-5xl font-bold leading-tight text-pink-500
      <p>  "What are we playing today?"   text-stone-500 text-lg
      18 x full-width brand-coloured buttons, flex-col gap-4, mt-2
</section>
```

Every game button is the identical shape:
`min-h-14 w-full rounded-2xl bg-[brand] hover:bg-[brand-dark] active:scale-95 text-white text-xl
font-semibold transition-all duration-150` — differing only by fill colour and label.

**The core problem to solve:** eighteen identical full-width bars in a vertical stack. It was right
at three games and is now a long scroll of colour bars with no hierarchy, no way to tell what a game
*is*, no sense of player count or how long it takes, and no room to grow to game 19.

---

## 3. Brand system (fixed — design within this)

| Token | Value | Use |
|-------|-------|-----|
| Font | **Fredoka**, variable 300–700, self-hosted woff2 | everything; rounded, friendly, no second face |
| Page background | `stone-50` **#FAFAF9** | body, all screens |
| Surface | `white` + `rounded-2xl shadow-sm` | every card in the suite |
| Primary ink | `stone-800` **#292524** | headings, values |
| Secondary ink | `stone-500` **#78716C** | body copy |
| Tertiary ink | `stone-400` **#A8A29E** | descriptions, hints, icon chrome |
| Neutral fill | `stone-200` **#E7E5E4** / `stone-700` **#44403C** | back/cancel · secondary CTAs |
| Container | `max-w-sm` (384 px), `mx-auto` | **every** screen; this is a phone-first app |
| Corner radius | `rounded-2xl` (1rem) buttons/cards, `rounded-3xl` overlays, `rounded-xl` inputs | — |
| Touch minimum | 44 px (`min-h-11`); primary CTAs are `min-h-14` | non-negotiable |
| Theme colour | **#EC4899** (pink-500) | manifest / browser chrome |

**No dark mode exists.** The app is light-only; don't design a theme toggle unless it's an explicit
ask.

**Motion standard (already enforced suite-wide):**
- Only `transform` and `opacity` may animate. Never width/height/top/left.
- Tap feedback is `active:scale-95`, 100–160 ms. Hard ceiling **300 ms** for anything that isn't a
  full-screen overlay (overlays may go to 500 ms).
- Easing: `ease-out` entering/exiting, `ease-in-out` moving on-screen, **never `ease-in`**.
- Screen entry is a `fadeIn` at 0.2 s (opacity + 6 px translateY).
- A global `prefers-reduced-motion` block zeroes every duration — nothing extra needed per feature.

**Layout law — "the Stack".** Every screen is one centred column: Header / Stage / Controls as
*siblings* inside a single `max-w-sm` flex column with `gap-4`, held by a
`flex items-center justify-center min-h-screen overflow-y-auto` section. The whole column scrolls as
a unit; nothing pins to a screen edge, no sticky footers, no split wrappers. A redesigned lobby
should stay inside this law or consciously argue its way out of it.

---

## 4. Hidden behaviour the redesign must preserve

Easy to destroy, hard to notice:

1. **7 rapid taps on `#lobby-icon` (🎮) opens the Secret Terminal** (`screen-secret-controller`) —
   a hidden Konami-code screen gating expansion word packs, art skin packs and an arcade cabinet.
   The 🎮 must stay a real, tappable, reasonably large element with that exact id.
2. **An arcade tile (🕹️) is injected by JS beside `#lobby-icon`** once unlocked —
   `smShowArcadeTile()` wraps the icon in a new `flex items-center justify-center gap-4` row and
   appends a sibling button. Whatever the icon lives inside must tolerate a second element appearing
   next to it.
3. **The speaker `.btn-open-sound`** is a delegated global — class, not id. Every screen has one. On
   full-screen menus it sits `absolute top-4 right-4`, which requires the section **not** to carry
   `min-h-screen` (or it detaches to the viewport top).
4. **Game entry buttons carry fixed ids** — `#btn-dstw`, `#btn-great-minds`, `#btn-sylly-signals`,
   `#btn-jec`, `#btn-ygi`, `#btn-lttp`, `#btn-nat`, `#btn-dsd`, `#btn-bld`, `#btn-gth`, `#btn-dyb`,
   `#btn-pass`, `#btn-nt`, `#btn-frt`, `#btn-shp`, `#btn-flw`, `#btn-pko`, `#btn-cjar`. The first
   three are legacy ids that don't match their display names.
5. Every game menu exits via **"← Back to the Box"** — the lobby *is* the Box. That metaphor is
   available and currently unused visually.

---

## 5. The 18 games — content for cards

Each game already has a full identity doc (`docs/game-identities/[abbr].md`, 15–25 KB) holding the
copy a rich info card would need. The pitch below is the opening of each doc's **T1 — The Pitch**;
longer copy, terminology, how-to-play and the Sylly Mode description are all in there.

| # | Game | Emoji | Brand | Hex | Players | Modes | Sylly Mode | Pitch (opening) |
|---|------|-------|-------|-----|---------|-------|-----------|-----------------|
| 1 | Like I'm Five | 💬 | pink-500 | #EC4899 | 2 teams | PTP · TLM | Extra Credit | Explain the word to your team like they're five — without saying any of the ten banned words. |
| 2 | Great Minds | 🧠 | violet/purple-500 | #A855F7 | exactly 2 | PTP · MDLM | Static Interference | Two minds, one word pair, zero talking — guess the word your partner is also about to guess. |
| 3 | Secret Signals | 📡 | teal-500 | #14B8A6 | 4 or 6 | PTP · TLM · MDLM | Intel Phase | Describe a number code with clues cryptic enough for the enemy, clear enough for your own team. |
| 4 | Just Enough Cooks | 🍳 | amber-500 | #F59E0B | 3–6 | PTP · MDLM | Fusion Cuisine | Secretly write a shopping list for the same dish; win by landing in the middle of the table's taste. |
| 5 | You Get It? | 🃏 | orange-500 | #F97316 | 3–6 | PTP · MDLM | The Ringer | The same fill-in-the-blank sentence for everyone; the group votes for whoever *nailed* it. |
| 6 | Late to the Party | 🏃‍♂️ | red-500 | #EF4444 | 4–6 | PTP · MDLM | The Troublemaker | Everyone knows where the party is except you — and the questions you ask give you away. |
| 7 | Natural Selection | 🦁 | lime-600 | #65A30D | 3–8 | PTP · MDLM | Survival of the Fittest | Everyone knows the animal; one person has only the category and has to fake it. |
| 8 | Deep-Sea Deploy | ⚓ | cyan-700 | #0E7490 | 4 or 6 (2v2 / 3v3) | PTP · TLM · MDLM | Silent Running | One person can see the minefield; everyone else can see a word and a number. |
| 9 | Group Therapy | 🛋️ | sage (custom) | #B1BCA0 | 4–8 | MDLM | Stroke or Genius | Everyone draws their own diagnosis at once; nobody knows whose scribble is whose. |
| 10 | The Bluff | 🎲 | ocean (custom) | #1E4D8C | 3–8 | MDLM | The Tempest | Private dice, public claims — believe them, or call it. |
| 11 | Bailed | 📋 | red-800 | #991B1B | 5–10 | MDLM · PTP | Drama Mode | Someone in the group chat is going to flake, and five plans need to happen first. |
| 12 | Pass | 🃏 | zinc-900 | #18181B | 3–6 | MDLM | The Abyss | A climbing card game — beat the table's combo, or pass and wait for your shot. |
| 13 | Net-Trace | ⚡ | emerald * | #10B981 | 2–8 | PTP · MDLM | Devil's Network Protocol | Build the maze that slows an incoming breach for the longest. |
| 14 | Fruit Salad | 🍌 | electric lemon (dark ink) | #FFE500 | 2–8 | MDLM | Fruity Personalities | Slide a face-down card to someone and name a fruit. It might even be true. |
| 15 | Counting Sheep | 🐑 | midnight (custom) | #3A3D52 | 3–8 | MDLM | Night Terrors | Keep the count at or under 99 — or you're out. |
| 16 | Flawless | 💎 | pink pair (custom) | #F9A8D4 / ink #A02050 | 3–4 | MDLM | The Counterfeit Run | You hold two gems: the one you show the table, and the one you're hiding. |
| 17 | Pecking Order | 🐘 | amber-brown (custom) | #854D0E | 3–6 | MDLM | Force of Nature | A Bear beats a Leopard because a Bear actually eats a Leopard. |
| 18 | Cookie Jar | 🍪 | honey-gold (dark ink) | #D4A017 | 3–8 | MDLM | Dibber Dobber | Everyone's hand is in the same jar, and the card you're betting on hasn't been seen yet. |

`*` **Two live inconsistencies worth settling in the redesign rather than preserving:** the lobby's
Net-Trace button ships `bg-emerald-500` while the documented brand is emerald-600; Great Minds' lobby
button is `bg-purple-500` while its own CTAs are violet-500 (a known, documented split).

**Modes:** PTP = pass one phone around · TLM = two devices, one per team · MDLM = every player on
their own device over a shared room code. Eleven of the eighteen are MDLM-only.

**Only six of the eighteen have real artwork** (Pecking Order, Flawless, Fruit Salad, Counting
Sheep, plus skinnable card seams in Cookie Jar and The Bluff). The other twelve have **an emoji and
a colour and nothing else**. Any design assuming per-game hero imagery has to degrade gracefully for
two-thirds of the suite.

---

## 6. Component vocabulary already in the system

Reuse these rather than inventing new shapes:

- **Primary CTA** — `min-h-14 w-full rounded-2xl bg-[brand] text-white text-xl font-semibold`,
  `active:scale-95`. **Action button labels carry no emoji** — a hard suite rule; emoji live in
  headings, icons and body copy only.
- **Card** — `bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-*`. Used for every setting,
  how-to step and scoreboard tile in the app.
- **Pill** — `.pill` / `.pill-active-[colour]`, the primitive behind every multi-choice control.
  The natural existing shape for a filter row (by player count, by mode, by length).
- **Eyebrow label** — `text-xs font-semibold uppercase tracking-widest`, brand-coloured.
- **Two overlay patterns only** — a bottom slide-up data sheet (80vh, `rounded-t-3xl`, for
  scrollable content) and a centred decision modal (`rounded-3xl`, auto height, ≤3 controls,
  brand-tinted 1 px border). **Do not invent a third.** A game info card opened from the lobby is
  Pattern 1, the slide-up sheet.
- **Backdrop tap dismisses every overlay** automatically, provided the close button's id ends in
  `close` / `cancel` / `done` / `ok` / `dismiss`.

---

## 7. What to explore

The brief deliberately doesn't prescribe answers to these:

1. **How do 18 (soon 19+) games get browsed in a 384 px column** without an undifferentiated
   colour-bar scroll? Tile grid, grouped sections, carousel, search/filter — all open.
2. **Does a game need an info step before launch?** The identity docs can supply pitch, player
   count, rough length, modes and Sylly Mode name per game — enough for a real info card. Today a
   tap goes straight to that game's menu (Play / How to Play / Settings / Back to the Box), so an
   info card either replaces that menu or sits in front of it.
3. **What signals belong on a tile at rest?** Player count is the single most-asked question at a
   real table ("we've got five, what can we play?"), then "how long is it?".
4. **Does the title block earn its current size** — two `text-5xl` lines plus a `text-6xl` 🎮 plus a
   sub-line, roughly the top third of the viewport — when the screen's real job is choosing a game?
5. **What does "the Box" look like?** Every game exits via "← Back to the Box" and the lobby has
   never visually cashed that metaphor.

**Constraints on any answer:** no external assets or fonts (Fredoka + system emoji only), fully
offline, light theme only, one-handed on a phone, 44 px touch targets, and the hidden 7-tap 🎮
affordance survives intact.
