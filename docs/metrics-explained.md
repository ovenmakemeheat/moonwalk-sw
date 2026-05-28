# Moon Walk Metrics — Plain-Language Walkthrough

> A friendly companion to the formal spec in [`metrics.md`](./metrics.md). For each metric:
> **what it is**, **how to calculate it (in simple terms, with a worked example)**, **why it
> matters — read through the lens of a *limp*** — and the **reference paper** behind it.
>
> **The unifying idea: a limp.** Stroke, sprain, strain, fracture, post-surgery — every Moon Walk
> user presents as a *limp* (uneven, guarded gait). Measuring the limp keeps us **cause-agnostic**
> and claim-safe: we measure the gait, we never diagnose why. So this doc is organised limp-first —
> detect the limp (timing), then characterise how the cane is used to compensate (loading), then
> retrain it (the WSFC loop).
>
> **Two sensor streams only.** Everything below comes from a 6-axis **IMU** (gyro + accel) and one
> **barometer** channel (air bladder under the grip = Handle Load). Nothing else is sampled.
>
> **Claim-safety binds every metric** ([ADR-0009]): relative to the patient's *own* baseline,
> never %-body-weight, never absolute force, never fall-risk, never a diagnosis or population norm.
>
> _Citations: DOIs marked ✅ are verified in the repo's reference docs
> ([`rehab/`](../rehab), [`gait-evidence-references.md`](./research/gait-evidence-references.md)).
> Those marked ⚠️ appear inline in `metrics.md` only and must be verified before external use._

---

## 0. The foundation — detecting a "plant"

Everything keys off knowing **when the cane strikes the ground** (a *plant*). Get this right and the
rest follows.

**What it is:** the instant the cane tip contacts the floor, once per Stick Cycle.

**How to calculate it (the honest target):** a plant happens when **two signals coincide**:
1. the swing-axis **gyro** angular rate passes through ≈0 (the cane stops rotating), **and**
2. the **accelerometer** shows an **impact spike** (the tip-strike shock).

The accel spike is what disambiguates a true plant from the mid-air swing turnaround (where the gyro
*also* passes through zero). After the plant comes a **stillness window** (both gyro and
accel-variance stay low while the cane is loaded).

> ⚠️ **What the code does today** (`realtime/hub.py` `CycleDetector`): it does **not** yet detect the
> true plant — it fires on the **peak swing velocity** (`gz` rising past +45 °/s) with a hysteresis
> band + 220 ms refractory. That's fine for *counting* cycles, but the accel-based true-plant detector
> is the needed upgrade for everything anchored to ground contact (stillness, loading instant, ZUPT).

**Why it matters (limp):** the plant is the heartbeat the whole limp analysis hangs off — every
per-step timing and loading decision is made relative to it.

**Evidence:**
- Salarian et al. 2004, *IEEE TBME* — gait events from a single gyro's angular-velocity peaks. DOI [`10.1109/TBME.2004.827933`](https://doi.org/10.1109/TBME.2004.827933) ✅ *(abstract-only; don't cite for cadence specifically)*
- Maqbool et al. 2016, *IEEE EMBC* — real-time gait-event detection from one IMU using gyro peaks **+ accelerometer**, with adaptive refractory timing. DOI [`10.1109/EMBC.2016.7591866`](https://doi.org/10.1109/EMBC.2016.7591866) ✅ *(shank-mounted — cane dynamics differ, thresholds need re-deriving)*

---

## 1. Cadence (and Stick Cycle Time)

**What it is:** how many steps per minute, and the time of one plant-to-plant cycle. The most
**reliable** single-IMU metric — lead with it.

**How to calculate:**
```
cycle_time = t_plant[n] − t_plant[n−1]        (gap between two plants, ms)
cadence    = 60000 / cycle_time               (cycles per minute)
```
Then rolling-average cadence over the last ~8 cycles to smooth jitter. (Exactly what `hub.py` does.)

**Where `t_plant` comes from:** the timestamp captured the instant the detector fires. Note: on real
hardware today it's the *host* clock at BLE-packet arrival (not the MCU clock the spec assumes) — so
it carries BLE latency jitter. Putting a real MCU timestamp in the packet is the clean fix.

**Why it matters (limp):** cadence drops and becomes effortful in a limp; it rises as gait recovers.

**Evidence:**
- Werner et al. 2020, *Sensors* — single body-fixed sensor, cadence valid (ICC 0.87–0.99). DOI [`10.3390/s20174866`](https://doi.org/10.3390/s20174866) ✅ *(⚠️ back-mounted on a **rollator**, not a cane — canes were listed as untested future work)*

---

## 2. Stick Duty Factor

**What it is:** the fraction of each cycle the cane is **planted (leaned on)** vs swinging — a
force-free read on cane dependence. *(Not leg-stance time — we instrument the stick, not the foot.)*

**How to calculate:**
```
duty_factor = planted_duration / cycle_time
```
`planted_duration` = the **stillness window** within the cycle, found from the IMU: angular-rate
magnitude `‖ω‖ = √(gx²+gy²+gz²)` below a small threshold (and accel-variance low) → "planted." The
now-built Handle Load barometer **sharpens** the plant/lift edges by confirming "loaded."

**Why it matters (limp):** how *long* per step the patient leans on the cane. A duty factor
**trending down** over weeks = needing the cane less = recovery.

**Status:** live (IMU-inferred); barometer makes it crisp. **Evidence:** same single-IMU validity basis (Werner 2020 ✅).

---

## 3. Stride Length & Gait Velocity (the Pendulum Model)

**What it is:** how far each step travels, and walking speed. **Trend-only** — never an absolute.

**How to calculate:**
```
stride   ≈ L · sin(θ)        (ZUPT-bounded)
velocity = stride · cadence
```
- **`L`** = stick length (entered at setup) — the geometric scale.
- **`θ`** = swing angle, from **integrating the gyro** over the swing: `θ += ω · Δt` (a running sum),
  **reset to zero at each plant** (the ZUPT — at the still plant `ω≈0`, so drift can only build over
  one swing, never across the walk). The accel can also read **absolute tilt from gravity** at the
  still plant, to correct integration drift.
- `L · sin(θ)` is just the **horizontal forward reach** of a rod of length `L` swung through angle `θ`.

**Why it matters (limp):** gait speed is *the* headline rehab outcome; a *lengthening* stride trend
is a real recovery signal even when the absolute number is uncertain.

**Status:** ⚠️ **not coded yet** — `hub.py` integrates nothing today. Trend-only, unvalidated for canes.

**Evidence:**
- Mao et al. 2021, *Scientific Reports* — stride from a single IMU via an **inverted-pendulum** model, validated vs motion capture. DOI [`10.1038/s41598-021-81009-w`](https://doi.org/10.1038/s41598-021-81009-w) ✅ *(shank-mounted)*
- Wang et al. 2019, *IEEE Sensors Lett.* — adaptive **ZUPT** zero-velocity detection. ✅
- Tilson et al. 2010, *Physical Therapy* — gait-speed **MCID ≈ 0.16 m/s** post-stroke. DOI [`10.2522/ptj.20090079`](https://doi.org/10.2522/ptj.20090079) ✅
- ⚠️ Honest caveat: **no published paper does cane-mounted gyro-pendulum stride** — Moon Walk's estimator is a novel synthesis (pendulum + ZUPT + trend-only posture). Pressure+auditory feedback's effect on gait *speed* is **weak** (Wang 2025, below) — don't over-promise this number.

---

## 4. Step Rhythm & Symmetry — **the limp meter** (live, IMU-only)

This is the single composite that *directly measures the limp*, and it ships today on the strongest
evidence. It has **two independent halves**.

### 4a. Symmetry Ratio (SR) — "how big is the limp?"

**What it is:** how *balanced* the two legs are.

**How to calculate:** the cane's plant intervals **alternate** long/short in a limp. Split them by
side, then:
```
SR = min(step_time_affected, step_time_unaffected) / max(…)
```
i.e. **shorter step time ÷ longer step time** — always 0…1.
- **SR = 1.0** → even → **no limp**.
- **SR < 1.0** → limp; lower = worse. (e.g. bad leg 0.6 s, good leg 0.9 s → 0.6/0.9 = **0.67**.)
- Using `min/max` means you don't need to know *which* side is worse.

> Which side is the **affected** one is **setup config** (clinician declares it / which hand holds the
> cane), **not** derivable from a cane IMU. SR itself is label-agnostic, so it works regardless.

### 4b. Consistency — "is it a *steady* limp or an *unstable* one?"

**What it is:** how regular the rhythm is, step to step.

**How to calculate:**
```
CV          = SD(step_time) / mean(step_time)      ← compute PER SIDE, not on mixed steps
consistency = 1 − CV
```
> ⚠️ **Limp subtlety:** if you compute CV over *all* steps mixed together, the alternating long/short
> limp pattern inflates the SD on its own and double-counts the asymmetry SR already measures. Compute
> CV **within each side separately** to isolate "steady rhythm" from "balanced sides."

### The combined score
```
score = 100 · (0.6 · SR + 0.4 · consistency)
```

**Why it matters (limp):** SR rising toward 1.0 = the limp shrinking. In a healing sprain,
**consistency** often recovers first (guarding fades), **symmetry** later (full reloading takes longer).

**Status:** live, IMU-only.

**Claim-safety:** CV is surfaced as **"step-timing consistency / steadiness," never fall risk** (a
banned framing). Relative to the patient's own baseline.

> **Terminology note:** `metrics.md` §4.1 writes `t_par`/`t_nonpar` ("paretic" = stroke-specific). For
> the broader user base (sprain/strain/fracture), the cause-agnostic labels are **affected/unaffected**
> and the gait is **antalgic**, not hemiparetic — the math is identical.

**Evidence:**
- Patterson et al. 2008, *Arch. Phys. Med. Rehabil.* — gait asymmetry as a quantifiable, trackable recovery marker. DOI [`10.1016/j.apmr.2007.08.142`](https://doi.org/10.1016/j.apmr.2007.08.142) ✅
- Hausdorff et al. 2001, *Arch. Phys. Med. Rehabil.* — step-time variability basis for the rhythm metric. DOI [`10.1053/APMR.2001.24893`](https://doi.org/10.1053/APMR.2001.24893) ✅ *(⚠️ associates variability with fall risk — we deliberately do NOT use that framing; surface as "steadiness" only)*
- ⚠️ `metrics.md` §4.1 additionally cites **Patterson 2010** (SR standardisation), **Chisholm 2014** (step-time variability post-stroke), **Yoshioka 2022** (symmetry responds to therapy) — inline-only, verify before external use.

---

## 5. Handle Load (relative) — how *hard* they lean

**What it is:** the direct measure of how much weight the patient offloads onto the cane — the
variable the whole therapy retrains. *Complementary to duty factor: load = how **hard**, duty factor
= how **long**.*

**How to calculate:** the barometer reads trapped-air pressure under the grip; subtract the session
tare, map pressure→load with a fitted **2nd-order polynomial**, express as **% of the patient's own
baseline**:
```
load   = a·(P − P_tare)² + b·(P − P_tare) + c
load%  = 100 · load / baseline_load
```
- `P_tare` = barometer zero, captured at session start after a brief grip/thermal settle.
- `a, b, c` = from a bench calibration (5/10/20/30 kgf against a scale) — **quadratic, not linear**.

**Status:** **available** — sensor built, bench-calibrated & drift/hysteresis-validated (2026-05-27, [ADR-0010]).

**Claim-safety:** relative to own baseline only. **kgf is bench-calibration / optional clinician
readout — never a marketed force or %BW figure.**

**Evidence:**
- Marquardt et al. 2022, *IEEE Humanoids* — barometer-in-silicone-dome force sensor; **quadratic** calibration (R²=99.6%); ~10 min equilibration + one per-trial tare. DOI [`10.1109/Humanoids53995.2022.10000204`](https://doi.org/10.1109/Humanoids53995.2022.10000204) ✅
- Dabling et al. 2012, *IEEE EMBC* — the **air-bubble sensor had the lowest drift** of five sensor types. DOI [`10.1109/EMBC.2012.6345896`](https://doi.org/10.1109/EMBC.2012.6345896) ✅
- Wheeler et al. 2011, *IEEE EMBS* — sealed fluid-filled bubble; keep bladder **in series** with the load path. DOI [`10.1109/IEMBS.2011.6090805`](https://doi.org/10.1109/IEMBS.2011.6090805) ✅
- Cerveri et al. 2017, *IEEE Trans. Haptics* — MEMS-barometer-in-elastomer; **RMSE 0.04 N**. DOI [`10.1109/TOH.2016.2636822`](https://doi.org/10.1109/TOH.2016.2636822) ✅
- Ballesteros et al. 2019, *Sensors* — weight-bearing estimable from **cane-mounted** sensors. DOI [`10.3390/s19030509`](https://doi.org/10.3390/s19030509) ✅

---

## 6. Baseline lean (baseline cane-dependence) — the personal "100%"

**What it is:** the reference all loading is measured against — the patient's natural, untrained
reliance on the cane.

**How to calculate:** during a **setup walk** (patient leans as they naturally do, before retraining),
read one **peak load per step**, collect them into a distribution, and take a **high percentile**
(≈90th):
```
baseline_lean = percentile(per_step_peaks, ~90%)
```
- **Not the mean** (dilutes the heavy leans), **not the max** (one stumble outlier) — a robust
  high percentile = their *characteristic* heavy reliance.
- The **Weight Support Target** is then a fading fraction of this (see §7).

**Status:** available (load sensor validated). ML model ① ([ADR-0012], *build now*) can **learn which
setup steps are representative** instead of a fixed percentile — an n-of-1 personalization (passes the
claim-safety gate because it trains on a physical measurement, not a "normal vs impaired" label).

**Evidence:**
- Jung et al. 2015, *Clinical Rehabilitation* — baseline = **mean peak cane force over 10 gait cycles**. DOI [`10.1177/0269215514540923`](https://doi.org/10.1177/0269215514540923) ✅
- Kang et al. 2021, *Med. Sci. Monitor* — baseline = **mean per-step support over a 20 m walk**. DOI [`10.12659/MSM.931565`](https://doi.org/10.12659/MSM.931565) ✅
- Tamburella et al. 2021, *Front. Neurol.* — thresholds set as **percentiles of the baseline load distribution**. DOI [`10.3389/fneur.2021.700472`](https://doi.org/10.3389/fneur.2021.700472) ✅
- *Why baseline matters at all:* clinicians/patients estimate weight-bearing **poorly** — Dabke et al. 2004, *Clin. Orthop. Relat. Res.* (off by ~35% BW) and Yu et al. 2014, *Orthopedics* (DOI [`10.3928/01477447-20131219-10`](https://doi.org/10.3928/01477447-20131219-10)) ✅ — so a measured baseline + feedback beats eyeballing it.

---

## 7. Weight Support Target Compliance — the WSFC's control signal

**What it is:** what fraction of steps the patient kept *at or below* the prescribed lean ceiling — the
flagship outcome and the loop's control signal.

**How to calculate:**
```
in_band_%  = 100 · (# steps with peak_load ≤ target) / total_steps
target      = faded −10%/week, from ≈60% → 30% of baseline_lean
advance the week ONLY when in_band_% ≥ 80
```
A **Schmitt deadband** ([ADR-0011]) avoids the cue chattering at the edge.

**Why it matters (limp):** it tells patient and clinician whether the prescribed *weaning* is actually
happening, and gates progression so the limp is retrained safely.

**Status:** available (sensor validated).

**Claim-safety:** target is **% of own baseline, never %BW**.

**Evidence:**
- Jung et al. 2015 ✅ — **originated the 60%-start / −10%/week fade** (held the threshold if >20% of steps beeped). DOI above.
- Kang et al. 2021 ✅ — the **"WSFC" namesake RCT**; added the **≥80%-success advance gate**; faded 60→50→40→30%. DOI above.
- Tamburella et al. 2021 ✅ — decision made **once per gait-cycle at the load peak**. DOI above.
- ⚠️ Honest scope (Wang et al. 2025, *J NeuroEng Rehabil*, DOI [`10.1186/s12984-025-01863-x`](https://doi.org/10.1186/s12984-025-01863-x) ✅): pressure+auditory feedback **significantly improves loading/muscle outcomes** but its effect on **gait speed is weak/non-significant** — so lead with the loading claim, not speed.

---

## 8. Session Weight-Support Training Load — the daily "did I practice?" score

**What it is:** one motivating figure for "how much *quality* retraining you banked today" (a
Whoop-Strain *analog*, not a physiological equivalence). Drives the Walk Buddies engagement layer.

**How to calculate (the simple recipe):** every step is one turn:
1. **Over the limit?** (`peak_load > target`) → that step scores **0** (broke the rule).
2. **Under the limit?** → score = **how much gentler than baseline** they were:
   `lean_reduction = max(0, 1 − load%/100)` (= `(baseline − peak_load) / baseline`).
3. **Add up every step**, then squash onto 0–100 (log curve: easy gains early, harder later).

```
raw   = Σ_steps ( lean_reduction · in_band_factor )      in_band_factor = 1 if in-band else 0
score = 100 · log(1 + raw) / log(1 + raw_max)
```

**Worked example** (`baseline = 100`, `target = 50`):

| Step | leaned (peak_load) | under limit? | in_band_factor | lean_reduction | contribution |
|---|---|---|---|---|---|
| A | 40 | yes | 1 | 1 − 0.40 = 0.60 | **0.60** |
| B | 70 | no  | 0 | — | **0** |
| C | 50 | yes | 1 | 1 − 0.50 = 0.50 | **0.50** |

`raw = 0.60 + 0 + 0.50 = 1.10` → scaled to a 0–100 score. *(Real session = thousands of steps.)*

**Status:** ⚠️ **available but not integrated** — load sensor validated, the integration is pending.

**Claim-safety:** a personal effort/progress figure, **not** a physiological or clinical grade;
relative to own baseline. *(Doc gap: `lean_reduction`/`in_band_factor` are used in `metrics.md` §4.2's
formula but never defined there — the definitions above should be folded back in.)*

**Evidence (structure borrowed from training-load science — ⚠️ all inline-only in `metrics.md` §4.2, verify before external use):**
- TRIMP / training-impulse: García-Ramos 2015 ⚠️
- session-RPE: Tibana 2018 ⚠️, Christen 2016 ⚠️
- rehab loading-dose grounding: Mercer 2009 ⚠️, Ribeiro 2019 ⚠️, Lang 2022 ⚠️
- Whoop-validation caveat (only HR/HRV/sleep *signals* validated, not the Strain algorithm): Miller 2022 ⚠️

---

## Quick reference — sensor → metric

| Metric | gyro | accel | barometer | also needs | status |
|---|:--:|:--:|:--:|---|---|
| Plant detection (§0) | ● | ● | (confirms) | thresholds | partial (code fires on swing peak, not true plant) |
| Cadence / cycle time (§1) | ● | ● | | — | **live** |
| Stick Duty Factor (§2) | ● | ● | (sharpens) | stillness window | **live** (IMU-inferred) |
| Stride / velocity (§3) | ●(θ) | (tilt) | | `L`, ZUPT | **not coded**, trend-only |
| Symmetry & rhythm (§4) | ● | ● | | per-side split, affected-side label | **live** |
| Handle Load (§5) | ●* | | ● | `P_tare`, `a,b,c`, baseline | **available** |
| Baseline lean (§6) | ●* | | ● | setup walk | **available** |
| WS Target compliance (§7) | ●* | ●* | ● | target band, deadband | **available** |
| Session Training Load (§8) | ●* | ●* | ● | baseline, target | **available, not integrated** |

`●* ` = IMU used to segment steps / mark *when* to read the barometer.

---

## Sources

- Formal spec & tiers: [`metrics.md`](./metrics.md) · architecture: [`architecture.md`](./architecture.md)
- Verified reference lists: [`rehab/metrics-biofeedback-references.md`](../rehab/metrics-biofeedback-references.md) ·
  [`rehab/wsfc-processing-references.md`](../rehab/wsfc-processing-references.md) ·
  [`rehab/sensing-and-pwb-evidence.md`](../rehab/sensing-and-pwb-evidence.md) ·
  [`docs/research/gait-evidence-references.md`](./research/gait-evidence-references.md)
- Decisions: [ADR-0009] (WSFC) · [ADR-0010] (pneumatic Handle Load) · [ADR-0011] (rule-based DSP) · [ADR-0012] (where ML earns its place)

[ADR-0009]: ./adr/0009-pivot-to-weight-support-feedback-cane.md
[ADR-0010]: ./adr/0010-pneumatic-barometer-handle-load.md
[ADR-0011]: ./adr/0011-wsfc-real-time-processing-rule-based-dsp.md
[ADR-0012]: ./adr/0012-where-ml-earns-its-place-on-moonwalk-data.md
