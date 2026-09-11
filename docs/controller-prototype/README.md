# 3D Controller — prototype reference

**Frozen reference material. Nothing here is fetched at runtime and nothing here should be edited
again.** The live code lands at `js/lib/controller-body.js`, `js/lib/three.min.js` and
`js/controller.js` — see `docs/superpowers/specs/2026-09-11-controller-integration-design.md`.

| File | What it is |
|------|-----------|
| `controller-handoff-v3.md` | The prototype session's handoff — **read § 3 before touching rotation, distortion or the live preview**, and § 5 for the gotchas. The only record of three non-obvious fixed bugs. |
| `body.js` | Geometry builders (`buildBody`, `buildControls`, `buildEars`, `smoothNormals`). Takes `THREE` as a parameter. Vendored into `js/lib/controller-body.js` — **this copy is the ancestor, not the source of truth, once that lands.** |
| `sticker-surface.js` | The sticker placement/atlas engine. Not used by the colour-only Workshop; enters the project with the sticker sub-project. |
| `standalone.html` | Full prototype, 690 KB — the test stickers are embedded as data URIs. Use this one to *run* the prototype. |
| `standalone-stickerless.html` | Same app, 122 KB, with `SRC = {}` — the sticker data URIs stripped out. Use this one to *read* the code; it is the copy the integration spec quotes line numbers from. |
| `stickers/` | The prototype's five test stickers, at the sizes embedded in `standalone.html`. Reference only — the live sticker dump folder is `data/stickers/`. |

Both HTML files load Three.js from cdnjs, which is why neither can ship as-is: the app has zero
runtime third-party dependencies. Vendoring Three locally is decision § 4.1 of the spec.
