# E.T.A. — Content Guide (`data/eta-data.json`)

**Who reads this:** whoever builds or extends E.T.A.'s Routes and Rides — the owner, or the
content-rebuild session. **Status:** rebuilt 11 Nov 2026 (version 2 — **100 real Routes** at 50 Local / 35 worldwide / 15 space, **30 Off the
Map**, 35 registered Rides, 14 Unregistered), **signed off by the owner** (SW v275; `provisional` cleared). The October starter set it replaced is in git history. Adding to it needs no code change:
edit the JSON, run the check.

**The one command:** `node tools/verify-eta-content.js` — it uses the game's own pairing code, so
"eligible" there means exactly what the deal means. Run it after every edit.

---

## 1. Why every number matters

E.T.A. scores **accuracy against a stored truth**: `true ETA = distance ÷ speed`. Every distance and
every speed in this file is a graded answer. A wrong number is a wrong answer key.

## 2. The file

```json
{
  "version": 1, "provisional": true,
  "window": { "minMinutes": 2, "maxMinutes": 52596000000 },
  "rideTiers": [ { "id": "crawl", "name": "Crawl & Foot" }, … , { "id": "unreg", "name": "Unregistered" } ],
  "routes":  [ { … one per line … } ],
  "rides":   [ { … one per line … } ],
  "quips":   { "dead": [], "close": [], "fast": [], "slow": [] },
  "flavour": [ "Righto, next job.", … ]
}
```

**One Route / Ride per line** (like `words.json`) — readable diffs.

### A Route

| Field | Meaning |
|---|---|
| `id` | unique, kebab-case, never reused |
| `headline` | what couriers read on the job docket ("The length of Italy") |
| `km` | the distance — the answer key's top half |
| `tier` | `local` (human-scale) · `geo` (countries, rivers, the Earth) · `astro` (orbit and beyond). Dispatch Range filters on it: **Local** → `local` only, **Everywhere** → all three (SW v274; Mixed and Cosmic are retired) |
| `briefing` | 1–2 sentences of **assumptions** — the corridor ("a cleared space lane runs the whole way"). Shared by everyone. Wrap the **load-bearing words** — the ones that change the answer — in `**double asterisks**`: they render bold on a highlighter stroke ("A perfectly smooth ramp runs `**straight up**`…"). One to three spans a line; the check fails on an unpaired marker or a Briefing with none (playtest round 1: the docket was hard to read) |
| `useMax` | `true` = "no speed limit": Rides with a `max` use it |
| `limitKmh` | a speed limit every Ride is capped at (e.g. 60 — "the safety car is out") |
| `offMap` | a fantastical Route (Atlantis, the Underworld) — only with the **Off the Map** setting. It states its own made-up distance in the Briefing |

### A Ride

| Field | Meaning |
|---|---|
| `id` | unique |
| `name` | what the courier is handed ("Shopping trolley") |
| `mode` | `land` · `sea` · `air` · `space` — drawn as the **mode badge** |
| `emoji` | optional flavour on the private Ride card only; `null` is fine |
| `tier` | the speed band: `crawl` · `pedal` · `road` · `rail` · `sky` · `unreg` |
| `cruise` | the steady speed in km/h — always present, always finite and positive |
| `max` | optional top speed, used only on a `useMax` Route |
| `reveal` | the one-line fact shown at Proof of Delivery, stating what was assumed |
| `quip` | optional Dotty line used on a fast / slow / **and dead-on** verdict — it replaces the pool line for all three, so it must read right whichever way the courier missed: comment on the Ride, never on the guess ("Even with the wonky wheel.", not "Not at that pace.") ("Launch prep not included. Read the docket."). **Voice:** Dotty, Head of Dispatch — strict, energetic, tough love; short sentences, Aussie worksite English, never "love" |
| `unregistered` | `true` = a no-rego Ride (Sylly Mode only; pays Hazard Pay; hazard-striped badge) |
| `hint` | **required for Unregistered Rides**: a fair, slightly buried Briefing line telling a sharp reader which speed to use ("Wind speeds perfect for a `**gentle ride**`." → the carpet's cruise). Bold its key words like any Briefing line |

## 3. Ground rules for the truth (brief §10)

1. Constant speed, no stops, no rest, no fuel, no traffic — unless a Briefing line says otherwise.
2. **Every Route carries a corridor assumption**, so a snail to Mars is answerable.
3. **Every Ride has a finite, positive speed.** No teleporting, no time travel (the flux-capacitor
   car's capacitor is flat, so it drives at ordinary sports-car speed, and its hint says so).
7. **"Straight" means straight-line.** A Briefing that says *straight corridor* or a headline that
   says *as the crow flies* takes the great-circle distance (Sydney–Melbourne 713 km, not the 880 km
   drive). A Route that follows something — a river, a railway, a highway — takes that length.
8. **A Ride's `max` is used on every `useMax` Route — hints included.** An Unregistered Ride whose
   hint names a gentler speed ("a **gentle ride**", "**half throttle**") must have `max: null`, or a
   flat-out Route silently overrides its own hint.
4. **Vertical Routes** (Everest, the Mariana Trench) say how a skateboard climbs: "a perfectly smooth
   ramp runs straight up".
5. **The game's number is final.** The reveal line states the assumption, so arguments end at the screen.
6. Distances are **universally recognisable** (a marathon, Earth to the Moon) — never local, never
   over-specific ("Route 66", "New York to Sydney").

## 4. Pairing — what the check enforces

- **The answerable window:** a Ride is eligible for a Route only if its true ETA lands between
  `window.minMinutes` (2 minutes) and `window.maxMinutes` (100,000 years).
- **Every Route** needs **≥ 8 eligible Rides spanning ≥ 3 registered tiers** — in Standard *and* in
  Backseat Drivers (8 couriers is the biggest table).
- **Every Range** needs **≥ 7 real Routes** so a Long Shift never repeats.
- The deal itself (in code) draws one Ride per seat **for spread**: eligible Rides sorted by speed,
  cut into one band per seat, one from each, avoiding near-identical speeds (within ×1.15) and a Ride
  the courier already held this Shift.
- When Off the Map is on, about **1 Route in 4** is a fantastical one.

## 4b. The Briefing line library

Reuse these before writing a new corridor line — couriers learn them, and a familiar line reads fast.
Bold stays exactly as shown.

| Use for | Line |
|---|---|
| Straight ground Route | A brand-new, perfectly **straight, empty corridor** runs end to end. **No stops, no traffic.** |
| Any-Ride crossing | A **cleared corridor** runs the whole way — **whatever your Ride**, it can use it. |
| Water + land (rivers, canals, reefs) | A **cleared lane** follows the river, **water and bank side by side** … |
| Vertical, up | A perfectly smooth ramp runs **straight up**, so **anything** that rolls, walks or floats can climb it. |
| Vertical, down | A smooth, dry tube runs **straight down** … / **Boats, subs and everything else** can use it. |
| Space | A **cleared space lane** runs the whole way, with **air to breathe and a road to roll on**. |
| Flat out (`useMax`) | It's **race day**: every Ride goes **flat out**. · … de-restricted highway: **no speed limit, flat out**. |
| Speed limit (`limitKmh`) | The safety car is out: every vehicle is **held to 60 km/h**. · … highway patrol holds **everything to 110 km/h**. |
| Off the Map | States its own made-up distance in bold ("The gods live **40 km up**."), then a corridor line. |

**Sum Routes** ("A million credit cards laid end to end", "Up the Eiffel Tower and back down, ten times")
state their unit in bold in the Briefing ("Each card is **85.6 mm** long"), so a courier with GPS off can
still work the distance out. Laps and repeats add "**Turns are instant.**"

An Unregistered hint points at a speed a sharp reader can **work out**, never one they must already
know: a familiar benchmark ("**keeping pace with the car ferry**", "**the passenger-jet lane**"), a
stated number ("**keep to 60 km/h**"), or a sum ("**one lap of the Earth a day**" → 1,670 km/h).

## 5. Naming (not legal advice)

Real pop-culture names only where there is no IP concern; otherwise a **generic or folklore
description** carries the joke ("a giant eagle", "a witch's broomstick", "seven-league boots", "a
flying saucer"). Folklore, myth and public-domain sources (Atlantis, Oz from the 1900 book, Olympus,
Asgard, the Styx, Wonderland from the 1865 book, El Dorado) are the safe default. Any trademarked or
film-specific name needs a deliberate sign-off — the **Flux-capacitor car** (`timecar`) is the one
film nod in the set; its name carries the **owner's sign-off** (11 Nov 2026); the generic fallback, if ever needed, is "Time-travelling sports car". No real courier brand, ever; no event brand
either ("a 5 km fun run", not a named series). **Pop-culture Off the Map Routes** describe the place, never
name the property ("through the back of the wardrobe to the snowy kingdom", "the school for wizards hidden in
the Highlands"); each one needs the owner's sign-off, and its nod is listed in `eta-implementation-notes` DD-14.

## 6. Checklist before you hand content back

- [ ] `node tools/verify-eta-content.js` — all green
- [ ] `node tools/verify-eta-rules.js` — still green (it deals thousands of Runs from this file)
- [ ] Spot-check a dozen true ETAs by hand (distance ÷ speed)
- [ ] Every name passes the naming policy; every Unregistered Ride has a fair hint
- [ ] Every Briefing line and hint bolds its load-bearing words (`**…**`), and Dotty's lines pass the voice note (no "love")
- [ ] Drop `"provisional": true` when the rebuild is final
