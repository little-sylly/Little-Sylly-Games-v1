// ═══════════════════════════════════════════════════════════════════════════
// achievements.js — the stickerbook's rules. PROTOTYPE, sandbox only.
// Spec: docs/superpowers/specs/2026-09-23-stickerbook-achievements-design.md
//
// Pure and total: no DOM, no storage, no timers, no Date.now, no Math.random —
// the shell-router.js contract, so verify-achievements.js drives every rule
// under Node. The page owns storage and every effect; this file owns only
// what is true.
//
// One sticker per game (the production sticker manifest), each with three
// "play this game N times" tiers. The FIRST tier earns the sticker; all three
// is the mockup's "100% Complete" trophy. Earned-ness is DERIVED from the
// play count, never stored, so it cannot disagree with it.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  const ACH_TIERS = [1, 5, 10];
  const ACH_PER_PAGE = 4;                       // the mockup's 2×2 sleeves
  const ACH_EMPTY = Object.freeze({ v: 1, plays: Object.freeze({}), placed: Object.freeze({}) });

  /* The book: one entry per manifest sticker, its sleeve fixed by manifest
     order. A malformed or duplicate row is dropped rather than trusted. */
  function achDefine(stickers, tiers) {
    const t = Array.isArray(tiers) && tiers.length ? tiers.slice() : ACH_TIERS.slice();
    const entries = [], byId = {};
    (Array.isArray(stickers) ? stickers : []).forEach(s => {
      if (!s || typeof s.id !== 'string' || !s.id || byId[s.id]) return;
      const e = { id: s.id, label: s.label || s.id, image: s.image || s.id + '.png', slot: entries.length, tiers: t };
      entries.push(e); byId[s.id] = e;
    });
    return { entries, byId, pages: Math.ceil(entries.length / ACH_PER_PAGE) };
  }

  const achPlays = (state, id) => (state && state.plays && state.plays[id]) || 0;
  const earned = (book, state, id) => !!book.byId[id] && achPlays(state, id) >= book.byId[id].tiers[0];

  function withPlays(state, id, n) {
    const plays = Object.assign({}, state.plays);
    if (n > 0) plays[id] = n; else delete plays[id];
    return { v: 1, plays, placed: state.placed };
  }

  function achReduce(book, state, action) {
    const a = action || {};
    switch (a.t) {
      case 'play':
        if (!book.byId[a.id]) return state;           // e.g. Bailed: no sticker yet
        return withPlays(state, a.id, achPlays(state, a.id) + 1);
      case 'devAdd': {
        if (!book.byId[a.id] || typeof a.n !== 'number' || !isFinite(a.n)) return state;
        const n = Math.trunc(a.n); if (!n) return state;
        const next = Math.max(0, achPlays(state, a.id) + n);
        return next === achPlays(state, a.id) ? state : withPlays(state, a.id, next);
      }
      case 'place':
        if (!earned(book, state, a.id) || state.placed[a.id]) return state;
        return { v: 1, plays: state.plays, placed: Object.assign({}, state.placed, { [a.id]: true }) };
      case 'reset':
        return (Object.keys(state.plays).length || Object.keys(state.placed).length) ? ACH_EMPTY : state;
      default:
        return state;
    }
  }

  function achStatus(book, state, id) {
    if (!book.byId[id]) return null;
    if (!earned(book, state, id)) return 'locked';
    return state.placed[id] ? 'placed' : 'tray';
  }
  function achTiers(book, state, id) {
    const e = book.byId[id]; if (!e) return [];
    const n = achPlays(state, id);
    return e.tiers.map(need => ({ need, done: n >= need }));
  }
  const achComplete = (book, state, id) => { const t = achTiers(book, state, id); return t.length > 0 && t.every(x => x.done); };
  const achTray = (book, state) => book.entries.filter(e => achStatus(book, state, e.id) === 'tray').map(e => e.id);
  function achProgress(book, state) {
    let done = 0, total = 0;
    book.entries.forEach(e => { achTiers(book, state, e.id).forEach(t => { total++; if (t.done) done++; }); });
    return { done, total };
  }
  /* What a transition just completed — the toast's job. */
  function achNewTiers(book, before, after) {
    const out = [];
    book.entries.forEach(e => {
      const b = achTiers(book, before, e.id), a = achTiers(book, after, e.id);
      a.forEach((t, i) => { if (t.done && !b[i].done) out.push({ id: e.id, tier: i, need: t.need }); });
    });
    return out;
  }
  function achHint(book, state, id) {
    const e = book.byId[id]; if (!e) return '';
    const n = achPlays(state, id);
    if (n < e.tiers[0]) return e.tiers[0] === 1 ? `Play ${e.label} once to unlock` : `Play ${e.label} ${e.tiers[0]} times to unlock`;
    const next = e.tiers.find(need => n < need);
    if (next === undefined) return '100% complete';
    const left = next - n;
    return `${left} more play${left === 1 ? '' : 's'} for the next star`;
  }

  /* Tolerant load. Anything malformed is the empty state; a NEWER schema is
     not guessed at. Plays must be whole and positive; a placement survives
     only for a sticker that is actually earned. Never throws. */
  function achRevive(raw, book) {
    try {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.v !== 1) return ACH_EMPTY;
      if (!raw.plays || typeof raw.plays !== 'object' || Array.isArray(raw.plays)) return ACH_EMPTY;
      const plays = {}, placed = {};
      Object.keys(raw.plays).forEach(id => {
        const n = raw.plays[id];
        if (book.byId[id] && typeof n === 'number' && isFinite(n) && Math.trunc(n) > 0) plays[id] = Math.trunc(n);
      });
      const p = raw.placed && typeof raw.placed === 'object' && !Array.isArray(raw.placed) ? raw.placed : {};
      const s = { v: 1, plays, placed };
      Object.keys(p).forEach(id => { if (p[id] === true && earned(book, s, id)) placed[id] = true; });
      return Object.keys(plays).length || Object.keys(placed).length ? s : ACH_EMPTY;
    } catch (_) { return ACH_EMPTY; }
  }

  const api = { ACH_TIERS, ACH_PER_PAGE, ACH_EMPTY, achDefine, achReduce, achPlays, achStatus, achTiers, achComplete,
    achTray, achProgress, achNewTiers, achHint, achRevive };
  /* module first, and window ONLY when there is no module — so under Node the
     harness can forbid window outright and prove the rules never reach for it. */
  if (typeof module !== 'undefined') module.exports = api; else window.Achievements = api;
})();
