// ═══════════════════════════════════════════════════════════════════════════
// lobby-doors.js — builds the host object js/lounge/lounge-scene.js validates,
// and holds the one door→destination map. Pure: no DOM, no window, no timers.
//
// Four of the five callables become router actions. openSound is the odd one:
// it is an EFFECT (openSoundOverlay) and changes nothing about the
// router's state, so it is injected
// rather than routed. LOBBY_DOORS says which is which, as data, so the harness
// can prove there are no orphans in either direction.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  const LOBBY_DOORS = {
    enterTV:      'enterTV',
    enterShelves: 'enterShelves',
    openWorkshop: 'workshopOpen',
    openSwitcher: 'openSwitcher',
    openSound:    null,            // an effect, not one of the router's actions
    openStickerbook: 'stickerbookOpen',   // OPTIONAL in the scene's contract; the lobby supplies it
  };

  function lobbyCreateHost(deps) {
    if (!deps || typeof deps.dispatch !== 'function') throw new Error('lobbyCreateHost: deps.dispatch must be a function');
    if (typeof deps.openSound !== 'function') throw new Error('lobbyCreateHost: deps.openSound must be a function');
    const dispatch = deps.dispatch;

    const host = {
      games:      deps.games,
      stickers:   deps.stickers,
      design:     deps.design,
      lampPanels: deps.lampPanels,
      music:      deps.music,

      /* A falsy gameId is passed along as null on purpose: the router keeps
         the previous pick for it. The telly screen is a door to the layout;
         only the dial picks a game. */
      enterTV(gameId) { dispatch({ t: 'enterTV', gameId: gameId || null }); },
      enterShelves()  { dispatch({ t: 'enterShelves' }); },
      /* The room only ever says "the Workshop was asked for". Whether that
         means the real ctlOpenWorkshop or a status line is the page's call,
         because it depends on ?live — which this file must not know about. */
      openWorkshop()  { dispatch({ t: 'workshopOpen' }); },
      openSwitcher()  { dispatch({ t: 'openSwitcher' }); },
      openStickerbook() { dispatch({ t: 'stickerbookOpen' }); },
      openSound()     { deps.openSound(); },

      debug: deps.debug !== false,
    };

    /* Absent, not undefined-valued: louMount reads `host.reducedMotion !== undefined`
       to decide whether to trust the host over the real media query, and
       `host.rand || Math.random` for the dial. An explicit undefined would be
       the same thing here, but leaving the keys off keeps the host object a
       true picture of what was asked for. */
    if (deps.reducedMotion !== undefined) host.reducedMotion = deps.reducedMotion;
    if (deps.rand) host.rand = deps.rand;
    /* An EFFECT, like openSound: the room names a moment ('dialPress'), the
       page decides what it sounds like. Injected rather than routed, and
       absent-not-undefined when nobody supplies one, for the same reason as
       the two dormant doors below — the host object stays a true picture of
       what was asked for, and no audio means silence, never an error. */
    if (deps.sfx) host.sfx = deps.sfx;
    /* A PROVIDER, not a door or an effect: the Lounge's controller prop calls it
       to borrow the Workshop's painted model (js/controller.js ctlModelParts).
       Absent-not-undefined, same reason as sfx; absent means flat colour. */
    if (deps.controllerParts) host.controllerParts = deps.controllerParts;

    /* openJukebox is deliberately NOT supplied — a dormant door (the jukebox bops).
       openStickerbook IS, since the stickerbook prototype (23 Sep 2026). */
    return host;
  }

  const api = { LOBBY_DOORS, lobbyCreateHost };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.LobbyDoors = api;
})();
