# Evidence: Pneumatic Load Sensing + Partial-Weight-Bearing Accuracy

Backs two empirical premises of the Weight Support Feedback Cane ([ADR-0009](../docs/adr/0009-pivot-to-weight-support-feedback-cane.md))
and the pneumatic Handle Load sensor ([ADR-0010](../docs/adr/0010-pneumatic-barometer-handle-load.md)):

- **Cluster A** — can a MEMS barometer + air bladder act as a ~10–20%-accurate load cell?
- **Cluster B** — is clinical partial-weight-bearing (PWB) so coarse/poorly-estimated that a repeatable
  *relative* trend already matches or beats practice, and does real-time biofeedback help?

Found via Firecrawl/web search. Resolve any DOI with `https://doi.org/<DOI>`. Tags: **[supports]**, **[context]**, **[partial-refute]**.

---

## Cluster A — Barometer + air bladder as a load/force sensor

| Paper | Year | Venue | DOI / ID | Tag | What it shows |
|-------|------|-------|----------|-----|---------------|
| Tenzer, Jentoft, Howe — *TakkTile: inexpensive tactile array sensors using MEMS barometers* | ~2014 | IEEE Robotics & Automation Mag. | (Harvard DASH, no DOI) | **[supports]** | Canonical "encapsulate a MEMS barometer in rubber → robust force sensor." The foundational barometer-as-load-cell reference. |
| Cerveri et al. — *Wearable apparatus to measure fingertip forces based on MEMS barometric sensors* | 2017 | IEEE Trans. Haptics 10(3) | `10.1109/TOH.2016.2636822` (PMID 28114037) | **[supports]** | Barometer + elastomer transduces contact force; near-linear to ~4 N, **RMSE 0.04 N**. Direct wearable precedent. |
| *MEMS-Based Tactile Sensors: Materials, Processes and Applications — A Review* | 2022 | Micromachines 13(11):2051 | `10.3390/mi13112051` (PMC9782357) | **[supports]** | Off-the-shelf MEMS barometers "modified to serve as tactile sensors" — sensitivity <0.01 N, **~10% force error to 25 N (15% higher)**. Confirms the technique is established; consistent with the cane's ~10–20% goal. |
| *Mathematical model for surface pressure from a barometric sensor in active wheelchair air cushions (single air-cell)* | 2025 | Biomed. Phys. Eng. Express | `10.1088/1873-4030/ae2463` | **[supports]** | **Closest direct analog**: barometer reads pressure *inside a sealed air cell*; validated model converts trapped-air pressure → surface load (36 series). Essentially "air bladder + barometer → load," validated. |
| De Clercq et al. — *Soft barometric tactile sensor: localize contact + estimate normal force* | 2022 | IEEE RA-L 7(4) | `10.1109/LRA.2022.3205428` | **[supports]** | Soft (inflatable-style) barometric sensor; localization 0.5 mm, **normal-force error ~10% (≤25 N)**. |
| *Low-cost force sensors in physical HMIs (silicone capsule + piezoresistive pressure sensor)* | 2022 | Sensors (MDPI) | (PMC8780276) | **[context]** | Sealed silicone capsule over a pressure sensor as a load cell — same principle (sealed fluid pocket + transducer = force). |
| Polliack et al. — *Validation of two commercial pressure-sensor systems for prosthetic socket fit* | ~2000 | Prosthetics & Orthotics Int. | (no DOI in source) | **[partial-refute]** | Interface pressure sensors suffer **hysteresis, drift, creep** — the failure modes the cane's per-step auto-tare must counter. Justifies auto-tare. |
| Sardini et al. — *A compact forearm crutch based on force sensors for aided gait* | 2016 | Sensors 16(6):925 | `10.3390/s16060925` | **[context]** | Prior art for instrumenting a walking aid to measure axial load — but uses **strain gauges/load cells**, not trapped air. Goal established; modality differs. |

**Verdict — WELL SUPPORTED in principle.** Every building block (barometer-as-force, air-cell-pressure→load,
auto-zeroing for drift) is independently peer-reviewed, with published accuracy ~10% / RMSE 0.04 N — consistent with
the ~10–20% cane goal. **Novel part:** the *cane-handle + per-step auto-tare* application specifically; defensible as a
novel application of validated components. Drift/temperature is real (Polliack) → auto-tare is well-justified.

---

## Cluster B — PWB estimation accuracy + biofeedback effect

| Paper | Year | Venue | DOI / ID | Tag | What it shows |
|-------|------|-------|----------|-----|---------------|
| Yu et al. — *Orthopedic inpatients' ability to accurately reproduce partial weight-bearing orders* | 2014 | Orthopedics 37(1) | `10.3928/01477447-20131219-10` (PMID 24683650) | **[supports]** | ≥72% exceeded target; mean peak up to 285% of target. **"Patients and physiotherapists were unable to accurately gauge PWB."** Direct support that *clinicians* estimate poorly. |
| Dabke et al. — *How Accurate Is Partial Weightbearing?* | 2004 | Clin. Orthop. Relat. Res. 421 | (no DOI in source) | **[supports]** | 21/23 patients exerted **~35% of body weight MORE** than prescribed. **Cleanest %BW error figure — worse than the cited "20–30%."** Cite this for the %BW framing. |
| Vasarhelyi et al. — *Partial weight bearing after lower-extremity fracture surgery — is it achievable?* | 2006 | Gait & Posture 23(1) | `10.1016/j.gaitpost.2004.12.005` (PMID 16311201) | **[supports]** | Patients exceeded prescribed load; elderly group by ≥38 N (119%). Quantifies over-loading. |
| Lisitano et al. — *Impact of Real-Time Biofeedback on Partial Weightbearing Training* (RCT) | 2025 | IJSPT 20(3) | `10.26603/001c.129259` (PMC11872552) | **[supports]** | n=60, 20 kg target. Biofeedback vs scale: **compliance 88% vs 19%**, peak 330 N vs 600 N, **Cohen's d ≈ 1.8**. Targets specified in absolute kg; scale standard "criticized for inaccuracy." |
| van Lieshout et al. — *Biofeedback in PWB: Validity of 3 Different Devices* | 2016 | JOSPT 46(11) | `10.2519/jospt.2016.6625` (PMID 27733088) | **[supports/context]** | Without feedback, patients loaded **>2× prescribed**. Devices most valid in *lower* weight-bearing ranges — where the WSFC's offloading targets live. |
| Hurkmans et al. — *Effectiveness of audio feedback for partial weight-bearing in/out of hospital* (RCT) | 2012 | Arch. Phys. Med. Rehabil. 93(4) | `10.1016/j.apmr.2011.11.019` (PMID 22325684) | **[supports]** | Real-time audio feedback improves adherence vs no feedback. (Companion: Hurkmans 2007, `10.1016/j.apmr.2006.11.005`.) |
| Braun et al. — *Weight-bearing recommendations after fracture treatment — fact or fiction?* | 2017 | Int. Orthop. 41(8) | `10.1007/s00264-017-3481-7` (PMID 28421239) | **[supports]** | Even after PT training, PWB patients spent considerable time >10% above limit. |
| Abdalbary — *Partial weight bearing in hip fracture rehabilitation* | 2017 | Future Sci. OA 4(1) | `10.4155/fsoa-2017-0068` (PMC5729597) | **[context]** | Editorial: PWB "could not accurately be reproduced with any prescribed technique"; biofeedback promising. Framing citation. |

**Verdict — WELL SUPPORTED, with one soft spot.**
- *Clinicians/patients estimate PWB poorly* — **strongly supported** (Yu 2014; errors of 119–285%).
- *The "20–30% off" claim* — **supported and conservative**; Dabke 2004 reports ~35% of body weight over. Cite Dabke for %BW framing.
- *Real-time biofeedback beats verbal/scale* — **strongly supported by RCTs** (Lisitano 2025 d≈1.8; Hurkmans 2012; van Lieshout 2016).
- ⚠️ *Relative-to-own-baseline vs absolute %BW framing* — **no head-to-head study found.** Defensible by inference
  (a ~10–20% relative trend trivially beats unaided 100–285% errors) but **not directly proven** — the one claim
  resting on extrapolation. State honestly in PRD/FEATURES.

_Related: [recovery-evidence.md](recovery-evidence.md) · [metrics-biofeedback-references.md](metrics-biofeedback-references.md)._
