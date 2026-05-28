# CSV → Metrics — mapping the Arduino exports to every metric

> A practical cookbook: given the real exports in [`data/exports/`](../data/exports), exactly
> **which columns** feed **which metric**, the **preprocessing** required, and the **formula** —
> with the real-data caveats from [`data-reality.md`](./data-reality.md) baked in. Metric
> definitions/evidence live in [`metrics-explained.md`](./metrics-explained.md); this file is the
> "how to get there from the CSV" layer.
>
> **Status legend:** ✅ computable from this data now · ⚙️ needs a setup constant (not in the CSV) ·
> 🟡 **pipeline built & demonstrated** (on real squeeze-test load + a synthetic walk) but needs a real
> **loading-walk** capture for gait-valid numbers — see [`ml_pipeline/wsfc_loading_metrics.py`](../ml_pipeline/wsfc_loading_metrics.py)
> and [`ml_pipeline/mock_baseline_walk.py`](../ml_pipeline/mock_baseline_walk.py).

---

## The source columns (device A = the cane)

Use `arduino_wide.csv` (one row per `_time`, one column per `device.field`). Device **A** is the cane;
device **B** is a quieter second unit (no pressure) — ignore B unless doing A-vs-B comparison.

| Column | Meaning | Unit | Notes |
|---|---|---|---|
| `_time` | timestamp | ISO-8601 UTC | **no integer-ms clock** — derive `t_ms` from this |
| `A.gx_dps`,`A.gy_dps`,`A.gz_dps` | gyro (angular rate) | **deg/s** | swing axis TBD — see Stage 1 |
| `A.ax_ms2`,`A.ay_ms2`,`A.az_ms2` | accelerometer | **m/s²** | ÷ 9.80665 for g; clipped at ±4 g |
| `A.pressure_pa` | bladder pressure (Handle Load) | Pa | only last ~3.8 h; 15% zero-glitches; ~ambient unless loaded |
| `A.gyro_norm`,`A.acc_norm`,`A.phase` | pre-computed magnitude / 3-class phase | — | ⚠️ **NaN on all pressure rows** & a disjoint window — **recompute from raw, don't rely on these** |

---

## Stage 0 — Load & clean (do this once, feeds everything)

```python
import pandas as pd, numpy as np
df = pd.read_csv('data/exports/arduino_wide.csv', parse_dates=['_time'])
df = df.sort_values('_time').reset_index(drop=True)
df['t_ms'] = (df['_time'] - df['_time'].iloc[0]).dt.total_seconds() * 1000.0  # ms since start

# IMU (device A), raw — present across the full window
gyro = df[['A.gx_dps','A.gy_dps','A.gz_dps']]
acc  = df[['A.ax_ms2','A.ay_ms2','A.az_ms2']] / 9.80665      # -> g
gyro_mag = np.sqrt((gyro**2).sum(axis=1))                    # ||ω||, recomputed (don't use A.gyro_norm)
acc_mag  = np.sqrt((acc**2).sum(axis=1))                     # ||a|| in g

# Pressure: drop 0-Pa glitches (15%) and sub-ambient startup outliers
P = df['A.pressure_pa'].where(lambda x: (x > 0) & (x >= 90000))
```

> Mind the **cross-session gaps** (54 gaps, 7 over 5 min). Segment on large `t_ms` jumps before
> computing per-cycle metrics so a gap isn't read as one giant cycle.

---

## Stage 1 — Identify the swing axis ⚙️ (do before ANY temporal metric)

Don't assume `gz`. Pick the gyro channel that **oscillates with the steps** (largest variance / clearest
rhythmic band during a walking segment):

```python
walk = df[(df.t_ms > T0) & (df.t_ms < T1)]            # a known walking window
swing_axis = walk[['A.gx_dps','A.gy_dps','A.gz_dps']].std().idxmax()   # e.g. 'A.gy_dps'
w = df[swing_axis]                                     # the swing-axis rate, deg/s
```

Everything below uses `w` (swing-axis rate) and `gyro_mag`.

---

## Stage 2 — Plant detection ✅ (the foundation)

A plant = swing-axis rate returns through ≈0 **AND** an accel impact spike (disambiguates from the
mid-air turnaround). Stillness follows.

```python
PLANT_GYRO = 20.0      # deg/s: |w| below this = quasi-still   (tune per data)
REFRACTORY_MS = 220    # reject double-counts
# impact = local spike in acc_mag above a rolling baseline
plants = []            # list of t_ms at ground contact
# walk samples: when |w| crosses into the still band coincident with an acc_mag spike, and
# >REFRACTORY_MS since the last plant -> record t_ms as a plant.
```

Output: `t_plant[]` (ms). *(The current `hub.py` fires on the swing-velocity peak instead — adequate
for cadence, but use the zero-cross+impact version for everything anchored to ground contact.)*

---

## The metrics

> **Headline set (co-equal, no ranking).** Of everything below, three are the WSFC's
> **most important** read-outs and are presented **together with no ranking**:
> **#4 Symmetry & Rhythm (limp)** (framed as **cane-mode temporal step-time symmetry** —
> the IMU symmetry ratio from alternating L/R plant intervals + rhythm consistency,
> `1 − step-time CV`; the live-today, strongest-evidence limp route — walker grip-load
> asymmetry is a future secondary route, not the headline), **#2 Stick Duty Factor**
> (force-free cane-dependence read), and **#8 Session Weight-Support Training Load**
> (per-session loading-quality dose). All three are read **relative to the patient's own
> baseline** — never %BW, absolute force, fall-risk, diagnosis, or population norm.

### 1. Cadence & Stick Cycle Time ✅
- **Columns:** `t_plant[]` (from `_time` → `t_ms`).
- **Formula:** `cycle_time = t_plant[n] − t_plant[n−1]` · `cadence = 60000 / cycle_time` · rolling-mean ~8.

### 2. Stick Duty Factor ✅
The fraction of each cycle the cane is **planted (leaned on)** vs swinging.
`duty_factor = planted_duration / cycle_time`. Two ways to get `planted_duration`:

**Method A — from raw IMU (the proper, full-coverage way).** Planted = the stillness window
(`gyro_mag` low, `acc_mag` steady) between two plants.

```python
PLANT_GYRO = 20.0                              # deg/s: |w| below this = quasi-still (tune per data)
df['dt_ms']   = df['t_ms'].diff()
df['planted'] = gyro_mag < PLANT_GYRO          # boolean still-mask (optionally AND low acc_mag variance)

duty = []
for n in range(1, len(t_plant)):
    cyc = (df.t_ms >= t_plant[n-1]) & (df.t_ms < t_plant[n])
    cycle_time      = t_plant[n] - t_plant[n-1]
    planted_ms      = df.loc[cyc & df.planted, 'dt_ms'].sum()   # time spent still in this cycle
    if cycle_time > 0:
        duty.append(planted_ms / cycle_time)   # Stick Duty Factor for cycle n
```

**Method B — shortcut via the pre-computed `A.phase` (faster, partial coverage).** `A.phase` is
already a 3-class motion segmentation (confirmed by gyro magnitude per class):

| `A.phase` | median ‖ω‖ | meaning | aggregate share |
|---|---|---|---|
| **1** | 0.58 °/s | **planted / stance** (still) | 25.2% |
| **2** | 2.42 °/s | transition / loading | 38.1% |
| **3** | 39.06 °/s | **swing** (cane moving) | 36.7% |

```python
planted_phase = df['A.phase'].isin([1])        # or [1, 2] — see caveat below
# per cycle: duty_factor = time_in(planted_phase) / cycle_time   (same loop as Method A,
# replacing df.planted with planted_phase)
```

Quick aggregate read: duty ≈ **25%** if planted = phase 1 only, ≈ **63%** if planted = phase 1+2.

> ⚠️ **`A.phase` caveats:** (1) present on only ~12% of rows, on a window **disjoint from pressure**
> (and mostly disjoint from raw-IMU rows — ~10k overlap); (2) the 1/2/3 → still/transition/swing
> mapping is **inferred from gyro, not documented** — whether "planted" is phase 1 or 1+2 swings
> duty from 25%→63%, so confirm before relying on it; (3) **source untraced** — nothing in
> `hub.py`/firmware produces it. Prefer **Method A** for trustworthy per-cycle values; use `A.phase`
> only as a cross-check until its provenance and class meanings are pinned down.

### 3. Stride Length & Velocity ✅⚙️ (trend; absolute needs `L`)
- **Columns:** swing-axis `w`, `t_ms`, `t_plant[]`. **Constant:** stick length `L` (setup, not in CSV).
- **How:** integrate between plants `θ = Σ w·Δt` (deg→rad), **reset at each plant** (ZUPT). Optionally bias-correct using `w` during the planted window. `stride ≈ L·sin(θ)` · `velocity = stride·cadence`. Without `L` → relative trend only.

### 4. Step Rhythm & Symmetry — the limp meter ✅⚙️
- **Columns:** `t_plant[]`. **Constant (label only):** affected-side (setup; SR itself is label-free).
- **How:** alternating plant intervals → two per-side groups (odd/even).
  `SR = min(side_A_mean, side_B_mean) / max(...)`
  `CV` computed **per side** (not mixed!), `consistency = 1 − mean(CV_perside)`.
  `score = 100·(0.6·SR + 0.4·consistency)`.

> **Metrics 5–8 are built and run today** via [`wsfc_loading_metrics.py`](../ml_pipeline/wsfc_loading_metrics.py)
> — demonstrated on the **8 real squeeze-test load events** *and* on the **120-step synthetic walk**
> ([`mock_baseline_walk.py`](../ml_pipeline/mock_baseline_walk.py)). What's still missing is a **real
> per-step walking load** capture; until then the *numbers* are demo/synthetic, not gait-valid. 🟡

### 5. Handle Load (relative) 🟡 (transducer + conversion proven; awaiting walking load)
- **Columns:** `A.pressure_pa` (cleaned `P`), swing-axis `w` for the IMU tare gate.
- **Tare:** `P_tare = 101325 Pa` (IMU swing-phase value == distribution mode, agree to 0.2 Pa).
- **Formula:** `dP = max(0, P − P_tare)` (smooth ~100 ms median) · `load% = 100·dP / baseline_dP`.
  *No `a,b,c` calibration exists → absolute kgf is out of scope; relative% is the deliverable.*
- **Status:** runs end-to-end and is clean on the **8 squeeze-test events** (peaks ~1.2–14.6 kPa, `load%` 15–133%), but **`dP ≈ 0` during walking** — no per-step gait load in this capture.

### 6. Baseline lean 🟡⚙️
- **Columns:** per-step peak `dP` over a **setup walk**.
- **How:** `baseline_dP = percentile(per_step_peak_dP, ~90%)`. *(Real data: 8 squeeze peaks → `baseline_dP ≈ 7730 Pa`, not a gait baseline. Synthetic walk: `9177 Pa` naive / `8444 Pa` robust — see [`mock_baseline_walk.py`](../ml_pipeline/mock_baseline_walk.py); per [ADR-0012] #1 the gait baseline should be a **learned/robust** estimate, not a raw percentile.)*

### 7. Weight Support Target Compliance 🟡
- **Columns:** per-step peak `load%`, `t_plant[]` (to sample once per step at peak).
- **Formula:** `in_band_% = 100·#(peak_load% ≤ target)/total` · target faded −10%/wk (60→30% of baseline) · advance when `in_band_% ≥ 80`. Rule-based by mandate ([ADR-0011]/[ADR-0012] — **no ML in the cue/compliance**).
- **Status:** runs on the synthetic walk (wk1 60%→18% in-band → HOLD, as expected for a *pre-training* baseline walk); needs a real loading walk + clinician target.

### 8. Session Weight-Support Training Load 🟡
- **Columns:** per-step `load%` (+ steps/duration from IMU).
- **Formula:** `raw = Σ_steps lean_reduction·in_band_factor` (`lean_reduction = max(0,1−load%/100)`, `in_band_factor = 1 if peak≤target else 0`) · `score = 100·log(1+raw)/log(1+raw_max)`. Rule-based aggregate.
- **Status:** runs on the synthetic walk (raw 12.09 → **score 53.6/100**); gait-valid once a real loading walk exists.

### How we make 5–8 (runnable pipeline)

The loading half is implemented end-to-end in [`ml_pipeline/`](../ml_pipeline). Two entry points:

**A) On the real squeeze-test load** (device-A pressure in the export):
```bash
python ml_pipeline/wsfc_loading_metrics.py data/exports/arduino_wide.csv
```
Inside, `load_and_clean()` → `detect_events()` → `compute_metrics()` → `print_report()`:
1. **Clean** — drop `A.pressure_pa == 0` (15%) and `< 90000 Pa` startup outliers.
2. **Tare** — `P_tare ≈ 101325 Pa` (mode of cleaned signal == IMU swing-phase value).
3. **dP** — `dP = max(0, P − P_tare)`, smoothed with a ~100 ms rolling median.
4. **Per-load peaks** — `detect_events()` groups loading bursts → one peak `dP` per event.
5. **#6** `baseline_dP = p90(peaks)` → **#5** `load% = 100·dP / baseline_dP`.
6. **#7** count `peak ≤ target` over the faded 60→30% schedule (advance ≥80%) → **#8**
   `raw = Σ lean_reduction·in_band_factor`, `score = 100·log(1+raw)/log(1+raw_max)`.

**B) On a synthetic gait-shaped walk** (per-step peaks given directly — no event detection):
```bash
python ml_pipeline/mock_baseline_walk.py          # writes data/mock/synthetic_setup_walk.csv + prints #6
```
then feed those 120 per-step peaks straight into `compute_metrics()` (each CSV row is already a
per-step peak `dP`, so `detect_events()` is bypassed). This is how the 120-step #5–#8 numbers above
were produced.

**To make it gait-valid (one swap):** replace the body of `detect_events()` with a **stance-gated
per-step peak sampler** driven by IMU plant detection (Stage 2 above) — sample `dP` at each plant's
load peak. `compute_metrics()`, the baseline/target/compliance/STL math, and the report are unchanged;
only the *event source* moves from squeeze bursts (A) / synthetic rows (B) to real gait steps.

---

## Summary table

⭐ marks the **three co-equal headline metrics** (no ranking among them).

| # | Metric | Key columns | Status | Blocker / need |
|---|---|---|---|---|
| 0 | Plant detection | `A.g{x,y,z}_dps`, `A.a{x,y,z}_ms2` | ✅ | identify swing axis |
| 1 | Cadence / Cycle Time | `_time`→plants | ✅ | — |
| 2 | ⭐ **Stick Duty Factor** | gyro_mag, acc_mag | ✅ | — |
| 3 | Stride / Velocity | swing-axis gyro, `_time` | ✅⚙️ | `L` for absolute |
| 4 | ⭐ **Symmetry & Rhythm (limp)** | plant times | ✅⚙️ | side-label (for naming only) |
| 5 | Handle Load (relative) | `A.pressure_pa` | 🟡 | built; proven on squeeze tests; needs walking load |
| 6 | Baseline lean | per-step peak `dP` | 🟡⚙️ | built; demoed on synthetic walk; needs loading walk |
| 7 | WS Target Compliance | per-step `load%` | 🟡 | built; runs on synthetic walk; needs loading walk + target |
| 8 | ⭐ **Session Weight-Support Training Load** | per-step `load%` | 🟡 | built; runs on synthetic walk; needs loading walk + target |

**Bottom line:** metrics **0–4 (the limp meter + full temporal/trend stack) are computable on this data
today**. Metrics **5–8 (the WSFC loading half) are built and run end-to-end** — proven on the real
squeeze-test load and on a synthetic walk (`ml_pipeline/`) — but their *numbers* only become **gait-valid**
once a capture exists where the patient **actually leans on the cane each step**. The blocker is the
missing loading-walk **data**, not the pipeline (which is done) or the algorithm.

---

## Real-data gotchas (apply globally)

1. **Accel is m/s²** → ÷ 9.80665 before any g-referenced threshold; it's clipped at ±4 g.
2. **No ms clock** → derive `t_ms` from `_time`; segment on cross-session gaps.
3. **Recompute `gyro_mag`/`acc_mag` from raw** — `A.gyro_norm`/`A.acc_norm`/`A.phase` are NaN on the pressure window and computed on a disjoint slice.
4. **Pressure**: drop `== 0` (15%) and `< 90000 Pa` outliers; tare to ~101,325 Pa; load is the rise **above** tare.
5. **Two devices** — use **A** for the cane; B has no pressure.
6. **~500 Hz** sample rate — tune detector thresholds/refractory accordingly.

## Setup constants (not in the CSV — supply at calibration)

- `L` — stick length (absolute stride/velocity).
- Affected-side label (names the SR sides; SR value is label-free).
- For loading (when a valid capture exists): `P_tare`, and optionally bench `a,b,c` for internal kgf.

## See also
[`metrics-explained.md`](./metrics-explained.md) · [`metrics.md`](./metrics.md) · [`data-reality.md`](./data-reality.md) · [ADR-0010](./adr/0010-pneumatic-barometer-handle-load.md)
