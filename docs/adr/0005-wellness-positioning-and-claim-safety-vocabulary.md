# Position Moon Walk as wellness, not medicine — with an enforced claim-safety vocabulary

> **Status:** accepted; binding for the **wellness line** (`wellness-v1`). Amended by
> [ADR-0009](./0009-pivot-to-weight-support-feedback-cane.md): the **WSFC clinical line**
> addresses stroke/rehab **Patients** and a prescribing **Clinician**, and may state a
> therapeutic (weight-bearing retraining) intent. The User-only vocabulary below remains
> normative for wellness copy.

Moon Walk is positioned as a **consumer-wellness self-monitoring** product. The
**User** watches their own walking trends; sharing a report with a doctor is an
*optional* support step, not the product's centre of gravity. The device may
suggest **cues, reminders, and awareness** of change. It must not **diagnose,
treat, predict fall risk, or replace professional judgement**. This extends
[ADR-0001](./0001-measure-and-trend-not-diagnostic.md) (measure-and-trend, not
diagnostic) from a *capability* boundary to a *positioning + language* boundary.

**Why.** Diagnostic, predictive, or treatment claims make Moon Walk a regulated
medical device and are unsupportable by walking-aid sensing (see ADR-0001). The
sharpest temptation for a walking-aid product is **fall-risk prediction** — a
clinical claim the hardware cannot back. Naming the safe/risky vocabulary
explicitly, and binding the disclaimer to the moment of the claim, is what keeps
day-to-day copy from drifting back into medicine. The person is therefore a
**User**, not a "Patient", so the medical frame is not silently reasserted on
every screen.

**Decisions.**
- **Say:** wellness cue, behaviour awareness, self-monitoring, support, reminder,
  guidance, "your walking has changed".
- **Do not say:** diagnosis, treatment, medical decision, **fall risk /
  likely to fall**, "your condition is worsening", or any causal/clinical claim.
  (Note: Moon Walk senses gait and handle load only — it does **not** sense
  stress or affect, so "stress detection" is not a Moon Walk concept at all.)
- The **MEDICAL CLAIM SAFETY** disclaimer ("a wellness awareness cue, not a
  medical assessment") renders **inline on every Alert** and as a **persistent
  dashboard footer** — not buried in onboarding.
- This medical-claim disclaimer is **distinct** from the Speaking Stick's
  assistive-safety disclosure ("not a navigation or safety guarantee",
  [ADR-0003](./0003-add-see-and-speak-assistive-layer.md) / US-33). The two guard
  different failure modes and are never substituted for one another.

**Consequences.** "Patient" is renamed to "User" across the docs and product
copy; "Clinician" survives only as an optional "your doctor" share-target. The
safe/risky word lists in `CONTEXT.md` are normative for all UI copy and
documentation.
