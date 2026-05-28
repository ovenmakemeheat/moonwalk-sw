# How to build the WSFC real-time Handle-Load biofeedback

A self-contained, offline real-time biofeedback loop on the Arduino Nano 33 BLE:
read **Handle Load** from the pneumatic bladder → onboard **LPS22HB barometer**,
compare each moment's load to the patient's own **Weight Support Target**, and cue
the patient (buzzer + status LED) the instant they **over-lean on the cane** (i.e.
over-protect the healing limb). This is the flagship **WSFC** application
(`CONTEXT.md`, ADR-0009/0010/0011/0013), built for **progressive optimal loading**
after a sprain / strain / lower-limb soft-tissue injury.

> **Claim safety (binding).** The target is a **% of the patient's own baseline**
> cane-dependence. This loop never knows or surfaces kgf / Newtons / %body-weight —
> `dP` (pressure above the session tare) is an internal *relative* signal only. No
> diagnosis, no fall-risk, no absolute force. See `CONTEXT.md` → Claim Safety.

Firmware: [`wsfc_load_feedback.ino`](./wsfc_load_feedback.ino).

---

## 1. What you're building

```
   patient leans on cane
          │
          ▼
   air bladder under grip  ──►  trapped-air pressure rises  ──►  LPS22HB barometer
          │                                                            │
          │                                                            ▼
          │                                            load = P − swing-phase baseline
          │                                                            │
          │                                  ┌── in-band ──►  GREEN LED + silence
          │                                  ▼
          └────────────────────  over Weight Support Target ──► RED LED + intermittent beep
```

Everything runs on the Nano. No BLE, no cloud, no laptop required at runtime
(the always-on Sensor Node design, ADR-0004) — so the cue is immediate and works
offline.

---

## 2. Bill of materials

| Part | Notes |
| --- | --- |
| **Arduino Nano 33 BLE** *(or BLE Sense)* | Must have an **LPS22HB** barometer. The stock Nano 33 BLE does **not** include one — only the **Sense** variant does, or add an **external LPS22HB module** on I²C. If `BARO.begin()` fails on boot, this is why. |
| **Pneumatic Handle Load bladder** | A soft sealed pad under the grip, coupled to the barometer port (ADR-0010). See §3 on the coupling medium. |
| **Passive piezo buzzer** | On `D9`. Must be **passive** (plays a tone via `tone()`); an active buzzer only does a fixed on/off pitch. |
| Onboard RGB LED | Already on the board (`LEDR`/`LEDG`/`LEDB`) — **no wiring**. Used as a status light only. |
| Hub power / battery | For untethered use. |

---

## 3. Build the pneumatic Handle-Load sensor (read this before sealing anything)

Using a MEMS barometer as a force sensor is **well-proven prior art** — the
Takktile project (Tenzer, Jentoft & Howe, *The Feel of MEMS Barometers*, IEEE
R&AM 2014) molded barometer chips in elastomer and got **<1% linearity (r²>0.99),
~16 ms step response, >100 Hz bandwidth, and no visible hysteresis** under force.
So the concept is sound.

**The coupling medium is the most important build decision.**

- **Incompressible filler (recommended).** Tenzer's key finding: trapped air
  behind the sensor port gives **low sensitivity** (surface force barely changes
  the air volume) and maximal temperature sensitivity. They vacuum-degassed so the
  **elastomer/gel fills the cavity** — that's the configuration that gave the <1%
  numbers above. Fluid-filled seat-occupant bladders (e.g. patent EP0885139A1) use
  liquid, not air, for the same reason. **If you can, use a gel/elastomer-filled
  pad coupling directly to the barometer port.** This removes the dominant
  temperature term *and* the slow-leak failure mode in one step.
- **Trapped air (our current approach).** Works, and is what's bench-validated in
  this repo (ADR-0010), but it is the weakest choice: trapped air obeys the ideal
  gas law (P ∝ T, so temperature directly fakes load), creeps, and slowly leaks.
  If you stay with air, **temperature compensation and frequent re-zeroing are
  mandatory, not optional** (see §6).

**Size the bladder area `A`** so the hardest expected lean keeps pressure below
the LPS22HB ceiling (**1260 hPa**); aim to stay under ~1100–1200 hPa to leave
headroom and avoid saturation.

---

## 4. Wiring

| Signal | Pin | Notes |
| --- | --- | --- |
| Passive piezo buzzer (+) | **D9** | other leg → **GND**. `BUZZER_PIN` in the sketch. |
| LPS22HB | I²C (onboard) | already wired on a Sense board; external module → `A4`/`A5` (SDA/SCL) + 3V3 + GND. |
| Status LED | onboard RGB | no wiring (`LEDR`/`LEDG`/`LEDB`, active-LOW). |

---

## 5. Flash the firmware

1. **Boards Manager** → install **"Arduino Mbed OS Nano Boards"** (the Nano 33 BLE
   core). Select **Tools → Board → Arduino Nano 33 BLE**.
2. **Library Manager** → install **`Arduino_LPS22HB`**.
3. Open `wsfc_load_feedback/wsfc_load_feedback.ino` and **Upload**.
4. Open **Serial Monitor @ 115200**.

Off-board you cannot compile without the mbed core + library (this repo's CI has
only the AVR core installed). `arduino-cli` build, once the core is installed:

```bash
arduino-cli core install arduino:mbed_nano
arduino-cli lib install Arduino_LPS22HB
arduino-cli compile --fqbn arduino:mbed_nano:nano33ble arduino_nano_33/wsfc_load_feedback
```

---

## 6. Use it — the three-phase session

The supervised WSFC tare cadence is **once per session** (ADR-0010).

1. **TARE** — blinks **blue** ~2 s. Hold the cane **in the air** (zero load); it
   averages pressure → `P_tare`.
2. **CALIBRATE** — solid **cyan** ~8 s. **Lean on the cane as you normally would**;
   it captures the **peak load → baseline lean** (the patient's own baseline
   cane-dependence). Too-low → it flashes red and retries (bladder not loaded?).
3. **RUN** — **green + silent** while loading the leg correctly; **red +
   intermittent 900 Hz beep** the instant the load crosses the Weight Support
   Target ceiling.

**Serial controls** (bench / demo):

| Key | Action |
| --- | --- |
| `t` | re-tare |
| `c` | re-calibrate baseline |
| `1`–`4` | set recovery week → target = 60 / 50 / 40 / 30 % of baseline (the fade schedule; supports the "show the target fading" demo) |
| `?` | print status (`P_tare`, baseline, week, target, live load) |

---

## 7. The signal pipeline — why it's built this way (and the one risk that matters)

### ⚠ The #1 reliability risk: an absolute barometer measures weather and altitude

The LPS22HB is an **absolute** pressure sensor. Real-world confounds that inject a
**phantom load larger than a real lean** if you ever compare against an absolute
reference:

- **Altitude**: ~12 Pa per metre → a flight of stairs or an elevator shifts the
  reading more than a firm lean.
- **Weather**: a passing front moves ambient pressure ±20–30 hPa over hours.
- **Temperature** (trapped air): P ∝ T directly fakes load.
- **Bladder creep / slow leak**: a soft sealed bladder drifts over minutes.

**Mitigation (the core design rule): never use absolute pressure. Measure load
*differentially* against a continuously-tracked baseline.** Anchor that baseline to
the **swing phase** — when the cane is in the air it carries ~zero load, so each
Stick Cycle re-establishes the zero. This single move rejects weather, stairs,
temperature drift, creep, and leaks at once (the gauge-vs-absolute principle).

### What the firmware does today (V1) vs what to add (V2)

| | V1 — current sketch | V2 — recommended hardening for real gait |
| --- | --- | --- |
| Zero reference | **session-start tare** (one `P_tare`) | **swing-phase auto-tare**: track an EWMA/median of the *minimum* (swing) pressure over ~5–10 s; `load = P − baseline`. Re-anchor every swing. |
| Temp comp | none | linear correction from the LPS22HB temp channel (Tenzer showed linear suffices); calibrate the slope on the bench across ~18–30 °C. |
| Sensor config | default | set **ODR 75 Hz** (the LPS22HB max) + on-chip **LPF = ODR/9** (~8 Hz effective — fine for 1–2 Hz gait). |
| Per-step sampling | continuous threshold on instantaneous load | smooth ~5 samples (~65 ms), detect plant on rising edge over baseline, take **one peak per Stick Cycle**, **refractory 300–400 ms** to avoid double-counting. |
| Over-lean decision | Schmitt deadband + min-on/off (already present) | + require **≥2 consecutive samples (~30 ms)** above ceiling before firing. |

V1 is adequate for a **short, supervised, indoor WSFC session** (no stairs, stable
temperature) — which is exactly the ADR-0010 supervised use case. **Add V2 before
any unsupervised or longer wear**, where weather/altitude/creep will otherwise
corrupt the reading.

### Latency budget

Motor biofeedback does **not** need sub-100 ms latency; a cue within **one step
(~100–200 ms of the load peak)** is well inside the useful range (PWB
biofeedback literature, §10). The on-Nano loop is far faster than this.

---

## 8. Tuning reference (sketch constants ↔ evidence)

| Constant | Value | Basis |
| --- | --- | --- |
| `OVER_TONE_HZ` | 900 Hz | low band; presbycusis hits high frequencies first; IEC 60601-1-8 alarm band ~150–1000 Hz. |
| `BEEP_ON_MS` / `BEEP_OFF_MS` | 150 / 150 | **intermittent**, threshold-gated (silence = compliant) to avoid alarm fatigue (ADR-0011). |
| `HYST_FRAC` | 0.10 | Schmitt deadband 5–10 % of the ceiling to stop chatter on a hovering load. |
| `MIN_CUE_ON_MS` / `MIN_CUE_OFF_MS` | 300 / 200 | anti-chatter min-on/off (ADR-0011). |
| `WEEK_TARGET_FRAC` | 0.60 / 0.50 / 0.40 / 0.30 | the fade schedule, same fractions as `ml_pipeline/wsfc_loading_metrics.py`. |
| `TARE_MS` / `CAL_MS` | 2000 / 8000 | session tare + baseline-lean capture windows. |

**Threshold philosophy:** set the ceiling as a **percentile of the patient's own
learned baseline** (e.g. ~85th percentile of comfortable-walk peaks), **not** a
fixed value — both because gait varies and because it keeps the device claim-safe
(relative to the patient, never %BW).

---

## 9. Calibrate & validate

**Bench**

- Confirm tare is stable and `dP` rises monotonically with applied load.
- **Characterise hysteresis at gait-realistic loading *rates*.** A cane *plant* is
  much faster than a hand *squeeze*, and for air-coupled bladders **hysteresis
  grows with loading rate** (Chinimilli et al. 2016, shoe air-bladder GCF). The
  repo's existing validation used slow manual squeezes only — do not assume it
  transfers to fast plants.
- Sweep temperature ~18–30 °C and record the drift (sizes your temp correction).

**In gait**

- Walk and confirm one clean peak per Stick Cycle; tune smoothing / refractory.
- Deliberately over-lean → cue fires within a step; load correctly → silence.
- Go up/down stairs to **prove the swing-phase baseline rejects the altitude
  shift** (V2). If V1 false-fires on stairs, that's the absolute-pressure confound
  — it's why V2 exists.

---

## 10. Evidence & further reading

- **Auditory load feedback on a walking aid raises compliance.** Tamburella et
  al., *Load Auditory Feedback Boosts Crutch Usage…*, Front. Neurol. 2021 — +19.7 %
  compliance, no speed loss, not distracting.
  https://www.frontiersin.org/articles/10.3389/fneur.2021.700472/full
- **Barometer-as-force sensor.** Tenzer, Jentoft & Howe, *The Feel of MEMS
  Barometers*, IEEE R&AM 2014.
  https://dash.harvard.edu/bitstreams/7312037d-5579-6bd4-e053-0100007fdf3b/download
- **Air-bladder GCF + rate-dependent hysteresis.** Chinimilli et al.,
  *Hysteresis Compensation for Ground Contact Force… Shoe-Embedded Air Pressure
  Sensors*, IEEE 2016. https://www.researchgate.net/publication/313786747
- **PWB biofeedback (threshold + real-time cue).** *Real-time audio-visual
  biofeedback improves PWB compliance*, IJSPT 2023.
  https://ijspt.scholasticahq.com/article/129259 · JOSPT 2016 device validity
  https://www.jospt.org/doi/10.2519/jospt.2016.6625
- **Sensor datasheet.** ST LPS22HB (ODR ≤ 75 Hz, on-chip LPF).
  https://www.st.com/resource/en/datasheet/lps22hb.pdf
- **Presbycusis / alarm band.** IEC 60601-1-8 medical-alarm guidance.
  https://www.digikey.com/en/articles/iec-60601-1-8-guidance-for-designing-medical-equipment-alarms
- Project decisions: ADR-0009 (WSFC), ADR-0010 (pneumatic barometer load),
  ADR-0011 (rule-based DSP real-time cue), ADR-0013 (sprain/strain refocus);
  `CONTEXT.md` (vocabulary + claim safety).

> **Gaps (validate yourself).** No published **cane-handle air-bladder load
> sensor** exists — this device is novel; the guidance above is transferred from
> crutch/shoe/tactile prior art. The biggest unknowns to close on your own bench:
> (a) hysteresis at fast cane-plant loading rates, and (b) grip/placement
> sensitivity variation (Tenzer saw up to ~11.5 %), which is the other reason the
> threshold is baseline-relative, not absolute.
