# Scope Moon Walk as measure-and-trend, not diagnostic

> **Status:** accepted; amended by [ADR-0006](./0006-opt-in-training-mode-coaching-cue.md),
> which adds an opt-in Training Mode that also coaches *in the moment*. Trend-only
> remains the default posture. Superseded for the **WSFC clinical line** by
> [ADR-0009](./0009-pivot-to-weight-support-feedback-cane.md), where real-time
> corrective feedback against a clinician-set target is the product; this trend-only
> posture still governs the wellness line (`wellness-v1`).

Moon Walk records gait metrics, trends them against the patient's own learned
**Baseline**, and may raise a non-medical **Alert** ("your walking has changed —
consider contacting your clinician"). It explicitly does **not** diagnose, predict
disease, or give medical advice.

**Why.** A diagnostic/predictive claim makes Moon Walk a regulated medical device
(FDA/CE), requiring clinical trials and ground-truth datasets — infeasible for this
project and legally risky. More fundamentally, the evidence shows it would be an
overclaim: a single aid-mounted sensor estimates spatial gait (stride length, velocity)
reliably enough to track *change over time* but not as trustworthy clinical absolutes
(aid-assisted single-sensor gait validity: Werner et al. 2020, *Sensors*). So the data is
sound for *trending progression* and not for clinical absolutes — which is precisely the
measure-and-trend scope.
This also avoids repeating the 2014 "Smart Walker" paper's central weakness of
overclaiming a safety/clinical capability the hardware could not deliver.

**Consequences.** Spatial metrics (stride length, velocity) are presented as relative
trends only, per-patient calibrated; temporal metrics (cadence, duty factor,
asymmetry) are the headline numbers. A clinician, not the device, interprets results.
