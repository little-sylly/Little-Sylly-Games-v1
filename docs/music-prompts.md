# Music Prompts — Little Sylly Games

Generation prompts for the title theme, one track per game, and the Sylly Mode variants worth making.
Written for a text-to-music model (Suno / Udio / Stable Audio style). Every prompt block is
copy-paste ready.

**How this doc is laid out**

| § | What's there |
|---|--------------|
| [Where things stand](#where-things-stand) | What plays in-game, what's in the jukebox, what's missing |
| [House style](#house-style--true-of-every-track) | The rules every prompt already carries, plus the convergence problem that shaped them |
| [Title screen](#title-screen--the-house-theme) | The lobby / fallback theme |
| [Per game](#per-game) | 20 games, every option kept (A = original; B/C/D = later directions). Each ends with its **Lead** and its **Sylly** verdict |
| [Sylly Mode tracks](#sylly-mode-tracks) | Game-by-game verdict, priority order, prompts for the ones worth making, and the code change they'll need |
| [Unique-lead reference](#unique-lead-reference-jukebox-anti-convergence-table) | Which lead instrument belongs to which game |
| [Policy and pipeline](#policy-and-pipeline) | Fallback rule, shipping a track, the settled constraints, deferred ideas |

---

## Where things stand

**26 Sep 2026, SW v235.** There are two separate surfaces, and they now share tracks (one-way):

- **In-game music** (`data/music/manifest.json`, resolved by `Music.playFor(activeGameId)`) — **20
  tracks**: `lobby`, `li5`, `great-minds`, `sylly-signals` keep their own original encodes; the
  other 16 games' entries point straight at their jukebox base file (`"file": "jukebox/<id>.mp3"` —
  no duplicated audio, `sw.js`'s `/data/music/` handler already runtime-caches anything under that
  path). **The Bluff (`dyb`) is the only game still on the lobby fallback** — it has no song at all
  yet.
- **The jukebox** (`data/music/jukebox/manifest.json`) — **25 songs** (was 26 — Secret Signals'
  A Night Out and The Stakeout were the same song generated twice; A Night Out was removed, The
  Stakeout kept for fitting the espionage theme better and being the id already baked into
  `visual-lobby.js`'s test fixture). All provisional (the owner generates a few per day and replaces
  them as better takes land). Three are already Sylly Mode variants (`variant` field):

  | Game | Base song(s) | Sylly variant |
  |------|--------------|---------------|
  | Fruit Salad | Fruit Salad Boogie | Fruity Fun — *Fruity Personalities* |
  | Counting Sheep | Music Box Lullaby | Eerie Night Sky — *Night Terrors* |
  | Pecking Order | A Force of Nature, Quiet Hunting | Weather Turned — *Force of Nature* |

  (Lobby also has a variant, Old Toy Box — *Game Selection*.)

  **Pecking Order's two base songs were checked, not resolved.** Unlike Secret Signals' pair, "A
  Force of Nature" and "Quiet Hunting" are genuinely different recordings (different hashes, 153s vs
  86s) — both prompt options (§ 17 below) were generated and kept, not a duplicate. The in-game
  manifest promotion picked **Quiet Hunting**, to avoid a base track sharing its name with the Sylly
  Mode itself (the naming-collision risk this doc already flagged). Whether "A Force of Nature"
  should stay in the jukebox as a second PKO option or get dropped is still an owner call.

**What that means for Sylly tracks:** `Music.playFor` now has its Sylly tier — see
[§ The code change](#the-code-change--done-27-sep-2026). SHP, PKO and FRT's matches already play
their own Sylly track; a new variant needs only a manifest line, no code. A song file is
runtime-cached, so a Sylly track costs **no install bytes** — only generation budget.

<details>
<summary>Earlier status notes (kept for history)</summary>

**28 Aug 2026, SW v212:** the architecture went live — `js/lib/music.js` resolves a track per game
from `data/music/manifest.json` and falls back to the lobby theme. Four tracks shipped (`lobby.mp3`,
`li5.mp3`, `gm.mp3`, `ss.mp3`). **All four are over the ~1.5 MB ceiling** (`lobby.mp3` 5.46 MB,
`ss.mp3` 6.04 MB, `li5.mp3` 4.32 MB, `gm.mp3` 3.52 MB) and want a trim pass — a browsing jukebox
makes a cold runtime-cache pull more likely, not less. `title`/`artist` are `null` for three of the
four.

**20 Sep 2026, lobby jukebox review:** every game now has an identity doc
(`docs/game-identities/`), so this pass re-read each prompt against its game's own T1/T4 sections.
Several prompts had drifted toward a shared "generic warm acoustic party game" palette instead of
the specific thing their game is — see § Convergence problem. **That pass added options and removed
none** — generation is cheap, so every prompt that changed kept its original as Option A and gained
new directions as B/C. Nothing is prescribed; generate whichever you like and keep what actually
sounds right. Cold Shoulder and Honeycomb Hills were added then.

</details>

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
- **One named lead instrument, distinct from every other track in the suite (jukebox rule, added 20
  Sep 2026).** Shared rhythm bed is fine; the lead is the game's fingerprint. See § Unique-lead
  reference. **Sylly variants are exempt** — they keep their base game's lead on purpose (see
  § Sylly Mode tracks).
- **Identifiable inside ~5 seconds, and distinct from its neighbours (jukebox rule, added 20 Sep
  2026).** A jukebox is auditioned back-to-back, not discovered one game at a time — a track that
  needs 20 seconds to reveal its character, or that shares its palette with the track before it,
  reads as filler on a track list even if it's pleasant under a real match.

Append to any prompt as needed: *"Instrumental only, no vocals. Seamless loop. Sparse mix, low
dynamic range, nothing above a background level. No bells or chimes in the 1–2 kHz range."*

### Convergence problem (why the lead rule exists)

Counting instruments actually named across the original 18 prompts: **brushed kit** in 9, **upright
bass** in 7, **marimba** in 5, **vibraphone**/**ukulele**/**Rhodes** in 3 each. A generator handed
"marimba, upright bass, brushed kit, warm major key" four separate times will hand back four
versions of the same track — that's what several of the reported "this one drifted" tracks probably
were: not a bad take on the game, just an interchangeable one. Two rules came out of it:

1. **One named lead instrument per track, distinct across the whole suite.** The shared rhythm bed
   (upright bass + brushed kit) is fine — that's allowed to be the house sound. The lead is what
   must not repeat. § Unique-lead reference tracks which lead belongs to which game so a future
   prompt doesn't reissue one by accident.
2. **A prompt for a jukebox needs a five-second identity, and needs to not blur into whatever plays
   next.** The old house style optimised purely for "sit under a conversation" — right for a single
   ambient track, incomplete once tracks are auditioned back-to-back.

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
reason someone picks. Curious, not exciting. Lead: **toy piano** — reserved, don't reuse it on a
per-game track.

---

## Per game

Every game block ends with two lines: **Lead** (feeds the unique-lead table) and **Sylly** (the
verdict from § Sylly Mode tracks, in one line).

### 1. Like I'm Five 💬 — *cheeky classroom*

**Option A — original.**

> Playful instrumental loop with a primary-school music-room feel. Toy piano, glockenspiel, plucked
> ukulele, recorder, handclaps and a shaker, over a simple walking bass. Bright major key, 108 BPM,
> mischievous rather than childish — a classroom where the teacher has just left the room. Warm,
> analogue, slightly out of tune in a charming way. Instrumental only, no vocals. Seamless loop.

**Option B — adults getting away with something (recommended read of T4's "never a teaching tool").**
Glockenspiel/recorder/toy piano skew toward actual children's music, which is exactly what the
identity doc's off-theme line warns against — the joke is grown-ups playing a kids' game, not a kids'
game.

> Playful instrumental loop, classroom at lunchtime with the teacher gone. Upright piano with a
> honky-tonk detune, plucked ukulele, walking upright bass, handclaps, shaker, wood block, one cheap
> plastic recorder used sparingly for the joke rather than as the lead. 108 BPM, bright major,
> mischievous rather than childish. No glockenspiel, no music box, no nursery-rhyme melody.
> Instrumental only, no vocals. Seamless loop.

*Lead: honky-tonk upright piano (B) / glockenspiel (A).*
*Sylly: **no** — Extra Credit only changes which words appear.*

---

### 2. Great Minds 🧠 — *telepathy as psychic waves*

**Option A — original (incomplete sentence, kept verbatim for reference; likely a partial edit).**

> Dreamy instrumental loop and hypnotic. Slow analogue arpeggio drifting in
> and out of phase with itself, soft filtered pads, a distant detuned sine tone,
> 76 BPM, minor-key but calm rather than sad — two wavelengths slowly
> tuning toward the same frequency. Spacious, patient, plenty of silence. No bells or chimes.
> Instrumental only, no vocals. Seamless loop.

**Option B — radio laboratory (recommended; makes the Sylly Mode "Static Interference" variant
nearly free — same loop, jammed).** T4 is specifically *radio hardware*: frequencies, transmissions,
tuning to a channel. Generic ambient/ethereal drifts away from that into ordinary meditation music.

> Patient instrumental loop, analogue radio-laboratory atmosphere. Two slow detuned oscillators
> drifting in and out of phase with each other, tape-saturated pad, faint shortwave band noise held
> well back in the mix, one sustained sine tone, sparse low piano notes. 76 BPM, minor but calm —
> two receivers slowly tuning to the same frequency. Spacious, lots of silence. No bells, no chimes,
> no arpeggio that reads as a hummable melody. Instrumental only, no vocals. Seamless loop.

**Option C — retro sci-fi broadcast.**

> Warm retro science-fiction instrumental loop. Mellotron strings, a soft wobbling theremin-like sine
> lead, vintage analogue pad, felt piano, slow tape wobble. 76 BPM, gently mysterious — a 1970s
> public-broadcast programme about the paranormal, played completely straight. Instrumental only, no
> vocals. Seamless loop.

*Lead: detuned oscillator (B) / theremin-like sine (C) / analogue arpeggio (A).*
*Sylly: **yes, cheap** — Static Interference, priority 3. Worth it only if the base take is Option B.*

---

### 3. Secret Signals 📡 — *straight-faced cold-war spy*

**Already shipped as `ss.mp3` — reviewing whether it's a keeper, not discarding it.**

**Option A — original, shipped.**

> Cool spy-jazz instrumental loop. Tremolo surf guitar, vibraphone, upright bass walking quietly,
> brushed drums, a hint of Hammond organ. 96 BPM, minor key, understated and confident — a
> stakeout, not a chase. Restrained mid-century espionage flavour played completely straight, never
> comedic. Instrumental only, no vocals. Seamless loop.

**Option B — cold-war stakeout, no surf guitar.** T4 asks for "two rival intelligence operations,"
deadpan — tremolo surf guitar reads more caper-movie than stakeout.

> Restrained espionage instrumental loop. Upright bass walking quietly, brushes with occasional
> rimshots, a lone muted trumpet phrase, low Hammond pad, an occasional flat-five piano stab, faint
> room tone. 92 BPM, minor, patient — a stakeout in a cold city, nobody moving. No surf guitar, no
> spy-caper fanfare, never comedic. Instrumental only, no vocals. Seamless loop.

*Lead: tremolo surf guitar (A, shipped) / muted trumpet (B).*
*Sylly: **no** — Intel Phase is a second act bolted onto the end. A mode-wide track would play under
the whole main mission, where nothing has changed.*

---

### 4. Just Enough Cooks 🍳 — *cooking-show kitchen*

**Option A — original.**

> Bright, bustling instrumental loop with a daytime-cooking-show feel. Marimba and clavinet trading
> a bouncy riff, muted funk guitar, upright bass, brushed kit with light shaker and wood block.
> 112 BPM, warm major key, busy but organised — a kitchen where everything is going well. Upbeat and
> theatrical without being frantic. Instrumental only, no vocals. Seamless loop.

**Option B — same idea, guarded against generic TV-cooking-show cliché and against the marimba
repeating elsewhere in the suite.**

> Bright, bustling instrumental loop — several people working the same dish at different benches.
> Clavinet carrying the main riff, muted funk guitar, upright bass, brushed kit with light shaker
> and wood block. 112 BPM, warm major key, busy but organised. No big-band fanfare, no TV stingers,
> no marimba. Instrumental only, no vocals. Seamless loop.

*Lead: clavinet (both — B drops the marimba double-lead).*
*Sylly: **no** — Fusion Cuisine makes the prompt harder; the kitchen sounds the same.*

---

### 5. You Get It? 🃏 — *your actual friends, roasted*

**Option A — original.**

> Bright indie-pop instrumental loop. Clean muted electric guitar, handclaps, tambourine, warm
> electric bass, simple kit groove, a little Wurlitzer. 104 BPM, sunny major key, chatty and social —
> a room of people talking over each other in a good way. Casual, modern, no drama. Instrumental
> only, no vocals. Seamless loop.

**Option B — wry bedroom-pop (T4: no fictional framing, self-deprecating, "oh my god, same" — this
leans less like an advert and more like the actual feeling of being called out by a friend).**

> Warm lo-fi bedroom-pop instrumental loop. Clean chorused electric guitar, soft drum-machine kit,
> warm electric bass, a simple Wurlitzer figure, light tape hiss. 98 BPM, major with a wistful turn —
> friends on a couch being a little too honest about themselves. No handclaps, no advert-bright
> production. Instrumental only, no vocals. Seamless loop.

*Lead: Wurlitzer (both).*
*Sylly: **no** — The Ringer is one fake answer per round; the mood is unchanged.*

---

### 6. Late to the Party 🏃 — *group chat, night out*

**No change proposed — matches T4 well.** Original kept as-is.

> Late-night instrumental loop, city-pop meets lo-fi house. Muted disco guitar, warm analogue bass,
> soft four-on-the-floor kick well back in the mix, electric piano chords, light shaker. 108 BPM,
> minor key with a smooth lift — the taxi ride while you work out where everyone actually went.
> Cool, social, a little bit smug. Instrumental only, no vocals. Seamless loop.

*Lead: muted disco guitar.*
*Sylly: **no** — The Troublemaker adds a third goal inside the same loop, and the base track's
"a little bit smug" already fits it.*

---

### 7. Natural Selection 🦁 — *earnest wildlife documentary*

**Option A — original.**

> Pastoral instrumental loop in the style of a nature documentary score. Pizzicato strings, solo
> flute, marimba, soft French horn pads, brushes and light tuned percussion. 92 BPM, warm major key,
> curious and observant — a crew watching something quietly through long grass. Gentle, wide-open,
> never grand or sweeping. Instrumental only, no vocals. Seamless loop.

**Option B — smaller crew, guarded against collision with Pecking Order's own nature-doco track.**

> Light pastoral instrumental loop, a small amateur film crew rather than a blockbuster. Solo flute
> carrying the melody, pizzicato strings, soft brushes, light tuned percussion. 92 BPM, warm major
> key, curious and observant. No French horn, no low brass, no big drums — quiet and close, not
> wide-screen. Instrumental only, no vocals. Seamless loop.

*Lead: solo flute (both).*
*Sylly: **no** — Survival of the Fittest changes who knows what, and when. The mood stays the same.*

---

### 8. Deep-Sea Deploy ⚓ — *submarine ops room*

**Option A — original.**

> Deep, spacious instrumental loop with a submarine-interior feel. Low sustained synth drone, soft
> low piano notes, muted timpani heartbeat, distant metallic room tone, slow filtered pad swells.
> 70 BPM, minor key, pressurised and patient — competent people concentrating in a small dark room.
> **No sonar pings, no sonar sweeps, no alarm tones of any kind.** Nothing above a low shimmer.
> Instrumental only, no vocals. Seamless loop.

**Option B — same palette, one line added so it reads as routine rather than dread (T4: "dry-witted
rather than grim").**

> Deep, spacious instrumental loop with a submarine-interior feel. Low sustained synth drone, soft
> low piano notes, a slow quiet procedural pulse underneath (like a shift going normally, not a
> countdown), distant metallic room tone, slow filtered pad swells. 70 BPM, minor key, pressurised
> and patient — competent people concentrating in a small dark room. **No sonar pings, no sonar
> sweeps, no alarm tones of any kind.** Nothing above a low shimmer. Instrumental only, no vocals.
> Seamless loop.

*Lead: low piano (both).*
*Sylly: **no** — the base track already *is* Silent Running (quiet, pressurised, patient). A variant
would be the same track, only quieter.*

---

### 9. Group Therapy 🛋️ — *deadpan waiting room*

**No change proposed — matches T4 well.** Original kept as-is.

> Gently absurd waiting-room instrumental loop. Rhodes electric piano playing soft bossa-nova
> chords, nylon guitar, muted flugelhorn, brushed kit, subtle vibraphone. 88 BPM, mellow major key,
> deliberately pleasant and slightly too calm — clinical lift music played completely straight so
> that it becomes funny. Warm, low-stakes, unhurried. Instrumental only, no vocals. Seamless loop.

*Lead: Rhodes electric piano.*
*Sylly: **optional, low** — Stroke or Genius is perceptual (a shaking canvas, blurred drawings). A
warped-tape take of the same lift music would be a good joke, but not a change of register.*

---

### 10. The Bluff 🎲 — *a mountain, and a lie*

**⚠️ The only game with no song in the jukebox yet.** Generate a base track before anything else
for this game.

**Option A — original (written for the old ocean-blue brand).**

> Tense instrumental loop, folk-orchestral and cold. Low sustained strings, sparse hand drum,
> plucked dulcimer or hammered strings, a distant low horn, wind-like noise texture. 84 BPM, minor
> key, high and exposed — standing on a ledge deciding whether to believe someone. Restrained and
> spacious, tension held rather than released. Instrumental only, no vocals. Seamless loop.

**Option B — warm dry rock (matches the game's current brand colour, warm rock-grey `#6B5744`, not
the old ocean blue — see `docs/game-identities/dyb.md`).**

> Tense instrumental loop, dry and sun-baked rather than cold. Low bowed cello drone, sparse frame
> drum, muted plucked guitar harmonics, a distant low horn, dry air noise texture. 84 BPM, minor and
> modal — a warm rock ledge with a long drop below it. Tension held, never released. Earth and clay
> tones, not snow and ice. No dulcimer, no Appalachian or Celtic folk flavour. Instrumental only, no
> vocals. Seamless loop.

*Lead: hammered dulcimer (A) / bowed cello (B) — note: A's lead collides with Honeycomb Hills Option
A below if both are generated; pick one or the other, or accept the overlap since they're unlikely
to play back-to-back.*
*Sylly: **yes, after the base track** — The Tempest, priority 2b. The dice themselves become
untrustworthy, and the mode's name already hands you the weather.*

---

### 11. Bailed 📋 — *the group chat, dryly*

**Option A — original. No change proposed — matches T4 well.**

> Dry, deadpan indie instrumental loop. Palm-muted electric guitar, plain electric bass, minimal
> kit with rim-clicks, a lone melodica or cheap organ line. 100 BPM, mildly minor, wry rather than
> tense — the sound of five people typing and one of them lying. Sparse, understated, faintly
> unimpressed. Instrumental only, no vocals. Seamless loop.

**Option B — "Yeah, nah" (backyard pre-drinks, still waiting to see who actually turns up).** This
leans on the "very Australian" voice in T4. Lap steel bends are the musical version of "yeah… nah":
a hopeful slide up that slumps back down.

> Laid-back, warm instrumental loop — backyard pre-drinks on a summer evening, half the group still
> "on their way". Lap steel guitar in a low, lazy register carrying the lead, each phrase sliding up
> hopefully then slumping back down, over loose strummed acoustic guitar, plain electric bass and a
> relaxed kit with rim-clicks. 92 BPM, sunny major with a mixolydian flattened seventh that sags at
> the end of each phrase. Easygoing, wry and fond, never sad or twangy-country. Instrumental only,
> no vocals. Seamless loop. Sparse mix, low dynamic range, no bells or chimes in the 1–2 kHz range.

*Why:* it scores the Friends' side of the night, the people who did turn up, with just enough sag in
the harmony to say someone won't.

**Option C — the sitcom (one clown in the group who's always somehow gone).** 😬 in harmonic terms
is a major chord with a note that shouldn't be there, a cheerful grin through gritted teeth. Bass
clarinet delivers that without drifting into the bright band where your SFX live.

> Bouncy, light-hearted instrumental loop in the style of a sitcom scene transition — a friend group
> hanging out, and the lovable clown who always has an excuse. Bass clarinet carrying a short,
> sheepish, bouncing figure with little grace-note slips, over a buoyant fingerstyle electric bass
> line, tight dry kit with light handclaps, and warm organ chords held well back. 104 BPM, bright
> major key with a slightly awkward chromatic rub at the end of each phrase — cheerful, but wincing.
> Playful and affectionate, never mocking. No pizzicato, no tiptoeing or sneaking figure, no
> sad-trombone "wah-wah", no laugh track or crowd noise. Instrumental only, no vocals. Seamless loop.
> Sparse mix, low dynamic range, no bells or chimes in the 1–2 kHz range.

*Why:* this one is the 😬 face as music. Its exclusions do the heavy lifting: without them, "sitcom"
and "clown" pull a generator straight toward circus or cartoon-heist. (The jukebox's *Clown's Alibi*
is this direction.)

*Lead: bass clarinet (C) / lap steel (B) / melodica (A). Neither new lead appears anywhere else.*
*Sylly: **no** — Drama Mode sharpens the endgame of a game that already runs on suspicion. Same room,
one extra liar.*

---

### 12. Pass 🃏 — *a real card table*

**Option A — original.**

> Cool minimal jazz instrumental loop. Upright bass leading, brushed drums, sparse Rhodes chords,
> occasional muted trumpet phrase, deep room ambience. 90 BPM, smoky minor key, confident and
> unhurried — a late card game where nobody needs to say much. Very sparse, lots of space between
> notes. Instrumental only, no vocals. Seamless loop.

**Option B — no costume at all (T4 is emphatic that Pass has no fiction and no invented mood —
"exactly what it says on the box"; jazz-noir is still a costume, just a subtle one).**

> Minimal rhythmic instrumental loop built from the sound of play itself, not a mood or a scene.
> Muted upright bass ostinato, soft brushed-snare pulse, occasional sparse Rhodes chord, faint room
> ambience. 90 BPM, neutral modal key, confident and unhurried. No smoke-and-neon atmosphere, no
> melody line — steady, focused, table-level calm. Instrumental only, no vocals. Seamless loop.

**Option C — "the shuffle" (no scene, just a groove).** The blues shuffle is a rhythm feel, not a
setting, and the card pun costs nothing. The swing has an easy, loping forward motion: confident
like T4's voice, without inventing a backstory.

> Relaxed, confident instrumental loop built on a slow blues shuffle groove. Soft low-register
> harmonica carrying a short, laid-back riff, over a walking electric bass, a swung kit with
> brushes on the snare, and sparse clean guitar chords on the offbeat. 88 BPM, major blues, easy
> and unbothered — a game everyone at the table already knows how to play. No wailing bends, no
> smoky bar atmosphere, no crowd noise. Instrumental only, no vocals. Seamless loop. Sparse mix,
> low dynamic range, no bells or chimes in the 1–2 kHz range.

*Why:* this gives Pass something to hum without giving it a costume. The "low-register" and "no
wailing bends" instructions keep the harmonica out of the bright band where your SFX live.

**Option D — "passing again" (cards night, staring out the window).** This is lo-fi daydream music,
and that suits it for two reasons. Generators understand the genre well, and it describes exactly
the scene you're after: someone at a desk, drifting. The sigh comes from a classic musical device, a
two-note falling figure. Tenor sax plays one lazily behind the beat each time, like an exhale when
your turn comes round and you've got nothing.

> Mellow lo-fi instrumental loop — a casual cards night with mates, and you've passed five times in
> a row. Breathy tenor saxophone in a low, lazy register playing short descending two-note sighs,
> slightly behind the beat, over soft jazzy seventh chords on muted guitar, a warm round bass line
> and a relaxed, head-nodding hip-hop beat with a dusty snare. 80 BPM, warm major with gentle
> minor-seventh turns, faint vinyl crackle. Resigned and drowsy, like staring out a classroom window
> on a slow afternoon — gently bored, never sad, never frustrated or tense. Instrumental only, no
> vocals. Seamless loop. Sparse mix, low dynamic range, no bells or chimes in the 1–2 kHz range.

*Why:* this scores the passer rather than the game. Most turns in Pass are someone else's, and this
is what those turns feel like.

*Lead: harmonica (C) / tenor saxophone (D) / muted trumpet (A — collides with Secret Signals B) /
ostinato only (B). Neither harmonica nor sax appears anywhere else.*
*Sylly: **no** — The Abyss adds a growing threat, but the table and its mood are unchanged.*

---

### 13. Net-Trace ⚡ — *corporate security terminal*

**One guard clause added; otherwise matches T4 well.**

> Clean, precise instrumental loop, minimal techno meets 80s computer-lab synthwave. Tight
> arpeggiated synth sequence, deep sub bass, crisp closed hats, soft filtered pad, subtle digital
> noise texture. 118 BPM but restrained and hypnotic rather than driving. Cold emerald-green
> atmosphere, procedural and confident — infrastructure doing its job, not a hacker thriller.
> **No alert tones, no error buzzes, no modem sounds, no glitch stutters, no distorted bass drops, no
> thriller tension.** Instrumental only, no vocals. Seamless loop.

*Lead: arpeggiated synth sequence.*
*Sylly: **yes, medium** — Distributed Network Protocol, priority 4. It turns a solo puzzle into a team
relay.*

---

### 14. Fruit Salad 🍌 — *maximum pun density*

**Option A — original.**

> Bouncy tropical instrumental loop. Steel drum, ukulele, marimba, congas and bongos, plucked bass,
> shaker and cowbell. 116 BPM, sunny major key, cheerful and a bit silly — a fruit bowl having a
> great time. Light, bright and warm, corny on purpose but never grating. Instrumental only, no
> vocals. Seamless loop.

**Option B — kitchen table, not a beach (T4: "kitchen-table fruit bowl", the lightest theme in the
suite — steel drum/congas relocate it to a tiki bar it never asked for).**

> Bouncy, silly instrumental loop with a kitchen-table feel, not a beach. Plucked ukulele, xylophone,
> muted plucked bass, light hand percussion, wood block, a reedy kazoo-like tone used sparingly for
> the joke. 116 BPM, sunny major key, corny on purpose — a fruit bowl having a great time indoors. No
> steel drums, no congas or bongos, no island or tiki flavour. Instrumental only, no vocals. Seamless
> loop.

*Lead: xylophone (B) / steel drum (A).*
*Sylly: **done** — Fruity Fun (*Fruity Personalities*) is in the jukebox.*

---

### 15. Counting Sheep 🐑 — *bedtime, mechanically*

**No change proposed — matches T4 well.** Original kept as-is.

> Soft lullaby instrumental loop. Music box and celesta carrying a simple rocking melody, warm
> analogue pad underneath, muted upright piano, very light brushed percussion, faint tape wobble.
> 68 BPM, gentle major key, drowsy and safe — a child's bedroom with the light off and the hall
> light on. Extremely soft dynamics. Instrumental only, no vocals. Seamless loop.

*Lead: music box.*
*Sylly: **done** — Eerie Night Sky (*Night Terrors*) is in the jukebox. Of all 20 games, this mode
changes the mood the most.*

---

### 16. Flawless 💎 — *a private jewel exhibition*

**Option A — original.**

> Elegant lounge instrumental loop. Harp arpeggios, vibraphone, upright bass, brushed kit, a hint of
> nylon guitar and string pad. 92 BPM, sophisticated major-with-chromatic-turns, poised and quietly
> competitive — champagne in a room where everyone is working an angle. Refined, glossy, never
> tense. Instrumental only, no vocals. Seamless loop.

**Option B — vibraphone as the actual lead, harp demoted to texture (as generated, harp arpeggios
tend to become the whole track and read as spa/wedding music rather than "quietly competitive").**

> Elegant lounge instrumental loop, cocktail hour rather than spa. Vibraphone carrying the main line
> with a sly chromatic turn every few bars, upright bass, brushed kit, nylon guitar as texture only,
> any harp used sparingly and never as the lead. 92 BPM, sophisticated, poised and quietly
> competitive — champagne in a room where everyone is working an angle. Instrumental only, no
> vocals. Seamless loop.

*Lead: vibraphone (B) / harp (A).*
*Sylly: **yes, first** — The Counterfeit Run, priority 1. The biggest mood change among the games
still without a variant.*

---

### 17. Pecking Order 🐘 — *real ecology, played straight*

**Option A — original.**

> Earthy instrumental loop with a nature-documentary weight. Kalimba and marimba over low woodwinds,
> upright bass, hand drums and frame drum, sparse low brass swells, natural room ambience. 96 BPM,
> modal and grounded, matter-of-fact rather than dramatic — the food chain observed, not
> sensationalised. Warm brown-amber tone, dry and organic. Instrumental only, no vocals. Seamless
> loop.

**Option B — ground-level, guarded against collision with Natural Selection's own nature-doco
track.**

> Earthy instrumental loop, ground level rather than hillside. Kalimba carrying the main figure over
> low woodwinds, upright bass, hand drums and frame drum, sparse low brass swells, natural room
> ambience. 96 BPM, modal and grounded, matter-of-fact rather than dramatic — heavier and lower than
> a pastoral documentary track. No marimba (reserved elsewhere in the suite). Dry and organic.
> Instrumental only, no vocals. Seamless loop.

*Lead: kalimba (both — B drops the marimba double-lead).*
*Sylly: **done** — Weather Turned (*Force of Nature*) is in the jukebox. Watch the naming: one of the
**base** songs is called "A Force of Nature", the same as the mode, so the two are easy to confuse
on a track list.*

---

### 18. Cookie Jar 🍪 — *the hour before dinner*

**Option A — original.**

> Warm, sneaky instrumental loop with a family-kitchen feel. Upright piano playing a light
> ragtime-ish figure, pizzicato strings tiptoeing underneath, muted trumpet, brushed kit, wood block
> and triangle used sparingly. 104 BPM, honey-gold major key, playful and conspiratorial — creeping
> across lino toward the bench. Cosy and domestic, never sinister. Instrumental only, no vocals.
> Seamless loop.

**Option B — same idea, with the specific "creeping pizzicato" and "wah trumpet" clichés that read
as Pink Panther / cartoon-heist (and therefore faintly *sinister*, which T4 explicitly rules out)
named and excluded.**

> Warm, sneaky instrumental loop with a family-kitchen feel. Upright piano playing a light ragtime-
> ish figure, soft pizzicato strings, muted trumpet used sparingly, brushed kit, wood block and
> triangle. 104 BPM, honey-gold major key, playful and conspiratorial — creeping across lino toward
> the bench. No comedy tiptoe walking bass, no creeping-pizzicato cliché, no wah-muted trumpet, no
> cartoon-heist flavour. Cosy and domestic, never sinister. Instrumental only, no vocals. Seamless
> loop.

*Lead: upright piano (both).*
*Sylly: **optional, low** — Dibber Dobber turns sneaking into dobbing (playground accusation, blind
commits). It changes the mood a little, but the base track's "conspiratorial" already covers most
of it.*

---

### 19. Cold Shoulder 🧊 — *slapstick on the ice*

T4: cartoon double-take, "shove first, apologise never," cold blues and greys with a bright horizon,
**never real jeopardy**. Rounds run ~10 minutes.

**Option A — comic cold.**

> Bright, chilly instrumental loop with comic weight. Pizzicato strings and bassoon trading a short
> waddling figure, muted tuba accents, wood block and temple block, brushed kit, a thin glassy pad
> for the cold air. 104 BPM, major with cheeky chromatic slips — a crowd of penguins with strong
> opinions about personal space. No jeopardy, no cracking-ice drama, no orchestral swells.
> Instrumental only, no vocals. Seamless loop.

**Option B — cold and calm.**

> Spacious, chilly instrumental loop. Soft felt piano, low warm pad, light mallets, gentle brushed
> percussion, faint wind held well back. 88 BPM, major, bright horizon over a grey sea — calm, wide
> and cold, never bleak. Music staying out of the way of the slapstick on screen. Instrumental only,
> no vocals. Seamless loop.

*Lead: bassoon (A) / felt piano (B). Note: comic loops with a strong instrumental "bit" (A) tend to
fatigue faster than a calmer bed over CLD's ~10-minute round length — worth generating both and
listening at real length, not just on first pass.*
*Sylly: **not yet** — the owner plans to demote The Thaw to a normal setting and give Cold Shoulder a
new Sylly Mode (`cld.md` T8). Wait for that before scoring anything.*

---

### 20. Honeycomb Hills 🍯 — *the longest sitting in the box*

T4: meadow in high summer, a gardener's register, warm golds/greens/terracotta, nothing grim,
nothing industrial. **25–50 minutes a match** — fatigue resistance matters more here than for any
other track in the suite.

**Option A — warm pastoral.**

> Warm pastoral instrumental loop for a long, unhurried game. Nylon guitar and hammered dulcimer
> trading a circular figure, soft clarinet, warm upright bass, brushes and light hand percussion,
> faint summer room tone. 84 BPM, major with modal turns, sunlit and patient. No hook, no melody
> that asks to be noticed — gentle variation rather than a repeated phrase. Instrumental only, no
> vocals. Seamless loop.

**Option B — minimal warm (recommended read of the 25–50 minute runtime — the flattest dynamic
range in the suite, deliberately).**

> Slow, warm minimal instrumental loop. Harmonium and low clarinet holding long overlapping chords,
> a soft accordion swell, plucked nylon guitar marking time, almost no percussion. 80 BPM, major
> with modal turns — the hum of a meadow in high summer. Extremely low dynamic range, no melodic
> hook. Written to be heard for forty minutes without being noticed once. Instrumental only, no
> vocals. Seamless loop.

*Lead: hammered dulcimer (A) / harmonium (B). Note: Option A's hammered dulcimer collides with The
Bluff Option A above — if generating both, prefer Bluff-B (bowed cello) or Comb-B (harmonium) to
keep both leads unique.*
*Sylly: **n/a** — the one game with no Sylly Mode (`comb.md` T8).*

---

## Sylly Mode tracks

### The test

A Sylly Mode earns its own track when it changes **what the game feels like to sit at**, not just
what the rules say. Harder words, an extra phase at the end or one secret role all leave the room
sounding the same, so the base track still fits them. The ones that pass the test change the
register itself: a lullaby becomes a fever dream, a cocktail party becomes a room full of forgers.

**A variant keeps its base game's lead instrument, on purpose.** It should sound like *the same game,
turned* — recognisable in five seconds as Flawless or Net-Trace — and not like a new game. So
variants are exempt from the unique-lead rule and use up no slot in its table. Same tempo family and
key centre as the base track, so a later mid-session crossfade (menu → match) doesn't lurch.

### Verdict, all 20

| # | Game | Sylly Mode | How far it moves the mood | Verdict |
|---|------|------------|---------------------------|---------|
| 15 | Counting Sheep | Night Terrors | Lullaby → fever dream; the biggest flip in the suite | ✅ **Done** — Eerie Night Sky |
| 17 | Pecking Order | Force of Nature | Stable ecology → weather reshaping the rules every Encounter | ✅ **Done** — Weather Turned |
| 14 | Fruit Salad | Fruity Personalities | Every fruit gets an attitude; sillier, busier | ✅ **Done** — Fruity Fun |
| 16 | Flawless | The Counterfeit Run | Poised lounge → a room full of forgers and auditors | **Make — priority 1** |
| 10 | The Bluff | The Tempest | Honest dice → dice you can't trust, even your own | **Make — priority 2b** (after the base track, 2a) |
| 2 | Great Minds | Static Interference | Same tuning, with the signal jammed | **Make — priority 3** (cheap, *if* base is Option B) |
| 13 | Net-Trace | Distributed Network Protocol | A solo puzzle → a team relay across chained nodes | **Make — priority 4** |
| 18 | Cookie Jar | Dibber Dobber | Sneaking → dobbing; blind three-way commits | Optional, low |
| 9 | Group Therapy | Stroke or Genius | Perceptual (a shaking canvas, blurred drawings), not tonal | Optional, low — a fun joke, not a new register |
| 19 | Cold Shoulder | The Thaw | Geometry only; the mode is due to be replaced | **Wait** for the new mode |
| 11 | Bailed | Drama Mode | A sharper endgame; same suspicion | No |
| 6 | Late to the Party | The Troublemaker | A third goal inside the same loop | No |
| 8 | Deep-Sea Deploy | Silent Running | The base track already sounds like it | No |
| 12 | Pass | The Abyss | A growing threat; same table | No |
| 4 | Just Enough Cooks | Fusion Cuisine | A harder prompt; same kitchen | No |
| 3 | Secret Signals | Intel Phase | A second act at the end — wrong shape for a mode-wide track | No |
| 1 | Like I'm Five | Extra Credit | Harder words | No |
| 7 | Natural Selection | Survival of the Fittest | Who knows what, and when | No |
| 5 | You Get It? | The Ringer | One fake answer per round | No |
| 20 | Honeycomb Hills | — | No Sylly Mode | n/a |

### Priority order (a few generations a day)

1. **Flawless — The Counterfeit Run.** Of the modes still without a variant, this one changes the
   mood the most, and the base palette turns into it easily.
2. **The Bluff — base track first (2a), then The Tempest (2b).** Filling the jukebox's only empty
   game beats any variant. The Tempest then comes almost straight from Option B's palette.
3. **Great Minds — Static Interference.** Check first whether the shipped base take (*Psychic
   Waves* / `gm.mp3`) is close to Option B. If it is, this is one cheap generation. If it isn't, the
   variant won't sound like the same game. Regenerate the base as Option B first, or skip this one.
4. **Net-Trace — Distributed Network Protocol.** A real change, from solo to team play, but a mild
   one. It shares Net-Trace's cold palette, so it stays distinct from everything else.
5. *(Optional)* Cookie Jar — Dibber Dobber; Group Therapy — Stroke or Genius. Only once the rest of
   the list is finished, and only if a take is actually funny.

Anything below that line is a **no**: the base track already fits the mode.

### Prompts

**Flawless — The Counterfeit Run.** Same room as the base track after the lights go down, with half
the pieces on display fake.

> Cool, nocturnal instrumental loop — the same private jewel exhibition after hours, when half the
> pieces on display are fakes. Low-register vibraphone carrying a sly, slightly-too-smooth line with
> one chromatic note per phrase that doesn't belong, upright bass walking quietly, brushed kit with a
> dry rimshot, muted nylon guitar, a low dark string pad. 88 BPM, minor with chromatic turns, poised
> and suspicious — everyone smiling, nobody trusting. Heist-cool, never a caper: no surf guitar, no
> creeping-pizzicato cliché, no stingers. Instrumental only, no vocals. Seamless loop. Sparse mix,
> low dynamic range, no bells or chimes in the 1–2 kHz range.

**The Bluff — The Tempest** *(generate only after the base track exists, and match its tempo and
key)*. Built on Option B's palette.

> Same warm rock ledge as before, with weather coming in. Low bowed cello drone, frame drum now
> slightly uneven, muted plucked guitar harmonics, dry wind texture that rises and falls, a soft
> distant low swell every few bars — never a hit, never thunder. 84 BPM, minor and modal, unsettled
> — you can't trust your footing, or the dice in your own hand. No storm crashes, no orchestral
> climax, tension held and never released. Instrumental only, no vocals. Seamless loop. Sparse mix,
> low dynamic range, no bells or chimes in the 1–2 kHz range.

**Great Minds — Static Interference** *(only if the base take is Option B)*.

> Same analogue radio laboratory, with the signal being jammed. Two slow detuned oscillators
> drifting in and out of phase, tape-saturated pad, shortwave band noise now closer and breathing in
> and out, the sustained sine tone dropping out for half a bar now and then as if a frequency has
> been cut, sparse low piano. 76 BPM, minor, calm but frustrated — two receivers trying to reach
> each other through interference. No glitch stutters, no morse, no alarm, nothing rhythmic enough to
> read as a game cue. Instrumental only, no vocals. Seamless loop.

**Net-Trace — Distributed Network Protocol.**

> Same cold emerald infrastructure, scaled up to a data centre: two interlocking arpeggiated synth
> sequences handing a phrase off to each other every four bars like a relay, deep sub bass, steady
> closed hats, broad filtered pad. 118 BPM, restrained and hypnotic, cooperative and confident — a
> team keeping one signal alive across a chain of machines. No alert tones, no error buzzes, no
> modem sounds, no glitch stutters, no distorted bass drops, no thriller tension. Instrumental only,
> no vocals. Seamless loop.

*Optional concepts, no prompt yet:* **Cookie Jar — Dibber Dobber:** the base kitchen loop with a
playground "na-na" taunt figure on muted trumpet, still cosy and never mean. **Group Therapy —
Stroke or Genius:** the same lift music on a warped, wow-and-flutter tape, as if the waiting-room
speaker is on the blink.

### The code change — DONE, 27 Sep 2026

`Music.playFor(gameId, isSylly)` now tries `tracks["<gameId>:sylly"]` first when `isSylly` is true,
falling back to `tracks[gameId]`, then `lobby` — exactly the shape this section proposed.
`isGameSyllyOn(gameId)` in `js/engine.js` is the one engine-side place that reads each game's
private Sylly flag (a small per-game getter map, same pattern as `getMuteToggleOnClass`), and
`showScreen()`'s existing single call site (`Music.playFor(activeGameId, isGameSyllyOn(activeGameId))`)
is the only line touched — no plugin needs a line of music code, matching the module's one-seam
design.

**The mid-settings question this section flagged is answered, not a gap:** settings overlays toggle
by `style.display`, not `showScreen()`, so flipping the Sylly switch doesn't retheme instantly. The
track updates at the *next* real screen transition — starting the match — which is the natural
moment for it, not an oversight.

Verified in a real browser for all three current variants (SHP, PKO, FRT): the actual settings
toggle flips the flag, the music stays on the base track while settings are still open, and the next
screen transition picks up the Sylly track with its own title. A new Sylly variant needs only a
`"<abbr>:sylly"` line in `data/music/manifest.json` — no code change, since `isGameSyllyOn`'s map
already covers any game with a `let [abbr]SyllyMode` flag once that abbreviation is added to it.

Detail: `docs/deferred-work.md` § Music, `shared-implementation-notes.md` BUG-22 (a real
`encodeURIComponent`-on-a-subpath bug caught while wiring step 2, unrelated to the Sylly tier itself
but found in the same file).

---

## Unique-lead reference (jukebox anti-convergence table)

One lead instrument per base track, kept distinct across the suite. Update this table if a new
option gets chosen or a new game is added — it's the thing that stops the next prompt round from
reissuing an existing lead by accident. Sylly variants reuse their game's lead and aren't listed.

| Game | Lead instrument (by option) |
|------|------------------------------|
| Lobby / fallback | toy piano |
| Like I'm Five | honky-tonk upright piano (B) / glockenspiel (A) |
| Great Minds | detuned oscillator (B) / theremin-like sine (C) / analogue arpeggio (A) |
| Secret Signals | muted trumpet (B) / tremolo surf guitar (A, shipped) |
| Just Enough Cooks | clavinet |
| You Get It? | Wurlitzer |
| Late to the Party | muted disco guitar |
| Natural Selection | solo flute |
| Deep-Sea Deploy | low piano |
| Group Therapy | Rhodes electric piano |
| The Bluff | bowed cello (B) / hammered dulcimer (A — collides with Comb-A) |
| Bailed | bass clarinet (C) / lap steel (B) / melodica (A) |
| Pass | harmonica (C) / tenor saxophone (D) / muted trumpet (A — collides with SS-B) / no lead, ostinato only (B) |
| Net-Trace | arpeggiated synth sequence |
| Fruit Salad | xylophone (B) / steel drum (A) |
| Counting Sheep | music box |
| Flawless | vibraphone (B) / harp (A) |
| Pecking Order | kalimba |
| Cookie Jar | upright piano |
| Cold Shoulder | bassoon (A) / felt piano (B) |
| Honeycomb Hills | harmonium (B) / hammered dulcimer (A — collides with Bluff-A) |

---

## Policy and pipeline

### Fallback rule (current policy)

**A game with no track of its own plays the title theme.** That includes every new game until it is
given one — no silence, no per-game placeholder, no blocking a game's release on a music brief. The
title theme was written to be neutral enough to carry this.

### Shipping a track

**In-game:** generate it, trim it to a clean 60–120 s loop, save it under **any filename** —
`data/music/manifest.json` maps each `activeGameId` key to a `file` field, so the file doesn't need
to be named after the game (the shipped tracks are `gm.mp3` for the `great-minds` key and `ss.mp3`
for `sylly-signals`, which is what let the mismatch between the game's internal id and a tidy
filename get chosen deliberately rather than fought). Add one line to the manifest with the `file`,
and fill in `title`/`artist` while you're there. **No code change, no `sw.js` edit, no version
bump.** Until a game has a line, it plays the lobby theme.

**Jukebox:** drop the master in `data/music/New folder/`, run `node tools/encode-music.js` (it skips
unchanged tracks), and add a line to `data/music/jukebox/manifest.json`, with `variant` set for a
Sylly take. Same deal: no `sw.js` edit, no bump.

### Before any of this ships

Prompts are free; the audio is not. Items 1, 2, 4 and 5 are **settled** — recorded here because the
reasoning still governs what you generate. 3 and 6 are still on you.

1. ~~This breaks a standing anti-pattern.~~ **Settled (28 Aug 2026).** The rule protected install
   size and the offline guarantee; runtime-caching preserves both, so music was adopted as an
   exception scoped to *music only* — effects stay synthesised forever. `docs/decision-log.md`
   2026-08-28.
2. ~~Precache weight is the binding constraint.~~ **Settled: nothing is precached.** `data/music/`
   took the `data/packs/` contract — manifest network-first, audio cache-first, absent from
   `PRECACHE_URLS`. A track is downloaded once, on first play, and only for a game someone actually
   opens. **The per-file ceiling is ~1.5 MB** (128 kbps, 60–120 s loop) — hold to it when generating
   finals; the four in-game tracks are over it pending a trim, and jukebox songs run 1.2–5.7 MB.
3. **Format:** one file per track, mono or joint-stereo, ~96–128 kbps. `.m4a`/AAC was the original
   recommendation for iOS Safari reliability; everything shipped so far is `.mp3`, and
   `tools/encode-music.js` encodes to it — revisit only if iOS playback actually misbehaves.
4. ~~**The loop must actually loop.**~~ **Settled in code.** `music.js` plays game themes through a
   Web Audio buffer source with `loop = true`, never `<audio loop>`. Still true for the file itself:
   trim to a zero-crossing bar boundary, because most generators produce a fade-out.
5. ~~**It needs a mute path on day one.**~~ **Settled.** Music has its own toggle and level
   (`Music.setEnabled` / `Music.setVolume`), separate from effects, and global mute outranks both.
6. **Licensing.** Confirm the generator's terms cover distribution in a public web app before
   generating finals, and record the outcome next to the assets.

### Later, if the credits stretch

Not in scope now, listed so the idea isn't lost. (Sylly Mode variants used to be listed here; they
now have their own section above.)

- **A gameover / podium sting**, shared across the suite — 4–6 seconds, not a loop.
- **A lobby-to-game transition**, if the redesigned title screen ends up with a launch moment worth
  scoring.

### Adding a Music & Sound section to the new-game brief

Deferred, per your call. When it happens the natural home is
`docs/rules/new-game-brief-template.md` (Phase 1), asking three things and nothing more: **the
register in one line** (what does this game sound like?), **tempo and energy**, and **anything the
music must not do** (Deep-Sea Deploy's "no sonar pings" is the model). The fallback rule above means
the field can be left blank without blocking the build. A fourth line is worth adding at the same
time: **does the Sylly Mode change the mood enough to earn a variant?** Use the test in § Sylly Mode
tracks.
