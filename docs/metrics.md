# Moon Walk — Metric Specification

> What each metric *is*, **which sensor it comes from**, how it is **calculated**, and **why we
> need it** — with the evidence behind it. This is the prose companion to the interactive
> [`metrics.html`](./metrics.html); the runtime pipeline is in [`architecture.md`](./architecture.md)
> and the processing decision in [ADR-0011]. Verified citations live in
> [`rehab/wsfc-processing-references.md`](../rehab/wsfc-processing-references.md).
>
> **Two truths to keep in mind throughout:**
> 1. **Everything below comes from just two sensor streams** — a 6-axis IMU and one barometric
>    pressure channel. Metrics 1–5 + derived ② need the **IMU only (live today)**; the loading
>    metrics 6–7 + derived ①③ need the **pneumatic Handle Load sensor (designed, not built)**.
> 2. **Claim-safety binds every metric** ([ADR-0009]): relative to the patient's *own* baseline,
>    never %-body-weight, never absolute force, never fall-risk, never a diagnosis or a population norm.

---

## 0. Raw inputs — what is actually measured

Everything traces back to these. Nothing else is sampled.

### 0.1 Raw sensor streams (~100–200 Hz, each timestamped)

| Channel | Raw values | Source | Status |
|---|---|---|---|
| IMU gyro | `gx, gy, gz` (deg/s) | LSM9DS1 (onboard Nano 33 BLE) | ✅ in hand |
| IMU accel | `ax, ay, az` (g) | LSM9DS1 | ✅ in hand |
| Barometer | `P` (pressure) | LPS22HB + air bladder under grip | 🔴 barometer in hand, **bladder not built** ([ADR-0010]) |
| Timestamp | `t` (ms) | MCU clock | ✅ |

→ **8 numbers per sample** (`t, gx, gy, gz, ax, ay, az, P`). The firmware already streams the 6
IMU values (`realtime/hub.py`); `P` is added once the bladder exists.

### 0.2 One-time calibration / config constants

- **Stick length `L`** — geometric scale for all spatial metrics (manual at setup).
- **Pressure→load polynomial `a, b, c`** — from a bench calibration (5/10/20/30 kgf on a scale);
  a 2nd-order polynomial, not a line (Marquardt 2022).
- **Mode** — Cane vs Walker (selects the distance method).
- **Detector thresholds** — gyro hi/lo + refractory + stillness window (the `CycleDetector`
  constants); the cue's Schmitt deadband + min on/off times.

### 0.3 Per-session setup measurements (derived from the raw streams during the setup walk)

- **`P_tare`** — barometer zero, captured at session start after a brief grip/thermal equilibration.
- **Baseline cane-dependence** — a high percentile of the per-step-peak load distribution over the
  setup walk → the **Weight Support Target** is a % of this, faded by week.
- **Baselines for trend normalisation** — baseline stride, cadence, walk ratio, step-time CV, so the
  trend/composite metrics are measured against this patient's own starting point.

### 0.4 Per-step / per-cycle primitives (computed from 0.1, consumed by the metrics)

`plant timestamps t_plant[n]` · `per-step peak load` · `swing angle θ` · `planted_duration`
(stillness) · `L/R step intervals` (the alternating-interval pattern in the plant sequence) ·
`step count` · `session duration`.

---

## 1. Temporal metrics — Tier 1 (reliable, IMU-only, live today)

Temporal metrics are the **robust, headline numbers**: cadence in particular is reliably recovered
from a single inertial sensor (Werner 2020: cadence ICC 0.87–0.99 vs a multi-sensor reference). Lead
with these; spatial metrics are secondary trends.

### 1.1 Stick Cycle Time
- **Sensor & derivation:** IMU gyro + accel. A *plant* is detected when the swing-axis angular rate
  crosses ≈0 together with an acceleration impact spike (a hysteresis crossing in `CycleDetector`).
  One plant-to-plant interval = one Stick Cycle.
- **Formula:** `cycle_time = t_plant[n] − t_plant[n−1]`
- **Tier / status:** Tier 1 · **live**.
- **Why we need it:** it is the time base for cadence and rhythm variability, and the segmentation
  unit the whole WSFC loop hangs off (every per-step decision is made within one cycle). It is a
  *proxy* for the gait cycle, **not** identical to it — so we name it "Stick Cycle," not "gait cycle."

### 1.2 Cadence
- **Sensor & derivation:** IMU only, from the plant-timestamp stream; rolling-averaged.
- **Formula:** `cadence = 60000 / cycle_time_ms` (cycles/min) — exactly what `realtime/hub.py` computes.
- **Tier / status:** Tier 1 · **live**.
- **Why we need it:** the single most reliable single-IMU gait metric (Werner 2020) and a core
  recovery/effort signal — cadence rises as gait improves, and it drives the Walk Buddies MOVE bar
  and the Session Training Load volume term. Also a factor in gait velocity.

### 1.3 Stick Duty Factor
- **Sensor & derivation:** IMU stillness window (cane planted ≈ stationary) ÷ cycle time. Becomes
  crisper at the plant/lift edges once the Handle Load sensor confirms "loaded."
- **Formula:** `duty_factor = planted_duration / cycle_time`
- **Tier / status:** Tier 1 · **live** (IMU-inferred).
- **Why we need it:** a stand-in for how long the patient leans on the cane within each cycle — an
  early, force-free read on cane dependence and an honest substitute for stance/swing timing.
  ⚠️ It is **not** leg stance time (we instrument the stick, not the foot).

---

## 2. Spatial metrics — Tier 2 (trend-only, IMU, never absolute)

A single aid-mounted sensor estimates stride/velocity well enough to track *change over time* but not
as a clinical absolute, so we **never present them as absolute values** and they require per-user
calibration (single-aid-sensor validity for basic gait params: Werner 2020 — noting that was a
back-mounted sensor on a rollator; cane-mounted is not yet validated, which is exactly why these stay
trend-only for us).

### 2.1 Stride Length
- **Sensor & derivation:** gyro swing angle θ (integrated over the swing), via the Pendulum Model,
  bounded by the IMU-stillness ZUPT reset at each plant. Needs the stick length `L`.
- **Formula:** `stride ≈ L · sin(θ)` (ZUPT-bounded)
- **Tier / status:** Tier 2 · **trend-only**; computed but **not validated** against ground truth.
- **Why we need it:** stride is the spatial half of gait quality and the input to gait velocity; a
  *lengthening* trend is a meaningful recovery signal even when the absolute value is uncertain.
  The Pendulum Model avoids the acceleration double-integration drift that plagues stride-from-accel.

### 2.2 Gait Velocity
- **Sensor & derivation:** stride × cadence (so: gyro θ + plant timing + `L`).
- **Formula:** `velocity = stride · cadence`
- **Tier / status:** Tier 2 · **trend-only**.
- **Why we need it:** gait speed is *the* headline stroke-rehab outcome (MCID ≥ 0.16 m/s, Tilson
  2010) and a WSFC success metric — but because our estimate is single-sensor and aid-mounted, we
  surface it as a personal trend, not a clinical absolute. (Honest note: the strongest meta-analytic
  effect of pressure+auditory feedback on gait *speed* is weak — Wang 2025 — so we don't over-promise
  on this number.)

---

## 3. Loading metrics — Tier 3 (the WSFC's headline signals; gated on the Handle Load sensor)

These are what makes Moon Walk a **Weight Support Feedback Cane** rather than a pedometer. Both are
blocked until the pneumatic bladder is built and bench-validated.

### 3.1 Handle Load (relative)
- **Sensor & derivation:** barometer reads trapped-air pressure under the grip; subtract the
  session tare, map pressure→load with the fitted polynomial, express as **% of the patient's own
  baseline cane-dependence**.
- **Formula:** `load = a·(P−P_tare)² + b·(P−P_tare) + c` ; `load% = 100 · load / baseline_load`
- **Tier / status:** Tier 3 · **gated**.
- **Why we need it:** this is the direct measure of how much the patient offloads onto the cane —
  the variable the whole therapy retrains. A barometer-in-elastomer is a validated, drift-stable
  force transducer (Cerveri 2017 RMSE 0.04 N; Dabling 2012 — the air-bubble sensor had the lowest
  drift of five sensor types; Marquardt 2022).
- **Claim-safety:** relative to the patient's own baseline only. kgf is bench-calibration / optional
  clinician readout — **never** a marketed force or %-body-weight figure.

### 3.2 Weight Support Target Compliance
- **Sensor & derivation:** per-step peak load (barometer, sampled at the load peak the IMU segments)
  compared to the current target band; count the in-band steps.
- **Formula:** `in_band_% = 100 · (#steps with peak_load ≤ target) / total_steps`
  Target faded −10%/week (≈60%→30% of baseline); **advance the week only when in_band_% ≥ 80**.
- **Tier / status:** Tier 3 · **gated**.
- **Why we need it:** it is the WSFC's primary outcome and the loop's control signal — it tells the
  patient (and clinician) whether they are hitting the prescribed weaning schedule, and gates
  progression. The threshold + faded-schedule + ≥80%-advance protocol is the clinically-validated
  core: Kang 2021 (the WSFC namesake RCT) and Jung 2015 (which originated the 60→30 fade); the
  once-per-step-at-peak decision follows Tamburella 2021.
- **Claim-safety:** target is % of own baseline, never %BW; the decision uses a Schmitt deadband to
  avoid chattering ([ADR-0011]).

---

## 4. Derived / composite metrics — Tier 4 (the "score" layer)

Higher-order numbers built from the metrics above, to give the patient a motivating figure and the
clinician a progress summary. All self-referenced to the patient's own baseline.

### 4.1 Step Rhythm & Symmetry  ②  — **live, IMU-only, strongest evidence**
- **Sensor & derivation:** IMU only. The alternating long/short intervals in the plant sequence give
  per-side step times → a temporal **symmetry ratio**; cycle-to-cycle timing spread gives the
  **step-time CV** → a consistency term.
- **Formula:**
  `SR = min(t_par, t_nonpar) / max(t_par, t_nonpar)`  (1.0 = perfectly symmetric)
  `consistency = 1 − CV`,  `CV = SD(step_time) / mean(step_time)`
  `score = 100 · (0.6·SR + 0.4·consistency)`
- **Tier / status:** Tier 4 · **live**.
- **Why we need it:** asymmetry and unsteady rhythm are hallmarks of hemiplegic gait, and symmetry is
  a recognised, intervention-responsive rehab outcome — it is the one composite we can ship *today*
  on the strongest evidence. Symmetry ratio standardisation: Patterson 2010 (the 707-cite reference
  work); it changes with recovery (Patterson 2010, NNR) and responds to therapy (Yoshioka 2022);
  step-time variability poststroke: Chisholm 2014.
- **Claim-safety:** CV is surfaced as "step-timing **consistency / steadiness**," **never** as fall
  risk (a banned framing). A trend toward SR = 1.0 / lower CV vs the patient's own baseline.

### 4.2 Session Weight-Support Training Load  ①  — **gated; the Whoop-Strain analog**
- **Sensor & derivation:** barometer (relative load) + IMU (steps/duration). Integrate
  loading-quality over the session and map to a personalised non-linear 0–100.
- **Formula:**
  `raw = Σ_steps ( lean_reduction · in_band_factor )`  (intensity × volume — a TRIMP / session-RPE structure)
  `score = 100 · log(1 + raw) / log(1 + raw_max)`  (easy gains early, harder later)
- **Tier / status:** Tier 4 · **gated** (a degraded IMU-only walking-volume version could ship sooner).
- **Why we need it:** a single, motivating "how much quality retraining you banked today" figure —
  the engagement hook (it drives the Walk Buddies layer) and a clinician dose record. The structure
  is borrowed from validated training-load science (TRIMP — García-Ramos 2015; session-RPE — Tibana
  2018, Christen 2016) and grounded in rehab loading-dose work (Mercer 2009, Ribeiro 2019, Lang 2022).
- **Claim-safety:** ⚠️ a personal effort/progress figure, **not** a claim of physiological equivalence
  to Whoop Strain (whose algorithm is proprietary and unvalidated — only Whoop's HR/HRV/sleep
  *signals* are validated, Miller 2022). Not a clinical grade; relative to own baseline.

### 4.3 Cane-Reliance & Walk-Ratio Trend  ③  — **gated; partly speculative**
- **Sensor & derivation:** barometer (reliance) over weeks + IMU (stride-proxy, cadence). 
- **Formula:**
  `cane_reliance = mean(load%) per session, trended week-over-week`  (↓ = weaning off the cane)
  `walk_ratio = step_length / cadence`  (speed-independent coordination index, baseline-normalised)
- **Tier / status:** Tier 4 · **gated, partly speculative**.
- **Why we need it:** the long-horizon "are you needing the cane less, and is your coordination
  holding together as you speed up" story — the ultimate goal of the therapy. Walk Ratio is a
  validated speed-independent gait-control summary (Rota 2011, Kalron 2016 — both **MS** populations).
- **Honesty / caveats:** a true Walk Ratio needs *absolute* step length (we have a trend only), and
  cane-reliance needs the unbuilt Handle Load sensor — so both are shown as personal trend lines,
  never absolutes. ⚠️ Nagasaki 1996, sometimes cited for walk-ratio constancy, is actually titled
  "Walking Patterns and Finger Rhythm of Older Adults" — re-check before relying on it.

---

## 5. Raw-data → metric traceability

| Metric | gyro | accel | barometer | constants / baseline |
|---|:--:|:--:|:--:|---|
| Stick cycle time | ● | ● | | — |
| Cadence | ● | ● | | — |
| Stick Duty Factor | ● | ● | | stillness window |
| Stride length | ● (θ) | | | `L` |
| Gait velocity | ● (θ) | ● | | `L` |
| Handle Load (relative) | ●* | | ● | `P_tare`, `a,b,c`, baseline |
| WS Target compliance | ●* | ●* | ● | target band (% baseline) |
| ② Step Rhythm & Symmetry | ● | ● | | baseline CV |
| ① Session Training Load | ●* | ●* | ● | baseline, in-band band |
| ③ Cane-Reliance & Walk-Ratio | ● (θ, cadence) | | ● | `L`, baselines |

● = required · ●* = IMU used for step segmentation / tare gating (marks *when* a step/swing occurs so
the barometer is read at the right instant).

**Build order this implies:** IMU alone → metrics 1–5 and derived ② (today). Add one barometric
pressure channel (and build the bladder) → Handle Load, WS Target compliance, and derived ①③ — i.e.
the entire WSFC flagship rides on that one extra stream.

---

## 6. Where ML touches these metrics ([ADR-0012])

Most metrics above are **rule-based + DSP** ([ADR-0011]) and stay that way. ML is admitted at
exactly **three points**, and only where the training target is a *physical measurement* or an
*n-of-1 personalization* — never a human-judged "impaired vs normal" label. Each ML model
*feeds or sharpens* a metric above; none replaces the real-time cue decision, and none emits a
new claim-bearing output.

| ML model ([ADR-0012]) | Trains on | Metric it produces / improves | When |
|---|---|---|---|
| **① Baseline / target-percentile estimator** | the patient's setup-walk per-step-peak loads + IMU (n-of-1) | **§0.3 baseline cane-dependence** → the **§3.2 Weight Support Target** anchor — learns which setup steps are representative instead of a fixed percentile | **build now** (unconditional) |
| **② Load denoiser *or* swing-gate** | bench rig: bladder pressure vs a reference scale (physical truth) / objective swing labels | **§3.1 Handle Load** (cleaner relative load) or **§0.4 plant/swing primitives** (better segmentation under impaired arm-swing) — feeds the existing threshold, invisible to the user | **only if** bench/real data shows the DSP poly or rule-based gate fails |
| **③ Context-aware Drift personalization** | one User's own walk history over weeks (n-of-1) | sharpens the wellness **Alert** decision (fewer/truer nudges) — *adaptive filtering, not a heavy trained model* | **fast-follow** after WSFC ①–② validated |

**The rule that gates all three:** ML is used only where the answer to train against is
measurable (a scale, the IMU, the user's own past walks). No classifier, no fall-risk, no
gait-speed predictor, no %BW/absolute-force output, no ML in the real-time cue — see
[ADR-0012] for the full boundary. One liability to enforce: the ② denoiser trains on kgf
labels, which are **bench-only** and must never be persisted or surfaced downstream.

---

## 7. Shared claim-safety boundary

Binds **all** metrics and applications ([ADR-0009], CONTEXT.md *Claim Safety*): no diagnosis, no
disease/fall-risk prediction, no absolute-force / Newtons / %-body-weight, no "stress" inference, no
population-normative grade. Every figure is **relative to the patient's own baseline** and framed as
wellness / training / progress. The WSFC application alone may additionally address a **Patient**,
name a prescribing **Clinician**, give real-time corrective feedback, and state a
weight-bearing-retraining intent — within those shared bans.

---

[ADR-0009]: ./adr/0009-pivot-to-weight-support-feedback-cane.md
[ADR-0010]: ./adr/0010-pneumatic-barometer-handle-load.md
[ADR-0011]: ./adr/0011-wsfc-real-time-processing-rule-based-dsp.md
[ADR-0012]: ./adr/0012-where-ml-earns-its-place-on-moonwalk-data.md
