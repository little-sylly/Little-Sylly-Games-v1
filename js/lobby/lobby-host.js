// ═══════════════════════════════════════════════════════════════════════════
// lobby-host.js — every effect the lobby's four layouts have (SW v231).
// The rules live in lobby-router.js (pure, tools/verify-lobby-router.js); this
// file only makes them true on screen.
//
// THE SEAM: lobbyShow() is the ONLY way into the lobby from anywhere else in
// the app — resetToLobby() (all 20 games' exits), both secret-mode.js returns.
// Nothing outside js/lobby/ may showScreen() a layout's screen (spec § 4).
//
// Depends on: engine.js (showScreen, openSoundOverlay, playLaunch, isMuted,
// sfxEnabled, Music), controller.js (ctlMountOrnament, ctlOpenWorkshop,
// ctlEnsureModel, ctlModelParts, ctlReadDesign, ctlReducedMotion),
// js/lounge/* (LouScene, LouSfx), js/lobby/* (GAMES, lb*, tv*, Achievements,
// Stickerbook, Jukebox, LobbyRouter, LobbyDoors).
// ═══════════════════════════════════════════════════════════════════════════

/* Three lobby buttons predate the short ids (spec § 6). Every other game's is btn-[id]. */
const LOBBY_BTN_IDS = { li5: 'btn-dstw', gm: 'btn-great-minds', ss: 'btn-sylly-signals' };
const LOBBY_SLOTS = { shelves: 'shelves-controller', tv: 'tv-controller', original: 'lobby-controller' };
/* Both runtime-cached (sw.js): manifest network-first, images cache-first. */
const LOBBY_DATA = { stickers: 'data/stickers/', lamp: 'data/lamp/' };
const LOBBY_SAY_MS = 4000;

let lobbyState = Object.assign({}, LobbyRouter.LOBBY_INIT);
let lobbyScene = null;          // the Lounge's scene api, once mounted
let lobbyRoomTier = null;       // 'lounge' | 'arrival' — which tier the mounted room was built FOR
let lobbyHost = null;           // the object lounge-scene.js validates; null until content loads
let lobbyBook = null;           // the stickerbook's book; null when the sticker manifest never arrived
let lobbySb = null;             // the stickerbook's DOM, mounted on first open
let lobbySfx = null;
let lobbyWebgl = false, lobbyReducedData = false, lobbyDebug = false, lobbyLastOk = null;
let lobbySayTimer = null;

function lobbyLayout(id) { return LobbyRouter.LOBBY_LAYOUTS.find(l => l.id === id) || null; }
function lobbyScreen(id) { const l = lobbyLayout(id); return l ? l.screen : 'screen-shelves'; }
function lobbyEligible() { return LouScene.louEligible(window.innerWidth, window.innerHeight, lobbyWebgl, lobbyReducedData); }
function lobbyCanArrive() { return LouScene.louCanArrive(lobbyWebgl, lobbyReducedData); }

/* Which layouts a switcher may offer this device, right now. Every switcher
   renders from this; lobbyGo refuses the rest — a hidden button is a courtesy,
   a refused transition is the rule. */
function lobbyOffered(id) {
  if (id === 'lounge') return lobbyState.arrival !== 'done' && lobbyEligible();
  if (id === 'tv') return lbTvEligible();
  return !!lobbyLayout(id);
}
function lobbyIsUp(view) { return lobbyState.view === view && !lobbyState.workshop; }

/* The rooms' doors outside the Lounge (27 Sep 2026): Shelves' and Classic's places
   row. A phone never keeps the Lounge, so without these it had no way in. Same
   router actions the Lounge's doors dispatch, and the close goes back to whichever
   layout opened it (the router's jukeboxClose / stickerbookClose). The stickerbook
   needs its manifest — absent until it arrives, like a layout a device may not use. */
function lobbyPlaceOffered(id) {
  if (id === 'stickers') return !!lobbyBook;
  return id === 'jukebox';
}
function lobbyOpenPlace(id) {
  if (!window.lobbyReady || !lobbyPlaceOffered(id)) return;   // Jukebox is configured by lobbyLoadContent
  lobbyDispatch({ t: id === 'stickers' ? 'stickerbookOpen' : 'jukeboxOpen' });
}
function lobbyPaintPlaces() {
  document.querySelectorAll('#screen-lobby [data-lobby-place]').forEach(b => { b.hidden = !lobbyPlaceOffered(b.dataset.lobbyPlace); });
  if (lobbyIsUp('shelves')) { lbRender(); lobbyAfterLayoutRender(); }
  // TV patches in place and is never scoped by the #screen-lobby query above
  // (it lives outside it) — repaint its own places row through tvApplyAll.
  if (typeof tvApplyAll === 'function') tvApplyAll();
}

function lobbySay(text) {
  const el = document.getElementById('lou-status'); if (!el) return;
  el.textContent = text;
  if (lobbySayTimer) clearTimeout(lobbySayTimer);
  lobbySayTimer = setTimeout(() => { el.textContent = ''; lobbySayTimer = null; }, LOBBY_SAY_MS);
}

// ── The one write path ─────────────────────────────────────────────────────
function lobbyDispatch(action) {
  const prev = lobbyState;
  lobbyState = LobbyRouter.lobbyReduce(prev, action);
  if (lobbyState !== prev) lobbyApply(prev, lobbyState);
}

// ── Public entry points ────────────────────────────────────────────────────
/* THE seam. Every "back to the lobby" in the app lands here. */
function lobbyShow() {
  lobbyDispatch({ t: 'home' });
  lobbyPresent(lobbyState.view);
}
function lobbyGo(id) {
  if (!lobbyOffered(id)) return;
  lobbyDispatch({ t: 'go', view: id });
}
function lobbyButtonFor(gameId) { return document.getElementById(LOBBY_BTN_IDS[gameId] || ('btn-' + gameId)); }
/* Everything that must stop when a game takes the screen while `view` stays put.
   Shared by lobbyLaunch() and the reconnect prompt's rejoin (engine-multiplayer.js
   mpApplyRejoinAccept), which enters a game WITHOUT a lobby button — so the two can
   never drift. The Lounge's room is stopped too: at boot on a widescreen the prompt
   sits over the Lounge with its room running, and only router state stops that loop
   otherwise. lobbyApply resumes it on the way back (roomUp). */
function lobbyLeaveForGame() {
  const tvRoot = document.getElementById('tv-app');
  if (tvRoot) tvDrop(tvRoot);
  if (lobbyScene && typeof lobbyScene.stop === 'function') lobbyScene.stop();
}

/* Clicking the game's own lobby button runs its plugin's entry listener
   untouched — no plugin file knows these layouts exist (spec § 6). */
function lobbyLaunch(gameId) {
  const btn = lobbyButtonFor(gameId);
  if (!btn) { console.warn('lobbyLaunch: no lobby button for ' + gameId); return false; }
  /* The game takes the screen but `view` stays put (it is where lobbyShow comes
     back to) — so TV's drift RAF and clock must stop here, not only when another
     layout is presented (logic-engine.md § Timer Lifecycle). lobbyPresent
     rebuilds TV on the way back. */
  lobbyLeaveForGame();
  btn.click();
  return true;
}
/* lbSet re-renders Shelves' markup, slot included — put the ornament back. */
function lobbyAfterLayoutRender() {
  if (!lobbyState.workshop && LOBBY_SLOTS[lobbyState.view]) lobbyMountOrnament(lobbyState.view);
}

// ── State to page ──────────────────────────────────────────────────────────
function lobbyApply(prev, next) {
  // The room: kept and stopped, never disposed, whenever anything else has the screen.
  if (next.room === 'absent' && prev.room !== 'absent') lobbyDisposeRoom();
  const roomUp = next.view === 'lounge' && !next.workshop && !next.stickerbook && !next.jukebox;
  if (roomUp) {
    if (lobbyScene) {
      lobbyScene.resume();
      /* resetView on the way IN clears a fade a door left lit (the phone's
         fadeOut, the dial's pushIn) and shuts the binder. Guarded on the
         transition, because a resize re-applies and must not snap a drag. */
      if (prev.view !== 'lounge' || prev.stickerbook || prev.workshop || prev.jukebox) lobbyScene.resetView();
      /* The jukebox prop reads Music only when told: a song may have changed,
         started or been let go (a game's music took over) while the room slept. */
      if (lobbyScene.syncMusic) lobbyScene.syncMusic();
    } else lobbyEnsureRoom();
  } else if (lobbyScene) lobbyScene.stop();
  if (lobbyScene && next.design && next.design !== prev.design) lobbyScene.setDesign(next.design);

  lobbyPaintSwitcher(next);

  /* The jukebox (SW v233) is a SCREEN, not an overlay: open shows it, and close
     is presented below like any change of view — lobbyPresent's showScreen is
     what takes it down. Its two RAF loops stop in jbxClose (Timer Lifecycle). */
  if (next.jukebox && !prev.jukebox) lobbyOpenJukebox();
  if (!next.jukebox && prev.jukebox) Jukebox.jbxClose();

  if (next.stickerbook && !prev.stickerbook) lobbyOpenStickerbook();
  if (!next.stickerbook && prev.stickerbook && lobbySb) lobbySb.close();
  /* From lobbyState, not `next`: a book that could not load corrects the state
     inside lobbyOpenStickerbook, and its "could not load" line lives in this HUD. */
  const hud = document.getElementById('lou-hud');
  if (hud) hud.style.visibility = lobbyState.stickerbook ? 'hidden' : '';

  /* The Workshop takes the screen with `view` unchanged — TV's ornament keeps
     view 'tv' — so, as for a game (lobbyLaunch), TV's RAF and clock stop here;
     workshopClose presents TV again and rebuilds it (Timer Lifecycle). */
  if (next.workshop && !prev.workshop) { const tvRoot = document.getElementById('tv-app'); if (tvRoot) tvDrop(tvRoot); }

  /* The Lounge's controller DOOR asks for the Workshop through the router; an
     ornament opens it itself and only tells the router (onOpen). */
  if (next.workshop && !prev.workshop && next.view === 'lounge') lobbyOpenWorkshopFromRoom();

  if (!next.workshop && !next.jukebox && (next.view !== prev.view || prev.workshop || prev.jukebox)) lobbyPresent(next.view);

  // A lounge that no longer fits (a phone, or a window shrunk) plays the beat and hands on.
  // Not from behind the jukebox: the beat would hand the room on while its screen is up.
  if (next.view === 'lounge' && !next.workshop && !next.jukebox && !lobbyEligible()) lobbyRunArrival();

  /* The beat has handed this device to Shelves for good, so its lean room is
     dead weight — a WebGL context and the room's GPU memory on exactly the
     hardware least able to spare them (spec § 4.3). Hopped out of apply():
     the handoff arrives from inside the scene's own frame callback. */
  if (next.arrival === 'done' && prev.arrival !== 'done' && lobbyRoomTier === 'arrival') setTimeout(lobbyDropArrivalRoom, 0);
}
function lobbyDropArrivalRoom() {
  if (!lobbyScene || lobbyRoomTier !== 'arrival' || lobbyState.arrival !== 'done') return;
  lobbyState = LobbyRouter.lobbyReduce(lobbyState, { t: 'leaveLobby' });   // a fact: the room is gone
  lobbyDisposeRoom();
}

/* Show a layout and everything it owns. Idempotent — lobbyShow and a view change
   can both reach here in one turn, and a second call must cost nothing. */
function lobbyPresent(view) {
  const screen = document.getElementById(lobbyScreen(view));
  if (screen && screen.style.display !== 'flex') showScreen(lobbyScreen(view));
  const tvRoot = document.getElementById('tv-app');
  if (view !== 'tv' && tvRoot) tvDrop(tvRoot);        // TV's drift RAF + clock stop off screen (Timer Lifecycle)
  if (view === 'shelves') lbRender();
  if (view === 'tv') lbMountTVFull();
  if (LOBBY_SLOTS[view]) lobbyMountOrnament(view);
}

function lobbyMountOrnament(view) {
  /* No WebGL, no ornament: the slot stays empty rather than the renderer
     throwing inside a deferred callback (the no-WebGL tier, spec § 5). */
  if (!lobbyWebgl) return;
  ctlMountOrnament(LOBBY_SLOTS[view], {
    returnScreen: lobbyScreen(view),
    pose: view === 'tv' ? TV_CTL_POSE : null,   // TV's controller turns to face its speech bubble
    beats: view === 'tv',                        // ...and is big enough to show its idle beats
    onOpen: () => lobbyDispatch({ t: 'workshopOpen' }),
    onReturn: lobbyWorkshopReturn,
  });
}
/* Handed the design that survived the close (saved, or restored on ✕). */
function lobbyWorkshopReturn(design) {
  lobbyDispatch({ t: 'designSaved', design });
  lobbyDispatch({ t: 'workshopClose' });
}
function lobbyOpenJukebox() {
  showScreen('screen-jukebox');
  Jukebox.jbxOpen();
}
function lobbyOpenWorkshopFromRoom() {
  ctlOpenWorkshop({ returnScreen: 'screen-lounge', onReturn: lobbyWorkshopReturn });
}

// ── The dock ───────────────────────────────────────────────────────────────
function lobbyBuildSwitcher() {
  const list = document.getElementById('lobby-switcher-list');
  if (!list) return;
  list.innerHTML = '';
  for (const l of LobbyRouter.LOBBY_LAYOUTS) {
    const b = document.createElement('button');
    b.dataset.lobbyLayout = l.id;
    b.className = 'min-h-14 rounded-2xl bg-white border border-stone-200 flex flex-col items-center justify-center gap-1 font-semibold text-stone-700 active:scale-95 transition-transform duration-100';
    b.innerHTML = `<span class="text-2xl" aria-hidden="true">${l.ico}</span><span class="text-sm">${l.label}</span>`;
    b.addEventListener('click', () => lobbyGo(l.id));
    list.appendChild(b);
  }
  const close = document.getElementById('btn-lobby-switcher-close');
  if (close) close.addEventListener('click', () => lobbyDispatch({ t: 'closeSwitcher' }));
  const btn = document.getElementById('btn-lobby-layout');
  if (btn) btn.addEventListener('click', () => lobbyDispatch({ t: 'openSwitcher' }));
  document.querySelectorAll('#screen-lobby [data-lobby-place]').forEach(b =>
    b.addEventListener('click', () => lobbyOpenPlace(b.dataset.lobbyPlace)));
}
function lobbyPaintSwitcher(s) {
  const ov = document.getElementById('lobby-switcher-overlay');
  if (!ov) return;
  ov.style.display = s.switcher ? 'flex' : 'none';
  ov.querySelectorAll('[data-lobby-layout]').forEach(b => {
    const id = b.dataset.lobbyLayout;
    b.style.display = lobbyOffered(id) ? '' : 'none';
    b.setAttribute('aria-pressed', String(id === s.view));
  });
}

// ── The room ───────────────────────────────────────────────────────────────
function lobbyEnsureRoom() {
  if (lobbyScene || !lobbyHost) return;
  const full = lobbyEligible();
  if (!full && !lobbyCanArrive()) return;
  /* The arrival tier omits the controller: 87% of the prop build on a low-end
     phone, and out of the portrait frame anyway (DD-19). */
  try {
    lobbyScene = LouScene.louMount(document.getElementById('lou-canvas'), lobbyHost, { skipProps: full ? null : ['controller'] });
  } catch (e) {
    /* The probe said WebGL, the context said no. Treat the device as the
       no-WebGL tier from here on: Shelves, and the Lounge never offered. */
    console.warn('lobby: the Lounge could not mount — ' + (e && e.message));
    lobbyScene = null; lobbyWebgl = false;
    setTimeout(() => lobbyDispatch({ t: 'go', view: 'shelves' }), 0);
    return;
  }
  lobbyRoomTier = full ? 'lounge' : 'arrival';
  lobbySyncBinder();
  lobbyState = LobbyRouter.lobbyReduce(lobbyState, { t: 'roomMounted' });   // a fact, not an intent
}
function lobbyDisposeRoom() {
  if (!lobbyScene) return;
  lobbyScene.dispose(); lobbyScene = null; lobbyRoomTier = null;
}
/* The phone tier's one-way handoff. Starting is a fact; finishing arrives later
   as the clamshell door's own action, so it inherits a proven path. */
function lobbyRunArrival() {
  if (lobbyState.arrival !== 'none' || !lobbyHost) return;
  lobbyState = LobbyRouter.lobbyReduce(lobbyState, { t: 'arrivalBegin' });
  if (!lobbyScene) { setTimeout(() => lobbyDispatch({ t: 'enterShelves' }), 0); return; }
  lobbyScene.arrive(() => lobbyDispatch({ t: 'enterShelves' }));
}
function lobbyOnResize() {
  const ok = lobbyEligible();
  /* Crossing the floor changes which room should exist: the arrival tier's has
     no controller, and must not be handed to a window that now qualifies. */
  /* The arrival room may already be gone (dropped after the handoff) — the
     beat having played is what the reset is about, not the room existing. */
  const arrived = lobbyRoomTier === 'arrival' || (!lobbyScene && lobbyState.arrival === 'done');
  if (lobbyLastOk !== null && ok !== lobbyLastOk && arrived) {
    lobbyDisposeRoom();
    lobbyState = LobbyRouter.lobbyReduce(LobbyRouter.lobbyReduce(lobbyState, { t: 'leaveLobby' }), { t: 'arrivalReset' });
  }
  lobbyLastOk = ok;
  lobbyPaintSwitcher(lobbyState);
  if (lobbyState.workshop) return;
  if (lobbyState.view === 'tv') { lbMountTVFull(); lobbyMountOrnament('tv'); }
  if (lobbyState.view === 'lounge' && lobbyHost) lobbyApply(lobbyState, lobbyState);
}

// ── The stickerbook (v1: everything unlocked, nothing saved) ───────────────
function lobbySyncBinder() {
  if (!lobbyScene || !lobbyBook) return;
  const all = Achievements.achAllPlaced(lobbyBook);
  lobbyScene.withProp('binder', b => { if (b.setCollection) b.setCollection({ placed: Object.keys(all.placed), tray: [] }); });
}
function lobbyOpenStickerbook() {
  if (!lobbyBook) {
    lobbyState = LobbyRouter.lobbyReduce(lobbyState, { t: 'stickerbookClose' });   // a fact correction: nothing opened
    if (lobbyScene && lobbyIsUp('lounge')) { lobbyScene.resume(); lobbyScene.resetView(); }   // never wake the room behind another layout
    lobbySay('The sticker book could not load — it needs one trip online first.');
    return;
  }
  if (!lobbySb) lobbySb = Stickerbook.sbMount(document.getElementById('stickerbook-overlay'), {
    book: lobbyBook, base: LOBBY_DATA.stickers, reduced: () => ctlReducedMotion(),
    onIntent: (i) => { if (i.t === 'close') lobbyDispatch({ t: 'stickerbookClose' }); },
  });
  lobbySb.render(Achievements.achAllPlaced(lobbyBook));
  lobbySb.open();
}

// ── Content: each runtime-cached source fails ALONE (spec § 9.2) ───────────
function lobbyFetchJson(url) {
  return fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);
}
function lobbyDesignColours() {
  const d = ctlReadDesign();
  return { shell: d.shell, plate: d.plate, ears: d.ears, buttons: d.buttons };
}
/* The room names two kinds of sound: its own (lounge-sfx.js) and the Workshop's.
   The controller prop's idle Konami must sound exactly like the code typed in
   the Workshop, so those names route to controller.js / secret-mode.js's own
   voices rather than a copy. Sound ONLY — nothing here reaches smHandleButton,
   so the room's Konami is a hint and never an unlock. Mute is checked by the caller. */
function lobbyPlaySfx(name) {
  if (name.indexOf('controllerPress:') === 0) { ctlVoiceFor(name.slice('controllerPress:'.length)); return; }
  if (name === 'controllerRelease') { ctlVoiceRelease(); return; }
  if (name === 'konamiBeep') { playSecretBeep(); return; }
  if (lobbySfx) lobbySfx.play(name);
}
/* The Lounge's jukebox prop reads what Music plays (a held song included —
   nowPlaying() reports it while it plays). Its record carousel is "next record"
   (SW v233): the key the scene passes is a GAMES id and is ignored — the next
   record is the jukebox's call, not the room's. Background music still follows
   showScreen() whenever no song is held. */
function lobbyMusicAdapter() {
  return {
    keys: GAMES.map(g => g.id),
    nowPlaying() { return (typeof Music !== 'undefined' && Music.nowPlaying) ? Music.nowPlaying() : null; },
    playFor() { Jukebox.jbxNextRecord(); },
  };
}
async function lobbyLoadContent() {
  const [stickerMan, lampMan] = await Promise.all([
    lobbyFetchJson(LOBBY_DATA.stickers + 'manifest.json'),
    lobbyFetchJson(LOBBY_DATA.lamp + 'manifest.json'),
  ]);
  const stickers = stickerMan && Array.isArray(stickerMan.stickers) ? stickerMan.stickers : [];
  lobbyBook = stickers.length ? Achievements.achDefine(stickers) : null;
  const lamp = lampMan && Array.isArray(lampMan.panels) ? lampMan : { panels: [] };
  lobbyHost = LobbyDoors.lobbyCreateHost({
    games: GAMES,
    stickers: { base: LOBBY_DATA.stickers, list: stickers },
    lampPanels: { base: LOBBY_DATA.lamp, manifest: lamp },
    design: lobbyDesignColours(),
    music: lobbyMusicAdapter(),
    dispatch: lobbyDispatch,
    openSound: () => openSoundOverlay(),
    sfx: (name) => { if (!isMuted && sfxEnabled) lobbyPlaySfx(name); },
    controllerParts: () => (ctlEnsureModel() ? ctlModelParts() : null),
    debug: lobbyDebug,
  });
  Jukebox.jbxConfigure({
    games: GAMES,
    stickers: { base: LOBBY_DATA.stickers, list: stickers },
    design: lobbyDesignColours,
    onClose: () => lobbyDispatch({ t: 'jukeboxClose' }),
    onChange: () => { if (lobbyScene && lobbyScene.syncMusic) lobbyScene.syncMusic(); },
    say: lobbySay,
  });
}

// ── Boot ───────────────────────────────────────────────────────────────────
/* Synchronous up to the first screen, so nothing else is ever painted first
   (screen-lobby is hidden in markup for the same reason). */
function lobbyBoot() {
  try { const c = document.createElement('canvas'); lobbyWebgl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (_) { lobbyWebgl = false; }
  try { lobbyReducedData = !!(window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches); } catch (_) { lobbyReducedData = false; }
  lobbyDebug = new URLSearchParams(location.search).has('lobbydebug');
  lobbySfx = LouSfx.louCreateSfx();
  lobbyBuildSwitcher();
  lobbyLastOk = lobbyEligible();
  const first = (lobbyLastOk || lobbyCanArrive()) ? 'lounge' : 'shelves';
  if (first === 'shelves') lobbyState = LobbyRouter.lobbyReduce(lobbyState, { t: 'go', view: 'shelves' });
  showScreen(lobbyScreen(first));
  if (first === 'shelves') lobbyPresent('shelves');
  window.addEventListener('resize', lobbyOnResize);
  lobbyLoadContent().catch(e => console.warn('lobby: content did not load — ' + (e && e.message))).then(() => {
    if (lobbyState.view === 'lounge') {
      if (lobbyHost) { lobbyEnsureRoom(); lobbyApply(lobbyState, lobbyState); }
      else lobbyDispatch({ t: 'go', view: 'shelves' });   // no host: nothing to mount, so never a blank room
    }
    lobbyPaintSwitcher(lobbyState);
    window.lobbyReady = true;
    lobbyPaintPlaces();   // the stickerbook's door appears once its manifest has
  });
}
