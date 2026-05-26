# Cane and walker use different sensing models, not one shared model

Moon Walk supports two **Host Aid** types via two distinct sensing models, selected
per setup — not a single model with a configuration toggle.

- **Cane Mode** (single swinging stick): distance/stride from the **Pendulum Model**
  (gyroscope rotation × stick length), with **Handle Load** (FSR) detecting each
  stick-plant to apply a zero-velocity reset (ZUPT) that bounds integration drift.
- **Walker Mode** (wheeled rollator): the pendulum is invalid (it rolls, doesn't
  swing), so distance comes from **wheel-encoder odometry** (literature ~0.15% error,
  robust indoors). Limp is measured directly as **left-vs-right grip-load asymmetry**
  from dual grips — an asymmetry signal a single cane physically cannot provide.

**Why.** The two host types obey different physics. A cane is a pendulum pivoting
about its tip; a rollator is a rolling vehicle pushed with two continuously-loaded
hands. Forcing both through one model would make at least one wrong. Each mode uses
the sensing that fits its mechanics — and each has a *different* strength (the cane's
pendulum geometry; the walker's direct left/right asymmetry).

**Considered and rejected.** A single shared model with a "mode" flag — rejected
because no common model yields valid distance for both. Supporting only one host type
— rejected because target patients use both.

**Consequences.** ~2× the integration and validation work, and Walker Mode needs
hardware (wheel encoder, dual-grip FSRs) the cane build does not. Accepted
deliberately.

**Hardware status (2026-05): Cane Mode runs IMU-only for now.** The only sensor in
hand is the Arduino Nano 33 BLE's onboard LSM9DS1 IMU; the **Handle Load** FSR is
designed but not yet acquired. Until it is, the stick-plant / ZUPT reset is detected
from **IMU stillness** (angular rate ≈ 0 + accel impact) instead of the FSR load edge,
and the **Stick Duty Factor** / stance-time proxy is the IMU-inferred *planted fraction*
rather than a force-measured loaded fraction — a notch less robust at the plant/lift
edges, and unable to tell a weight-bearing plant from a light touch. The Pendulum Model
itself (gyro × stick length) is unaffected. Adding the FSR is a cheap upgrade that
restores the load-anchored ZUPT and the force-based loading metrics. Walker Mode is
blocked until its wheel-encoder + dual-grip FSRs are acquired. See `docs/architecture.html`.
