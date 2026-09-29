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
    openJukebox:  'jukeboxOpen',          // OPTIONAL too; supplied since SW v233 (the jukebox screen)
    openPainting: null,                   // OPTIONAL, and an effect like openSound: a gallery overlay over the room, no router state
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
      openJukebox()     { dispatch({ t: 'jukeboxOpen' }); },
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
    /* An optional EFFECT: the room says which painting (a LOU_PAINTINGS id) was tapped. Absent-not-
       undefined, so a host with no gallery leaves the frames as plain wall art. */
    if (deps.openPainting) host.openPainting = (id) => deps.openPainting(id);

    /* Both optional doors are supplied now: openStickerbook since the stickerbook
       prototype (23 Sep 2026), openJukebox since the jukebox screen (SW v233). A
       host that leaves either off still gets a room — that door falls back to its
       prop's own answer (the binder's cover flip, the jukebox's bop). */
    return host;
  }

  const api = { LOBBY_DOORS, lobbyCreateHost };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.LobbyDoors = api;
})();
