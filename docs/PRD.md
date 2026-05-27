# PRD: Moon Walk

> *Turn any cane into a Weight Support Feedback Cane.*

> Glossary: see [`CONTEXT.md`](../CONTEXT.md). Decisions: see [`docs/adr/`](./adr).
> Capitalised terms (Host Aid, Stick Cycle, Handle Load, WSFC, Weight Support Target,
> Baseline, Drift, Alert, …) are defined there and used precisely throughout.

> **Moon Walk is one clip-on sensor that runs several applications**; this PRD leads
> with the **flagship**, the **Weight Support Feedback Cane (WSFC)** (ADR-0009), then
> the secondary wellness-monitoring and Speaking-Stick applications. Claim-safety is
> **per-application** (see Scope).

## Problem Statement

**Primary (WSFC).** After a stroke or lower-limb injury, a rehab Patient is meant to
gradually reload the affected leg — but they instinctively **over-rely on the cane and
under-load the weak leg**, which entrenches asymmetric gait and slows recovery. A
therapist can only give vague verbal cues ("lean less on the cane") because cane load
can't be quantified at the bedside; patients and therapists both **estimate weight-bearing
poorly** (off by ~35% of body weight — Dabke 2004). There is no everyday tool that tells
the Patient, in real time, when they are leaning too hard.

**Secondary (wellness).** Separately, a person with a mobility-affecting condition has no
objective, continuous picture of how their own gait is changing day to day; subtle
deterioration (or rehab improvement) goes unnoticed until severe, and recall between clinic
visits is unreliable. They have no easy way to build **awareness** of when their walking has
changed enough to mention to a doctor.

## Solution

**Moon Walk** is a sensor box that clips onto the user's existing **Host Aid** and turns
it into an instrument — the *sensor*, on which several **applications** run.

**Flagship — the Weight Support Feedback Cane (WSFC)** (ADR-0009). On a cane, Moon Walk
reads **Handle Load** every step (sensed pneumatically — a bladder under the grip read by
the onboard barometer, ADR-0010) and compares it to the Patient's **Weight Support Target**:
a per-patient cane-load ceiling, set by a **Clinician** from a baseline walk and **faded
−10%/week (≈60%→30% of the patient's own baseline cane-dependence)**, advancing only when
≥80% of steps land in-band. When the Patient over-leans, Moon Walk gives an **immediate
auditory (default) or haptic cue** — training them to load the affected leg. The target is
**% of the patient's own baseline**, never %body-weight and never an absolute-force claim
(kgf is bench-calibration only). This is the evidence-backed loop from the cane biofeedback
RCTs (Jung 2015, Kang 2021; see [`rehab/`](../rehab)).

**Secondary — wellness gait monitoring** (ADR-0005). The same sensor also **measures and
trends** the user's **Gait** — cadence, duty factor, loading, asymmetry, stride/velocity
trends — learns the individual **Baseline** on-device, detects sustained **Drift**, and
raises a non-medical **Alert** ("your walking has changed — you may want to mention it to
your doctor") with the MEDICAL CLAIM SAFETY disclaimer. It does **not** diagnose, treat,
predict disease, or predict fall risk (ADR-0001); a clinician — never the device —
interprets any data. Data and intelligence stay on the device and phone; nothing goes to
the cloud by default.

**Moon Walk is also a Speaking Stick** (ADR-0003). On a **Look Gesture** (raise/point
the stick) or button press, it captures the user's surroundings with a camera,
sends the frame to a cloud **VLM** (Gemini 2.5 Flash) for an open-ended **Scene
Description**, and speaks it aloud — "there's a doorway about two metres ahead on your
left, and a chair directly in front of you." A separate, fully-offline **Proximity
Alert** (ToF distance → buzzer/haptic) gives an instant obstacle warning. This is the
see-and-speak assistive layer; it complements, and is built on the same hardware as,
the gait-monitoring layer.

**Engagement / adherence — Walk Buddies** (ADR-0008). The companion app presents movement
as **Walk Buddies** — a gentle, claim-safe view where a Pokémon-style Buddy's mood, posture,
and energy follow how the person walks. It is an engagement layer over the *same* metrics —
not a new sensor and not a health score. **Under the WSFC it doubles as the adherence skin:**
the **MOVE** bar reflects live *in-band loading* (lean correctly → the Buddy perks up), and
show-up rewards (**Walk-Days**, **Pins**, never-wilting **Garden**) track *session adherence*
to the prescribed dose. Rewards for showing up need no comparison; any quality-based
encouragement is judged against the person's *own* Baseline (never a norm); and the MOVE bar
is the Buddy's energy, never the person's vitality.

**Hardware: two boards** (ADR-0004). A stick-mounted **Sensor Node** (Arduino Nano)
owns the always-on real-time sensors and tactile feedback; a **Compute Brain**
(Arduino UNO Q) runs the camera → VLM → speech pipeline and the on-device gait
intelligence. They are linked by a wired UART.

## User Stories

### User — setup & calibration
1. As a user, I want to clip Moon Walk onto my own walking stick or walker, so that I don't have to buy or learn a new mobility aid.
2. As a user, I want to tell Moon Walk whether I use a cane or a walker, so that it measures my gait with the correct model (see ADR-0002).
3. As a user, I want a short guided calibration (e.g. enter/confirm my stick length, do a brief walk), so that my stride and loading measurements are tuned to me.
4. As a user, I want Moon Walk to calibrate my personal grip-force thresholds, so that my loading metrics are accurate despite person-to-person variation.
5. As a user, I want Moon Walk to pair with my phone over Bluetooth, so that I can see my data without any internet account.

### User — daily use
6. As a user, I want Moon Walk to record my walking automatically whenever I use my aid, so that I don't have to start/stop anything.
7. As a user, I want the device to be unobtrusive and battery-powered, so that it doesn't interfere with how I walk.
8. As a user, I want to see my recent walking activity in the app, so that I feel informed about my own progress.
9. As a user, I want to receive an Alert when my walking has changed noticeably, phrased as a wellness awareness cue ("you may want to mention it to your doctor"), not a diagnosis, so that I notice change without being alarmed.
10. As a user, I want every Alert to carry an inline MEDICAL CLAIM SAFETY disclaimer ("a wellness awareness cue, not a medical assessment"), and a persistent disclaimer footer on the dashboard, so that I never mistake awareness for diagnosis (see ADR-0005).
11. As a user, I want to *optionally* export a trend report to share with my doctor, so that they can see objective data if I choose to involve them.
12. As a user, I want my data to stay on my device and phone by default, so that my health information is private.

### WSFC — flagship (Patient + prescribing Clinician · ADR-0009)
- **US-W1.** As a Patient, I want an immediate cue (beep/haptic) the moment I lean too hard on the cane, so that I learn to load my affected leg instead of the cane.
- **US-W2.** As a Clinician, I want to set the Patient's Weight Support Target from a baseline walk and have it fade automatically (−10%/week, ≈60%→30% of their own baseline cane-dependence), advancing only when ≥80% of steps are in-band, so that the retraining progresses safely without me re-tuning it each visit.
- **US-W3.** As a Clinician, I want to prescribe a session dose (~30 min × 3–5/week × 4–6 weeks) and see in-band-step % per session, so that I can track whether the Patient is doing the work correctly.
- **US-W4.** As a Clinician, I want recovery progress (paretic loading ↑, gait-speed trend, adherence) in one view, so that I judge clinical improvement objectively rather than by eye.
- **US-W5.** As a Patient, I want the target framed as "% of your own baseline," never %body-weight or a force reading, so that the device stays an honest coach and never a medical scale.

### Clinician — wellness (optional — only if the User chooses to share)
13. As a clinician, I want to receive a user-shared trend report of gait metrics over time, so that I can assess progression or improvement objectively.
14. As a clinician, I want temporal metrics (cadence, duty factor, asymmetry) presented as the primary, reliable figures, so that I trust the numbers I act on.
15. As a clinician, I want spatial metrics (stride length, velocity) clearly labelled as relative trends, not absolutes, so that I am not misled by known underestimation.
16. As a clinician, I want to see how current metrics compare to the user's own Baseline, so that I judge change for that individual rather than against a population norm.

### Cane Mode (single swinging stick)
17. As a cane user, I want Moon Walk to detect each Stick Cycle (plant and swing), so that my cadence and rhythm are measured.
18. As a cane user, I want stride length and velocity estimated from the Pendulum Model, so that distance trends are tracked without drift-prone acceleration integration.
19. As a cane user, I want my Handle Load measured at each plant, so that how hard I lean on the stick (offloading my affected leg) is tracked.
20. As a cane user, I want the Handle Load plant-detection to anchor the distance estimate (ZUPT reset), so that the stride/velocity estimate does not drift.
21. As a cane user, I want rhythm variability (irregular cadence) tracked, so that deterioration showing up as unsteady timing is captured.

### Walker Mode (wheeled rollator)
22. As a walker user, I want Moon Walk to measure distance and velocity via wheel-encoder odometry, so that my walking distance is tracked accurately on indoor floors.
23. As a walker user, I want left-vs-right grip-load asymmetry measured from dual grips, so that a limp (uneven loading) is detected directly.
24. As a walker user, I want cadence and duty factor derived from my gait, so that timing changes are tracked even though the walker rolls continuously.

### Speaking Stick — see & speak (see ADR-0003, ADR-0004)
28. As a user, I want to raise or point my stick (a **Look Gesture**) to ask "what's in front of me?", so that I get a spoken description hands-free without pressing anything.
29. As a user, I want a button as a manual trigger for a scene description, so that I have a reliable fallback if the gesture isn't detected.
30. As a user, I want Moon Walk to speak a natural description of my surroundings (obstacles, doorways, people), so that I get a useful, human-sounding picture rather than a list of object labels.
31. As a user, I want an instant buzz/haptic when something is close ahead (the **Proximity Alert**), so that I am warned immediately even when there is no network.
32. As a user, I want the see-and-speak feature to keep working acceptably if the cloud is slow or unreachable, so that a bad connection doesn't leave me with nothing (offline Proximity Alert + a canned fallback phrase).
33. As a user, I want to understand that the spoken descriptions are an assistive convenience and not a safety guarantee, so that I keep using my own judgement and attention.
34. As a user, I want to know that camera frames for descriptions go to a cloud service (unlike my gait/health data, which stays on-device), so that I can make an informed privacy choice.

### Motivation companion — Walk Buddies (see ADR-0008, ADR-0006)
35. As a user, I want my walking shown as a friendly Buddy whose mood and liveliness follow how I move, so that daily walking feels encouraging rather than clinical.
36. As a user, I want a MOVE energy bar that fills as I walk and Levels Up my Buddy — framed as the Buddy's energy, not my health — so that I feel a small win each session without it implying a health rating.
37. As a user, I want show-up rewards (additive Walk-Days, thank-you Pins, a berry Garden that never wilts on a rest day), so that consistency is celebrated and missing a day is never punished.
38. As a user, I want any quality-based encouragement compared to my own recent Baseline ("smoother than last week"), never to other people or a population norm, so that it stays fair and claim-safe (ADR-0005).
39. As a user, I want the motivation view to carry the same wellness disclaimer and keep coaching phrasing behind Training Mode, so that encouragement is never mistaken for a medical assessment (ADR-0005, ADR-0006).
40. As a user, I want my Buddy large and expressive (readable face, posture, idle animation, emotes), so that I can read its reaction to my walking at a glance.

### Intelligence & validation
25. As a user, I want Moon Walk to learn my normal Baseline over repeated sessions, so that Alerts reflect my own normal, not a generic standard.
26. As a user, I want only *sustained* Drift to raise an Alert, so that I am not alerted by a single odd walk or a cold-weather stiff day.
27. As a developer, I want to validate the Drift detection with a simulated-impairment protocol (record a normal Baseline, then walk with a deliberately induced limp and confirm the Alert fires), so that the intelligence is demonstrable without weeks of real user data.

## Implementation Decisions

### Architecture (see CONTEXT.md → Architecture; ADR-0004)
- **Sensor Node (Arduino Nano)** — stick-mounted, always-on. Runs **Sensor
  Acquisition**, the **Stick Cycle Detector**, and the **Look Gesture** + **Proximity
  Alert** detectors in real time. Streams sensor events and per-cycle gait metrics to
  the Compute Brain over UART; drives the local buzzer/haptic.
- **Compute Brain (Arduino UNO Q)** — two halves:
  - *STM32 MCU* — the **UART Bridge** to the Sensor Node and UNO-Q-local actuation.
  - *Linux (Qualcomm) side* — runs the **Vision Pipeline** (camera → cloud **VLM**
    Scene Description → **TTS** → speaker) and the **Gait Metric Engine**, **Distance
    Estimator**, **Baseline & Drift Model**, **History Store**, and app-facing
    services. The gait intelligence lives here, on-device.
- **Inter-board link:** wired **UART/serial** (reliable for a live demo; ADR-0004
  rejected BLE/I2C). A small message protocol carries sensor events, gait metrics, and
  trigger signals.
- **Data flow:**
  - *Gait/health*: on-device + the User's phone over local BLE; **no cloud for
    health data**; User explicitly exports a report to a Clinician.
  - *See-and-speak*: camera frames → **cloud VLM** over Wi-Fi (scoped exception,
    ADR-0003). The Proximity Alert is fully offline.

### Modules
1. **Sensor Acquisition (Nano Sensor Node)** — reads the IMU (Modulino Movement /
   LSM6DSOX), the pneumatic **Handle Load** (bladder → LPS22HB barometer, ADR-0010), the
   ToF distance (Modulino Distance) and, in Walker Mode, the wheel encoder. Emits one
   timestamped raw sample stream. Encapsulates all I²C/Qwiic detail behind a sample-stream interface.
2. **Stick Cycle Detector** *(deep)* — input: raw sample stream; output: plant/swing
   events and cycle boundaries. Pure function of the sample stream.
3. **Gait Metric Engine** *(deep)* — input: cycle events + IMU angles + calibration;
   output: temporal metrics (cadence, **Stick Duty Factor**, asymmetry) and spatial
   trend metrics. Pure.
4. **Distance Estimator** *(deep)* — mode-aware: Pendulum Model + ZUPT (Cane Mode) or
   wheel-encoder odometry (Walker Mode); output: stride length and velocity. Pure;
   the mode is an input, not a global.
5. **Baseline & Drift Model** *(deep, Linux)* — input: metric history; maintains the
   per-user **Baseline**, computes a **Drift** score, and decides when to raise an
   **Alert**. Pure logic over a time series (e.g. per-user statistical baseline +
   z-score/threshold on sustained departure).
6. **UART Bridge** — thin glue over the wired serial link; a small message protocol
   carries sensor events, gait metrics, and trigger signals Nano→UNO Q (ADR-0004).
7. **History Store** — on-device persistence of sessions and metrics.
8. **Companion App + BLE** — phone UI: activity view, Alerts (wellness awareness
   framing + inline MEDICAL CLAIM SAFETY disclaimer, ADR-0005), persistent dashboard
   disclaimer footer, optional trend report export. Implements the BLE GATT layer
   itself (not provided by UNO Q docs — to be built with BlueZ/`bleak` on the Linux side).
9. **Calibration & Mode Setup** — stick-length entry, per-user Handle Load calibration
   (bench-calibrate the bladder+barometer against a scale; capture the Patient's baseline
   cane-dependence for the WSFC target), Host Aid mode selection (manual at setup).
10. **Look Gesture + Proximity Detector (Nano)** *(deep)* — input: IMU + ToF sample
    stream; output: a debounced **Look Gesture** trigger and a thresholded **Proximity
    Alert** (with hysteresis). Pure function of the sample stream; the Proximity Alert
    is cloud-independent. Shares the IMU/ToF stream with the Stick Cycle Detector.
11. **Vision Pipeline (UNO Q Linux)** — on trigger: grab a camera frame, downscale to
    ≤1024px JPEG, call the cloud **VLM** for a **Scene Description**, hand the text to
    **TTS**, play it on the speaker. Handles timeouts and a canned fallback phrase;
    offline object-detection + offline TTS Bricks are the no-network fallback (ADR-0003).
12. **Walk Buddies (companion motivation view)** *(ADR-0008)* — a presentation layer over
    the live gait metrics: maps a 0–100 **Moon Walk Score** to a Buddy **Mood** + posture,
    runs the show-up reward loop (**MOVE** energy → **Level**, **Walk-Days**, **Pins**,
    **Garden**) and the **Friends Album**. Reads metrics only — adds no sensing and changes
    no claim-safety surface. Built and validated as a local web app (ADR-0007) with a
    simulated feed; the current build is full-colour Pokémon-Emerald art. **Under the WSFC it
    is the adherence skin** — the MOVE bar tracks live in-band loading and rewards track
    session adherence.
13. **WSFC Feedback Loop (Nano)** *(deep, flagship · ADR-0009)* — input: per-step Handle Load
    + the current **Weight Support Target** band; output: a real-time **auditory (default) /
    haptic** cue while load is out-of-band, and a per-step in-band/out-of-band classification.
    Runs on the always-on Nano so feedback is immediate and works offline. Pure function of
    the load stream + target.
14. **Threshold Engine** *(deep, Linux)* — input: the Patient's baseline cane-dependence +
    week number + in-band history; output: the current **Weight Support Target** (faded
    −10%/week from ≈60%→30% of baseline), the advancement decision (advance only at ≥80%
    in-band steps), and per-session in-band-% logging. Pure logic over the session series;
    the Clinician sets the starting band and dose.

### Key technical decisions
- **Per-application claim-safety** (ADR-0009, amending ADR-0005). One sensor, several
  applications; the claim posture depends on which is running. The **WSFC** (flagship)
  addresses a **Patient** under a prescribing **Clinician**, gives real-time therapeutic
  feedback, and may state a weight-bearing-retraining intent. The **wellness** application
  keeps the **User** framing: awareness/guidance language (cue, reminder, self-monitoring),
  with the MEDICAL CLAIM SAFETY disclaimer inline on every Alert + a persistent footer. A
  **shared boundary binds all applications**: no diagnosis, no disease/fall-risk prediction,
  no absolute force, no %-body-weight (the WSFC target is % of the patient's *own* baseline —
  ADR-0010). The Speaking Stick keeps its distinct assistive-safety disclosure.
- **Scope: measure-and-trend, not diagnostic** (ADR-0001). Spatial metrics (stride,
  velocity) are relative trends only — reliable for tracking change over time, not as
  clinical absolutes; temporal metrics (cadence, rhythm) are the headline figures.
  (Evidence base: `docs/research/gait-evidence-references.md`.)
- **Two mode-specific sensing models, not one toggle** (ADR-0002).
- **Handle Load does double duty** in Cane Mode: it is both the Weight-Bearing metric
  and the ZUPT stance anchor that bounds Distance Estimator drift.
- **Handle Load is sensed pneumatically** (ADR-0010): an air bladder under the grip read
  by the onboard **LPS22HB barometer**, IMU swing-phase auto-tared. This replaces the
  multi-FSR grip and uses sensors already on the board ($0 BOM). Thermo (temp/humidity) was
  dropped as not gait-relevant.
- **Mode selection is manual at setup** (reliable); auto-detection is out of scope.
- **Per-user calibration is mandatory** — bench-calibrate the bladder+barometer to the
  patient and capture their baseline cane-dependence for the WSFC target.
- **See-and-speak is a cloud VLM, not on-device** (ADR-0003): open-ended Scene
  Description quality is the demo "wow" and only a cloud VLM (Gemini 2.5 Flash)
  delivers it. On-device object detection + offline TTS are the no-network fallback.
- **Two boards, wired UART** (ADR-0004): stick-mounted Nano Sensor Node + UNO Q
  Compute Brain. UART chosen over BLE/I2C for live-demo reliability.
- **Privacy posture splits by data type** (ADR-0003): gait/health data stays
  on-device; camera frames for Scene Description go to the cloud — a deliberate,
  disclosed exception.
- **The demo path needs Wi-Fi**; bring a phone hotspot, never trust venue Wi-Fi. Use
  the stateless frame→VLM→TTS path (not a realtime socket) for resilience.
- **Motivation is a claim-safe companion layer, not a score** (ADR-0008). Walk Buddies
  turns movement into encouragement (Buddy Mood + posture, MOVE energy → Levels, Walk-Days,
  Pins, Garden, Friends Album). Show-up rewards need no comparison; quality is judged vs the
  User's own Baseline, never a norm; the MOVE bar is the Buddy's energy, not the User's
  vitality. Levels never decrease and streaks never break (elderly-appropriate, all carrot).

## Testing Decisions

**What makes a good test here:** tests exercise *external behavior* through each
module's public interface, not its internals. The four deep modules are pure functions
over sample/metric streams, so they are tested by feeding **recorded and synthetic
input data with known expected outputs** — no hardware in the loop. The
simulated-impairment recordings (normal Baseline vs induced-limp) are first-class test
fixtures, shared between the validation protocol and the test suite.

**Modules to be tested (all four deep modules):**
- **Stick Cycle Detector** — given recorded and synthetic sample streams (including
  induced-limp data), assert correct plant/swing/cycle detection and counts.
- **Gait Metric Engine** — given cycle events with known answers, assert correct
  cadence, duty factor, and asymmetry; assert spatial metrics are produced as trends.
- **Distance Estimator** — given known-distance walks, assert Pendulum+ZUPT (cane) and
  encoder odometry (walker) estimates are within tolerance and that drift is bounded
  by the ZUPT reset.
- **Baseline & Drift Model** — given synthetic progression series, assert the Baseline
  is learned, that a single anomalous session does **not** alert, and that *sustained*
  Drift does raise an Alert (the core intelligence claim).
- **WSFC Feedback Loop** — given a recorded load stream + a target band, assert the cue
  fires exactly while load is out-of-band (and stays silent in-band), and that per-step
  in/out classification matches known-answer fixtures (the flagship intelligence claim).
- **Threshold Engine** — given synthetic session series, assert the target fades −10%/week,
  advances only at ≥80% in-band, and never advances on a sub-threshold week.
- **Look Gesture + Proximity Detector** — given recorded/synthetic IMU+ToF streams,
  assert the Look Gesture fires on a raise/point and not on ordinary walking
  (debounce), and that the Proximity Alert triggers at the threshold with hysteresis.
  Pure function of the sample stream; no cloud. The **Vision Pipeline** itself (cloud
  VLM call) is integration-tested with a stubbed VLM/TTS, not unit-tested for content.

**Prior art:** none yet (greenfield). These establish the project's testing pattern:
pure-logic modules + fixture-driven known-answer tests.

## Out of Scope
- Diagnosis, disease prediction, **fall-risk prediction**, or any diagnostic/medical
  advice — in **every** application including the WSFC (ADR-0001, ADR-0005, ADR-0009).
  The WSFC *does* deliver therapeutic weight-bearing feedback prescribed by a Clinician,
  but it neither diagnoses nor predicts; it retrains a prescribed behaviour.
- Absolute-force / %-body-weight claims (ADR-0010) — kgf is internal calibration only; the
  WSFC target is % of the patient's own baseline cane-dependence.
- Stress / emotional-state inference — Moon Walk senses gait and handle load only;
  "stress detection" is not a Moon Walk capability (ADR-0005).
- Cloud sync/accounts for **gait/health data**, and a live clinician dashboard (gait
  data is user-exported only, and only if the User chooses). Note: the see-and-speak layer *does* use a cloud VLM
  for camera frames — a scoped, disclosed exception (ADR-0003), not health-data sync.
- **Competitive or comparative gamification** in Walk Buddies — leaderboards, ranked
  contests, battles, fixed score thresholds, or any reward that scales with speed/distance
  or ranks Users against each other or a population norm (ADR-0008). Motivation is
  show-up-based and self-referential only.
- Automatic Host Aid mode detection (manual selection at setup instead).
- Camera-based optical-flow **odometry** (deferred; Walker Mode uses a wheel encoder).
  Note: the camera *is* now used for see-and-speak Scene Description (ADR-0003), via a
  USB webcam — not the MIPI camera, which still needs a non-trivial GStreamer pipeline.
- **Turn-by-turn navigation / path-finding.** The Speaking Stick *describes*
  surroundings and warns of obstacles; it does not route, guide, or guarantee safety
  (ADR-0003). Distinct from the unrelated 2014 navigation device.
- Realtime streaming voice+vision APIs (Gemini Live / OpenAI Realtime) — stretch goal
  only; the demo uses the resilient stateless path (ADR-0003).
- On-device VLM (the QRB2210 has no large NPU); cloud VLM instead, with on-device
  object detection only as the offline fallback.
- Regulatory clearance / a completed clinical trial — **out of scope for now, but the
  intended direction** for the WSFC: its pitch is to *generate* recovery evidence via the
  team's own validation, since no cane-based recovery RCT yet exists (ADR-0009; `rehab/`).
  A firm clinical/partner commitment triggers a follow-up ADR on regulatory pathway.
- The temp/humidity (Thermo) sensor.

## Further Notes
- **Differentiation from the 2014 "Smart Walker" (FiCloud 2014):** different user
  (gait monitoring vs navigation), different relationship to the aid (instruments the
  existing aid vs replaces it), different architecture (on-device baseline/drift ML vs
  raw video/HR streaming), honest scope, and privacy-first design.
- **Success metrics.** *Flagship (WSFC):* the feedback loop fires correctly (cue iff
  out-of-band), the Threshold Engine fades/advances per protocol, and — as clinical outcomes
  to validate — paretic-limb loading ↑, gait-speed trend (MCID ≥ 0.16 m/s, Tilson 2010),
  in-band-step %, and session adherence. *Wellness:* the Drift→Alert intelligence (sustained
  Drift alerts; a single bad session does not). Improvement-in-Score is **not** a wellness KPI
  (a medical-claim trap, ADR-0008); under the WSFC, clinical improvement *is* the goal.
- **Demo path:** lead with the **WSFC** — lean too hard on the cane → immediate beep; correct
  the lean → silence; show the fading target. The **Speaking Stick** (raise → VLM → spoken
  Scene Description, offline Proximity Alert backstop) is the secondary "wow"; wellness Cane
  Mode + the simulated-impairment protocol demonstrates the Drift→Alert pipeline.
- **Known implementation risks (from docs research):**
  - **Conference Wi-Fi is the top risk** for the see-and-speak path — bring a phone
    hotspot, prefer the stateless frame→VLM→TTS calls, add timeouts + a canned
    fallback phrase, and keep the offline Proximity Alert working regardless.
  - UNO Q has a **single USB-C port** — a powered USB-C hub is needed to run the USB
    webcam + speaker + power at once; no onboard 3.5mm jack or camera-ribbon connector.
  - On-device object detection runs ~2–3 FPS (fine for periodic scene description);
    Bricks need internet on first install.
  - The **Nano↔UNO Q UART protocol** has no off-the-shelf example and must be wired up.
  - BLE GATT to the phone is not covered by UNO Q docs and must be hand-rolled
    (BlueZ/`bleak`); the MIPI camera needs a GStreamer pipeline if ever revisited
    (the see-and-speak path uses a USB webcam instead).
- **Walker Mode hardware not yet in hand:** wheel encoder and dual-grip pneumatic load
  pads (one bladder+barometer per grip, ADR-0010) need sourcing/mounting; this is the ~2×
  cost accepted in ADR-0002.
