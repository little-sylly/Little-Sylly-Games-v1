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
    switcher: false,          // the dock is visible (always true off premium — W6)
    design:   null,           // the last-read sylly_controller design
    live:     false,          // ?live
  };

  /* The five actions the PAGE dispatches for itself. Everything else arrives
     from a door in the room — see SHELL_DOORS in shell-host.js. Keeping the
     split as data is what lets verify-shell.js prove no action is unreachable. */
  const SHELL_PAGE_ACTIONS = ['go', 'roomMounted', 'workshopClose', 'designSaved', 'leaveShell'];

  function shellReduce(state, action) {
    const a = action || {};
    const s = Object.assign({}, state);
    /* Leaving the room stops it; it never disposes it. From 'absent' there is
       nothing to stop, and claiming otherwise would have the page calling
       stop() on a room it never built. (A deliberate refinement of spec § 5.2's
       flat `room := 'idle'`.) */
    const keep = () => (state.room === 'absent' ? 'absent' : 'idle');

    switch (a.t) {
      case 'go':
        if (SHELL_VIEWS.indexOf(a.view) === -1) return state;
        s.view = a.view;
        s.room = a.view === 'premium' ? 'running' : keep();
        s.switcher = a.view !== 'premium';
        return s;

      case 'enterTV':
        s.view = 'tv';
        if (a.gameId) s.tvSel = a.gameId;   // falsy keeps the previous pick: the telly screen is a door, only the dial picks
        s.room = keep();
        s.switcher = true;
        return s;

      case 'enterShelves':
        s.view = 'shelves';
        s.room = keep();
        s.switcher = true;
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
        s.view = 'premium';
        s.room = state.room === 'absent' ? 'absent' : 'running';
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

      default:
        return state;
    }
  }

  const api = { SHELL_VIEWS, SHELL_INIT, SHELL_PAGE_ACTIONS, shellReduce };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.ShellRouter = api;
})();
