# Features & Measurable Metrics: Moon Walk

> Companion to [`PRD.md`](./PRD.md). Glossary: [`CONTEXT.md`](../CONTEXT.md).
> Decisions: [`docs/adr/`](./adr). Capitalised terms (Host Aid, Stick Cycle,
> Handle Load, Baseline, Drift, Alert, …) are defined in the glossary and used
> precisely here.

This document is the canonical reference for **what Moon Walk measures, what it
does not, and why**. It exists to prevent the recurring expectation gap: Moon
Walk instruments the **stick**, not the leg, and it has **no force plate**.

Moon Walk is a **consumer-wellness self-monitoring** product (ADR-0005). Everything
below is framed as awareness and guidance for the **User** — never diagnosis,
treatment, or fall-risk prediction. See the Claim Safety language discipline in
[`CONTEXT.md`](../CONTEXT.md).

---

## 1. Feature List

### 1.1 Gait Monitoring (primary)
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

### 1.2 Speaking Stick (secondary — the demo headline)
| Feature | Description | PRD ref |
|---|---|---|
| Look Gesture trigger | Raise/point the stick to ask "what's in front of me?" | US-28 |
| Button trigger | Manual fallback if gesture isn't detected | US-29 |
| Scene Description (cloud VLM) | Camera frame → Gemini 2.5 Flash → spoken description via TTS | US-30 |
| Proximity Alert | Always-on, fully offline ToF → buzzer/haptic obstacle warning | US-31 |
| Graceful degradation | Offline proximity + canned fallback when cloud is slow/unreachable | US-32 |
| Assistive-only disclosure | Clear that it's a convenience, not a safety guarantee | US-33 |

### 1.3 Walk Buddies — motivation companion (ADR-0008)
An encouragement layer over the gait metrics — never a health rating. Reads the live
metrics, adds no sensing. Built/validated as a local web view (ADR-0007); current build is
full-colour Pokémon-Emerald art.
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

### 1.4 Supporting features
| Feature | Description | PRD ref |
|---|---|---|
| Clip-on form factor | Attaches to existing stick/walker; battery-powered, unobtrusive | US-1, 7 |
| Mode selection | User sets cane vs walker at setup (manual; auto-detect out of scope) | US-2 |
| Guided calibration | Stick-length entry + brief walk to tune stride/loading | US-3 |
| Per-user grip calibration | Calibrates personal FSR thresholds (mandatory) | US-4 |
| BLE phone pairing | Pairs over Bluetooth, no internet account | US-5 |
| Activity view (app) | User sees recent walking activity | US-8 |
| Trend report export | User *optionally* exports a report to share with a doctor | US-11, 13 |
| Baseline comparison view | If shared, a clinician sees current vs the user's own Baseline | US-16 |
| On-device privacy posture | Gait/health data on device + phone; only camera frames go to cloud | US-12, 34 |

---

## 2. Measurable Metrics

Moon Walk's sensing: a stick-mounted **IMU** (6-axis), a **multi-FSR handle grip**,
a **ToF distance** sensor, and — in Walker Mode — a **wheel encoder**. Every metric
below derives from those. The organising principle:

> **Moon Walk gives you timing (trustworthy), distance/speed trends (directional),
> and relative lean/loading (per-user) — built from a stick, about the stick.
> It does not give ground forces or leg-segment kinetics.**

### Tier 1 — Reliable headline metrics (temporal) · ICC 0.72–0.97
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

### Tier 2 — Trend-only metrics (spatial) · ICC 0.72–0.76, ~25–42% absolute error
Real and useful, but **never presented as clinical absolutes** — change-over-time only.

| Metric | Source | Notes |
|---|---|---|
| Stride length | Pendulum Model (cane) / wheel odometry (walker) | Trend only |
| Gait velocity | stride length × cadence | Trend only |
| Distance walked | Accumulated stride / encoder | Trend only |

### Tier 3 — Loading metrics (relative, per-user) · NOT Newtons or %BW
Closest Moon Walk gets to force data — but this is **handle force, not ground
reaction force** (CONTEXT.md:55–61).

| Metric | Source | Honest framing |
|---|---|---|
| Handle Load (relative) | Multi-FSR grip | "How hard the user leans on the stick" |
| Peak handle load per cycle | FSR peak | Relative units, per-user baseline |
| Grip-pressure distribution | Multi-point FSR | Grip asymmetry indicator |
| L/R load asymmetry (Walker) | Dual-grip FSRs | Direct uneven-loading signal |

---

## 3. Out of Scope / Out of Physical Reach

Documented so the boundary is explicit. The following are **not deliverable** with
the current architecture and contradict ADR-0001 (measure-and-trend) and ADR-0004
(stick-mounted, two-board):

**Claim-wise (ADR-0005 — wellness, not medicine):**
- **Diagnosis, treatment, or medical decisions** — Moon Walk surfaces awareness; a
  human (the User, optionally a doctor) interprets.
- **Fall-risk prediction / "likely to fall"** — the tempting walking-aid overclaim;
  explicitly banned.
- **Stress / emotional-state inference** — Moon Walk senses gait and handle load
  only; it has no affect-sensing capability.

**Physically out of reach (no force plate):**
- **True leg stance time** — Moon Walk knows when the *handle* is loaded, not when a
  *foot* is on the ground (CONTEXT.md:53).
- **Ground reaction forces** of any axis (vertical / anterior-posterior /
  medial-lateral) — requires a force plate or pressure insoles.
- **Forces in Newtons** — FSRs are relative/per-user, not lab-calibrated.
- **Forces in %body-weight** — the device never knows the user's body weight.
- **Braking / propulsion phases & their forces** — require the A-P GRF axis.
- **Impulses (Ns), impact/active peaks, times-to-peak, force-derived velocity
  changes** — all force-plate curve features.

Delivering any of these would be a **scope change** requiring new sensing hardware
(pressure insoles, foot-mounted IMUs, or a force plate) and a new ADR.
