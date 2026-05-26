# Add an opt-in Training Mode with real-time Coaching Cues

Moon Walk gains an **opt-in Training Mode**: while the User deliberately turns it on,
the device gives real-time **Coaching Cues** (haptic / audio / on-screen) toward a
steady-rhythm / even-loading target defined by the User's *own* **Baseline**. This
**extends** the measure-and-trend scope of [ADR-0001] — which by itself only records
and trends, raising an **Alert** solely on *sustained* Drift (US-26) — to also act
*in the moment*. We accept this because in-the-moment coaching is the headline demo
value of the dashboard's `sense → classify → cue → action` loop, and because framed
correctly it stays inside wellness (compare commodity running-cadence coaches and
posture trainers), not medicine.

**Why it does not break [ADR-0001] / [ADR-0005].** The Coaching Cue is wellness
coaching, not gait correction. It is kept legal-safe by four hard constraints:
1. **Opt-in only** — off by default; the User starts a Training Mode walk deliberately.
   Always-on in-the-moment judgment remains forbidden (that role is the sustained-Drift
   **Alert**, which by US-26 waits for sustained departure, not a single walk).
2. **Coaches toward the User's own Baseline target**, never against a population norm.
3. **Never names a condition** — no "limping", "uneven", "abnormal", no clinical or
   causal claim (the [ADR-0005] vocabulary still binds).
4. **Carries its own (third) disclaimer** on entering Training Mode — "wellness coaching
   toward your own rhythm, not physiotherapy, gait correction, or medical treatment" —
   distinct from the MEDICAL CLAIM SAFETY (Alert) and Speaking Stick assistive-safety
   disclaimers, which it never substitutes for.

## Status

accepted — amends [ADR-0001] (does not supersede it; trend-only remains the default
posture, Training Mode is a scoped, opt-in addition).

## Considered Options

- **Always-on corrective cue** — fire on every walk when gait deviates. Rejected: this
  *is* in-the-moment judgment on a single walk, colliding head-on with US-26, and reads
  as continuous medical monitoring.
- **No live gait cue at all** — keep only the offline Proximity Alert (obstacles). The
  conservative option; rejected because it drops the demo's coaching value, which the
  User explicitly wanted.
- **Opt-in Training Mode (chosen)** — the narrowest framing that still delivers live
  coaching while staying defensibly inside wellness.

## Consequences

- A new glossary concept (**Training Mode**, **Coaching Cue**) and a **third**
  disclaimer enter the claim-safety surface; UI copy review now covers three failure
  modes, not two.
- The companion app needs a distinct Training Mode entry/exit flow and live-cue UI,
  separate from ordinary daily-use recording (US-6) and from the trend/Alert view.
- The real-time cue path joins the existing offline Proximity Alert on the Sensor
  Node's tactile channel; the two must be distinguishable to the User.
