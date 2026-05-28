# Features & Measurable Metrics: Moon Walk

> Companion to [`PRD.md`](./PRD.md). Glossary: [`CONTEXT.md`](../CONTEXT.md).
> Decisions: [`docs/adr/`](./adr). Capitalised terms (Host Aid, Stick Cycle,
> Handle Load, Baseline, Drift, Alert, …) are defined in the glossary and used
> precisely here.

This document is the canonical reference for **what Moon Walk measures, what it
does not, and why**. It exists to prevent the recurring expectation gap: Moon
Walk instruments the **stick**, not the leg, and it has **no force plate**.

Moon Walk is **one sensor running several applications**, and **claim-safety is
per-application** (ADR-0009). The **flagship is the WSFC** — a clinical, real-time
weight-support biofeedback loop for a **Patient** under a prescribing **Clinician**;
**wellness gait monitoring** and the **Speaking Stick** are secondary. A shared boundary
holds across *all* applications: **no absolute force, no %-body-weight, no fall-risk, no
diagnosis**. What the WSFC alone adds is Patient/Clinician, real-time therapeutic feedback,
and a weight-bearing-retraining intent. See the Claim Safety discipline in
[`CONTEXT.md`](../CONTEXT.md), ADR-0005, and ADR-0009.

---

## 1. Feature List

### 1.1 Weight Support Feedback Cane — WSFC (flagship, clinical · ADR-0009)
Moon Walk on a cane, running a real-time weight-support biofeedback loop that retrains a
**Patient** to load the affected leg. Built on **Handle Load** (pneumatic barometer, ADR-0010)
+ IMU step segmentation; targets are relative to the patient's own baseline (no %BW).
| Feature | Description | PRD ref |
|---|---|---|
| Real-time weight-support feedback | Per-step Handle Load vs the **Weight Support Target**; auditory (default) / haptic cue when the Patient over-leans (out-of-band) | US-W1 |
| Per-patient Threshold Engine | Clinician sets the target band from a baseline walk; **faded −10%/week (≈60%→30% of baseline cane-dependence)**, advancing only when ≥80% of steps land in-band | US-W2 |
| Session / dose model | Targets ~30 min × 3–5/week × 4–6 weeks; logs in-band-step % per session | US-W3 |
| Clinician prescription + progress | Clinician sets target/fade/dose and reads recovery (paretic loading ↑, gait speed, adherence) | US-W4 |
| Self-referential, claim-safe target | Target is **% of the patient's own baseline cane-dependence**, never %BW or absolute-force; kgf is bench-calibration/clinician-readout only (ADR-0010) | US-W5 |

### 1.2 Gait Monitoring (wellness, secondary)
| Feature | Description | PRD ref |
|---|---|---|
| Automatic recording | Records walking whenever the Host Aid is used — no start/stop | US-6 |
| Cane Mode sensing | Stick Cycle detection (plant/swing), cadence, rhythm variability | US-17, 21 |
| Pendulum-model distance | Stride length + velocity, ZUPT-anchored to bound drift | US-18, 20 |
| Handle Load measurement | How hard the user leans on the stick (offload signal) | US-19 |
| Walker Mode sensing | Wheel-encoder odometry for distance/velocity | US-22 |
| Dual-grip asymmetry | Left-vs-right grip-load asymmetry → direct limp signal | US-23 |
| Temporal metrics | Cadence, Stick Duty Factor, asymmetry — headline reliable figures | US-14, 24 |
| Spatial trend metrics | Stride/velocity as relative trends only (labelled, not absolutes) | US-15 |
| Baseline learning | Learns the individual user's normal, on-device | US-25 |
| Drift detection + Alert | Non-medical wellness Alert only on **sustained** Drift | US-9, 26 |
| Wellness claim-safety framing | Alerts phrased as awareness cues ("you may want to mention it to your doctor"); inline MEDICAL CLAIM SAFETY disclaimer on every Alert + persistent dashboard footer; never diagnosis/treatment/fall-risk | US-9, 10 |

### 1.3 Speaking Stick (secondary — assistive)
| Feature | Description | PRD ref |
|---|---|---|
| Look Gesture trigger | Raise/point the stick to ask "what's in front of me?" | US-28 |
| Button trigger | Manual fallback if gesture isn't detected | US-29 |
| Scene Description (cloud VLM) | Camera frame → Gemini 2.5 Flash → spoken description via TTS | US-30 |
| Proximity Alert | Always-on, fully offline ToF → buzzer/haptic obstacle warning | US-31 |
| Graceful degradation | Offline proximity + canned fallback when cloud is slow/unreachable | US-32 |
| Assistive-only disclosure | Clear that it's a convenience, not a safety guarantee | US-33 |

### 1.4 Walk Buddies — engagement / adherence companion (ADR-0008)
An encouragement layer over the metrics — never a health rating. Reads the live metrics, adds
no sensing. Built as a local web view (ADR-0007); current build is full-colour Pokémon-Emerald art.
Under the WSFC, it doubles as the **adherence skin**: the MOVE bar reflects live in-band loading
(lean correctly → Buddy reacts) and show-up rewards track session adherence.
| Feature | Description | PRD ref |
|---|---|---|
| Buddy + Mood | Pokémon-style Buddy whose mood & posture follow the 0–100 Moon Walk Score (Asleep→Thrilled) | US-35, 40 |
| MOVE bar → Level Up | Buddy energy fills while walking, drains after a rest grace; filling it Levels Up (Level never decreases) | US-36 |
| Walk-Days + Pins | Additive lifetime walk-day count + thank-you milestone pins; streak never breaks | US-37 |
| Berry Garden | Advances one stage per walk-day; never wilts on a missed day (rest celebrated) | US-37 |
| Friends Album | Gentle gallery of collected buddies/keepsakes — no completion checklist | US-37 |
| Self-referential quality | Quality encouragement compared to the User's own Baseline, never a norm | US-38 |
| Claim-safe framing | Same wellness disclaimer; MOVE bar = Buddy's energy not User's vitality; coaching behind Training Mode | US-39 |
| Accessibility | ≥16px scalable text, mood as icon+word, shape+label (not colour alone), large tap targets | US-40 |

### 1.5 Supporting features
| Feature | Description | PRD ref |
|---|---|---|
| Clip-on form factor | Attaches to existing stick/walker; battery-powered, unobtrusive | US-1, 7 |
| Mode selection | User sets cane vs walker at setup (manual; auto-detect out of scope) | US-2 |
| Guided calibration | Stick-length entry + brief walk to tune stride/loading | US-3 |
| Per-user load calibration | Bench-calibrates the pneumatic Handle Load (barometer + bladder) against a scale; per-patient baseline cane-dependence for the WSFC target (mandatory) | US-4 |
| BLE phone pairing | Pairs over Bluetooth, no internet account | US-5 |
| Activity view (app) | User sees recent walking activity | US-8 |
| Trend report export | User *optionally* exports a report to share with a doctor | US-11, 13 |
| Baseline comparison view | If shared, a clinician sees current vs the user's own Baseline | US-16 |
| On-device privacy posture | Gait/health data on device + phone; only camera frames go to cloud | US-12, 34 |

---

## 2. Measurable Metrics

Moon Walk's sensing: a stick-mounted **IMU** (6-axis), a **pneumatic Handle Load**
sensor (air bladder under the grip → onboard **LPS22HB barometer**, ADR-0010), a
**ToF distance** sensor, and — in Walker Mode — a **wheel encoder**. Every metric
below derives from those. The organising principle:

> **Moon Walk gives you timing (trustworthy), distance/speed trends (directional),
> and relative lean/loading (per-user) — built from a stick, about the stick.
> It does not give ground forces or leg-segment kinetics.**

### Headline set — three co-equal metrics (no ranking among them)
The WSFC leads with **three** of the metrics below, presented together as the most important
reads; **none outranks the others**. Each is relative to the **Patient's own Baseline** — never
%BW, never absolute force, never fall-risk, never diagnosis, never a population norm.

| Headline metric | What it is | Built from |
|---|---|---|
| **Symmetry & Rhythm (limp)** | Live-today, strongest-evidence limp read — **cane-mode temporal step-time symmetry**: IMU symmetry ratio from alternating L/R plant intervals + rhythm consistency (1 − step-time CV). *Walker-mode dual-grip load asymmetry is a future secondary route, never the headline.* | Tier 1 Asymmetry + Rhythm variability |
| **Stick Duty Factor** | Fraction of each Stick Cycle the cane is loaded — a force-free read on cane dependence | Tier 1 Stick Duty Factor |
| **Session Weight-Support Training Load** | Per-session integrated loading-quality dose (intensity × volume) — the engagement / adherence figure | Tier 3 loading × session volume |

### Tier 1 — Reliable headline metrics (temporal)
Pure functions of Stick Cycle detection. Lead with these.

| Metric | Source | Notes |
|---|---|---|
| Cadence (cycles/min) | Stick Cycle period | The "cycles/minute" figure |
| Stick Cycle time | Plant-to-plant interval | Proxy for gait cycle time — **not** identical (CONTEXT.md:47) |
| Stick Duty Factor | Fraction of cycle handle is loaded | **Not** leg-stance duty factor (CONTEXT.md:51–53) |
| Loaded / unloaded duration | Handle Load timing within a cycle | Honest stand-in for "stance/swing" (stick-loaded time) |
| Rhythm variability | Cycle-to-cycle timing spread | Captures unsteady gait |
| Cycle count | Count of plant events | Honest "number of stance" = count of stick plants |
| Asymmetry | L/R timing (cane) or dual-grip load (walker) | Direct limp signal |

### Tier 2 — Trend-only metrics (spatial)
Real and useful, but **never presented as clinical absolutes** — change-over-time only.

| Metric | Source | Notes |
|---|---|---|
| Stride length | Pendulum Model (cane) / wheel odometry (walker) | Trend only |
| Gait velocity | stride length × cadence | Trend only |
| Distance walked | Accumulated stride / encoder | Trend only |

### Tier 3 — Loading metrics (relative, per-user) · NOT %BW, NOT a clinical absolute
Closest Moon Walk gets to force data — but this is **handle force, not ground
reaction force**. Sensed pneumatically (bladder + barometer, ADR-0010); the barometer
*can* be bench-calibrated to kgf (~10–20%), but kgf is **internal only** — never a
marketed/clinical unit. The **WSFC target** and all surfaced loading are **% of the
patient's own baseline**, keeping the no-%BW / no-absolute-force boundary intact.

| Metric | Source | Honest framing |
|---|---|---|
| Handle Load (relative) | Pneumatic bladder + barometer | "How hard the user leans on the stick" |
| Peak handle load per cycle | Barometer peak (swing-tared) | Relative units, per-user baseline |
| Weight Support Target compliance | Handle Load vs per-patient band | WSFC: % of steps in-band; % of own baseline, not %BW |
| L/R load asymmetry (Walker) | Dual-grip pneumatic pads | Direct uneven-loading signal |

---

## 3. Out of Scope / Out of Physical Reach

Documented so the boundary is explicit. The following are **not deliverable** with
the current architecture and contradict ADR-0001 (measure-and-trend) and ADR-0004
(stick-mounted, two-board):

**Claim-wise (shared bans — bind *all* applications, incl. the WSFC; ADR-0001/0005/0009):**
- **Diagnosis or disease prediction** — even the WSFC retrains a prescribed behaviour; it does
  not diagnose. A human (Clinician, or User/doctor in wellness) interprets.
- **Fall-risk prediction / "likely to fall"** — the tempting walking-aid overclaim;
  explicitly banned in every application.
- **Stress / emotional-state inference** — Moon Walk senses gait and handle load
  only; it has no affect-sensing capability.
- *(WSFC only)* what it **may** do that wellness may not: real-time therapeutic feedback,
  address a **Patient** under a **Clinician**, and state a weight-bearing-retraining intent —
  all still within the bans above (ADR-0009).

**Physically out of reach (no force plate):**
- **True leg stance time** — Moon Walk knows when the *handle* is loaded, not when a
  *foot* is on the ground (CONTEXT.md:53).
- **Ground reaction forces** of any axis (vertical / anterior-posterior /
  medial-lateral) — requires a force plate or pressure insoles.
- **Clinical force claims in Newtons/kgf** — the pneumatic Handle Load *can* be
  bench-calibrated to ~10–20% kgf, but that stays **internal** (calibration + optional
  clinician readout); we make no lab-grade absolute-force claim, and surfaced/target loading
  is **relative to the patient's own baseline** (ADR-0010).
- **Forces in %body-weight** — the device never knows the user's body weight; the WSFC target
  is % of *own baseline cane-dependence*, not %BW.
- **Braking / propulsion phases & their forces** — require the A-P GRF axis.
- **Impulses (Ns), impact/active peaks, times-to-peak, force-derived velocity
  changes** — all force-plate curve features.

Delivering any of these would be a **scope change** requiring new sensing hardware
(pressure insoles, foot-mounted IMUs, or a force plate) and a new ADR.
