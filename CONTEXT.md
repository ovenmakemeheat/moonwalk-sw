# Moon Walk

> *Turn any cane into a Weight Support Feedback Cane.*

A sensor module that clips onto an ordinary walking stick or walker (the **Host Aid**)
and turns it into an instrument. Moon Walk is the *sensor*; the things it does are
**applications** running on that one sensor. The **flagship application is the Weight
Support Feedback Cane (WSFC)** — real-time biofeedback that guides a rehab Patient
recovering from a **sprain, strain, or lower-limb soft-tissue injury** through
**progressive optimal loading**: it cues them when they over-lean on the cane (over-protecting
the healing limb) so they reload it at the clinician-prescribed pace and **recover faster**
(see [ADR-0013], which refocuses the [ADR-0009] mechanism to this indication).
The same sensor also runs two secondary applications: **wellness gait monitoring**
(track a User's gait trend, raise a non-medical Alert) and the **Speaking Stick** (see
the surroundings and speak a description, with an instant obstacle warning — [ADR-0003]).
See [ADR-0010] (how Handle Load is sensed) and [ADR-0004] (two-board architecture).

## Language

**Moon Walk**:
The attachable sensor box itself — the device being built. Not the stick.
_Avoid_: "the stick", "the walker" (those are the host, see **Host Aid**).

**Host Aid**:
The ordinary walking stick or walker that Moon Walk clips onto. Moon Walk does not
replace it; it instruments it. Comes in two kinds requiring **different sensing
models** — see **Cane Mode** / **Walker Mode**.
_Avoid_: calling it "Moon Walk".

**Cane Mode**:
For a single swinging stick. Distance via **Pendulum Model** anchored by **Handle
Load** (ZUPT). Plant-and-swing **Stick Cycle**.

**Walker Mode**:
For a wheeled rollator. No pendulum (it rolls, not swings). Distance via **wheel
encoder** odometry (primary). Limp measured directly as **left-vs-right grip-load
asymmetry** from dual grips — the asymmetry signal a single cane cannot give.

**WSFC (Weight Support Feedback Cane)**:
Moon Walk's **flagship application**: the Moon Walk sensor on a cane, running a real-time
weight-support biofeedback loop that guides a rehab **Patient** recovering from a **sprain,
strain, or lower-limb soft-tissue injury** through **progressive optimal loading** — reloading
the healing limb at the right pace to **recover faster** instead of over-protecting it by
over-leaning on the cane. It reads **Handle Load** per step, compares it to the **Weight
Support Target**, and cues the Patient (auditory/haptic) when out of band. Not a
separate device — an application/mode of the Moon Walk sensor. The feedback loop is
**rule-based + DSP** (not ML). See [ADR-0013] (sprain/strain refocus), [ADR-0009] (the
mechanism), [ADR-0011].
_Avoid_: treating WSFC as a new cane to buy (it is the sensor attached to the user's own cane);
framing it as stroke-only (stroke is mechanism-compatible but no longer the flagship — [ADR-0013]).

**Gait**:
The pattern of a person's walking — cadence, symmetry, swing, loading. The thing
Moon Walk is ultimately trying to characterise.

**Weight Bearing**:
The load transmitted through the Host Aid (and by inference, how much the user
is offloading from an affected limb). Sensed via **Handle Load**.
_Avoid_: confusing with the user's body weight.

**Sensor suite (resolved):** two channels — the **IMU** (6-axis) and a **pneumatic
Handle Load** sensor (a soft air bladder under the grip → trapped-air pressure read by
the onboard **LPS22HB barometer**), plus a single-channel **Distance** (ToF) for Stick
Cycle phase detection. The barometer *simulates an FSR/load cell* using sensors already
on the board — see [ADR-0010] and `docs/pneumatic-load-sensing.html`. Temp/humidity
(Thermo) was dropped as not gait-relevant.

> **Hardware in hand (2026-05-27): IMU + pneumatic Handle Load sensor.** Physically acquired
> and working: the Arduino Nano 33 BLE's onboard **LSM9DS1 IMU** (6-axis; magnetometer ignored)
> and **LPS22HB barometer** (260–1260 hPa), and the **pneumatic Handle Load bladder is now built,
> bench-calibrated, and drift/hysteresis-validated** ([ADR-0010]) — no longer a design concept.
> **Handle Load is measured pneumatically** — a soft sealed
> bladder under the grip pipes trapped-air pressure to the barometer; the zero is
> **tared** to cancel thermal drift/creep/leak — **once at session start** for the
> supervised ~30-min WSFC application, or **each swing phase** (IMU: cane in air = zero
> load) for long unsupervised wellness wear (per-application, see [ADR-0010]). This
> *replaces the previously-planned multi-FSR grip*
> (no FSR, ~$0 BOM add). The only remaining un-acquired sensor is the **ToF Distance**;
> until it lands, the **Proximity Alert** (ToF → buzzer/haptic) cannot run, and Stick
> Cycle phase falls back to IMU stillness. See `docs/architecture.html`.

**Stick Cycle**:
One plant-to-plant period of the Host Aid, detected from the IMU/handle force.
Used to derive cadence (cycles/min) and rhythm variability. A proxy for the gait
cycle, **not** identical to it.
_Avoid_: calling it "gait cycle" without qualification.

**Stick Duty Factor**:
Fraction of a Stick Cycle during which the handle is loaded (stick planted).
_Avoid_: confusing with **leg stance time**, which Moon Walk cannot directly measure.

**Handle Load**:
Force the user pushes through the handle, sensed **pneumatically**: a soft sealed air
bladder under the grip is compressed by the load, raising trapped-air pressure that the
onboard **LPS22HB barometer** reads (P = F / A); a bench calibration (2nd-order polynomial)
maps pressure → kgf, and a **tare** re-zeros drift (cadence is per-application — see [ADR-0010]).
This — not ground reaction force — is Moon Walk's measure of **Weight Bearing** and its
strongest limp/offload signal. In cane mode it **doubles as the stance anchor** that resets the
Pendulum Model's drift each footfall (ZUPT). Accuracy is a repeatable *relative* trend
(~10–20%), framed as a compliance signal, not a scale.
_Avoid_: "ground force", "weight" (body weight), "FSR"/"load cell" (the sensor is a
barometer reading a bladder).

**Pendulum Model**:
The method Moon Walk uses to get distance metrics: stride length ≈ stick length ×
sin(rotation angle from the gyroscope). Avoids acceleration double-integration drift.
Requires a one-time **stick-length calibration**.

**Stride Length** / **Gait Velocity**:
Derived via the **Pendulum Model** (cane) / odometry (walker). **Spatial metrics are
trend-only**: a single aid-mounted sensor estimates stride/velocity reliably enough to
track *change over time* but not as clinical absolutes, so we never present them as
absolute values and they require per-user calibration. (Aid-assisted single-sensor gait
validity: Werner et al. 2020, *Sensors*.)

**Temporal metrics** (cadence, stance/swing, **Stick Duty Factor**, asymmetry) are
the robust, headline numbers — cadence in particular is reliably recovered from a single
IMU (Salarian et al. 2004; Werner et al. 2023). Lead with these; spatial metrics are
secondary trends. (See `docs/research/gait-evidence-references.md`.)

> **The three headline metrics (co-equal, no ranking).** Present these together as the
> WSFC's most important read-outs — none leads the others:
> 1. **Symmetry & Rhythm (limp)** — the headline limp signal is **cane-mode temporal
>    step-time symmetry**: an IMU symmetry ratio from alternating left/right plant
>    intervals (off one **Stick Cycle** stream), plus rhythm consistency (1 − step-time
>    CV). Live today and the strongest-evidence route. (The **Walker Mode** grip-load
>    asymmetry above is a *secondary / future* route, never the headline limp signal.)
> 2. **Stick Duty Factor** — the fraction of each **Stick Cycle** the cane is loaded; a
>    force-free read on cane dependence.
> 3. **Session Weight-Support Training Load** — the per-session integrated
>    loading-quality dose; the engagement / dose figure.
>
> All three are read **relative to the Patient's own Baseline** — never %-body-weight,
> absolute force, fall-risk, diagnosis, or a population norm (see **Claim Safety**,
> **Weight Support Target**).

**Alert**:
An in-app wellness nudge raised when tracked metrics drift (e.g. "your walking has
changed — you may want to mention it to your doctor"). An awareness cue, explicitly
**not** a diagnosis or medical advice. Every Alert carries the **MEDICAL CLAIM
SAFETY** disclaimer inline (see **Claim Safety**).
_Avoid_: "diagnosis", "fall risk", "warning", anything implying clinical certainty.

**Baseline**:
A user's own normal gait profile, learned over time on-device. Moon Walk trends
and Alerts are relative to *this user's* Baseline, not a population norm.

**Drift**:
A sustained departure of current metrics from the **Baseline**. Sustained Drift is
what raises an **Alert**.

**Training Mode**:
An **opt-in** mode the User deliberately turns on for a walk. While active, Moon Walk
gives real-time **Coaching Cues**. Distinct from ordinary daily use (US-6), where the
device only records and trends. Off by default. See [ADR-0006].
_Avoid_: implying coaching is always-on, or that it is therapy.

**Coaching Cue**:
A real-time, in-the-moment cue (haptic / audio / on-screen) given **only during
Training Mode**, coaching the User toward a steady-rhythm / even-loading target
defined by *their own* **Baseline** — like a running-cadence coach, not a medical
correction. It **never names a condition** ("limping", "uneven", "abnormal") and makes
no clinical claim. It carries its **own** disclaimer, the **third** distinct from the
gait **Alert**'s MEDICAL CLAIM SAFETY disclaimer and the Speaking Stick's
assistive-safety disclosure. See [ADR-0006] and **Claim Safety**.
_Avoid_: confusing with the gait **Alert** (sustained Drift, not in-the-moment) or the
**Proximity Alert** (obstacles, not gait); calling it correction, therapy, or treatment.

## Language — See-and-Speak layer

**Speaking Stick**:
Moon Walk's see-and-speak capability layer: on demand it captures the user's
surroundings and speaks a description aloud. A name for the *capability*, not a
separate device — the same Moon Walk box that does gait monitoring.
_Avoid_: treating it as a different product from the gait layer.

**Look Gesture**:
The IMU-detected motion (stick raised / pointed) that triggers a scene capture.
The hands-free way to ask "what's in front of me?". A button is the manual fallback.
_Avoid_: confusing with the gait **Stick Cycle**, which the same IMU also detects.

**Scene Description**:
The natural-language sentence describing the user's surroundings (obstacles,
doorways, people), produced by a cloud **VLM** and voiced via **TTS**. Open-ended
prose, not a fixed list of object classes.
_Avoid_: "object detection" (that's the offline fallback, not the headline).

**Proximity Alert**:
An instant, **cloud-independent** obstacle warning (ToF distance → buzzer/haptic),
e.g. "object ~1 m ahead". Works with no network; complements the richer **Scene
Description**.
_Avoid_: confusing with the gait **Alert** (which is about Drift, not obstacles).

**VLM** (Vision-Language Model):
The cloud model (**Gemini 2.5 Flash**) that turns a camera frame into a **Scene
Description**. Reached over Wi-Fi. See [ADR-0003].

**TTS** (Text-to-Speech):
Voices the **Scene Description** through the speaker. Cloud TTS for quality, with the
UNO Q's offline TTS Brick as a fallback.

**Compute Brain** (UNO Q):
The board that runs the see-and-speak pipeline (camera → VLM → TTS → speaker) and the
on-device gait intelligence (**Baseline**, **Drift**). See [ADR-0004].

**Sensor Node** (Nano):
The stick-mounted board that owns the always-on, real-time sensors (IMU, ToF, Handle
Load) and tactile feedback, streaming to the **Compute Brain** over wired UART.

## Language — Walk Buddies (motivation companion)

The companion-app presentation layer that turns the User's *own* movement into gentle
motivation. It is **how the gait layer is surfaced to the User day-to-day**, not a new
device capability and not a new sensor — it reads the same metrics and stays inside the
wellness frame. See [ADR-0008] and [ADR-0006].

**Walk Buddies**:
The motivation view of the companion app: each walker is shown as a Pokémon-style
**Buddy** living in a small world, animated by the User's live movement. The current
build (`realtime/game/emerald.html`) renders it in full-colour Pokémon-Emerald art.
_Avoid_: treating it as a game that *rates* the User's health — it is encouragement.

**Buddy**:
The on-screen character that stands in for the User's movement. Its **Mood** and body
posture follow the live **Moon Walk Score**; it is a companion, never an avatar of the
User's health. (Pokémon sprites have one face, so mood is shown through body posture.)

**Moon Walk Score**:
A 0–100 *encouragement* blend of the live gait components (rhythm, cadence, endurance,
activity, swing) used only to animate the **Buddy**'s **Mood**. A motivation figure, **not**
a clinical metric or a health rating. _Avoid_: presenting it as a grade or a medical number.

**Mood**:
One of five always-positive Buddy states — Asleep → Sleepy → Warming up → Happy →
Thrilled — mapped from the **Moon Walk Score**. Encouragement, **not** a verdict.
_Avoid_: any mood that reads as a judgement on the User ("bad", "unhealthy").

**MOVE bar** (Buddy Energy):
A bar that fills while the User is actively walking (from live cadence + activity) and
gently drains after a rest grace; filling it **Levels Up** the Buddy. It is explicitly the
**Buddy's energy, never the User's vitality**.
_Avoid_: calling it a fitness / health / "strain" / "recovery" score.

**Level / Walk-Day / Pin**:
Show-up rewards. A **Level** never decreases. A **Walk-Day** is an additive lifetime count
of distinct days the User walked — a streak that never "breaks". **Pins** are thank-you
badges at walk-day milestones. All are reachable by anyone who walks, with **no comparison
to a norm**. _Avoid_: punitive streaks, loss/shame framing, leaderboards, fixed thresholds.

**Garden**:
A berry plant in the Buddy's world that advances one stage per **Walk-Day** and **never
wilts** on a missed day — rest is celebrated, not penalised.

**Friends Album**:
A gentle gallery of the Buddies and keepsakes the User has collected by walking. A photo
album, **not** a "7 of 12" completion checklist.

> **Show-up vs quality (load-bearing — ADR-0005).** *Show-up* rewards (Levels, Walk-Days,
> Garden, Pins) need **no comparison** — always reachable. Anything reflecting movement
> *quality* (how the energy fills, future evolution art) compares today against the User's
> **own** rolling **Baseline**, never a population norm — copy is "smoother than last week",
> never "above average". Coaching phrasing stays gated behind **Training Mode** ([ADR-0006]).

## Scope (resolved)

Moon Walk is **one sensor running several applications**, and **claim-safety is
per-application** (see [ADR-0009], [ADR-0013]):

- **WSFC (flagship, clinical).** Attached to a cane, Moon Walk delivers real-time
  weight-support biofeedback to a **Patient** recovering from a **sprain, strain, or
  lower-limb soft-tissue injury**, under a prescribing **Clinician**, to guide
  **progressive optimal loading** of the healing limb for a **quicker recovery** (see
  [ADR-0013]). This application *may* state a therapeutic intent (faster recovery via
  optimal loading) and use real-time corrective feedback — the one place the wellness
  posture below does **not** apply. It still makes **no** absolute-force / %-body-weight /
  fall-risk / diagnostic claim (targets are relative to the patient's own baseline — see
  **Weight Support Target**).
- **Wellness gait monitoring (secondary, claim-safe).** For a **User**, Moon Walk
  **measures and trends** gait and may raise non-medical **Alerts**; it does **not**
  diagnose, treat, predict disease, or predict fall risk. See [ADR-0001] and [ADR-0005].
- **Speaking Stick (secondary, assistive).** Describes surroundings / warns of obstacles;
  an assistive convenience, not a navigation or safety guarantee. See [ADR-0003].

The **no absolute-force / no %-body-weight / no fall-risk / no diagnosis** boundary holds
across *all* applications. What the WSFC application changes vs wellness is only: **Patient**
and a prescribing **Clinician** are legitimate; real-time therapeutic feedback is allowed; a
progressive-optimal-loading / faster-recovery intent is statable.

## Claim Safety (language discipline — normative)

**Claim-safety is per-application** ([ADR-0009], [ADR-0013]). The vocabulary below is normative
for the **wellness** and **Speaking Stick** applications, and the *shared bans* (no diagnosis,
no treatment, **no fall-risk**, **no absolute force / %-body-weight**) bind **all**
applications including the WSFC. The **WSFC** application alone additionally *may* address a
**Patient**, name a prescribing **Clinician**, give real-time corrective feedback, and state a
progressive-optimal-loading / faster-recovery intent — within those shared bans.

For the wellness application: Moon Walk lives in **wellness, not medicine**. The system may
suggest cues, reminders, and awareness. It must not diagnose, treat, or replace professional
judgement. This vocabulary is normative for all wellness UI copy and docs — see [ADR-0005].

**Say** (awareness & guidance): wellness cue · behaviour awareness ·
self-monitoring · support · reminder · guidance · "your walking has changed".

**Do not say** (claims Moon Walk cannot back): diagnosis · treatment · medical
decision · **fall risk / "likely to fall"** · "your condition is worsening" · any
causal or clinical claim. (Moon Walk senses gait and handle load only — it does
**not** sense stress or affect, so "stress detection" is not a Moon Walk concept.)

**MEDICAL CLAIM SAFETY disclaimer** — "a wellness awareness cue, not a medical
assessment" — renders **inline on every Alert** and as a **persistent dashboard
footer**. It is **distinct** from the Speaking Stick's assistive-safety disclosure
("not a navigation or safety guarantee", see [ADR-0003] / US-33); the two guard
different failure modes and are never substituted for one another.

There are **three** distinct disclaimers, one per failure mode, never substituted:
1. **MEDICAL CLAIM SAFETY** — on every gait **Alert**, the persistent dashboard footer, and
   the **Walk Buddies** footer (Levels, Moods, Gardens, and Pins are encouragement, **not** a
   health rating; the MOVE bar is the Buddy's energy, not the User's vitality — [ADR-0008]).
2. **Speaking Stick assistive-safety** — "not a navigation or safety guarantee" ([ADR-0003]).
3. **Coaching disclaimer** — shown on entering **Training Mode**: a **Coaching Cue** is
   wellness coaching toward the User's own rhythm, **not** physiotherapy, gait
   correction, or medical treatment ([ADR-0006]).

The **Speaking Stick** layer additionally **describes surroundings and warns of
obstacles** on demand (**Scene Description** + **Proximity Alert**). It is an
assistive convenience, **not** a navigation/safety guarantee or a substitute for the
user's own attention. See [ADR-0003].

**User**:
The person using the Host Aid in the **wellness** application. Owns their own data and is the
only mandatory reader of the wellness app — for them, Moon Walk is a self-monitoring tool.
_Avoid_: "Patient" **in the wellness application** (reasserts a medical frame the wellness app
deliberately avoids — see [ADR-0005]). In the **WSFC** application the person *is* a **Patient**
(see below).

**Patient** (WSFC application only):
The person recovering from a **sprain, strain, or lower-limb soft-tissue injury** who is temporarily
cane-dependent and using the WSFC to reload the healing limb. Unlike the wellness **User**, the Patient
is in a therapeutic context: a **Clinician** prescribes their **Weight Support Target** and dose, and
Moon Walk gives real-time corrective feedback. Legitimate **only** in the WSFC application — wellness
copy still says **User**. See [ADR-0013], [ADR-0009].
_Avoid_: framing the Patient as stroke-only (stroke is mechanism-compatible but no longer the flagship).

**Clinician** (a.k.a. "your doctor"):
In **wellness**, the professional a **User** may *optionally* share a trend report with; not required
for the wellness app to be useful. _Avoid_: implying the Clinician is the primary wellness audience.
In **WSFC**, the Clinician is the **primary** actor — they prescribe the **Weight Support Target**,
the fading schedule (paced to the injury grade and healing), and the session dose, and read recovery
progress.

**Weight Support Target** (WSFC application):
The per-patient cane-load ceiling the WSFC trains against, expressed as a **% of the Patient's own
measured baseline cane-dependence**, **faded as the injury heals** (the Clinician sets the starting
band and a fade pace matched to the injury grade — days to weeks for soft-tissue recovery, not the
months of neuro retraining) — *never* %-body-weight and *never* an absolute-force clinical claim. As
the ceiling drops, the Patient progressively reloads the healing limb (optimal loading), which is what
drives the **quicker recovery**. kgf from the barometer is used only for bench calibration and an
optional clinician readout, not as the target unit. This is what keeps the WSFC inside the shared
no-%BW / no-absolute-force boundary. See [ADR-0013], [ADR-0010] and [ADR-0009].
_Avoid_: "% body weight", "Newtons", framing it as a population norm (it is the patient's own baseline).

## Architecture (resolved)

Two boards over wired UART — see [ADR-0004].

- **Sensor Node (Arduino Nano)** — stick-mounted, always-on, real-time. Captures the
  IMU, ToF distance, and Handle Load (barometer + bladder); computes the gait **Stick Cycle**
  and detects the **Look Gesture**; fires the **Proximity Alert** and tactile feedback
  locally. Streams events/metrics to the Compute Brain.
- **Compute Brain (UNO Q)** — two halves:
  - *STM32 MCU* — UART bridge to the Sensor Node + any UNO-Q-local actuation.
  - *Linux side (Qualcomm)* — runs the see-and-speak pipeline (USB camera → cloud
    **VLM** **Scene Description** → **TTS** → speaker) **and** the gait intelligence:
    stores history, learns the user **Baseline**, runs the **Drift** model
    on-device, raises **Alerts**. The on-device intelligence is what distinguishes
    Moon Walk from a plain instrumented stick.
- **Data flow** —
  - *Gait/health data*: on-device + **User**'s phone over local BLE/Wi-Fi.
    **No cloud for health data.** User explicitly exports a report to a
    **Clinician**. Privacy-first (the inverse of the 2014 device's weakness).
  - *See-and-speak*: camera frames go to a **cloud VLM** over Wi-Fi — a deliberate,
    scoped exception (surroundings imagery, not health records), see [ADR-0003]. The
    **Proximity Alert** path is fully offline.

<!-- Resolved during grilling: -->
<!-- - IMU on the stick reflects gait via the Stick Cycle proxy (not leg stance directly). -->
<!-- - Two multi-channel sensors = IMU (6-axis) + multi-FSR Handle Load; ToF is single-channel. -->

[ADR-0001]: ./docs/adr/0001-measure-and-trend-not-diagnostic.md
[ADR-0002]: ./docs/adr/0002-dual-mode-sensing-models.md
[ADR-0003]: ./docs/adr/0003-add-see-and-speak-assistive-layer.md
[ADR-0004]: ./docs/adr/0004-two-board-uno-q-brain-nano-sensor-node.md
[ADR-0005]: ./docs/adr/0005-wellness-positioning-and-claim-safety-vocabulary.md
[ADR-0006]: ./docs/adr/0006-opt-in-training-mode-coaching-cue.md
[ADR-0007]: ./docs/adr/0007-local-websocket-transport-for-dashboard-demo.md
[ADR-0008]: ./docs/adr/0008-walk-buddies-emerald-gamification.md
[ADR-0009]: ./docs/adr/0009-pivot-to-weight-support-feedback-cane.md
[ADR-0010]: ./docs/adr/0010-pneumatic-barometer-handle-load.md
[ADR-0011]: ./docs/adr/0011-wsfc-real-time-processing-rule-based-dsp.md
[ADR-0012]: ./docs/adr/0012-where-ml-earns-its-place-on-moonwalk-data.md
[ADR-0013]: ./docs/adr/0013-refocus-wsfc-to-sprain-strain-recovery.md
