# Sense Handle Load with a pneumatic bladder + barometer, not an FSR

**Handle Load** — Moon Walk's weight-bearing / offload signal — is sensed by turning the
Nano 33 BLE's onboard **LPS22HB barometer** into a pneumatic load cell, **replacing the
previously-planned multi-FSR grip**. A soft sealed air bladder (~25–35 cm², silicone dome
or heat-sealed TPU pouch) sits under the handle grip; the user's load compresses it,
raising the trapped-air pressure, which a thin silicone tube pipes to the barometer sealed
in a 3D-printed manifold. A bench calibration against a bathroom scale maps pressure → kgf
(`P = F / A`). Full engineering rationale and figures: `docs/pneumatic-load-sensing.html`
and `docs/pneumatic-bladder-build.html`.

**Why.**
- *Sensors in hand, $0 BOM.* We have an LSM9DS1 IMU and an LPS22HB barometer on the board,
  and cannot buy more. The barometer was otherwise unused; the only added part is a soft
  bladder + tube + printed manifold — no FSR, no load cell, no ADC.
- *We need a repeatable trend, not a scale.* Weight-bearing compliance targets are coarse
  ("30–50% body weight", "20 kg ± 10 kg") and the incumbent — a therapist's tactile guess —
  is wrong by 20–30%. A relative load trend good to ~10–20% already matches or beats clinical
  practice. This makes Moon Walk a **compliance coach, not a scale**, and is exactly the
  signal the WSFC threshold engine needs ([ADR-0009]).
- *The geometry forces the design.* The LPS22HB has only ~25 kPa of usable headroom above
  ambient. To keep 35 kgf in-window the contact area must be large (`A = F/P ≈ 136 cm²`),
  so the bladder goes **under the handle**, not in the ferrule — a rigid tip piston (~2.8 cm²)
  would need ~MPa pressures, bursting the chamber and saturating the sensor instantly.
- *The IMU cancels barometer drift for free.* A sealed gas chamber drifts (hand heat,
  elastomer creep, micro-leaks) by an amount comparable to the signal. The IMU already
  detects the **swing phase** — cane in the air, load = exactly zero — so we **auto-tare**
  the baseline every gait cycle. One free move cancels thermal drift, creep, and leak.

**Decisions.**
- Handle Load = trapped-air pressure under the grip, read by the LPS22HB; soft bladder under
  the **handle** (rejected: rigid piston in the ferrule); operate near the bottom of the
  pressure range with per-step auto-tare.
- Calibrate once on a bathroom scale (5/10/20/30 kgf), fit linear/mild-polynomial → kgf
  on-device (the same method instrumented-crutch researchers use against force plates).
- Glossary updated: **Handle Load** and the **Sensor suite** in [`CONTEXT.md`] now describe
  the pneumatic/barometer sensor; "FSR" / "load cell" are retired terms for this signal.

**Consequences.**
- **The WSFC's supposed blocker dissolves.** Handle Load is now measurable with hardware in
  hand, so the real-time weight-support feedback loop is buildable now — [ADR-0009] is
  corrected accordingly (its "FSR not acquired = #1 blocker" framing is obsolete).
- **kgf vs the no-absolute-force boundary is an open tension.** This sensor *can* output kgf
  (±10–20%), but [ADR-0001] / [`docs/FEATURES.md`] say "never Newtons / %body-weight." The
  WSFC clinical line may use kgf-relative targets while the wellness line keeps relative
  trends only — a per-application split to be resolved in the FEATURES/PRD pass.
- **Open question — does the pressure stay in-window?** The two design docs are not
  numerically consistent: `pneumatic-load-sensing.html` says the LPS22HB has only ~25 kPa of
  usable headroom and that fitting 340 N into it needs **~136 cm²**, yet the specified bladder
  is **25–35 cm²**; `pneumatic-bladder-build.html` claims 35 kgf on a 30 cm² pad gives ~110 kPa
  ("soft wall absorbs most") — ~4.4× that ceiling and near the sensor's full-scale. So the top
  of the 7–35 kgf range may **saturate**. Mitigant: the WSFC cares about *offloading* (low/mid
  loads, "operate at the bottom of the range"), so high-load saturation is tolerable — but the
  bladder area, soft-wall offloading, and usable load span must be **bench-measured**, not
  assumed. Nothing here is built yet: both docs are "design concept," all numbers projected, and
  Stage A (the syringe proof-of-physics) is still to be performed.
- **New failure modes to validate:** bladder puncture/leak (the docs' stated #1 failure — a
  glued joint must hold a squeeze ≥10 s), tube kinks, temperature swings outside what swing-tare
  can cancel, and calibration drift over time. The accuracy claim (~10–20% repeatable relative
  trend) must be bench-verified before any compliance claim.
- ToF Distance remains the only un-acquired sensor; Stick Cycle phase still falls back to
  IMU stillness until it lands.

## Prior art (the technique is established; the application is novel)

Barometer-as-load-cell is peer-reviewed, not invented here. Encapsulating a MEMS barometer in
elastomer yields a robust force sensor (**TakkTile**, Tenzer/Jentoft/Howe ~2014; **Cerveri 2017**,
*IEEE Trans. Haptics*, RMSE 0.04 N, [DOI 10.1109/TOH.2016.2636822]); a 2022 review reports such
sensors at **~10% force error to 25 N** ([DOI 10.3390/mi13112051]). Reading pressure *inside a
sealed air cell* to infer load has a direct validated analog in active-wheelchair cushions
([DOI 10.1088/1873-4030/ae2463]). The **novel** part is the cane-handle + per-step auto-tare
application; published barometer-force accuracy (~10%) is consistent with our ~10–20% goal, and the
known hysteresis/drift of interface pressure sensors (Polliack ~2000) is precisely what auto-tare
counters. The clinical premise — PWB is coarse and badly estimated (Dabke 2004: ~35% BW over;
Yu 2014: clinicians "unable to gauge" it), and real-time biofeedback beats scale training
(Lisitano 2025 RCT, d≈1.8) — is likewise well-supported. Full citations + DOIs:
[`rehab/sensing-and-pwb-evidence.md`](../../rehab/sensing-and-pwb-evidence.md).

## Status

accepted. Supersedes the multi-FSR grip assumption carried in earlier docs/ADRs. Design is
prototyped in `docs/pneumatic-load-sensing.html`; bench calibration + leak/drift validation
are pending.

[DOI 10.1109/TOH.2016.2636822]: https://doi.org/10.1109/TOH.2016.2636822
[DOI 10.3390/mi13112051]: https://doi.org/10.3390/mi13112051
[DOI 10.1088/1873-4030/ae2463]: https://doi.org/10.1088/1873-4030/ae2463

[ADR-0001]: ./0001-measure-and-trend-not-diagnostic.md
[ADR-0009]: ./0009-pivot-to-weight-support-feedback-cane.md
[`CONTEXT.md`]: ../../CONTEXT.md
[`docs/FEATURES.md`]: ../FEATURES.md
