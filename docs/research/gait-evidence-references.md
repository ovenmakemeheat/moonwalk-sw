# Moon Walk — Gait-Science Evidence & References

> Papers backing the scientific claims Moon Walk relies on. Verified via Semantic Scholar
> (`s2cli`) on 2026-05-26 — each was checked by title/venue/abstract, not keyword-matched.
> Ratings: **Strong** = high-citation peer-reviewed paper directly states the claim ·
> **Partial** = qualitatively supported, specific number not confirmed · **Unverified** =
> could not substantiate as written (do **not** cite until confirmed).
>
> Positioning reminder (ADR-0005): we use these to support a **wellness, self-referential**
> story (your own trend/baseline), never diagnosis, fall-risk prediction, or a population norm.

---

## 1. Verified & citable (Strong)

### Gait speed & meaningful change — our most solid ground
- **Gait Speed and Survival in Older Adults** — Studenski et al., 2011, *JAMA*.
  https://doi.org/10.1001/jama.2010.1923
  *Supports:* gait speed as a powerful predictor of survival/health in older adults (pooled 9 cohorts, 34,485 adults ≥65) — the "gait speed as a vital sign" reference.
- **Meaningful Change and Responsiveness in Common Physical Performance Measures in Older Adults** — Perera et al., 2006, *J. Am. Geriatr. Soc.*
  https://doi.org/10.1111/j.1532-5415.2006.00701.x
  *Supports:* a ~0.10 m/s gait-speed change is a substantial meaningful change (~0.05 m/s small). The basis for "minimal detectable change" / sustained-change thresholds.

### Sensing methods — IMU gait events & stride length
- **Gait assessment in Parkinson's disease: toward an ambulatory system for long-term monitoring** — Salarian et al., 2004, *IEEE Trans. Biomed. Eng.*
  https://doi.org/10.1109/TBME.2004.827933
  *Supports:* detecting gait events (initial/terminal contact) from a single IMU's gyroscope angular-velocity peaks — the method behind our "Stick Cycle" detector.
- **Estimation of stride-by-stride spatial gait parameters using an IMU on the shank with an inverted-pendulum model** — Mao et al., 2021, *Scientific Reports*.
  https://doi.org/10.1038/s41598-021-81009-w
  *Supports:* stride length from a single lower-limb IMU via an inverted-pendulum model, validated against optical motion capture — the method class behind our Pendulum Model.

### What gait change can validly indicate (within-person / trend)
- **Gait variability and fall risk in community-living older adults: a 1-year prospective study** — Hausdorff et al., 2001, *Arch. Phys. Med. Rehabil.*
  https://doi.org/10.1053/APMR.2001.24893
  *Supports:* higher stride-time variability is associated with fall risk / unsteady gait (the basis for our `rhythm` / timing-variability metric).
- **Quantitative gait dysfunction and risk of cognitive decline and dementia** — Verghese et al., 2007, *J. Neurol. Neurosurg. Psychiatry*.
  https://doi.org/10.1136/jnnp.2006.106914
  *Supports:* abnormal/slow gait predicts cognitive decline and dementia in older adults.
- **The Motor Signature of Mild Cognitive Impairment: Results From the Gait and Brain Study** — Montero-Odasso et al., 2014, *J. Gerontol. A Biol. Sci. Med. Sci.*
  https://doi.org/10.1093/gerona/glu155
  *Supports:* the gait-**variability**–to–cognition link specifically (pair with Verghese for the variability angle).
- **Gait asymmetry in community-ambulating stroke survivors** — Patterson et al., 2008, *Arch. Phys. Med. Rehabil.*
  https://doi.org/10.1016/j.apmr.2007.08.142
  *Supports:* gait asymmetry as a quantifiable, trackable impairment/recovery marker.
- **Gait Symmetry and Walking Speed Analysis Following Lower-Extremity Trauma** — Archer KR, Castillo RC, MacKenzie EJ, Bosse MJ, 2006, *Physical Therapy* 86(12):1630–1640.
  https://doi.org/10.2522/ptj.20060035 (PMID 17138844)
  *Supports:* gait **symmetry** and walking speed are the determining functional/recovery markers after lower-limb **musculoskeletal** (non-stroke) injury — extends the symmetry-as-recovery-marker evidence off the stroke population onto lower-extremity trauma, directly relevant to the sprain/strain WSFC refocus (ADR-0013).

### Consumer-grade validation & the recovery-readiness boundary
- **Validity and reliability of the Apple Health app on iPhone for measuring gait parameters in children, adults, and seniors** — Werner et al., 2023, *Scientific Reports*.
  https://doi.org/10.1038/s41598-023-32550-3
  *Supports:* consumer phone gait metrics validated vs a reference system — walking speed reliable, finer temporal metrics (e.g., double-support time) much weaker. Backs "lead with speed/trend; treat fine temporal metrics cautiously."
- **Limb Symmetry Indexes Can Overestimate Knee Function After ACL Injury** — Wellsandt et al., 2017, *J. Orthop. Sports Phys. Ther.*
  https://doi.org/10.2519/jospt.2017.7285
  *Supports:* why a readiness/return-to-function *gate* is clinically fraught — reinforces our "track trend, never declare recovery/readiness" stance.
- **Patient-Reported Outcomes at Return to Sport After Lateral Ankle Sprain Injuries** — Lam KC, Marshall AN, Bay RC, Wikstrom EA, 2023, *J. Athl. Train.*
  https://doi.org/10.4085/1062-6050-0111.22
  *Supports (supplementary):* lateral-ankle-sprain patients return to sport with **residual** pain/functional deficits — i.e. loading/function is not normalized at return — motivating an objective loading-feedback coach.

### Our sensing analog & the change-detection math
- **Weight-Bearing Estimation for Cane Users by Using Onboard Sensors** — Ballesteros et al., 2019, *Sensors* 19(3):509.
  https://doi.org/10.3390/s19030509
  *Supports:* load/weight-bearing estimable from sensors mounted on the cane — direct precedent for our handle-load plan.
- **Bayesian Online Changepoint Detection** — Adams & MacKay, 2007, arXiv:0710.3742.
  https://arxiv.org/abs/0710.3742
  *Supports:* the established method for detecting a sustained change in a time series (our "sustained drift" / baseline-change detector).
- **Continuous Inspection Schemes (CUSUM)** — Page, 1954, *Biometrika* 41(1–2):100–115.
  https://doi.org/10.1093/biomet/41.1-2.100
  *Supports:* the original CUSUM change-detection method (alternative to BOCPD for the drift detector).

---

## 2. ⚠️ Needs fixing before citing to judges

- **Claim: walking-aid IMU "underestimates spatial metrics ~25–42%, ICC ≈ 0.72–0.76 spatial / up to 0.97 temporal" (attributed to "Werner et al. 2019").**
  **Status: UNVERIFIED — and currently sitting in `CONTEXT.md` and `FEATURES.md`.**
  Semantic Scholar did not surface those specific figures. The closest located paper —
  **Werner et al., 2020, *Sensors*** (back-mounted sensor during rollator-assisted walking,
  https://doi.org/10.3390/s20174866) — reports the *opposite*: good-to-excellent validity
  (ICC 0.87–0.99). **Action:** find the exact source for the 25–42% / 0.72–0.76 numbers, or
  reword to the defensible version: *"Body-worn IMUs on walking aids measure spatiotemporal
  gait with good-to-excellent validity and detect change over time (Werner et al. 2020)."*

- **Claim: "IMU gait data classifies fall risk at ~80% accuracy/AUC."**
  **Status: PARTIAL.** Qualitatively supported by **Montesinos et al., 2018, *IEEE TNSRE***
  (systematic review/meta-analysis, https://doi.org/10.1109/TNSRE.2017.2771383), but the
  specific ~80% figure is not in it. **Action:** keep the qualitative statement (population-level
  classification, *not* validated individual prediction); drop the number unless citing a
  primary study that reports the AUC.

- **Proprioception Rehabilitation and Gait Parameters in Athletes after Ankle Sprain** —
  Ben Moussa Zouita A, Bousselmi M, Darragi M, Ferchichi H, Dziri C, Ben Salah FZ, 2016,
  *J. Sci. Med. Central — Sports Medicine.* DOI not confirmed.
  **Status: PARTIAL — LOW-TIER JOURNAL, DOI unverified; verify against source before external citation.**
  *Supports:* in the **ankle-sprain** population specifically, an 8-week proprioception program
  improved gait-parameter **symmetry** between injured/uninjured limb — the closest direct
  evidence that limp/symmetry tracks sprain recovery. **Action:** locate and confirm the DOI/source
  before citing to judges.

---

## 3. Additional reading — stride-length estimation & aid-mounted sensing

Found via `s2cli`, ranked by relevance to our setup (a single IMU on a cane, gyro-based
pendulum stride estimation). These are *relevance-ranked background*, not individually run
through the Strong/Partial verification above. (Consolidated here from the former
`docs/references.md`.)

**Aid-mounted IMU work (closest to our setup)**
- Gorordo Fernandez I, Ahmad SA, Wada C. "Inertial Sensor-Based Instrumented Cane for Real-Time Walking Cane Kinematics Estimation." *Sensors*, 2020, 20(17):4675. https://doi.org/10.3390/s20174675
- Phinyomark A, Larracy R, Gill S, Scheme EJ. "Variability-based assessment of assisted gait using a multi-sensor instrumented cane." *Comput. Biol. Med.*, 2025. https://doi.org/10.1016/j.compbiomed.2025.110796
- Mekki F, Borghetti M, Sardini E, Serpelloni M. "Wireless instrumented cane for walking monitoring in Parkinson patients." *IEEE MeMeA*, 2017. https://doi.org/10.1109/MeMeA.2017.7985912
- Inthasuth T. "Investigating an IoT-Integrated Cane System for Accurate Gait Analysis and Fall Detection." *Przegląd Elektrotechniczny*, 2024. https://doi.org/10.15199/48.2024.03.40
- Ejaz N, et al. "Examining Gait Characteristics in People with Osteoporosis Utilizing a Non-Wheeled Smart Walker." *Applied Sciences*, 2023, 13(21):12017. https://doi.org/10.3390/app132112017

**Aid-assisted gait validity / reliability (the "trend-only" basis)**
- **Werner C, Heldmann P, Hummel S, Bauknecht L, Bauer JM, Hauer K.** "Concurrent Validity, Test-Retest Reliability, and Sensitivity to Change of a Single Body-Fixed Sensor for Gait Analysis during Rollator-Assisted Walking in Acute Geriatric Patients." *Sensors*, 2020, 20(17):4866. https://doi.org/10.3390/s20174866 — **the real "Werner" paper.** It supersedes the incorrect "Werner et al. 2019, *Clin Rehabil*" citation that was in our docs, and it found *good-to-excellent* validity (ICC 0.87–0.99) — so the previously-quoted "~25–42% error / ICC 0.72–0.76 / 0.72–0.97" figures were unsourced and have been removed from CONTEXT/PRD/FEATURES/ADR-0001/PROPOSAL/mockups.
- Schülein S, et al. "Instrumented gait analysis: a measure of gait improvement by a wheeled walker in hospitalized geriatric patients." *J. NeuroEng. Rehabil.*, 2017.
- Resch S, et al. "Smart Walking Aids with Sensor Technology for Gait Support and Health Monitoring: A Scoping Review." *Technologies*, 2025, 13(8):346. https://doi.org/10.3390/technologies13080346

**Single-IMU stride-length algorithms (body-worn — method references)**
- Sijobert B, et al. "Implementation and Validation of a Stride Length Estimation Algorithm Using a Single Basic Inertial Sensor." 2015.
- Brahms CM, et al. "Stride length determination during overground running using a single foot-mounted IMU." *J. Biomech.*, 2018.
- Wang Y, et al. "Adaptive Threshold for Zero-Velocity Detector in ZUPT-Aided Pedestrian Inertial Navigation." *IEEE Sensors Lett.*, 2019.

*Gap: no published paper does cane-mounted, gyro-based pendulum stride estimation — Moon Walk's Distance Estimator is a novel synthesis of pendulum geometry + ZUPT (Wang 2019) + the trend-only posture (Werner 2020).*

## 4. BibTeX (Strong-rated papers)

```bibtex
@article{studenski2011gait,
  title   = {Gait Speed and Survival in Older Adults},
  author  = {Studenski, S. and Perera, S. and Patel, K. and others},
  year    = {2011}, journal = {JAMA}, doi = {10.1001/jama.2010.1923}}

@article{perera2006meaningful,
  title   = {Meaningful Change and Responsiveness in Common Physical Performance Measures in Older Adults},
  author  = {Perera, S. and Mody, S. and Woodman, R. and Studenski, S.},
  year    = {2006}, journal = {J. Am. Geriatr. Soc.}, doi = {10.1111/j.1532-5415.2006.00701.x}}

@article{salarian2004gait,
  title   = {Gait assessment in Parkinson's disease: toward an ambulatory system for long-term monitoring},
  author  = {Salarian, A. and Russmann, H. and Vingerhoets, F. and Dehollain, C. and Blanc, Y. and Burkhard, P. and Aminian, K.},
  year    = {2004}, journal = {IEEE Trans. Biomed. Eng.}, doi = {10.1109/TBME.2004.827933}}

@article{mao2021estimation,
  title   = {Estimation of stride-by-stride spatial gait parameters using an inertial measurement unit attached to the shank with an inverted pendulum model},
  author  = {Mao, Yufeng and Ogata, T. and Ora, H. and Tanaka, Naoto and Miyake, Y.},
  year    = {2021}, journal = {Scientific Reports}, doi = {10.1038/s41598-021-81009-w}}

@article{hausdorff2001gait,
  title   = {Gait variability and fall risk in community-living older adults: a 1-year prospective study},
  author  = {Hausdorff, Jeffrey M. and Rios, D. and Edelberg, H.},
  year    = {2001}, journal = {Arch. Phys. Med. Rehabil.}, doi = {10.1053/APMR.2001.24893}}

@article{verghese2007quantitative,
  title   = {Quantitative gait dysfunction and risk of cognitive decline and dementia},
  author  = {Verghese, J. and Wang, Cuiling and Lipton, R. and Holtzer, R. and Xue, X.},
  year    = {2007}, journal = {J. Neurol. Neurosurg. Psychiatry}, doi = {10.1136/jnnp.2006.106914}}

@article{monteroodasso2014motor,
  title   = {The Motor Signature of Mild Cognitive Impairment: Results From the Gait and Brain Study},
  author  = {Montero-Odasso, M. and others},
  year    = {2014}, journal = {J. Gerontol. A Biol. Sci. Med. Sci.}, doi = {10.1093/gerona/glu155}}

@article{patterson2008gait,
  title   = {Gait asymmetry in community-ambulating stroke survivors},
  author  = {Patterson, K. K. and others},
  year    = {2008}, journal = {Arch. Phys. Med. Rehabil.}, doi = {10.1016/j.apmr.2007.08.142}}

@article{archer2006gait,
  title   = {Gait Symmetry and Walking Speed Analysis Following Lower-Extremity Trauma},
  author  = {Archer, Kristin R. and Castillo, Renan C. and MacKenzie, Ellen J. and Bosse, Michael J.},
  year    = {2006}, journal = {Physical Therapy}, volume = {86}, number = {12}, pages = {1630--1640},
  doi     = {10.2522/ptj.20060035}}

@article{lam2023patient,
  title   = {Patient-Reported Outcomes at Return to Sport After Lateral Ankle Sprain Injuries},
  author  = {Lam, Kenneth C. and Marshall, Ashley N. and Bay, R. Curtis and Wikstrom, Erik A.},
  year    = {2023}, journal = {J. Athl. Train.}, doi = {10.4085/1062-6050-0111.22}}

@article{werner2023validity,
  title   = {Validity and reliability of the Apple Health app on iPhone for measuring gait parameters in children, adults, and seniors},
  author  = {Werner, Christian and Hezel, N. and Dongus, Fabienne and Spielmann, J. and Mayer, Jan and Becker, C. and Bauer, J. M.},
  year    = {2023}, journal = {Scientific Reports}, doi = {10.1038/s41598-023-32550-3}}

@article{wellsandt2017limb,
  title   = {Limb Symmetry Indexes Can Overestimate Knee Function After ACL Injury},
  author  = {Wellsandt, E. and Failla, Mathew J. and Snyder-Mackler, L.},
  year    = {2017}, journal = {J. Orthop. Sports Phys. Ther.}, doi = {10.2519/jospt.2017.7285}}

@inproceedings{ballesteros2019weight,
  title   = {Weight-Bearing Estimation for Cane Users by Using Onboard Sensors},
  author  = {Ballesteros, Joaquin and Tudela, Alberto J. and Caro-Romero, Juan Rafael and Urdiales, C.},
  year    = {2019}, journal = {Sensors}, volume = {19}, number = {3}, pages = {509}, doi = {10.3390/s19030509}}

@article{adams2007bayesian,
  title        = {Bayesian Online Changepoint Detection},
  author       = {Adams, Ryan P. and MacKay, D.},
  year         = {2007}, eprint = {0710.3742}, archiveprefix = {arXiv}}

@article{page1954continuous,
  title   = {Continuous Inspection Schemes},
  author  = {Page, E. S.},
  year    = {1954}, journal = {Biometrika}, volume = {41}, number = {1-2}, pages = {100--115},
  doi     = {10.1093/biomet/41.1-2.100}}
```

---

*Method note: verified with `s2cli` (Semantic Scholar). Abstracts were empty in S2 for some
older papers (Studenski, Salarian, Hausdorff, Page) — those were confirmed by title/venue/year
and citation count. No papers, IDs, or numbers were fabricated.*
