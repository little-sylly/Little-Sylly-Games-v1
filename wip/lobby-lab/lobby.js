// ═══════════════════════════════════════════════════════════════════════════
// lobby.js — the Shelves lobby renderer. Sandbox only (wip/lobby-lab/).
// Vanilla, global symbols, no build, no fetch. Reads window.GAMES / SHELVES.
// State is a single object; every render is a pure function of it.
//
// Sandbox-only affordances: the URL hash seeds state for screenshots —
//   #folder=talk   #sheet=cld   #unlock   #count=4   #onephone   #view=original
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

const LB_VIEWS = [
  { id: 'premium',  label: 'Premium',  ico: '✨' },
  { id: 'shelves',  label: 'Shelves',  ico: '🗂️' },
  { id: 'tv',       label: 'TV',       ico: '🖥️' },
  { id: 'original', label: 'Original', ico: '▤' },
];

const lbState = {
  view: 'shelves',
  folder: null,        // shelf id or null
  sheet: null,         // game id or null
  count: null,         // null = any, else 2..10
  onePhone: false,
  unlocked: false,     // Konami — reveals Skins / Word Packs / Arcade
  profileOpen: false,  // the "You" popover under the controller — see § Profile popover
};

// ── Profile popover — nickname + placeholder stats ──────────────────────────
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
// Placeholder only — profile.js (DESIGN-NOTES.md § 3) is what computes these
// for real, from profileAppendMatch() records. Shown "for show" per the owner.
const LB_STAT_PLACEHOLDER = { matches: 14, triedOf20: 7, favourite: 'Bluff 🎭' };
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
const LB_NO_STICKER = new Set(['bld']);
function lbBadgeInner(g) {
  const emoji = typeof g === 'string' ? g : g.emoji;
  const id = typeof g === 'string' ? null : g.id;
  const hasArt = !!(id && !LB_NO_STICKER.has(id));
  const art = hasArt
    ? `<img class="lb-badge-art" src="../../data/stickers/${id}.png" alt=""
        onerror="this.remove(); this.parentElement.querySelector('.lb-badge-emoji').style.display='';">`
    : '';
  // Inline style, not a class: this markup is also reused (as a string) in
  // the Original layout's real .lobby-btn-badge, which this sandbox does
  // not own the CSS of — a class would need a rule added to the shipped
  // css/styles.css to have any effect there, and this is a trial run.
  const emojiStyle = hasArt ? ' style="display:none"' : '';
  return `${art}<span class="lb-badge-emoji"${emojiStyle}>${emoji}</span>`;
}
function lbBadge(g) { return `<span class="lb-badge" aria-hidden="true">${lbBadgeInner(g)}</span>`; }

// The player's controller — an inline SVG stand-in for the live Three.js
// mount (#lobby-controller). Drawn in the design's saved shell colour.
function lbControllerSVG(shell = '#6D3FC8') {
  return `<svg viewBox="0 0 120 80" role="img" aria-label="Your controller">
    <defs><linearGradient id="lbc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs>
    <path d="M28 12h64c14 0 22 10 24 24l3 22c1 9-5 16-14 16-8 0-12-5-16-11l-4-6H35l-4 6c-4 6-8 11-16 11-9 0-15-7-14-16l3-22C6 22 14 12 28 12z" fill="${shell}"/>
    <path d="M28 12h64c14 0 22 10 24 24l3 22c1 9-5 16-14 16-8 0-12-5-16-11l-4-6H35l-4 6c-4 6-8 11-16 11-9 0-15-7-14-16l3-22C6 22 14 12 28 12z" fill="url(#lbc)"/>
    <circle cx="38" cy="8" r="7" fill="${shell}"/><circle cx="82" cy="8" r="7" fill="${shell}"/>
    <rect x="30" y="28" width="7" height="21" rx="2" fill="#fff" opacity=".92"/>
    <rect x="23" y="35" width="21" height="7" rx="2" fill="#fff" opacity=".92"/>
    <circle cx="86" cy="31" r="4.5" fill="#FFD23F"/><circle cx="96" cy="38" r="4.5" fill="#E9408E"/>
    <circle cx="76" cy="38" r="4.5" fill="#2EC4B6"/><circle cx="86" cy="45" r="4.5" fill="#B48CF2"/>
    <circle cx="60" cy="52" r="5" fill="#fff" opacity=".9"/>
    <circle cx="52" cy="22" r="3" fill="#FFD23F"/><circle cx="66" cy="20" r="2.4" fill="#2EC4B6"/>
  </svg>`;
}

// ── Root render ──────────────────────────────────────────────────────────────
function lbRender() {
  const root = document.getElementById('shelves-canvas');
  if (!root) return;
  root.innerHTML = '';
  const phone = lbEl('div', 'lb-phone');
  phone.classList.toggle('sheet-open', !!lbState.sheet);

  const scroll = lbEl('div', 'lb-scroll');
  scroll.appendChild(lbRenderBrand());
  scroll.appendChild(lbRenderDock());
  scroll.appendChild(lbRenderBody());
  phone.appendChild(scroll);

  const scrim = lbEl('div', 'lb-scrim');
  scrim.addEventListener('click', () => lbSet({ sheet: null }));
  phone.appendChild(scrim);
  phone.appendChild(lbRenderSheet());

  root.appendChild(phone);
}

// The controller opens the Workshop (unchanged). "You" is now its own button
// under it that opens a small profile popover — nickname + placeholder stats
// — rather than the controller itself doubling as that door.
// OWNER-REVIEW.md item 5 follow-up, 15 Sep 2026.
function lbRenderBrand() {
  const row = lbEl('div', 'lb-brand');
  row.innerHTML = `
    <a class="lb-logo" href="#" aria-label="Little Sylly Games"><img src="../../assets/logo.png" alt="Little Sylly Games"></a>
    <div class="lb-you-wrap">
      <button class="lb-you-controller lb-press" id="lb-you-controller" aria-label="You — open the Workshop">
        <span class="lb-you-mount" id="lobby-controller">${lbControllerSVG()}</span>
      </button>
      <button class="lb-you-label lb-press" id="lb-you-label" aria-haspopup="dialog" aria-expanded="${lbState.profileOpen}">
        <span id="lb-you-label-text">${lbEsc(lbGetNickname()) || 'You'}</span><span class="lb-you-chev" aria-hidden="true">${lbState.profileOpen ? '▴' : '▾'}</span>
      </button>
      ${lbState.profileOpen ? lbRenderProfilePop() : ''}
    </div>`;
  row.querySelector('.lb-logo').addEventListener('click', e => e.preventDefault());
  row.querySelector('#lb-you-controller').addEventListener('click', () => console.log('→ Workshop (ctlOpenWorkshop)'));
  row.querySelector('#lb-you-label').addEventListener('click', () => lbSet({ profileOpen: !lbState.profileOpen }));
  if (lbState.profileOpen) lbWireProfilePop(row);
  return row;
}

function lbRenderProfilePop() {
  const s = LB_STAT_PLACEHOLDER;
  return `
    <div class="lb-you-pop" role="dialog" aria-label="Your profile">
      <span class="lb-you-pop-arrow" aria-hidden="true"></span>
      <label class="lb-you-pop-field">
        <span class="lb-you-pop-label">Your name</span>
        <input id="lb-you-nick" class="lb-you-pop-input" type="text" maxlength="16"
          placeholder="Player" value="${lbEsc(lbGetNickname())}">
      </label>
      <p class="lb-you-pop-hint">Carries into every lobby you host or join.</p>
      <div class="lb-you-pop-stats">
        <div class="lb-you-pop-stat"><span class="lb-you-pop-stat-n">${s.matches}</span><span class="lb-you-pop-stat-l">Matches</span></div>
        <div class="lb-you-pop-stat"><span class="lb-you-pop-stat-n">${s.triedOf20}/20</span><span class="lb-you-pop-stat-l">Games tried</span></div>
        <div class="lb-you-pop-stat"><span class="lb-you-pop-stat-n">${s.favourite}</span><span class="lb-you-pop-stat-l">Favourite</span></div>
      </div>
      <p class="lb-you-pop-note">Placeholder stats — real ones land with profile.js.</p>
    </div>`;
}
// Saves on blur/change, never on every keystroke — an input re-render mid-type
// (lbRender() replaces the whole subtree via innerHTML) would drop focus and
// cursor position on the next keystroke. The "You" button's own label is
// patched directly (not via lbSet/lbRender) so the switch from "You" to the
// real name is visible immediately, without closing the popover or costing
// the input its focus.
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

function lbRenderDock() {
  const dock = lbEl('div', 'lb-dock');
  const icons = lbEl('div', 'lb-icons');
  const list = [
    { id: 'achievements', ico: '🏆', label: 'Achievements' },
    { id: 'sound',        ico: '🔊', label: 'Sound', cls: 'lb-icon-sound' },
    { id: 'skins',        ico: '🎨', label: 'Skins', secret: true },
    { id: 'packs',        ico: '📦', label: 'Word Packs', secret: true },
    { id: 'arcade',       ico: '🕹️', label: 'Arcade', secret: true },
  ];
  for (const it of list) {
    if (it.secret && !lbState.unlocked) continue;     // absent, not dimmed
    const b = lbEl('button', 'lb-icon lb-press ' + (it.cls || ''), it.ico);
    b.setAttribute('aria-label', it.label);
    b.title = it.label;
    icons.appendChild(b);
  }
  dock.appendChild(icons);

  const sw = lbEl('div', 'lb-switch');
  sw.setAttribute('role', 'tablist');
  sw.setAttribute('aria-label', 'Lobby layout');
  for (const v of LB_VIEWS) {
    const b = lbEl('button', 'lb-seg', `<span class="lb-seg-ico" aria-hidden="true">${v.ico}</span><span class="lb-seg-lbl">${v.label}</span>`);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(lbState.view === v.id));
    b.setAttribute('aria-label', v.label);
    b.addEventListener('click', () => lbSet({ view: v.id, folder: null, sheet: null }));
    sw.appendChild(b);
  }
  dock.appendChild(sw);
  return dock;
}

function lbRenderBody() {
  const body = lbEl('div', 'lb-body');
  body.dataset.view = lbState.view;
  if (lbState.view === 'shelves') {
    if (lbState.folder) { body.appendChild(lbRenderFolder()); }
    else {
      body.appendChild(lbEl('p', 'lb-tagline', 'What are we playing today?'));
      body.appendChild(lbRenderWho());
      body.appendChild(lbRenderShelves());
    }
  } else if (lbState.view === 'original') {
    body.appendChild(lbRenderOriginal());
  } else if (lbState.view === 'tv') {
    body.appendChild(lbRenderTVHandoff());
  } else {
    const v = LB_VIEWS.find(x => x.id === lbState.view);
    body.appendChild(lbEl('div', 'lb-later', `<strong>${v.ico} ${v.label}</strong>Not this round — the shell is ready for it.`));
  }
  body.style.display = 'flex'; body.style.flexDirection = 'column'; body.style.gap = '14px';
  return body;
}

// The one count sentence, shared by the phone's Who's here and the Lounge's
// panel (lounge.js). Duplicating it is how the two layouts start disagreeing
// about how many games fit — the same reason lbSheetBodyInner exists.
function lbFitLine() {
  const fit = GAMES.filter(g => !lbWhyOut(g)).length;
  if (fit === 20) return 'All 20 games in the box.';
  const bits = [];
  if (lbState.count != null) bits.push(`${lbState.count >= 10 ? '10 or more' : lbState.count} of you`);
  if (lbState.onePhone) bits.push('one phone');
  return `${fit} of 20 fit ${bits.join(', ')}.`;
}

// ── Who's here? ──────────────────────────────────────────────────────────────
function lbRenderWho() {
  const wrap = lbEl('div');
  wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '8px';
  const row = lbEl('div', 'lb-who');
  const c = lbState.count;
  row.innerHTML = `
    <div class="lb-step" role="group" aria-label="How many of us">
      <button class="lb-step-btn" id="lb-minus" aria-label="Fewer" ${c == null ? 'disabled' : ''}>−</button>
      <span class="lb-step-val"><span aria-hidden="true">👥</span><span>${c == null ? 'Any' : c === 10 ? '10+' : c}</span></span>
      <button class="lb-step-btn" id="lb-plus" aria-label="More" ${c === 10 ? 'disabled' : ''}>+</button>
    </div>
    <button class="lb-toggle" id="lb-onephone" aria-pressed="${lbState.onePhone}"><span aria-hidden="true">📱</span>One phone only</button>`;
  row.querySelector('#lb-minus').addEventListener('click', () => lbSet({ count: c <= 2 ? null : c - 1 }));
  row.querySelector('#lb-plus').addEventListener('click', () => lbSet({ count: c == null ? 2 : Math.min(10, c + 1) }));
  row.querySelector('#lb-onephone').addEventListener('click', () => lbSet({ onePhone: !lbState.onePhone }));
  wrap.appendChild(row);

  wrap.appendChild(lbEl('p', 'lb-who-note', lbFitLine()));
  return wrap;
}

// ── Shelf rows ───────────────────────────────────────────────────────────────
function lbRenderShelves() {
  const list = lbEl('div', 'lb-shelves');
  for (const s of LB_SHELVES) {
    const games = lbShelfGames(s.id);
    const fit = games.filter(g => !lbWhyOut(g)).length;
    const row = lbEl('button', 'lb-row');
    row.classList.toggle('is-empty', fit === 0);
    row.setAttribute('aria-label', `${s.label} — ${games.length} games`);
    const count = fit === games.length ? `${games.length} games` : `${fit} of ${games.length} fit`;
    row.innerHTML = `
      <span class="lb-row-head">
        <span class="lb-row-name"><span class="lb-row-emoji" aria-hidden="true">${s.emoji}</span>${s.label}</span>
        <span class="lb-row-count">${count}</span>
      </span>
      <span class="lb-row-stack" aria-hidden="true" data-n="${games.length}">${lbSortByFit(games).map(g =>
        `<span class="lb-mini ${lbWhyOut(g) ? 'is-out' : ''}" style="background-color:${g.brandHex}">${lbBadge(g)}</span>`).join('')}</span>
      <span class="lb-row-chev" aria-hidden="true">›</span>`;
    row.addEventListener('click', () => lbSet({ folder: s.id }));
    list.appendChild(row);
  }
  return list;
}

// ── Folder ───────────────────────────────────────────────────────────────────
function lbRenderFolder() {
  const s = LB_SHELVES.find(x => x.id === lbState.folder);
  const wrap = lbEl('div');
  wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '14px';
  const head = lbEl('div', 'lb-folder-head');
  head.innerHTML = `
    <button class="lb-back lb-press" aria-label="Back to the shelves">‹</button>
    <div class="lb-folder-title">
      <div class="lb-folder-name"><span class="lb-row-emoji" aria-hidden="true">${s.emoji}</span>${s.label}</div>
      <div class="lb-folder-blurb">${s.blurb}</div>
    </div>`;
  head.querySelector('.lb-back').addEventListener('click', () => lbSet({ folder: null }));
  wrap.appendChild(head);
  wrap.appendChild(lbRenderWho());

  const grid = lbEl('div', 'lb-grid is-fresh');
  for (const g of lbSortByFit(lbShelfGames(s.id))) {
    const why = lbWhyOut(g);
    const t = lbEl('button', 'lb-tile');
    t.classList.toggle('is-out', !!why);
    t.setAttribute('aria-label', `${g.gameName}, ${lbPlayersText(g)} players, ${lbPhoneText(g)}`);
    t.innerHTML = `
      <span class="lb-face gel-btn" style="background-color:${g.brandHex}">${lbBadge(g)}</span>
      <span class="lb-tile-name">${g.gameName}</span>
      <span class="lb-tile-meta ${why ? 'is-why' : ''}">${why ? why : `${lbPlayersText(g)} · ${lbPhoneText(g)}`}</span>`;
    t.addEventListener('click', () => lbSet({ sheet: g.id }));
    grid.appendChild(t);
  }
  wrap.appendChild(grid);
  return wrap;
}

// ── Info sheet ───────────────────────────────────────────────────────────────
// The sheet's body — chips, How it goes, Sylly Mode — is ONE function shared
// by the phone's drawer and TV mode's detail pane (lbRenderTV), so the two
// can never drift; same reason lbBadgeInner exists.
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

function lbRenderSheet() {
  const sheet = lbEl('div', 'lb-sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  const g = lbState.sheet ? lbGame(lbState.sheet) : null;
  if (!g) return sheet;

  sheet.innerHTML = `
    <div class="lb-sheet-grab" aria-hidden="true"></div>
    <div class="lb-sheet-head">
      <span class="lb-sheet-face gel-btn" style="background-color:${g.brandHex}">${lbBadge(g)}</span>
      <div class="lb-sheet-title">
        <div class="lb-sheet-name">${g.gameName}</div>
        <div class="lb-sheet-pitch">${g.pitch}</div>
      </div>
      <button class="lb-sheet-close lb-press" id="lb-sheet-close" aria-label="Close">✕</button>
    </div>
    <div class="lb-sheet-body">${lbSheetBodyInner(g)}</div>
    <div class="lb-sheet-foot">
      <button class="lb-cta" id="lb-play" style="background-color:${g.brandHex}">Play</button>
      <button class="lb-cta lb-cta-2" id="lb-sheet-back">Back to the Box</button>
    </div>`;
  sheet.querySelector('#lb-sheet-close').addEventListener('click', () => lbSet({ sheet: null }));
  sheet.querySelector('#lb-sheet-back').addEventListener('click', () => lbSet({ sheet: null }));
  /* A Play press is a play (stickerbook prototype, 23 Sep 2026): one event, and the
     shell decides what it earns. A page with no listener loses nothing. */
  sheet.querySelector('#lb-play').addEventListener('click', () => { console.log(`→ screen-${g.id}-menu (the game's existing menu)`); window.dispatchEvent(new CustomEvent('sylly:play', { detail: { gameId: g.id } })); });
  return sheet;
}

// ── Original view, inside the new shell ──────────────────────────────────────
// Trial run of the sticker-badge treatment (OWNER-REVIEW.md item 1 follow-up,
// 15 Sep 2026) on the REAL .lobby-btn-badge — the exact class the live lobby
// ships — so it's a fair look at whether to adopt it project-wide. lobby.css
// only adds overflow:hidden scoped under .lb-original; nothing here touches
// the shipped css/styles.css.
function lbRenderOriginal() {
  const list = lbEl('div', 'lb-original');
  for (const g of GAMES) {
    const btn = document.createElement('button');
    btn.className = 'gel-btn lobby-btn min-h-14 w-full rounded-2xl text-white text-xl font-semibold';
    btn.style.backgroundColor = g.brandHex;
    btn.innerHTML = `<span class="lobby-btn-label">${g.gameName}</span><span class="lobby-btn-badge" aria-hidden="true">${lbBadgeInner(g)}</span>`;
    list.appendChild(btn);
  }
  return list;
}

// ── TV mode — the wide layout ────────────────────────────────────────────────
// Not a different product: the SAME lobby (same shelves, same tiles, same info
// sheet, same Who's here) laid out for any screen wide enough to hold it at
// once — a laptop browser, a tablet, a cast to the telly. Rail · field · pane,
// per the owner's mockup (wip/Game box UI mockups.zip → 2b-tv-widescreen).
// Phones never get it: the shell's TV slot renders lbRenderTVHandoff() instead,
// and so does a wide-enough window that shrinks below the eligibility floor —
// see lbTvEligible()/lbMountTVFull() near the bottom of this file.
//
// Every piece is the phone's own component reused verbatim (.lb-row, .lb-mini,
// .lb-grid/.lb-tile, the sheet body via lbSheetBodyInner, the dock with its
// switcher, lbRenderWho) — the wide layout only changes where they sit.
//
// The pane's one CTA is Play, exactly as any device's Play is — it opens the
// game's own menu. Whether THIS device also takes a seat, or hosts the room
// as a SEATLESS HOST — the technical term; the friendly one is BIG SCREEN,
// as in "I'll play too" vs "Big Screen only" — is a choice made at lobby
// creation, not on this pane (owner, 16 Sep 2026: don't split host-spectate
// off as a separate join-as-spectator mode; keep it a pill on the Host card).
// That pill isn't built here — screen-mp-mode has no widescreen layout of
// its own yet — so the Big Screen display, lbRenderTVHost(), is reached in
// this sandbox only via the #tv=host hash, for design review. It fills the
// frame with room code, seats and status, and takes no seat of its own.
//
// Hash (Pane 3):  #folder=<shelf>  sel=<gameId>  #tv=host  roster=empty|room|ready|full|table
// Hash (shell):   #view=tv  → the hand-off card
// Full window:    tv.html  → the real, unframed mount — see lbMountTVFull()

// The rail's own selection and the field's selection are separate (as in the
// mockup): tvFolder picks the shelf, tvSel picks the game shown in the pane.
Object.assign(lbState, {
  tvFolder: 'talk',
  tvSel: 'ss',
  tvHost: false,       // true = the Big Screen / seatless-host display (lbRenderTVHost) fills the frame
  tvCode: 'K7PQ',
  tvJoined: 2,         // how many of LB_TV_NAMES have joined
  tvPhase: 'lobby',    // 'lobby' | 'table' — 'table' shows the in-game seam
  tvTurn: null,        // seat index whose turn it is (table phase only)
});

const LB_TV_NAMES = ['Ruby', 'Theo', 'Priya', 'Max', 'Ines', 'Jo', 'Arlo', 'Max', 'Wren', 'Sam'];

function lbTvGame() { return lbGame(lbState.tvSel) || GAMES[0]; }

// Host-spectate roster presets — #roster=…
function lbTvSeed(preset) {
  const g = lbTvGame();
  const map = {
    empty: { tvJoined: 0 },
    room:  { tvJoined: Math.max(0, g.minPlayers - 1) },
    ready: { tvJoined: Math.min(g.maxPlayers, g.minPlayers + 1) },
    full:  { tvJoined: g.maxPlayers },
    table: { tvJoined: Math.min(g.maxPlayers, g.minPlayers + 1), tvPhase: 'table', tvTurn: 1 },
  };
  Object.assign(lbState, map[preset] || map.room);
}
// The roster in the engine's slot shape ({ uid, nickname }). In host-spectate
// the screen takes NO seat, so every slot here is a phone.
function lbTvPlayers() {
  const g = lbTvGame();
  const n = Math.max(0, Math.min(lbState.tvJoined, g.maxPlayers));
  return LB_TV_NAMES.slice(0, n).map((nickname, i) => ({ uid: 'u' + i, nickname }));
}
// The status line, word for word from mpRenderHostPlayerList() where the
// engine has one; the last two are new copy for states the phone leaves silent.
function lbTvStatus(g, players) {
  const n = players.length, minP = g.minPlayers, maxP = g.maxPlayers;
  if (n === 0) return { text: 'Waiting for players to join…', ready: false };
  if (n < minP) {
    const need = minP - n;
    return { text: `Need ${need} more ${need === 1 ? 'player' : 'players'} to start (min ${minP})`, ready: false };
  }
  if (n >= maxP) return { text: `Room's full — everyone's in`, ready: true };
  return { text: 'Ready when you are', ready: true };
}

// ── The wide lobby ───────────────────────────────────────────────────────────
// The browse layout is artboard 2a "The Lounge" and lives in lounge.js, which
// owns its own patch-in-place renderer: the rail carries a live scrollLeft, a
// rAF and an in-flight smooth scroll that this file's rebuild-everything
// lbSet() would destroy on every keycap tap. So the Lounge is not rendered
// through here at all — lbMountTV()/lbMountTVFull() below call lgMount(),
// which builds once and patches after. This function is now only the fork
// to the Big Screen host display, which has no such state and is unchanged.
function lbRenderTV() { return lbRenderTVHost(); }

// ── The phone's TV slot: a hand-off, never a cramped copy ───────────────────
function lbRenderTVHandoff() {
  const card = lbEl('div', 'lb-later lb-tv-handoff');
  card.innerHTML = `
    <span class="lb-tv-handoff-ico" aria-hidden="true">🖥️</span>
    <strong>TV mode wants a wider screen</strong>
    <p>Cast the game, or open it on a tablet or laptop, and this same lobby lays out as a shelf rail with a detail pane. On a phone it stays on the Shelves.</p>
    <button class="lb-cta lb-cta-2 lb-tv-handoff-back" id="lb-tv-handoff-back">Back to the Shelves</button>`;
  card.querySelector('#lb-tv-handoff-back').addEventListener('click', () => lbSet({ view: 'shelves' }));
  return card;
}

// ── Big Screen — the seatless-host display ───────────────────────────────────
// This screen runs the room and takes no seat: room code, who's here, the
// engine's status strings and its real CTA, read from ~3 m. In play, the
// header and seats stay and only the stage swaps — #tv=host&roster=table
// shows that as an honest, labelled seam, not a mock of data no game has yet.
function lbRenderTVHost() {
  const g = lbTvGame();
  const players = lbTvPlayers();
  const status = lbTvStatus(g, players);
  const inPlay = lbState.tvPhase === 'table';
  const nameCounts = {};
  players.forEach(p => { nameCounts[p.nickname] = (nameCounts[p.nickname] || 0) + 1; });

  const root = lbEl('div', 'lb-tv');
  root.dataset.phase = lbState.tvPhase;

  const meta = [`👥 ${lbPlayersText(g)}`, `📱 ${lbPhoneText(g)}`];
  if (g.minutes) meta.push(`⏱️ ${g.minutes}`);
  const head = `
    <div class="lb-tv-head">
      <a class="lb-tv-logo" href="#" aria-label="Little Sylly Games"><img src="../../assets/logo.png" alt="Little Sylly Games"></a>
      <div class="lb-tv-game">
        <span class="lb-tv-face gel-btn" style="background-color:${g.brandHex}">${lbBadge(g)}</span>
        <div class="lb-tv-game-text">
          <div class="lb-tv-label">${inPlay ? 'Now playing' : 'Tonight'}</div>
          <div class="lb-tv-game-name">${g.gameName}</div>
          <div class="lb-tv-game-meta">${meta.join('<span class="lb-tv-sep" aria-hidden="true">·</span>')}</div>
        </div>
      </div>
      <div class="lb-tv-tools">
        <span class="lb-tv-live"><span class="lb-tv-dot" aria-hidden="true"></span>Big Screen</span>
        <button class="lb-tv-icon lb-press" aria-label="Music">🔊</button>
      </div>
    </div>`;

  const stage = inPlay ? `
    <div class="lb-tv-stage">
      <div class="lb-tv-seam" role="note" aria-label="In-game host view — placeholder">
        <div class="lb-tv-seam-cell"><strong>Whose turn</strong><span>Lights the seat below — see ${lbEsc(players[1]?.nickname || 'a seat')}.</span></div>
        <div class="lb-tv-seam-cell lb-tv-seam-main"><strong>The table</strong><span>Shared board, prompt, or reveal — whatever the game shows everyone at once. Nothing private ever lands here.</span></div>
        <div class="lb-tv-seam-cell"><strong>Log</strong><span>What just happened, newest first.</span></div>
        <div class="lb-tv-seam-note">Seam, not a mock — no game has Big Screen host-only screens yet. The header and seats stay; only this zone swaps.</div>
      </div>
    </div>` : `
    <div class="lb-tv-stage">
      <div class="lb-tv-code-card">
        <div class="lb-tv-label">Room code</div>
        <div class="lb-tv-code" aria-label="Room code ${lbState.tvCode.split('').join(' ')}" style="--key-brand:${g.brandHex}">
          ${lbState.tvCode.split('').map(ch => `<span class="lb-tv-key gel-btn">${ch}</span>`).join('')}
        </div>
      </div>
      <div class="lb-tv-join">
        <div class="lb-tv-label">Join in</div>
        <div class="lb-tv-step"><span class="lb-tv-step-num" style="background-color:${g.brandHex}">1</span><span>Open <b>Little Sylly Games</b> on your phone</span></div>
        <div class="lb-tv-step"><span class="lb-tv-step-num" style="background-color:${g.brandHex}">2</span><span>Pick <b>${g.gameName}</b>, then <b>Join Lobby</b></span></div>
        <div class="lb-tv-step"><span class="lb-tv-step-num" style="background-color:${g.brandHex}">3</span><span>Type the code and your name</span></div>
      </div>
    </div>`;

  // Seats: one slot per seat up to the game's max. No HOST tag — in
  // host-spectate the host is this screen, and it isn't a seat.
  const seats = [];
  for (let i = 0; i < g.maxPlayers; i++) {
    const p = players[i];
    if (!p) { seats.push(`<div class="lb-tv-seat is-open" aria-label="Open seat"><span class="lb-badge lb-tv-seat-disc"></span><span class="lb-tv-seat-name">Open</span></div>`); continue; }
    const turn = inPlay && lbState.tvTurn === i;
    const dupe = nameCounts[p.nickname] > 1;
    seats.push(`
      <div class="lb-tv-seat ${turn ? 'is-turn' : ''}" style="--seat-brand:${g.brandHex}">
        ${turn ? '<span class="lb-tv-seat-tag is-turn">Their turn</span>' : ''}
        <span class="lb-badge lb-tv-seat-disc" aria-hidden="true">${lbEsc(p.nickname[0].toUpperCase())}</span>
        <span class="lb-tv-seat-name">${lbEsc(p.nickname)}</span>
        ${dupe ? '<span class="lb-tv-seat-warn">⚠️ same name</span>' : ''}
      </div>`);
  }
  const seatBlock = `
    <div class="lb-tv-seats">
      <div class="lb-tv-seats-head">
        <span class="lb-tv-label">Who's here</span>
        <span class="lb-tv-seats-count">${players.length} of ${g.maxPlayers}</span>
      </div>
      <div class="lb-tv-seat-row">${seats.join('')}</div>
    </div>`;

  const bar = inPlay ? `
    <div class="lb-tv-bar">
      <div class="lb-tv-status"><span class="lb-tv-dot" aria-hidden="true"></span>In play — the phones have the controls</div>
      <div class="lb-tv-actions"><button class="lb-tv-cta lb-tv-cta-2" id="lb-tv-end">End session</button></div>
    </div>` : `
    <div class="lb-tv-bar">
      <div class="lb-tv-status"><span class="lb-tv-dot ${status.ready ? 'is-ready' : ''}" aria-hidden="true"></span>${status.text}</div>
      <div class="lb-tv-actions">
        <button class="lb-tv-cta lb-tv-cta-2" id="lb-tv-cancel">Cancel</button>
        <button class="lb-tv-cta" id="lb-tv-go" style="background-color:${g.brandHex}" ${status.ready ? '' : 'disabled'}>Let's Go! →</button>
      </div>
    </div>`;

  root.innerHTML = `<div class="lb-tv-in">${head}${stage}${seatBlock}${bar}</div>`;
  root.querySelector('.lb-tv-logo').addEventListener('click', e => e.preventDefault());
  const go = root.querySelector('#lb-tv-go'); if (go) go.addEventListener('click', () => console.log('→ mpConfirmRoster() (host CTA, same as btn-mp-lobby-host-cta)'));
  const cancel = root.querySelector('#lb-tv-cancel'); if (cancel) cancel.addEventListener('click', () => lbSet({ tvHost: false }));
  const end = root.querySelector('#lb-tv-end'); if (end) end.addEventListener('click', () => lbSet({ tvHost: false, tvPhase: 'lobby', tvTurn: null }));
  return root;
}

// Pane 3 — the wide canvas, a 16:9 frame (a cast screen doesn't scroll; the
// panel and pane scroll inside it). Idempotent for the Lounge: lgMount()
// builds once and patches after, so lbSet() no longer resets the rail.
function lbMountTV() {
  const root = document.getElementById('wide-canvas');
  if (!root) return;
  if (lbState.tvHost) {
    lgDrop(root);
    root.innerHTML = '';
    const host = lbEl('div', 'lb-tv-host');
    host.appendChild(lbRenderTVHost());
    root.appendChild(host);
    return;
  }
  lgMount(root, 'lb-tv-host');
}

// ── The real, unframed mount — tv.html ───────────────────────────────────────
// Pane 3 fixes a 900×506 frame so three panes fit side by side; that frame is
// NOT the real result and reads as "squished" at a glance (OWNER-REVIEW.md
// T9/T10). tv.html mounts into #tv-app instead — no lab chrome, no fixed
// aspect-ratio, just the wide lobby filling whatever window or screen it's
// given, so the eligibility floor and the big-screen zoom steps can be judged
// directly. lbBoot() below wires this up; tv.html itself is two script tags.
//
// Eligibility (T9): width AND height, no device sniffing — a landscape phone
// is wide enough but too short, and this stays true whether the "device" is
// a laptop window, a tablet, or a browser cast to an actual TV.
const LB_TV_MIN_W = 900, LB_TV_MIN_H = 500;
function lbTvEligible() { return window.innerWidth >= LB_TV_MIN_W && window.innerHeight >= LB_TV_MIN_H; }

function lbMountTVFull() {
  const root = document.getElementById('tv-app');
  if (!root) return;
  if (!lbTvEligible() || lbState.tvHost) {
    lgDrop(root);
    root.innerHTML = '';
    if (lbState.tvHost) {
      const host = lbEl('div', 'lb-tv-full');
      host.appendChild(lbRenderTVHost());
      root.appendChild(host);
      return;
    }
    // .lb-tv, not a bare div: the handoff card's colours (var(--lb-ink-2)
    // etc.) are declared on .lb-phone/.lb-tv, not :root — reuse the palette
    // rather than duplicating the custom-property block a third time.
    const gate = lbEl('div', 'lb-tv lb-tv-full-gate');
    gate.appendChild(lbRenderTVHandoff());
    root.appendChild(gate);
    return;
  }
  lgMount(root, 'lb-tv-full');
}

// ── State ────────────────────────────────────────────────────────────────────
// The sheet closes by class removal so its exit transition plays; everything
// else is a plain re-render (instant swap + the body's 180 ms rise).
function lbSet(patch) {
  const closingSheet = 'sheet' in patch && patch.sheet == null && lbState.sheet;
  // Any action that isn't the popover toggle itself dismisses it — the
  // sandbox's stand-in for "click outside to close" (folder/shelf taps,
  // switching views, opening a game sheet all count).
  if (!('profileOpen' in patch) && lbState.profileOpen) patch.profileOpen = false;
  Object.assign(lbState, patch);
  if (closingSheet && Object.keys(patch).length === 1) {
    document.querySelector('.lb-phone').classList.remove('sheet-open');
    setTimeout(lbRender, 220);
    return;
  }
  lbRender();
  lbMountTV();
  lbMountTVFull();
  if (patch.folder !== undefined || patch.view) {
    const sc = document.querySelector('.lb-scroll'); if (sc) sc.scrollTop = 0;
  }
}

//   #folder=talk sel=cld   #tv=host roster=empty|room|ready|full|table   (TV mode, Pane 3)
// ── Sandbox: seed state from the URL hash, then render ───────────────────────
(function lbBoot() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (h.has('view')) lbState.view = h.get('view');
  if (h.has('folder')) lbState.folder = h.get('folder');
  if (h.has('sheet')) { lbState.sheet = h.get('sheet'); lbState.folder = lbState.folder || (lbGame(h.get('sheet')).shelves[0] || 'board'); }
  if (h.has('unlock')) lbState.unlocked = true;
  if (h.has('count')) lbState.count = +h.get('count');
  if (h.has('onephone')) lbState.onePhone = true;
  if (h.has('folder') && LB_SHELVES.some(x => x.id === h.get('folder'))) lbState.tvFolder = h.get('folder');
  if (h.has('sel') && lbGame(h.get('sel'))) lbState.tvSel = h.get('sel');
  // The Lounge (lounge.js) reads the same two keys, plus #plaincta.
  if (h.has('folder') && LB_SHELVES.some(x => x.id === h.get('folder'))) LOUNGE.shelf = h.get('folder');
  if (h.has('sel') && lbGame(h.get('sel'))) LOUNGE.sel = h.get('sel');
  if (h.has('plaincta')) LOUNGE.plainCta = true;
  if (h.get('tv') === 'host') { lbState.tvHost = true; lbTvSeed(h.get('roster') || 'room'); }
  lbRender();
  lbMountTV();
  lbMountTVFull();
  window.addEventListener('resize', lbMountTVFull);
  window.lbSet = lbSet; window.lbState = lbState;
})();
