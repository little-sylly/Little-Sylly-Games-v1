# Music Prompts — Little Sylly Games

Generation prompts for a title theme plus one track per game. Written for a text-to-music model
(Suno / Udio / Stable Audio style). Each block is copy-paste ready; the **house style** below is the
part every prompt already carries, restated once here so you can adjust it globally.

**Status (28 Aug 2026, SW v212):** the **architecture is live** — `js/lib/music.js` resolves a track
per game from `data/music/manifest.json` and falls back to the lobby theme. Four tracks ship
(`lobby.mp3`, `li5.mp3`, `gm.mp3`, `ss.mp3`); the rest are unused so far.

**Status (20 Sep 2026 — lobby jukebox review):** every game now has an identity doc
(`docs/game-identities/`), so this pass re-read each prompt against its game's own T1/T4 sections.
Several prompts had drifted toward a shared "generic warm acoustic party game" palette instead of
the specific thing their game is — see § Convergence problem below. **This pass adds options, it
does not remove any** — generation is cheap, so every prompt below that changed keeps its original
as Option A and adds one or more new directions as B/C. Nothing is prescribed; generate whichever
you like and keep what actually sounds right. Two games were also missing entirely (Cold Shoulder,
Honeycomb Hills) and are added at the end of § Per game.

**To ship a track:** generate it, trim it to a clean 60–120 s loop, save it as **any filename** —
`data/music/manifest.json` maps each `activeGameId` key to a `file` field, so the file does not need
to be named after the game (the shipped tracks are `gm.mp3` for the `great-minds` key and `ss.mp3`
for `sylly-signals`, which is what let the mismatch between the game's internal id and a tidy
filename get chosen deliberately rather than fought). Add one line to `data/music/manifest.json`
with the `file`, and while you're there fill in `title`/`artist` — currently `null` for three of the
four shipped tracks, and the jukebox will want them. **No code change, no `sw.js` edit, no version
bump.** Until a game has a line, it plays the lobby theme.

The costs and constraints that shaped the architecture are still worth reading before generating
finals — see § Before any of this ships, particularly the **~1.5 MB per-track ceiling** and the
looping requirement. **All four shipped tracks are currently over that ceiling** (`lobby.mp3` 5.46
MB, `ss.mp3` 6.04 MB, `li5.mp3` 4.32 MB, `gm.mp3` 3.52 MB) and want a trim pass before the jukebox
ships — a browsing jukebox makes a cold runtime-cache pull more likely, not less.

---

## Convergence problem (read before generating any new options)

Counting instruments actually named across the original 18 prompts: **brushed kit** in 9, **upright
bass** in 7, **marimba** in 5, **vibraphone**/**ukulele**/**Rhodes** in 3 each. A generator handed
"marimba, upright bass, brushed kit, warm major key" four separate times will hand back four
versions of the same track — that's what several of the reported "this one drifted" tracks probably
were: not a bad take on the game, just an interchangeable one. Two rules going forward:

1. **One named lead instrument per track, distinct across the whole suite.** The shared rhythm bed
   (upright bass + brushed kit) is fine — that's allowed to be the house sound. The lead is what
   must not repeat. § Unique-lead reference below tracks which lead belongs to which game so a
   future prompt doesn't reissue one by accident.
2. **A prompt for a jukebox needs a five-second identity, and needs to not blur into whatever plays
   next.** The old house style optimised purely for "sit under a conversation" — right for a single
   ambient track, incomplete once tracks are auditioned back-to-back. Added to § House style below.

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
  reference.
- **Identifiable inside ~5 seconds, and distinct from its neighbours (jukebox rule, added 20 Sep
  2026).** A jukebox is auditioned back-to-back, not discovered one game at a time — a track that
  needs 20 seconds to reveal its character, or that shares its palette with the track before it,
  reads as filler on a track list even if it's pleasant under a real match.

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
reason someone picks. Curious, not exciting. Lead: **toy piano** — reserved, don't reuse it on a
per-game track.

---

## Per game

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

---

### 6. Late to the Party 🏃 — *group chat, night out*

**No change proposed — matches T4 well.** Original kept as-is.

> Late-night instrumental loop, city-pop meets lo-fi house. Muted disco guitar, warm analogue bass,
> soft four-on-the-floor kick well back in the mix, electric piano chords, light shaker. 108 BPM,
> minor key with a smooth lift — the taxi ride while you work out where everyone actually went.
> Cool, social, a little bit smug. Instrumental only, no vocals. Seamless loop.

*Lead: muted disco guitar.*

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

---

### 9. Group Therapy 🛋️ — *deadpan waiting room*

**No change proposed — matches T4 well.** Original kept as-is.

> Gently absurd waiting-room instrumental loop. Rhodes electric piano playing soft bossa-nova
> chords, nylon guitar, muted flugelhorn, brushed kit, subtle vibraphone. 88 BPM, mellow major key,
> deliberately pleasant and slightly too calm — clinical lift music played completely straight so
> that it becomes funny. Warm, low-stakes, unhurried. Instrumental only, no vocals. Seamless loop.

*Lead: Rhodes electric piano.*

---

### 10. The Bluff 🎲 — *a mountain, and a lie*

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

---

### 11. Bailed 📋 — *the group chat, dryly*

**No change proposed — matches T4 well.** Original kept as-is.

> Dry, deadpan indie instrumental loop. Palm-muted electric guitar, plain electric bass, minimal
> kit with rim-clicks, a lone melodica or cheap organ line. 100 BPM, mildly minor, wry rather than
> tense — the sound of five people typing and one of them lying. Sparse, understated, faintly
> unimpressed. Instrumental only, no vocals. Seamless loop.

Option B — "Yeah, nah" (backyard pre-drinks, still waiting to see who actually turns up). This leans on the "very Australian" voice in T4. Lap steel bends are the musical version of "yeah… nah": a hopeful slide up that slumps back down.

Laid-back, warm instrumental loop — backyard pre-drinks on a summer evening, half the group still
"on their way". Lap steel guitar in a low, lazy register carrying the lead, each phrase sliding up
hopefully then slumping back down, over loose strummed acoustic guitar, plain electric bass and a
relaxed kit with rim-clicks. 92 BPM, sunny major with a mixolydian flattened seventh that sags at
the end of each phrase. Easygoing, wry and fond, never sad or twangy-country. Instrumental only,
no vocals. Seamless loop. Sparse mix, low dynamic range, no bells or chimes in the 1–2 kHz range.

Why: it scores the Friends' side of the night, the people who did turn up, with just enough sag in the harmony to say someone won't.

Option C — the sitcom (one clown in the group who's always somehow gone). 😬 in harmonic terms is a major chord with a note that shouldn't be there, a cheerful grin through gritted teeth. Bass clarinet delivers that without drifting into the bright band where your SFX live.

Bouncy, light-hearted instrumental loop in the style of a sitcom scene transition — a friend group
hanging out, and the lovable clown who always has an excuse. Bass clarinet carrying a short,
sheepish, bouncing figure with little grace-note slips, over a buoyant fingerstyle electric bass
line, tight dry kit with light handclaps, and warm organ chords held well back. 104 BPM, bright
major key with a slightly awkward chromatic rub at the end of each phrase — cheerful, but wincing.
Playful and affectionate, never mocking. No pizzicato, no tiptoeing or sneaking figure, no
sad-trombone "wah-wah", no laugh track or crowd noise. Instrumental only, no vocals. Seamless loop.
Sparse mix, low dynamic range, no bells or chimes in the 1–2 kHz range.

Why: this one is the 😬 face as music. Its exclusions do the heavy lifting: without them, "sitcom" and "clown" pull a generator straight toward circus or cartoon-heist.

Lead: melodica (A) / lap steel (B) / bass clarinet (C). Neither new lead appears anywhere else in the doc, so the unique-lead table row becomes Bailed | bass clarinet (C) / lap steel (B) / melodica (A).

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

Option C — "the shuffle" (no scene, just a groove). The blues shuffle is a rhythm feel, not a setting, and the card pun costs nothing. The swing has an easy, loping forward motion: confident like T4's voice, without inventing a backstory.

Relaxed, confident instrumental loop built on a slow blues shuffle groove. Soft low-register
harmonica carrying a short, laid-back riff, over a walking electric bass, a swung kit with
brushes on the snare, and sparse clean guitar chords on the offbeat. 88 BPM, major blues, easy
and unbothered — a game everyone at the table already knows how to play. No wailing bends, no
smoky bar atmosphere, no crowd noise. Instrumental only, no vocals. Seamless loop. Sparse mix,
low dynamic range, no bells or chimes in the 1–2 kHz range.

Why: this gives Pass something to hum without giving it a costume. The "low-register" and "no wailing bends" instructions keep the harmonica out of the bright band where your SFX live.

Option D — "passing again" (cards night, staring out the window). This is lo-fi daydream music, and that suits it for two reasons. Generators understand the genre well, and it describes exactly the scene you're after: someone at a desk, drifting. The sigh comes from a classic musical device, a two-note falling figure. Tenor sax plays one lazily behind the beat each time, like an exhale when your turn comes round and you've got nothing.

Mellow lo-fi instrumental loop — a casual cards night with mates, and you've passed five times in
a row. Breathy tenor saxophone in a low, lazy register playing short descending two-note sighs,
slightly behind the beat, over soft jazzy seventh chords on muted guitar, a warm round bass line
and a relaxed, head-nodding hip-hop beat with a dusty snare. 80 BPM, warm major with gentle
minor-seventh turns, faint vinyl crackle. Resigned and drowsy, like staring out a classroom window
on a slow afternoon — gently bored, never sad, never frustrated or tense. Instrumental only, no
vocals. Seamless loop. Sparse mix, low dynamic range, no bells or chimes in the 1–2 kHz range.

Why: this scores the passer rather than the game. Most turns in Pass are someone else's, and this is what those turns feel like.

Lead: harmonica (C) / tenor saxophone (D) / muted trumpet (A — collides with Secret Signals B) / ostinato only (B). Neither harmonica nor sax appears anywhere else in the doc.

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

---

### 15. Counting Sheep 🐑 — *bedtime, mechanically*

**No change proposed — matches T4 well.** Original kept as-is.

> Soft lullaby instrumental loop. Music box and celesta carrying a simple rocking melody, warm
> analogue pad underneath, muted upright piano, very light brushed percussion, faint tape wobble.
> 68 BPM, gentle major key, drowsy and safe — a child's bedroom with the light off and the hall
> light on. Extremely soft dynamics. Instrumental only, no vocals. Seamless loop.

*Lead: music box.*

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

---

### 19. Cold Shoulder 🧊 — *slapstick on the ice* (new — game was missing a prompt)

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

---

### 20. Honeycomb Hills 🍯 — *the longest sitting in the box* (new — game was missing a prompt)

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

---

## Unique-lead reference (jukebox anti-convergence table)

One lead instrument per track, kept distinct across the suite. Update this table if a new option
above gets chosen or a new game is added — it's the thing that stops the next prompt round from
reissuing an existing lead by accident.

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
| Bailed | melodica |
| Pass | muted trumpet (A) / no lead, ostinato only (B) |
| Net-Trace | arpeggiated synth sequence |
| Fruit Salad | xylophone (B) / steel drum (A) |
| Counting Sheep | music box |
| Flawless | vibraphone (B) / harp (A) |
| Pecking Order | kalimba |
| Cookie Jar | upright piano |
| Cold Shoulder | bassoon (A) / felt piano (B) |
| Honeycomb Hills | harmonium (B) / hammered dulcimer (A — collides with Bluff-A) |

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
  *Devil's Network Protocol*, Great Minds → *Static Interference* (literally the same loop, jammed —
  Option B's phase-drifting oscillators make this close to free once B exists).
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
   finals; all four shipped tracks are currently over it pending a trim (see § Status above).
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
