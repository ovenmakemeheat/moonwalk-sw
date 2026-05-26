# Moon Walk — *WHOOP for your walking aid.*

**Live demo → https://moonwalkerscamper.netlify.app** · Wellness, not medicine (does not diagnose, treat, or predict).

A clip-on sensor that turns the cane or walker someone **already uses** into a gait
instrument. Like a WHOOP for the way you walk, it does two things: it **tracks** how you
normally walk and notices when that changes, and it **coaches** your rhythm in real time
when you ask it to.

### The problem
Millions walk with a cane or rollator because of a condition that changes over time —
stroke recovery, Parkinson's, ageing, post-surgery rehab. **Nobody is watching the
trend.** Subtle decline creeps in unnoticed; rehab progress goes uncelebrated; and by the
next clinic visit nobody remembers how the walking changed. People have no objective,
continuous picture of their own gait.

### The solution — two pillars
- **Track — know your normal, notice the change.** Moon Walk clips onto the **Host Aid**,
  continuously measures **Gait** (cadence, rhythm, loading, symmetry, stride trends),
  learns that person's normal **Baseline** *on-device*, and watches for sustained
  **Drift**. When walking meaningfully changes it raises a gentle wellness **Alert** —
  *"your walking has changed; you may want to mention it to your doctor."* Awareness, not
  a diagnosis.
- **Coach — improve your rhythm in the moment.** Opt into **Training Mode** for real-time
  **Coaching Cues** — biofeedback by **voice, vibration, or LED** — guiding you toward
  *your own* target rhythm, like a running-cadence coach. Coaching, not correction:
  opt-in, never names a condition, *not* therapy.

### The live demo (multi-user, real-time)
Guests each walk a short course wearing a Nano 33 BLE. The IMU streams over **BLE → a
local hub → the dashboard** (gait data stays local, never the cloud), which plots
**every walker live and side by side**: a real-time signal trace, a live **cadence
comparison**, and a leaderboard — then **Training Mode** coaches a chosen walker with
voice/vibration/LED. Try the dashboard: **https://moonwalkerscamper.netlify.app**

### Why it's different
The 2014 "Smart Walker" *replaced* the aid and streamed raw video to the cloud to
navigate. Moon Walk **instruments the aid you own**, keeps the **intelligence and health
data on-device**, and makes an **honest wellness claim** — no overclaim. Gait sensors on a
walking aid track *change* reliably (temporal metrics ICC 0.72–0.97), so we lead with
temporal numbers and show stride/velocity only as **relative trends**, never clinical
absolutes.

### Honest scope
- Not a medical device — no diagnosis, treatment, disease/fall-risk prediction; a clinician,
  never the device, interprets data.
- **Hardware in hand is IMU-only** (LSM9DS1): all six gait metrics derive from the IMU;
  loading/asymmetry (force sensor) and the **Speaking Stick** see-and-speak layer are on the
  roadmap, not in this build.
- Health data stays on the device and laptop; nothing is sent to the cloud.

**In one line:** *Moon Walk — WHOOP for your walking aid: clip it onto the cane or walker
you already use, and it tracks your normal, tells you when your walking changes, and
coaches your rhythm in real time — all without sending your health to the cloud.*
