# Refocus the WSFC flagship to sprain/strain recovery — progressive optimal loading

Moon Walk's flagship **Weight Support Feedback Cane (WSFC)** refocuses its target condition from
**stroke / neurological lower-limb rehab** (the framing of [ADR-0009](./0009-pivot-to-weight-support-feedback-cane.md))
to **acute sprain / strain / lower-limb soft-tissue injury rehab**, with an explicit value
proposition: **a quicker recovery rate through progressive optimal loading.** The device, the
hardware, and the WSFC Feedback Loop + Threshold Engine are **unchanged**; what changes is *who
the Patient is*, *why they use it*, and *the clinical evidence the design leans on*.

This **supersedes the target-population decision of [ADR-0009]** while keeping everything ADR-0009
established about the *mechanism* (per-step Handle Load → target band → real-time cue), the
*relative-load-not-%BW* boundary, and the *Walk Buddies as adherence skin* repurposing.

## Context — why refocus

- *The mechanism is condition-agnostic; the original target was not the only fit.* The WSFC loop —
  read how hard the patient leans on the cane, cue them when they over-lean, fade the cane-dependence
  ceiling as they improve — applies to **any** rehab where a limb must be **progressively reloaded**.
  Soft-tissue injury is the largest such population.
- *Optimal loading is the established healing principle.* Modern soft-tissue rehab replaced rest-only
  **PRICE** with **POLICE** — *Protection, **Optimal Loading**, Ice, Compression, Elevation* (Bleakley,
  Glasgow & MacAuley, *BJSM* 2012). Controlled, progressive mechanical load is a **healing stimulus**:
  too little (over-protecting / guarding) delays recovery and causes stiffness and deconditioning; too
  much risks re-injury. The recovery-rate win is keeping the patient inside the prescribed loading
  progression. *(Citation to be verified and added to `rehab/`; DOI ~10.1136/bjsports-2011-090297.)*
- *The bedside gap is the same one ADR-0009 named.* A clinician can only give vague verbal cues ("put
  a bit more weight on it / don't baby it") because cane offloading isn't quantified at the bedside, and
  patients estimate their own weight-bearing poorly (Dabke 2004). The WSFC quantifies and coaches it.
- *White space, honestly.* As with ADR-0009, no published RCT pairs a force-sensing cane + biofeedback
  + an adherence layer for **sprain/strain recovery**. We cite the *optimal-loading principle*, not a
  cane-for-sprain recovery trial (none exists). The pitch remains *generating* that evidence.

## Decisions

- **Target Patient = sprain / strain / lower-limb soft-tissue injury rehab.** The WSFC **Patient** is a
  person recovering from an ankle sprain, muscle strain, or other lower-limb soft-tissue injury who is
  temporarily cane-dependent and must progressively reload the injured limb. Stroke / neurological gait
  retraining is **demoted out of the flagship** — it remains mechanism-compatible and a plausible future
  secondary indication, but is no longer the headline.
- **Value proposition = quicker recovery via progressive optimal loading.** The headline outcome is a
  **faster, safer return to full weight-bearing**, achieved by keeping the patient inside a
  clinician-prescribed loading progression (neither over-protecting nor over-stressing the limb). This
  is a legitimate therapeutic claim for the WSFC application under [ADR-0009]'s per-application
  claim-safety, *within* the shared bans (no diagnosis, no fall-risk, no absolute force, no %-body-weight).
- **Threshold Engine reframed, not rebuilt.** The **Weight Support Target** is still a per-patient
  cane-load ceiling expressed as **% of the patient's own measured baseline cane-dependence**, faded as
  the injury heals (advance only when ≥80% of steps land in-band). The **timescale shortens** to match
  soft-tissue healing (days–weeks, grade-dependent) rather than the 4–6-week stroke schedule; the
  Clinician sets the starting band and fade pace per injury grade. Re-injury risk is managed by the
  clinician-set fade pace (a conservative ceiling), not by a device floor.
- **Evidence base swaps in `rehab/`.** The stroke cane-biofeedback RCTs (Jung 2015, Kang 2021) are no
  longer the primary citations; the **optimal-loading / POLICE** literature and progressive-weight-bearing
  protocols for lower-limb soft-tissue injury become primary. `rehab/recovery-evidence.md` and
  `rehab/metrics-biofeedback-references.md` must be updated accordingly (follow-up).

## Consequences

- **Larger, but evidence-thin, target population.** Sprain/strain is far more common than stroke, but the
  *cane-for-sprain* literature (and Thailand-specific prevalence of cane use for sprain/strain) is sparse —
  most minor sprains self-manage without a cane or a clinician. The clinician-prescribed WSFC fits
  **moderate-to-severe** sprains/strains and post-acute lower-limb soft-tissue injury, **not** the long
  tail of minor sprains. Any market/impact section must scope to the cane-using, clinician-seen subset and
  label proxy figures honestly.
- **Claim-safety holds; the therapeutic claim sharpens.** "Quicker recovery" is a stronger therapeutic
  claim than "retrain weight-bearing" and must be backed by the optimal-loading evidence and our own
  validation — never by an absolute-force or %-body-weight number. The shared bans from [ADR-0009] /
  [ADR-0005](./0005-wellness-positioning-and-claim-safety-vocabulary.md) are unchanged.
- **Regulatory posture unchanged from ADR-0009.** Still plausibly a regulated therapeutic device; still
  not pre-paying that cost; a firm clinical/partner commitment still triggers a regulatory-pathway ADR.
- **What stays unchanged:** the device, clip-on form factor, two-board Nano + UNO Q architecture
  ([ADR-0004](./0004-two-board-uno-q-brain-nano-sensor-node.md)), pneumatic Handle Load
  ([ADR-0010](./0010-pneumatic-barometer-handle-load.md)), the WSFC Feedback Loop + Threshold Engine and
  their rule-based+DSP processing ([ADR-0011](./0011-wsfc-real-time-processing-rule-based-dsp.md)), the
  wellness secondary app, the Speaking Stick ([ADR-0003](./0003-add-see-and-speak-assistive-layer.md)),
  and Walk Buddies as the adherence skin ([ADR-0008](./0008-walk-buddies-emerald-gamification.md)).

## Status

accepted. Supersedes the target-population decision of [ADR-0009] (its mechanism, claim-safety, and
hardware decisions remain in force). Pending follow-ups: update `rehab/` evidence files from
stroke RCTs to optimal-loading literature; verify the POLICE citation/DOI; a Thailand impact section
scoped to the cane-using sprain/strain subset.
