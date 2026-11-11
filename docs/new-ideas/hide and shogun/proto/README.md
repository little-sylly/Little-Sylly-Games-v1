# Hide and Shogun alpha prototype

Open `hide-and-shogun-alpha-standalone.html` in any browser (works offline except for the two Google fonts, which fall back to system fonts). `hide-and-shogun-alpha.html` is the same page without the document wrapper, for publishing as an Artifact.

Files
- `engine.js`  rules engine and bots only (no DOM), a port of `../sim/hsg_sim.py`. This is the block to lift into the suite later.
- `ui_template.html`  the screen. `build.py` inlines `engine.js` into it and writes the two html files. Edit these two, then run `python3 build.py`.
- `engine_tests.js`  the scenarios from `../sim/test_engine.py` (Sample A, C1-C4, Ronin, Gunner 2-3, capture matrix, Guard, hire cap, Shogun's Shame, Long Night, Surrounded). `node engine_tests.js`
- `parity_test.js` + `export_parity.py`  move-by-move comparison with the Python engine: `python3 export_parity.py && node parity_test.js parity.json`
- `batch_test.js`  bot-vs-bot batches: `node batch_test.js 2000`

Playtest data is kept in the browser's local storage (this device only) and exported from Log, Playtest log as JSON or CSV.

v4 prototype changes: Campaign with Honour Seals (first to 1 / 3 / 5, default 3; alternating Vanguard; a Truce is replayed), full piece names on the tiles, Shogun's Shame (5) and the Long Night (12) fixed rather than settings, Ronin replacing the Ashigaru. The playtest log record version is `hsg-alpha-2` (adds a `campaign` block: battle number, Seal awarded, Seal totals, Campaign winner); older `hsg-alpha-1` rows are kept and still export.
