# Arcade workshop archive

Superseded files from the arcade's offline build phase, kept for reference. **Nothing here ships** —
no `<script src>`, no `sw.js` entry, nothing fetches it. The live cabinets are the seven `.js` files
in the parent folder; their registration is `SM_ARCADE` in `js/secret-mode.js` (see
`docs/code-map.md` § Arcade Cabinets).

| File | What it is |
|------|-----------|
| `asherplane-classic.js` | ASHERPLANE v1 — the cars/trains-in-space version, replaced by the Oct 2026 sky-and-sea revamp. Was `asherplane_old.js`. |
| `arcade-bench.html` | The standalone test bench (~530 KB). A lobby listing every cabinet plus stand-ins for `showScreen` / `resetToLobby` / `playSecretBeep`, with **every cabinet's code pasted inline** so it ran anywhere — including the Claude app preview and a phone-test link — while the folder was not linked to this repo. Superseded by the real app: the cabinets now load from `js/arcade/*.js` and the inline copies here are frozen at 18 Oct 2026. |
| `arcade-workshop-notes.md` | The workshop's own conventions and per-cabinet notes (was `CLAUDE.md`). **Still the best description of what each cabinet *is*** — mechanics, powerups, bosses, the words each one uses — since cabinets get no identity doc. |
| `arcade-offline-brief.md` | A self-contained copy of those conventions plus code skeletons, used to build a cabinet in a chat with no access to this folder (was `CLAUDE-OFFLINE.md`). **Superseded — use `js/arcade/arcade-cabinet-prompt.md` instead.** Its "Migrating back in" steps describe the old bench workflow (inline code in `index.html`, an "Up next"/"Playable" lobby) and its skeleton tells you to wire the teardown by editing `engine.js` by name, which is no longer how it works. Kept only as the historical record. |

## Why the two notes files were renamed

They were `CLAUDE.md` and `CLAUDE-OFFLINE.md`. A nested `CLAUDE.md` is auto-discovered as project
instructions by Claude Code, so leaving it in a subfolder of a live repo meant bench-only conventions
(an inline-code-in-`index.html` rule, `_archive/` paths that never existed here) could load as if they
governed production. Renamed rather than deleted — the content is still the per-cabinet reference.

## Where the live rules are

Building another cabinet **offline** (no repo attached): `js/arcade/arcade-cabinet-prompt.md` — the
current, corrected, self-contained prompt. Paste it whole into the chat.

Building one **here**: `docs/code-map.md` § Arcade Cabinets for the seams, this folder's
`arcade-workshop-notes.md` § Rules for every cabinet for the house style, and
`docs/superpowers/specs/2026-08-03-arcade-asherplane*.md` for the original spec. Then
`node tools/verify-arcade.js`.
