# Moon Walk — Gait-Sensing Architecture (IMU-only build)

> **Current build = IMU-only.** The only sensor in hand is the Arduino Nano 33 BLE's
> onboard **LSM9DS1 IMU**. The designed multi-FSR **Handle Load** grip and the **ToF**
> tip sensor (CONTEXT.md / ADR-0002) are *not yet acquired* (shown dashed below).
> All six metrics derive from the IMU alone; FSR & ToF are optional upgrades.
> See the styled version in [`architecture.html`](./architecture.html).

## 1. System pipeline — sensor → metrics → app

```mermaid
flowchart TB
    subgraph NANO["🟢 Nano 33 BLE · Sensor Node (stick-mounted, real-time)"]
        direction TB
        IMU["LSM9DS1 IMU<br/>accel + gyro · ~100–200 Hz<br/>(mag unused) · only sensor in hand"]
        FSR["Grip FSR(s)<br/>Handle Load · analog ADC<br/>⛔ NOT IN HAND"]
        TOF["ToF tip sensor<br/>ground-contact + proximity<br/>⛔ NOT IN HAND"]
        ACQ["Sensor Acquisition<br/>one timestamped raw IMU stream"]
        SCD["Stick Cycle Detector «deep»<br/>plant/swing events from angular-rate + impact<br/>cycle boundaries · swing angle θ · IMU-stillness ZUPT"]
        LG["Look Gesture «deep»<br/>shares IMU stream"]

        IMU --> ACQ
        FSR -.-> ACQ
        TOF -.-> ACQ
        ACQ --> SCD
        ACQ --> LG
    end

    SCD -->|"UART · per-cycle digests only<br/>(events · metrics · triggers) — NOT raw samples"| GME

    subgraph UNOQ["🟠 UNO Q · Compute Brain (Linux side, intelligence)"]
        direction TB
        GME["Gait Metric Engine «deep»<br/>TEMPORAL: cycle time, cadence,<br/>duty factor, planted-duration proxy"]
        DE["Distance Estimator «deep»<br/>SPATIAL (mode-aware): Pendulum + ZUPT<br/>stride → velocity"]
        BDM["Baseline & Drift Model «deep»<br/>learns per-user Baseline · scores sustained Drift<br/>raises Alert (single anomaly ≠ Alert)"]
        HS[("History Store<br/>on-device persistence")]

        DE -->|stride feeds velocity| GME
        GME --> BDM
        DE --> BDM
        BDM <--> HS
    end

    BDM -->|"BLE 5.0 · metrics + Alerts (w/ disclaimer)<br/>health data: device + phone only, NO cloud"| PHONE

    subgraph PHONE["🟣 Phone · Companion App"]
        direction LR
        TV["Activity / Trend View"]
        AL["Wellness Alerts<br/>inline MEDICAL CLAIM SAFETY disclaimer"]
        EX["Trend-Report Export<br/>user-initiated · for the doctor"]
    end

    classDef nano fill:#102019,stroke:#4fd1c5,stroke-width:1px,color:#e7ecf5;
    classDef uno fill:#241b0d,stroke:#f6ad55,stroke-width:1px,color:#e7ecf5;
    classDef phone fill:#1d1430,stroke:#b794f4,stroke-width:1px,color:#e7ecf5;
    classDef future fill:#161b29,stroke:#7c89a8,stroke-width:1px,stroke-dasharray:5 4,color:#9aa7c2;
    classDef store fill:#0f1626,stroke:#5b8def,color:#e7ecf5;

    class IMU,ACQ,SCD,LG nano;
    class FSR,TOF future;
    class GME,DE,BDM uno;
    class HS store;
    class TV,AL,EX phone;
```

## 2. One Stick Cycle — what the IMU sees (no force sensor)

```mermaid
flowchart LR
    P["1 · PLANT<br/>angular rate → 0<br/>+ accel impact spike<br/>⇒ plant event & ZUPT reset"]
    L["2 · LOAD<br/>stick near-vertical<br/>low angular rate<br/>(inferred 'planted')"]
    U["3 · PUSH<br/>accel along shaft<br/>angular rate rising"]
    S["4 · SWING<br/>gyro integrates<br/>swing arc θ<br/>high angular rate"]

    P --> L --> U --> S -->|next footfall| P

    classDef phase fill:#141b30,stroke:#4fd1c5,color:#e7ecf5;
    class P,L,U,S phase;
```

## 3. The six metrics — module, signal, formula, tier

```mermaid
flowchart LR
    subgraph SIG["IMU signals"]
        PT["plant timestamps"]
        TH["swing angle θ"]
        ST["stillness 'planted' window"]
    end

    PT --> CT["Gait cycle time<br/>t_plant[n] − t_plant[n−1]"]:::t1
    PT --> CAD["Cadence<br/>60 / cycle_time"]:::t1
    TH --> STR["Stride length<br/>L · sin(θ), ZUPT-bounded"]:::t2
    STR --> VEL["Gait velocity<br/>stride × cadence"]:::t2
    CAD --> VEL
    ST --> DF["Duty factor<br/>planted_dur / cycle_time"]:::t3
    ST --> STN["Stance time<br/>planted_duration"]:::t3
    CT --> DF

    classDef t1 fill:#11281b,stroke:#68d391,color:#e7ecf5;
    classDef t2 fill:#2a1f0d,stroke:#f6ad55,color:#e7ecf5;
    classDef t3 fill:#1a1f2c,stroke:#7c89a8,stroke-dasharray:4 3,color:#cdd6ea;
```

**Tiers** — 🟢 absolute (Tier 1): cycle time, cadence · 🟠 trend-only (Tier 2): stride length, velocity · ⚪ IMU-inferred (would become Tier 1 with an FSR): duty factor, stance time.
