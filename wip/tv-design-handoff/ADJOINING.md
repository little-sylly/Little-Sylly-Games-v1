# What's Behind Every Click

Companion to `README.md`. **These are the rooms next door.** None of them is being redesigned
this round — they are here so a TV-mode layout doesn't accidentally duplicate something that
already has a home, or strand something that doesn't.

The short version: **a lot already exists.** Settings, How to Play, the Workshop, the sound
controls and the whole multiplayer join flow are built, live and liked. A TV layout does not
need to absorb them. What it needs to do is get a player *to* them.

---

## Play → the game's own menu

**This is the single most important one.** Every game already has a menu screen, and it is
where a player lands after choosing a game — whether they chose it on a phone or on a TV.

See `screenshots/real-02-game-menu-pko.png` and `real-03-game-menu-cld.png`.

The menu is identical in structure across all 20 games:

- the game's emoji, its name in a **split treatment** (first part neutral plum-black, last part
  in the game's brand colour), and its one-line pitch
- then exactly four keycap buttons, in this order and never another:
  **Play CTA** (the only game-voiced one) →
  **How to Play** (always that label, always dark stone) →
  **Settings** (always that label, light tint of the brand) →
  **← Back to the Box** (always that label, neutral — the only route back to the lobby)

**The 20 Play CTA labels, verbatim from the live app.** These are worth knowing because a TV
layout with a prominent Play button has a real choice to make: the game's own words, or a plain
"Play". The phone info sheet currently uses a plain "Play"; the game menu behind it uses these.

| Game | Play CTA |
|---|---|
| Bailed | Make the Plans |
| Cookie Jar | Raid the Jar! |
| Cold Shoulder | Hit the Ice |
| Honeycomb Hills | Send the Scouts |
| Deep-Sea Deploy | Begin Deployment |
| The Bluff | Let's Play! |
| Flawless | Enter the Exhibition |
| Fruit Salad | Start Serving |
| Great Minds | Begin Link |
| Group Therapy | Start the Session |
| Just Enough Cooks | Let's Cook! |
| Like I'm Five | Play Time! |
| Late to the Party | Find The Location! |
| Natural Selection | Begin Observation |
| Net-Trace | Initialise System |
| Pass | Deal Me In |
| Pecking Order | Enter the Wild |
| Counting Sheep | Lights Out |
| Secret Signals | Start Mission |
| You Get It? | Let's Get To It! |

> ⚠️ **Two warnings about where copy comes from.**
>
> **1. The old mockups are not a copy source — at all.** That round was run with almost no
> material: no code, no data, little more than the games' names and colours. Everything else in
> those screenshots — button labels, pitches, step text, durations, player counts — was **invented
> to fill the frame**, and it is wrong more often than it is right. A confirmed example:
> `mockup-2b-tv-widescreen.png` shows Secret Signals' button as *"Go Dark"*; the live app says
> **"Start Mission"**. Use the mockups for **layout only**. Every word you need is in
> `reference/games.js` or in the table above, and all of it is quoted from the running app.
>
> **2. Two fields are missing from `games.js` despite its own header.** It lists `playCtaLabel`
> and `howToStepsRaw` among the machine-verified fields, but both were trimmed from the curated
> file and survive only in `games.raw.json`. The table above is the real `playCtaLabel` data,
> re-extracted for this bundle.

**What this means for TV mode:** the lobby does **not** need to show settings, rules, or a
long-form explanation. How to Play is a rich scrollable overlay with step cards, a card gallery
for several games, and a Sylly Mode card. Settings holds every option the game has. Both are one
tap away from the menu, which is one tap from the lobby. The lobby's job is **choosing**, and the
info it shows should serve choosing — who can play, how many phones, how long, what it feels
like. The three "how it goes" steps in `games.js` are a taste, not the rules.

**Open question this round doesn't have to answer:** whether a wide screen shows this menu as-is
(centred, phone-width, lots of empty sides) or eventually gets its own wide treatment. It is
currently the former. If your direction implies the latter, say so — it's useful information,
not scope creep.

## Play → in a lobby session, the multiplayer flow

If the group is playing with a phone each, Play leads through: a mode screen (host or join),
then a **4-character room code**, then a roster as people join, then the game. All built, all
working. The **Big Screen** pill described in `README.md` § 3 belongs on that mode screen.

## The controller → the Workshop

See `screenshots/real-04-workshop.png`.

A full screen holding the controller at hero size, free to rotate by dragging, with:

- **Colours** — four independently colourable groups: Shell (body, front and back), Face (the
  plate), Ears, Buttons. The swatch palette is generated live from the 20 games' brand colours,
  so a 21st game would add a swatch automatically. There is also a rainbow "Randomise All".
- **Stickers** — a book of unlocked designs (currently one per game, 19 of 20) placed anywhere
  on the shell or ears, dragged to reposition, with the model turning to face a sticker you pick.
- **Save** / **Reset**. The design persists on the device.

The saved design is what the small lobby controller wears. **The Workshop is finished; it is not
being redesigned.** What matters for TV mode is that the controller is a real, customised,
self-moving object with a genuine screen behind it — not decoration.

## "You" → the profile popover

A small popover under the controller holding an editable **name** (which really does carry into
every lobby the player hosts or joins) and three **placeholder** stats — matches played, games
tried of 20, favourite shelf. The stats are honest placeholders: the module that would compute
them doesn't exist yet.

**Direction of travel, decided but not built:** Workshop and Profile are likely to merge into one
screen — naming your controller and claiming your profile being the same act, with room to grow
into stats, favourite games, maybe friends. And **achievements are planned to *be* stickers**:
earning one unlocks a design you can put on your controller, so the reward and the
personalisation layer are the same thing. A 🏆 icon exists in the lobby dock as a placeholder.

**Worth knowing for TV mode:** if a wide layout gives the controller a real stage, it is also
giving the future profile/achievements surface its entry point. That's a point in favour of
treating the controller as furniture rather than an icon.

## The dock icons

- **🔊 Sound** — a real overlay: mute-all, a volume slider, a **Music** toggle (there is
  background music, resolved per game with a lobby fallback) and a **System Sounds** toggle.
  Every sound effect in the app is synthesised at runtime — no audio files except music.
- **🏆 Achievements** — placeholder, see above.
- **Three hidden icons** — Skins, Word Packs and Arcade, absent until unlocked by a **Konami
  code** on the lobby. They open a **Secret Mode Terminal**: deliberately a different visual
  world, CRT green-on-black, where expansion packs are browsed and installed and where a small
  arcade cabinet lives (a top-down shmup, not one of the 20 games). **Do not design for these** —
  they are hidden by design, and the Terminal's look is intentionally foreign to the lobby. Just
  don't build a header that has no room for three more icons appearing at once.

## The info sheet (phone) — what TV mode's equivalent replaces

See `screenshots/phone-sheet-390.png`. On a phone, tapping a game opens a drawer with: the name
and pitch, chips for players / phones / length, the three "how it goes" steps, a Sylly Mode card,
then **Play** and **Back to the Box**.

Every field in it is in `reference/games.js`. On a wide screen this content no longer needs to be
a drawer — that's part of what the extra room buys, and all three previous attempts spent it on a
permanent right-hand pane. That is one answer, not the only one.

## What does *not* exist yet

Useful to know, so nothing here is designed around as though it were real:

- **Per-game host screens.** When a Big Screen is running a match, what each game shows on it —
  the shared board, whose turn, a log — is **not built for any of the 20 games**. The Big Screen
  display holds a labelled placeholder for it.
- **`profile.js`** — the real stats behind the popover.
- **Achievements** — the registry, the unlock rules, the art.
- **Full-face game art** — see `README.md` § "The art question". The reserved slot exists; the
  art does not.
- **A wide treatment for any screen except the lobby** — game menus, settings, How to Play and
  all 20 games are phone-shaped today. TV mode is the first wide surface.
