// Little Sylly Games — Bootstrapper
// Load order: engine.js → li5.js → great-minds.js → secret-signals.js → jec.js → secret-mode.js → app.js
// No logic lives here. All game logic is in the files above.

// The lobby's first screen — synchronous, at the end of the last script, so no
// other screen is ever painted first (js/lobby/lobby-host.js, spec § 5).
lobbyBoot();
