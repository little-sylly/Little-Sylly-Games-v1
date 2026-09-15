#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// build-games.js — regenerates games.json from the SHIPPED APP, not from
// memory or paraphrase. Every field here traces to a real file:line, printed
// in each entry's `_sources` block, so games.json can be regenerated at any
// point and never drifts from what index.html actually says.
//
// Sources, per field:
//   id/emoji/brandHex   — index.html lobby buttons + GAME_BRAND_HEX (engine.js)
//   minPlayers/maxPlayers/supportedModes/gameName
//                       — MP_GAME_CONFIGS (engine-multiplayer.js) — the ONE
//                         machine-authoritative source; these are asserted
//                         live by tools/verify-mp-configs.js
//   pitch               — docs/game-identities/[abbr].md, the `screen-[abbr]-menu`
//                         copy block's subtitle line (the line 2 before the
//                         literal "How to Play" button label — robust to
//                         1-line vs 2-line titles). This is the exact string
//                         shown on the live game menu screen, not paraphrase.
//                         Verified against the shipped app by
//                         tools/verify-identity-docs.js.
//   syllyModeName        — docs/game-identities/[abbr].md T8, first bold line.
//                         NT is a hand override — see NT_SYLLY_OVERRIDE below.
//   howToSteps (raw)     — docs/game-identities/[abbr].md how-to-overlay
//                         "steps" copy block, verbatim. NOT condensed to 3 —
//                         that is an editorial pass done by a human afterward
//                         (see games.js), not safe to automate.
//   minutes              — NOT extracted. T1 is free-form prose (§ the game
//                         identity doc's own free/paired/derived contract)
//                         and only ~7 of 20 games state a number at all. This
//                         script deliberately emits `minutes: null` rather
//                         than inventing precision the source doesn't have —
//                         the mockup's own open-questions list flags "~9
//                         games are my paraphrase" as exactly this problem.
//                         Filled in by hand afterward, sourced per-game.
//
// Usage: node build-games.js   (run from anywhere; paths are repo-relative)
// Output: games.raw.json next to this script — the unedited extraction.
//         games.js (hand-curated: minutes + 3-step "how it goes" + shelves)
//         is a SEPARATE, manually-maintained file — never overwritten by
//         this script. Diff games.raw.json against games.js's machine
//         fields after any identity-doc or engine change.
// ═══════════════════════════════════════════════════════════════════════════
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const IDENTITY_DIR = path.join(ROOT, 'docs', 'game-identities');

// ── 1. GAME_BRAND_HEX + lobby button → id/emoji/hex ────────────────────────
// index.html's lobby buttons are the display source; GAME_BRAND_HEX (engine.js)
// is the colour source. Both keyed on the same '#btn-[id]'/'btn-[id]' pattern.
function extractBrandHex() {
  const engineSrc = fs.readFileSync(path.join(ROOT, 'js', 'engine.js'), 'utf8');
  const start = engineSrc.indexOf('const GAME_BRAND_HEX');
  const end   = engineSrc.indexOf('};', start);
  const body  = engineSrc.slice(start, end);
  const hex = {};
  for (const m of body.matchAll(/'btn-([\w-]+)':\s*'(#[0-9A-Fa-f]{6})'/g)) {
    hex[m[1]] = m[2];
  }
  return hex;
}

function extractLobbyButtons() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const listStart = html.indexOf('id="lobby-game-list"');
  const listEnd   = html.indexOf('</section>', listStart);
  const body = html.slice(listStart, listEnd);
  const buttons = [];
  // Match each <button id="btn-XXX" ...>...<label>NAME</label>...<badge>EMOJI</badge>...</button>
  const btnRe = /<button id="btn-([\w-]+)"[^>]*>[\s\S]*?<span class="lobby-btn-label">([^<]+)<\/span><span class="lobby-btn-badge"[^>]*>([^<]+)<\/span>/g;
  let m;
  while ((m = btnRe.exec(body))) {
    buttons.push({ id: m[1], displayName: m[2], emoji: m[3] });
  }
  return buttons;
}

// A game with no getMinPlayers at all falls back to the engine's own default
// minimum, which is 2 for every existing MP_GAME_CONFIGS entry (verified by
// reading li5/gm — the two TLM-fixed-2-team games — which set no
// getMinPlayers because 2 is a fixed team count, not a range).
const ENGINE_DEFAULT_MIN = 2;

// Six games' bounds legitimately branch on window.mpLobbyStyle or a pre-lobby
// setting (logic-engine.md § MP_GAME_CONFIGS — the only sanctioned
// non-constant inputs). Resolved by hand from the source, not regex, because
// a conditional bounds parser is exactly the kind of over-clever code that
// silently mis-reads the ONE thing this script exists to get right.
// Traced 15 Sep 2026 against js/engine-multiplayer.js:
const BOUNDS_OVERRIDE = {
  // Fixed 2-team games — no min fn (defaults to 2), max is always 2.
  gm:  { minPlayers: 2, maxPlayers: 2, display: 'exactly 2' },
  li5: { minPlayers: 2, maxPlayers: 2, display: 'exactly 2 teams' },
  // TLM (2 devices, couch teams) vs MDLM branch on window.mpLobbyStyle.
  ss:  { minPlayers: 2, maxPlayers: 6, display: '2 (TLM) or 4–6 (MDLM)' },
  dsd: { minPlayers: 2, maxPlayers: 6, display: '2 (TLM) or 4–6 (MDLM)' },
  // Pre-lobby setting branch (frtPearOff / cldPeckOff) — both sanctioned by
  // logic-engine.md as the one legitimate non-constant lobby-bound input.
  frt: { minPlayers: 2, maxPlayers: 8, display: '2 (Pear-Off) or 3–8' },
  cld: { minPlayers: 2, maxPlayers: 8, display: '2 (Peck Off) or 3–8', },
};

// ── 2. MP_GAME_CONFIGS → bounds, modes, gameName (asserted by verify-mp-configs.js) ──
function extractMpConfigs() {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'engine-multiplayer.js'), 'utf8');
  const tableStart = src.indexOf('const MP_GAME_CONFIGS');
  const tableEnd   = src.indexOf('\n};', tableStart) + 3;
  const body = src.slice(tableStart, tableEnd);

  // Split into top-level `key: { ... }` blocks by brace depth.
  const blocks = {};
  const keyRe = /^\s{2}([\w-]+):\s*\{/gm;
  let m;
  const starts = [];
  while ((m = keyRe.exec(body))) starts.push({ key: m[1], idx: m.index, braceIdx: m.index + m[0].length - 1 });
  for (let i = 0; i < starts.length; i++) {
    const { key, braceIdx } = starts[i];
    let depth = 1, j = braceIdx + 1;
    while (depth > 0 && j < body.length) {
      if (body[j] === '{') depth++;
      else if (body[j] === '}') depth--;
      j++;
    }
    blocks[key] = body.slice(braceIdx, j);
  }

  const SKIP = new Set(['ptp', 'tlm', 'mdlm']); // mode-metadata, not games
  const out = {};
  for (const [abbr, blk] of Object.entries(blocks)) {
    if (SKIP.has(abbr)) continue;
    const gameName = (blk.match(/gameName:\s*"([^"]+)"/) || blk.match(/gameName:\s*'([^']+)'/) || [,null])[1];
    const emoji    = (blk.match(/emoji:\s*'([^']+)'/) || [,null])[1];
    const supportedModesRaw = (blk.match(/supportedModes:\s*\[([^\]]*)\]/) || [,''])[1];
    const supportedModes = [...supportedModesRaw.matchAll(/'([^']+)'/g)].map(x => x[1]);
    const multiplayerOnly = /multiplayerOnly:\s*true/.test(blk);
    // getMinPlayers / getMaxPlayers are functions. Most are `() => N` — pull
    // the literal. Six games branch on window.mpLobbyStyle or a pre-lobby
    // setting (per logic-engine.md § MP_GAME_CONFIGS — the ONLY legitimate
    // non-constant inputs) and get a hand-resolved override below instead of
    // a fragile conditional-parsing regex.
    const minLiteral = blk.match(/getMinPlayers:\s*\(\)\s*=>\s*(\d+)\b/);
    const maxLiteral = blk.match(/getMaxPlayers:\s*\(\)\s*=>\s*(\d+)\b/);
    const hasMinFn = /getMinPlayers:/.test(blk);
    const hasMaxFn = /getMaxPlayers:/.test(blk);
    const override = BOUNDS_OVERRIDE[abbr];
    out[abbr] = {
      gameName,
      emoji,
      supportedModes,
      multiplayerOnly,
      minPlayers: override ? override.minPlayers : (minLiteral ? Number(minLiteral[1]) : (hasMinFn ? null : ENGINE_DEFAULT_MIN)),
      maxPlayers: override ? override.maxPlayers : (maxLiteral ? Number(maxLiteral[1]) : (hasMaxFn ? null : null)),
      playerRangeDisplay: override ? override.display : null, // human string when conditional
      _boundsNeedsHumanCheck: !override && ((hasMinFn && !minLiteral) || (hasMaxFn && !maxLiteral)),
    };
  }
  return out;
}

// ── 3. Identity doc copy blocks → pitch (menu subtitle) + Sylly Mode + raw steps ──
function parseCopyBlocks(mdText) {
  // Returns { label: [lines...] } for every ```copy fenced block.
  // Two of the 20 identity docs (cjar.md, comb.md) are CRLF, the rest LF —
  // normalise before matching or the \n right after ```copy never lines up.
  mdText = mdText.replace(/\r\n/g, '\n');
  const blocks = {};
  const re = /```copy\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(mdText))) {
    const lines = m[1].replace(/\r/g, '').split('\n');
    // Drop trailing blank line from the fence.
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    const label = lines[0].replace(/^#\s*/, '');
    blocks[label] = lines.slice(1);
  }
  return blocks;
}

function extractMenuPitch(blocks) {
  // Find the block whose label matches screen-[abbr]-menu or (LI5) screen-menu.
  const key = Object.keys(blocks).find(k => /^screen-[\w-]*menu$/.test(k));
  if (!key) return { pitch: null, menuTitleLines: null };
  const lines = blocks[key];
  const howToIdx = lines.findIndex(l => l.trim() === 'How to Play');
  if (howToIdx < 2) return { pitch: null, menuTitleLines: lines.slice(0, 2) };
  const pitch = lines[howToIdx - 2];
  const playCta = lines[howToIdx - 1];
  const titleLines = lines.slice(0, howToIdx - 2);
  return { pitch, playCta, menuTitleLines: titleLines };
}

function extractSyllyModeName(mdText, abbr) {
  // T8 heading's first non-blank line, bold-wrapped: **Name.** description...
  const t8 = mdText.match(/^## T8[\s\S]*?\n\n([\s\S]*?)\n\n/m);
  if (!t8) return null;
  const firstLine = t8[1].split('\n')[0];
  const bold = firstLine.match(/^\*\*([^*]+?)\.?\*\*/);
  return bold ? bold[1] : null; // null → needs a hand override (see NT)
}

// 11 of 20 docs (bld, cjar, cld, comb, dyb, flw, frt, nt, pass, pko, shp) keep
// a clean heading-only array in their "steps" copy block. The other 9 (dsd,
// gm, gth, jec, li5, lttp, nat, ss, ygi) combine the ENTIRE how-to body into
// one block: "Step N" markers, each step's heading AND prose, then Winning
// and Scoring, the Sylly Mode card, and the "Got it" button — all as one
// flat line list. condenseHowItGoes() extracts just the per-step HEADINGS
// (the short line right after each "Step N" marker, or — for the clean
// arrays — the headings up to "Winning and Scoring") so both shapes reduce
// to the same 2–4 short phrases. Capped at 3 for a tile/sheet "how it goes"
// preview; a game with more real steps than that needs a human pick, not an
// automatic truncation — flagged via `_howItGoesNeedsReview`.
function condenseHowItGoes(rawLines) {
  if (!rawLines || !rawLines.length) return { steps: [], needsReview: true };

  const hasStepMarkers = rawLines.some(l => /^Step \d+$/.test(l));
  let steps = [];

  if (hasStepMarkers) {
    // Combined-block shape: "Step N" / heading / prose... / "Step N+1" / heading / prose...
    for (let i = 0; i < rawLines.length; i++) {
      if (/^Step \d+$/.test(rawLines[i]) && rawLines[i + 1]) {
        steps.push(rawLines[i + 1]);
      }
    }
  } else {
    // Clean heading-array shape: take everything up to "Winning and Scoring".
    const cutIdx = rawLines.findIndex(l => l.trim() === 'Winning and Scoring');
    steps = cutIdx === -1 ? rawLines.slice() : rawLines.slice(0, cutIdx);
    // A few clean arrays still end with 1-2 lines of prose fragments rather
    // than short headings (dsd's is actually combined-shape and caught
    // above; this branch is genuinely clean for all 11 games it covers as
    // of 15 Sep 2026 — verified by eye against games.raw.json).
  }

  const needsReview = steps.length === 0 || steps.length > 4;
  return { steps: steps.slice(0, 3), needsReview, totalRealSteps: steps.length };
}

function extractHowToStepsRaw(blocks) {
  // Label wording varies across the 20 docs: "steps", "step headings",
  // "step headings and bodies", "steps and legend" — match the stem "step"
  // (singular), not "steps", or CLD/CJAR/COMB/JEC/PKO's "step headings" (no
  // trailing s before the space) are silently missed.
  const key = Object.keys(blocks).find(k => /how-to-overlay.*step/i.test(k));
  return key ? blocks[key] : null;
}

function extractHowToTitle(blocks) {
  const key = Object.keys(blocks).find(k => /how-to-overlay.*title/i.test(k));
  if (!key) return null;
  const lines = blocks[key];
  return { heading: lines[0], subtitle: lines[1] || null };
}

// Games whose Sylly Mode doesn't follow the single-bold-name T8 opener.
const SYLLY_NAME_OVERRIDE = {
  nt:   'Distributed Network Protocol', // real toggle label, ntsettings copy block
  comb: null,                            // the one game with NO Sylly Mode (by design)
};

// ── Run ──────────────────────────────────────────────────────────────────
function main() {
  const brandHex = extractBrandHex();
  const lobbyButtons = extractLobbyButtons();
  const mpConfigs = extractMpConfigs();

  const idFiles = fs.readdirSync(IDENTITY_DIR).filter(f => f.endsWith('.md'));
  const games = [];
  const warnings = [];

  for (const file of idFiles) {
    const abbr = path.basename(file, '.md');
    // Normalise CRLF once, here, for every consumer below — cjar.md and
    // comb.md are CRLF, the other 18 are LF (see parseCopyBlocks' note).
    const mdText = fs.readFileSync(path.join(IDENTITY_DIR, file), 'utf8').replace(/\r\n/g, '\n');
    const blocks = parseCopyBlocks(mdText);

    const { pitch, playCta, menuTitleLines } = extractMenuPitch(blocks);
    const howToTitle = extractHowToTitle(blocks);
    const howToStepsRaw = extractHowToStepsRaw(blocks);
    const syllyModeName = abbr in SYLLY_NAME_OVERRIDE
      ? SYLLY_NAME_OVERRIDE[abbr]
      : extractSyllyModeName(mdText, abbr);

    // Cross-reference with MP_GAME_CONFIGS by lobby button id. LI5's internal
    // id is 'dstw' (legacy — see definitions.md), SS's is 'sylly-signals'.
    const idAliasToMp = { dstw: 'li5', 'sylly-signals': 'ss', 'great-minds': 'gm' };
    const btn = lobbyButtons.find(b => b.id === abbr || idAliasToMp[b.id] === abbr
      || b.displayName.toLowerCase().replace(/[^a-z]/g, '') === '' /* never true, placeholder */);
    // Fall back: match by MP config key directly since mpConfigs is keyed by abbr already.
    const mp = mpConfigs[abbr] || null;
    const lobbyBtn = lobbyButtons.find(b => (idAliasToMp[b.id] || b.id) === abbr);

    if (!pitch) warnings.push(`${abbr}: no menu pitch line found (copy block missing or malformed)`);
    if (!mp) warnings.push(`${abbr}: no MP_GAME_CONFIGS entry matched`);
    if (mp && mp._boundsNeedsHumanCheck) warnings.push(`${abbr}: min/max players not a simple literal — verify by hand`);
    if (!lobbyBtn) warnings.push(`${abbr}: no lobby button matched in index.html`);
    if (!syllyModeName && abbr !== 'comb') warnings.push(`${abbr}: no Sylly Mode name extracted — needs an override`);

    games.push({
      id: abbr,
      gameName: mp?.gameName || lobbyBtn?.displayName || null,
      emoji: lobbyBtn?.emoji || mp?.emoji || null,
      brandHex: brandHex[lobbyBtn?.id || abbr] || null,
      minPlayers: mp?.minPlayers ?? null,
      maxPlayers: mp?.maxPlayers ?? null,
      playerRangeDisplay: mp?.playerRangeDisplay || null, // set only for the 6 conditional-bounds games
      supportedModes: mp?.supportedModes || null,
      multiplayerOnly: mp?.multiplayerOnly ?? null,
      pitch: pitch || null,               // verbatim menu-screen subtitle
      playCtaLabel: playCta || null,
      howToTitle: howToTitle,             // { heading, subtitle }
      howToStepsRaw: howToStepsRaw,       // raw step headings, NOT condensed
      howItGoes: condenseHowItGoes(howToStepsRaw), // { steps[≤3], needsReview, totalRealSteps }
      syllyModeName: syllyModeName,       // null only for COMB (has none)
      minutes: null,                      // deliberately unfilled — see header
      _sources: {
        identityDoc: `docs/game-identities/${abbr}.md`,
        mpConfig: `js/engine-multiplayer.js MP_GAME_CONFIGS.${abbr}`,
        lobbyButton: lobbyBtn ? `index.html #btn-${lobbyBtn.id}` : null,
      },
    });
  }

  games.sort((a, b) => a.id.localeCompare(b.id));

  const outPath = path.join(__dirname, 'games.raw.json');
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), games }, null, 2));

  console.log(`Wrote ${games.length} games to ${path.relative(ROOT, outPath)}`);
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    warnings.forEach(w => console.log('  - ' + w));
  } else {
    console.log('No warnings.');
  }
}

main();
