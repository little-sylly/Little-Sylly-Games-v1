// ═══════════════════════════════════════════════════════════════════════════
// shell-router.js — the pure state machine behind wip/lobby-lab/shell.html.
//
// Pure and total: no DOM, no window, no timers, no Date.now, no Math.random.
// Same contract as js/lib/physics.js and the pure half of lounge.js — which is
// what lets verify-shell.js drive every transition under Node before a pixel
// exists. The page owns every effect; this file owns only what is true.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  const SHELL_VIEWS = ['premium', 'tv', 'shelves', 'original'];

  /* `room` is three states, not a boolean, because "built but stopped" is the
     whole point of W5 and a boolean cannot say it. Read it as the shell's
     INTENT — should the room be rendering? — not as the fact of whether a
     WebGL context exists. Mounting is the page's job; roomMounted is how the
     page reports back. */
  const SHELL_INIT = {
    view:     'premium',      // 'premium' | 'tv' | 'shelves' | 'original'
    tvSel:    'ss',           // which game the TV layout is showing
    room:     'absent',       // 'absent' | 'running' | 'idle'
    workshop: false,          // the real Workshop screen is up
    stickerbook: false,       // the stickerbook (the binder's door) is up — prototype, 23 Sep 2026
    switcher: false,          // the dock is visible — SUMMONED only (W6)
    design:   null,           // the last-read sylly_controller design
    live:     false,          // ?live
    /* The phone tier's one-way arrival beat. 'none' on a widescreen, where it
       never runs at all. Which TIER this device is on is the page's knowledge
       (it owns the WebGL probe and the window size); all the router knows is
       whether the beat has played — which is exactly what the one-way rule
       needs, and nothing more. */
    arrival:  'none',         // 'none' | 'playing' | 'done'
  };

  /* The five actions the PAGE dispatches for itself. Everything else arrives
     from a door in the room — see SHELL_DOORS in shell-host.js. Keeping the
     split as data is what lets verify-shell.js prove no action is unreachable. */
  const SHELL_PAGE_ACTIONS = ['go', 'roomMounted', 'workshopClose', 'designSaved', 'leaveShell', 'arrivalBegin', 'arrivalReset', 'stickerbookClose'];

  function shellReduce(state, action) {
    const a = action || {};
    const s = Object.assign({}, state);
    /* Leaving the room stops it; it never disposes it. From 'absent' there is
       nothing to stop, and claiming otherwise would have the page calling
       stop() on a room it never built. (A deliberate refinement of spec § 5.2's
       flat `room := 'idle'`.) */
    const keep = () => (state.room === 'absent' ? 'absent' : 'idle');
    /* ONE-WAY (owner, 21 Sep 2026): a device that was handed out of the lounge
       has no path back into it. Enforced here rather than by hiding buttons,
       because lobby.js's own in-phone switcher renders all four views
       unconditionally and the shell does not own that markup — a hidden
       control is a courtesy, a refused transition is the rule. */
    const lounged = state.arrival !== 'done';

    switch (a.t) {
      case 'go':
        if (SHELL_VIEWS.indexOf(a.view) === -1) return state;
        if (a.view === 'premium' && !lounged) return state;
        s.view = a.view;
        s.room = a.view === 'premium' ? 'running' : keep();
        /* The dock is summoned, never automatic. Every other layout ships its
           own switcher — lobby.js's in-phone `.lb-switch` on the phone, the
           Lounge's mode buttons on TV — each offering all four views, so a dock
           raised on arrival is a second copy of a control already on screen
           (and under the rail, in TV). Premium is the only layout with none, by
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

      /* The finding of spec § 1.1.1, made assertable: the way out of the
         Workshop is the lounge, not screen-lobby. */
      case 'workshopClose':
        s.workshop = false;
        /* The way out of the Workshop is the lounge — unless the lounge is
           closed to this device, in which case it is the Shelves. Unreachable
           today (the arrival tier does not build the controller prop, so its
           door cannot be taken) and asserted anyway: "cannot happen" is not a
           thing a state machine should have to be right about. */
        s.view = lounged ? 'premium' : 'shelves';
        s.room = state.room === 'absent' ? 'absent' : (lounged ? 'running' : 'idle');
        s.switcher = false;
        return s;

      /* The binder's door (the stickerbook prototype): the Workshop's shape
         exactly — the room is kept but stopped while the book is up, and the
         way out is the lounge, or the Shelves for a device it is closed to. */
      case 'stickerbookOpen':
        if (state.stickerbook) return state;
        s.stickerbook = true;
        s.room = keep();
        return s;

      case 'stickerbookClose':
        if (!state.stickerbook) return state;
        s.stickerbook = false;
        s.view = lounged ? 'premium' : 'shelves';
        s.room = state.room === 'absent' ? 'absent' : (lounged ? 'running' : 'idle');
        s.switcher = false;
        return s;

      case 'designSaved': {
        const d = a.design || null;
        if (d === state.design) return state;   // same reference: one change to apply, not two
        s.design = d;
        return s;
      }

      case 'leaveShell':
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
         page disposes it and says so here. Paired with 'leaveShell', which
         owns the room half. */
      case 'arrivalReset':
        if (state.arrival === 'none') return state;
        s.arrival = 'none';
        return s;

      default:
        return state;
    }
  }

  const api = { SHELL_VIEWS, SHELL_INIT, SHELL_PAGE_ACTIONS, shellReduce };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.ShellRouter = api;
})();
