# Widescreen round (archived, 26 Sep 2026)

The three widescreen designs — A · Bench, B · Paint Shop, C · Craft Mat — as reviewed.
**B was signed off and shipped at SW v234** (`#screen-workshop`, `css/workshop.css`); see
`docs/implementation-notes/shared-implementation-notes.md` DD-45.

Kept for the record and the shots only. **It no longer runs:** its painter overrides
`ctlRenderPanel` and calls `ctlOpenStickersTab` / `ctlActiveTab`, which the v234 port removed.
The live lab one folder up boots the shipped partial instead; B at widescreen is simply the
real screen there, at a wide frame.
