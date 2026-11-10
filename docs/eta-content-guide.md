# E.T.A. — Content Guide (`data/eta-data.json`)

**Who reads this:** whoever builds or extends E.T.A.'s Routes and Rides — the owner, or the
content-rebuild session. **Status:** the shipped file is a **provisional starter set**
(`"provisional": true`): the October proof-of-concept list with its known faults fixed. The
content rebuild (old handoff §4, `docs/new-ideas/eta/for archive/eta-handoff-content-and-board.md`)
replaces it wholesale. No code changes are needed for that: edit the JSON, run the check.

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
| `tier` | `local` (human-scale) · `geo` (countries, rivers, the Earth) · `astro` (orbit and beyond). Dispatch Range filters on it: Local → `local`, Cosmic → `astro`, Mixed → all |
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
| `quip` | optional Dotty line used on a fast / slow / dead-on verdict ("Launch prep not included. Read the docket."). **Voice:** Dotty, Head of Dispatch — strict, energetic, tough love; short sentences, Aussie worksite English, never "love" |
| `unregistered` | `true` = a no-rego Ride (Sylly Mode only; pays Hazard Pay; hazard-striped badge) |
| `hint` | **required for Unregistered Rides**: a fair, slightly buried Briefing line telling a sharp reader which speed to use ("Wind speeds perfect for a `**gentle ride**`." → the carpet's cruise). Bold its key words like any Briefing line |

## 3. Ground rules for the truth (brief §10)

1. Constant speed, no stops, no rest, no fuel, no traffic — unless a Briefing line says otherwise.
2. **Every Route carries a corridor assumption**, so a snail to Mars is answerable.
3. **Every Ride has a finite, positive speed.** No teleporting, no time travel (the time machine
   drives at its ordinary speed, and its hint says so).
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

## 5. Naming (not legal advice)

Real pop-culture names only where there is no IP concern; otherwise a **generic or folklore
description** carries the joke ("a time-travelling sports car", "a giant eagle", "a witch's
broomstick"). Folklore, myth and public-domain sources (Atlantis, Oz, Olympus, Asgard) are the safe
default. Any trademarked name needs a deliberate sign-off. No real courier brand, ever.

## 6. Checklist before you hand content back

- [ ] `node tools/verify-eta-content.js` — all green
- [ ] `node tools/verify-eta-rules.js` — still green (it deals thousands of Runs from this file)
- [ ] Spot-check a dozen true ETAs by hand (distance ÷ speed)
- [ ] Every name passes the naming policy; every Unregistered Ride has a fair hint
- [ ] Every Briefing line and hint bolds its load-bearing words (`**…**`), and Dotty's lines pass the voice note (no "love")
- [ ] Drop `"provisional": true` when the rebuild is final
