# Data Reality — what the current Arduino exports actually contain

> A ground-truth note on the real captured data in [`data/exports/`](../data/exports), checked
> 2026-05-28 against `arduino_long.csv` and `arduino_wide.csv`. Where the data and the spec
> ([`metrics.md`](./metrics.md), [`architecture.md`](./architecture.md), [ADR-0010]) disagree,
> **the data wins here** — this file records what we measured, not what we designed.

## The two export files

| File | Format | Rows | Notes |
|---|---|---|---|
| `arduino_wide.csv` | Pivoted: one row per timestamp, one column per `device.field` (20 cols) | 1,307,908 | Easiest to work with |
| `arduino_long.csv` | InfluxDB annotated CSV (3 annotation rows + header), one row per (timestamp × field) | 6,305,616 | Same data, narrow form |

- Source is an **InfluxDB pipeline**, not the `hub.py` websocket the docs describe — a more developed stack than documented.
- Timestamps are **ISO-8601 UTC `_time`**; there is **no integer-ms `t` column** (the spec assumes an MCU ms clock).
- Window: **2026-05-27 12:36 → 2026-05-28 08:24 UTC (≈19.8 h)** wall-clock, with cross-session gaps.

## Two devices, not one

The spec describes a single stick-mounted Sensor Node. The data has **two devices, `A` and `B`**:

| | Device A | Device B |
|---|---|---|
| Role (inferred) | the **cane** | quieter unit — body-worn or second aid |
| Gyro range | large swings (±~960 °/s) | small (gyro mostly <52 °/s) |
| Accel range | ±39.2 m/s² (±4 g, clipped) | ±~4 m/s² |
| Pressure channel | **yes** (`A.pressure_pa`) | **none** |
| Derived fields | `acc_norm`, `gyro_norm`, `phase` | `acc_norm`, `gyro_norm`, `phase` |

## Channels present (device A) vs the expected 8

| Expected | Actual column | Present? | Reality note |
|---|---|:--:|---|
| `t` (ms) | `_time` (ISO UTC) | ◑ | no ms clock; use `_time` |
| `gx,gy,gz` (deg/s) | `A.gx_dps` etc. | ✅ | OK; swing peaks to ~±960 °/s |
| `ax,ay,az` (g) | `A.ax_ms2` etc. | ✅ | **units are m/s², not g** — divide by 9.81; hard-clipped at ±4 g |
| `P` (Handle Load) | `A.pressure_pa` | ⚠️ | present but reads ~ambient — see below |

Plus **already-computed** fields the docs don't mention: `acc_norm`, `gyro_norm`, and a 3-class
**`phase`** (values 1/2/3). The docs state plant/phase detection isn't built and `hub.py` only
computes cadence — yet a `phase` label already exists in this pipeline. **Source of `phase` is
unaccounted for and should be traced.**

**Sample rate:** median Δt ≈ **2 ms → ~500 Hz** (both devices), well above the 100–200 Hz the spec assumes.

## The Handle Load / pressure channel — the key finding

The design (ADR-0010) is a **pneumatic bladder**: sealed air trapped under the grip is compressed
when the patient leans, the onboard LPS22HB barometer reads the rising pressure, and a fitted
polynomial translates `(P − P_tare)` → Handle Load. **That concept is sound.** The question this data
raises is whether the bladder was actually translating load *during this capture*.

What `A.pressure_pa` actually contains (178,780 readings, **only the last 3.8 h** of the 19.8 h window):

- **15.0%** are exactly **0 Pa** (26,731) — invalid; sensor power/comms glitches. Filter `== 0`.
- **~3%** are physically impossible sub-ambient lows (down to 583 hPa) — startup transients. Filter `< ~90,000 Pa`.
- Of the valid non-zero readings, the distribution sits **on top of atmospheric pressure**:

| percentile | value (Pa) | above atmospheric (101,325) |
|---|---|---|
| p50 | 101,324 | **+0** |
| p90 | 101,346 | +21 |
| p95 | 101,354 | +29 |
| p99 | 102,601 | +1,276 |
| p99.9 | 108,582 | +7,257 |
| max | 115,891 | +14,566 |

**93.4%** of valid readings are within **±200 Pa** of ambient. Only ~1–2% show meaningful elevation.

**Why this matters:** a person leaning even ~5 kgf on a ~30 cm² bladder should raise trapped-air
pressure by **thousands to tens-of-thousands of Pa**, on every loaded step. Instead the signal sits
at room pressure with ±~20 Pa noise. Consistent interpretations:

1. **The cane was barely loaded during this capture** (held/carried/idle), so the bladder rarely compressed.
2. **The bladder isn't holding pressure** (not sealed in series with the load path / leaks back to ambient) — so trapped air equalises to ambient and load doesn't register.

The rare elevated tail (p99.9 = +7.3 kPa, max +14.6 kPa) shows the barometer *can* read above ambient
— so the channel is alive — but sustained, rhythmic, per-step loading is **not** visible in this log.

> **Therefore: this capture does not demonstrate working Handle Load.** It neither proves the bladder
> broken nor proves it validated — it shows the pressure stream behaving as ambient air here. The
> bench calibration / drift / hysteresis validation (5/10/20/30 kgf, ADR-0010) is a **separate
> controlled measurement**; this field export is not that test.

**To actually confirm the air→load translation:** run a short **controlled loading capture** — press
the grip at known weights (e.g. 5/10/20/30 kgf on a scale) and/or do a deliberately heavy-leaning
walk — and verify `A.pressure_pa` rises clearly and repeatably above ambient, tracking the load. Until
such a capture exists, the loading metrics are not demonstrable on real data.

## What this data can / can't support today

> **The three headline metrics (co-equal, no ranking)** the WSFC reports together are
> **Symmetry & Rhythm (limp)**, **Stick Duty Factor**, and **Session Weight-Support
> Training Load** — all read **relative to the patient's own baseline** (never %BW,
> absolute force, fall-risk, diagnosis, or population norm). Against *this* capture they
> split unevenly: the first two are **computable now** from the device-A IMU, while
> Session Weight-Support Training Load is **blocked on a valid loading capture** (pressure
> reads ambient here — see above). For limp the headline is the **IMU temporal step-time
> symmetry** (alternating L/R plant intervals + rhythm consistency), which this data
> supports today; walker grip-load asymmetry would be a future secondary route and is not
> present in this single-cane capture.

**Computable now (device A IMU, real data):**
- Cadence & Stick Cycle Time, **Stick Duty Factor** (stillness window) — *headline*
- **Step Rhythm & Symmetry (limp)** — IMU-only — *headline*
- Swing-angle / stride trend (Pendulum Model) — once the integrator is coded
- A vs B comparison; `phase` and `*_norm` are pre-computed

**Blocked on a valid loading capture (pressure reads ambient here):**
- Handle Load (relative), Weight Support Target compliance
- **Session Weight-Support Training Load** — *headline*
- Any ML model trained on loading features ([ADR-0012] model ①/②)

## Processing gotchas (apply before any analysis)

- Convert accel: **`g = ms2 / 9.80665`** before g-referenced thresholds.
- Drop `A.pressure_pa == 0` (15%) and sub-ambient outliers (< ~90,000 Pa).
- Pressure exists for **only the last 3.8 h** — don't expect it across the whole window.
- Accel is **clipped at ±4 g** — hard impacts may saturate.
- Use `_time`; there is no ms clock. Mind the cross-session gaps (54 gaps, 7 over 5 min).

## Open items to reconcile

1. **Trace where `phase` (1/2/3) comes from** — the docs say no phase detector is built yet.
2. **Identify device B** — the architecture documents one cane sensor; the data has two units.
3. **Run a controlled loading capture** to confirm the pneumatic bladder→Handle Load translation is observable in the stream (the field log here does not show it).
4. **Reconcile the InfluxDB pipeline** with the `hub.py`/BLE path the docs describe.

[ADR-0010]: ./adr/0010-pneumatic-barometer-handle-load.md
