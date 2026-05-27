# WSFC real-time processing — verified references

Citations gathered to inform the WSFC processing-approach decision (rule-based + DSP
core loop; threshold derivation; tare strategy). All entries verified against Semantic
Scholar via `s2cli`; entries marked **[full text read]** were additionally read in full
(local PDFs or open-access) and their claims checked quote-by-quote. Last verified:
2026-05-27.

---

## Clinical biofeedback evidence (the WSFC concept)

- **Jung, K.-S., Kim, Y., Cha, Y., In, T.-S., Hur, Y.-G. & Chung, Y. 2015.** "Effects of
  gait training with a cane and an augmented pressure sensor for enhancement of weight
  bearing over the affected lower limb in patients with stroke: a randomized controlled
  pilot study." *Clinical Rehabilitation* 29(2):135–142.
  DOI [10.1177/0269215514540923](https://doi.org/10.1177/0269215514540923). **[full text read]**
  - Sensor: **pressure sensor at the cane base** (Dacell CD 210-K200) → portable indicator,
    100 Hz. (Not a load cell, not a barometer.)
  - Baseline = **mean peak vertical cane force over 10 gait cycles in a 7 m walk, as %BW**.
  - **Threshold = 60% of the patient's own measured cane-dependency level, decremented
    −10%/week.** ⭐ **The 60%-start / −10%/week fade ORIGINATES HERE** — Kang 2021 adopted it.
  - Progression: **hold the threshold (don't fade) if >20% of affected-side steps beep.**
  - Feedback: single hard threshold, beep fires whenever load exceeds threshold. No deadband.
  - **No tare/zeroing procedure described** (only a 1-min familiarization per threshold).
  - Dose: 30 min × 5/week × 4 wk; n=21 completed; subacute stroke. Results: cane force
    −7.6 vs −4.5 %BW (p=.010), gluteus medius +5.9 vs +0.6 (p=.017), gait velocity +13.5
    vs +3.7 cm/s (p=.022).
  - ⚠️ Jung expresses dependency as **%BW** — Moon Walk must NOT (claim-safety). Our Weight
    Support Target keeps the "% of own dependency" semantic but drops the %BW expression.

- **Kang, Y. S., Oh, G. & Cho, K.-H. 2021.** "Walking Training with a Weight Support
  Feedback Cane Improves Lower Limb Muscle Activity and Gait Ability in Patients with
  Chronic Stroke: A Randomized Controlled Trial." *Medical Science Monitor* 27:e931565.
  DOI [10.12659/MSM.931565](https://doi.org/10.12659/MSM.931565). **[full text read]**
  - Sensor: **load cell at the bottom of the WSFC handle** → on-handle display + smartphone
    app over Bluetooth. (Not a barometer.)
  - Baseline = **mean per-step weight support over a 20 m walk** (sum of per-step support ÷
    step count), computed by the app.
  - Threshold = **% of baseline cane dependence, faded 60→50→40→30% over weeks 1–4**
    (−10%/week), credited to a 3-patient pilot + clinical experts (and to Jung's scheme).
  - Progression: **advance to the next lower target only if weekly gait success rate >80%.**
  - Feedback: single hard threshold, **beep sustains while load is over threshold** ("beep-
    while-over"), stops below. **No deadband/hysteresis.**
  - **No tare/zeroing procedure described** (baseline 20 m walk is the only measurement event).
  - Dose: 30 min × **3/week** × 4 wk; n=30 (15/15), 0 dropout; **chronic** stroke. Results:
    WSFC > control for gluteus medius, gastrocnemius, single-limb support (Δ6.4 vs 1.6%),
    symmetry index (P<.05); velocity & cadence improved within-group but **not** between-group.

- **Tamburella, F., Lorusso, M., Tagliamonte, N., et al. 2021.** "Load Auditory Feedback
  Boosts Crutch Usage in Subjects With Central Nervous System Lesions: A Pilot Study."
  *Frontiers in Neurology* 12:700472.
  DOI [10.3389/fneur.2021.700472](https://doi.org/10.3389/fneur.2021.700472). **[full text read]**
  - Sensor: strain-gauge full bridge per crutch, 0–600 N, 10-bit ADC, **50 Hz**, on an
    **Arduino Nano + LSM9DS1 IMU** (same IMU family as Moon Walk; IMU only used for ground-
    impact detection).
  - Thresholds = **40th / 82nd / 97th percentiles of the baseline control-variable (load)
    distribution**: Th_min (40th) discriminates swing vs stance; Th (82nd) = load target;
    Th_MAX (97th) = severe overload. **The specific percentiles are "experimentally set" —
    NOT justified** statistically or physiologically.
  - Baseline captured during a **10MWT** (timed central 10 m of a 20 m walk).
  - Feedback: **decided once per gait-cycle PEAK** (peak-detection state machine on the
    derivative); tiered tones (440 Hz if Th≤peak<Th_MAX, 880 Hz if ≥Th_MAX). **No hysteresis.**
  - **No tare/zeroing described.** Single session, n=8 (CNS lesions). Mean peak load −0.9 kg
    with FB (p=.001); % correct-loading steps +19.7% (p=.003); **gait speed unchanged**.

- **Wang, F.-Y., Xu, Y., Luo, L., et al. 2025.** "Can wearable real-time biofeedback gait
  training devices improve gait speed, balance, functional mobility and activities of daily
  living (ADL) in individuals post-stroke? A systematic review and meta-analysis of
  randomized controlled trials." *Journal of NeuroEngineering and Rehabilitation* 23:47.
  DOI [10.1186/s12984-025-01863-x](https://doi.org/10.1186/s12984-025-01863-x). **[full text read]**
  - 13 RCTs / 304 participants (11 / 272 in meta-analysis). Three sensing classes
    (kinetic/pressure, EMG, kinematic/IMU); auditory feedback most common.
  - **Gait speed overall: SMD 0.41 (95% CI 0.006–0.77, P=0.02, I²=34%, n=204).**
  - **Pressure-sensor + auditory-cue subgroup (our class): SMD 0.30 (95% CI −0.01–0.61,
    P=0.05, I²=0%, n=166) — NOT significant** (CI crosses 0). The only significant gait-speed
    subgroup was **pressure + VISUAL** (single study, SMD 1.63), which drove the overall result.
  - Significant elsewhere: TUG (SMD −0.36, P=0.01), BBS (SMD 0.44, P=0.03); ADL not (P=0.38).
  - Evidence: **low-quality for gait speed**; all 13 studies high risk of bias (no blinding);
    fading "poorly reported" (only 2 studies); calls for **sham-controlled** trials. Feedback
    format/content/frequency/timing explicitly **under-studied**.

## Step / swing-phase segmentation from a single inertial sensor

- **Maqbool, H. F., Husman, M. A., Awad, M., et al. 2016.** "Real-time gait event detection
  for lower limb amputees using a single wearable sensor." *IEEE EMBC*, pp. 5067–5070.
  DOI [10.1109/EMBC.2016.7591866](https://doi.org/10.1109/EMBC.2016.7591866). **[full text read]**
  - **Pure rule-based** ("R-GEDS"), no ML, no training data; explicitly faster than ML.
  - Sensor: single IMU on the **shank** (not aid-mounted), 100 Hz, 10 Hz Butterworth LPF.
  - Logic: TO & IC = the two negative gyro peaks bracketing the mid-swing maximum; foot-flat
    and heel-off from the **accelerometer**. Uses **MSW-magnitude-dependent adaptive timing
    counters (refractory windows 30–90 ms) + dual thresholds** — NOT a "hysteresis" band
    (the word does not appear). 99.78% detection accuracy; IC/TO within ±40 ms; real-time.
  - Caveat for a cane: shank dynamics ≠ cane dynamics; thresholds need re-derivation.

- **Lin, S.-W., Evans, K., Hartley, D., et al. 2025.** "A Review of Gait Analysis Using
  Gyroscopes and Inertial Measurement Units." *Sensors (MDPI)* 25(11):3481.
  DOI [10.3390/s25113481](https://doi.org/10.3390/s25113481). **[full text read]**
  - "Rule-based methods are suitable for controlled environments, whereas machine learning
    offers flexibility to analyze complex gait conditions." Rule-based = simple, interpretable,
    real-time, **best for short-session low-data clinic scenarios**; struggles with irregular
    gait, curved walking, and **sensor-placement changes**. Head-to-head is mixed (one SVM
    scored *below* a threshold method); review recommends **hybrid** rule+ML, not ML-superior.
  - Does not analyze cane/aid-mounted IMUs specifically; stresses placement sensitivity (a
    cane IMU is far from the limb → off-the-shelf rules need re-derivation).

- **Salarian, A., Russmann, H., Vingerhoets, F., et al. 2004.** "Gait assessment in
  Parkinson's disease: toward an ambulatory system for long-term monitoring." *IEEE Trans.
  Biomedical Engineering* 51(8):1434–1443.
  DOI [10.1109/TBME.2004.827933](https://doi.org/10.1109/TBME.2004.827933). *(abstract only —
  paywalled)*. Body-worn gyroscopes → spatio-temporal gait parameters validated vs reference.
  ⚠️ Accessible abstract does **not** mention cadence specifically — attribute the
  "single-IMU cadence" claim to **Werner 2020** instead.

- **Werner, C., Heldmann, P., Hummel, S., et al. 2020.** "Concurrent Validity, Test-Retest
  Reliability, and Sensitivity to Change of a Single Body-Fixed Sensor for Gait Analysis
  during Rollator-Assisted Walking in Acute Geriatric Patients." *Sensors (MDPI)* 20(17):4866.
  DOI [10.3390/s20174866](https://doi.org/10.3390/s20174866). **[full text read]**
  - ⚠️ Sensor is **body-fixed at the lower back, on a ROLLATOR — not cane-mounted** (canes
    listed as untested future work). Basic params (gait speed, **cadence**, step length/time,
    walk ratio) were **valid as ABSOLUTES** (ICC 0.87–0.99), not merely trend; only
    **variability & asymmetry** were trend-only (ICC 0.29–0.68). Don't over-cite this for a
    cane-mounted "trend-only" claim.

## Barometer-as-load-cell: transduction, drift, conditioning

- **Dabling, J., Filatov, A. & Wheeler, J. 2012.** "Static and cyclic performance evaluation
  of sensors for human interface pressure measurement." *IEEE EMBC*, pp. 162–165.
  DOI [10.1109/EMBC.2012.6345896](https://doi.org/10.1109/EMBC.2012.6345896). **[full text read]**
  - Of 5 sensors, the **fluid/air-bubble pressure sensor (= our bladder+barometer) had the
    lowest drift: 2.3% (18 h) static, 2.8% hysteresis, 1.8% cyclic** (vs FSRs 6–21%,
    capacitive 24%). ⚠️ Table header says "percent" — base is **not defined as % full-scale**;
    cite as "percent (base unstated)." Static windows vary per sensor (13–20 h).

- **Wheeler, J., Dabling, J., Chinn, D., et al. 2011.** "MEMS-based bubble pressure sensor
  for prosthetic socket interface pressure measurement." *IEEE EMBS*.
  DOI [10.1109/IEMBS.2011.6090805](https://doi.org/10.1109/IEMBS.2011.6090805). **[full text read]**
  - Sealed fluid-filled silicone bubble over a MEMS die: **excellent drift**, but hysteresis
    is the weakness **when the die is molded directly into the silicone**. ⭐ Design lesson:
    keep the bladder **in series with the load path**, minimize surrounding viscoelastic bulk.

- **Marquardt, C., Weiner, P., Dezman, M. & Asfour, T. 2022.** "Embedded Barometric Pressure
  Sensor Unit for Force Myography in Exoskeletons." *IEEE-RAS Humanoids*.
  DOI [10.1109/Humanoids53995.2022.10000204](https://doi.org/10.1109/Humanoids53995.2022.10000204). **[full text read]**
  - Barometer-in-silicone-dome force sensor. ⭐ Calibration is **quadratic** (near-linear):
    F = 0.003928·P² + 0.1375·P − 0.007911, **R²=99.63%** — fit a 2nd-order polynomial, not a
    line. Thermal drift handled by **~10 min equilibration + a single per-trial offset**
    ("trials were short and relaxed"); **re-tared once per trial, not continuously.** Temp
    effects explicitly not characterized.

- **Manivannan, A., Chin, W.-C.-B., Barrat, A. & Bouffanais, R. 2020.** "On the Challenges
  and Potential of Using Barometric Sensors to Track Human Activity." *Sensors (MDPI)*
  20(23):6786. DOI [10.3390/s20236786](https://doi.org/10.3390/s20236786). **[full text read]**
  - For long, environment-varying wear: use **relative/differential pressure vs a tracked
    baseline** (the LPS22HB is absolute → subtract a slowly-updated baseline in firmware),
    moving-average/IIR smoothing, and sensor fusion. This is the **all-day regime** that
    motivates continuous re-zeroing — i.e., the wellness-mode case, not the short rehab session.

- **Cerveri, P., Quinzi, M., Bovio, D. & Frigo, C. 2017.** "A Novel Wearable Apparatus to
  Measure Fingertip Forces in Manipulation Tasks Based on MEMS Barometric Sensors." *IEEE
  Trans. Haptics* 10(2). DOI [10.1109/TOH.2016.2636822](https://doi.org/10.1109/TOH.2016.2636822).
  *(abstract only — paywalled)*. MEMS-barometer-in-elastomer force sensor; **RMSE 0.04 N**,
  ~4 N linear range.

---

## Key corrections caught by full-text reading (vs our earlier secondary-source notes)

1. **The 60%→−10%/week fade originates with Jung 2015, not Kang 2021** (Kang adopted it and
   added the ≥80%-success advance gate; Jung used a "hold if >20% of steps beep" gate). It is
   correct that the fade is **not** a Moon Walk invention — but cite **Jung** as the origin.
2. **Jung's exact threshold is now known:** 60% of the patient's measured cane-dependency,
   −10%/week (was a gap). Jung expresses it as %BW; Moon Walk keeps "% of own dependency"
   and drops %BW (claim-safety).
3. **Neither cane RCT (Jung, Kang) describes any sensor tare/zeroing** — a session-start tare
   is something Moon Walk would be **inventing**, grounded in Marquardt 2022, not copying.
4. **Marquardt's calibration is quadratic, not linear** (R²=0.996) — fit a 2nd-order polynomial.
5. **Maqbool uses adaptive refractory timing + dual thresholds, not "hysteresis"** (and uses
   the accelerometer too, and is shank-mounted). Our own `CycleDetector` hysteresis is a
   Moon Walk design choice, not attributable to Maqbool.
6. **Werner found basic gait params valid as ABSOLUTES** (not just trend) for a **back-mounted
   sensor on a rollator** (canes untested) — don't over-cite it for a cane "trend-only" claim.
7. **Wang's pressure+auditory subgroup was non-significant for gait speed** (SMD 0.30, P=0.05);
   the only significant gait-speed subgroup was pressure+**visual**. Loading/muscle outcomes
   (Jung, Kang, Tamburella) *are* significant — gait speed is one weak outcome among several.
8. **Dabling drift figures are "percent" (base unstated), not explicitly "% full-scale."**

### `s2cli` verification fixes (bibliographic)
- Dabling 2012 was mis-cited as DOI `...6346288` (an unrelated BCI paper); correct is `...6345896`.
- Kang is **2021**, not 2022. Wang 2025's title carries the "...A systematic review and
  meta-analysis of randomized controlled trials" subtitle. `s2cli` labels MDPI *Sensors*
  internally as "Italian National Conference on Sensors" — the `10.3390/s…` DOIs confirm
  these are the journal records.
