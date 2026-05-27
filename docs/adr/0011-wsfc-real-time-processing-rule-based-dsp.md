# WSFC real-time processing: a rule-based + DSP core loop, ML deferred

The **WSFC Feedback Loop** turns sensor signals into the real-time over-lean cue with a
**rule-based + DSP pipeline, not machine learning.** The loop decomposes into three
sub-problems, each resolved to the simplest sufficient method: (1) **step / swing-phase
segmentation** from the IMU — a rule-based gyro detector; (2) **load conditioning** —
classical DSP (tare → polynomial calibration curve → relative load, with light smoothing);
(3) the **cue decision** — a per-patient threshold compared once per step at the load peak,
with a Schmitt deadband to stop chattering. **ML is explicitly deferred** to a named fallback
for sub-problem (1) only, and only if the rule-based detector demonstrably fails on real
combined IMU+load data. No ML in the cue decision, ever.

The **Threshold Engine** ([ADR-0009](./0009-pivot-to-weight-support-feedback-cane.md))
keeps Jung/Kang's clinically-validated **scalar faded-target** semantics — a target = a
percentage of the patient's own measured baseline cane-dependence, faded −10%/week
(≈60%→30%), advancing only when ≥80% of a week's steps land in-band — but estimates that
"baseline cane-dependence" as a **percentile of the per-step-peak load distribution**
(Tamburella's mechanics) rather than a raw mean, for robustness to outlier hard-plants. The
target is always expressed as **% of the patient's own baseline, never %-body-weight**
([ADR-0010](./0010-pneumatic-barometer-handle-load.md), CONTEXT.md **Weight Support Target**).

**Why.**
- *Every clinical system that validates this loop is rule-based + threshold.* Jung et al.
  2015 (cane pressure sensor → beep above threshold), Kang et al. 2021 (the namesake WSFC,
  load cell → beep-while-over a faded % of baseline), and Tamburella et al. 2021 (instrumented
  crutch → percentile thresholds, one tone per gait-cycle peak) are all simple
  threshold-and-cue designs. None used ML for the decision. Full quotes + DOIs in
  [`rehab/wsfc-processing-references.md`](../../rehab/wsfc-processing-references.md).
- *Segmentation is a high-SNR, controlled-environment problem.* The loop only needs a binary
  "is the cane being swung / unloaded right now?" gate, not full gait-phase classification.
  Maqbool et al. 2016 recovers gait events from a single IMU with pure rules (peak/trough +
  adaptive refractory timing) at 99.78% accuracy, real-time, no training data. Lin et al. 2025
  (review): *"Rule-based methods are suitable for controlled environments, whereas machine
  learning offers flexibility to analyze complex gait conditions,"* and rule-based is
  specifically preferred for short-session, low-data clinic scenarios. One surveyed SVM even
  scored *below* a threshold method. The existing `CycleDetector` (`realtime/hub.py`) already
  does this rule-based segmentation.
- *On-device feasibility favours rules.* The whole pipeline is a few floats per sample at
  ~50–100 Hz on the Nano 33 BLE (Cortex-M4F): a gyro threshold + state machine, a tare
  subtraction, a polynomial evaluation, a Schmitt trigger — microseconds of compute. A TinyML
  model would *fit*, but buys nothing for a separable event while costing interpretability,
  per-patient training data we don't have, and clinician-tunable thresholds.
- *Claim-safety forecloses the ML use cases anyway.* The shared boundary bans diagnosis,
  fall-risk, and abnormality classification as outputs ([ADR-0009], CONTEXT.md **Claim
  Safety**) — exactly the "harder sub-problems" ML would be reached for. A rule-based loop
  stays inside the boundary by construction.
- *Percentile estimator, scalar semantics.* A per-step-peak load signal is noisy and
  right-skewed (occasional hard plants); a high percentile is robust to outliers and step
  count where a mean is pulled by a few heavy steps. This is Tamburella's mechanic, applied
  *under* Kang's scalar "% of baseline" semantic — invisible to the clinician, better
  conditioned for the threshold decision.

**Decisions.**
- **Core loop is rule-based + DSP.** Three modules: a **swing/step segmenter** (rule-based,
  gyro), a **load conditioner** (DSP), a **cue decider** (threshold). ML is a *deferred,
  named fallback for segmentation only*; it is never introduced into the cue decision and
  never used to classify "abnormal" / "fall-risk" / a diagnosis.
- **Load conditioning is DSP:** session-start tare ([ADR-0010], amended), a **2nd-order
  polynomial** pressure→load calibration (per Marquardt et al. 2022, R²≈0.996 — *not* a
  linear fit), and light smoothing (moving-average / EMA) before thresholding.
- **Cue decision = decide once per step, at the load peak**, comparing peak load to the
  current target band, with a **Schmitt deadband** (cue-on at the threshold, cue-off slightly
  below) and a minimum on/off time to prevent chattering. Default cue is auditory; haptic is
  the alternative.
- **Threshold Engine keeps Kang/Jung scalar-faded semantics**, with baseline cane-dependence
  estimated as a **percentile of the per-step-peak distribution** measured during the setup
  walk. Target expressed as **% of own baseline, never %BW**.

**Consequences.**
- **The Schmitt deadband and decide-per-step-at-peak debounce are Moon Walk engineering, not
  borrowed from the literature.** Jung and Kang both ran a bare single threshold with
  *beep-while-over* and **no deadband**; Tamburella decided per peak but documented no
  hysteresis. No published system gives a tested deadband width, so the deadband and min
  on/off times **must be tuned empirically** on real hardware.
- **The percentile choice is held loosely.** Tamburella's specific percentiles (40th/82nd/97th)
  are "experimentally set" and unjustified in-paper; we adopt the *mechanism* (a percentile,
  for robustness), not their numbers, and will pick/verify ours on real data.
- **Honest evidence framing (reinforces [ADR-0009]).** Wang et al. 2025 (meta-analysis): the
  pressure-sensor + auditory-cue subgroup — our exact class — did **not** reach significance
  for gait speed (SMD 0.30, 95% CI −0.01–0.61, P=0.05); the one significant gait-speed
  subgroup used *visual* feedback. The supportive evidence is on **loading and muscle-activation**
  outcomes (Jung, Kang, Tamburella all significant there), not gait speed, and is low-quality
  / high-risk-of-bias overall. WSFC's pitch remains *generating* our own evidence, not leaning
  on a strong existing gait-speed effect.
- **The barometer transducer is novel for this application.** Jung used a cane-base pressure
  sensor and Kang a handle load cell — **no cane-biofeedback RCT used a barometric air-bladder.**
  The clinical evidence validates the *loop*, not our *sensor*; bladder calibration, hysteresis,
  and drift must be bench-validated ([ADR-0010]).
- **What this does not change:** the two-board split ([ADR-0004]) — Feedback Loop on the Nano
  (real-time, offline), Threshold Engine on the UNO Q; the claim-safety boundary; the existing
  `CycleDetector` (extended, not replaced) for segmentation.

## Status

accepted (2026-05-27). Records the processing-approach decision for the WSFC flagship,
resolved through a grilling + literature-research session; evidence and verified citations in
[`rehab/wsfc-processing-references.md`](../../rehab/wsfc-processing-references.md). Pending:
empirical tuning of the deadband / min on-off times and the baseline percentile on real
hardware (gated on the pneumatic sensor build, [ADR-0010]).

[ADR-0004]: ./0004-two-board-uno-q-brain-nano-sensor-node.md
[ADR-0009]: ./0009-pivot-to-weight-support-feedback-cane.md
[ADR-0010]: ./0010-pneumatic-barometer-handle-load.md
