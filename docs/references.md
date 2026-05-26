# References — Stride-Length Estimation from Walking-Aid Sensors

Papers found via `s2cli` (Semantic Scholar), ranked by relevance to Moon Walk's setup:
a single IMU mounted on a cane, with gyro-based pendulum stride estimation.

## Aid-mounted IMU work (closest to our setup)

1. **Gorordo Fernandez I, Ahmad SA, Wada C.** "Inertial Sensor-Based Instrumented Cane for Real-Time Walking Cane Kinematics Estimation." *Sensors*, 2020, 20(17):4675. DOI: 10.3390/s20174675.
2. **Phinyomark A, Larracy R, Gill S, Scheme EJ.** "Variability-based assessment of assisted gait using a multi-sensor instrumented cane." *Computers in Biology and Medicine*, 2025. DOI: 10.1016/j.compbiomed.2025.110796.
3. **Mekki F, Borghetti M, Sardini E, Serpelloni M.** "Wireless instrumented cane for walking monitoring in Parkinson patients." *IEEE MeMeA*, 2017. DOI: 10.1109/MeMeA.2017.7985912.
4. **Inthasuth T.** "Investigating an IoT-Integrated Cane System for Accurate Gait Analysis and Fall Detection." *Przegląd Elektrotechniczny*, 2024. DOI: 10.15199/48.2024.03.40.
5. **Ejaz N, et al.** "Examining Gait Characteristics in People with Osteoporosis Utilizing a Non-Wheeled Smart Walker." *Applied Sciences*, 2023, 13(21):12017. DOI: 10.3390/app132112017.

## Validity / reliability of aid-assisted gait sensing (the "trend-only" basis)

6. **Werner C, Heldmann P, Hummel S, Bauknecht L, Bauer JM, Hauer K.** "Concurrent Validity, Test-Retest Reliability, and Sensitivity to Change of a Single Body-Fixed Sensor for Gait Analysis during Rollator-Assisted Walking in Acute Geriatric Patients." *Sensors*, 2020, 20(17):4866. DOI: 10.3390/s20174866.
   *Note: the project docs cite this as "Werner et al. 2019, Clin Rehabil" — that citation is incorrect and should be updated to this 2020 Sensors paper.*
7. **Schülein S, et al.** "Instrumented gait analysis: a measure of gait improvement by a wheeled walker in hospitalized geriatric patients." *Journal of NeuroEngineering and Rehabilitation*, 2017.
8. **Resch S, Zirari A, Tran T, Bauer LM, Sanchez-Morillo D.** "Smart Walking Aids with Sensor Technology for Gait Support and Health Monitoring: A Scoping Review." *Technologies*, 2025, 13(8):346. DOI: 10.3390/technologies13080346.

## Single-IMU stride-length algorithms (body-worn — method references only)

9. **Sijobert B, et al.** "Implementation and Validation of a Stride Length Estimation Algorithm Using a Single Basic Inertial Sensor." 2015. *(Single-IMU stride length in Parkinson's; strongest reference for the estimation math.)*
10. **Brahms CM, et al.** "Stride length determination during overground running using a single foot-mounted IMU." *Journal of Biomechanics*, 2018. *(Classic ZUPT + double-integration reference.)*
11. **Wang Y, et al.** "Adaptive Threshold for Zero-Velocity Detector in ZUPT-Aided Pedestrian Inertial Navigation." *IEEE Sensors Letters*, 2019. *(Most-cited ZUPT method; relevant to our IMU-stillness-anchored ZUPT.)*

---

*Key gap: no published paper does cane-mounted, gyro-based pendulum stride estimation. Moon Walk's Distance Estimator is a novel synthesis of the pendulum geometry, ZUPT (Wang 2019), and the trend-only posture (Werner 2020).*
