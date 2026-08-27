# Per-Game Class Strings — Little Sylly Games

**On-demand — NOT auto-loaded.** Split out of `.claude/rules/ui-style.md` on 19 Aug 2026 because it
is pure per-game lookup: ~2.3k tokens every session paid, including the many that touch no UI. The
rules that *use* these values stay in `ui-style.md`; only the values live here.

**Read when:** building or editing any game's UI and you need its exact class strings. For brand
colour + active pill alone, `CLAUDE.md` § Per-Game Quick Index already lists all 18 games and is
always loaded — come here for the range/toggle/CTA/label/tint strings it doesn't carry.

**Adding a game = three rows** (one per table). Notes stay with their own rules in `ui-style.md`.

---

### Table A — Brand colour and the four themed classes

| Game | Brand colour | Range (`updateSliderTheme`) | Toggle ON (`getMuteToggleOnClass`) | Active pill |
|------|-------------|------------------------------|-------------------------------------|-------------|
| None / lobby | neutral stone | `stone-range` | `game-toggle-on-stone` | — |
| LI5 | pink-500 | `li5-range` | `game-toggle-on-pink` | `pill-active-pink` |
| GM | violet-500 CTAs / purple-* pills | `sylly-range` | `game-toggle-on-purple` | `pill-active-purple` |
| SS | teal-500 | `ss-range` | `game-toggle-on-teal` | `pill-active-teal` |
| JEC | amber-500 | `jec-range` | `game-toggle-on-amber` | `pill-active-amber` |
| YGI | orange-500 | `ygi-range` | `game-toggle-on-orange` | `pill-active-orange` |
| LTTP | red-500 | `lttp-range` | `game-toggle-on-red` | `pill-active-red` |
| NAT | lime-600 | `nat-range` | `game-toggle-on-lime` | `pill-active-lime` |
| DSD | cyan-700 | `dsd-range` | `game-toggle-on-cyan` | `pill-active-cyan` |
| GTH | `#B1BCA0` sage (custom) | `gth-range` | `game-toggle-on-sage` | `pill-active-sage` |
| DYB | `#1E4D8C` ocean (custom) | `dyb-range` | `game-toggle-on-dyb` | `pill-active-dyb` |
| BLD | `#991b1b` dark red (red-800, custom) | `bld-range` | `game-toggle-on-bld` | `pill-active-bld` |
| PASS | zinc-900 | `pass-range` | `game-toggle-on-zinc` | `pill-active-zinc` |
| NT | emerald-500 | `nt-range` | `game-toggle-on-emerald` | `pill-active-emerald` |
| FRT | `#FFE500` electric lemon (custom) | `frt-range` | `game-toggle-on-frt` | `pill-active-frt` |
| SHP | `#3A3D52` midnight (custom) | `shp-range` | `game-toggle-on-shp` | `pill-active-shp` |
| FLW | `#E879A8` rose-pink (custom) | `flw-range` | `game-toggle-on-flw` | `pill-active-flw` |
| PKO | `#854D0E` (custom) | `pko-range` | `game-toggle-on-pko` | `pill-active-pko` |
| CJAR | `#D4A017` honey-gold (custom) | `cjar-range` | `game-toggle-on-cjar` | `pill-active-cjar` |

`sylly-range` is GM's alone — it predates the `[abbr]-range` convention every other game follows. Never reuse it.
Gradient values live on each `.[abbr]-range` rule in `css/styles.css`.

### Table B — Game-voiced strings

| Game | Play CTA (menu) | How-to emoji | Sylly Mode name |
|------|-----------------|--------------|-----------------|
| LI5 | Play Time! | 💬 | Extra Credit |
| GM | Begin Link | 🧠 | Static Interference |
| SS | Start Mission | 📡 | Intel Phase |
| JEC | Let's Cook! | 🍳 | Fusion Cuisine |
| YGI | Let's Get To It! | 🃏 | The Ringer |
| LTTP | Find The Location! | 🏃‍♂️ | The Troublemaker † |
| NAT | Begin Observation | 🦁 | Survival of the Fittest |
| DSD | Begin Deployment | ⚓ | Silent Running |
| GTH | Start the Session | 🛋️ | Stroke or Genius |
| DYB | Let's Play! | 🎲 | The Tempest |
| BLD | Make the Plans | 📋 | Drama Mode |
| PASS | Deal Me In | 🃏 | The Abyss |
| NT | Initialise System | ⚡ | Devil's Network Protocol |
| FRT | Start Serving | 🍌 | Fruity Personalities |
| SHP | Lights Out | 🐑 | Night Terrors |
| FLW | Enter the Exhibition | 💎 | The Counterfeit Run |
| PKO | Enter the Wild | 🐘 | Force of Nature |
| CJAR | Raid the Jar! | 🍪 | Dibber Dobber |

**†  Resolved 1 Aug 2026 — LTTP's Sylly Mode is real and shipped.** The How-to Standard's old parenthetical
("omit for LTTP which has none") was wrong and has been corrected. Verified in code: `lttpJokerMode`, the
`The Troublemaker` role with 2 decoys, and three-way scoring (`lttp.js`; settings + how-to cards in `index.html`).
**Every game in Table B has a Sylly Mode** — there is no exception.

### Table C — Brand class strings

The how-to **close button is always the game's `accentBtnClass`**, so it no longer has its own column. The
**step label** does keep one — it is usually the -500 shade where `accentTextClass` is -600.

| Game | `accentBtnClass` (= how-to close) | `accentTextClass` | How-to step label | Settings button (light tint) |
|------|-----------------------------------|-------------------|-------------------|------------------------------|
| LI5 | `bg-pink-500 hover:bg-pink-600` | `text-pink-600` | `text-pink-500` | `bg-pink-100 hover:bg-pink-200 text-pink-700` |
| GM | `bg-purple-500 hover:bg-purple-600` | `text-purple-600` | `text-purple-500` | `bg-purple-100 hover:bg-purple-200 text-purple-700` |
| SS | `bg-teal-500 hover:bg-teal-600` | `text-teal-600` | `text-teal-500` | `bg-teal-100 hover:bg-teal-200 text-teal-700` |
| JEC | `bg-amber-500 hover:bg-amber-600` | `text-amber-600` | `text-amber-500` | `bg-amber-100 hover:bg-amber-200 text-amber-700` |
| YGI | `bg-orange-500 hover:bg-orange-600` | `text-orange-600` | `text-orange-500` | `bg-orange-100 hover:bg-orange-200 text-orange-700` |
| LTTP | `bg-red-500 hover:bg-red-600` | `text-red-600` | `text-red-500` | `bg-red-100 hover:bg-red-200 text-red-700` |
| NAT | `bg-lime-600 hover:bg-lime-700` | `text-lime-700` | `text-lime-600` | `bg-lime-100 hover:bg-lime-200 text-lime-700` |
| DSD | `bg-cyan-700 hover:bg-cyan-800` | `text-cyan-700` | `text-cyan-700` | `bg-cyan-100 hover:bg-cyan-200 text-cyan-700` |
| GTH | inline `style="background-color:#B1BCA0"` | — | inline `style="color:#B1BCA0"` | inline `style="background-color:#e8ede3;color:#6b7a5f"` |
| DYB | `dyb-cta` | `dyb-label` | `dyb-label` | `bg-[#dce8f7] hover:bg-[#c8daf0] text-[#1E4D8C]` |
| BLD | `bld-cta` | `bld-label` | `bld-label` | `bg-red-100 hover:bg-red-200 text-red-700` |
| PASS | `bg-zinc-900 hover:bg-zinc-800` | `text-zinc-900` | `text-zinc-700` | `bg-zinc-100 hover:bg-zinc-200 text-zinc-700` |
| NT | `bg-emerald-500 hover:bg-emerald-600` | `text-emerald-600` | `text-emerald-600` | `bg-emerald-100 hover:bg-emerald-200 text-emerald-700` |
| FRT | inline `style="background:#FFE500"` § | inline `text-[#047857]` | inline `style="color:#047857"` | `bg-[#FFF4CC] hover:bg-[#FFF3A6] text-[#854d0e]` |
| SHP | `shp-cta` | — | `shp-label` | `bg-[#E6E7EE] hover:bg-[#C9CBDA] text-[#3A3D52]` |
| FLW | `flw-cta` | — | `flw-step-label` | `bg-[#A02050] hover:bg-[#7A1A3E] text-white` ¶ |
| PKO | `pko-cta` | — | `pko-label` | `bg-[#F5E6C8] hover:bg-[#EBD5A8] text-[#854D0E]` |
| CJAR | `cjar-cta` ‡ | — | `cjar-label` | `bg-[#F7E9C4] hover:bg-[#EFDCA8] text-[#7A5C0A]` |


**‡ CJAR takes dark ink, never white.** `.cjar-cta` supplies `color:#292524` itself — never add a
Tailwind `text-white` alongside it; `MP_GAME_CONFIGS` sets `ctaTextClass: 'text-stone-800'` for the
same reason. Labels use the darkened `#7A5C0A` (raw `#D4A017` on `bg-stone-50` is itself under 3:1).
Modal border `border-[#E5C97A]`. FRT is the same dark-ink case — see §.

**§ FRT's how-to close button is the one exception** — `bg-[#FFE500] hover:bg-[#E6D200] text-stone-800`,
same colour as utilities.

**¶ FLW's Settings/Audit/readyCheck buttons deliberately invert the light-tint convention** —
`#A02050` fill + white text instead of the usual `bg-[brand-100] text-[brand-700]` pastel. The
primary CTA/pills/toggle-ON (and the lobby's `#btn-flw` tile) are `#F9A8D4` fill + white text.
Measured contrast is low (~1.8:1) — a deliberate, owner-confirmed call, **not** an oversight to
"fix", and **not** to be generalised to other games' Settings buttons.

A `—` in the `accentTextClass` column means the game never calls `showWhoFirst()` (GTH, FLW, PKO,
SHP, CJAR). Don't invent one.

Rationale behind the ‡ § ¶ exceptions: `docs/decision-log.md` 2026-08-02 (BLD/FRT recoloured off
yellow, with the measured contrast figures) and 2026-08-15 (FLW). FLW's six-pass settlement is
`docs/sw-changelog.md` v189 and `docs/implementation-notes/flw-implementation-notes.md`.
