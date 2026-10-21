// ═══════════════════════════════════════════════════════════════════════════
// cookiejar.js — ARCADE CABINET 05. HAND IN THE COOKIE JAR: hold to reach into
// the jar and grab cookies, let go before a family member looks. One-finger
// push-your-luck, set in the Cookie Jar (cjar) party game's world.
// Procedural canvas art.
// NOT a Sylly Game: no multiplayer, no settings, no Sylly Mode, no harness.
// Depends on: engine.js (showScreen, resetToLobby), secret-mode.js (playSecretBeep)
//  - Prefix `hj`. Screen id: screen-arcade-cookiejar. DOM: #hj-stage (pointer
//    target, touch-action:none) wrapping #hj-canvas, plus #btn-hj-exit.
//  - engine.js resetToLobby() should call resetArcadeCookieJar() beside resetArcade().
//  - NO setTimeouts: every delayed effect is scheduled on hjClock via hjEvents.
//
// HOW IT PLAYS (plain words)
//  - Finger down anywhere = hand in the jar. Cookies come out one at a time.
//    The longer one reach lasts, the more each cookie is worth (HJ_TIERS).
//  - Finger up = Sneak Out: the haul goes into the Cookie Stash (the score).
//  - A "visit" is always on its way (hjVisit): a family member gives tells
//    (footsteps, shadow under the door, handle, giggle…), opens the door,
//    turns their head (the fairness window) and LOOKS. Hand in at that moment
//    = Red-Handed: haul lost, one of 3 chances gone.
//  - The DINNER CLOCK (5:00 → dinner at 6:00) always runs down. Letting go
//    late — after the door opens (CLOSE SHAVE) or just before (SNEAKY) —
//    pushes dinner back. Playing it safe doesn't, so the clock ends the run
//    ("DINNER'S READY!") if you never take risks. Two ways to lose: 3 strikes,
//    or dinner time. See the HJ_DINNER_ / HJ_*_MINS constants.
//  - Every visit is a little timeline built in hjStartVisit(). All the tuning
//    numbers live in the HJ_ constants just below, so play-test changes are
//    one-line edits.
//  - The tension pass (Oct 2026): the clock reads as a countdown (DINNER IN
//    47 MIN); while someone's coming and your hand is in the jar a heartbeat
//    speeds up, the kitchen darkens round the edges and leans toward the
//    door; a brave escape freezes the frame for a beat and brave escapes in a
//    row build a NERVES OF STEEL streak bonus; each family member's tell gets a
//    coach line the first time they visit. None of it touches the visit
//    timings or the fairness window.
// ═══════════════════════════════════════════════════════════════════════════
const HJ_W = 360, HJ_H = 640;
const HJ_TITLE = 'HAND IN THE COOKIE JAR';
const HJ_TITLE_LINES = ['HAND IN THE', 'COOKIE JAR'];   // how the title wraps on the attract screen
const HJ_TOP_N = 5;

// ── Palette: warm kitchen (SOFT — swap for Cookie Jar's own palette if one exists) ──
const HJ_WALL = '#3B2A20', HJ_WALL_DK = '#2A1D16', HJ_COUNTER = '#7A5236', HJ_COUNTER_LT = '#946546',
      HJ_CREAM = '#FFF4E0', HJ_COOKIE = '#C68642', HJ_COOKIE_DK = '#9A6431', HJ_CHIP = '#5C3A21',
      HJ_RED = '#E63946', HJ_GOLD = '#FFB703', HJ_TAN = '#C9A98A', HJ_DIMTXT = '#9C8268',
      HJ_HALL = '#F6D7A0', HJ_WOOD = '#8B5A3C', HJ_DOOR_DK = '#5A3A26', HJ_SIL = '#1E130C',
      HJ_SLEEVE = '#52B788', HJ_ARM = '#E2A878', HJ_ARM_DK = '#B97D52', HJ_PINK = '#F48FB1';
const HJ_CONFETTI = ['#E63946', '#FFB703', '#52B788', '#9B5DE5', '#00B4D8', '#FDE68A'];
const HJ_GLASS_FILL = 'rgba(191,227,242,0.16)', HJ_GLASS_EDGE = 'rgba(191,227,242,0.85)';

// ── Tuning (numbers are SOFT unless the handoff said FIRM) ──
const HJ_CHANCES = 3;
const HJ_TIERS = [   // haul tiers: how long THIS reach has lasted → what each cookie is worth
  { name: 'HANDFUL',             short: 'HANDFUL',  from: 0.0, value: 1, every: 0.45 },
  { name: 'BATCH',               short: 'BATCH',    from: 2.0, value: 2, every: 0.35 },
  { name: 'MOUNTAIN OF COOKIES', short: 'MOUNTAIN', from: 4.0, value: 3, every: 0.26 },
];
const HJ_FIRST_GRAB = 0.25;            // s from finger-down to the first cookie
const HJ_RAMP_VISITS = 20;             // difficulty ramps from visit 1 to visit 21, then holds
const HJ_GAP_EARLY = [3, 7], HJ_GAP_LATE = [2, 5];        // quiet time before each visit's first tell (s)
const HJ_WINDOW_EARLY = 0.30, HJ_WINDOW_LATE = 0.18;      // FIRM: appear → look (head turning) (s)
const HJ_LINGER = 0.9, HJ_DOOR_CLOSE = 0.5;               // after the look: stand there, then leave
const HJ_CAUGHT_BEAT = 1.2;
const HJ_WALKPAST_FROM = 6, HJ_WALKPAST_CHANCE = 0.2;
const HJ_WALKERS = ['mum', 'dad', 'big'];                 // who can walk past (they have footsteps)
const HJ_FRIDGE_FROM = 8, HJ_FRIDGE_CHANCE = 0.4, HJ_FRIDGE_PAUSE = [0.8, 1.6];
const HJ_FIRST_TREAT_VISIT = 4, HJ_TREAT_GAP = [3, 5];   // "about every 4th visit" the jar sparkles
const HJ_SUPER_FROM = 10, HJ_SUPER_CHANCE = 1 / 3;
const HJ_PET_BARK_PUNISH = true, HJ_BARK_LEAD = 0.7;      // dog sees your hand → next warning is short
// ── The dinner clock (added after play-testing: letting go early was always safe) ──
// Time runs from 5:00 towards dinner. 1 game minute = 1 real second. Brave escapes
// push dinner back; cautious ones don't, so playing it safe eventually runs out.
// Escapes are graded by when the hand came out, relative to the visitor's door opening:
//   after the door opens, before the look      → CLOSE SHAVE  (+HJ_CLOSE_SHAVE_MINS)
//   in the last HJ_SNEAKY_LEAD s before the door → SNEAKY       (+HJ_SNEAKY_MINS)
//   any earlier                                  → nothing
// Walk-pasts, Dad's fridge stop and the dog never open the door properly, so they never pay.
const HJ_DINNER_START = 60;            // minutes from 5:00 to dinner at the start of a run
const HJ_DINNER_MAX_AHEAD = 90;        // dinner can't be pushed more than this far ahead of "now"
const HJ_CLOSE_SHAVE_MINS = 10, HJ_SNEAKY_MINS = 4;
const HJ_SNEAKY_LEAD = 0.6;            // s before the door opens that still counts as SNEAKY
const HJ_TUTOR_VISITS = 3, HJ_TUTOR_WINDOW = 0.45;   // Mum's first visits: a wider appear → look gap
const HJ_HURRY_MINS = 10;              // under this many minutes the clock goes red and ticks
// ── The tension (cosmetic — none of it moves a visit's timings) ──
const HJ_HEART_SLOW = 0.85, HJ_HEART_FAST = 0.26;   // s between heartbeats, far away → in the doorway
const HJ_STREAK_BONUS = 2;             // cookies per brave escape in a row after the first
const HJ_COACH_S = 4.5;
const HJ_COACH = {
  mum:    'Mum: footsteps, a shadow, then the handle turns. Let go before she looks!',
  dad:    'Dad: slow, heavy footsteps. Sometimes he stops at the fridge first…',
  big:    'Big Sibling is quick! Fast footsteps and no shadow.',
  little: 'Little Sibling giggles instead of making footsteps.',
  pet:    "The family pet can't tell on you. But a bark makes the next visitor come quicker!",
  walk:   'Footsteps fading away? They walked past. Keep grabbing!',
  treat:  'Something special in the jar! Your next grab is a treat.',
  brave:  'Letting go just as the door opens is brave, and it pushes dinner back.',
  hurry:  "Dinner's nearly ready! Take a risk to push it back.",
};

// The family. lead = first tell → appears in the doorway, [early, late] (s).
// shadowAt = when the shadow tell lands, as a fraction of lead (null = no shadow tell).
const HJ_VISITORS = {
  mum:    { name: 'MUM',            lead: [1.6, 1.0], weight: 2.5, stepEvery: 0.30, stepBeep: 147, print: 'shoe',
            tell: 'FOOTSTEPS…',        shadowAt: 0.45, shadowTell: 'A SHADOW UNDER THE DOOR!', shadowSize: 1.0,  door: 0.72, skin: '#E8B48A' },
  dad:    { name: 'DAD',            lead: [2.2, 1.4], weight: 3,   stepEvery: 0.50, stepBeep: 110, print: 'big',
            tell: 'HEAVY FOOTSTEPS…',  shadowAt: 0.60, shadowTell: 'A BIG SHADOW UNDER THE DOOR!', shadowSize: 1.3, door: 0.72, skin: '#C68E6A' },
  big:    { name: 'BIG SIBLING',    lead: [0.9, 0.6], weight: 2,   stepEvery: 0.15, stepBeep: 165, print: 'sneaker',
            tell: 'QUICK FOOTSTEPS!',  shadowAt: null, shadowTell: '', shadowSize: 0.9, door: 0.70, skin: '#F0C9A0' },
  little: { name: 'LITTLE SIBLING', lead: [1.2, 0.8], weight: 2,   stepEvery: 0,    stepBeep: 0,   print: 'none',
            tell: 'HEE HEE… A GIGGLE!', shadowAt: 0.45, shadowTell: 'A LITTLE SHADOW…', shadowSize: 0.6, door: 0.36, skin: '#D9A77E' },
  pet:    { name: 'FAMILY PET',     lead: [1.2, 1.2], weight: 1.5, stepEvery: 0.13, stepBeep: 196, print: 'paw',
            tell: 'PITTER-PATTER…',    shadowAt: 0.50, shadowTell: 'A SHADOW… WITH A TAIL?', shadowSize: 0.8, door: 0.25, skin: '#B07C4F',
            harmless: true },
};

const HJ_TREATS = [
  { name: 'STRAWBERRY SHORTBREAD COOKIES',        pts: 5, look: 'strawberry' },
  { name: 'RED VELVET COOKIES',                   pts: 5, look: 'redvelvet' },
  { name: 'WHITE CHOCOLATE MACADAMIA NUT COOKIES', pts: 5, look: 'whitechoc' },
];
const HJ_SUPER_TREATS = [
  { name: 'FRENCH MACARONS',            pts: 10, look: 'macaron' },
  { name: 'CHOCOLATE TRUFFLE BROWNIES', pts: 10, look: 'brownie' },
];

const HJ_SOUND = {
  select:    () => playSecretBeep(660),
  highScore: () => playSecretBeep(1046),
  grab:      tier => playSecretBeep([523, 587, 659][tier]),
  tierUp:    tier => playSecretBeep(tier === 1 ? 784 : 988),
  bank:      () => { playSecretBeep(392); hjLater(90, () => playSecretBeep(523)); },
  step:      who => playSecretBeep(HJ_VISITORS[who].stepBeep),
  giggle:    () => { playSecretBeep(1318); hjLater(90, () => playSecretBeep(1568)); },
  fridge:    () => playSecretBeep(82),
  handle:    () => playSecretBeep(330),
  notMe:     () => { playSecretBeep(659); hjLater(110, () => playSecretBeep(880)); },
  caught:    () => { playSecretBeep(220); hjLater(150, () => playSecretBeep(147)); hjLater(300, () => playSecretBeep(98)); },
  sparkle:   () => playSecretBeep(1568),
  treat:     () => { playSecretBeep(1046); hjLater(90, () => playSecretBeep(1318)); },
  woof:      () => { playSecretBeep(247); hjLater(110, () => playSecretBeep(196)); },
  closeShave:() => { playSecretBeep(784); hjLater(90, () => playSecretBeep(1046)); hjLater(180, () => playSecretBeep(1318)); },
  sneaky:    () => { playSecretBeep(659); hjLater(90, () => playSecretBeep(784)); },
  tick:      () => playSecretBeep(1175),
  dinner:    () => { [1318, 1046, 1318, 1046].forEach((f, k) => hjLater(k * 160, () => playSecretBeep(f))); },
  heart:     () => { playSecretBeep(82); hjLater(110, () => playSecretBeep(73)); },   // lub-dub
  streak:    () => [1046, 1318, 1568, 2093].forEach((f, k) => hjLater(k * 70, () => playSecretBeep(f))),
};
const HJ_OVER_JINGLE = [523, 392, 330, 262];
// Schedule something ms from now on the game clock (the cabinet's setTimeout).
function hjLater(ms, fn) { hjEvents.push({ at: hjClock + ms, fn }); }

// Layout (logical px)
const HJ_FRAME = { x: 80, y: 70, w: 200, h: 230 };       // doorway frame
const HJ_DOOR  = { x: 92, y: 82, w: 176, h: 206 };       // door panel when closed
const HJ_GAP_Y = 288, HJ_GAP_H = 12;                      // the lit gap under the door (288–300)
const HJ_STRIP_Y = 304;                                   // tell strip 304–344
const HJ_JAR = { cx: 180, top: 372, bot: 556, w: 172, mouthW: 118, neckH: 26 };
const HJ_COUNTER_Y = 556;
// The arm. The hand travels a curve: resting beside the jar → up over the rim →
// down through the mouth into the cookies. The elbow slides from off-screen right
// to just above the rim, so the forearm always drops in through the OPENING (not
// the glass). The elbow is kept below y≈356 so it never covers the tell strip.
const HJ_HAND_OUT = { x: 296, y: 382 }, HJ_HAND_CTRL = { x: 214, y: 316 }, HJ_HAND_IN = { x: 178, y: 424 };
const HJ_ELBOW_OUT = { x: 398, y: 394 }, HJ_ELBOW_IN = { x: 226, y: 357 };
// Digging (while the hand is in the jar). The wiggle starts small and grows to full
// size as THIS reach's haul grows (full size at `full` cookies — about MOUNTAIN).
//   x/y: px the hand roams · rot: wrist twist (radians) · hz: speed, small → big
//   elbowX/elbowY: how much the elbow follows (kept low so the forearm stays in the mouth)
const HJ_DIG = { base: 0.2, full: 14, x: 26, y: 14, rot: 0.3, hz: [1.4, 2.4], elbowX: 0.2, elbowY: 0.3 };

const HJ_BTN_PLAY     = { x: 40,  y: 530, w: 280, h: 64 };
const HJ_SLOTS = [ { x: 60, y: 300, w: 66, h: 84 }, { x: 147, y: 300, w: 66, h: 84 }, { x: 234, y: 300, w: 66, h: 84 } ];
const HJ_BTN_OK       = { x: 80,  y: 430, w: 200, h: 62 };
const HJ_BTN_LB_AGAIN = { x: 20,  y: 530, w: 196, h: 62 };
const HJ_BTN_LB_MENU  = { x: 228, y: 530, w: 112, h: 62 };

let hjCanvas = null, hjCtx = null;
let hjRafHandle = null, hjLastT = 0;
let hjState = 'attract';   // attract | playing | caught | over | nameEntry | leaderboard
let hjClock = 0;           // ms of un-paused time
let hjEvents = [];         // [{ at, fn }] — replaces setTimeout
let hjParts = [];          // particles (crumbs, flying cookies, sparkles, confetti)
let hjFloats = [];         // floating words ("NOT ME!", "+12", treat names)
let hjShake = 0;
let hjScore = 0, hjLastScore = 0;   // hjScore IS the Cookie Stash
let hjPtrId = null;        // the one pointer (or 'key' for Space) allowed to act
let hjPress = null;
let hjScores = [];         // session leaderboard — NOT cleared by teardown
let hjLastRank = -1;
const HJ_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let hjInitials = [0, 0, 0];

// Game state
let hjChances = HJ_CHANCES;
let hjHand = null;          // the current reach — see hjResetHand()
let hjHandPos = 0;          // 0 = out (resting), 1 = in the jar; eased for drawing
let hjVisit = null;         // the visit on its way — see hjStartVisit()
let hjVisitNo = 0;
let hjRecent = [];          // last few visitors (no one three times in a row)
let hjTreat = null;         // a treat waiting in the jar (the sparkle)
let hjNextTreatVisit = HJ_FIRST_TREAT_VISIT;
let hjNow = 0;              // game minutes since 5:00
let hjDinnerAt = HJ_DINNER_START;   // game minutes since 5:00 when dinner's ready
let hjClockPop = 0;
let hjNextTick = 0;
let hjOverReason = 'caught';   // 'caught' (3 strikes) | 'dinner' (ran out of time)
let hjBarkPenalty = false;
let hjCaughtT = 0, hjCaughtWho = 'mum';
let hjOverT = 0;
let hjStashPop = 0;
let hjAttractT = 0;
let hjJarCookies = null;    // the cookies drawn inside the jar (built once)
let hjTension = 0;          // 0 calm … 1 someone's in the doorway and your hand's in the jar (eased, for drawing)
let hjNextHeart = 0;        // hjClock ms
let hjFreeze = 0, hjFlash = 0, hjFlashCol = '255,183,3';
let hjBrave = 0;            // brave escapes in a row
let hjCoach = null, hjCoachQ = [];
let hjCoachSeen = {};       // session-only, like the scores

function hjStart() {
  hjCanvas = document.getElementById('hj-canvas');
  hjCtx = hjCanvas.getContext('2d');
  showScreen('screen-arcade-cookiejar');
  hjResize();
  hjEnterState('attract');
}

function hjEnterState(next) {
  hjState = next;
  if (next === 'playing') hjNewGame();
  if (next === 'attract') { hjResetHand(); hjHandPos = 0; hjVisit = null; }
  hjShake = 0; hjPress = null;
  if (!hjRafHandle) { hjLastT = 0; hjRafHandle = requestAnimationFrame(hjLoop); }
}

function hjNewGame() {
  hjScore = 0; hjParts = []; hjFloats = []; hjEvents = [];
  hjChances = HJ_CHANCES; hjResetHand(); hjHandPos = 0;
  hjVisit = null; hjVisitNo = 0; hjRecent = [];
  hjTreat = null; hjNextTreatVisit = HJ_FIRST_TREAT_VISIT;
  hjNow = 0; hjDinnerAt = HJ_DINNER_START; hjClockPop = 0; hjNextTick = 0; hjOverReason = 'caught';
  hjBarkPenalty = false; hjStashPop = 0; hjLastRank = -1;
  hjTension = 0; hjNextHeart = 0; hjFreeze = 0; hjFlash = 0; hjBrave = 0; hjCoach = null; hjCoachQ = [];
}

function hjQueueCoach(key) { if (hjCoachSeen[key]) return; hjCoachSeen[key] = true; hjCoachQ.push(key); }

// How close the visit on its way is to looking: 0 nobody coming … 1 in the doorway.
function hjCloseness(v) {
  if (!v || v.phase === 'gap') return 0;
  if (v.walk) return v.stepFade ? 0.25 : 0.55;
  if (v.phase === 'door' || v.phase === 'look') return 1;
  if (v.phase === 'leave') return 0.3;
  if (v.appearAt === null) return 0;
  return Math.max(0, Math.min(1, (v.vt - v.t0) / Math.max(0.1, v.appearAt - v.t0)));
}

function hjResetHand() {
  hjHand = { in: false, t: 0, tier: 0, nextGrab: HJ_FIRST_GRAB, haul: [], value: 0, count: 0, pop: 0,
             amp: 0, dig: 0, scoop: 0 };   // digging: size (0–1), wiggle phase, little lift on each grab
}

function hjLoop(now) {
  hjRafHandle = null;
  if (!hjLastT) hjLastT = now;
  const dt = Math.min((now - hjLastT) / 1000, 0.05);
  hjLastT = now;
  const so = document.getElementById('sound-overlay');
  const paused = !!so && so.style.display !== 'none' && so.style.display !== '';
  if (!paused) hjUpdate(dt);
  hjDraw();
  if (!hjRafHandle) hjRafHandle = requestAnimationFrame(hjLoop);
}

function hjUpdate(dt) {
  if (hjShake > 0) hjShake = Math.max(0, hjShake - dt);
  if (hjFlash > 0) hjFlash = Math.max(0, hjFlash - dt * 2.5);
  if (hjFreeze > 0) { hjFreeze -= dt; return; }   // hit-stop on the big moments
  hjClock += dt * 1000;
  hjAttractT += dt;
  // The tension: how close someone is, doubled up while your hand's in the jar.
  const near = hjState === 'playing' ? hjCloseness(hjVisit) : 0;
  const pet = hjVisit && HJ_VISITORS[hjVisit.who].harmless;
  const want = near * (hjHand && hjHand.in ? 1 : 0.35) * (pet ? 0.5 : 1);
  hjTension += (want - hjTension) * Math.min(1, dt * 5);
  if (hjState === 'playing' && hjHand && hjHand.in && near > 0.05 && hjClock >= hjNextHeart) {
    HJ_SOUND.heart();
    hjNextHeart = hjClock + 1000 * hjLerp(HJ_HEART_SLOW, HJ_HEART_FAST, near);
  }
  if (hjCoach && hjClock > hjCoach.until) hjCoach = null;
  if (!hjCoach && hjCoachQ.length && hjState === 'playing') hjCoach = { text: HJ_COACH[hjCoachQ.shift()], until: hjClock + HJ_COACH_S * 1000 };
  if (hjStashPop > 0) hjStashPop = Math.max(0, hjStashPop - dt * 3);
  hjParts.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt; p.life -= dt;
    if (p.spin) p.rot = (p.rot || 0) + p.spin * dt;
    if (p.floor && p.y > p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.6; }
  });
  hjParts = hjParts.filter(p => p.life > 0);
  hjFloats.forEach(f => { f.y += f.vy * dt; f.life -= dt; });
  hjFloats = hjFloats.filter(f => f.life > 0);
  if (hjEvents.length) {
    const due = hjEvents.filter(e => hjClock >= e.at);
    hjEvents  = hjEvents.filter(e => hjClock <  e.at);
    due.forEach(e => e.fn());
  }
  // hand slides in/out quickly
  const target = hjHand && hjHand.in ? 1 : 0;
  hjHandPos += (target - hjHandPos) * Math.min(1, dt * 14);
  if (hjHand && hjHand.pop > 0) hjHand.pop = Math.max(0, hjHand.pop - dt * 5);
  if (hjHand) {                      // digging grows with the haul, eased so it never jumps
    const h = hjHand;
    const want = h.in ? HJ_DIG.base + (1 - HJ_DIG.base) * Math.min(1, h.count / HJ_DIG.full) : h.amp;
    h.amp += (want - h.amp) * Math.min(1, dt * 3);
    h.dig += dt * Math.PI * 2 * hjLerp(HJ_DIG.hz[0], HJ_DIG.hz[1], h.amp);
    if (h.scoop > 0) h.scoop = Math.max(0, h.scoop - dt * 4);
  }

  if (hjClockPop > 0) hjClockPop = Math.max(0, hjClockPop - dt * 2.5);

  if (hjState === 'playing') {
    hjUpdateHand(dt);
    if (hjState === 'playing') hjUpdateVisit(dt);
    if (hjState === 'playing') hjUpdateDinner(dt);
  } else if (hjState === 'caught') {
    hjCaughtT += dt;
    if (hjCaughtT >= HJ_CAUGHT_BEAT) {
      hjVisit = null;
      if (hjChances <= 0) hjGameOver();
      else hjState = 'playing';        // next visit starts on the next frame (with its quiet gap)
    }
  } else if (hjState === 'over') {
    hjOverT += dt;
  }
}

// ── The reach ───────────────────────────────────────────────────────────────
function hjTierAt(t) {
  let k = 0;
  HJ_TIERS.forEach((tier, i) => { if (t >= tier.from) k = i; });
  return k;
}

function hjReachIn() {
  if (hjState !== 'playing' || hjHand.in) return;
  hjResetHand();
  hjHand.in = true;
}

function hjUpdateHand(dt) {
  const h = hjHand;
  if (!h.in) return;
  h.t += dt;
  const tier = hjTierAt(h.t);
  if (tier > h.tier) {
    h.tier = tier;
    HJ_SOUND.tierUp(tier);
    hjFloat(HJ_TIERS[tier].name + '!', 180, 500, { size: 26, color: HJ_GOLD, vy: -30, life: 1.0 });
  }
  while (h.t >= h.nextGrab) {
    hjGrab();
    h.nextGrab += HJ_TIERS[h.tier].every;
  }
}

function hjGrab() {
  const h = hjHand;
  let item;
  if (hjTreat) {
    item = { pts: hjTreat.pts, look: hjTreat.look };
    hjFloat(hjTreat.name + '! +' + hjTreat.pts, 180, 350, { size: 18, color: HJ_PINK, vy: -20, life: 1.6 });
    HJ_SOUND.treat();
    hjTreat = null;
  } else {
    item = { pts: HJ_TIERS[h.tier].value, look: 'cookie' };
    HJ_SOUND.grab(h.tier);
  }
  h.haul.push(item);
  h.value += item.pts; h.count++;
  h.pop = 1; h.scoop = 1;
  const cx = Math.max(HJ_JAR.cx - 40, Math.min(HJ_JAR.cx + 40, hjHandXY().x));
  for (let i = 0; i < 3; i++) {
    hjParts.push({ kind: 'crumb', x: cx + (Math.random() - 0.5) * 40, y: HJ_JAR.top + 6,
      vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 50, grav: 300, life: 0.5, max: 0.5,
      color: Math.random() < 0.5 ? HJ_COOKIE : HJ_CHIP, r: 2 });
  }
}

// Let go: the haul goes into the Cookie Stash.
function hjSneakOut() {
  const h = hjHand;
  if (!h || !h.in) return;
  h.in = false;
  if (hjVisit) hjVisit.outVt = hjVisit.vt;     // when the hand came out, for grading the escape
  if (h.count > 0) {
    hjScore += h.value;
    hjStashPop = 1;
    HJ_SOUND.bank();
    const hp = hjHandXY();
    hjFloat('+' + h.value, hp.x - 20, hp.y - 60, { size: 26, color: HJ_GOLD, vy: -50, life: 0.9 });
    h.haul.slice(-8).forEach((it, i) => {
      const life = 0.45 + i * 0.03;
      hjParts.push({ kind: 'cookie', look: it.look, x: hp.x, y: hp.y - 10, r: 8,
        vx: (40 - hp.x) / life, vy: (36 - hp.y) / life, life, max: life });
    });
  }
  h.haul = []; h.value = 0; h.count = 0;
}

// ── Visits ──────────────────────────────────────────────────────────────────
function hjRamp() { return Math.min(1, Math.max(0, (hjVisitNo - 1) / HJ_RAMP_VISITS)); }
function hjLerp(a, b, t) { return a + (b - a) * t; }
function hjRand(a, b) { return a + Math.random() * (b - a); }
function hjRandInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

function hjPickVisitor(only) {
  if (hjVisitNo <= 3) return 'mum';                       // visits 1–3: Mum teaches the game
  const n = hjRecent.length;
  const banned = n >= 2 && hjRecent[n - 1] === hjRecent[n - 2] ? hjRecent[n - 1] : null;
  const pool = (only || Object.keys(HJ_VISITORS)).filter(k => k !== banned);
  const total = pool.reduce((s, k) => s + HJ_VISITORS[k].weight, 0);
  let r = Math.random() * total;
  for (const k of pool) { r -= HJ_VISITORS[k].weight; if (r <= 0) return k; }
  return pool[pool.length - 1];
}

// Builds one visit as a timeline of steps ({ t, fn }) measured on the visit's own clock (v.vt).
function hjStartVisit() {
  hjVisitNo++;
  const p = hjRamp();
  const walk = hjVisitNo >= HJ_WALKPAST_FROM && Math.random() < HJ_WALKPAST_CHANCE;
  const who = hjPickVisitor(walk ? HJ_WALKERS : null);
  hjRecent.push(who); if (hjRecent.length > 4) hjRecent.shift();
  const V = HJ_VISITORS[who];
  let lead = hjLerp(V.lead[0], V.lead[1], p);
  if (!walk && hjBarkPenalty) { lead = Math.min(lead, HJ_BARK_LEAD); hjBarkPenalty = false; }
  let win = hjLerp(HJ_WINDOW_EARLY, HJ_WINDOW_LATE, p);
  if (hjVisitNo <= HJ_TUTOR_VISITS) win = Math.max(win, HJ_TUTOR_WINDOW);   // generous while Mum teaches
  const gap = hjRand(hjLerp(HJ_GAP_EARLY[0], HJ_GAP_LATE[0], p), hjLerp(HJ_GAP_EARLY[1], HJ_GAP_LATE[1], p));

  // Treat sparkle: the next reach's first cookie is a treat.
  if (!hjTreat && hjVisitNo >= hjNextTreatVisit) {
    const sup = hjVisitNo >= HJ_SUPER_FROM && Math.random() < HJ_SUPER_CHANCE;
    const list = sup ? HJ_SUPER_TREATS : HJ_TREATS;
    hjTreat = list[Math.floor(Math.random() * list.length)];
    hjNextTreatVisit = hjVisitNo + hjRandInt(HJ_TREAT_GAP[0], HJ_TREAT_GAP[1]);
    HJ_SOUND.sparkle();
    hjQueueCoach('treat');
  }

  const v = {
    who, walk, vt: 0, t0: gap, steps: [], phase: 'gap', win, appearVt: 0, appearAt: null, outVt: null,
    stepping: false, stepFade: false, nextStep: 0, prints: [],
    shadowT: 0, shadow: 0, passStart: null, handleVt: null, giggleVt: null,
    doorT: 0, door: 0, inDoor: false, face: 'turn',
    glowT: 0, glow: 0, label: '', labelVt: -9, fridge: false, nextHum: 0, done: false,
  };
  const at = (t, fn) => v.steps.push({ t, fn });
  const say = text => { v.label = text; v.labelVt = v.vt; };
  const startSteps = () => { v.stepping = true; v.nextStep = v.vt; };
  const giggle = () => { HJ_SOUND.giggle(); v.giggleVt = v.vt; };
  const t0 = gap;

  if (walk) {
    // Walk-past: footsteps arrive, the shadow slides across, footsteps fade. Nobody looks.
    at(t0,       () => { v.phase = 'approach'; startSteps(); v.glowT = 0.3; say(V.tell); });
    at(t0 + 0.5, () => { v.shadowT = 1; v.passStart = v.vt; });
    at(t0 + 1.3, () => { v.stepFade = true; v.glowT = 0; say('…FOOTSTEPS FADING AWAY'); hjQueueCoach('walk'); });
    at(t0 + 2.1, () => { v.shadowT = 0; });
    at(t0 + 2.4, () => { v.stepping = false; });
    at(t0 + 3.0, () => { say(''); v.done = true; });
  } else {
    // Dad sometimes stops at the fridge (a fake-out): everything after 35% of his lead shifts later.
    let pauseAt = 99, pause = 0;
    if (who === 'dad' && hjVisitNo >= HJ_FRIDGE_FROM && Math.random() < HJ_FRIDGE_CHANCE) {
      pauseAt = 0.35; pause = hjRand(HJ_FRIDGE_PAUSE[0], HJ_FRIDGE_PAUSE[1]);
    }
    const T = f => t0 + f * lead + (f > pauseAt ? pause : 0);
    v.appearAt = T(1);      // the door opens here (fridge pause already included)

    at(T(0), () => {
      v.phase = 'approach'; v.glowT = 0.3; say(V.tell);
      if (who === 'little') giggle(); else startSteps();
      hjQueueCoach(who);
    });
    if (pause) {
      at(T(pauseAt),         () => { v.stepping = false; v.fridge = true; v.nextHum = v.vt; v.glowT = 0.15; say('…STOPPED AT THE FRIDGE?'); });
      at(T(pauseAt) + pause, () => { v.fridge = false; startSteps(); v.glowT = 0.4; say('HEAVY FOOTSTEPS AGAIN!'); });
    }
    if (V.shadowAt !== null) at(T(V.shadowAt), () => { v.shadowT = 1; v.glowT = 0.65; say(V.shadowTell); });
    if (who === 'mum')    at(T(0.75), () => { v.handleVt = v.vt; v.glowT = 0.85; HJ_SOUND.handle(); say("THE HANDLE'S TURNING!"); });
    if (who === 'little') at(T(0.7),  () => giggle());
    // Appears in the doorway, turns their head (the fairness window), then looks.
    at(T(1), () => { v.phase = 'door'; v.stepping = false; v.inDoor = true; v.doorT = V.door; v.appearVt = v.vt; v.glowT = 1; say(''); });
    at(T(1) + win, () => hjLook(v));
    at(T(1) + win + HJ_LINGER, () => { v.phase = 'leave'; v.doorT = 0; v.shadowT = 0; v.glowT = 0; });
    at(T(1) + win + HJ_LINGER + HJ_DOOR_CLOSE, () => { v.inDoor = false; v.done = true; });
  }
  v.steps.sort((a, b) => a.t - b.t);
  hjVisit = v;
}

function hjUpdateVisit(dt) {
  if (!hjVisit) hjStartVisit();
  const v = hjVisit;
  v.vt += dt;
  while (v.steps.length && v.vt >= v.steps[0].t) {
    v.steps.shift().fn();
    if (hjState !== 'playing') return;      // caught — the visit freezes for the beat
  }
  if (v.stepping && v.vt >= v.nextStep) {
    HJ_SOUND.step(v.who);
    v.prints.push(v.vt); if (v.prints.length > 6) v.prints.shift();
    v.nextStep = v.vt + HJ_VISITORS[v.who].stepEvery * (v.stepFade ? 1.8 : 1);
  }
  if (v.fridge && v.vt >= v.nextHum) { HJ_SOUND.fridge(); v.nextHum = v.vt + 0.28; }
  v.shadow += (v.shadowT - v.shadow) * Math.min(1, dt * 6);
  v.door   += (v.doorT   - v.door)   * Math.min(1, dt * 12);
  v.glow   += (v.glowT   - v.glow)   * Math.min(1, dt * 4);
  if (v.done) hjVisit = null;
}

// The moment of truth. Input is handled before the frame runs, so a release in
// the same frame as the look has already banked: ties go to the kid.
function hjLook(v) {
  v.phase = 'look';
  const V = HJ_VISITORS[v.who];
  const hp = hjHandXY();
  if (V.harmless) {
    if (hjHand.in) {
      v.face = 'bark'; HJ_SOUND.woof();
      hjFloat('WOOF!', 236, 250, { size: 26, color: HJ_CREAM, vy: -20, life: 0.9 });
      if (HJ_PET_BARK_PUNISH) hjBarkPenalty = true;
    } else {
      v.face = 'sniff';
      hjFloat('SNIFF SNIFF', 236, 250, { size: 16, color: HJ_CREAM, vy: -20, life: 0.9 });
    }
    return;
  }
  if (hjHand.in) { hjCaught(v); return; }
  v.face = 'shrug';
  HJ_SOUND.notMe();
  hjFloat('NOT ME!', hp.x - 30, hp.y - 30, { size: 30, color: HJ_CREAM, vy: -30, life: 1.1, outline: true });
  hjGradeEscape(v);
}

// How brave was the escape? Only the LAST time the hand came out during this visit counts.
// A timid escape (well before the door) breaks the streak; a brave one builds it.
function hjGradeEscape(v) {
  if (v.outVt === null || v.appearAt === null) { hjBrave = 0; return; }
  let mins = 0, word = '';
  if (v.outVt >= v.appearAt)                       { mins = HJ_CLOSE_SHAVE_MINS; word = 'CLOSE SHAVE!'; HJ_SOUND.closeShave(); }
  else if (v.outVt >= v.appearAt - HJ_SNEAKY_LEAD) { mins = HJ_SNEAKY_MINS;      word = 'SNEAKY!';      HJ_SOUND.sneaky(); }
  if (!mins) { hjBrave = 0; return; }
  hjDinnerAt = Math.min(hjDinnerAt + mins, hjNow + HJ_DINNER_MAX_AHEAD);
  hjClockPop = 1;
  const shave = mins === HJ_CLOSE_SHAVE_MINS;
  hjFreeze = shave ? 0.14 : 0.07;                  // the frame holds its breath
  hjFlash = shave ? 0.5 : 0.3; hjFlashCol = '255,183,3';
  hjShake = Math.max(hjShake, shave ? 0.18 : 0.08);
  hjConfetti(hjHandXY().x, 380, shave ? 26 : 12);
  hjFloat(word, 180, 412, { size: shave ? 34 : 26, color: HJ_GOLD, vy: -24, life: 1.3, outline: true });
  hjFloat('+' + mins + ' MIN TO DINNER', 180, 92, { size: 15, color: HJ_CREAM, vy: 14, life: 1.4 });
  hjQueueCoach('brave');
  hjBrave++;
  if (hjBrave >= 2) {                              // NERVES OF STEEL: brave escapes in a row pay out
    const bonus = (hjBrave - 1) * HJ_STREAK_BONUS;
    hjScore += bonus; hjStashPop = 1;
    hjLater(260, () => HJ_SOUND.streak());
    hjFloat(`NERVES OF STEEL ×${hjBrave}  +${bonus}`, 180, 452, { size: 18, color: HJ_PINK, vy: -20, life: 1.4, outline: true });
  }
}

function hjConfetti(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, s = 120 + Math.random() * 220;
    hjParts.push({ kind: 'confetti', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, grav: 420,
      life: 1.1, max: 1.1, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 14, color: HJ_CONFETTI[i % HJ_CONFETTI.length] });
  }
}

// The dinner clock: runs only while playing (not during the caught beat).
function hjUpdateDinner(dt) {
  hjNow += dt;
  const left = hjDinnerAt - hjNow;
  if (left <= HJ_HURRY_MINS && left > 0 && hjNow >= hjNextTick) {
    HJ_SOUND.tick(); hjNextTick = Math.floor(hjNow) + 1;
    hjQueueCoach('hurry');
  }
  if (left <= 0) {
    hjNow = hjDinnerAt;
    hjSneakOut();                 // hand in the jar when the bell goes? the haul still counts
    hjVisit = null;
    hjOverReason = 'dinner';
    HJ_SOUND.dinner();
    hjGameOver();
  }
}


function hjCaught(v) {
  v.face = 'caught';
  hjState = 'caught'; hjCaughtT = 0; hjCaughtWho = v.who;
  hjChances--;
  hjShake = 0.45;
  hjFreeze = 0.12; hjFlash = 0.6; hjFlashCol = '230,57,70';
  hjBrave = 0;
  HJ_SOUND.caught();
  // the haul spills on the counter
  const hp = hjHandXY();
  hjHand.haul.slice(-14).forEach(it => {
    hjParts.push({ kind: 'cookie', look: it.look, x: hp.x + (Math.random() - 0.5) * 20, y: hp.y - 20, r: 8,
      vx: (Math.random() - 0.5) * 260, vy: -160 - Math.random() * 160, grav: 900, floor: HJ_COUNTER_Y + 10 + Math.random() * 20,
      life: HJ_CAUGHT_BEAT + 0.2, max: HJ_CAUGHT_BEAT + 0.2 });
  });
  hjHand.in = false; hjHand.haul = []; hjHand.value = 0; hjHand.count = 0;
}

function hjFloat(text, x, y, o = {}) {
  hjFloats.push({ text, x, y, vy: o.vy || -30, life: o.life || 1, max: o.life || 1,
    size: o.size || 20, color: o.color || HJ_CREAM, outline: !!o.outline });
}

function hjGameOver() {
  hjLastScore = hjScore;
  hjState = 'over'; hjOverT = 0;
  HJ_OVER_JINGLE.forEach((f, k) => hjEvents.push({ at: hjClock + 300 + k * 140, fn: () => playSecretBeep(f) }));
  hjEvents.push({ at: hjClock + 3600, fn: () => {
    if (hjQualifies(hjLastScore)) { hjInitials = [0, 0, 0]; HJ_SOUND.highScore(); hjEnterState('nameEntry'); }
    else { hjLastRank = -1; hjEnterState('leaderboard'); }
  }});
}

// High scores (higher is better)
function hjQualifies(s) { return hjScores.length < HJ_TOP_N || s > hjScores[hjScores.length - 1].score; }
function hjSubmit(name, score) {
  const entry = { name, score };
  hjScores.push(entry);
  hjScores.sort((a, b) => b.score - a.score);
  hjScores = hjScores.slice(0, HJ_TOP_N);
  hjLastRank = hjScores.indexOf(entry);
}

// ═══ Drawing ════════════════════════════════════════════════════════════════
function hjDraw() {
  const g = hjCtx;
  g.fillStyle = HJ_WALL; g.fillRect(0, 0, HJ_W, HJ_H);
  g.save();
  if (hjShake > 0) g.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
  if (hjState === 'attract') hjDrawAttract(g);
  else if (hjState === 'playing' || hjState === 'caught') {
    const z = 1 + 0.035 * hjTension;               // the kitchen leans toward the door
    g.save(); g.translate(180, 190); g.scale(z, z); g.translate(-180, -190);
    hjDrawKitchen(g, hjVisit);
    g.restore();
    hjDrawTension(g);
    hjDrawHud(g);
    hjDrawFx(g);
    hjDrawCoach(g);
    if (hjState === 'caught') hjDrawCaught(g);
  } else if (hjState === 'over') hjDrawOver(g);
  else if (hjState === 'nameEntry') hjDrawNameEntry(g);
  else if (hjState === 'leaderboard') hjDrawLeaderboard(g);
  g.restore();
  if (hjFlash > 0) { g.fillStyle = `rgba(${hjFlashCol},${(hjFlash * 0.45).toFixed(3)})`; g.fillRect(0, 0, HJ_W, HJ_H); }
}

// The room closes in: dark edges as someone gets near, a red throb on every
// heartbeat once they're at the door.
function hjDrawTension(g) {
  const t = hjTension;
  if (t < 0.02) return;
  const vg = g.createRadialGradient(180, 330, 140, 180, 330, 430);
  vg.addColorStop(0, 'rgba(10,5,2,0)');
  vg.addColorStop(1, `rgba(10,5,2,${(0.75 * t).toFixed(3)})`);
  g.fillStyle = vg; g.fillRect(0, 0, HJ_W, HJ_H);
  const beat = Math.max(0, 1 - (hjClock - (hjNextHeart - 1000 * hjLerp(HJ_HEART_SLOW, HJ_HEART_FAST, t))) / 260);
  if (t > 0.5 && beat > 0) {
    const rg = g.createRadialGradient(180, 330, 160, 180, 330, 420);
    rg.addColorStop(0, 'rgba(230,57,70,0)');
    rg.addColorStop(1, `rgba(230,57,70,${(0.4 * beat * (t - 0.5) * 2).toFixed(3)})`);
    g.fillStyle = rg; g.fillRect(0, 0, HJ_W, HJ_H);
  }
}

// The coach box, in the prompt's place at the foot of the screen.
function hjDrawCoach(g) {
  if (!hjCoach || hjState !== 'playing') return;
  g.font = 'bold 12px monospace';
  const words = hjCoach.text.split(' '), lines = [];
  let line = '';
  words.forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 300 && line) { lines.push(line); line = w; } else line = t; });
  if (line) lines.push(line);
  const h = lines.length * 17 + 16, y = HJ_H - h - 8;
  g.globalAlpha = Math.max(0, Math.min(1, (hjCoach.until - hjClock) / 400));
  hjRoundRect(g, 14, y, 332, h, 12); g.fillStyle = 'rgba(255,244,224,0.96)'; g.fill();
  g.strokeStyle = HJ_GOLD; g.lineWidth = 2.5; g.stroke();
  lines.forEach((l, i) => hjText(l, 180, y + 16 + i * 17, 12, HJ_SIL, 'center', 320));
  g.globalAlpha = 1;
}

// Text that shrinks to fit the width. align: 'center' | 'left' | 'right'.
function hjText(s, x, y, size, color, align = 'center', maxW = HJ_W - 24, outline = false) {
  const g = hjCtx;
  let sz = size;
  g.font = `bold ${sz}px monospace`;
  while (sz > 9 && g.measureText(s).width > maxW) { sz--; g.font = `bold ${sz}px monospace`; }
  g.textAlign = align; g.textBaseline = 'middle';
  if (outline) { g.lineWidth = Math.max(3, sz / 5); g.strokeStyle = HJ_SIL; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  g.fillStyle = color; g.fillText(s, x, y);
  g.textBaseline = 'alphabetic';
}

function hjDrawButton(r, label, size = 22, primary = true) {
  const g = hjCtx;
  const col = primary ? HJ_GOLD : HJ_CREAM;
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(r.x, r.y, r.w, r.h);
  g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(r.x, r.y, r.w, r.h);
  hjText(label, r.x + r.w / 2, r.y + r.h / 2 + 1, size, col, 'center', r.w - 16);
}

function hjCircle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function hjEllipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); }
function hjRoundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
function hjStar(g, x, y, r, color) {
  g.fillStyle = color; g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, rr = i % 2 ? r * 0.3 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
}

// ── Kitchen scene ──
function hjDrawKitchen(g, v) {
  g.fillStyle = 'rgba(255,244,224,0.035)';
  for (let x = 0; x < HJ_W; x += 24) g.fillRect(x, 60, 12, HJ_COUNTER_Y - 60);   // wallpaper stripes
  hjDrawDoorway(g, v);
  hjDrawTellStrip(g, v);
  hjDrawCounter(g, HJ_COUNTER_Y);
  hjDrawJarBack(g);
  hjDrawHand(g);
  hjDrawJarCover(g);
  hjDrawJarFront(g);
  hjDrawHaulBubble(g);
  if (hjTreat) hjDrawSparkle(g);
  hjDrawPrompt(g);
}

function hjDrawDoorway(g, v) {
  const F = HJ_FRAME, D = HJ_DOOR;
  const glow = v ? v.glow : 0;
  // warm halo round the frame when someone's close
  if (glow > 0.02) {
    for (let i = 4; i >= 1; i--) {
      g.fillStyle = `rgba(255,183,3,${0.08 * glow})`;
      g.fillRect(F.x - i * 7, F.y - i * 7, F.w + i * 14, F.h + i * 7);
    }
  }
  // hallway behind the door (always lit: it's before dinner)
  const hallH = HJ_GAP_Y + HJ_GAP_H - D.y;
  const hall = g.createLinearGradient(0, D.y, 0, D.y + hallH);
  hall.addColorStop(0, '#D9A866'); hall.addColorStop(1, HJ_HALL);
  g.fillStyle = hall; g.fillRect(D.x, D.y, D.w, hallH);
  g.fillStyle = 'rgba(90,58,38,0.35)'; g.fillRect(D.x, D.y + 150, D.w, 4);   // hallway dado rail

  const open = v ? v.door : 0;
  const panelW = D.w * (1 - 0.85 * open);
  if (v && v.inDoor && open > 0.03) {
    g.save(); g.beginPath(); g.rect(D.x, D.y, D.w, hallH); g.clip();
    hjDrawVisitorInDoor(g, v, D.x + panelW, D.x + D.w);
    g.restore();
  }
  // door panel (hinged on the left; it narrows as it swings open)
  g.fillStyle = HJ_WOOD; g.fillRect(D.x, D.y, panelW, D.h);
  if (panelW > 30) {
    g.strokeStyle = HJ_DOOR_DK; g.lineWidth = 3;
    g.strokeRect(D.x + panelW * 0.14, D.y + 18, panelW * 0.72, 76);
    g.strokeRect(D.x + panelW * 0.14, D.y + 112, panelW * 0.72, 76);
  }
  if (open > 0) { g.fillStyle = `rgba(0,0,0,${0.35 * open})`; g.fillRect(D.x, D.y, panelW, D.h); }
  // handle: a lever that turns down (Mum's tell)
  const kx = D.x + panelW - 16, ky = D.y + 106;
  let ang = 0;
  if (v && v.handleVt !== null && v.phase === 'approach') {
    const k = v.vt - v.handleVt;
    ang = Math.min(1, k / 0.12) * 0.75 + Math.sin(k * 40) * 0.06;
  }
  g.strokeStyle = HJ_GOLD; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx - Math.cos(ang) * 16, ky + Math.sin(ang) * 16); g.stroke();
  g.fillStyle = HJ_GOLD; hjCircle(g, kx, ky, 5);
  // the light gap under the door, and the shadow in it
  g.fillStyle = `rgba(255,217,138,${0.6 + 0.4 * glow})`; g.fillRect(D.x, HJ_GAP_Y, D.w, HJ_GAP_H);
  if (v && v.shadow > 0.02) hjDrawDoorShadow(g, v);
  // frame trim on top
  g.fillStyle = HJ_DOOR_DK;
  g.fillRect(F.x, F.y, 12, F.h); g.fillRect(F.x + F.w - 12, F.y, 12, F.h); g.fillRect(F.x, F.y, F.w, 12);
  g.fillStyle = HJ_WALL_DK; g.fillRect(F.x - 10, F.y + F.h, F.w + 20, 4);
}

function hjDrawDoorShadow(g, v) {
  const D = HJ_DOOR, V = HJ_VISITORS[v.who], a = v.shadow, s = V.shadowSize;
  let cx = D.x + D.w * 0.66;
  if (v.walk) {
    const k = v.passStart !== null ? Math.min(1, (v.vt - v.passStart) / 1.6) : 0;
    cx = D.x + 14 + k * (D.w - 28);
  }
  const cy = HJ_GAP_Y + HJ_GAP_H / 2;
  g.save(); g.beginPath(); g.rect(D.x, HJ_GAP_Y, D.w, HJ_GAP_H); g.clip();
  g.fillStyle = `rgba(20,10,5,${0.45 * a})`; hjEllipse(g, cx, cy, 48 * s, HJ_GAP_H);
  g.fillStyle = `rgba(20,10,5,${0.92 * a})`;
  if (V.print === 'paw') [-24, -9, 9, 24].forEach(dx => hjEllipse(g, cx + dx, cy + 2, 5, 6));
  else { hjEllipse(g, cx - 13 * s, cy + 2, 11 * s, 6); hjEllipse(g, cx + 13 * s, cy + 2, 11 * s, 6); }
  g.restore();
}

function hjDrawVisitorInDoor(g, v, L, R) {
  const floorY = HJ_GAP_Y + HJ_GAP_H;
  const turn = v.phase === 'door' ? Math.min(1, (v.vt - v.appearVt) / v.win) : 1;
  const face = v.phase === 'door' ? 'turn' : v.face;
  let cx = (L + R) / 2;
  if (v.who === 'little') cx = L + 24;                    // peeking round the door
  hjDrawVisitor(g, v.who, cx, floorY, 1, face, turn);
}

// One family member, standing on (x, floorY). face: turn | shrug | caught | sniff | bark
function hjDrawVisitor(g, who, x, floorY, s, face, turn = 1) {
  g.save(); g.translate(x, floorY); g.scale(s, s);
  if (who === 'pet') { hjDrawPet(g, face); g.restore(); return; }
  const kid = who === 'little';
  const headY = kid ? -96 : who === 'dad' ? -186 : who === 'big' ? -170 : -178;
  const hr = kid ? 21 : 25;
  const bw = kid ? 54 : who === 'dad' ? 108 : who === 'big' ? 86 : 92;
  const sh = headY + hr + 8;
  g.fillStyle = HJ_SIL;
  hjRoundRect(g, -bw / 2, sh, bw, -sh + 10, kid ? 16 : 24); g.fill();     // body
  g.fillRect(-9, headY + hr - 6, 18, 16);                                  // neck
  if (who === 'mum') hjCircle(g, 0, headY - hr - 4, 14);                   // Mum's bun
  if (kid) { hjCircle(g, -hr - 8, headY - 4, 10); hjCircle(g, hr + 8, headY - 4, 10); }   // pigtails
  hjCircle(g, 0, headY, hr);                                               // head
  hjDrawFace(g, who, headY, hr, face, turn);
  if (who === 'big') {                                                     // Big Sibling's cap
    g.fillStyle = HJ_RED;
    g.beginPath(); g.arc(0, headY - 6, hr + 1, Math.PI, 0); g.fill();
    g.fillRect(-hr - 1, headY - 8, hr * 2 + 20, 7);
  }
  if (kid) { g.fillStyle = HJ_PINK; hjCircle(g, -hr - 8, headY - 14, 4); hjCircle(g, hr + 8, headY - 14, 4); }
  if (who === 'dad') {                                                     // Dad's glasses glint even in silhouette
    g.strokeStyle = face === 'turn' ? 'rgba(255,244,224,0.55)' : HJ_SIL; g.lineWidth = 2.5;
    const off = face === 'turn' ? hr * 1.1 * (1 - turn) : 0;
    g.beginPath(); g.arc(off - 9, headY, 7, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(off + 9, headY, 7, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(off - 2, headY); g.lineTo(off + 2, headY); g.stroke();
  }
  if (face === 'shrug') {                                                  // little shrug marks
    g.strokeStyle = HJ_CREAM; g.lineWidth = 2.5; g.lineCap = 'round';
    [-1, 1].forEach(d => { g.beginPath(); g.moveTo(d * (bw / 2 + 4), sh + 2); g.lineTo(d * (bw / 2 + 12), sh - 8); g.stroke(); });
  }
  g.restore();
}

function hjDrawFace(g, who, hy, hr, face, turn) {
  const skin = HJ_VISITORS[who].skin;
  // the face slides round from the side as they turn their head
  const off = face === 'turn' ? hr * 1.15 * (1 - turn) : 0;
  g.save(); g.beginPath(); g.arc(0, hy, hr, 0, Math.PI * 2); g.clip();
  g.fillStyle = skin; hjCircle(g, off, hy + 3, hr - 1);
  g.fillStyle = HJ_SIL; g.fillRect(-hr, hy - hr, hr * 2, hr * 0.6);      // hairline
  g.restore();
  if (face === 'turn' && turn < 0.85) return;
  g.fillStyle = HJ_SIL; g.strokeStyle = HJ_SIL; g.lineWidth = 2.5; g.lineCap = 'round';
  const ex = hr * 0.38, ey = hy + 1;
  if (face === 'caught') {
    g.fillStyle = '#FFFFFF'; hjCircle(g, -ex, ey, 6); hjCircle(g, ex, ey, 6);
    g.fillStyle = HJ_SIL; hjCircle(g, -ex + 1, ey + 1, 3); hjCircle(g, ex - 1, ey + 1, 3);
    g.beginPath(); g.moveTo(-ex - 6, ey - 12); g.lineTo(-ex + 5, ey - 7); g.stroke();
    g.beginPath(); g.moveTo(ex + 6, ey - 12); g.lineTo(ex - 5, ey - 7); g.stroke();
    hjEllipse(g, 0, hy + hr * 0.55, 5, 6);
  } else if (face === 'shrug') {
    g.beginPath(); g.moveTo(-ex - 4, ey); g.lineTo(-ex + 4, ey); g.stroke();
    g.beginPath(); g.moveTo(ex - 4, ey); g.lineTo(ex + 4, ey); g.stroke();
    g.beginPath(); g.moveTo(-ex - 4, ey - 9); g.lineTo(-ex + 4, ey - 11); g.stroke();
    g.beginPath(); g.moveTo(ex - 4, ey - 11); g.lineTo(ex + 4, ey - 9); g.stroke();
    g.beginPath(); g.moveTo(-5, hy + hr * 0.55); g.lineTo(5, hy + hr * 0.55); g.stroke();
  } else {
    hjCircle(g, -ex, ey, 3); hjCircle(g, ex, ey, 3);
  }
  if (who === 'dad') { g.fillStyle = HJ_SIL; hjEllipse(g, 0, hy + hr * 0.36, 11, 4); }   // moustache
}

function hjDrawPet(g, face) {
  const hy = -40, sil = face === 'turn';
  const fur = sil ? HJ_SIL : HJ_VISITORS.pet.skin;
  g.fillStyle = sil ? HJ_SIL : '#6B4A33';
  hjEllipse(g, -22, hy + 2, 9, 20, 0.35); hjEllipse(g, 22, hy + 2, 9, 20, -0.35);   // floppy ears
  g.fillStyle = fur; hjCircle(g, 0, hy, 22);
  g.fillStyle = sil ? '#3A2618' : '#E2C29A'; hjEllipse(g, 0, hy + 11, 12, 9);
  g.fillStyle = '#000000'; hjEllipse(g, 0, hy + 5, 6, 4.5);                          // the nose pokes in
  if (sil) return;
  g.fillStyle = HJ_SIL; hjCircle(g, -8, hy - 7, 3); hjCircle(g, 8, hy - 7, 3);
  if (face === 'bark') { g.fillStyle = '#7A1F2B'; hjEllipse(g, 0, hy + 17, 6, 5); }
  if (face === 'sniff') {
    g.strokeStyle = HJ_CREAM; g.lineWidth = 2;
    [-1, 1].forEach(d => { g.beginPath(); g.moveTo(d * 9, hy + 2); g.lineTo(d * 15, hy - 1); g.stroke(); });
  }
}

// The strip under the door: words + footprints for every tell (so it works muted).
function hjDrawTellStrip(g, v) {
  const y = HJ_STRIP_Y;
  if (!v || !v.label || v.phase === 'gap') return;
  const age = v.vt - v.labelVt;
  const pop = age < 0.15 ? 1 + (0.15 - age) * 2 : 1;
  const red = v.who !== 'pet' && !v.walk && v.glow > 0.6;
  const col = v.fridge ? '#9FD8F0' : red ? '#FFB4A2' : HJ_CREAM;
  hjText(v.label, 180, y + 12, Math.round(15 * pop), col);
  // footprints: newest brightest
  const V = HJ_VISITORS[v.who];
  if (V.print !== 'none') {
    v.prints.forEach((pt, i) => {
      const k = v.vt - pt;
      const alpha = Math.max(0.15, 1 - k * 0.8);
      const px = 180 + (i - (v.prints.length - 1) / 2) * 26, py = y + 32 + (i % 2 ? -3 : 3);
      hjDrawPrint(g, V.print, px, py, alpha);
    });
  }
  if (v.giggleVt !== null && v.vt - v.giggleVt < 0.8) {                      // giggle squiggle
    g.strokeStyle = `rgba(244,143,177,${1 - (v.vt - v.giggleVt) / 0.8})`; g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 40; i++) { const px = 140 + i * 2; g.lineTo(px, y + 32 + Math.sin(i * 0.7 + v.vt * 20) * 4); }
    g.stroke();
  }
}

function hjDrawPrint(g, kind, x, y, a) {
  g.fillStyle = `rgba(255,244,224,${a})`;
  if (kind === 'paw') {
    hjEllipse(g, x, y + 2, 4, 3.5);
    hjCircle(g, x - 4, y - 3, 1.6); hjCircle(g, x, y - 4.5, 1.6); hjCircle(g, x + 4, y - 3, 1.6);
  } else {
    const s = kind === 'big' ? 1.35 : kind === 'sneaker' ? 0.8 : 1;
    hjEllipse(g, x, y, 3.5 * s, 6 * s); hjEllipse(g, x, y + 8 * s, 2.8 * s, 2.6 * s);
  }
}

function hjDrawCounter(g, y) {
  g.fillStyle = HJ_COUNTER; g.fillRect(0, y, HJ_W, HJ_H - y);
  g.fillStyle = HJ_COUNTER_LT; g.fillRect(0, y, HJ_W, 6);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 30; x < HJ_W; x += 80) g.fillRect(x, y + 14, 2, HJ_H - y - 14);    // wood grain joins
  // the lid, off the jar, sitting on the counter
  g.fillStyle = 'rgba(191,227,242,0.35)';
  g.beginPath(); g.ellipse(46, y + 2, 28, 12, 0, Math.PI, 0); g.fill();
  g.fillStyle = 'rgba(191,227,242,0.6)'; hjCircle(g, 46, y - 12, 5);
}

function hjJarPath(g) {
  const J = HJ_JAR, l = J.cx - J.w / 2, r = J.cx + J.w / 2, ml = J.cx - J.mouthW / 2, mr = J.cx + J.mouthW / 2;
  g.beginPath(); g.moveTo(ml, J.top); g.lineTo(ml, J.top + J.neckH * 0.5);
  g.quadraticCurveTo(l, J.top + J.neckH, l, J.top + J.neckH + 24);
  g.lineTo(l, J.bot - 18); g.quadraticCurveTo(l, J.bot, l + 18, J.bot);
  g.lineTo(r - 18, J.bot); g.quadraticCurveTo(r, J.bot, r, J.bot - 18);
  g.lineTo(r, J.top + J.neckH + 24); g.quadraticCurveTo(r, J.top + J.neckH, mr, J.top + J.neckH * 0.5);
  g.lineTo(mr, J.top);
}

function hjDrawJarBack(g) {
  const J = HJ_JAR;
  if (!hjJarCookies) {                                   // a full jar of cookies, laid out once
    hjJarCookies = [];
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let row = 0; row < 6; row++) {
      for (let i = 0; i < 6; i++) {
        hjJarCookies.push({ x: J.cx - J.w / 2 + 16 + i * 28 + (row % 2) * 14 + (rnd() - 0.5) * 6,
                            y: J.bot - 18 - row * 22 + (rnd() - 0.5) * 6, r: 14 + rnd() * 3 });
      }
    }
  }
  g.save(); hjJarPath(g); g.closePath(); g.fillStyle = HJ_GLASS_FILL; g.fill(); g.clip();
  hjJarCookies.forEach(c => { const o = hjJostle(c); hjDrawCookie(g, c.x + o.x, c.y + o.y, c.r, 'cookie'); });
  g.restore();
  // back half of the rim: drawn BEHIND the arm, so the arm reads as going in over it
  g.strokeStyle = HJ_GLASS_EDGE; g.lineWidth = 3;
  g.beginPath(); g.ellipse(J.cx, J.top, J.mouthW / 2, 6, 0, Math.PI, Math.PI * 2); g.stroke();
}

// Cookies near the digging hand shuffle about a little (more as the digging grows).
function hjJostle(c) {
  const h = hjHand;
  if (!h || hjHandPos < 0.6 || h.amp <= 0) return { x: 0, y: 0 };
  const p = hjArmPose();
  const f = Math.max(0, 1 - Math.hypot(c.x - p.bx, c.y - p.by - 20) / 70) * h.amp;
  return { x: f * 3 * Math.sin(h.dig * 2 + c.x), y: f * 2.5 * Math.cos(h.dig * 2 + c.y) };
}

// Draws the cookies just below the palm AGAIN, on top of the hand, so the fingers
// sink into the pile instead of floating in front of it. The clip is the union of
// those cookies' circles, so the edge follows the bumpy cookie tops.
function hjDrawJarCover(g) {
  if (!hjHand || hjHandPos < 0.55 || !hjJarCookies) return;
  const p = hjArmPose();
  const near = hjJarCookies.filter(c => c.y > p.by + 14 && Math.abs(c.x - p.bx) < 80);
  if (!near.length) return;
  g.save(); hjJarPath(g); g.closePath(); g.clip();
  g.beginPath();
  near.forEach(c => { const o = hjJostle(c); g.moveTo(c.x + o.x + c.r, c.y + o.y); g.arc(c.x + o.x, c.y + o.y, c.r, 0, Math.PI * 2); });
  g.clip();
  hjJarCookies.forEach(c => { const o = hjJostle(c); hjDrawCookie(g, c.x + o.x, c.y + o.y, c.r, 'cookie'); });
  g.restore();
}

function hjDrawJarFront(g) {
  const J = HJ_JAR;
  g.save(); hjJarPath(g); g.closePath(); g.fillStyle = 'rgba(191,227,242,0.08)'; g.fill(); g.restore();   // glass over the arm
  g.save(); hjJarPath(g); g.strokeStyle = HJ_GLASS_EDGE; g.lineWidth = 3; g.stroke(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(J.cx - J.w / 2 + 14, J.top + 66); g.lineTo(J.cx - J.w / 2 + 14, J.bot - 34); g.stroke();
  g.strokeStyle = HJ_GLASS_EDGE; g.lineWidth = 3;
  g.beginPath(); g.ellipse(J.cx, J.top, J.mouthW / 2, 6, 0, 0, Math.PI); g.stroke();   // front half of the rim, over the arm
}

function hjDrawSparkle(g) {
  const t = hjClock / 1000, J = HJ_JAR;
  for (let i = 0; i < 5; i++) {
    const a = t * 2 + i * 1.26;
    const r = 4 + 4 * Math.abs(Math.sin(t * 5 + i));
    hjStar(g, J.cx + Math.cos(a) * 62, J.top - 6 + Math.sin(a) * 12, r, i % 2 ? HJ_GOLD : HJ_PINK);
  }
  hjStar(g, 46, HJ_COUNTER_Y - 18, 3 + 4 * Math.abs(Math.sin(t * 6)), HJ_GOLD);   // the lid twinkles too
}

function hjEase(k) { return k * k * (3 - 2 * k); }
function hjClamp01(v) { return Math.max(0, Math.min(1, v)); }

// Digging offset for the hand at reach position `pos` (0 out … 1 in). Only kicks in
// once the hand is down in the cookies. A figure-of-eight scoop plus a wrist twist.
function hjDig(pos) {
  const h = hjHand;
  const deep = hjEase(hjClamp01((pos - 0.6) / 0.4));
  if (!h || deep <= 0) return { x: 0, y: 0, rot: 0 };
  const a = h.amp * deep, p = h.dig;
  return { x: a * HJ_DIG.x * Math.sin(p),
           y: a * HJ_DIG.y * Math.sin(p * 2 + 0.6) - 9 * h.scoop * deep,
           rot: a * HJ_DIG.rot * Math.sin(p + 1.2) };
}

// The whole arm at reach position `pos`: hand (x, y) with digging, the hand's
// path point without digging (bx, by), the elbow (ex, ey) and the wrist twist.
function hjArmPose(pos = hjHandPos) {
  const t = hjEase(hjClamp01(pos)), u = 1 - t;
  const P0 = HJ_HAND_OUT, C = HJ_HAND_CTRL, P2 = HJ_HAND_IN;
  const bx = u * u * P0.x + 2 * u * t * C.x + t * t * P2.x;
  const by = u * u * P0.y + 2 * u * t * C.y + t * t * P2.y;
  const d = hjDig(pos);
  return { x: bx + d.x, y: by + d.y, bx, by, rot: d.rot,
           ex: hjLerp(HJ_ELBOW_OUT.x, HJ_ELBOW_IN.x, t) + d.x * HJ_DIG.elbowX,
           ey: hjLerp(HJ_ELBOW_OUT.y, HJ_ELBOW_IN.y, t) + d.y * HJ_DIG.elbowY };
}
function hjHandXY(pos = hjHandPos) { return hjArmPose(pos); }

function hjDrawHand(g) {
  hjDrawArm(g, hjArmPose(), hjHand ? hjHand.haul : [], hjHand ? hjHand.dig : 0, hjHand ? hjHand.amp : 0);
}

// The running total of this reach, beside the arm (follows the path, not the wiggle).
function hjDrawHaulBubble(g) {
  if (!hjHand || !hjHand.in || hjHand.count <= 0) return;
  const p = hjArmPose();
  const s = 1 + hjHand.pop * 0.35;
  const val = hjHand.value > 99 ? '99+' : String(hjHand.value);
  // A big haul trembles (and goes red when it's really greedy) — there's a lot to lose.
  const greed = Math.max(0, Math.min(1, (hjHand.value - 10) / 20));
  const jx = (Math.random() - 0.5) * 5 * greed, jy = (Math.random() - 0.5) * 4 * greed;
  const col = greed > 0.6 ? HJ_RED : HJ_GOLD;
  hjText('+' + val, Math.max(70, p.bx - 62) + jx, Math.max(360, p.by - 50) + jy, Math.round((26 + 8 * greed) * s), col, 'center', 120, true);
}

// A cartoon arm: the upper arm runs off the right edge, the forearm runs elbow →
// wrist, and the hand points along the forearm (fingers first). `p` is a pose from
// hjArmPose(). dig/amp make the fingers wriggle while digging.
function hjDrawArm(g, p, haul, dig = 0, amp = 0) {
  const ang = Math.atan2(p.y - p.ey, p.x - p.ex);
  const wx = p.x - Math.cos(ang) * 12, wy = p.y - Math.sin(ang) * 12;    // wrist
  const sx = p.ex + 230, sy = p.ey + 40;                                   // shoulder, off-screen
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = HJ_ARM;
  g.lineWidth = 26; g.beginPath(); g.moveTo(sx, sy); g.lineTo(p.ex, p.ey); g.stroke();
  g.lineWidth = 22; g.beginPath(); g.moveTo(p.ex, p.ey); g.lineTo(wx, wy); g.stroke();
  g.strokeStyle = HJ_SLEEVE; g.lineWidth = 34;
  g.beginPath(); g.moveTo(hjLerp(p.ex, sx, 0.45), hjLerp(p.ey, sy, 0.45)); g.lineTo(sx, sy); g.stroke();
  g.fillStyle = HJ_SLEEVE; hjCircle(g, hjLerp(p.ex, sx, 0.45), hjLerp(p.ey, sy, 0.45), 17);

  // the hand, in its own frame: +x points from the wrist towards the fingertips
  g.save(); g.translate(p.x, p.y); g.rotate(ang + (p.rot || 0)); g.scale(1.2, 1.2);
  g.strokeStyle = HJ_ARM_DK; g.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {                    // fingers, wriggling while digging
    const len = 19 - Math.abs(i - 1.5) * 2.5 + amp * 4 * Math.sin(dig * 3 + i * 1.3);
    g.save(); g.translate(6, -10.5 + i * 7); g.rotate((i - 1.5) * 0.07);
    g.fillStyle = HJ_ARM; hjRoundRect(g, 0, -3.6, len + 4, 7.2, 3.6); g.fill(); g.stroke();
    g.restore();
  }
  g.fillStyle = HJ_ARM; hjEllipse(g, 0, 0, 16, 15);                                   // palm
  g.save(); g.translate(2, -13); g.rotate(-0.55 + amp * 0.25 * Math.sin(dig * 2));   // thumb
  hjRoundRect(g, 0, -4, 17, 8, 4); g.fill(); g.stroke();
  g.restore();
  // the haul, clutched in the fingers
  if (haul && haul.length) {
    const spots = [[18, -5], [20, 6], [10, 1], [26, 0]];
    const n = Math.min(spots.length, haul.length);
    for (let i = 0; i < n; i++) hjDrawCookie(g, spots[i][0], spots[i][1], 8, haul[haul.length - n + i].look);
  }
  g.restore();
}

function hjDrawCookie(g, x, y, r, look = 'cookie') {
  if (look === 'brownie') {
    g.fillStyle = '#4A2C1D'; hjRoundRect(g, x - r, y - r * 0.8, r * 2, r * 1.6, r * 0.25); g.fill();
    g.fillStyle = '#6B4430'; g.fillRect(x - r * 0.6, y - r * 0.5, r * 1.2, r * 0.25);
    return;
  }
  if (look === 'macaron') {
    g.fillStyle = '#C9A7EB'; hjEllipse(g, x, y - r * 0.35, r, r * 0.45); hjEllipse(g, x, y + r * 0.35, r, r * 0.45);
    g.fillStyle = HJ_CREAM; g.fillRect(x - r * 0.85, y - r * 0.12, r * 1.7, r * 0.24);
    return;
  }
  const base = { cookie: HJ_COOKIE, strawberry: '#F4C7A1', redvelvet: '#9B1B30', whitechoc: '#E3B878' }[look] || HJ_COOKIE;
  const dots = { cookie: HJ_CHIP, strawberry: '#E85D8A', redvelvet: HJ_CREAM, whitechoc: '#FFFFFF' }[look] || HJ_CHIP;
  g.fillStyle = base; hjCircle(g, x, y, r);
  g.strokeStyle = look === 'cookie' ? HJ_COOKIE_DK : 'rgba(0,0,0,0.25)'; g.lineWidth = Math.max(1, r * 0.12);
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.fillStyle = dots;
  if (look === 'strawberry') { hjCircle(g, x, y, r * 0.42); return; }
  hjCircle(g, x - r * 0.35, y - r * 0.2, r * 0.17); hjCircle(g, x + r * 0.3, y - r * 0.35, r * 0.15);
  hjCircle(g, x + r * 0.15, y + r * 0.35, r * 0.17);
}

function hjDrawPrompt(g) {
  if (hjCoach && hjState === 'playing') return;   // the coach box has the floor
  const y = HJ_COUNTER_Y;
  if (hjHand && hjHand.in) {
    hjText('LET GO TO SNEAK OUT', 180, y + 32, 18, HJ_CREAM);
    const t = HJ_TIERS[hjHand.tier];
    hjText(`${t.short} x${t.value}`, 180, y + 60, 16, hjHand.tier === 2 ? HJ_RED : HJ_GOLD);
  } else {
    hjText('HOLD TO TAKE', 180, y + 32, 18, HJ_CREAM);
    if (hjTreat) hjText('SOMETHING SPECIAL IN THE JAR…', 180, y + 60, 13, HJ_PINK);
  }
}

function hjDrawHud(g) {
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, HJ_W, 60);
  hjText('COOKIE STASH', 16, 20, 11, HJ_DIMTXT, 'left');
  hjText(String(hjScore), 16, 42, Math.round(24 * (1 + 0.25 * hjStashPop)), HJ_GOLD, 'left');
  for (let i = 0; i < HJ_CHANCES; i++) hjDrawMiniHand(g, 330 - i * 34, 32, i < hjChances);
  hjDrawDinnerClock(g, 132, 30);
}

// The countdown to dinner: a steaming pot, "DINNER IN 47 MIN", and a bar that
// drains towards it. Red and pulsing once it's under HJ_HURRY_MINS. (It used to
// be a wall clock reading "5:42 · DINNER 6:10" — that made you do sums.)
function hjDrawDinnerClock(g, cx, cy) {
  const left = Math.max(0, hjDinnerAt - hjNow);
  const mins = Math.ceil(left);
  const hurry = left <= HJ_HURRY_MINS;
  const pulse = hurry ? 0.5 + 0.5 * Math.sin(hjNow * Math.PI * 2) : 0;
  const col = hurry ? HJ_RED : HJ_CREAM;
  const px = cx - 14, py = cy + 2, k = 1 + 0.2 * hjClockPop + 0.08 * pulse;
  // the pot, its lid and the steam (more of it the closer dinner is)
  g.save(); g.translate(px, py); g.scale(k, k);
  g.fillStyle = hurry ? HJ_RED : '#B9C2C9'; hjRoundRect(g, -13, -6, 26, 16, 5); g.fill();
  g.fillRect(-16, -4, 3, 4); g.fillRect(13, -4, 3, 4);
  g.fillStyle = '#8E979E'; g.fillRect(-14, -9, 28, 4);
  g.fillStyle = HJ_SIL; hjCircle(g, 0, -11, 2.5);
  const steam = 1 - Math.min(1, left / 60);
  g.strokeStyle = `rgba(255,244,224,${(0.25 + 0.6 * steam).toFixed(3)})`; g.lineWidth = 2; g.lineCap = 'round';
  for (let s = -1; s <= 1; s++) {
    const w = Math.sin(hjClock / 200 + s * 2) * 2;
    g.beginPath(); g.moveTo(s * 6, -14); g.quadraticCurveTo(s * 6 + 4 + w, -20, s * 6 + w, -26); g.stroke();
  }
  g.lineCap = 'butt';
  g.restore();
  hjText('DINNER IN', cx + 6, cy - 14, 10, hurry ? HJ_RED : HJ_DIMTXT, 'left');
  hjText(`${mins} MIN${hurry ? '!' : ''}`, cx + 6, cy + 6, Math.round(22 * (1 + 0.15 * hjClockPop + 0.1 * pulse)), col, 'left');
  const bw = 86, bx = cx + 6, by = cy + 20;
  g.fillStyle = 'rgba(255,244,224,0.14)'; g.fillRect(bx, by, bw, 4);
  g.fillStyle = hurry ? HJ_RED : HJ_GOLD; g.fillRect(bx, by, bw * Math.min(1, left / HJ_DINNER_MAX_AHEAD), 4);
}

function hjDrawMiniHand(g, x, y, on) {
  g.fillStyle = on ? HJ_ARM : 'rgba(255,244,224,0.14)';
  hjRoundRect(g, x - 8, y - 3, 16, 15, 5); g.fill();
  for (let i = 0; i < 4; i++) { hjRoundRect(g, x - 8 + i * 4.2, y - 14, 3.6, 13, 1.8); g.fill(); }
  g.save(); g.translate(x - 9, y + 2); g.rotate(-0.7); hjRoundRect(g, -2, -9, 4, 10, 2); g.fill(); g.restore();
}

function hjDrawFx(g) {
  hjParts.forEach(p => {
    const a = Math.max(0, Math.min(1, p.life / 0.25));
    g.globalAlpha = p.kind === 'cookie' ? Math.min(1, a * 2) : a;
    if (p.kind === 'cookie') hjDrawCookie(g, p.x, p.y, p.r, p.look);
    else if (p.kind === 'confetti') {
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot || 0); g.fillStyle = p.color; g.fillRect(-4, -2, 8, 4); g.restore();
    } else { g.fillStyle = p.color; g.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
  });
  g.globalAlpha = 1;
  hjFloats.forEach(f => {
    const age = f.max - f.life;
    const s = age < 0.12 ? 0.6 + age / 0.12 * 0.4 : 1;
    g.globalAlpha = Math.max(0, Math.min(1, f.life / 0.3));
    hjText(f.text, Math.max(70, Math.min(290, f.x)), f.y, Math.round(f.size * s), f.color, 'center', HJ_W - 24, true);
  });
  g.globalAlpha = 1;
}

// ── Red-Handed beat ──
function hjDrawCaught(g) {
  const k = hjCaughtT;
  g.fillStyle = `rgba(40,6,6,${Math.min(0.8, k * 5)})`; g.fillRect(0, 0, HJ_W, HJ_H);
  const pop = Math.min(1, k / 0.18);
  const who = hjCaughtWho;
  if (who === 'little') hjDrawVisitor(g, who, 180, 430, 2.2 * pop, 'caught');
  else hjDrawVisitor(g, who, 180, 430, 1.55 * pop, 'caught');
  // "YES, YOU!" speech bubble
  if (k > 0.15) {
    g.fillStyle = HJ_CREAM; hjRoundRect(g, 90, 46, 180, 50, 14); g.fill();
    g.beginPath(); g.moveTo(170, 94); g.lineTo(182, 112); g.lineTo(190, 94); g.fill();
    hjText('YES, YOU!', 180, 72, 26, HJ_RED, 'center', 170);
  }
  const rs = k < 0.25 ? 1.6 - k / 0.25 * 0.6 : 1;
  hjText('RED-HANDED!', 180, 480, Math.round(40 * rs), HJ_RED, 'center', HJ_W - 20, true);
  hjText(hjChances === 1 ? '1 CHANCE LEFT' : hjChances + ' CHANCES LEFT', 180, 530, 16, HJ_CREAM);
  for (let i = 0; i < HJ_CHANCES; i++) hjDrawMiniHand(g, 146 + i * 34, 570, i < hjChances);
}

// ── Attract / over / name entry / leaderboard ──
function hjDrawAttract(g) {
  // the Arcade Floor's preview (hjPreviewing) draws the jar and the hand, none of the words or the button
  if (!hjPreviewing) {
    hjText(HJ_TITLE_LINES[0], 180, 82, 26, HJ_CREAM);
    hjText(HJ_TITLE_LINES[1], 180, 124, 44, HJ_GOLD, 'center', HJ_W - 24, true);
  }
  g.save(); g.translate(0, -120);
  hjDrawCounter(g, HJ_COUNTER_Y);
  hjDrawJarBack(g);
  const bob = Math.sin(hjAttractT * 3);
  const p = hjArmPose(0.2 + 0.12 * (bob + 1) / 2);   // hovering, about to sneak in
  p.x = p.bx; p.y = p.by; p.rot = 0;                 // no digging on the title screen
  hjDrawArm(g, p, []);
  hjDrawJarFront(g);
  g.restore();
  g.fillStyle = HJ_WALL; g.fillRect(0, 456, HJ_W, HJ_H - 456);
  if (hjPreviewing) return;
  hjText('HOLD TO TAKE COOKIES.', 180, 470, 16, HJ_CREAM);
  hjText('LET GO BEFORE ANYONE LOOKS!', 180, 492, 16, HJ_CREAM);
  hjText('LET GO LATE = DINNER WAITS LONGER', 180, 512, 12, HJ_GOLD);
  hjDrawButton(HJ_BTN_PLAY, 'PLAY', 28);
  if (hjScores.length) hjText(`BEST: ${hjScores[0].name}  ${hjScores[0].score}`, 180, 612, 14, HJ_DIMTXT);
}

function hjDrawOver(g) {
  hjDrawKitchen(g, null);
  hjDrawHud(g);
  hjDrawFx(g);
  g.fillStyle = 'rgba(20,12,8,0.82)'; g.fillRect(0, 0, HJ_W, HJ_H);
  const t = hjOverT;
  if (hjOverReason === 'dinner') {
    if (t > 0.3) {
      const s = Math.min(1, (t - 0.3) / 0.15);
      hjText("DINNER'S READY!", 180, 190, Math.round(36 * (2 - s)), HJ_GOLD, 'center', HJ_W - 24, true);
    }
    if (t > 1.5) hjText('WASH YOUR HANDS.', 180, 290, 24, HJ_CREAM);
  } else {
    if (t > 0.3) {
      hjText('WHO TOOK THE COOKIES', 180, 170, 24, HJ_CREAM);
      hjText('FROM THE COOKIE JAR?', 180, 204, 24, HJ_CREAM);
    }
    if (t > 1.5) {
      const s = Math.min(1, (t - 1.5) / 0.15);
      hjText('YOU DID.', 180, 300, Math.round(44 * (2 - s)), HJ_GOLD, 'center', HJ_W - 24, true);
    }
  }
  if (t > 2.3) hjText(`${hjLastScore} ${hjLastScore === 1 ? 'COOKIE' : 'COOKIES'}.`, 180, 370, 30, HJ_CREAM);
}

function hjDrawNameEntry(g) {
  hjText('NEW HIGH SCORE!', 180, 110, 30, HJ_GOLD, 'center', HJ_W - 24, true);
  hjText(`${hjLastScore} COOKIES`, 180, 160, 24, HJ_CREAM);
  hjText('SIGN THE COOKIE JAR', 180, 236, 16, HJ_TAN);
  hjText('TAP A LETTER TO CHANGE IT', 180, 262, 12, HJ_DIMTXT);
  HJ_SLOTS.forEach((r, i) => {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(r.x, r.y, r.w, r.h);
    g.strokeStyle = HJ_CREAM; g.lineWidth = 3; g.strokeRect(r.x, r.y, r.w, r.h);
    hjText(HJ_ALPHABET[hjInitials[i]], r.x + r.w / 2, r.y + r.h / 2 + 2, 44, HJ_CREAM);
  });
  hjDrawButton(HJ_BTN_OK, 'OK', 26);
}

function hjDrawLeaderboard(g) {
  hjText('COOKIE STASH', 180, 70, 32, HJ_GOLD, 'center', HJ_W - 24, true);
  hjText('SNEAKIEST COOKIE THIEVES', 180, 106, 14, HJ_TAN);
  for (let i = 0; i < HJ_TOP_N; i++) {
    const y = 160 + i * 56, s = hjScores[i];
    const col = i === hjLastRank ? HJ_GOLD : s ? HJ_CREAM : HJ_DIMTXT;
    if (i === hjLastRank) { g.fillStyle = 'rgba(255,183,3,0.12)'; g.fillRect(24, y - 22, 312, 44); }
    hjText(`${i + 1}.`, 44, y, 22, col, 'left');
    hjText(s ? s.name : '---', 96, y, 22, col, 'left');
    hjText(s ? String(s.score) : '', 316, y, 22, col, 'right');
  }
  if (hjLastRank < 0 && hjLastScore >= 0 && hjScores.length && hjState === 'leaderboard') {
    hjText(`YOUR STASH: ${hjLastScore}`, 180, 470, 18, HJ_CREAM);
  }
  hjDrawButton(HJ_BTN_LB_AGAIN, 'AGAIN', 24);
  hjDrawButton(HJ_BTN_LB_MENU, 'MENU', 20, false);
}

// ═══ Input ══════════════════════════════════════════════════════════════════
function hjToLogical(e) {
  const r = hjCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * HJ_W / r.width, y: (e.clientY - r.top) * HJ_H / r.height };
}
function hjHit(r, p) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

function hjOnDown(p) {
  if (hjState === 'attract') { if (hjHit(HJ_BTN_PLAY, p)) { HJ_SOUND.select(); hjEnterState('playing'); } return; }
  if (hjState === 'playing') { hjReachIn(); return; }      // the whole stage is the hold target
  if (hjState === 'nameEntry') {
    for (let i = 0; i < HJ_SLOTS.length; i++) {
      if (hjHit(HJ_SLOTS[i], p)) { hjInitials[i] = (hjInitials[i] + 1) % 26; HJ_SOUND.select(); return; }
    }
    if (hjHit(HJ_BTN_OK, p)) { hjConfirmName(); }
    return;
  }
  if (hjState === 'leaderboard') {
    if (hjHit(HJ_BTN_LB_AGAIN, p)) { HJ_SOUND.select(); hjEnterState('playing'); return; }
    if (hjHit(HJ_BTN_LB_MENU, p))  { HJ_SOUND.select(); hjEnterState('attract'); }
  }
  // caught / over: input ignored
}

function hjConfirmName() {
  HJ_SOUND.select();
  hjSubmit(hjInitials.map(i => HJ_ALPHABET[i]).join(''), hjLastScore);
  hjEnterState('leaderboard');
}

function hjOnUp() {
  if (hjState === 'playing') hjSneakOut();
}

function hjStagePointer(e, phase) {
  if (phase === 'down') {
    if (hjPtrId !== null) return;           // second finger (or Space held) ignored
    hjPtrId = e.pointerId;
    hjOnDown(hjToLogical(e));
    return;
  }
  if (e.pointerId !== hjPtrId) return;      // lifting a second finger doesn't count
  if (phase === 'move') return;
  hjPtrId = null; hjPress = null;           // up / cancel / lost capture = Sneak Out
  hjOnUp();
}

(function hjBindInput() {
  const stage = document.getElementById('hj-stage');
  stage.addEventListener('pointerdown',  e => { try { stage.setPointerCapture(e.pointerId); } catch (_) {} hjStagePointer(e, 'down'); });
  stage.addEventListener('pointermove',  e => { if (e.buttons) hjStagePointer(e, 'move'); });
  stage.addEventListener('pointerup',    e => hjStagePointer(e, 'up'));
  stage.addEventListener('pointercancel', e => hjStagePointer(e, 'cancel'));
  stage.addEventListener('lostpointercapture', e => hjStagePointer(e, 'cancel'));
  stage.addEventListener('contextmenu',  e => e.preventDefault());

  const visible = () => document.getElementById('screen-arcade-cookiejar').style.display !== 'none';
  // Desktop: hold Space to reach; Space/Enter also press the main button on menus.
  document.addEventListener('keydown', e => {
    if (!visible()) return;
    const space = e.code === 'Space' || e.key === ' ';
    if (!space && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.repeat || hjPtrId !== null) return;
    if (hjState === 'playing') { if (space) { hjPtrId = 'key'; hjReachIn(); } return; }
    if (hjState === 'attract' || hjState === 'leaderboard') { HJ_SOUND.select(); hjEnterState('playing'); return; }
    if (hjState === 'nameEntry') hjConfirmName();
  });
  document.addEventListener('keyup', e => {
    if (!visible()) return;
    if ((e.code === 'Space' || e.key === ' ') && hjPtrId === 'key') { hjPtrId = null; hjOnUp(); }
  });
  document.getElementById('btn-hj-exit').addEventListener('click', () => { resetArcadeCookieJar(); arcExitCabinet(); });
  document.addEventListener('visibilitychange', () => {
    if (!visible()) return;
    if (document.hidden) {
      if (hjState === 'playing') hjSneakOut();        // tab hidden mid-reach: bank the haul (kid-friendly)
      if (hjRafHandle) { cancelAnimationFrame(hjRafHandle); hjRafHandle = null; }
      hjPress = null; hjPtrId = null;
    } else if (!hjRafHandle) { hjLastT = 0; hjRafHandle = requestAnimationFrame(hjLoop); }
  });
})();

// Crisp letterboxing — identical to apResize/msResize
function hjResize() {
  if (!hjCanvas) return;
  const box = hjCanvas.parentElement;
  const scale = Math.min(box.clientWidth / HJ_W, box.clientHeight / HJ_H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  hjCanvas.style.width  = Math.floor(HJ_W * scale) + 'px';
  hjCanvas.style.height = Math.floor(HJ_H * scale) + 'px';
  hjCanvas.width  = Math.floor(HJ_W * scale * dpr);
  hjCanvas.height = Math.floor(HJ_H * scale * dpr);
  hjCtx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

function resetArcadeCookieJar() {
  if (hjRafHandle) { cancelAnimationFrame(hjRafHandle); hjRafHandle = null; }
  hjState = 'attract'; hjPress = null; hjPtrId = null;
  hjEvents = []; hjParts = []; hjFloats = []; hjShake = 0;
  hjVisit = null; hjResetHand(); hjHandPos = 0;
  hjTension = 0; hjFreeze = 0; hjFlash = 0; hjCoach = null; hjCoachQ = [];
  // hjScores and hjCoachSeen are NOT cleared — session state survives the lobby.
}

// ── The Arcade Floor's preview (SW v259) ─────────────────────────────────────
// js/lobby/arcade.js drives it: begin() borrows the room's canvas, step()/draw()
// run the attract scene with its card off, end() hands everything back — the
// next hjStart() takes its own canvas again. No RAF of its own here.
let hjPreviewing = false;
function hjPreview() {
  return {
    w: HJ_W, h: HJ_H, fy: 0.42,   // the jar on the counter and the hand hovering over it
    begin(canvas, ctx) {
      resetArcadeCookieJar(); hjCanvas = canvas; hjCtx = ctx; hjPreviewing = true;
      hjEnterState('attract');
      if (hjRafHandle) { cancelAnimationFrame(hjRafHandle); hjRafHandle = null; }
    },
    step: (dt) => hjUpdate(dt),
    draw: () => hjDraw(),
    end() { resetArcadeCookieJar(); hjPreviewing = false; hjCanvas = null; hjCtx = null; },
  };
}
// The session board's top score, for the room's HI line — null until someone has played.
function hjBest() { return hjScores.length ? hjScores[0].score.toLocaleString('en-AU') : null; }

window.addEventListener('resize', () => {
  if (document.getElementById('screen-arcade-cookiejar').style.display !== 'none') hjResize();
});
