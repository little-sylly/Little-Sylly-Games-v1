# Audio reference

> On-demand (not auto-loaded). The audio function catalogue and background music (`js/lib/music.js`). Moved from `.claude/rules/logic-engine.md`. Moved verbatim on 4 Nov 2026; each source file keeps a stub with the headline rule.

---

## Audio Function Catalogue
All sound **effects** are synthesised via Web Audio API — no files, and that will not change. Background *music* is the single exception and lives in its own module — see § Background music below.

| Function | Semantic meaning | Notes |
|----------|-----------------|-------|
| `playSuccess()` | Correct / match | Bright ascending chime: C5→E5→G5, triangle wave |
| `playBoing()` | Wrong / taboo hit | Cartoon descending sweep 280→120 Hz, square wave |
| `playLaunch()` | Big CTAs | — |
| `playExit()` | Destructive confirm | — |
| `playPillClick()` | Settings pill toggle | — |
| `playDone()` | Close / confirm overlays | — |
| `playTick()` | Countdown tick | — |
| `playSliderTick(value)` | Volume slider feedback | Bypasses mute check |
| `playSyllyOn()` / `playSyllyOff()` | Sylly Mode toggle | — |
| `playWhoosh()` | Skip / swish | — |
| `playResume()` | Resume from pause | — |
| `playAlarm()` | Timer expiry | 3-pulse radar blip |
| `playSonarPing()` | DSD: Sonar Ping transmit (captain only) | Dual sine 880→440Hz + 1760Hz harmonic, lowpass filter, 1.2s decay |
| `playHullThud()` | DSD: Pressure Mine / Urchin / Jammer hit | White noise + resonant lowpass (80Hz Q8) + triangle sub 70Hz, 0.4s |
| `playAbyssThud()` | DSD: Nuclear Mine hit | `playHullThud()` + 35Hz sawtooth rumble through lowpass, 2.5s decay |
| `playStampede()` | PKO: Stampede confirmed — **and a Swarm** (the same gesture at smaller scale) | Sub-bass sawtooth swell 38→55Hz + noise through a rising lowpass 120→900Hz, ~1.2s |
| `playUnchallenged()` | PKO: winning an Encounter | Rising three-note sting G3–D4–G4, sawtooth through lowpass |
| `playPoacher()` | PKO: Poacher played | Dry highpassed click + two detuned square partials — deliberately out-of-ecosystem |
| `playClashWin()` | PKO: emptying your Hoard | Deepened, slower `playSuccess()` (C4–E4–G4) over a sine sub |
| `playSplash()` | CLD: a penguin goes into the Drink | Highpassed noise slap (~40 ms) + sine sub 70→48 Hz + a three-blip bubble tail. Comic weight, not horror. **Never throttled** — it is one of the beats CLD's collision throttle exists to protect |
| `playFanSnap()` | HSG: a folding fan snapped shut — the Storyteller's punctuation (Intro, Battle intro; a strike from S9) | Highpassed noise click (2.5 kHz, ~25 ms) over a triangle "clack" 300→140 Hz, ~70 ms. Owner-approved new sound (spec §16 Q5); played through `HSG_SOUND` in `js/games/hsg.js`, never from the pure `HsgScene` |

**Force of Nature adds NO new audio functions.** PKO's nine events announce themselves by **reusing** the catalogue above, mapped in one place — `PKO_EVENT_SOUND` in `js/games/pko.js`: `playPoacher` (Invasive Mimicry — out-of-ecosystem, like the Poacher itself), `playAbyssThud` (The Culling, Extinction Event), `playWhoosh` (The Great Reversal, Migration), `playSonarPing` (Alpha, Carrion), `playDone` (The Deluge, The Dry Season). Keeping the map beside the registry is deliberate: an event's identity (data) and its voice (audio) cannot drift apart, and a new event needs no new synthesised sound.

**Cookie Jar adds NO new audio functions either** — same pattern, one map: `CJAR_SOUND` in `js/games/cjar.js` names a *moment* (`cookie`, `caughtFirst`, `busted`, `reveal`, `soloSneak`, `treatSpecial`/`treatSuper`, `raidLost`, `highAlert`, `dobBackfire`, `matchEnd`) and points it at an existing `play*()`. Two games now use this shape; treat it as the default for a new game rather than synthesising more tones. The Bluff joins them: `DYB_SOUND` in `js/games/dyb.js` (SW v241).

Global audio state: `isMuted` (bool), `masterVolume` (0–1), `audioCtx` (Web Audio context),
`sfxEnabled` (bool, 28 Aug 2026 — System Sounds toggle, independent of `isMuted`; every `play*()`
guard is `if (isMuted || !sfxEnabled) return;` except `playSliderTick`, which deliberately bypasses
both so slider/mute-hold feedback is always audible).

**Mute All still outranks everything.** `sfxEnabled` and `Music`'s own `enabled` flag are each a
*channel* toggle; `isMuted` silences both regardless of their individual state — the effects and
music guards both check `isMuted` first. Tap-**hold** (500 ms) on any `.btn-open-sound` icon toggles
`isMuted` directly without opening `#sound-overlay` — wired via `bindCardHold` at the bottom of
`engine.js`'s boot block, with a per-button flag suppressing the click that follows a fired hold (a
normal tap still opens the overlay).

### Background music (`js/lib/music.js`, 28 Aug 2026)

**Effects stay synthesised — forever. Music is the one thing that is a file.** Everything above is
generated at runtime and no `play*()` will ever load an asset; `Music` is a separate layer with its
own state, its own level and its own caching contract.

| Call | Purpose |
|------|---------|
| `Music.init()` | Loads `data/music/manifest.json`, arms the first-gesture unlock. Called once from `engine.js`'s boot block |
| `Music.playFor(gameId)` | Resolves and crossfades to that game's track. **Already called for you** — see the seam below |
| `Music.setEnabled(b)` / `Music.isEnabled()` | The Music toggle in `#sound-overlay` |
| `Music.setVolume(v)` / `Music.getVolume()` | Music level, independent of `masterVolume` |
| `Music.syncMute()` | Called by `toggleMute()` — global mute outranks the music toggle |
| `Music.nowPlaying()` | `{ key, title, artist }` or `null`; for a future credits surface |

**One seam, all games — do NOT add music calls to a plugin.** `showScreen()` calls
`Music.playFor(activeGameId)` on every navigation. Every plugin already sets `activeGameId` before
navigating and `resetToLobby()` clears it before its own `showScreen`, so both directions are
covered. Resolving to the track already playing is a no-op, so moving between screens inside one
game never restarts it.

**Lobby places (SW v253):** with no game active, `showScreen()` passes `lobbyMusicKey()` (`lobby-host.js`) — `'lobby:lounge'` while the router's `view` is the Lounge, else null → the `lobby` fallback. `playFor` treats any key starting `lobby` as the lobby for the held-song rule.

**Two-tier fallback:** `tracks[activeGameId]`, else `tracks[fallback]` (`'lobby'`). A game with no
track of its own plays the lobby theme rather than falling silent, and **a new game needs no music
work at all** — it inherits the fallback until someone writes it one.

**Adding a track:** drop `data/music/<activeGameId>.mp3` in and add one line to the manifest. That
is the whole procedure — no `sw.js` edit, no `CACHE_NAME` bump, no JS change. Ceiling **~1.5 MB
per track** (128 kbps, 60–120 s loop).

**Two things that are load-bearing and easy to undo:**
- **Tracks are decoded into an `AudioBufferSourceNode` with `loop = true`**, never played through
  `<audio loop>` — the latter inserts an audible gap at the wrap point on every engine.
- **Nothing can start before a user gesture.** Browsers refuse audio until then, so `init()` queues
  the lobby theme and starts it on the first `pointerdown`/`keydown`. A track requested while music
  is off is not started at all (a silent looping source still decodes and mixes — real battery cost
  on a phone).

Every failure path is silent by design: no manifest, no file, a corrupt file or offline-before-first-
fetch all mean "no music", never a thrown error on a game screen.

**Hold — one chosen song (the jukebox, SW v233).** `Music.hold(track)` puts a whole song on through
Music's **one** media element (never a second `<audio>` anywhere else), routed through the shared
AudioContext with an AnalyserNode. It is kept through lobby navigation (`playFor(null)` leaves it) and
let go by `playFor(gameId)` — **a game's theme always wins**. Two load-bearing details: the element is
fed a **Blob**, because a streamed element's 206 Range replies cannot be cached (no offline); and
`hold()` runs only from a tap, because `createMediaElementSource` hands the element's output to the
context — a suspended context silences the song, not just the equaliser. Detail: `shared-implementation-notes.md` DD-44.
