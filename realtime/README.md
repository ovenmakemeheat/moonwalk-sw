# Moon Walk — real-time multi-walker demo

Live IMU from each **Nano 33 BLE** → a **Python BLE hub** → one **local WebSocket** →
the **dashboard**, which plots every walker in real time and compares them side by side.
Architecture per [ADR-0007](../docs/adr/0007-local-websocket-transport-for-dashboard-demo.md):
gait data stays local; nothing goes to the cloud.

```
Nano-A ┐
Nano-B ┼─BLE→  hub.py  ─ws://localhost:8765→  dashboard.html
Nano-C ┘       (derives cadence)               (live charts)
```

## Run it now — no hardware (simulated walkers)

```bash
cd realtime
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python hub.py --simulate 3          # 3 synthetic walkers (A,B,C)
```

Then open `dashboard.html` in Chrome/Edge (just double-click, or `open dashboard.html`).
It auto-connects to `ws://localhost:8765`; three walkers appear and the charts move.
The synthetic feed is a gyro sine at a known cadence — the **same** Stick-Cycle detector
runs on it, so the pipeline is real even though the data is fake.

## Run it live (Nano 33 BLE)

1. **Flash the firmware** — open `firmware/moonwalk_nano33ble/moonwalk_nano33ble.ino`
   in the Arduino IDE, install libraries **ArduinoBLE** and **Arduino_LSM9DS1**, and set a
   **unique** `DEVICE_NAME` per board (`MoonWalk-A`, `MoonWalk-B`, …). Upload one per walker.
2. **Run the hub in BLE mode:**
   ```bash
   python hub.py --ble
   ```
   It scans for every `MoonWalk-*` in range, connects, and streams. macOS will prompt for
   Bluetooth permission the first time.
3. **Open `dashboard.html`** — same as above. Walkers appear as each Nano connects.

## What the dashboard shows

- **Live signal** — raw gyro swing per walker (proof the sensor is really streaming).
- **Live cadence comparison** — cadence over the last 30 s, one line per walker.
- **Leaderboard** — current cadence, all walkers, live.
- **Training Mode** — pick a walker; a gauge + Coaching Cue (voice / vibration / LED)
  guides them toward their own target rhythm. Opt-in coaching, **not** therapy ([ADR-0006](../docs/adr/0006-opt-in-training-mode-coaching-cue.md)).

## `pokemon-dashboard.html` — Walk Buddies (gamification view)

A second, motivation-first view of the **same** hub/WebSocket feed, aimed at encouraging
**elderly users to move more**. Open `pokemon-dashboard.html` (it auto-connects to the same
`ws://localhost:8765`, and falls back to an in-browser simulation when no hub is reachable —
so it also works on the hosted Netlify URL).

- **Multi-user** — one "buddy card" per walker appears automatically, plus a *Today's Movers*
  encouragement board (framed by effort, never shaming).
- **Pick a Pokémon** — each walker chooses a buddy from 12 classic Pokémon; the choice is
  saved per walker in `localStorage`.
- **Score → emotion** — the walker's **Moon Walk Score** (same 0–100 blend as the main
  dashboard) maps to one of five buddy moods: *Asleep → Sleepy → Warming up → Happy →
  Thrilled*. The mood drives the sprite's animation (sleep/sway/bounce, bounce speed tracks
  live cadence), an authentic Game Boy emote bubble, the Pokédex-screen glow, and an
  always-positive message ("12 more to make Pikachu happy!").
- **Assets** — grayscale GB sprites in `assets/pokemon/` and emote bubbles in `assets/emotes/`,
  extracted from the [pret/pokered](https://github.com/pret/pokered) disassembly. They render
  on a pale "LCD" screen via `mix-blend-mode:multiply` (hides the sprites' white background);
  colour comes from the mood glow, not the pixels (GB sprites are 2-bit grayscale by design).

Mood thresholds, the happy-goal (`HAPPY_AT`), and the Pokémon roster live at the top of the
`<script>` in `pokemon-dashboard.html` — tune them there. Claim-safety note: buddy moods are
**encouragement, not a health rating** (per [ADR-0005](../docs/adr/0005-wellness-positioning-and-claim-safety-vocabulary.md) vocabulary).

## `game/` — Walk Buddies **world** (the playable 2D game)

The fullest expression of the gamification idea: not a dashboard but a walkable
**Pokémon-style world**. Each walker is a Pokémon buddy living in Pallet Town; how
you move drives your buddy's mood *and* how lively it wanders the map.

Open `game/index.html` in Chrome/Edge. Like the dashboard it auto-connects to
`ws://localhost:8765` and falls back to an in-browser simulation (A,B,C) when no hub is
reachable — so it runs on a plain MacBook for demo day with or without devices.

- **A real tile world** — Pallet Town, built by parsing the [pret/pokered](https://github.com/pret/pokered)
  binary map data (`maps/PalletTown.blk` + `gfx/blocksets/overworld.bst` + the `overworld`
  tileset) into a [Phaser 3](https://phaser.io) tilemap. Rendered in the authentic 4-shade
  **Game Boy DMG green** palette.
- **Score → behaviour** — each walker's **Moon Walk Score** → one of five moods (*Asleep →
  Sleepy → Warming up → Happy → Thrilled*). Mood drives the buddy: naps in place when asleep,
  wanders briskly and sparkles when thrilled. Live **cadence** sets the stride speed, so
  walking faster literally makes the world more alive.
- **Multi-user** — buddies spawn/despawn with the hub roster; each appears on the shared map.
- **Pick a Pokémon** — per-walker buddy picker (12 classic Pokémon), saved in `localStorage`;
  the world sprite swaps instantly.
- **Training Mode** — opt-in. Tap a buddy and toggle Training Mode; the buddy "speaks" a gentle,
  claim-safe coaching cue in a classic Pokémon **dialogue box**, pointed at the single metric
  most worth nudging (rhythm / cadence / endurance / activity / swing). Off by default
  ([ADR-0006](../docs/adr/0006-opt-in-training-mode-coaching-cue.md)).

### `game/walkers.html` — Walk Buddies **Arenas** (per-walker view)

A second layout of the same engine + feed: instead of one shared map, **every walker gets their
own little environment** in a responsive card grid (the `pokemon-dashboard.html` shape, but each
card is a live mini game world). Open `game/walkers.html`.

- **Own arena per walker** — each card crops a different patch of Pallet Town (`REGIONS` in
  `walkers.js`); the buddy wanders, hops, squash/stretches, and shows mood emotes there.
- **Movement (MOVE) bar + leveling** — fills while you walk (driven by live `cadence`/activity),
  drains toward zero when you idle (after an 8 s rest grace); fill it to MAX to **Level Up**, which
  plays a celebration and grants a claim-safe reward (hat → title → decoration → new buddy slot →
  emote → new environment → medal → evolved art). Levels persist in `localStorage` (`mw-level-<id>`).
- The energy math + reward ladder + elderly-user guardrails come from the design doc at
  `/tmp/moonwalk-gamification-leveling-design.md` (grounded in ADR-0005/0006). Constants live at the
  top of `walkers.js` (`FILL_RATE`, `DECAY_RATE`, `IDLE_GRACE`, `ENERGY_MAX`, `REWARDS`).

`index.html` (one shared world) and `walkers.html` (solo arenas) share `game.js` and the same hub
feed — pick whichever framing suits the demo.

### `game/emerald.html` — Walk Buddies **Emerald** (full-colour rebuild) ⭐ current

The headline build: the Arenas, **rebuilt in full-colour Pokémon Emerald (GBA)**. Same engine
(`game.js`) and hub feed; a re-skin (16 px Emerald metatiles + colour front sprites) plus the
gamification MVP the three persona studies converged on. Open `game/emerald.html`.

- **Full-colour Littleroot Town** — each card renders the real 20×20 Emerald town against a
  true-colour metatile atlas; buddies are colour front sprites (Pikachu is actually yellow).
- **Wake your buddy** — overnight the buddy sleeps (💤); the first walk of a new calendar day wakes
  it, adds a **walk-day**, and ripens the **berry garden** one stage (5 stages, planted→ripe; it
  **never wilts** on a missed day).
- **MOVE bar → Level Up** with the R&D code-gap fixes: a gentle **quality multiplier** on fill
  (`0.85 + 0.15·rhythm`), a **daily soft cap** (~4 levels/day, then "happily tired" nudge), a longer
  **18 s** rest grace, and a **per-user cadence target** learned from the User's own baseline (never a
  fixed population norm — ADR-0005). Levels persist and never decrease.
- **Walk-day pins** (3/7/14/30 days, thank-yous never challenges) and a **Friends Album** — a gentle
  gallery of buddies/keepsakes you've collected, with no "X of 12" checklist.
- **Accessibility** — ≥16 px user-scalable text (A−/A+), mood shown as icon **and** word, a striped
  MOVE bar (shape + label + %, not colour alone), large tap targets, `prefers-reduced-motion`.

Constants + reward/pin ladders are at the top of `emerald.js`; per-walker progress (level, walk-days,
garden, baseline, album) persists in `localStorage` (`mw-prog-<id>`). All copy is claim-safe: the MOVE
bar is the **buddy's** energy, not the User's vitality; quality is judged vs the User's *own* baseline.

### Build the world assets

The recolored tileset + map JSON + recolored buddy/emote sprites under `game/assets/` are
generated from the read-only pokered checkout (expected at
`/Users/mingrath/ghq/github.com/Pokered/pokered`):

```bash
cd realtime/game
python3 build-assets.py            # monochrome: pokered 2bpp → DMG-green assets/  (needs Pillow)
python3 build-emerald-assets.py    # full-colour: pokeemerald → assets-emerald/    (needs Pillow)
```

`build-emerald-assets.py` reads the read-only [pret/pokeemerald](https://github.com/pret/pokeemerald)
checkout (expected at `/Users/mingrath/ghq/github.com/pret/pokeemerald`) and bakes Littleroot Town's
metatiles + JASC-PAL palettes into a true-colour **metatile atlas** (frame index == metatile id), a
`{wTiles,hTiles,tiles,walkable}` map JSON, 12 colour front sprites, 3 emotes, and a 5-stage berry
`garden.png` — all into `assets-emerald/`. (The recipe is mapped in `/tmp/moonwalk-pokeemerald-asset-map.md`.)

`vendor/phaser.min.js` is checked in so the game runs fully offline (no CDN at demo time).
Claim safety: buddy moods are **encouragement, not a health rating**
([ADR-0005](../docs/adr/0005-wellness-positioning-and-claim-safety-vocabulary.md)).

## Notes & tuning

- **Hardware in hand is IMU-only** (LSM9DS1). Cadence comes from the gyro swing axis (`gz`).
  No force sensor / ToF yet — see CONTEXT.md "Hardware in hand".
- **Cadence thresholds** (`CycleDetector` in `hub.py`, `hi`/`lo` in deg/s) may need tuning
  to your real swing amplitude. Watch the "Live signal" chart and set the thresholds inside
  the swing peaks.
- Dashboard transport (WebSocket + JSON schema) is the same shape BLE-to-phone would carry
  later — swapping transport is a transport change, not a data-model change.
- Web browser: the dashboard uses a plain `WebSocket`, so any modern browser works. (The
  *live BLE* path runs in the Python hub, not the browser, so no Web Bluetooth needed.)
