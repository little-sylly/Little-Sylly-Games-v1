# SS (Secret Signals) — Implementation Notes

## Design Decisions

**Hybrid multiplayer mode**
SS supports both Individual Devices and 2-Device Teams (Zone 2 pill in host lobby, `supportsHybrid: true`). Most games are one or the other — SS is the only hybrid game in the suite.

**Team B vault security — targeted Firebase write**
Team B's vault is sent ONLY to the Client device via `SYNC: SS_VAULT_DATA` (targeted write). Team A's vault never leaves the Host. This is the one case in the codebase where targeted per-device Firebase writes are used — other games use couch security (broadcast all, render own slot only).

**Fuzzy matching — compound word handling**
`ssFuzzyMatch` is plural/singular aware and compound-word aware (hyphen/space split, ≥3 char components). Solid compounds (no separator) do NOT auto-split — store as "Weight-Lifting" to enable matching. This is SS-specific; do not apply to other games without testing.

**Customise Vault setting — curated vs full picker**
`ssCustomiseVault = false` uses a curated 10-category pool. `true` opens the full 16-category picker. Default off to prevent dead-end pairs (e.g. `pop_culture`, `brands`).

---

## Bug Index

*(No bugs logged. Add entries here as issues are found and resolved.)*

---

## Multiplayer Lessons

*(No lessons logged beyond what is in the multiplayer subsection of game-identities.md.)*

---

## Template Gaps

*(No gaps logged. Add entries here when patterns emerge that should fold into the tech template.)*
