# Moon Walk: The Three Headline Metrics of the Weight Support Feedback Cane

Moon Walk is a small sensor module that clips onto an ordinary walking stick — the cane the patient already owns, which we call the **Host Aid**. It does not replace the cane; it instruments it, turning it into a **Weight Support Feedback Cane (WSFC)**. The WSFC is built for people recovering from a **sprain, strain, or other lower-limb soft-tissue injury** who are temporarily leaning on a cane while a hurt limb heals. Modern soft-tissue rehabilitation no longer prescribes pure rest; it prescribes **progressive optimal loading** — feeding the healing tissue a controlled, steadily increasing dose of weight, because mechanical load is itself a healing stimulus. Lean too much and the limb is over-protected, stiffening and deconditioning; lean too little and you risk re-injury. The WSFC keeps the patient inside the clinician-prescribed loading progression so they recover faster and more safely.

Everything the device knows comes from two sensor streams: a six-axis **IMU** (gyroscope plus accelerometer) and a single **barometer** reading the air pressure inside a soft sealed bladder under the grip — the pneumatic measure we call **Handle Load**. From those two streams come three read-outs we treat as the **co-equal headline metrics**, presented together with no ranking: each answers a different question, and together they tell the recovery story.

## Metric 1 — Symmetry and Rhythm (the limp signal)

The first metric measures the limp itself. Its headline form is **cane-mode temporal step-time symmetry**, computed from the **IMU only**, live in the product today on the strongest evidence of the three.

When someone limps, the cane's plant-to-plant intervals fall into an alternating long-short pattern — a longer pause when weight rests on the painful side, a shorter one on the sound side. Splitting those intervals by side gives a per-side step time, and dividing the shorter by the longer yields a **symmetry ratio** between zero and one: `SR = min(t_affected, t_unaffected) / max(t_affected, t_unaffected)`. A score of 1.0 means even steps and no limp; lower means a larger limp, and the min-over-max form means the device never needs to decide which leg is worse. Alongside it we measure **rhythm consistency** — how steady the cadence is, step to step — as one minus the coefficient of variation of step time (`consistency = 1 − CV`). The two combine into one score, `100 · (0.6·SR + 0.4·consistency)`.

Uneven, unsteady gait is the hallmark of a guarded, antalgic limp, and symmetry is a recognised rehabilitation outcome that responds to treatment. As a sprain heals, consistency often returns first as the patient stops guarding, and symmetry follows as the limb is fully reloaded — so a rising score directly signals the limp shrinking. The evidence sits on lower-limb soft-tissue injury: gait symmetry and walking speed track recovery after lower-extremity trauma (Archer KR, Castillo RC, MacKenzie EJ, Bosse MJ, *Physical Therapy* 2006;86(12):1630–1640, DOI 10.2522/ptj.20060035), and symmetry recovers after ankle sprain (Ben Moussa Zouita A, et al., *J Sci Med Central — Sports Medicine*, 2016 — a low-tier journal, verify before external use). The symmetry-ratio method itself is the standardised, recovery-responsive approach established by Patterson and colleagues in 2010.

One restraint: a future walker-mode route could read the limp as left-versus-right grip-load asymmetry from a rollator's dual grips. That is a **secondary, future** path only; cane-mode temporal symmetry is and remains the headline limp signal.

## Metric 2 — Stick Duty Factor

The second metric is the **Stick Duty Factor**: the fraction of each **Stick Cycle** (one plant-to-plant period of the cane) during which the cane is actually loaded. It is a force-free read on *how long*, within every step, the patient leans on the cane.

It comes from the IMU alone. When the cane is planted it goes nearly still — angular-rate magnitude and acceleration variance both drop low — so the device measures that stillness window and divides it by the cycle time: `duty_factor = planted_duration / cycle_time`. The Handle Load barometer, now built and validated, sharpens the exact plant and lift edges by confirming when the cane is genuinely loaded, but the metric itself needs only the IMU and is live today.

Duty factor is an honest stand-in for how dependent the patient is on the cane within each step, available even before any force sensing. A duty factor that **trends downward** over weeks means the patient spends less of each cycle leaning on the cane — needing it less — which is what recovery looks like. It is not leg stance time: Moon Walk instruments the stick, not the foot, so it describes the cane's loaded interval, not the limb's stance. Its validity rests on the same single-IMU gait-sensing basis that supports cadence.

## Metric 3 — Session Weight-Support Training Load

The third metric is the **Session Weight-Support Training Load**: a single per-session figure for how much *quality* retraining the patient banked that day — the engagement and dose number, an intensity-times-volume measure of loading quality structured like the session-load constructs used in sports science.

It draws on both streams. The barometer supplies the relative **Handle Load** per step — pressure under the grip, tared at session start, mapped through a fitted second-order polynomial, and expressed as a percentage of the patient's **own** baseline cane-dependence. The IMU supplies step count and duration. For each step at or below the prescribed lean ceiling, the device credits how much *gentler than baseline* the patient was, `lean_reduction = max(0, 1 − load%/100)`; steps over the ceiling score zero. Summing gives a raw dose, `raw = Σ lean_reduction · in_band_factor`, squashed onto a personalised 0–100 scale with a logarithmic curve so early gains come easily and later ones take more effort: `score = 100 · log(1 + raw) / log(1 + raw_max)`.

Progressive optimal loading is a *dose* — recovery depends on accumulating the right amount of controlled, in-band loading over time, not on any single perfect step. The Session Training Load turns that dose into one encouraging figure that drives the companion engagement layer and gives the clinician a record of how much quality practice happened. Its structure borrows from validated training-load science: the session-RPE / session-load construct (Haddad M, Stylianides G, Djaoui L, Dellal A, Chamari K, *Frontiers in Neuroscience* 2017;11:612, DOI 10.3389/fnins.2017.00612) and the training-impulse (TRIMP) tradition (García-Ramos 2015). It is a personal effort figure — explicitly **not** a claim of physiological equivalence to any proprietary "strain" score, and not a clinical grade.

## How the three fit the recovery story

The three metrics are complementary. Symmetry and Rhythm say *how big the limp is*. Stick Duty Factor says *how long, per step, the cane is leaned on*. Session Training Load says *how much good loading work was banked today*. None outranks the others; read together they describe a patient progressively reloading a healing limb at the clinician's pace — the mechanism behind a quicker, safer return to full weight-bearing. The principle underneath is optimal loading, the "OL" in the modern **POLICE** protocol that replaced rest-only PRICE for soft-tissue injury (Bleakley 2012). Weight-bearing-from-cane-sensors work (Ballesteros 2019) confirms a cane-mounted sensor can read loading meaningfully in the first place.

## Claim safety (binding)

These rules bind every metric and every word of any video generated from this document.

Every figure is **relative to the patient's own baseline** — their own measured starting point, never a population norm. The device must **never** state a diagnosis, claim to treat disease, mention **fall risk** or "likely to fall," report a **percentage of body weight**, an **absolute force**, or **Newtons**, nor make any population-norm comparison. Step-timing variability is surfaced only as "consistency" or "steadiness," never as fall risk. Force in kilograms-force exists only for bench calibration and an optional clinician readout — never as a displayed number.

Within those shared bans, the WSFC — and only the WSFC — may address a **Patient** under a prescribing **Clinician**, give real-time corrective feedback, and state a therapeutic intent of **faster recovery through progressive optimal loading**. That is the one allowance; the bans hold without exception.

## Glossary

- **Moon Walk** — the clip-on sensor box itself, not the cane.
- **Host Aid** — the ordinary cane or walker Moon Walk clips onto.
- **WSFC (Weight Support Feedback Cane)** — the flagship application: a real-time weight-support biofeedback loop guiding a sprain/strain patient through progressive optimal loading.
- **Stick Cycle** — one plant-to-plant period of the cane; the metrics' timing unit. A proxy for the gait cycle, not identical to it.
- **Handle Load** — force through the grip, sensed pneumatically by bladder-and-barometer, expressed only as a relative trend against the patient's own baseline.
- **Baseline** — the patient's own measured starting gait and cane-dependence; everything is read relative to this.
- **Weight Support Target** — the per-patient cane-load ceiling, a percentage of the patient's own baseline, faded as the injury heals; never a percentage of body weight.
- **Patient** — the person recovering from a lower-limb soft-tissue injury, using the WSFC under a clinician (WSFC context only).
- **Clinician** — the professional who prescribes the target, fade schedule, and dose, and reads recovery progress.
