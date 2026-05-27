# Prior Art: One IMU Across Both Cane and Walker

> Literature search (Semantic Scholar via `s2cli`) for prior work using a single
> aid-mounted IMU to measure gait across **both** a cane and a wheeled walker/rollator.
>
> **Headline finding:** No published paper validates one *aid-mounted* IMU
> sensor/method across **both** a cane and a walker. The instrumented-cane and
> instrumented-walker literatures exist separately and do not overlap on a single
> device. The Moon Walk cross-aid, single-IMU-on-the-aid approach appears **novel**.

## Closest to "both aids"

- **Designing a Gait Recognition Algorithm for Older Adults Using Mobility Aids: Prospective Cohort Study**
  Ray, Koh, Liberty, Hammond, Shireman. 2025, *JMIR Formative Research*.
  DOI: [10.2196/68669](https://doi.org/10.2196/68669) (PMID 41213100).
  One accelerometer algorithm validated on 10 mixed mobility-aid users (5 cane, 4
  rollator, 1 walker) — **but the sensor is wrist-worn, not aid-mounted.** Does not
  pre-empt an aid-mounted cross-aid sensor.

## Survey documenting the gap

- **Smart Walking Aids with Sensor Technology for Gait Support and Health Monitoring: A Scoping Review**
  Resch, Zirari, Tran, Bauer, Sanchez-Morillo. 2025, *Technologies*.
  DOI: [10.3390/technologies13080346](https://doi.org/10.3390/technologies13080346).
  PRISMA-ScR review of 35 papers across canes, crutches, walkers, rollators; notes a
  **lack of standardized sensor-location / validation methods** across aid types.

## Cane-only instrumentation (nearest method prior art — Scheme group)

- **Variability-based assessment of assisted gait using a multi-sensor instrumented cane**
  Phinyomark, Larracy, Gill, Scheme. 2025, *Computers in Biology and Medicine*.
  DOI: [10.1016/j.compbiomed.2025.110796](https://doi.org/10.1016/j.compbiomed.2025.110796) (PMID 40706497).
  IMU-on-cane; DFA of stride fluctuations distinguishes gait change vs. cane-use change.

- **A Multi-Sensor Cane Can Detect Changes in Gait Caused by Simulated Gait Abnormalities and Walking Terrains**
  Gill, Seth, Scheme. 2020, *Sensors*. DOI: [10.3390/s20030631](https://doi.org/10.3390/s20030631) (PMID 31979224). 14 cites.
  IMU-instrumented cane benchmarked against a shank IMU across terrains/conditions.
  Mirrors the Moon Walk simulated-impairment validation protocol, on a cane.

- **An instrumented cane for gait recognition** (related Scheme-group work)
  2015, *IEEE ICRA*. DOI: [10.1109/ICRA.2015.7140026](https://doi.org/10.1109/ICRA.2015.7140026). 24 cites.

- **Design of a multi-sensor IoT-enabled assistive device for discrete and deployable gait monitoring**
  2017, *IEEE HI-POCT*. DOI: [10.1109/HIC.2017.8227623](https://doi.org/10.1109/HIC.2017.8227623). 15 cites.
  Early aid-mounted (cane-focused) gait-monitoring design; single aid type.

## Walker / rollator-only instrumentation (separate branch)

- **Feasibility of an instrumented walker to quantify treatment effects on Parkinson's patient gait**
  2018, *IEEE EBBT*. DOI: [10.1109/EBBT.2018.8391457](https://doi.org/10.1109/EBBT.2018.8391457).
  Walker-only; representative of the rollator-instrumentation branch.

- **Methods to Characterize the Real-World Use of Rollators Using Inertial Sensors — A Feasibility Study**
  Tung, Cheng et al. 2019, *IEEE Access*. [IEEE](https://ieeexplore.ieee.org/document/8723372).
  The only IMU-only *frame-mounted* rollator system: walking/idle (F1 >0.9), gait speed
  (MAE <0.2 m/s), distance, bouts, turns, usage time.

- **Characterisation of rollator use using inertial sensors**
  Cheng et al. 2016, *Healthcare Technology Letters* 3(4):303–309.
  DOI: [10.1049/htl.2016.0061](https://doi.org/10.1049/htl.2016.0061).
  Single tri-axial accelerometer under the rollator; distance + surface tilt vs. ground truth.

## Verdict

The "one aid-mounted IMU, validated across both a cane and a walker" idea appears
**novel as a device claim**. Cane and walker instrumentation each have established but
separate literatures; the only both-aids study is wrist-worn, not aid-mounted.

**Caveat:** Semantic Scholar abstracts were missing for a few conference items, so
those were classified by title/venue only. Do a targeted full-text / Google Scholar
pass on the Scheme group's latest work before making an absolute novelty claim in a
publication.

---

*Search reproducible via `s2cli` (Semantic Scholar CLI):*

```
s2cli search "<query>" -n 8 \
  --fields "title,authors,year,venue,abstract,citationCount,externalIds,url,paperId" --json
```
