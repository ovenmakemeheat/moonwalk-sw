# Pivot to a Weight Support Feedback Cane (WSFC) — a clinical line on the same hardware

Moon Walk pivots from a **consumer-wellness gait self-monitor** to a **clinical Weight Support
Feedback Cane (WSFC)**: an instrumented cane that measures, in real time, how much weight the
patient offloads onto the cane and gives **immediate feedback** (auditory beep / haptic) when they
over-lean — training stroke and lower-limb rehab patients to **load the affected leg**. The product's
centre of gravity moves from *passive awareness* (record → Baseline → Drift → Alert) to *active
therapeutic retraining* (per-step load → per-patient target band → real-time cue → recovery).

This is a **repositioning of the same device, not a new device.** The WSFC reuses the existing
hardware and most of the software. It runs as a **clinical product line in this repo**; the wellness
framing is preserved as the `wellness-v1` tag (and `feat/walk-buddies-emerald`) as a fallback / second
audience, not deleted.

**Why.**
- *The evidence points here.* The strongest clinical evidence for a force-sensing cane is precisely
  this loop: a cane load sensor + auditory feedback + a faded threshold schedule retrains paretic-limb
  loading. Jung et al. 2015 (RCT, *Clin Rehabil*, [DOI 10.1177/0269215514540923]) and Kang et al. 2021
  (RCT, n=30 chronic stroke, *Med Sci Monit*, [DOI 10.12659/MSM.931565]) both showed added gains in
  paretic muscle activation (gluteus medius +57 vs +11 %RVC, p=.004), single-limb support, and gait
  symmetry over conventional cane training. Full evidence + citations in
  [`rehab/metrics-biofeedback-references.md`](../../rehab/metrics-biofeedback-references.md) and
  [`rehab/recovery-evidence.md`](../../rehab/recovery-evidence.md).
- *The white space is real.* No published study combines a force-sensing rehab cane, this biofeedback
  protocol, **and** an engagement/adherence layer (our Walk Buddies). The Resch et al. 2025 scoping
  review confirms instrumented-cane studies report sensor accuracy, never recovery outcomes. So WSFC
  is a defensible, differentiated bet — but it means we aim to *generate* the recovery evidence, not
  merely cite it.
- *The hardware already fits.* Moon Walk's multi-FSR **Handle Load** is exactly the WSFC load signal
  (the PRD already calls it "the strongest limp/offload signal"); the IMU + Stick Cycle Detector give
  per-step segmentation and recovery metrics; the always-on Nano already drives the buzzer/haptic
  ([ADR-0004](./0004-two-board-uno-q-brain-nano-sensor-node.md)). The pivot is large in *narrative*,
  small in *code*.

**Decisions.**
- **"Patient" is a legitimate term in the WSFC line.** This amends
  [ADR-0005](./0005-wellness-positioning-and-claim-safety-vocabulary.md): the User-only / wellness
  vocabulary remains binding for the wellness line (`wellness-v1`), but the clinical WSFC line
  addresses **stroke/rehab Patients**, names a **prescribing Clinician** as the primary actor, and may
  state a therapeutic intent (retrain weight-bearing). This also supersedes the passive-only posture of
  [ADR-0001](./0001-measure-and-trend-not-diagnostic.md) **for the WSFC line**: real-time corrective
  feedback against a clinician-set target *is* the product.
- **Core loop = WSFC Feedback Loop + Threshold Engine.** New first-class modules: read per-step cane
  load → compare to the patient's **target band** → emit real-time auditory (default) or haptic cue
  when out-of-band → log in-band-step %. A **Threshold Engine** sets the band from a baseline 20 m
  walk and **fades it −10%/week (≈60%→30% of baseline cane-dependence), advancing only when ≥80% of
  steps land in-band**. A **Session/Dose** model targets 30 min × 3–5/week × 4–6 weeks.
- **Relative load, not Newtons/%BW.** The device still never knows body weight. Thresholds are
  expressed as **% of the patient's own measured baseline cane-dependence**, preserving the no-absolute-
  force boundary of [`docs/FEATURES.md`] while giving the loop a clinically actionable target.
- **Walk Buddies is repurposed as the engagement/adherence skin**, not a co-equal layer. The Buddy's
  MOVE bar becomes the *live in-band-loading display* (lean correctly → Buddy reacts); show-up rewards
  become *session-adherence* rewards. It reads metrics only and adds no sensing — unchanged in
  spirit from [ADR-0008](./0008-walk-buddies-emerald-gamification.md). Note: ADR-0008 deliberately
  excludes "improvement-in-Score" as a KPI to dodge a medical-claim trap; **under WSFC, improvement IS
  the goal**, so the clinical line tracks clinical outcomes (below) as success metrics.
- **Success metrics (clinical line):** paretic-limb loading ↑, gait speed (MCID ≥ 0.16 m/s, Tilson
  2010), cadence, symmetry index, in-band-step %, and session adherence. The wellness line keeps its
  Weekly-Active-Walk-Days north star.

**Consequences.**
- **Handle Load is measurable with hardware in hand — the supposed blocker dissolves.**
  [ADR-0010](./0010-pneumatic-barometer-handle-load.md) senses Handle Load via a pneumatic bladder +
  the onboard **LPS22HB barometer** ($0 BOM, no FSR), giving the ~10–20% relative-load trend the WSFC
  threshold engine needs. So the weight-support feedback loop is buildable *now*; the gating task is
  **bench-calibrating and leak/drift-validating** the pneumatic sensor, not acquiring an FSR. *(This
  corrects this ADR's original framing, which wrongly called the un-acquired FSR the #1 blocker.)*
- **Regulatory posture changes.** A real-time therapeutic biofeedback device that retrains
  weight-bearing is plausibly a **regulated medical device**, unlike consumer wellness. We do **not**
  pre-pay that cost now (no IEC 62304 lifecycle, no separate quality-managed repo yet), but the
  decision is explicitly flagged and owned: a firm clinical/partner commitment triggers a follow-up ADR
  on regulatory pathway and possible repo separation.
- **Honest evidence framing.** WSFC's pitch is *generating* recovery evidence via our own validation,
  not citing existing cane-recovery RCTs (which don't exist). Cited evidence (Jung, Kang) is small
  single-site pilots; the broader meta-analytic effect on gait speed is modest. PRD and any external
  copy must say this plainly.
- **What stays unchanged:** clip-on-the-existing-aid form factor; two-board Nano + UNO Q architecture
  ([ADR-0004](./0004-two-board-uno-q-brain-nano-sensor-node.md)); the IMU gait engine and Stick Cycle
  Detector; per-user calibration + History Store; the Walk Buddies engine (`realtime/game/`, reskinned
  not rewritten); the simulated-feed transport ([ADR-0007](./0007-local-websocket-transport-for-dashboard-demo.md))
  for developing the loop before hardware lands; Cane Mode.
- **Out of scope for the pivot (for now):** the Speaking Stick VLM layer
  ([ADR-0003](./0003-add-see-and-speak-assistive-layer.md)) is orthogonal — kept as an optional
  accessibility add-on, not part of the WSFC clinical story. Walker Mode is secondary to the
  stroke-cane WSFC narrative.

## Status

accepted. Wellness Moon Walk is snapshotted at tag `wellness-v1`; WSFC work proceeds on
`feat/wsfc-pivot`. Pending follow-ups: PRD edits (problem statement, Patient user, WSFC Feedback Loop +
Threshold Engine modules, clinical success metrics, Walk Buddies demotion); a regulatory-pathway ADR
once a clinical commitment is firm; physical acquisition + calibration of the multi-FSR Handle Load
grip.

[DOI 10.1177/0269215514540923]: https://doi.org/10.1177/0269215514540923
[DOI 10.12659/MSM.931565]: https://doi.org/10.12659/MSM.931565
[`docs/FEATURES.md`]: ../FEATURES.md
[`CONTEXT.md`]: ../../CONTEXT.md
