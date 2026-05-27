# Moon Walk — Architecture (WSFC flagship)

> Moon Walk is **one clip-on sensor running several applications** ([ADR-0009]). The
> **flagship is the Weight Support Feedback Cane (WSFC)**: a real-time weight-support
> biofeedback loop that retrains a rehab **Patient** to load the affected leg instead of
> over-leaning on the cane. **Wellness gait-monitoring** and the **Speaking Stick** are
> secondary applications on the same hardware. This doc describes the runtime architecture;
> the *why* lives in the ADRs linked throughout.
>
> **Hardware reality (2026-05).** *In hand:* the Arduino Nano 33 BLE's onboard **LSM9DS1
> IMU** and **LPS22HB barometer**. *Designed, not built:* the pneumatic **Handle Load**
> bladder that the barometer reads ([ADR-0010]). *Not acquired:* the **ToF Distance** tip
> sensor. Designed-not-built / not-acquired blocks are dashed below.
>
> The styled [`architecture.html`](./architecture.html) is the rendered companion to this
> file — keep the two in sync (edit here, regenerate there).

## 1. Two boards, one sensor ([ADR-0004])

```mermaid
flowchart TB
    subgraph NANO["🟢 Nano 33 BLE · Sensor Node — stick-mounted, always-on, real-time"]
        direction TB
        IMU["LSM9DS1 IMU<br/>accel + gyro · ~100–200 Hz<br/>(mag unused) · IN HAND"]
        BARO["LPS22HB barometer + air bladder<br/>= Handle Load (P = F/A)<br/>⛔ bladder NOT BUILT (ADR-0010)"]
        TOF["ToF tip sensor<br/>stick-cycle phase + proximity<br/>⛔ NOT ACQUIRED"]
        ACQ["Sensor Acquisition<br/>timestamped raw IMU + pressure streams"]
        LOOP["WSFC Feedback Loop «deep»<br/>rule-based + DSP — §2 (ADR-0011)<br/>per-step load vs target band → cue"]
        FB["Buzzer / Haptic<br/>over-lean cue · offline, immediate"]

        IMU --> ACQ
        BARO -.-> ACQ
        TOF -.-> ACQ
        ACQ --> LOOP --> FB
    end

    LOOP -->|"UART · per-step digests + in-band log<br/>(NOT raw samples)"| BRAIN
    TE -->|"current Weight Support Target band"| LOOP

    subgraph UNOQ["🟠 UNO Q · Compute Brain — Linux side, intelligence"]
        direction TB
        TE["Threshold Engine «deep»<br/>baseline → faded target → advance gate<br/>§2 (ADR-0009)"]
        BRAIN["Session / Dose + Recovery Metrics<br/>in-band-step % · symmetry · cadence"]
        WELL["Baseline & Drift «deep» (wellness app)<br/>learns User Baseline · scores Drift → Alert"]
        HS[("History Store<br/>on-device persistence")]

        BRAIN --> TE
        BRAIN <--> HS
        WELL <--> HS
    end

    BRAIN -->|"BLE/Wi-Fi · metrics + progress<br/>health data: device + phone only, NO cloud"| PHONE

    subgraph PHONE["🟣 Phone / Clinician"]
        direction LR
        PV["Patient view · Walk Buddies skin<br/>(live in-band display)"]
        CR["Clinician readout<br/>recovery progress · target schedule"]
    end

    classDef nano fill:#102019,stroke:#4fd1c5,stroke-width:1px,color:#e7ecf5;
    classDef uno fill:#241b0d,stroke:#f6ad55,stroke-width:1px,color:#e7ecf5;
    classDef phone fill:#1d1430,stroke:#b794f4,stroke-width:1px,color:#e7ecf5;
    classDef future fill:#161b29,stroke:#7c89a8,stroke-width:1px,stroke-dasharray:5 4,color:#9aa7c2;
    classDef store fill:#0f1626,stroke:#5b8def,color:#e7ecf5;

    class IMU,ACQ,LOOP,FB nano;
    class BARO,TOF future;
    class TE,BRAIN,WELL uno;
    class HS store;
    class PV,CR phone;
```

**Split rationale:** the **cue must be immediate and offline**, so the WSFC Feedback Loop
runs on the always-on Nano; the **Threshold Engine** (which only needs to update the target
band per session/week) runs on the UNO Q's Linux side alongside history and the wellness
intelligence. *Dev transport:* before the UART link exists, the Nano streams IMU over BLE to
a local hub → WebSocket → dashboard/Walk Buddies (`realtime/hub.py`, [ADR-0007]).

## 2. The WSFC real-time loop — rule-based + DSP ([ADR-0011])

The flagship loop is **rule-based + DSP, not ML.** It decomposes into three on-device modules
plus the per-session Threshold Engine. ML is a *deferred, named fallback for segmentation
only* — never in the cue decision, never classifying "abnormal"/"fall-risk".

```mermaid
flowchart TB
    subgraph NANOLOOP["🟢 Nano · per-step, real-time"]
        SEG["① Swing/Step Segmenter — RULE-BASED<br/>gyro threshold + refractory (extends CycleDetector)<br/>marks step boundaries + unloaded-swing window"]
        COND["② Load Conditioner — DSP<br/>session-start tare → 2nd-order polynomial cal →<br/>relative load (% of baseline) · EMA smoothing"]
        DEC["③ Cue Decider — THRESHOLD<br/>peak load per step vs target band<br/>Schmitt deadband + min on/off → beep/haptic"]
        SEG -->|step peak + tare window| COND --> DEC
    end

    subgraph UNOQLOOP["🟠 UNO Q · per session / per week"]
        TENG["④ Threshold Engine<br/>baseline = percentile of per-step-peak distribution<br/>(setup walk) · target faded −10%/wk (≈60%→30%)<br/>advance only at ≥80% in-band steps"]
    end

    TENG -->|"target band (% of own baseline)"| DEC
    DEC -->|"in-band-step % + peaks"| TENG

    classDef nano fill:#102019,stroke:#4fd1c5,stroke-width:1px,color:#e7ecf5;
    classDef uno fill:#241b0d,stroke:#f6ad55,stroke-width:1px,color:#e7ecf5;
    class SEG,COND,DEC nano;
    class TENG uno;
```

**Tare strategy ([ADR-0010], amended).** The WSFC application tares the barometer **once at
session start, after a brief grip/thermal equilibration**, with a clinician one-button
manual re-zero — *not* the per-swing auto-tare (that is rescoped to the long, unsupervised
wellness application). The Segmenter's swing detection is used for **step segmentation only**,
**decoupled from the load zero**, so a missed swing cannot inject a bad re-zero into a safety
cue. Because the target is a % of a baseline measured *in the same session after
equilibration*, slow common-mode drift largely cancels in the ratio.

**Claim-safety binds the loop ([ADR-0009]).** The target is always **% of the Patient's own
baseline cane-dependence — never %-body-weight, never an absolute-force claim**; kgf is
bench-calibration / optional clinician readout only. No diagnosis, no fall-risk.

## 3. Sensor → signal → metric

```mermaid
flowchart LR
    subgraph SIG["Signals"]
        PT["plant timestamps (IMU)"]
        TH["swing angle θ (gyro)"]
        ST["stillness 'planted' window (IMU)"]
        LD["per-step peak load (barometer)"]
    end

    PT --> CT["Cycle time<br/>t_plant[n]−t_plant[n−1]"]:::t1
    PT --> CAD["Cadence<br/>60 / cycle_time"]:::t1
    TH --> STR["Stride length<br/>L·sin(θ), ZUPT-bounded"]:::t2
    STR --> VEL["Gait velocity<br/>stride × cadence"]:::t2
    CAD --> VEL
    ST --> DF["Stick Duty Factor<br/>planted_dur / cycle_time"]:::t1
    LD --> HL["Handle Load (relative)<br/>% of own baseline"]:::t3
    LD --> WST["Weight Support Target compliance<br/>in-band-step % (WSFC)"]:::t3

    classDef t1 fill:#11281b,stroke:#68d391,color:#e7ecf5;
    classDef t2 fill:#2a1f0d,stroke:#f6ad55,color:#e7ecf5;
    classDef t3 fill:#221225,stroke:#b794f4,color:#e7ecf5;
```

**Tiers** ([`docs/FEATURES.md`] §2) — 🟢 Tier 1 reliable (temporal): cycle time, cadence,
Stick Duty Factor · 🟠 Tier 2 trend-only (spatial): stride length, velocity · 🟪 Tier 3
relative/per-user (loading): Handle Load, Weight Support Target compliance — **WSFC's headline
signals**, gated on the pneumatic build.

## 4. One Stick Cycle — what the sensors see

```mermaid
flowchart LR
    P["1 · PLANT<br/>angular rate → 0 + accel impact<br/>⇒ plant event · ZUPT reset · load rises"]
    L["2 · LOAD<br/>stick near-vertical · load peak<br/>⇒ Cue Decider samples peak"]
    U["3 · PUSH<br/>accel along shaft · rate rising"]
    S["4 · SWING<br/>cane unloaded (load≈0)<br/>gyro integrates arc θ"]

    P --> L --> U --> S -->|next footfall| P

    classDef phase fill:#141b30,stroke:#4fd1c5,color:#e7ecf5;
    class P,L,U,S phase;
```

The **LOAD** phase peak is where the Cue Decider makes its once-per-step in-band/out-of-band
decision; the **SWING** phase (cane in air, load ≈ 0) is the natural reference the wellness
app uses for per-swing re-zeroing (WSFC re-zeros once per session instead — §2).

## 5. Secondary applications (same hardware)

- **Wellness gait monitoring** ([ADR-0001], [ADR-0005]) — the UNO Q learns the User's
  **Baseline** and scores sustained **Drift** to raise a non-medical **Alert** (single
  anomaly ≠ Alert). Measure-and-trend only; uses the Tier 1/2 metrics, no real-time cue
  unless **Training Mode** is opted in ([ADR-0006]). Per-swing auto-tare lives here.
- **Speaking Stick** ([ADR-0003]) — orthogonal see-and-speak layer: camera → cloud VLM →
  TTS, plus an offline **Proximity Alert** (gated on the ToF). Not part of the WSFC story.

## 6. What Moon Walk cannot measure

No leg stance time (the handle is loaded, not the foot), no ground reaction force, no absolute
force / Newtons, no %-body-weight, no diagnosis, no fall-risk. These bind **all** applications
([`docs/FEATURES.md`] §"cannot measure", CONTEXT.md **Claim Safety**).

---

[ADR-0001]: ./adr/0001-measure-and-trend-not-diagnostic.md
[ADR-0003]: ./adr/0003-add-see-and-speak-assistive-layer.md
[ADR-0004]: ./adr/0004-two-board-uno-q-brain-nano-sensor-node.md
[ADR-0005]: ./adr/0005-wellness-positioning-and-claim-safety-vocabulary.md
[ADR-0006]: ./adr/0006-opt-in-training-mode-coaching-cue.md
[ADR-0007]: ./adr/0007-local-websocket-transport-for-dashboard-demo.md
[ADR-0009]: ./adr/0009-pivot-to-weight-support-feedback-cane.md
[ADR-0010]: ./adr/0010-pneumatic-barometer-handle-load.md
[ADR-0011]: ./adr/0011-wsfc-real-time-processing-rule-based-dsp.md
[`docs/FEATURES.md`]: ./FEATURES.md
