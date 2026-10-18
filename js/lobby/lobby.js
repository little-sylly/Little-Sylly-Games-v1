// ═══════════════════════════════════════════════════════════════════════════
// lobby.js — the lb* helpers the Board (board.js) and TV (tv.js) share, the
// filter state they both read (lbState), and TV's size gate + hand-off card
// (SW v231; the Shelves render path that lived here went with the Board, SW v250).
// Global symbols, no fetch. Reads GAMES (lobby-games.js). Routing is NOT here:
// every layout change goes through lobbyGo(), every game launch through
// lobbyLaunch() (js/lobby/lobby-host.js).
// ═══════════════════════════════════════════════════════════════════════════

// ── Shelves: the five verb shelves + a sixth for the two strategy games ──
// Talk · Bluff · Guess · Cards · Luck describe how you communicate or what
// you hold — "Guess" absorbs drawing too (GTH) rather than carrying its own
// wrapping "+ Draw" label; a Draw shelf can come back if the box grows one.
// Cold Shoulder and Honeycomb Hills are the only two games built around
// planning moves on a shared board rather than a hand or a clue, so they
// get a shelf named for that instead of the "Board" object it's played on.
// Owner call, 15 Sep 2026 (OWNER-REVIEW.md items 1 + shelf naming).
const LB_SHELVES = [
  { id: 'talk',       label: 'Talk',      emoji: '💬', blurb: 'Get the words across' },
  { id: 'bluff',      label: 'Bluff',     emoji: '🎭', blurb: 'Someone at the table is lying' },
  { id: 'guess-draw', label: 'Guess',     emoji: '🎯', blurb: 'Read the room, land the answer' },
  { id: 'cards',      label: 'Cards',     emoji: '🃏', blurb: 'Play a card, beat the table' },
  { id: 'luck',       label: 'Luck',      emoji: '🍀', blurb: 'Push it, then stop in time' },
  { id: 'board',      label: 'Strategy',  emoji: '♟️', blurb: 'Plan your moves, outlast the table' },
];

// The filters are ONE state for both layouts: a player moving between the Board
// and TV keeps their answer. Memory only.
const lbState = {
  count: null,         // null = any, else 2..10
  onePhone: false,
  profileOpen: false,  // the "You" popover under the controller — see § Profile popover
};

// ── Profile popover — the nickname ──────────────────────────
// sylly_nickname is the one nickname key the real app already reads/writes to
// localStorage (logic-engine.md § localStorage Exception) — reusing it here is
// what makes "carries into every lobby" literally true, not just copy.
const LB_NICK_KEY = 'sylly_nickname';
function lbGetNickname() {
  try { return localStorage.getItem(LB_NICK_KEY) || ''; } catch (_) { return ''; }
}
function lbSetNickname(v) {
  try { v ? localStorage.setItem(LB_NICK_KEY, v) : localStorage.removeItem(LB_NICK_KEY); } catch (_) {}
}
function lbEsc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ── Data helpers ─────────────────────────────────────────────────────────────
function lbGame(id) { return GAMES.find(g => g.id === id); }
function lbShelfGames(shelfId) { return GAMES.filter(g => g.shelves.includes(shelfId)); }
function lbOnePhone(g) { return g.supportedModes.includes('ptp'); }
function lbTeams(g) { return /teams/.test(g.playerRangeDisplay || ''); }

// Fitting games first (original order preserved), excluded ones bumped to
// the end — the "live reshuffle" the owner asked for (OWNER-REVIEW.md item
// 2) so a filter change visibly promotes what still fits instead of just
// dimming what doesn't.
function lbSortByFit(games) {
  const fit = [], out = [];
  for (const g of games) (lbWhyOut(g) ? out : fit).push(g);
  return fit.concat(out);
}

// Why a game doesn't fit the current group — null if it does.
function lbWhyOut(g) {
  if (lbState.onePhone && !lbOnePhone(g)) return 'needs a phone each';
  if (lbState.count != null && !lbTeams(g)) {
    if (g.minPlayers > lbState.count) return `needs ${g.minPlayers}+`;
    if (g.maxPlayers < lbState.count) return `up to ${g.maxPlayers}`;
  }
  return null;
}
// Short form for a tile: the everyone-has-a-phone range where the bounds branch
// on a setting (the part after "or" in the verified display string), else min–max.
function lbPlayersText(g) {
  const d = g.playerRangeDisplay;
  if (d) {
    const m = d.match(/or (.+?)(?: \(|$)/);
    if (m) return m[1];
    if (/teams/.test(d)) return '2 teams';
    return d.replace('exactly ', '');
  }
  return g.minPlayers === g.maxPlayers ? `${g.minPlayers}` : `${g.minPlayers}–${g.maxPlayers}`;
}
// Long form for the sheet: the verified string with the engine's mode jargon
// said in words. "TLM" = one phone per team, "MDLM" = a phone each.
function lbPlayersLong(g) {
  const d = g.playerRangeDisplay;
  if (!d) return lbPlayersText(g) + ' players';
  if (/teams/.test(d)) return d;
  return d.replace('(TLM)', '(one phone per team)').replace('(MDLM)', '(a phone each)') + ' players';
}
function lbPhoneText(g) { return lbOnePhone(g) ? 'one phone' : 'phone each'; }
function lbPhoneLong(g) {
  const m = g.supportedModes;
  if (m.includes('ptp') && m.includes('mdlm')) return 'One phone, or one each';
  if (m.includes('ptp')) return m.includes('tlm') ? 'One phone, or one per team' : 'One phone';
  return 'A phone each';
}

// ── Markup helpers ───────────────────────────────────────────────────────────
function lbEl(tag, cls, html) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
}
// The disc: emoji by default, a real controller sticker on top for the 19
// games that have one (data/stickers/, manifest-verified — Bailed is the
// one game still waiting on its own badge, see deferred-work.md). Cheap
// win per OWNER-REVIEW.md item 3: the sticker sits ON the badge disc, not
// a replacement for it — the reserved img.lb-art full-face slot is the
// separate, later "real art" upgrade DESIGN-NOTES.md § 1 describes. The
// sticker images are irregular die-cut crops (not square — checked all 19:
// heights from 350–512 px against a fixed 512 px axis), so the art sits
// inset with object-fit:contain rather than cover — the whole sticker
// shows, nothing is cropped off. The emoji starts HIDDEN whenever a
// sticker exists (inline style, not a class — see the note on why below)
// and the <img>'s onerror unhides it and drops the image, so a missing or
// corrupt file falls back to the plain emoji rather than a broken-image
// icon or the two stacked on top of each other.
// Games whose sticker art does not exist yet — they draw the emoji disc instead.
// Empty since Bailed's badge landed (bld.png, 27 Sep 2026); kept so the next game
// that ships before its art needs one line, not a new code path.
const LB_NO_STICKER = new Set();
function lbBadgeInner(g) {
  const emoji = typeof g === 'string' ? g : g.emoji;
  const id = typeof g === 'string' ? null : g.id;
  const hasArt = !!(id && !LB_NO_STICKER.has(id));
  const art = hasArt
    ? `<img class="lb-badge-art" src="data/stickers/${id}.png" alt=""
        onerror="this.remove(); this.parentElement.querySelector('.lb-badge-emoji').style.display='';">`
    : '';
  // Inline style, not a class: this markup is also reused (as a string) in
  // the Original layout's real .lobby-btn-badge, which this sandbox does
  // not own the CSS of — a class would need a rule added to the shipped
  // css/styles.css to have any effect there, and this is a trial run.
  const emojiStyle = hasArt ? ' style="display:none"' : '';
  return `${art}<span class="lb-badge-emoji"${emojiStyle}>${emoji}</span>`;
}

function lbRenderProfilePop() {
  return `
    <div class="lb-you-pop" role="dialog" aria-label="Your profile">
      <span class="lb-you-pop-arrow" aria-hidden="true"></span>
      <label class="lb-you-pop-field">
        <span class="lb-you-pop-label">Your name</span>
        <input id="lb-you-nick" class="lb-you-pop-input" type="text" maxlength="16"
          placeholder="Player" value="${lbEsc(lbGetNickname())}">
      </label>
      <p class="lb-you-pop-hint">Carries into every lobby you host or join.</p>
    </div>`;
}
// Saves on blur/change, never on every keystroke. The "You" button's own label
// is patched directly (not via lbSet) so the switch from "You" to the real name
// is visible immediately, without closing the popover or costing the input its
// focus.
function lbWireProfilePop(row) {
  const nick = row.querySelector('#lb-you-nick');
  if (!nick) return;
  const save = () => {
    lbSetNickname(nick.value.trim());
    const label = document.getElementById('lb-you-label-text');
    if (label) label.textContent = lbGetNickname() || 'You';
  };
  nick.addEventListener('change', save);
  nick.addEventListener('blur', save);
  nick.addEventListener('click', e => e.stopPropagation());
}

// The one count sentence, shared by the Board's Who's playing and TV's panel. Duplicating it is how the two layouts start disagreeing
// about how many games fit — the same reason lbSheetBodyInner exists.
function lbFitLine() {
  const fit = GAMES.filter(g => !lbWhyOut(g)).length;
  if (fit === 20) return 'All 20 games in the box.';
  const bits = [];
  if (lbState.count != null) bits.push(`${lbState.count >= 10 ? '10 or more' : lbState.count} of you`);
  if (lbState.onePhone) bits.push('one phone');
  return `${fit} of 20 fit ${bits.join(', ')}.`;
}

// ── A game's details ─────────────────────────────────────────────────────────
// Chips, How it goes, Sylly Mode — ONE function shared by the Board's card back
// (board.js) and TV's detail pane (tv.js), so the two can never drift.
function lbSheetBodyInner(g) {
  const chips = [
    { ico: '👥', text: lbPlayersLong(g) },
    { ico: '📱', text: lbPhoneLong(g) },
  ];
  if (g.minutes) chips.push({ ico: '⏱️', text: g.minutes });   // absent when unknown — never invented

  const sylly = g.syllyModeName
    ? `<div class="lb-sylly"><div class="lb-sec-label" style="color:${g.brandHex}">✨ Sylly Mode</div>
         <div class="lb-sylly-name">${g.syllyModeName}</div><div class="lb-sylly-sub">The advanced rules. Switch it on in Settings.</div></div>`
    : `<div class="lb-sylly"><div class="lb-sec-label" style="color:${g.brandHex}">✨ Sylly Mode</div>
         <div class="lb-sylly-name">Not this one</div><div class="lb-sylly-sub">Its own settings already carry the dial.</div></div>`;

  return `
      <div class="lb-chips">${chips.map(c => `<span class="lb-chip"><span class="lb-chip-ico" aria-hidden="true">${c.ico}</span>${c.text}</span>`).join('')}</div>
      <div>
        <div class="lb-sec-label" style="color:${g.brandHex}">How it goes</div>
        <div class="lb-steps">${g.howItGoes.map((s, i) =>
          `<div class="lb-step-card"><span class="lb-step-num" style="background-color:${g.brandHex}">${i + 1}</span><span>${s}</span></div>`).join('')}</div>
      </div>
      ${sylly}`;
}

// ── TV mode's size gate and hand-off card ───────────────────────────────────
// TV mode itself (the rail, the panel, the detail pane) is tv.js, which owns a
// patch-in-place renderer: the rail carries a live scrollLeft, a rAF and an
// in-flight smooth scroll that lbSet()'s rebuild-everything would destroy on
// every keycap tap. This file keeps only what decides whether TV can be up.
//
// Eligibility: width AND height, no device sniffing — a landscape phone is
// wide enough but too short, and this stays true whether the "device" is a
// laptop window, a tablet, or a browser cast to an actual TV. Every switcher
// hides TV below this floor (lobbyOffered), and lobbyGo('tv') refuses.
const LB_TV_MIN_W = 900, LB_TV_MIN_H = 500;
function lbTvEligible() { return window.innerWidth >= LB_TV_MIN_W && window.innerHeight >= LB_TV_MIN_H; }

// The one case the hand-off card still covers: a window shrunk below the floor
// while TV is up. Never a cramped copy of TV.
function lbRenderTVHandoff() {
  const card = lbEl('div', 'lb-later lb-tv-handoff');
  card.innerHTML = `
    <span class="lb-tv-handoff-ico" aria-hidden="true">🖥️</span>
    <strong>TV mode wants a wider screen</strong>
    <p>Cast the game, or open it on a tablet or laptop, and this same lobby lays out as a shelf rail with a detail pane. On a phone it stays on the Board.</p>
    <button class="lb-cta lb-cta-2 lb-tv-handoff-back" id="lb-tv-handoff-back">Back to the Board</button>`;
  card.querySelector('#lb-tv-handoff-back').addEventListener('click', () => lobbyGo('shelves'));
  return card;
}

/* TV fills #tv-app. Below its floor (a window shrunk while TV is up — every
   switcher already hides TV below it) the hand-off card stands in, and its
   button goes to the Board. */
function lbMountTVFull() {
  const root = document.getElementById('tv-app');
  if (!root) return;
  if (!lbTvEligible()) {
    tvDrop(root);
    root.innerHTML = '';
    // .lb-tv, not a bare div: the handoff card's colours (var(--lb-ink-2)
    // etc.) are declared on .lb-phone/.lb-tv, not :root — reuse the palette
    // rather than duplicating the custom-property block a third time.
    const gate = lbEl('div', 'lb-tv lb-tv-full-gate');
    gate.appendChild(lbRenderTVHandoff());
    root.appendChild(gate);
    return;
  }
  if (root.querySelector('.lb-tv-full-gate')) root.innerHTML = '';   // back above the floor: drop the card
  tvMount(root, 'lb-tv-full');
}

// ── State ────────────────────────────────────────────────────────────────────
// Neither layout rebuilds on a change: the Board (bdPaint) and TV (tvApply, via
// lbMountTVFull's idempotent mount) both patch in place, so a stepper tap never
// costs the rail its scroll or a sticker its flight. lobbyAfterLayoutRender()
// keeps the ornament in whichever layout is up.
function lbAfterRender() {
  if (typeof lobbyIsUp === 'function' && lobbyIsUp('tv')) lbMountTVFull();
  if (typeof lobbyAfterLayoutRender === 'function') lobbyAfterLayoutRender();
}
function lbSet(patch) {
  // Any action that isn't the popover toggle itself dismisses it — the
  // stand-in for "click outside to close".
  if (!('profileOpen' in patch) && lbState.profileOpen) patch.profileOpen = false;
  Object.assign(lbState, patch);
  if (typeof bdPaint === 'function') bdPaint();
  lbAfterRender();
}
