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

### Consumer-grade validation & the recovery-readiness boundary
- **Validity and reliability of the Apple Health app on iPhone for measuring gait parameters in children, adults, and seniors** — Werner et al., 2023, *Scientific Reports*.
  https://doi.org/10.1038/s41598-023-32550-3
  *Supports:* consumer phone gait metrics validated vs a reference system — walking speed reliable, finer temporal metrics (e.g., double-support time) much weaker. Backs "lead with speed/trend; treat fine temporal metrics cautiously."
- **Limb Symmetry Indexes Can Overestimate Knee Function After ACL Injury** — Wellsandt et al., 2017, *J. Orthop. Sports Phys. Ther.*
  https://doi.org/10.2519/jospt.2017.7285
  *Supports:* why a readiness/return-to-function *gate* is clinically fraught — reinforces our "track trend, never declare recovery/readiness" stance.

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

---

## 3. BibTeX (Strong-rated papers)

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
