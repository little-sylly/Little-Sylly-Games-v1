# New Game Brief: Deep-Sea Deploy (DSD)

**Purpose:** Fill this in completely before writing any code. A completed brief = 95% confidence threshold met = ready to implement.
**Reference:** `.claude/rules/logic-engine.md` § Checklist: Adding a New Game — tick each item as you build.

---

## 1. Mechanical Core

- **Genre/Inspiration:** Modified Codenames — clue-giving + deduction with sequential reveal instead of simultaneous guessing
- **One-sentence hook:** Two naval task forces race to arm their grid payloads while one well-aimed clue can cascade through a minefield.
- **Player count:** 4–6 (team-based: 2v2 or 3v3); one fixed Captain per team, rest are Crew
- **Round structure:** Continuous turns until a team arms all their payloads. Captain transmits a Sonar Ping (clue word + number), then the Crew builds and executes a sequential disarm sequence. One Deployment = both teams completing their turn.
- **Win condition:** Highest Valour when the grid is exhausted (one team arms all their payloads). Arming all payloads ends scoring — it does NOT guarantee the win. A team can arm everything and still lose on Valour.
- **Session length:** 15–20 min

---

## 2. Thematic Vocabulary

Replace every generic term with a game-voiced equivalent. Plain English descriptions go in settings cards.

| Generic term | Game term | Screen/context |
|---|---|---|
| Round | Deployment | General UI, screen labels |
| Game over | Mission Debrief | Screen heading |
| Score | Valour | Tally + gameover |
| Play again | New Operation | Gameover button |
| Quit | Scuttle Ship? | Quit overlay heading |
| Settings overlay title | The Console ⚓ | First child of overlay-data-inner |
| Spymaster / Captain | The Captain | Role label |
| Operatives / Team | The Crew | Role label |
| Clue + Number | Sonar Ping | Captain's input screen |
| Captain's full grid view | The Manifest | screen-dsd-captain heading |
| Neutral word | Spiked Urchin | −5 Valour hazard |
| Assassin | Pressure Mine (or Nuclear Mine) | −20 Valour / −1000 Valour hazard |
| Bystander | Bystander | 0 Valour, always ends turn |
| Correct word claimed | Payload Armed | Execution reveal feedback |
| Disarm sequence submit button | Launch Sequence ⚓ | screen-dsd-crew CTA |
| Confirm sequence modal title | Confirm Sequence? | dsd-confirm-disarm overlay heading |

---

## 3. Lobby & Menu

- **Lobby button ID:** `#btn-dsd`
- **Brand colour (Tailwind):** `cyan-700`
- **Active pill class:** `pill-active-cyan`
  - ⚠️ This class must be **added to `css/styles.css`** before implementing any settings UI. Use the existing `pill-active-*` pattern. No SW version bump required — `css/styles.css` is already precached.
- **Play CTA label:** "Begin Deployment ⚓"
- **Menu screen tagline:** "Read the grid. Trust your Captain. Don't hit the mine."

---

## 4. State Flow

```
LOBBY → DSD MENU → DSD SETUP
→ showWhoFirst() [engine screen-who-first]
→ [Turn loop:
    DSD CAPTAIN (Sonar Ping — The Manifest)
    → DSD CREW (word-only grid + sequence builder)
    → DSD EXECUTION (sequential reveal, stops on turn-ender)
    → [IF Sylly Mode AND both teams have completed this Deployment:
        Grid Drift (unrevealed roles reshuffle)
        → DSD SABOTAGE (last-playing team places Jammer)
      ]
    → Switch team → DSD CAPTAIN ...
  ]
→ DSD GAMEOVER
```

> **Team games must call `showWhoFirst()` from engine.js.** `screen-who-first` is already registered in `allScreens[]`. Do NOT create a `screen-dsd-initiative` or any equivalent custom screen.

| Screen ID | Purpose |
|---|---|
| `screen-dsd-menu` | Main hub |
| `screen-dsd-setup` | Team name entry + Captain designation + players per team |
| `screen-dsd-captain` | The Manifest (colour-coded grid) + Sonar Ping input |
| `screen-dsd-crew` | Word-only grid + sequence builder |
| `screen-dsd-execution` | Sequential auto-reveal of the chosen sequence |
| `screen-dsd-sabotage` | (Sylly Mode only) Post-Drift Jammer placement by the last-playing team |
| `screen-dsd-gameover` | Final Valour count + Mission Debrief |

---

## 5. Settings

**Overlay title block:** "The Console ⚓" / "Adjust mission parameters."

| Setting | Options | Default | Internal value | Notes |
|---|---|---|---|---|
| Sea State | Calm / Turbulent / Tempest | Turbulent | `dsdSeaState`: `'calm'` / `'turbulent'` / `'tempest'` | Word difficulty: d1 / d1+d2 / all |
| Urchin Turn-End | OFF / ON | OFF | `dsdHazardControl.urchin` bool | ON = hitting a Spiked Urchin also ends the sequence |
| Mine Turn-End | OFF / ON | ON | `dsdHazardControl.mine` bool | ON = hitting the Mine also ends the sequence |
| Enemy Payload Turn-End | OFF / ON | ON | `dsdHazardControl.enemy` bool | ON = hitting an enemy payload also ends the sequence |
| Danger Level | Pressure / Nuclear | Pressure | `dsdDangerLevel`: `'pressure'` / `'nuclear'` | Pressure: −20 Valour + hazard toggle applies. Nuclear: −1000 Valour + immediate GAME OVER (overrides all hazard toggles) |
| ✨ Sylly Mode (Mission Abyss) | OFF / ON | OFF | `dsdSyllyMode` bool | Enables Magnetic Drift + Jammer placement after each Deployment |

**Plain-English descriptions (for settings cards):**
- **Sea State** — Controls how tricky the words are. Calm = straightforward nouns; Turbulent = mix of verbs and nouns; Tempest = anything goes.
- **Urchin Turn-End** — Spiked Urchins always cost −5 Valour. Toggle ON to also cut the sequence short when one is hit.
- **Mine Turn-End** — The Pressure Mine always costs −20 Valour. Toggle ON to also end the sequence when it's hit.
- **Enemy Payload Turn-End** — Hitting the enemy's payload always scores +10 Valour for them. Toggle ON to also end your sequence immediately.
- **Danger Level** — Pressure: the mine stings but the mission carries on. Nuclear: the mine ends the game on the spot.

---

## 6. State Variables

All variables use the `dsd` prefix.

```js
// ── Settings (persist between New Operations) ─────────────────────
let dsdSeaState       = 'turbulent'; // 'calm' | 'turbulent' | 'tempest'
let dsdHazardControl  = { urchin: false, mine: true, enemy: true };
let dsdDangerLevel    = 'pressure';  // 'pressure' | 'nuclear'
let dsdSyllyMode      = false;

// ── Roster (set in setup, persist across New Operations) ──────────
let dsdTeamNames      = ['Kraken', 'Leviathan']; // customisable; defaults shown
let dsdPlayersPerTeam = 2;                         // 2 or 3
let dsdPlayerNames    = [[], []];                  // [team0[], team1[]] — name strings
let dsdCaptainName    = ['', ''];                  // designated Captain name per team

// ── Game state (reset each New Operation) ─────────────────────────
let dsdValour         = [0, 0];  // [team0Valour, team1Valour]
let dsdGrid           = [];      // [{ word, role, revealed }] × 25
let dsdCurrentTeam    = 0;       // 0 = team0 active, 1 = team1 active
let dsdFirstTeam      = 0;       // from showWhoFirst() — the team with 9 payloads
let dsdDeployment     = 0;       // Deployment counter (increments when both teams play)

// ── Turn state (reset each turn) ──────────────────────────────────
let dsdPingClue       = '';
let dsdPingNumber     = 0;
let dsdSequence       = [];      // grid indices in chosen order (max dsdPingNumber + 1)

// ── Sylly Mode only ───────────────────────────────────────────────
let dsdJammer         = -1;      // grid index of the active Jammer (−1 = none placed)
let dsdJammerTeam     = -1;      // which team placed the current Jammer (0 or 1)
```

---

## 7. Scoring Logic

| Outcome | Who scores | Points | Turn End? |
|---|---|---|---|
| Friendly payload armed | Active Team | +10 Valour | No — sequence continues |
| Enemy payload hit | Enemy Team | +10 Valour | Only if `dsdHazardControl.enemy = true` |
| Spiked Urchin hit | Active Team | −5 Valour | Only if `dsdHazardControl.urchin = true` |
| Bystander hit | — | 0 Valour | Yes (always) |
| Pressure Mine hit | Active Team | −20 Valour | Only if `dsdHazardControl.mine = true` |
| Nuclear Mine hit | Active Team | −1000 Valour | GAME OVER immediately — overrides all hazard toggles |
| Jammer hit (Sylly Mode) | — | −5 Valour to Active Team | Yes (always) |

**Game-end trigger:** One team arms ALL their payloads (9 for the first team, 8 for the second) OR a Nuclear Mine is hit. The team with the higher Valour total wins.

**Zero-sum check:** Not strictly zero-sum — Valour is extracted from the environment. Hitting an enemy payload creates a +20 Valour swing (they gain, your turn ends), making every tap consequential. A team can arm all payloads and still lose if they accumulated too many penalties.

---

## 8. Overlay Types

Only two patterns — data slide-up or decision modal. No exceptions.

| Overlay ID | Pattern | z-index | Opened by | Notes |
|---|---|---|---|---|
| `dsd-settings-overlay` | Data (slide-up) | z-[80] | `#btn-dsd-menu-settings` | "The Console ⚓" title block |
| `dsd-how-to-overlay` | Data (slide-up) | z-[90] | `#btn-dsd-menu-how-to` | |
| `dsd-quit-overlay` | Decision modal | z-[80] | `.btn-dsd-quit-open` | |
| `dsd-confirm-disarm` | Decision modal | z-[90] | `#btn-dsd-execute` | Shows the ordered sequence list before execution |

**Quit overlay copy:**
- Emoji: ⚓
- Heading: "Scuttle Ship?"
- Subtext: "All mission progress and current Valour will be lost to the depths."
- Confirm: "Confirm Scuttle"
- Cancel: "Belay that!"

---

## 9. Sylly Mode Variant — Mission Abyss

**Name:** Mission Abyss

**Mechanic:** After every full Deployment (both teams have completed their turns), all unrevealed word roles undergo **Magnetic Drift** — they are reshuffled and reassigned to the same 25-word grid. The team that went **last** in that Deployment then enters the Sabotage screen and places a **Jammer** on any unrevealed word on the freshly drifted grid. The Jammer is visible to the **incoming team's Captain** on The Manifest (marked with a ?) but is invisible to the Crew. If the Crew selects the Jammed word during execution: −5 Valour + immediate turn end.

**Screens added:**
- `screen-dsd-sabotage` — shown after each completed Deployment. The last-playing team sees The Manifest with drifted role colours visible, and taps one unrevealed word to place their Jammer. Single-tap confirmation; no modal needed.

**Modified flow (Sylly Mode):**
```
DSD EXECUTION (sequence completes OR turn-ender hit)
→ [IF both teams have now played this Deployment]:
    Grid Drifts (all unrevealed roles reshuffle)
    → DSD SABOTAGE (last team places Jammer on drifted grid)
    → Increment dsdDeployment
    → Switch to first team → DSD CAPTAIN
```

**Captain visibility:** On `screen-dsd-captain`, the Jammed cell shows a "?" marker. Only visible to the Captain — `screen-dsd-crew` shows words only, no role or Jammer info.

**Scoring impact:**
- Hitting a Jammer: −5 Valour to the active team + immediate turn end. No Valour awarded to the placing team.
- Jammer persists until hit. After each Deployment, the last-playing team places a new Jammer (replacing any unhit Jammer from the previous Deployment).
- **Edge case:** If no unrevealed words remain when Sabotage is triggered, skip `screen-dsd-sabotage`.

---

## 10. Design Notes

**Word pool:** Pulls from `words.json` — full 16-category pool, filtered by `dsdSeaState` difficulty tier. DSD does not use a curated category subset. Draw 25 words for the grid after filtering.

**Grid role assignment (after `showWhoFirst()` resolves):**
```js
const firstTeam  = dsdFirstTeam === 0 ? 'kraken' : 'leviathan'; // team with 9 payloads
const secondTeam = dsdFirstTeam === 0 ? 'leviathan' : 'kraken';
const roles = [
  ...Array(9).fill(firstTeam),   // starting team: 9 payloads
  ...Array(8).fill(secondTeam),  // second team: 8 payloads
  ...Array(6).fill('urchin'),
  ...Array(1).fill('mine'),
  ...Array(1).fill('bystander'),
];
shuffle(roles);
dsdGrid = selectedWords.map((word, i) => ({ word, role: roles[i], revealed: false }));
```

**Sonar Ping validation:** Same blocking logic as Great Minds (`great-minds.js`). Captain cannot use any word already on the grid, or any word whose root is contained in a grid word (e.g. "Egg" is blocked if "Egg Roll" is on the grid). Ping clues must be a single word or hyphenated compound only.

**Sequential Disarm:** Crew taps words in order on `screen-dsd-crew` to build `dsdSequence[]`. Maximum length = `dsdPingNumber + 1` (standard Codenames bonus guess). Crew may execute a shorter sequence (stop early). On "Launch Sequence ⚓", `dsd-confirm-disarm` opens showing the ordered sequence list.

**The Reveal Loop:** On confirm from `dsd-confirm-disarm`, `screen-dsd-execution` reveals words one-by-one with ~600ms delay (builds tension). If a turn-ender is hit, the loop stops immediately — remaining queued words stay hidden.

**Pass-the-phone flow:** Captain screen → Captain types Ping → passes to Crew → Crew builds sequence + hits "Launch Sequence ⚓" → confirm modal → execution → phone passes to next team's Captain.

**Nuclear Mine UI:** On `screen-dsd-captain`, the Mine cell should have a distinct pulsing CSS animation or border. It should feel like a "Mission Failure" state is one wrong tap away — not just another coloured tile.

**Audio cues (synthesised — no audio files):**
- Payload armed: `playSuccess()` (existing)
- Urchin hit: a resonant sonar ping tone (new — add to `engine.js`)
- Mine hit: a deep hull-thud (new — add to `engine.js`)
Agree on exact audio before implementation.

**Bystander behaviour:** Hitting a Bystander always ends the sequence (0 Valour, turn ends). Not configurable.

---

## 11. New Game Checklist

Reference: `.claude/rules/logic-engine.md` § Checklist: Adding a New Game

- [ ] `js/games/dsd.js` created
- [ ] `<script>` tag added to `index.html` (after `engine.js`, before `secret-mode.js`)
- [ ] All screen IDs added to `allScreens[]` in `engine.js`
- [ ] All overlay HTML added to `index.html` before `<script>` tags
- [ ] `.btn-open-sound` + ✕ on every screen
- [ ] `activeGameId = 'dsd'` set in lobby button listener
- [ ] Game teardown added to `resetToLobby()` in `engine.js`
- [ ] Lobby button → DSD menu screen (not directly into setup)
- [ ] Game menu: "Begin Deployment ⚓", How to Play, Settings, ← Back to the Box
- [ ] Settings: Sea State first, ✨ Sylly Mode last; every setting in a white card
- [ ] `pill-active-cyan` added to `css/styles.css`
- [ ] Both overlay patterns used correctly; thematic title block + `scrollTop = 0` on open
- [ ] Quit overlay matches Quit Overlay Checklist in `ui-style.md`
- [ ] Exit routing: mid-game ✕ → quit overlay → DSD menu; post-game ✕ → `resetToLobby()`
- [ ] `applyExpansionOverrides()` hook added at settings-apply point
- [ ] Secret Mode word pool substitution in grid-build path
- [ ] `sw.js` precache updated + SW version bumped
- [ ] Section header comment block added to `index.html`
- [ ] `docs/code-map.md` updated with DSD section
- [ ] `docs/phase19-snapshot.md` written at phase completion
