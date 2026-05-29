# Further Implementation Plan: Agentic Rehabilitation Coach

## Direction #2: Universal Device Foundation Model

This plan expands Moon Walk beyond hand-written gait detection for a single assistive device. The long-term goal is a universal movement representation layer that can understand cane, walker, crutch, rollator, and future mobility-aid signals without needing a separate brittle detector for each device.

The strongest research direction is:

1. Learn movement representations with self-supervised learning.
2. Personalize the model to each user's normal walking.
3. Detect meaningful deviation from that user's own history.
4. Build a mobility digital twin as a compact latent profile.
5. Let an agentic coach explain changes, ask for context, and guide setup or rest decisions without making clinical claims.

The important shift is:

- Avoid: "classify disease" or "detect gait disorder".
- Prefer: "learn this user's normal assisted-walking pattern and flag when today is different from normal."

This keeps the product aligned with Moon Walk's existing safety boundary: self-referenced, label-light, and not population-normative.

---

## 1. Problem Definition

### Device Heterogeneity

Different assistive devices produce different sensor patterns even when the user is performing the same broad activity.

| Device | Signal characteristics | Why rule-based detection becomes hard |
|---|---|---|
| Cane | Clear plant/swing cycles, strong periodic impacts, one-sided support pattern | Good for plant detection, but sensitive to mounting angle and user technique |
| Walker | Longer contact periods, rolling or lifting modes, less obvious swing phase | "Plant" may not exist as a sharp event; movement can be continuous |
| Crutch | Strong impacts, possible paired crutch patterns, upper-body load variation | Patterns differ between single crutch, two crutches, and user-specific rhythm |
| Rollator | Smooth rolling, braking, turning, pauses, handle vibration | Gait cycle may be weakly visible in device IMU; events may reflect wheel/handle dynamics |

Trying to build one detector per device creates maintenance and validation burden. A better approach is to learn an equipment-agnostic representation of movement windows, then adapt downstream scoring to the user's own baseline.

### Product Problem

The app should answer:

- "Is today's walking like this user's usual walking?"
- "Which movement dimensions changed?"
- "Is the change likely device/setup/data-quality related?"
- "Should the coach recommend rest, recalibration, reconnecting hardware, or continuing?"

It should not answer:

- "What disease does the user have?"
- "Is the user at fall risk?"
- "Is this normal compared with the population?"
- "How impaired is this user clinically?"

---

## 2. Proposed System

### High-Level Architecture

```text
Raw device stream
  |
  v
Device-normalized windowing
  |
  v
Self-supervised encoder
  |
  v
128-dimensional mobility embedding
  |
  +--> Personal baseline model
  |
  +--> Personalized anomaly detector
  |
  +--> Mobility digital twin profile
  |
  +--> Agentic rehabilitation coach
```

### Core Idea

Instead of detecting a fixed gait event first, the model learns a reusable latent representation of movement windows.

Example:

```text
5 seconds of cane IMU + pressure
5 seconds of walker IMU
5 seconds of rollator IMU
5 seconds of crutch IMU
        |
        v
shared encoder
        |
        v
movement embedding
```

The embedding should preserve useful movement properties:

- rhythm
- regularity
- intensity
- smoothness
- pauses
- impacts
- load/use pattern when pressure exists
- device handling style
- setup/mounting drift
- user-specific walking signature

---

## 3. Research Track A: Self-Supervised Movement Representation

### Goal

Train a model that learns device-robust movement embeddings from unlabeled time-series data.

### Input Data

Minimum input:

- timestamp
- accelerometer x/y/z
- gyroscope x/y/z
- device type
- equipment profile
- mount position metadata

Optional input:

- barometric pressure
- battery / RSSI / packet quality
- session phase labels from app state, such as setup walk, active walk, pause, review
- coarse user context notes, such as "indoors", "after therapy", "tired"

### Windowing

Recommended initial window design:

- Window length: `5 seconds`
- Stride: `1 second`
- Resample target: `50 Hz`
- Samples per window: `250`
- Channels: `6 IMU channels`, optionally `1 pressure channel`
- Missing pressure channel: mask it rather than forcing zeros to mean no pressure

The existing app already displays `20Hz` live payload behavior, but representation training should support resampling to a consistent internal rate. Start with `50Hz` because it balances data volume and motion fidelity.

### Preprocessing

- Resample by timestamp.
- Clip extreme sensor spikes.
- Normalize per session and per device profile.
- Rotate-invariant features should be considered, because users mount modules differently.
- Keep raw axes too; do not destroy device-specific signal that may be useful.
- Include masks for missing channels.
- Include device type as metadata, but train the encoder not to overfit to it.

### SSL Training Tasks

Candidate self-supervised tasks:

| SSL task | Description | Feasibility | Notes |
|---|---|---:|---|
| Masked time-series reconstruction | Randomly mask segments/channels and reconstruct them | High | Best first foundation-model task; easy to evaluate |
| Future window prediction | Predict next latent/window from recent windows | Medium | Good for temporal continuity and anomaly detection |
| Contrastive positive-pair learning | Treat augmented views of same window as positives | Medium | Strong, but augmentation choices are risky for clinical movement |
| Temporal order prediction | Detect whether windows are in correct order | Medium | Useful but weaker as a standalone objective |
| Cross-device alignment | Pull embeddings from similar movement contexts together across devices | Low initially | Needs paired or well-matched activities |
| Multi-task SSL | Combine reconstruction, prediction, and contrastive losses | Medium later | Good second-generation model |

### Recommended First SSL Model

Start with a masked reconstruction Transformer encoder.

Reasons:

- Works without labels.
- Handles missing channels with masks.
- Can scale across devices.
- Produces a fixed-size embedding.
- Easier to inspect than a pure contrastive system.
- Can support later anomaly detection by reconstruction error and latent distance.

First target:

- Encoder output: `128-dimensional mobility embedding`
- Window length: `5 seconds`
- Latent aggregation: mean-pooled or CLS token
- Training objective: masked sensor reconstruction
- Secondary output: reconstruction error per channel

---

## 4. Research Track B: Personalized Anomaly Detection

### Goal

Train only on the user's own normal walking and detect when today's walking differs from that user's normal pattern.

The key framing is:

```text
today != user's own normal
```

not:

```text
today = disease class
```

### Baseline Data Collection

Minimum viable baseline:

- 5 to 7 setup or normal sessions.
- At least 3 sessions per equipment type if the user uses multiple devices.
- At least 5 minutes of usable walking per equipment profile.
- Exclude low-quality Bluetooth/data windows.
- Store context tags if available.

Better baseline:

- 2 weeks of sessions.
- Morning/evening variation.
- Indoor/outdoor tags.
- Multiple assistive-device modes if relevant.

### Anomaly Scores

Use multiple self-referenced scores instead of one opaque score.

| Score | Meaning | Implementation |
|---|---|---|
| Latent distance | How far today's embedding is from user's historical embedding cluster | Mahalanobis distance, robust covariance, or kNN distance |
| Reconstruction error | How poorly the model reconstructs today's movement | Autoencoder/VAE/Transformer reconstruction loss |
| Temporal forecast error | Whether next-window movement was less predictable than usual | LSTM/Transformer prediction error |
| Rhythm deviation | Change in periodicity or timing consistency | Derived from embedding plus current DSP metrics |
| Device/setup deviation | Today's signal looks unlike this equipment profile's usual mounting | Compare embeddings within same device profile |
| Data-quality deviation | Packet loss, bad samples, missing channels, saturation | Rule-based gating before coaching |

### Output Design

Do not surface "anomaly" as a scary medical term. Use claim-safe language:

- `วันนี้ต่างจากรูปแบบปกติของคุณ`
- `จังหวะวันนี้เปลี่ยนจากรอบก่อนๆ`
- `สัญญาณดูต่างจากการติดตั้งเดิม`
- `ข้อมูลวันนี้ยังไม่นิ่งพอ`
- `ลองเดินอีก 1 นาทีเพื่อยืนยัน`

### Personalization Strategy

Use a layered model:

1. Global SSL encoder trained across users/devices.
2. Per-user baseline distribution in embedding space.
3. Per-equipment baseline distribution.
4. Per-session quality gates.
5. Agentic coach that asks for context before making stronger guidance.

This avoids training a large model from scratch for each user.

---

## 5. Research Track C: Mobility Digital Twin

### Goal

Represent each user's mobility state as a compact latent profile that can be compared to their own history.

Example:

```text
User A
  |
  v
128-dimensional mobility embedding
  |
  v
historical self-comparison
```

### Digital Twin Contents

The digital twin is not a clinical diagnosis. It is a personal movement profile.

Recommended profile structure:

```ts
type MobilityTwin = {
  userId: string;
  equipmentProfiles: Array<{
    equipmentId: string;
    deviceType: "cane" | "walker" | "crutch" | "rollator" | "custom";
    baselineEmbeddingMean: number[];
    baselineEmbeddingCovariance: number[][];
    normalRange: {
      latentDistanceP50: number;
      latentDistanceP90: number;
      latentDistanceP95: number;
    };
    metricBaseline: {
      cadenceMedian: number | null;
      rhythmMedian: number | null;
      dutyFactorMedian: number | null;
      pressureDeltaMedian: number | null;
    };
    lastUpdatedAt: string;
  }>;
};
```

### Twin Update Rules

- Update only from high-quality sessions.
- Do not update baseline from sessions flagged as unusual unless user/clinician confirms they were normal.
- Keep a rolling baseline and a long-term baseline.
- Version the twin so coaching explanations can say whether the baseline changed.
- Keep equipment-specific baselines separate.

### Twin Comparisons

Useful comparisons:

- Today vs this user's last 7 normal sessions.
- This week vs prior 2 weeks.
- Current equipment setup vs same equipment's setup baseline.
- Current movement embedding vs user's own recovered/best sessions.

Avoid:

- User vs population.
- User vs disease cohort.
- User vs "healthy normal".

---

## 6. Candidate Model Comparison

### Model Feasibility Table

| Model | What it learns | Data needed | Strengths | Weaknesses | Feasibility now |
|---|---|---:|---|---|---:|
| Simple statistical baseline on current DSP metrics | Normal ranges for cadence, rhythm, duty, load | Very low | Fastest, explainable, works with current metrics | Not universal across devices; misses subtle movement changes | Very high |
| Dense Autoencoder | Reconstruct flattened windows/features | Low | Simple, cheap, good first anomaly baseline | Weak temporal structure, less robust to variable devices | High |
| 1D CNN Autoencoder | Local temporal patterns | Low-medium | Efficient, strong on IMU windows, mobile-friendly | Fixed window design; may miss long-range context | High |
| LSTM Autoencoder | Sequential reconstruction | Medium | Natural for time series; good anomaly baseline | Slower training/inference, harder to scale | Medium-high |
| VAE | Probabilistic latent space | Medium | Good for latent profile and uncertainty | Can blur reconstructions; tuning matters | Medium |
| Transformer Autoencoder | Masked reconstruction and representation learning | Medium-high | Best foundation-model direction, handles masks and context | Needs more data and careful training | Medium |
| Contrastive Transformer | Device-invariant movement representation | High | Strong embeddings if augmentations are correct | Hard to define safe positives/negatives | Medium-low initially |
| Forecasting Transformer | Predict future windows | Medium-high | Good for anomaly detection and temporal change | Can confuse intentional stops with anomalies | Medium |
| One-Class SVM / Isolation Forest on embeddings | Personalized outlier detector | Low after embeddings exist | Simple personalized anomaly layer | Depends heavily on embedding quality | High after encoder |
| Gaussian / Mahalanobis embedding model | User normal distribution | Low after embeddings exist | Explainable distance to self-baseline | Assumes cluster shape; needs robust covariance | High after encoder |

### Practical Recommendation

Build in this order:

1. Statistical self-baseline on current metrics.
2. CNN or LSTM autoencoder for window-level anomaly baseline.
3. Transformer masked autoencoder as the first universal foundation model.
4. Personalized embedding-space anomaly detector.
5. Mobility digital twin based on rolling embedding distributions.

Do not start with a huge contrastive foundation model. It is exciting, but it requires more data discipline than the project currently has.

---

## 7. Feasibility Comparison By Research Direction

### A. Universal Device Foundation Model

| Criterion | Rating | Reason |
|---|---:|---|
| Research novelty | Very high | Cross-device assistive-aid representation learning is a strong research angle |
| Product value | High | Reduces need for separate device-specific algorithms |
| Data requirement | High | Needs many sessions across equipment types |
| Label requirement | Low | SSL can train without disease or gait labels |
| Engineering complexity | High | Requires data pipeline, training infra, model versioning, evaluation |
| Regulatory/claim risk | Medium-low | Safer if framed as representation and self-comparison |
| Near-term feasibility | Medium | Prototype possible, robust foundation model takes time |
| Long-term feasibility | High | Best long-term platform direction |

Recommended role:

- Make it the long-term research backbone.
- Start with masked reconstruction and embedding extraction.
- Treat universal representation as infrastructure, not as a user-facing claim.

### B. Personalized Anomaly Detection

| Criterion | Rating | Reason |
|---|---:|---|
| Research novelty | High | N-of-1 anomaly detection is compelling for rehabilitation monitoring |
| Product value | Very high | Gives users useful "today vs normal" feedback without labels |
| Data requirement | Medium | Needs only the user's own repeated sessions |
| Label requirement | Very low | Normal-only training is enough |
| Engineering complexity | Medium | Baselines and thresholds are manageable |
| Regulatory/claim risk | Low-medium | Safe if phrased as personal pattern change, not medical deterioration |
| Near-term feasibility | High | Can start with current metrics immediately |
| Long-term feasibility | Very high | Improves as history grows |

Recommended role:

- Make it the first agentic-coach intelligence feature.
- Ship a rule/statistical version before deep models.
- Add embedding anomaly scores after the encoder exists.

### C. Mobility Digital Twin

| Criterion | Rating | Reason |
|---|---:|---|
| Research novelty | Very high | Strong future vision and thesis framing |
| Product value | High | Enables progress tracking, personalization, and coach memory |
| Data requirement | Medium-high | Needs longitudinal data per user and equipment |
| Label requirement | Low | Can be built from embeddings and self-baselines |
| Engineering complexity | High | Needs profile versioning, drift logic, privacy controls |
| Regulatory/claim risk | Medium | Must avoid implying diagnosis or clinical prediction |
| Near-term feasibility | Medium | A simple version can ship; full twin needs more data |
| Long-term feasibility | Very high | Best way to turn raw sessions into lasting product intelligence |

Recommended role:

- Build a lightweight twin early as data structures and baseline storage.
- Delay advanced latent-profile coaching until enough longitudinal data exists.

### D. Agentic Rehabilitation Coach

| Criterion | Rating | Reason |
|---|---:|---|
| Research novelty | Medium-high | Agentic explanation over movement embeddings is interesting |
| Product value | Very high | Turns metrics into next-step guidance |
| Data requirement | Low-medium | Can use current metrics, device state, and user history |
| Label requirement | Low | Needs guardrails more than labels |
| Engineering complexity | Medium-high | Requires policy, memory, explanation, and UI design |
| Regulatory/claim risk | Medium-high | Copy must be tightly constrained |
| Near-term feasibility | Medium-high | A constrained rules-first coach can ship |
| Long-term feasibility | High | Gets stronger with twin and anomaly signals |

Recommended role:

- Start as a deterministic coach with templates and guardrails.
- Later let it reason over anomaly explanations, device setup, and session context.
- Never let it produce diagnosis, fall-risk, or population-normal claims.

---

## 8. Product Roadmap

### Phase 0: Data Foundation

Goal: make future ML possible.

Implementation:

- Persist raw session windows, not only summary metrics.
- Store equipment type, module placement, firmware version, app version, and Bluetooth quality.
- Store sample rate, packet count, bad packet count, missing windows, and session state.
- Add a session-quality score.
- Add explicit setup-walk sessions.
- Add user notes/context tags.
- Export anonymized research bundles for offline model training.

Deliverables:

- `walking_session`
- `sensor_sample_window`
- `equipment_profile`
- `session_quality_summary`
- `baseline_profile`
- `model_training_export`

Feasibility: very high.

Why first:

- No model will be useful without consistent data capture.

### Phase 1: Rules-First Personalized Baseline

Goal: ship "today vs your normal" using existing metrics.

Implementation:

- Use current metrics:
  - cadence
  - duty factor
  - rhythm score
  - confidence
  - overall quality
  - pressure/load metrics when available
- Build per-user and per-equipment rolling medians and robust ranges.
- Use median absolute deviation or percentile bands.
- Show only self-referenced deviations.

Example output:

- `จังหวะวันนี้ต่ำกว่าช่วงปกติของคุณ`
- `การลงน้ำหนักวันนี้ต่างจากรอบก่อนๆ`
- `ข้อมูลวันนี้ยังน้อย เดินต่ออีก 1 นาทีเพื่อยืนยัน`

Feasibility: very high.

Research value: medium.

Product value: high.

### Phase 2: Autoencoder Anomaly Prototype

Goal: prove that learned normal patterns add value beyond hand-written metrics.

Implementation:

- Train per-user or small global autoencoder on normal walking windows.
- Start with 1D CNN Autoencoder or LSTM Autoencoder.
- Use reconstruction error as anomaly score.
- Compare against metric-only anomaly score.
- Keep output internal until validation.

Evaluation:

- Can the model detect:
  - wrong device mount
  - unusual fatigue-like session
  - unstable rhythm
  - walker rolling vs lifted mode
  - sensor looseness
  - abnormal packet/dropout artifacts
- Does it produce fewer false alarms than current metrics?

Feasibility: high.

Research value: high.

Product value: medium-high.

### Phase 3: Universal SSL Encoder

Goal: train the first cross-device representation model.

Implementation:

- Train a masked Transformer autoencoder across all devices.
- Use channel masks for missing pressure.
- Add device/equipment metadata as conditioning.
- Output 128-dimensional embeddings.
- Store embeddings per window and per session.

Training data:

- All high-quality sessions.
- Multiple users.
- Multiple devices.
- Multiple mounting positions.
- Synthetic augmentations only after careful validation.

Evaluation:

- Embedding clusters should separate:
  - user identity softly, not as the main objective
  - device type
  - walking vs idle
  - smooth vs irregular sessions
  - setup/mounting changes
- Embeddings should remain stable across sessions that the user marks as normal.

Feasibility: medium.

Research value: very high.

Product value: high long-term.

### Phase 4: Embedding-Based Personalized Anomaly Detection

Goal: use the universal encoder for robust n-of-1 change detection.

Implementation:

- For each user/equipment profile, model the normal embedding distribution.
- Start with robust mean/covariance and Mahalanobis distance.
- Add kNN distance or isolation forest if needed.
- Calibrate thresholds from the user's own history:
  - normal range
  - watch range
  - verify range
- Gate all anomaly outputs by session quality.

Coach output should explain dimensions:

- rhythm changed
- motion intensity changed
- pressure/load changed
- device setup changed
- data quality changed

Feasibility: high once Phase 3 exists.

Research value: very high.

Product value: very high.

### Phase 5: Mobility Digital Twin

Goal: maintain a durable user movement profile.

Implementation:

- Create per-equipment twin profiles.
- Store baseline embedding distributions.
- Store best-session reference embeddings.
- Track rolling trend lines.
- Maintain baseline version history.
- Add "do not learn from this session" controls.

Coach use cases:

- "Today looks like your usual cane sessions."
- "Today differs mostly in rhythm consistency."
- "This looks more like a setup change than a walking change."
- "Your recent sessions are trending closer to your best-session profile."

Feasibility: medium-high after embeddings are stable.

Research value: very high.

Product value: high.

### Phase 6: Agentic Coach Layer

Goal: make the system useful through guided interpretation and next steps.

Implementation:

- Rules-first coach policy.
- Inputs:
  - session quality
  - Bluetooth/device status
  - selected equipment
  - current metrics
  - baseline deviation
  - embedding anomaly explanation
  - user notes
- Outputs:
  - concise explanation
  - one recommended next action
  - optional context question
  - setup/data-quality warning when appropriate

Allowed coach actions:

- continue walking
- walk one more minute to confirm
- rest briefly
- check module placement
- reconnect Bluetooth
- repeat setup walk
- add a note
- review trend

Banned coach actions:

- diagnose
- predict falls
- claim clinical deterioration
- compare to healthy population
- prescribe medical treatment
- quantify body-weight support unless validated and claim-safe

Feasibility: medium-high.

Research value: high.

Product value: very high.

---

## 9. Evaluation Plan

### Technical Evaluation

| Evaluation | Metric |
---|---|
| Reconstruction quality | masked reconstruction MAE/RMSE by channel |
| Embedding stability | distance between normal sessions from same user/equipment |
| Device generalization | performance across cane, walker, crutch, rollator |
| Setup sensitivity | ability to detect changed mount position |
| Data-quality robustness | false anomaly rate under packet loss or noise |
| Personal anomaly detection | precision/recall on intentionally perturbed sessions |
| Coach usefulness | user acceptance of recommended next action |

### Data Splits

Use splits that avoid leakage:

- Leave-session-out within user.
- Leave-user-out for global encoder evaluation.
- Leave-device-out for universal representation stress test.
- Leave-equipment-profile-out for new setup adaptation.

### Synthetic Perturbation Tests

Use controlled perturbations before clinical labels exist:

- Add sensor noise.
- Drop packets.
- Rotate axes.
- Shift mounting orientation.
- Mix idle/walking windows.
- Simulate reduced rhythm regularity.
- Simulate pressure offset drift.

These are not clinical truth, but they test whether the model reacts to known signal changes.

### Human Review

Have users or researchers tag sessions:

- normal
- tired
- rushed
- device loose
- wrong placement
- different surface
- pain/discomfort note
- therapy session

These tags should support evaluation and explanation, not disease classification.

---

## 10. Feasibility Summary

### Best Near-Term Build

Build personalized anomaly detection from current metrics first.

Why:

- Needs no labels.
- Uses current code.
- Fits claim-safety.
- Gives immediate product value.
- Creates the UX path for later embedding anomaly scores.

### Best Research Bet

Build the Universal Device Foundation Model with masked time-series SSL.

Why:

- It directly solves the cane/walker/crutch/rollator signal mismatch.
- It is more novel than another gait classifier.
- It creates reusable infrastructure for all future features.
- It pairs naturally with self-baseline anomaly detection.

### Best Long-Term Product Vision

Build the Mobility Digital Twin.

Why:

- It turns sessions into durable user memory.
- It makes coaching personal without comparing to population norms.
- It can support progress, setup detection, and adaptive recommendations.

### Highest Risk

The agentic coach has the highest claim-safety risk.

Mitigation:

- Keep it rules-first at launch.
- Force all outputs through approved templates.
- Require confidence and data-quality gates.
- Ask context questions instead of making strong claims.
- Use "different from your usual" language.

---

## 11. Recommended Thesis / Research Framing

Strong framing:

> A self-supervised universal movement representation for assistive mobility devices, personalized through n-of-1 anomaly detection and longitudinal mobility embeddings.

Avoid framing:

> AI detects disease from cane signals.

Better research questions:

1. Can a self-supervised encoder learn useful movement embeddings across cane, walker, crutch, and rollator signals?
2. Do personalized embedding baselines detect within-user mobility changes better than hand-engineered metrics alone?
3. Can a compact mobility digital twin support self-referenced progress tracking without population labels?
4. How much data is needed before a user's normal walking distribution becomes stable?
5. Which model family gives the best feasibility-to-performance tradeoff for low-resource rehabilitation data?

---

## 12. Implementation Priority

| Priority | Work item | Feasibility | Impact |
|---:|---|---:|---:|
| 1 | Persist raw windows and session metadata | Very high | Very high |
| 2 | Build rules-first personal baseline anomaly score | Very high | High |
| 3 | Add session-quality gates | Very high | High |
| 4 | Add coach templates for self-baseline changes | High | High |
| 5 | Train CNN/LSTM autoencoder prototype | High | Medium-high |
| 6 | Store per-session embeddings | Medium-high | High |
| 7 | Train masked Transformer encoder | Medium | Very high |
| 8 | Add embedding-space anomaly detector | Medium-high after encoder | Very high |
| 9 | Build mobility digital twin profile | Medium | High |
| 10 | Add adaptive agentic coach over twin/anomaly explanations | Medium | Very high |

Recommended next engineering step:

Start with data capture and a rules-first personal baseline system. In parallel, export anonymized session windows for offline SSL experiments. This keeps product progress moving while building the dataset required for the Universal Device Foundation Model.

