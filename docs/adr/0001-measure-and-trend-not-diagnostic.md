# Scope Moon Walk as measure-and-trend, not diagnostic

> **Status:** accepted; amended by [ADR-0006](./0006-opt-in-training-mode-coaching-cue.md),
> which adds an opt-in Training Mode that also coaches *in the moment*. Trend-only
> remains the default posture.

Moon Walk records gait metrics, trends them against the patient's own learned
**Baseline**, and may raise a non-medical **Alert** ("your walking has changed —
consider contacting your clinician"). It explicitly does **not** diagnose, predict
disease, or give medical advice.

**Why.** A diagnostic/predictive claim makes Moon Walk a regulated medical device
(FDA/CE), requiring clinical trials and ground-truth datasets — infeasible for this
project and legally risky. More fundamentally, the evidence shows it would be an
overclaim: walking-aid-mounted sensors systematically underestimate spatial gait
(Werner et al. 2019, *Clin Rehabil*: stride length 0.60 m measured vs 0.80 m true,
~25–42% error) **but** track *change over time* reliably (ICC ≈ 0.72–0.76; temporal
metrics ICC 0.72–0.97). So the data is trustworthy for *trending progression* and
untrustworthy as clinical absolutes — which is precisely the measure-and-trend scope.
This also avoids repeating the 2014 "Smart Walker" paper's central weakness of
overclaiming a safety/clinical capability the hardware could not deliver.

**Consequences.** Spatial metrics (stride length, velocity) are presented as relative
trends only, per-patient calibrated; temporal metrics (cadence, duty factor,
asymmetry) are the headline numbers. A clinician, not the device, interprets results.
