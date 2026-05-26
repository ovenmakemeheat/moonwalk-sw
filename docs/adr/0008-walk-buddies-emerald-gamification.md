# Walk Buddies: full-colour pokeemerald re-skin + a claim-safe gamification layer

The motivational companion view (`realtime/game/`) is rebuilt as **Walk Buddies · Emerald**
(`game/emerald.html` + `emerald.js`): per-walker cards, each rendering a **full-colour Pokémon
Emerald (GBA)** Littleroot Town with a colour buddy whose mood/movement follow the live Moon Walk
Score. It **supersedes** the Game Boy monochrome-green prototype (`walkers.html`, kept on the
`prototype/walk-buddies-monochrome` branch as a fallback) and layers on the gamification mechanics the
three persona studies (elderly user · WHOOP-style PO · WHOOP-style R&D) converged on this session.

This is a **re-skin + additive mechanics layer, not an engine rewrite.** The data model, score blend,
moods, coaching, and transport stay in `game.js` (unchanged); the asset pipeline and the consumer's
tile size (8 px → 16 px metatiles) change.

**Why.**
- *Art.* The DMG-green pokered art read as "not beautiful" to the elderly target user. pokeemerald
  ships indexed PNGs + JASC-PAL palettes + small `u16` blobs, so we resolve the GBA palette
  indirection **offline** (`build-emerald-assets.py`) into flat true-colour RGBA — a colour town,
  colour front sprites, and a real berry garden — with **zero runtime palette logic** in the browser.
- *Mechanics.* All three personas agreed on a cheap, kind MVP loop: **wake-your-buddy** day cue ·
  **MOVE bar → Level Up** · **walk-day streak + show-up pins** · **arena berry garden** · **friends
  album** · an **accessibility pass**. The R&D review found the prototype's energy fill rewarded pure
  *volume*, contradicting the Score's own 45 %-quality design; we adopt its fixes (below).

## Status

accepted. `emerald.html` is the current headline build; `index.html`/`walkers.html` remain as
alternate framings on the same engine. Phase 2/3 ideas (opt-in family report card, baseline-relative
*evolution* art, decoration, non-competitive "Walk Showcase" quality ribbons, co-op, walking-buddy
overworld sprites via the pokeemerald-expansion fork) are noted but out of this scope.

## Consequences

- **Claim-safety (ADR-0005) is load-bearing on every new surface.** *Show-up* rewards (levels, walk-
  days, garden, pins) require **no comparison** — always reachable by anyone who walks. *Quality*
  inputs (the fill multiplier) compare today vs the User's **own rolling baseline**, never a population
  norm. The MOVE bar is the **buddy's** energy, never the User's vitality; copy is "smoother than last
  week," never "above average." Coaching stays opt-in (ADR-0006).
- **R&D code-gap fixes** baked into `emerald.js`: quality multiplier on fill (`0.85 + 0.15·rhythm`,
  floored — never a penalty); daily soft cap (~4 levels/day, then a "happily tired, rest sounds lovely"
  nudge); `IDLE_GRACE` 8 s → **18 s**; and a **per-user cadence target** learned from the User's own
  baseline median, replacing the fixed `CAD_TARGET=55` (a fixed bar is a covert population norm — an
  ADR-0005 violation).
- **Kindness rules:** levels never decrease; the walk-day streak is an additive lifetime counter that
  never "breaks"; the garden never wilts; rest is celebrated. No timers, FOMO, red warnings, or
  leaderboards.
- **Pipeline.** `build-emerald-assets.py` reads the **read-only** pokeemerald clone and emits
  `assets-emerald/` (metatile atlas with frame index == metatile id, `{wTiles,hTiles,tiles,walkable}`
  map JSON, 12 sprites, 3 emotes, 5-stage `garden.png`). The map contract is identical to the pokered
  build, so the consumer logic barely changed.
- **North-Star = Weekly Active Walk-Days per User** (a pure behaviour count, claim-safe).
  Improvement-in-Score is deliberately **not** a KPI (a medical-claim trap).
- **Licensing.** pokeemerald is a Nintendo/Game Freak decomp — fine for an internal demo; commission
  original art before any public/commercial release (same posture as the pokered assets, [ADR-0005]).

[ADR-0005]: ./0005-wellness-positioning-and-claim-safety-vocabulary.md
