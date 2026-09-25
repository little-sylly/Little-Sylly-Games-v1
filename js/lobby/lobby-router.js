// ═══════════════════════════════════════════════════════════════════════════
// lobby-router.js — the pure state machine behind the lobby's four layouts (SW v231).
//
// Pure and total: no DOM, no window, no timers, no Date.now, no Math.random —
// tools/verify-lobby-router.js drives every transition under Node.
// js/lobby/lobby-host.js owns every effect.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  /* The four layouts, in the order every switcher shows them. `screen` is what
     showScreen() shows for it. The label is display copy only — the code keys on
     the id, whatever the owner renames "Original" to (spec § 0). */
  const LOBBY_LAYOUTS = [
    { id: 'lounge',   label: 'Lounge',   ico: '✨', screen: 'screen-lounge' },
    { id: 'shelves',  label: 'Shelves',  ico: '🗂️', screen: 'screen-shelves' },
    { id: 'tv',       label: 'TV',       ico: '🖥️', screen: 'screen-tv' },
    { id: 'original', label: 'Original', ico: '▤',  screen: 'screen-lobby' },
  ];
  const LOBBY_VIEWS = LOBBY_LAYOUTS.map(l => l.id);

  /* `room` is three states, not a boolean, because "built but stopped" is the
     whole point of W5 and a boolean cannot say it. Read it as the router's
     INTENT — should the room be rendering? — not as the fact of whether a
     WebGL context exists. Mounting is the page's job; roomMounted is how the
     page reports back. */
  const LOBBY_INIT = {
    view:     'lounge',      // 'lounge' | 'tv' | 'shelves' | 'original'
    tvSel:    'ss',           // which game the TV layout is showing
    room:     'absent',       // 'absent' | 'running' | 'idle'
    workshop: false,          // the real Workshop screen is up
    stickerbook: false,       // the stickerbook (the binder's door) is up — prototype, 23 Sep 2026
    switcher: false,          // the dock is visible — SUMMONED only (W6)
    design:   null,           // the last-read sylly_controller design
    /* The phone tier's one-way arrival beat. 'none' on a widescreen, where it
       never runs at all. Which TIER this device is on is the page's knowledge
       (it owns the WebGL probe and the window size); all the router knows is
       whether the beat has played — which is exactly what the one-way rule
       needs, and nothing more. */
    arrival:  'none',         // 'none' | 'playing' | 'done'
  };

  /* The five actions the PAGE dispatches for itself. Everything else arrives
     from a door in the room — see LOBBY_DOORS in lobby-doors.js. Keeping the
     split as data is what lets verify-lobby-router.js prove no action is unreachable. */
  const LOBBY_PAGE_ACTIONS = ['go', 'roomMounted', 'workshopClose', 'designSaved', 'leaveLobby', 'arrivalBegin', 'arrivalReset', 'stickerbookClose', 'home', 'closeSwitcher'];

  function lobbyReduce(state, action) {
    const a = action || {};
    const s = Object.assign({}, state);
    /* Leaving the room stops it; it never disposes it. From 'absent' there is
       nothing to stop, and claiming otherwise would have the page calling
       stop() on a room it never built. (A deliberate refinement of spec § 5.2's
       flat `room := 'idle'`.) */
    const keep = () => (state.room === 'absent' ? 'absent' : 'idle');
    /* ONE-WAY (owner, 21 Sep 2026): a device that was handed out of the lounge
       has no path back into it. Every switcher hides the Lounge from such a
       device (lobbyOffered, lobby-host.js), and it is enforced here anyway —
       a hidden control is a courtesy, a refused transition is the rule. */
    const lounged = state.arrival !== 'done';

    switch (a.t) {
      case 'go':
        if (LOBBY_VIEWS.indexOf(a.view) === -1) return state;
        if (a.view === 'lounge' && !lounged) return state;
        s.view = a.view;
        s.room = a.view === 'lounge' ? 'running' : keep();
        /* The dock is summoned, never automatic. Every other layout ships its
           own switcher — Shelves' `.lb-switch`, TV's mode buttons, Original's
           layout button — each offering every layout this device may use, so a dock
           raised on arrival is a second copy of a control already on screen
           (and under the rail, in TV). The Lounge is the only layout with none, by
           design: it is a room, not a menu. Hence `openSwitcher`. */
        s.switcher = false;
        return s;

      case 'enterTV':
        s.view = 'tv';
        if (a.gameId) s.tvSel = a.gameId;   // falsy keeps the previous pick: the telly screen is a door, only the dial picks
        s.room = keep();
        s.switcher = false;                 // the Lounge's own mode buttons take over
        return s;

      /* Both the clamshell prop's door AND the end of the arrival beat — the
         beat IS that door, taken automatically, which is why it needs no
         action of its own and inherits a path already proven by the harness. */
      case 'enterShelves':
        s.view = 'shelves';
        s.room = keep();
        s.switcher = false;                 // the phone's own `.lb-switch` takes over
        if (state.arrival === 'playing') s.arrival = 'done';
        return s;

      case 'openSwitcher':
        if (state.switcher) return state;
        s.switcher = true;
        return s;

      case 'roomMounted':
        if (state.room === 'running') return state;
        s.room = 'running';
        return s;

      case 'workshopOpen':
        s.workshop = true;
        s.room = keep();
        return s;

      case 'workshopClose':
        s.workshop = false;
        /* Back to the layout it was opened from — the view never changes while
           the Workshop is up. Production opens it from four places; the sandbox
           only ever opened it from the lounge. The one-way rule still holds. */
        s.view = (state.view === 'lounge' && !lounged) ? 'shelves' : state.view;
        s.room = state.room === 'absent' ? 'absent' : (s.view === 'lounge' ? 'running' : 'idle');
        s.switcher = false;
        return s;

      /* The binder's door (the stickerbook prototype): the Workshop's shape
         exactly — the room is kept but stopped while the book is up, and the
         way out is the layout it was opened from (only ever the lounge today),
         or the Shelves for a device the lounge is closed to. */
      case 'stickerbookOpen':
        if (state.stickerbook) return state;
        s.stickerbook = true;
        s.room = keep();
        return s;

      case 'stickerbookClose':
        if (!state.stickerbook) return state;
        s.stickerbook = false;
        s.view = (state.view === 'lounge' && !lounged) ? 'shelves' : state.view;
        s.room = state.room === 'absent' ? 'absent' : (s.view === 'lounge' ? 'running' : 'idle');
        s.switcher = false;
        return s;

      case 'designSaved': {
        const d = a.design || null;
        if (d === state.design) return state;   // same reference: one change to apply, not two
        s.design = d;
        return s;
      }

      case 'leaveLobby':
        if (state.room === 'absent') return state;
        s.room = 'absent';
        return s;

      /* A fact the page reports, not an intent: the beat has started. Refused
         while one is playing or after one has played, so a resize-driven
         re-apply cannot start a second. */
      case 'arrivalBegin':
        if (state.arrival !== 'none') return state;
        s.arrival = 'playing';
        return s;

      /* The window crossed the eligibility floor, so the tier changed under
         us. The lean room built for the beat has no controller in it and must
         not be handed to someone who now qualifies for the real lounge; the
         page disposes it and says so here. Paired with 'leaveLobby', which
         owns the room half. */
      case 'arrivalReset':
        if (state.arrival === 'none') return state;
        s.arrival = 'none';
        return s;

      /* Coming back into the lobby from OUTSIDE it — a game's exit
         (resetToLobby), the Terminal, the gateway. `view` already is the layout
         the player left from: nothing the router sees changes it while a game is
         up. So home only closes what was open, and keeps the one-way rule. */
      case 'home':
        s.workshop = false;
        s.stickerbook = false;
        s.switcher = false;
        s.view = (state.view === 'lounge' && !lounged) ? 'shelves' : state.view;
        s.room = state.room === 'absent' ? 'absent' : (s.view === 'lounge' ? 'running' : 'idle');
        return s;

      case 'closeSwitcher':
        if (!state.switcher) return state;
        s.switcher = false;
        return s;

      default:
        return state;
    }
  }

  const api = { LOBBY_LAYOUTS, LOBBY_VIEWS, LOBBY_INIT, LOBBY_PAGE_ACTIONS, lobbyReduce };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.LobbyRouter = api;
})();
