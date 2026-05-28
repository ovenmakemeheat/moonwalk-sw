# Spec — WSFC real-time Handle-Load biofeedback

Specification for the on-Nano biofeedback loop implemented in
[`wsfc_load_feedback.ino`](./wsfc_load_feedback.ino). Build instructions are in
[`README.md`](./README.md); this document defines **what the firmware must do**,
its interfaces, and how to verify it.

- **Status:** implemented (V1); V2 hardening specified in §11.
- **Applies to:** the flagship **WSFC** application (`CONTEXT.md`; ADR-0009,
  ADR-0010, ADR-0011, ADR-0013).
- **Capitalised terms** (Handle Load, Weight Support Target, Baseline lean, Stick
  Cycle, Patient, Clinician) are defined in `CONTEXT.md` and used precisely here.

---

## 1. Purpose & scope

Give a **Patient** recovering from a sprain / strain / lower-limb soft-tissue
injury an **immediate, offline cue** the moment they **over-lean on the cane**
(over-protect the healing limb), so they stay inside a **progressive optimal
loading** progression and recover faster.

**In scope:** read Handle Load from the pneumatic bladder → LPS22HB barometer,
establish a per-session zero and a per-patient Baseline lean, compare live load to
a Weight Support Target ceiling, and drive an auditory cue + status LED entirely on
the Nano.

**Out of scope:** see §10.

---

## 2. Definitions (signal)

| Symbol | Meaning | Unit |
| --- | --- | --- |
| `P` | absolute pressure from LPS22HB | Pa (lib returns kPa ×1000) |
| `P_tare` | session zero-load reference (cane in air) | Pa |
| `dP` | **Handle Load**, relative: `max(0, P − baseline_ref)` | Pa (relative only) |
| `baseline_lean` | peak `dP` captured during calibration | Pa |
| `target` | **Weight Support Target** ceiling = `frac(week) × baseline_lean` | Pa |

> **Normative — relative only.** `dP` and `target` are **internal relative**
> signals. The firmware MUST NOT compute, store, or emit kgf, Newtons, or
> %body-weight. (`CONTEXT.md` → Claim Safety; ADR-0010.)

---

## 3. Functional requirements

- **FR-1 Sense.** The firmware SHALL read Handle Load from the LPS22HB and derive
  `dP` relative to a zero reference (§2). It SHALL NOT use absolute pressure for
  any decision.
- **FR-2 Tare.** On entry to a session it SHALL establish `P_tare` by averaging
  pressure over `TARE_MS` with the cane held unloaded (in the air).
- **FR-3 Calibrate Baseline.** It SHALL capture `baseline_lean` as the peak `dP`
  over `CAL_MS` while the Patient leans normally, and SHALL reject a capture below
  `BASELINE_MIN_DP_PA` (bladder unloaded / disconnected) and retry.
- **FR-4 Target.** It SHALL compute `target = WEEK_TARGET_FRAC[week] ×
  baseline_lean`, where `week ∈ {1..4}` selects the fade schedule
  `{0.60, 0.50, 0.40, 0.30}` (same fractions as `ml_pipeline/wsfc_loading_metrics.py`).
- **FR-5 Over-lean decision.** In RUN it SHALL classify each moment as **over-lean**
  iff `dP` exceeds `target`, with Schmitt hysteresis and min on/off timing (§6) so
  a load hovering on the line does not chatter.
- **FR-6 Auditory cue.** While over-lean it SHALL emit an **intermittent** tone at
  `OVER_TONE_HZ` on the passive buzzer (beep/pause, never continuous). While in-band
  it SHALL be **silent**.
- **FR-7 Status LED.** It SHALL drive the onboard RGB LED as a **status indicator
  only** (§5), never as the primary walking cue.
- **FR-8 Offline.** The full sense→decide→cue loop SHALL run on the Nano with no
  BLE, network, or host dependency.
- **FR-9 Operator control.** It SHALL accept the serial commands in §7 for
  re-tare, re-calibrate, week selection, and status.
- **FR-10 Fault recovery.** On barometer init failure it SHALL retry, then reboot
  (`NVIC_SystemReset`) rather than hang (matching `nano_imu_ble_sender.ino`).

---

## 4. State machine

```
  ┌────────┐  avg P over TARE_MS   ┌───────────┐  peak dP ≥ MIN over CAL_MS  ┌───────┐
  │  TARE  │ ────────────────────► │ CALIBRATE │ ──────────────────────────► │  RUN  │
  └────────┘   (blue blink)        └───────────┘   (cyan solid)              └───────┘
       ▲             ▲  peak < MIN: flash red, retry        │ green / red
       │ 't'         │ 'c'                                   │
       └─────────────┴───────────────────────────────────── 't' / 'c'
```

| State | Entry condition | Behaviour | Exit |
| --- | --- | --- | --- |
| **TARE** | boot, or `t` | blink **blue**; average `P` → `P_tare` | after `TARE_MS` → CALIBRATE |
| **CALIBRATE** | from TARE, or `c` | solid **cyan**; track peak `dP` → `baseline_lean` | peak ≥ `BASELINE_MIN_DP_PA` → RUN; else flash red, repeat |
| **RUN** | from CALIBRATE | evaluate FR-5; drive FR-6/FR-7 | `t` → TARE, `c` → CALIBRATE |

TARE and CALIBRATE are blocking phases (one-shot, ~2 s / ~8 s); serial commands are
honoured at the start of each loop and between phases. RUN is non-blocking.

---

## 5. Output spec — status LED (onboard RGB, active-LOW)

| Condition | Colour |
| --- | --- |
| Taring | blue, blinking ~5 Hz |
| Calibrating | cyan, solid |
| Calibration rejected (too low) | red, 3 short flashes, then retry |
| RUN — in-band (loading the leg correctly) | **green** |
| RUN — over-lean (over-protecting via the cane) | **red** |

Rationale: visual competes with the Patient's gaze on the path, so the LED is a
status light, not the load cue (load-biofeedback evidence; `README.md` §10).

## 5b. Output spec — auditory cue (passive piezo, `BUZZER_PIN`)

| Condition | Sound |
| --- | --- |
| In-band | silent |
| Over-lean | `OVER_TONE_HZ` (900 Hz), `BEEP_ON_MS` on / `BEEP_OFF_MS` off, repeating |

Rationale: 900 Hz sits in the low/elderly-audible IEC 60601-1-8 alarm band
(presbycusis attacks high frequencies first); intermittent + threshold-gated avoids
alarm fatigue (ADR-0011).

---

## 6. Decision logic (normative)

Let `target = WEEK_TARGET_FRAC[week-1] × baseline_lean`.

```
on each RUN iteration (now = millis()):
  dP = max(0, P − P_tare)            # V1 zero ref; V2 uses swing baseline (§11)
  if not over_lean:
      if dP > target and (now − last_change) ≥ MIN_CUE_OFF_MS:
          over_lean = true;  last_change = now
  else:
      if dP < target × (1 − HYST_FRAC) and (now − last_change) ≥ MIN_CUE_ON_MS:
          over_lean = false; last_change = now
  LED  = over_lean ? RED : GREEN
  buzz = over_lean ? intermittent(OVER_TONE_HZ) : silent
```

- **Hysteresis:** enter over-lean above `target`; clear only below
  `target × (1 − HYST_FRAC)`.
- **Min on/off:** a raised cue persists ≥ `MIN_CUE_ON_MS`; a cleared cue stays off
  ≥ `MIN_CUE_OFF_MS`.

---

## 7. Interface — serial (115200 baud, line-free, single char)

| Command | Effect |
| --- | --- |
| `t` | silence buzzer, enter **TARE** |
| `c` | silence buzzer, enter **CALIBRATE** |
| `1`..`4` | set recovery `week` → target fraction (60/50/40/30 %); echoes new target |
| `?` | print `mode`, `P_tare`, `baseline_lean`, `week`, `target`, live `dP` |

Output during TARE/CALIBRATE/RUN transitions is human-readable status text on
Serial; there is no binary protocol and no BLE in this firmware.

---

## 8. Configuration parameters

| Constant | Default | Meaning |
| --- | --- | --- |
| `BUZZER_PIN` | `9` | passive piezo output |
| `TARE_MS` | `2000` | tare averaging window |
| `CAL_MS` | `8000` | baseline-lean capture window |
| `BASELINE_MIN_DP_PA` | `100` | min plausible baseline; below → reject + retry |
| `WEEK_TARGET_FRAC` | `{0.60,0.50,0.40,0.30}` | target ceiling fade by week |
| `HYST_FRAC` | `0.10` | Schmitt deadband (fraction of target) |
| `MIN_CUE_ON_MS` / `MIN_CUE_OFF_MS` | `300` / `200` | anti-chatter timing |
| `OVER_TONE_HZ` | `900` | over-lean tone frequency |
| `BEEP_ON_MS` / `BEEP_OFF_MS` | `150` / `150` | intermittent beep cadence |

The **Clinician** owns the clinical parameters (`week`/fade pace, and ultimately
the target band and dose); the rest are signal/UX tunables.

---

## 9. Non-functional requirements

- **NFR-1 Latency.** Cue SHALL follow a sustained threshold crossing within one
  step (≤ ~200 ms). (Motor-biofeedback latency budget; `README.md` §7.)
- **NFR-2 Offline & always-on.** No network or host at runtime (ADR-0004).
- **NFR-3 Robustness.** Transient sensor faults SHALL self-recover (FR-10).
- **NFR-4 Claim safety.** No kgf/N/%BW, no diagnosis, no fall-risk anywhere in
  output (FR strings, serial). Targets are % of the Patient's own Baseline.

---

## 10. Out of scope (this firmware)

- Absolute force / kgf / %body-weight readout (ADR-0010).
- Per-step Stick-Cycle gait segmentation, asymmetry, cadence, distance — those are
  the deep modules in the PRD, not this cue loop.
- BLE / phone / cloud streaming (this loop is Nano-local).
- Clinician dashboard, session logging/history (lives on the Compute Brain).
- Diagnosis, disease/fall-risk prediction (ADR-0001).

---

## 11. Known limitation & V2 (must-do before unsupervised / longer use)

**The LPS22HB is an absolute barometer** — it measures weather and altitude. V1
uses a single session-start `P_tare`, which is adequate only for a **short,
supervised, indoor, temperature-stable** WSFC session (the ADR-0010 supervised
case). For real walking, stairs/elevators (~12 Pa/m), weather fronts (±20–30 hPa),
trapped-air temperature drift (P ∝ T), and bladder creep/leak will inject phantom
load.

**V2 requirements:**
- **V2-1 Differential baseline.** Replace the fixed `P_tare` with a continuously
  tracked **swing-phase-anchored baseline** (EWMA/median of the swing-phase
  minimum over ~5–10 s); `dP = P − baseline`. Re-anchor each Stick Cycle.
- **V2-2 Temperature compensation.** Linear correction from the LPS22HB temp
  channel (linear suffices — Takktile/Tenzer 2014), bench-calibrated 18–30 °C.
- **V2-3 Sensor config.** ODR 75 Hz with on-chip LPF ≈ ODR/9.
- **V2-4 Per-step peak.** Smooth ~5 samples, one peak per Stick Cycle, refractory
  300–400 ms, ≥2-sample debounce before firing.
- **V2-5 Threshold from distribution.** Set the ceiling as a percentile of the
  Patient's learned Baseline peak distribution rather than a single peak.

See `README.md` §7 for the V1↔V2 table and citations.

---

## 12. Acceptance criteria (verification)

Maps to the PRD "WSFC Feedback Loop" test (cue iff out-of-band) and "Threshold
Engine" test.

- **AC-1** With `dP` held below `target`: LED green, buzzer silent. ✔/✗
- **AC-2** Cross `dP` above `target`: within ≤200 ms LED turns red and the
  intermittent tone starts. ✔/✗
- **AC-3** Drop `dP` between `target×(1−HYST_FRAC)` and `target`: cue **stays on**
  (hysteresis), proving no chatter. ✔/✗
- **AC-4** Drop `dP` below `target×(1−HYST_FRAC)`: cue clears to green/silent after
  `MIN_CUE_ON_MS`. ✔/✗
- **AC-5** Press `2`: `target` drops to `0.50×baseline_lean`; a load previously
  in-band at week 1 may now be over-lean (the fade is observable). ✔/✗
- **AC-6** Calibrate with the bladder unloaded: capture rejected, red flashes,
  CALIBRATE repeats (no false Baseline). ✔/✗
- **AC-7** No serial output, FR string, or computed value anywhere expresses kgf,
  N, or %body-weight. ✔/✗
- **AC-8** (V2) Climb stairs while in-band: a V1 build false-fires on the altitude
  shift; a V2 build does not. ✔/✗

> AC-2/3/4 are bench-testable today by squeezing the bladder; AC-8 requires V2 and
> a stairwell. Per-step gait behaviour (one cue per Stick Cycle) is a V2 concern.
