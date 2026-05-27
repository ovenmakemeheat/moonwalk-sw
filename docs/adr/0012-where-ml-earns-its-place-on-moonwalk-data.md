# Where ML earns its place on Moon Walk data: a gated, sequenced trained-model roadmap

[ADR-0011](./0011-wsfc-real-time-processing-rule-based-dsp.md) deferred ML from the WSFC
core loop ("no ML in the cue decision, ever"). This ADR answers the follow-on question —
*if we train a model on our **own** collected data, where does ML actually earn its keep?* —
and resolves it to a **ranked, gated roadmap of three trained models**, every one of which
operates on signals whose labels are a **physical measurement or an n-of-1 personalization**,
never a human-judged clinical label. ML is admitted only where it (a) improves an input the
existing rules already consume, or (b) personalizes across time for one user — never as a
classifier, never in the real-time cue decision, never as an output that crosses the
[ADR-0009](./0009-pivot-to-weight-support-feedback-cane.md) claim-safety boundary.

The roadmap, in priority order:

1. **Personalized baseline / target-percentile estimator** — *build unconditionally.*
   An n-of-1 model that learns **this patient's** baseline cane-dependence from a short,
   messy setup walk, recognising and down-weighting non-representative steps (panic-plants,
   hesitation, re-grips), and adapts the faded-target percentile to their own per-step-peak
   load distribution. This is an evolution of [ADR-0011]'s fixed-percentile mechanic into a
   *learned, per-patient* one. It anchors the entire **Weight Support Target** — every
   "% of own baseline" comparison the WSFC makes rests on this number.
2. **Load-signal denoiser / impaired-swing segmentation gate** — *clinical defensibility,
   build first of the #2/#3 pair, gated on measured failure.* Either a tiny on-device
   regressor that learns the pneumatic bladder's creep / hysteresis / thermal-drift dynamics
   the static polynomial cannot ([ADR-0010]), **or** an ML swing/step gate for the case where
   a hemiparetic arm swinging the cane breaks the rule-based detector. Both feed the existing
   rules; neither is surfaced to the user. Build **only** the one whose bench data proves the
   DSP / rule actually fails (the [ADR-0011] discipline: build the rule, measure the residual,
   train only if it doesn't already meet target).
3. **Context-aware wellness Drift personalization** — *adoption / adherence, fast-follow
   once WSFC #1–#2 are validated.* An n-of-1 tracker that learns one User's own normal
   variance (day-of-week, session length, surface signature) so wellness **Alerts** fire
   fewer and truer — the single ML feature with *felt* user benefit. **Named honestly as
   adaptive personalization (EWMA / change-point), not a heavy trained model.**

## Why

This decision came out of a three-lens brainstorm (rehabilitation clinical scientist,
ML/embedded engineer, product/claim-safety lead) over the data Moon Walk actually
produces — a cane-shaft 6-axis IMU and a pneumatic Handle-Load signal — cross-checked
against a Semantic Scholar literature sweep. The convergence was unusually strong.

- *The #1 estimator won on all three axes at once.* It is the **highest clinical leverage**
  (the faded dose is only as safe as its baseline anchor — a bad anchor under-challenges or
  over-pushes the patient), the **highest benefit-per-feasibility** (n-of-1 on physical
  signals sidesteps the small-N problem), and **claim-safe by design** (always % of the
  patient's *own* baseline, clinician-overridable, never surfaced as force). All three lenses
  independently placed it in their top two.
- *Physical / n-of-1 labels are the only honest training data we have.* Our
  simulated-impairment protocol produces **healthy volunteers faking a limp** — near-objective
  for segmentation (a swing is a swing) but a fiction for the *dynamics* of real impairment.
  Any model needing a human-judged "impaired vs normal" label inherits this domain gap and
  overfits to acting artifacts. Models trained on a bench rig (bladder vs reference scale,
  swept over temperature and load) or on one user's own longitudinal sessions avoid it
  entirely. The literature confirms the contrast: Lee et al. 2025 (DOI 10.3390/s25144395) and
  Qian et al. 2020 (10.1016/j.bspc.2020.102117) show ML earning its place on
  *spatiotemporal-parameter* and *model-correction* problems with physical ground truth;
  Ghidelli et al. 2023 (10.3390/s23136213) and Stetter et al. 2020 (10.3389/fbioe.2020.00009)
  show ML regressing *loads* from instrumented assistive devices / IMUs — all regression
  against measurable targets, none a clinical classifier.
- *The pneumatic transducer is novel, so its error model is unmapped.* No published ML uses a
  barometric air-bladder load sensor; its creep/hysteresis/drift ([ADR-0010]) is exactly the
  kind of nonlinear dynamics a static 2nd-order polynomial cannot capture and a small temporal
  model can — *if* the bench residual proves the polynomial insufficient.
- *Felt benefit and clinical benefit are different axes, and both are real.* The flagship's
  ML wins (#1, #2) are **invisible to the Patient** — "the beep is slightly less annoying."
  That is genuine clinical leverage but near-zero felt delta, and WSFC adherence is already
  solved (a Clinician prescribed it and is in the room). The *unsolved* adherence problem is
  the **wellness elderly User** with no clinician, who mutes the app after two false Drift
  alerts and abandons the cane. That is where #3 moves a needle the user actually feels —
  which is why it stays on the roadmap, sequenced behind the flagship.

## Decisions

- **Adopt the three-model roadmap above, in that priority order.** #1 is built
  unconditionally; #2 is built first of the #2/#3 pair but **gated on a measured DSP/rule
  failure**; #3 is a fast-follow after WSFC #1–#2 are validated.
- **#1 supersedes [ADR-0011]'s fixed percentile** with a *learned, per-patient* baseline
  estimator, preserving Kang/Jung scalar "% of own baseline" semantics. Runs offline on the
  UNO Q Linux side; always clinician-visible and clinician-overridable.
- **#2 runs on the Nano (denoiser) or extends the existing `CycleDetector` (segmentation)**,
  feeding the rule-based cue — never replacing it. Decision to build is data-driven, not
  speculative; build at most one, whichever bench data justifies.
- **#3 is implemented and described as n-of-1 adaptive personalization**, not marketed as a
  trained ML model. Output stays a binary, self-referential, present-tense nudge.
- **kgf labels are firewalled at the bench.** The #2 denoiser is trained against absolute-force
  (kgf) reference labels, but kgf is **bench-calibration-only** (CONTEXT.md **Weight Support
  Target**, [ADR-0010]). It must **never be persisted, surfaced, or leaked into a clinician
  export** — the model is claim-safe by *construction* only under this firewall, not by
  assumption.

## Hard boundaries (no dissent across all three lenses)

- **No ML in the WSFC real-time cue decision** — reaffirms [ADR-0011].
- **No impaired-vs-normal / limp / "abnormal-gait" classifier** — faked-impairment domain
  gap + claim-safety ban.
- **No fall-risk prediction, no gait-speed predictor, no %-body-weight or absolute-force
  output, no end-to-end raw-sensor→beep network.** ([ADR-0009], CONTEXT.md **Claim Safety**.)

## Consequences

- **Two latent liabilities must be enforced, not assumed:** the kgf firewall on #2, and the
  honest "adaptive filtering, not ML" framing on #3 — a more-accurate Drift detector *reads*
  as more authoritative, so the output must stay a self-referential nudge, never a score,
  severity, or trend graph (CONTEXT.md **Alert**, [ADR-0005]).
- **#2 may never get built.** If the DSP polynomial + tare already meets the ~10–20% relative
  accuracy target ([ADR-0010]), the denoiser buys nothing; if the rule-based gate holds on real
  impaired-swing data, the ML segmenter is unnecessary. That is the intended outcome of the
  gate, not a failure.
- **The simulated-impairment protocol's limits are now explicit.** It is adequate for
  near-objective segmentation labels and for *demonstrating* the wellness Drift→Alert pipeline,
  but it cannot supply trustworthy impairment-*dynamics* labels — which is why no classifier is
  on the roadmap.
- **What this does not change:** the two-board split ([ADR-0004]); the rule-based + DSP WSFC
  core loop ([ADR-0011]); the per-application claim-safety boundary ([ADR-0009]); the
  pneumatic Handle-Load sensing decision ([ADR-0010]).

## Status

accepted (2026-05-27). Resolved through a three-lens brainstorm (clinical / ML-embedded /
product-claim-safety) plus a Semantic Scholar literature sweep over ML on cane-IMU + load
data. The pneumatic sensor is now built & drift/hysteresis-validated (2026-05-27, [ADR-0010]), so the
bench residual that gates #2 can now be measured — and the validated low drift/hysteresis may
already argue the DSP polynomial suffices, in which case #2's denoiser is not built. Still
pending: collection of per-patient setup-walk data to train #1; WSFC validation before #3.

[ADR-0004]: ./0004-two-board-uno-q-brain-nano-sensor-node.md
[ADR-0005]: ./0005-wellness-positioning-and-claim-safety-vocabulary.md
[ADR-0009]: ./0009-pivot-to-weight-support-feedback-cane.md
[ADR-0010]: ./0010-pneumatic-barometer-handle-load.md
[ADR-0011]: ./0011-wsfc-real-time-processing-rule-based-dsp.md
