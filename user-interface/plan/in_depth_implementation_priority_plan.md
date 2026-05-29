# In-Depth Implementation Priority Plan

This plan turns `further_implementation_plan.md` into a practical build sequence for the current `user-interface` workspace. The constraint is limited implementation time, so the first priority is to ship useful self-referenced feedback inside the existing Next.js frontend before introducing backend or Python services.

The guiding product rule is:

```text
Use current metrics to answer "is today different from this user's usual pattern?"
Do not claim diagnosis, fall risk, or population-normal comparison.
```

## 1. Implementation Strategy

### Default Path: Current Frontend Only

Use the existing Next.js app first because it already has:

- live NanoIMU Bluetooth samples
- metric calculation in `apps/web/src/lib/biofeedback-metrics.ts`
- device selection and device metadata UI
- home, biofeedback, signals, and settings pages
- in-memory sample history
- demo fallback behavior

Frontend-only implementation is enough for:

- local session recording in browser storage
- rolling personal baseline from previous sessions
- session-quality gates
- rules-first personal deviation score
- coach templates
- better setup and data-quality feedback
- export of anonymized JSON research bundles

### Add Backend Only When Persistence Or Multi-Device Sync Matters

The existing `apps/server` is TypeScript, not FastAPI. Prefer extending it before adding Python if the need is ordinary app persistence:

- saving sessions outside browser storage
- syncing sessions across devices
- user accounts
- shared rehabilitation program state
- clinician dashboard data
- server-side export endpoints

### Add FastAPI Only For Python-Native ML

Use FastAPI only when Python is needed for:

- NumPy/Pandas preprocessing
- scikit-learn anomaly models
- PyTorch autoencoder or Transformer inference
- offline training job orchestration
- model registry and embedding extraction

Do not add FastAPI for the first rules-first baseline. It would slow down the highest-value near-term work without improving the core user experience.

---

## 2. Highest-Priority Feature Order

| Priority | Feature | Build location | Why first | Time risk |
|---:|---|---|---|---|
| 1 | Session capture and local persistence | Next.js frontend | Baselines and ML need saved sessions | Low |
| 2 | Session-quality summary | Next.js frontend | Prevents bad data from creating bad coaching | Low |
| 3 | Rules-first personal baseline | Next.js frontend | Fastest path to "today vs your normal" | Low-medium |
| 4 | Baseline-aware coach templates | Next.js frontend | Turns metrics into useful next actions | Low-medium |
| 5 | Setup-walk and calibration flow | Next.js frontend | Improves baseline reliability and device setup | Medium |
| 6 | Research export bundle | Next.js frontend first, server later | Enables future ML without blocking product | Low |
| 7 | Durable server persistence | TypeScript server or database API | Needed after local prototype proves useful | Medium |
| 8 | Statistical anomaly service | FastAPI optional | Useful only after enough sessions exist | Medium |
| 9 | Autoencoder prototype | FastAPI/Python offline first | Research value, not first product dependency | High |
| 10 | Universal SSL encoder and digital twin | FastAPI/Python plus app integration | Long-term platform work | High |

Recommended limited-time scope:

```text
Implement priorities 1-4 first.
Add priority 5 only if time remains.
Add priority 6 as a lightweight export button or developer utility.
Defer Python/FastAPI until there are real saved sessions to train or score.
```

---

## 3. Phase 1: Session Capture And Local Persistence

### Goal

Save enough session history to compute a personal baseline without requiring a backend.

### Current Gap

The app keeps the latest 500 samples in memory and uses a hardcoded baseline:

```ts
activationMad: 0.55
activationMedian: 0.85
cadenceMedian: 82
dutyFactorMedian: 43
baselinePressureDeltaPa: 7730
rhythmMedian: 86
sessionCount: 7
```

This makes the UI look personalized, but it is not actually learning from the user.

### Implementation

Create a small client-side session store.

Suggested files:

- `apps/web/src/lib/session-storage.ts`
- `apps/web/src/lib/session-summary.ts`
- `apps/web/src/types/moonwalk-session.ts`

Suggested data model:

```ts
export type AssistiveDeviceType =
  | "cane"
  | "walker"
  | "crutch"
  | "rollator"
  | "custom";

export type SessionQualityBand = "usable" | "limited" | "poor";

export type MoonwalkSessionSummary = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  deviceProfileId: string;
  deviceType: AssistiveDeviceType;
  sampleCount: number;
  packetCount: number;
  badPacketCount: number;
  qualityBand: SessionQualityBand;
  qualityScore: number;
  metrics: {
    cadenceSpm: number | null;
    dutyFactorPercent: number | null;
    rhythmScore: number | null;
    overallQualityPercent: number;
    sessionWeightSupportTrainingLoad: number | null;
    confidence: number;
    fatigueSlope: number | null;
  };
  notes?: string;
};
```

Storage approach:

- Use `localStorage` for summaries.
- Keep only summaries by default to avoid large browser storage usage.
- Store raw windows later in IndexedDB if needed.
- Add schema versioning immediately.

Acceptance criteria:

- A completed walk can be saved as a session summary.
- Saved sessions survive refresh.
- Sessions are grouped by selected equipment profile.
- Demo sessions are clearly marked or excluded from baseline updates.
- The app can load the last 20 saved summaries.

### Why This Works

The current metrics already provide enough information to build a first personal baseline. Raw-sample persistence is valuable later, but the fastest product improvement comes from saving summarized session metrics now.

---

## 4. Phase 2: Session-Quality Summary

### Goal

Gate all baseline and coach logic behind data quality so the app does not overreact to short or noisy sessions.

### Quality Inputs

Use fields that already exist or are easy to compute:

- `sampleCount`
- `durationMs`
- `packetCount`
- `badPacketCount`
- `confidence`
- number of detected plants
- availability of rhythm, duty factor, and pressure metrics
- Bluetooth state
- selected device profile

### Suggested Quality Rules

```text
poor:
  duration < 30 seconds
  or sampleCount < 100
  or confidence < 0.35
  or badPacketRate > 20%

limited:
  duration < 90 seconds
  or confidence < 0.55
  or rhythm is unavailable
  or badPacketRate > 5%

usable:
  duration >= 90 seconds
  confidence >= 0.55
  badPacketRate <= 5%
  at least one key walking metric is available
```

### UI Behavior

Use claim-safe copy:

- `ข้อมูลรอบนี้ยังสั้นเกินไปสำหรับเทียบ baseline`
- `สัญญาณ Bluetooth มี packet เสียหลายครั้ง`
- `เดินต่ออีก 1 นาทีเพื่อยืนยันรูปแบบวันนี้`
- `รอบนี้ใช้สร้าง baseline ได้`

Acceptance criteria:

- Poor sessions are not added to personal baseline.
- Limited sessions can appear in history but are not used for baseline unless the user confirms later.
- Usable sessions can update baseline.
- Coach output always mentions data quality first when quality is poor.

---

## 5. Phase 3: Rules-First Personal Baseline

### Goal

Replace the hardcoded baseline with a rolling self-baseline computed from saved usable sessions.

### Baseline Scope

Compute separate baselines by:

- user profile, initially a single local user
- equipment profile
- device type

Do not mix cane sessions with walker sessions unless the UI explicitly says it is using a general fallback.

### Baseline Metrics

Start with:

- `cadenceSpm`
- `dutyFactorPercent`
- `rhythmScore`
- `overallQualityPercent`
- `sessionWeightSupportTrainingLoad`
- `fatigueSlope`

Use robust statistics:

- median
- p10 and p90
- median absolute deviation
- usable session count
- last updated timestamp

Suggested type:

```ts
export type PersonalBaseline = {
  deviceProfileId: string;
  deviceType: AssistiveDeviceType;
  usableSessionCount: number;
  updatedAt: string;
  metrics: Record<
    string,
    {
      median: number;
      p10: number;
      p90: number;
      mad: number;
      sampleCount: number;
    }
  >;
};
```

### Deviation Score

For each current metric:

```text
deviation = abs(current - baselineMedian) / max(MAD * 1.4826, minimumUsefulScale)
```

Then classify:

- `< 1.5`: usual
- `1.5 - 2.5`: slightly different
- `> 2.5`: different from usual

Use minimum scales to avoid exaggerated scores:

- cadence: `5 spm`
- rhythm: `6 points`
- duty factor: `5 percentage points`
- overall quality: `8 points`
- weight-support training load: `8 points`
- fatigue slope: `0.15`

### Baseline States

The UI needs clear states:

| State | Condition | UI behavior |
|---|---|---|
| No baseline | 0 usable sessions | Ask for setup walk |
| Building baseline | 1-2 usable sessions | Show trend but avoid strong comparisons |
| Baseline ready | 3+ usable sessions | Enable "today vs usual" feedback |
| Baseline stale | no usable sessions for 14+ days | Prompt for refresh |

Acceptance criteria:

- The current session can be compared with saved sessions from the same equipment profile.
- The app does not show strong deviation language with fewer than 3 usable sessions.
- Baseline calculations are deterministic and covered by unit tests if test infrastructure is available.
- The hardcoded baseline remains only as demo fallback, not as real personalization.

---

## 6. Phase 4: Baseline-Aware Coach Templates

### Goal

Turn personal baseline results into concise, safe, action-oriented guidance.

### Coach Inputs

- Bluetooth state
- session quality
- selected equipment
- current live metrics
- baseline readiness
- metric deviation summary
- fatigue label
- load control label
- confidence

### Coach Priority Order

The coach should choose exactly one primary message using this order:

1. Bluetooth unsupported, disconnected, or no samples.
2. Poor session quality.
3. No baseline or building baseline.
4. Device/setup signal looks unusual.
5. Load or pressure behavior changed.
6. Rhythm or cadence changed.
7. Fatigue/strain changed.
8. Session looks similar to usual.

### Allowed Message Patterns

Use self-referenced Thai copy:

- `วันนี้ใกล้เคียงกับรูปแบบปกติของคุณ`
- `จังหวะวันนี้ต่างจากรอบที่ผ่านมาของคุณ`
- `การลงน้ำหนักวันนี้ต่างจาก baseline ของอุปกรณ์นี้`
- `สัญญาณวันนี้ยังไม่นิ่งพอสำหรับสรุป`
- `ลองเดินต่ออีก 1 นาทีเพื่อยืนยัน`
- `ตรวจตำแหน่งโมดูลก่อนเริ่มรอบถัดไป`
- `พักสั้นๆ แล้วเริ่มรอบใหม่ถ้ายังต้องการฝึกต่อ`

Avoid:

- `เสี่ยงล้ม`
- `อาการแย่ลง`
- `ผิดปกติทางการแพทย์`
- `เทียบกับคนปกติ`
- `วินิจฉัย`

### UI Placement

Minimum UI changes:

- Home page: replace or enrich `คำแนะนำวันนี้`.
- Biofeedback page: replace `metrics.recommendation` headline when baseline comparison is available.
- Settings page: add baseline status under the selected equipment.

Acceptance criteria:

- Coach never produces diagnosis or population comparison.
- Coach output changes when data quality is poor.
- Coach output changes when baseline is missing.
- Coach output identifies the most changed dimension when baseline is ready.

---

## 7. Phase 5: Setup Walk And Calibration Flow

### Goal

Create a deliberate setup flow that collects better baseline data.

### Minimal Flow

Add a setup-walk mode in the frontend:

1. User selects or adds equipment.
2. User confirms module placement.
3. App asks for a short setup walk.
4. App records 60-90 seconds.
5. App shows whether the session is usable.
6. User can save it as baseline data or retry.

Suggested UI locations:

- Add a `สร้าง baseline` action in settings.
- Add a baseline status card on home.
- Reuse existing Bluetooth overlay instead of creating a separate connection flow.

Acceptance criteria:

- Setup walk cannot be saved if Bluetooth is disconnected.
- The app explains whether the setup walk is usable, limited, or poor.
- At least 3 usable setup/normal sessions unlock stronger baseline comparison.

---

## 8. Phase 6: Research Export Bundle

### Goal

Prepare for future ML without blocking the frontend-first product work.

### Frontend-Only Export

Add a developer-facing JSON export first:

```ts
export type MoonwalkResearchExport = {
  schemaVersion: 1;
  exportedAt: string;
  appVersion: string;
  sessions: MoonwalkSessionSummary[];
  baselines: PersonalBaseline[];
};
```

If raw windows are later stored in IndexedDB, add:

- resampled window metadata
- sample rate estimate
- missing sample count
- pressure availability mask
- device profile metadata

Acceptance criteria:

- Export excludes obvious personally identifying free-text by default.
- Export includes equipment type and baseline-ready status.
- Export can be used by a Python notebook or FastAPI training job later.

---

## 9. When To Add FastAPI

### Do Not Add FastAPI Yet If The Need Is

- local baseline calculation
- coach templates
- browser session history
- simple JSON export
- UI state management

These are faster and simpler in the Next.js app.

### Add FastAPI When The Need Is

- Python model inference
- batch preprocessing of raw windows
- autoencoder reconstruction scoring
- embedding extraction
- Mahalanobis or Isolation Forest scoring over learned embeddings
- model versioning

### Suggested FastAPI Shape

Only introduce this after priorities 1-6 are working.

```text
apps/ml-api/
  main.py
  moonwalk_ml/
    schemas.py
    preprocessing.py
    quality.py
    baseline.py
    anomaly.py
    embeddings.py
  models/
    README.md
```

Initial endpoints:

```text
POST /score/session-quality
POST /score/personal-baseline
POST /export/normalize-windows
POST /model/reconstruct
POST /model/embed
```

Important rule:

```text
The frontend owns user-facing copy and safety policy.
FastAPI returns scores, explanations, and evidence, not final medical-sounding advice.
```

---

## 10. Suggested Implementation Sprints

### Sprint 1: Local History And Quality

Build:

- session summary type
- localStorage session store
- session finalization helper
- quality summary helper
- history backed by real saved summaries

Ship value:

- user can see their own past sessions
- bad/short sessions are visibly separated from usable sessions

### Sprint 2: Baseline And Deviation

Build:

- baseline computation from usable sessions
- per-equipment baseline status
- metric deviation classification
- replacement for hardcoded baseline when local history exists

Ship value:

- app can say whether today is close to the user's own prior sessions

### Sprint 3: Coach Templates

Build:

- deterministic coach policy
- Thai-safe message templates
- home and biofeedback integration
- baseline status in settings

Ship value:

- guidance becomes personal and safer

### Sprint 4: Setup Walk And Export

Build:

- setup-walk mode
- baseline save/retry UI
- JSON export
- optional raw-window IndexedDB spike

Ship value:

- baseline data becomes more reliable
- future ML work can start with real exported data

---

## 11. Concrete First Code Changes

If implementation starts immediately, make these changes first:

1. Add `apps/web/src/types/moonwalk-session.ts`.
2. Add `apps/web/src/lib/session-summary.ts`.
3. Add `apps/web/src/lib/session-storage.ts`.
4. Add `apps/web/src/lib/personal-baseline.ts`.
5. Add `apps/web/src/lib/coach-policy.ts`.
6. Update `apps/web/src/components/moonwalk-app.tsx` to finalize and save sessions.
7. Update `apps/web/src/components/moonwalk/home-page.tsx` to use saved history and baseline coach output.
8. Update `apps/web/src/components/moonwalk/biofeedback-page.tsx` to show quality and baseline-aware feedback.
9. Update `apps/web/src/components/moonwalk/settings-page.tsx` to show baseline status and reset/export controls.

Keep implementation boundaries clean:

- `biofeedback-metrics.ts` should continue computing raw movement metrics.
- `personal-baseline.ts` should compare current metrics with saved history.
- `coach-policy.ts` should choose user-facing copy from metrics, quality, and baseline state.
- UI components should render results, not contain scoring rules.

---

## 12. Definition Of Done For First Release

The first release is successful when:

- The app saves real local session summaries.
- The app computes whether the selected equipment has no baseline, building baseline, or ready baseline.
- The app compares the current session against the user's own usable sessions.
- The coach uses data-quality gates before giving baseline feedback.
- The UI avoids diagnosis, fall-risk, and population-normal claims.
- The system works without FastAPI, network access, accounts, or cloud storage.
- Future Python ML can consume exported session/baseline JSON without changing the user-facing product model.

## 13. Deferred Work

Defer these until the product baseline loop is working:

- raw sample window persistence for every session
- IndexedDB time-series storage
- server database schema
- FastAPI service
- CNN/LSTM autoencoder
- Transformer SSL encoder
- embedding-space anomaly detector
- full mobility digital twin
- LLM-based or open-ended agentic coach

These are valuable, but they should not block the first useful version. The fastest working path is a deterministic, self-referenced baseline and coach inside the current Next.js app.
