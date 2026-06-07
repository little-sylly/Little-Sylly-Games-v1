# GM (Great Minds) — Implementation Notes

## Design Decisions

**Individual devices in multiplayer — no pass-gate**
Both players submit simultaneously on their own device. `gmStartInputPhase()` sets `gmActivePlayer = mpMyPlayerIdx` in Lobby Mode so both devices show the input screen at the same time. Firebase round-trip replaces the pass-gate + reveal-gate entirely.

**Social Override is host-only**
`btn-gm-override` is a no-op for clients — they wait for `GM_RESULT` SYNC from the host. The override overlay is shown only on the host device. The host broadcasts `GM_RESULT` with `isMatch: true`, `isOverride: true`, `overridePhrase`. Clients handle via `gmMpDisplayResult()`.

**Play-again in Lobby Mode — asymmetric**
Host confirm → `mpReturnToLobby()` (returns all devices to same-code lobby). Client confirm → `resetToLobby()` (leaves the session). This is the standard play-again pattern for all MDLM/PTP games.

**Name Persistence across games**
`gmPlayerNames[2]` survives between games (not reset by play-again). Settings and roster state persist; round state resets.

**"Two players. One match." (Phase 27 — G1)**
Changed from "Two players. One phone." in `gm-how-to-overlay`. "One match" captures both the goal (finding a match) and the MDLM mechanic (two devices, not one phone). File: `index.html`.

**[?] tip for Social Override (Phase 27 — G2)**
Added `btn-gm-override-tip` inline next to `btn-gm-override` on the result screen. Wrapped both in `flex items-center gap-2` with `flex-1` on the main button. Reuses the existing `gmShowHelpTip()` / `gm-help-tip-overlay` pattern. Tip: "Use this when one player made a typo, used a root word (e.g. 'run' / 'running'), or when you both genuinely consider it close enough to count." File: `index.html`, `js/games/great-minds.js`.

---

## Bug Index

**G3 — Button click on one device triggers screen refresh on the other in MDLM (open investigation)**
User reports: any button press in GM multiplayer causes the other player's screen to refresh/navigate. Investigation: reviewed all `mpSendEnvelope` calls in `great-minds.js` — all action buttons have correct client/host guards (`if (syllyMultiplayerMode === 'client') return`). The originId guard in `mpHandleEnvelope` (`if (env.originId === window.syllyDeviceUid) return`) should prevent self-processing. `GM_ROUND_START`, `GM_SUBMIT`, and `GM_RESULT` envelope flows all appear correctly sequenced. Could not reproduce or isolate root cause through static analysis. **Next step:** Add `console.log(env.type, env.payload.action, 'from', env.originId)` at the top of `mpHandleEnvelope` and `console.log('sending', env)` in `mpSendEnvelope` to trace which envelopes fire unexpectedly during the reported scenario. Check for Firebase `onChildAdded` replaying buffered events on re-subscription.

---

## Multiplayer Lessons

**Shared `gm-help-tip-overlay` for all contextual tips**
GM reuses `gmShowHelpTip(emoji, heading, text)` and `gm-help-tip-overlay` for all contextual `[?]` buttons. When adding new help tips, always reuse this function rather than adding new overlays. New tip buttons need only a listener registered at the bottom of the event listeners section.

**Client guard placement for result screen buttons**
All buttons on `screen-gm-result` that have host-only behaviour must have explicit `if (syllyMultiplayerMode === 'client') return;` guards, NOT `if (syllyMultiplayerMode !== 'host')` (the negative form is fragile — it guards against single-player too). Confirmed: `btn-gm-next-round` and `btn-gm-override` both use the client-guard pattern correctly.

---

## Template Gaps

**[?] placement next to action buttons**
When adding a contextual tip next to an existing full-width button, wrap the button in `<div class="flex items-center gap-2">`, add `flex-1` to the button (replaces `w-full`), and append the `[?]` button as a sibling. Don't use `w-full` on the outer div — `flex` handles expansion. This pattern was established in Phase 27 for `btn-gm-override`.

**G3 investigation pattern**
When a Firebase multiplayer sync bug is reported but cannot be isolated through static analysis, add `console.log` tracing to `mpHandleEnvelope` and `mpSendEnvelope` as first debugging step. The envelope event trail (type, action, originId, timestamp) is enough to identify spurious sends or incorrect routing. Document the tracing approach here for future use.
