# Music Prompts — Little Sylly Games

Generation prompts for a title theme plus one track per game. Written for a text-to-music model
(Suno / Udio / Stable Audio style). Each block is copy-paste ready; the **house style** below is the
part every prompt already carries, restated once here so you can adjust it globally.

**Status (28 Aug 2026, SW v212):** the **architecture is live** — `js/lib/music.js` resolves a track
per game from `data/music/manifest.json` and falls back to the lobby theme. One track ships
(`data/music/lobby.mp3`); the other 18 prompts below are unused so far.

**To ship a track:** generate it, trim it to a clean 60–120 s loop, save it as
`data/music/<activeGameId>.mp3` (e.g. `cjar.mp3`, `shp.mp3` — the key is the game's `activeGameId`
from CLAUDE.md § Per-Game Quick Index), and add one line to `data/music/manifest.json`. **No code
change, no `sw.js` edit, no version bump.** Until then that game plays the lobby theme.

The costs and constraints that shaped the architecture are still worth reading before generating
finals — see § Before any of this ships, particularly the **~1.5 MB per-track ceiling** and the
looping requirement.

---

## House style — true of every track

- **Instrumental. No vocals, no vocal samples, no spoken word.** One exception considered and
  rejected: wordless "oohs" still pull focus at a table where people are talking.
- **Seamless loop, 60–120 s.** These play under a conversation for ten minutes at a stretch. Write a
  loop, not a song with an arc — no big intro, no resolving outro, no drop.
- **Background level, not foreground.** Sparse arrangement, restrained dynamics, no sudden
  transients. If it demands attention it has failed.
- **Leave the bright band clear.** All the app's existing sound effects are synthesised in the
  ~600–2000 Hz range — chimes, boings, ticks, ascending stings. Music that lives in that same band
  masks them. Favour low-mid warmth and gentle high shimmer; avoid busy bell/chime leads.
- **No sound-effect mimicry.** Nothing in a track should read as a game cue: no alarm tones, no
  countdown ticks, no notification blips, no sonar pings (Deep-Sea Deploy especially — the game
  already has a real `playSonarPing`).
- **Warm and analogue over clean and digital**, matching the app's rounded Fredoka / warm-stone
  visual language. Net-Trace is the deliberate exception.

Append to any prompt as needed: *"Instrumental only, no vocals. Seamless loop. Sparse mix, low
dynamic range, nothing above a background level. No bells or chimes in the 1–2 kHz range."*

---

## Title screen — the house theme

**Also the fallback track.** Any game without its own music uses this, including new games until
they earn one.

> Warm, playful instrumental loop for the home screen of a party-games app. Toy piano and soft
> marimba carrying a simple, curious four-bar melody, ukulele playing gentle offbeat chords,
> upright bass, brushed snare and light hand percussion. Relaxed 100 BPM, major key, unhurried and
> welcoming — the sound of friends settling around a table before anyone has decided what to play.
> Slightly lo-fi and analogue, like a well-loved board game box. Nothing urgent, nothing epic.
> Instrumental only, no vocals. Seamless loop, 90 seconds.

*Why:* it has to sit under an indecisive minute of "what are we playing?" without ever becoming the
reason someone picks. Curious, not exciting.

---

## Per game

### 1. Like I'm Five 💬 — *cheeky classroom*

> Playful instrumental loop with a primary-school music-room feel. Toy piano, glockenspiel, plucked
> ukulele, recorder, handclaps and a shaker, over a simple walking bass. Bright major key, 108 BPM,
> mischievous rather than childish — a classroom where the teacher has just left the room. Warm,
> analogue, slightly out of tune in a charming way. Instrumental only, no vocals. Seamless loop.

### 2. Great Minds 🧠 — *telepathy as radio hardware*

> Dreamy instrumental loop, retro-futurist and hypnotic. Slow analogue synth arpeggio drifting in
> and out of phase with itself, warm tape hiss, soft filtered pads, a distant detuned sine tone,
> occasional gentle vinyl crackle. 76 BPM, minor-key but calm rather than sad — two radios slowly
> tuning toward the same frequency. Spacious, patient, plenty of silence. No bells or chimes.
> Instrumental only, no vocals. Seamless loop.

### 3. Secret Signals 📡 — *straight-faced cold-war spy*

> Cool spy-jazz instrumental loop. Tremolo surf guitar, vibraphone, upright bass walking quietly,
> brushed drums, a hint of Hammond organ. 96 BPM, minor key, understated and confident — a
> stakeout, not a chase. Restrained mid-century espionage flavour played completely straight, never
> comedic. Instrumental only, no vocals. Seamless loop.

### 4. Just Enough Cooks 🍳 — *cooking-show kitchen*

> Bright, bustling instrumental loop with a daytime-cooking-show feel. Marimba and clavinet trading
> a bouncy riff, muted funk guitar, upright bass, brushed kit with light shaker and wood block.
> 112 BPM, warm major key, busy but organised — a kitchen where everything is going well. Upbeat and
> theatrical without being frantic. Instrumental only, no vocals. Seamless loop.

### 5. You Get It? 🃏 — *your actual friends, roasted*

> Bright indie-pop instrumental loop. Clean muted electric guitar, handclaps, tambourine, warm
> electric bass, simple kit groove, a little Wurlitzer. 104 BPM, sunny major key, chatty and social —
> a room of people talking over each other in a good way. Casual, modern, no drama. Instrumental
> only, no vocals. Seamless loop.

### 6. Late to the Party 🏃 — *group chat, night out*

> Late-night instrumental loop, city-pop meets lo-fi house. Muted disco guitar, warm analogue bass,
> soft four-on-the-floor kick well back in the mix, electric piano chords, light shaker. 108 BPM,
> minor key with a smooth lift — the taxi ride while you work out where everyone actually went.
> Cool, social, a little bit smug. Instrumental only, no vocals. Seamless loop.

### 7. Natural Selection 🦁 — *earnest wildlife documentary*

> Pastoral instrumental loop in the style of a nature documentary score. Pizzicato strings, solo
> flute, marimba, soft French horn pads, brushes and light tuned percussion. 92 BPM, warm major key,
> curious and observant — a crew watching something quietly through long grass. Gentle, wide-open,
> never grand or sweeping. Instrumental only, no vocals. Seamless loop.

### 8. Deep-Sea Deploy ⚓ — *submarine ops room*

> Deep, spacious instrumental loop with a submarine-interior feel. Low sustained synth drone, soft
> low piano notes, muted timpani heartbeat, distant metallic room tone, slow filtered pad swells.
> 70 BPM, minor key, pressurised and patient — competent people concentrating in a small dark room.
> **No sonar pings, no sonar sweeps, no alarm tones of any kind.** Nothing above a low shimmer.
> Instrumental only, no vocals. Seamless loop.

### 9. Group Therapy 🛋️ — *deadpan waiting room*

> Gently absurd waiting-room instrumental loop. Rhodes electric piano playing soft bossa-nova
> chords, nylon guitar, muted flugelhorn, brushed kit, subtle vibraphone. 88 BPM, mellow major key,
> deliberately pleasant and slightly too calm — clinical lift music played completely straight so
> that it becomes funny. Warm, low-stakes, unhurried. Instrumental only, no vocals. Seamless loop.

### 10. The Bluff 🎲 — *a mountain, and a lie*

> Tense instrumental loop, folk-orchestral and cold. Low sustained strings, sparse hand drum,
> plucked dulcimer or hammered strings, a distant low horn, wind-like noise texture. 84 BPM, minor
> key, high and exposed — standing on a ledge deciding whether to believe someone. Restrained and
> spacious, tension held rather than released. Instrumental only, no vocals. Seamless loop.

### 11. Bailed 📋 — *the group chat, dryly*

> Dry, deadpan indie instrumental loop. Palm-muted electric guitar, plain electric bass, minimal
> kit with rim-clicks, a lone melodica or cheap organ line. 100 BPM, mildly minor, wry rather than
> tense — the sound of five people typing and one of them lying. Sparse, understated, faintly
> unimpressed. Instrumental only, no vocals. Seamless loop.

### 12. Pass 🃏 — *a real card table*

> Cool minimal jazz instrumental loop. Upright bass leading, brushed drums, sparse Rhodes chords,
> occasional muted trumpet phrase, deep room ambience. 90 BPM, smoky minor key, confident and
> unhurried — a late card game where nobody needs to say much. Very sparse, lots of space between
> notes. Instrumental only, no vocals. Seamless loop.

### 13. Net-Trace ⚡ — *corporate security terminal*

> Clean, precise instrumental loop, minimal techno meets 80s computer-lab synthwave. Tight
> arpeggiated synth sequence, deep sub bass, crisp closed hats, soft filtered pad, subtle digital
> noise texture. 118 BPM but restrained and hypnotic rather than driving. Cold emerald-green
> atmosphere, procedural and confident — infrastructure doing its job, not a hacker thriller.
> **No alert tones, no error buzzes, no modem sounds.** Instrumental only, no vocals. Seamless loop.

### 14. Fruit Salad 🍌 — *maximum pun density*

> Bouncy tropical instrumental loop. Steel drum, ukulele, marimba, congas and bongos, plucked bass,
> shaker and cowbell. 116 BPM, sunny major key, cheerful and a bit silly — a fruit bowl having a
> great time. Light, bright and warm, corny on purpose but never grating. Instrumental only, no
> vocals. Seamless loop.

### 15. Counting Sheep 🐑 — *bedtime, mechanically*

> Soft lullaby instrumental loop. Music box and celesta carrying a simple rocking melody, warm
> analogue pad underneath, muted upright piano, very light brushed percussion, faint tape wobble.
> 68 BPM, gentle major key, drowsy and safe — a child's bedroom with the light off and the hall
> light on. Extremely soft dynamics. Instrumental only, no vocals. Seamless loop.

### 16. Flawless 💎 — *a private jewel exhibition*

> Elegant lounge instrumental loop. Harp arpeggios, vibraphone, upright bass, brushed kit, a hint of
> nylon guitar and string pad. 92 BPM, sophisticated major-with-chromatic-turns, poised and quietly
> competitive — champagne in a room where everyone is working an angle. Refined, glossy, never
> tense. Instrumental only, no vocals. Seamless loop.

### 17. Pecking Order 🐘 — *real ecology, played straight*

> Earthy instrumental loop with a nature-documentary weight. Kalimba and marimba over low woodwinds,
> upright bass, hand drums and frame drum, sparse low brass swells, natural room ambience. 96 BPM,
> modal and grounded, matter-of-fact rather than dramatic — the food chain observed, not
> sensationalised. Warm brown-amber tone, dry and organic. Instrumental only, no vocals. Seamless
> loop.

### 18. Cookie Jar 🍪 — *the hour before dinner*

> Warm, sneaky instrumental loop with a family-kitchen feel. Upright piano playing a light
> ragtime-ish figure, pizzicato strings tiptoeing underneath, muted trumpet, brushed kit, wood block
> and triangle used sparingly. 104 BPM, honey-gold major key, playful and conspiratorial — creeping
> across lino toward the bench. Cosy and domestic, never sinister. Instrumental only, no vocals.
> Seamless loop.

---

## Fallback rule (current policy)

**A game with no track of its own plays the title theme.** That includes every new game until it is
given one — no silence, no per-game placeholder, no blocking a game's release on a music brief. The
title theme was written to be neutral enough to carry this.

---

## Later, if the credits stretch

Not in scope now, listed so the idea isn't lost:

- **Sylly Mode variants.** Five games flip register hard enough to justify a second take of the same
  loop: Counting Sheep → *Night Terrors* (the lullaby soured — detuned music box, uneasy low
  strings), Pecking Order → *Force of Nature*, Flawless → *The Counterfeit Run*, Net-Trace →
  *Devil's Network Protocol*, Great Minds → *Static Interference* (literally the same loop, jammed).
  Same tempo and key as the base track so a mode toggle can crossfade.
- **A gameover / podium sting**, shared across the suite — 4–6 seconds, not a loop.
- **A lobby-to-game transition**, if the redesigned title screen ends up with a launch moment worth
  scoring.

---

## Before any of this ships

Prompts are free; the audio is not. Items 1 and 2 are now **settled** (28 Aug 2026) — recorded here
because the reasoning still governs what you generate. 3–6 are still on you.

1. ~~This breaks a standing anti-pattern.~~ **Settled.** The rule protected install size and the
   offline guarantee; runtime-caching preserves both, so music was adopted as an exception scoped to
   *music only* — effects stay synthesised forever. `docs/decision-log.md` 2026-08-28.
2. ~~Precache weight is the binding constraint.~~ **Settled: nothing is precached.** `data/music/`
   took the `data/packs/` contract — manifest network-first, audio cache-first, absent from
   `PRECACHE_URLS`. A track is downloaded once, on first play, and only for a game someone actually
   opens. **The per-file ceiling is ~1.5 MB** (128 kbps, 60–120 s loop) — hold to it when generating
   finals; the shipped `lobby.mp3` is 5.46 MB and is over it pending a trim.
3. **Format:** one file per track, mono or joint-stereo, ~96–128 kbps. Ship `.m4a`/AAC for iOS
   Safari reliability; `.ogg` is smaller but weaker on that platform.
4. **The loop must actually loop.** Most generators produce a fade-out. Trim to a zero-crossing bar
   boundary and verify gapless playback in the browser — HTML5 `<audio loop>` is not reliably
   gapless; a Web Audio buffer source with `loop = true` is.
5. **It needs a mute path on day one.** `isMuted` and `masterVolume` already exist and are
   localStorage-backed, but music almost certainly wants its *own* level, separate from effects —
   a lot of people will want the SFX and not the soundtrack.
6. **Licensing.** Confirm the generator's terms cover distribution in a public web app before
   generating finals, and record the outcome next to the assets.

---

## Adding a Music & Sound section to the new-game brief

Deferred, per your call. When it happens the natural home is
`docs/rules/new-game-brief-template.md` (Phase 1), asking three things and nothing more: **the
register in one line** (what does this game sound like?), **tempo and energy**, and **anything the
music must not do** (Deep-Sea Deploy's "no sonar pings" is the model). The fallback rule above means
the field can be left blank without blocking the build.
