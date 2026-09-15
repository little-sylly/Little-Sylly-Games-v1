// ═══════════════════════════════════════════════════════════════════════════
// games.js — the verified 20-game data table for the lobby redesign.
//
// HAND-CURATED. Never overwritten by build-games.js — that script writes
// games.raw.json, the unedited extraction, which is this file's source
// material and its regeneration check (diff the machine fields after any
// identity-doc or engine change).
//
// What's machine-verified (traceable to games.raw.json → a real file:line):
//   id, gameName, emoji, brandHex, minPlayers, maxPlayers, playerRangeDisplay,
//   supportedModes, pitch (the LIVE menu-screen subtitle, not paraphrase),
//   playCtaLabel, syllyModeName, howToStepsRaw (kept verbatim for reference)
//
// What's a Sonnet editorial pass on top of that verified material (15 Sep
// 2026), and should be spot-checked, not trusted blind:
//   howItGoes   — condensed to ≤3 steps. Auto-condensed correctly for 18/20
//                 games; FLW and SHP interleave heading+description PAIRS
//                 rather than clean headings, so their 3 are hand-picked
//                 from the same raw source (see howToStepsRaw for the rest).
//   minutes     — filled ONLY for the 7 games whose T1 pitch paragraph
//                 states a number outright (a direct quote, not an
//                 estimate). The other 13 are null — DELIBERATELY. Inventing
//                 a number here is exactly the mistake the mockup's own
//                 README admits to ("~9 games are my paraphrase" under Open
//                 Questions) and this file exists to not repeat it. Fill
//                 these from real playtesting, not guesswork.
//   shelves     — my proposed assignment, reasoned from each game's real
//                 mechanic, NOT from re-reading the mockup screenshot's
//                 pixel colours (unreliable at the sizes captured). Result:
//                 exactly 18 of the 20 games place cleanly on the mockup's
//                 five verb shelves (Talk · Bluff · Guess+Draw · Cards ·
//                 Luck) — CLD and COMB do not fit ANY of the five, and I
//                 have not forced them in. See SHELF_NOTES below. The
//                 dual-shelf pattern follows the README's own stated
//                 examples (FLW and FRT explicitly named as living on two
//                 shelves) — Bluff+Cards for both, plus DYB/SHP/CJAR each
//                 pull double duty as the three Luck (push-your-luck) games.
//                 FOR OWNER REVIEW — this is a proposal, not a decision.
//
// Field types:
//   playerRangeDisplay : string|null   — set only for the 6 games whose
//                                        bounds branch on a setting; use
//                                        this string over min/max for those
//                                        six, it says WHY the range moves.
//   minutes            : string|null   — a short display string ("~10 min",
//                                        "~25–50 min"), not a bare number —
//                                        several games are genuinely a
//                                        range, and forcing one integer
//                                        would be its own false precision.
// ═══════════════════════════════════════════════════════════════════════════

const SHELF_NOTES = `
OWNER DECISION (OWNER-REVIEW.md item 1, 15 Sep 2026): option (a) below,
named "Strategy" rather than "Board" — the object two games are played on
isn't the reason they don't fit the other five, the kind of decision they
ask for is. Real category, not a forced pair; it extends the same way the
other five do. The rest of this note is kept for the reasoning that led
there.

CLD (Cold Shoulder) and COMB (Honeycomb Hills) do not fit the five verb
shelves — Talk, Bluff, Guess, Cards, Luck all describe how you COMMUNICATE
or what you HOLD; neither describes CLD's simultaneous physical
shove-and-slide or COMB's hex-board resource economy. This isn't a parsing
gap — I tried each of the five honestly against both games' real mechanics
and none fit without stretching a definition past use.

Both are also the suite's two newest and most structurally different games:
COMB is explicitly "the longest, most deliberate game in the box... If the
rest of the suite is a party, this is the afternoon" (its own T1 pitch) —
a real board game, not a party game wearing a phone. CLD is the suite's
only physics game and, like COMB, MDLM-only with no pass-the-phone path —
the "phone is the product, passed around" framing the mockup's README
states as its core assumption doesn't hold for either.
`.trim();

const GAMES = [
  {
    id: 'bld', gameName: 'Bailed', emoji: '📋', brandHex: '#991B1B',
    minPlayers: 5, maxPlayers: 10, playerRangeDisplay: null,
    supportedModes: ["mdlm"],
    pitch: "Making plans is easy. Showing up is hard.",
    syllyModeName: 'Drama Mode',
    howItGoes: ['Everyone gets a secret role', 'Pick the group for each plan', 'Five plans, pass the phone'],
    minutes: null,
    shelves: ['bluff'],
  },
  {
    id: 'cjar', gameName: 'Cookie Jar', emoji: '🍪', brandHex: '#5C3A21',
    minPlayers: 3, maxPlayers: 8, playerRangeDisplay: null,
    supportedModes: ["mdlm"],
    pitch: "Who took the cookies from the cookie jar?",
    syllyModeName: 'Dibber Dobber',
    howItGoes: ['A card comes out of the jar', 'Reach in again, or slip out with what you have', 'Everyone commits at the same time'],
    minutes: '~10 min',
    shelves: ['cards', 'luck'],
  },
  {
    id: 'cld', gameName: 'Cold Shoulder', emoji: '🐧', brandHex: '#8ECAE6',
    minPlayers: 2, maxPlayers: 8, playerRangeDisplay: '2 (Peck Off) or 3–8',
    supportedModes: ["mdlm"],
    pitch: "Barge your mates into the drink — last penguin on the floe wins.",
    syllyModeName: 'The Thaw',
    howItGoes: ['One penguin each on a crowded floe', 'Drag back to aim, like a slingshot', 'Everyone slides at once'],
    minutes: '~10 min',
    shelves: ['board'], // Strategy shelf — owner decision, see SHELF_NOTES
  },
  {
    id: 'comb', gameName: 'Honeycomb Hills', emoji: '🐝', brandHex: '#F0A500',
    minPlayers: 3, maxPlayers: 4, playerRangeDisplay: null,
    supportedModes: ["mdlm"],
    pitch: "Build your comb, trade your nectar, grow the strongest hive in the meadow.",
    syllyModeName: null, // the one game with no Sylly Mode, by design
    howItGoes: ['One die-cast decides what blooms — it pays everyone', 'Spend on walls, cells and domes', 'First to 7 Hive Points wins'],
    minutes: '~25 min (short) / ~50 min (full)',
    shelves: ['board'], // Strategy shelf — owner decision, see SHELF_NOTES
  },
  {
    id: 'dsd', gameName: 'Deep-Sea Deploy', emoji: '⚓', brandHex: '#0E7490',
    minPlayers: 2, maxPlayers: 6, playerRangeDisplay: '2 (TLM) or 4–6 (MDLM)',
    supportedModes: ["ptp","tlm","mdlm"],
    pitch: "Read the grid. Trust your Captain. Don't hit the mine.",
    syllyModeName: 'Silent Running',
    howItGoes: ['Only the Captain sees the grid', 'One Sonar Ping: a word + a number', 'The Crew taps their sequence'],
    minutes: null,
    shelves: ['talk'],
  },
  {
    id: 'dyb', gameName: 'The Bluff', emoji: '🎲', brandHex: '#6B5744',
    minPlayers: 3, maxPlayers: 8, playerRangeDisplay: null,
    supportedModes: ["mdlm"],
    pitch: "Trust no one, count every face.",
    syllyModeName: 'The Tempest',
    howItGoes: ['Everyone shakes a private hand of dice', 'The table makes a claim about what is out there', 'Climb the claim, or call the bluff'],
    minutes: null,
    shelves: ['bluff', 'luck'],
  },
  {
    id: 'flw', gameName: 'Flawless', emoji: '💎', brandHex: '#F9A8D4',
    minPlayers: 3, maxPlayers: 4, playerRangeDisplay: null,
    supportedModes: ["mdlm"],
    pitch: "The flawless one wins. Don't get exposed.",
    syllyModeName: 'The Counterfeit Run',
    // Hand-picked — source block interleaves heading+description pairs,
    // not clean headings; see build-games.js's condenser note.
    howItGoes: ['Draw a second gem, hold two at once', 'Play one, keep your Showpiece secret', 'Get exposed and you are out for this Showing'],
    minutes: '~5 min',
    shelves: ['bluff', 'cards'],
  },
  {
    id: 'frt', gameName: 'Fruit Salad', emoji: '🍌', brandHex: '#FFE500',
    minPlayers: 2, maxPlayers: 8, playerRangeDisplay: '2 (Pear-Off) or 3–8',
    supportedModes: ["mdlm"],
    pitch: '"This is definitely a banana. Trust me."',
    syllyModeName: 'Fruity Personalities',
    howItGoes: ['Slide a face-down card, name a fruit', 'It might be true', 'Everyone watches your face while you say it'],
    minutes: null, // T1: "over in minutes" — real but not a stated number
    shelves: ['bluff', 'cards'],
  },
  {
    id: 'gm', gameName: 'Great Minds', emoji: '🧠', brandHex: '#A855F7',
    minPlayers: 2, maxPlayers: 2, playerRangeDisplay: 'exactly 2',
    supportedModes: ["ptp","mdlm"],
    pitch: "Think alike. And say the same.",
    syllyModeName: 'Static Interference',
    howItGoes: ['Both shown the same word pair', 'Silently think of a connecting word', 'Reveal — match, and you have Mind Melded'],
    minutes: null,
    shelves: ['talk'],
  },
  {
    id: 'gth', gameName: 'Group Therapy', emoji: '🛋️', brandHex: '#B1BCA0',
    minPlayers: 4, maxPlayers: 8, playerRangeDisplay: null,
    supportedModes: ["mdlm"],
    pitch: "We've all got issues. Now draw them.",
    syllyModeName: 'Stroke or Genius',
    howItGoes: ['Everyone draws their disorder, at once', 'Everyone becomes a Shrink and diagnoses strangers', 'The Big Reveal — who drew what'],
    minutes: null,
    shelves: ['guess-draw'],
  },
  {
    id: 'jec', gameName: 'Just Enough Cooks', emoji: '🍳', brandHex: '#475569',
    minPlayers: 3, maxPlayers: 6, playerRangeDisplay: null,
    supportedModes: ["ptp","mdlm"],
    pitch: "Won't Spoil the Broth!",
    syllyModeName: 'Fusion Cuisine',
    howItGoes: ['Everyone sees the same Order', 'Secretly pick 3 ingredients', 'Land in the exact middle of the group’s taste'],
    minutes: null,
    shelves: ['talk'],
  },
  {
    id: 'li5', gameName: "Like I'm Five", emoji: '💬', brandHex: '#EC4899',
    minPlayers: 2, maxPlayers: 2, playerRangeDisplay: 'exactly 2 teams',
    supportedModes: ["ptp","tlm"],
    pitch: "Explain it simply. But no no-nos for me!",
    syllyModeName: 'Extra Credit',
    howItGoes: ['Explain the word to your team', "Don't say any of the ten banned words", 'Get as many right as you can before time runs out'],
    minutes: null,
    shelves: ['talk'],
  },
  {
    id: 'lttp', gameName: 'Late to the Party', emoji: '🏃‍♂️', brandHex: '#EF4444',
    minPlayers: 4, maxPlayers: 6, playerRangeDisplay: null,
    supportedModes: ["ptp","mdlm"],
    pitch: "Everyone's at the party except you.",
    syllyModeName: 'The Troublemaker',
    howItGoes: ['One player is faking it, everyone else knows the spot', 'Message each other over 4 Plans', 'Vote for who you think is faking'],
    minutes: null,
    shelves: ['bluff'],
  },
  {
    id: 'nat', gameName: 'Natural Selection', emoji: '🦁', brandHex: '#65A30D',
    minPlayers: 3, maxPlayers: 8, playerRangeDisplay: null,
    supportedModes: ["ptp","mdlm"],
    pitch: "One of you doesn't know what they're looking at.",
    syllyModeName: 'Survival of the Fittest',
    howItGoes: ['Roles assigned — one player only knows the broad category', 'Everyone submits one word about the animal', 'Vote for who you think is The Mole'],
    minutes: null,
    shelves: ['bluff'],
  },
  {
    id: 'nt', gameName: 'Net-Trace', emoji: '💻', brandHex: '#10B981',
    minPlayers: 2, maxPlayers: 8, playerRangeDisplay: null,
    supportedModes: ["ptp","mdlm"],
    pitch: "Out-engineer the automated breach before your system data is extracted.",
    syllyModeName: 'Distributed Network Protocol',
    howItGoes: ['Build a maze on your own grid', 'A signal traces the longest path it can find', 'The longer it takes, the better you scored'],
    minutes: null,
    shelves: ['guess-draw'],
  },
  {
    id: 'pass', gameName: 'Pass', emoji: '🃏', brandHex: '#18181B',
    minPlayers: 3, maxPlayers: 6, playerRangeDisplay: null,
    supportedModes: ["mdlm"],
    pitch: "Shed your hand, climb the table.",
    syllyModeName: 'The Abyss',
    howItGoes: ['Deal and sort your hand', 'Play higher, or pass', 'Empty your hand first to win'],
    minutes: null,
    shelves: ['cards'],
  },
  {
    id: 'pko', gameName: 'Pecking Order', emoji: '🐘', brandHex: '#9A3412',
    minPlayers: 3, maxPlayers: 6, playerRangeDisplay: null,
    supportedModes: ["mdlm"],
    pitch: "Know the food chain. Become the Apex.",
    syllyModeName: 'Force of Nature',
    howItGoes: ['Every card is an animal you already half-know', 'Stake one or more — the next player must answer every card', 'Swarm past a miss, or Stampede the board'],
    minutes: '~20 min',
    shelves: ['cards'],
  },
  {
    id: 'shp', gameName: 'Counting Sheep', emoji: '🐑', brandHex: '#3A3D52',
    minPlayers: 3, maxPlayers: 8, playerRangeDisplay: null,
    supportedModes: ["mdlm"],
    pitch: "Stay awake. Pass the herd.",
    syllyModeName: 'Night Terrors',
    // Hand-picked — same interleaved-pairs shape as FLW.
    howItGoes: ['Keep the count at or under 99', 'Play a card that pushes it up, or pulls it back', 'Bust the count and you doze off for the Night'],
    minutes: '~10–15 min',
    shelves: ['cards', 'luck'],
  },
  {
    id: 'ss', gameName: 'Secret Signals', emoji: '📡', brandHex: '#14B8A6',
    minPlayers: 2, maxPlayers: 6, playerRangeDisplay: '2 (TLM) or 4–6 (MDLM)',
    supportedModes: ["ptp","tlm","mdlm"],
    pitch: "Send the signal. Secure the code.",
    syllyModeName: 'Intel Phase',
    howItGoes: ['Your team memorises 4 secret keywords', 'Give one clue per number in the code', 'The enemy tries to intercept, your team tries to decode'],
    minutes: null,
    shelves: ['talk'],
  },
  {
    id: 'ygi', gameName: 'You Get It?', emoji: '💡', brandHex: '#F59E0B',
    minPlayers: 3, maxPlayers: 6, playerRangeDisplay: null,
    supportedModes: ["ptp","mdlm"],
    pitch: "Finally, someone said it.",
    syllyModeName: 'The Ringer',
    howItGoes: ['Everyone reads the same fill-in-the-blank sentence', 'Secretly write your own answer', 'Vote for the one you relate to most'],
    minutes: null,
    shelves: ['guess-draw'],
  },
];

// Reference copy of the six shelves for debugging — lobby.js owns the
// canonical LB_SHELVES it actually renders from; keep this in sync with it.
const SHELVES = [
  { id: 'talk',       label: 'Talk',      emoji: '💬' },
  { id: 'bluff',      label: 'Bluff',     emoji: '🎭' },
  { id: 'guess-draw', label: 'Guess',     emoji: '🎯' },
  { id: 'cards',      label: 'Cards',     emoji: '🃏' },
  { id: 'luck',       label: 'Luck',      emoji: '🍀' },
  { id: 'board',      label: 'Strategy',  emoji: '♟️' },
];

if (typeof module !== 'undefined') module.exports = { GAMES, SHELVES, SHELF_NOTES };
if (typeof window !== 'undefined') { window.GAMES = GAMES; window.SHELVES = SHELVES; window.SHELF_NOTES = SHELF_NOTES; }
