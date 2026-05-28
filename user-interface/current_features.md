# Current Features

This document inventories the current `user-interface` web app as implemented in `apps/web/src`. The main app is a single Next.js page (`src/app/page.tsx`) that renders `MoonWalkApp` and switches between four in-app pages through the bottom navigation.

## App Shell

### Navigation

- Bottom navigation has 4 pages:
  - `หน้าหลัก` (`home`)
  - `ฟีดแบ็ก` (`biofeedback`)
  - `สัญญาณสด` (`signals`)
  - `ตั้งค่า` (`settings`)
- Navigation is fixed to the bottom of the viewport and uses 4 equal-width buttons.
- Active page is highlighted with inverted navy/white theme colors.

### Sticky Device And Bluetooth Bar

- Always visible at the top of the app.
- Shows Bluetooth connection state, state-specific detail text, and one action button.
- Bluetooth states handled:
  - `idle`: "Bluetooth ยังไม่เชื่อมต่อ", action "ค้นหาอุปกรณ์"
  - `searching`: "กำลังค้นหาอุปกรณ์", action/live label "SCAN"
  - `connecting`: "กำลังเชื่อมต่อ", action/live label "PAIR"
  - `connected`: "Bluetooth connected", action "ตัดการเชื่อมต่อ", live label "LIVE"
  - `disconnected`: uses disconnected/off copy
  - `error`: "Bluetooth เชื่อมต่อไม่สำเร็จ", action "ลองใหม่", live label "ERR"
  - `unsupported`: "Bluetooth ไม่พร้อมใช้งาน", disabled action "ไม่รองรับ", live label "OFF"
  - `ios-unsupported`: "บลูทูธบน iOS ต้องใช้แอปช่วย", action "ดูวิธีใช้", live label "iOS"
- Device selector supports 2 built-in device profiles:
  - `ไม้เท้า`: single cane module for walking rhythm tracking.
  - `วอล์กเกอร์`: walker/rollator module for movement tracking.
- Device menu includes an "เพิ่มอุปกรณ์ของคุณ" entry that opens the add-device overlay.
- The selected device icon is shown from `/icons/cane_icon.svg` or `/icons/walker_icon.svg`.

### Live Walking State Panel

- Sticky summary below the device bar.
- Shows:
  - Live walking state:
    - `Idle` when Bluetooth is connected and metrics are idle.
    - Otherwise the current activation label: `สงบ`, `กำลังเดินปกติ`, `ใช้แรงสูง`, or `ควรชะลอ`.
  - Session elapsed time, initialized at `522` seconds and incremented every second.
  - Selected assistive device label.
  - Overall quality label and percent.
- Overall quality color bands:
  - `< 34%`: red / `แย่`
  - `34% - 66%`: yellow / `ปานกลาง`
  - `>= 67%`: teal / `ดีเยี่ยม`
- If connected but no samples have arrived, the quality text displays `รอสัญญาณ`.

### Global Session And Sample State

- Keeps the latest 500 NanoIMU samples in memory.
- Ignores duplicate samples with the same `timestamp_ms`.
- Biofeedback metrics are recalculated from sample history with a hardcoded baseline:
  - `activationMad`: `0.55`
  - `activationMedian`: `0.85`
  - `cadenceMedian`: `82`
  - `dutyFactorMedian`: `43`
  - `baselinePressureDeltaPa`: `7730 Pa`
  - `rhythmMedian`: `86`
  - `sessionCount`: `7`

## Page: หน้าหลัก

### Header Summary

- Displays the product label `มูนวอล์ก`.
- Greets the user with `สวัสดีคุณ เอ้อ`.
- Shows the current rehabilitation/program day:
  - Current day: `20`
  - Total program length: `28` days
  - Text: `วันที่ 20 จาก 28 วัน`

### Progress Chart

- Shows `ความก้าวหน้าเทียบค่าเริ่มต้น`.
- Compares current walking quality against a baseline trend.
- Chart data points are generated for days:
  - `1, 4, 7, 10, 13, 16, 20, 24, 28`
- Baseline score model:
  - Start score: `42%`
  - End score: `66%`
  - Uses an eased progression across the 28-day program.
- Current score source:
  - Live sensor score when Bluetooth is connected, not idle, confidence is at least `0.35`, and overall quality is greater than `0`.
  - Otherwise saved session score: `74%`.
- Status label:
  - `ดีกว่าเส้นฐาน` when improvement is `>= 8%`.
  - `ใกล้เส้นฐาน` when improvement is `0% - 7%`.
  - `ต่ำกว่าเส้นฐาน` when below baseline.
- For the default saved-session state on day 20:
  - Current score: `74%`
  - Baseline at day 20: approximately `59%`
  - Improvement: `+15%`
  - Source label: `เซสชันล่าสุด`

### Mini Status Cards

- `บลูทูธ`:
  - `เชื่อมต่อ` when connected.
  - `ยังไม่เชื่อมต่อ` when disconnected.
- `อุปกรณ์`: selected device label, default `ไม้เท้า`.
- `ฝึกลงน้ำหนัก`:
  - Shows rounded `sessionWeightSupportTrainingLoad`.
  - Shows `--` if the metric is unavailable.
  - Tone is green when value is `>= 55`, amber below `55`, neutral when unavailable.

### Today's Recommendation Metrics

- Panel title: `คำแนะนำวันนี้`.
- Live marker: `สด`.
- Shows 3 compact metrics:
  - `จังหวะ`: rounded `rhythmScore`; fallback `86` when disconnected and no metric exists.
  - `ลงไม้เท้า`: rounded `dutyFactorPercent`; fallback `--`.
  - `ฝึกน้ำหนัก`: rounded `sessionWeightSupportTrainingLoad`; fallback `--`.

### History

- Displays 3 fixed history entries.
- Each item shows date, equipment, duration, title, detail, and outcome.
- Current entries:
  - `วันนี้ / ไม้เท้า / 18 นาที`: morning indoor walk, rhythm improved by 6 points.
  - `เมื่อวาน / วอล์กเกอร์ / 14 นาที`: straight-walk practice, fatigue near the end.
  - `จันทร์ / ไม้เท้า / 12 นาที`: initial baseline setup.

### Recommendations

- Displays 3 recommendation cards:
  - Dynamic latest-session recommendation from `metrics.recommendation`.
  - `เริ่มด้วยรอบสั้น`.
  - `ตรวจโมดูลก่อนเดิน`.
- Each card includes a title, detail text, and right chevron.

## Page: ฟีดแบ็ก

### Idle State

- If Bluetooth is connected and metrics report idle, the page shows a dedicated idle screen.
- Text:
  - `Live walking state`
  - `Idle`
  - `ยังไม่พบการถือหรือใช้งานอุปกรณ์ เริ่มถือไม้เท้าและเดินเพื่อเปิดการคำนวณ`

### Feedback Header

- Shows `ฟีดแบ็กตอนนี้`.
- Main headline is `metrics.recommendation`.
- Supporting detail changes by data state:
  - With samples: `อ่าน {sampleCount} ตัวอย่าง / ลงไม้เท้า {duty}% / จังหวะ {rhythm} / ฝึกน้ำหนัก {load}`
  - Connected with no samples: `เชื่อมต่อแล้ว กำลังรอ frame IMU จากอุปกรณ์`
  - Disconnected: `โหมดสาธิตจะแสดงค่าจำลองจนกว่าจะเชื่อมต่อ Bluetooth`

### Quality Gauge

- Large circular gauge labeled `คุณภาพ`.
- Uses `overallQualityPercent`.
- Demo fallback when disconnected and no live overall quality:
  - `72 + (elapsedSeconds % 4)`, so visible range is `72 - 75`.
- Gauge tone:
  - `null`: gray, `รอข้อมูล`
  - `< 34`: red, `แย่`
  - `34 - 66`: yellow, `ปานกลาง`
  - `>= 67`: teal, `ดีเยี่ยม`

### Status And Reliability Metrics

- `สถานะ`: `metrics.action`.
- `เป้าหมาย`: rounded `targetCompliancePercent`, displayed with `%`, or `--`.
- `ความมั่นใจ`: `Math.round(metrics.confidence * 100)%`.

### Headline Gauges

- Three small circular gauges:
  - `ลงไม้เท้า`: rounded `dutyFactorPercent`.
  - `จังหวะ`: rounded `rhythmScore`.
  - `ลงน้ำหนัก`: rounded `sessionWeightSupportTrainingLoad`.
- Disconnected demo fallback values:
  - Rhythm: `86 + (elapsedSeconds % 3)`, range `86 - 88`.
  - Duty: `41 + (elapsedSeconds % 4)`, range `41 - 44`.
  - Weight-support training load: `68 + (elapsedSeconds % 5)`, range `68 - 72`.

### Next Recommendation

- Panel title: `คำแนะนำถัดไป`.
- Shows `metrics.recommendation` with a chevron affordance.

## Page: สัญญาณสด

### Frame Monitor Header

- Header label: `IMU frame monitor`.
- Title: `IMU + Pressure Payload`.
- Fixed sample-rate badge: `20Hz`.
- Payload schema text:
  - `IMU,t,ax,ay,az,gx,gy,gz,pressure`

### Stream Metadata

- Shows 4 top metrics:
  - `tag`: fixed `IMU`.
  - `stream`: `BLE` when connected, `RAW` when disconnected/demo.
  - `t ms`: latest sample timestamp when connected, otherwise simulated `1234 + tick`.
  - `pressure`: latest sample pressure rounded to integer, otherwise `101325`.
- Footer status:
  - Connected: `{packetCount}/{badPacketCount}`.
  - Disconnected/demo: `50ms`.

### Signal Table

- Displays 6 live signal rows:
  - `ax`: column `2`, group `ACC`, axis `X`, unit `m/s²`, normalization scale `12`.
  - `ay`: column `3`, group `ACC`, axis `Y`, unit `m/s²`, normalization scale `12`.
  - `az`: column `4`, group `ACC`, axis `Z`, unit `m/s²`, normalization scale `12`.
  - `gx`: column `5`, group `GYRO`, axis `X`, unit `dps`, normalization scale `250`.
  - `gy`: column `6`, group `GYRO`, axis `Y`, unit `dps`, normalization scale `250`.
  - `gz`: column `7`, group `GYRO`, axis `Z`, unit `dps`, normalization scale `250`.
- Each row shows:
  - Column number.
  - Signal label.
  - Group and axis.
  - Current value to 2 decimal places.
  - Unit.
  - A 100-sample raw line plot.
  - Peak absolute value from the visible sample window.

### Demo Stream Behavior

- Visible sample count: `100`.
- Demo update interval: `50 ms`.
- Demo stream generates sinusoidal motion, detail oscillation, micro variation, and random jitter.
- `az` includes resting gravity at `9.81`.
- When a real Bluetooth sample arrives, the stream switches to actual parsed accelerometer and gyroscope values.

## Page: ตั้งค่า

### Header

- Displays:
  - `Moon Walk`
  - `ตั้งค่า`
- Uses a settings icon in the header action box.

### Theme Controls

- Theme section title: `ธีม`.
- Three theme buttons:
  - `สว่าง`: sets theme to `light`.
  - `มืด`: sets theme to `dark`.
  - `ระบบ`: sets theme to `system`.
- Active theme is highlighted with inverted navy/white colors.

### Bluetooth Settings

- Section title: `Bluetooth`.
- Shows selected/connected Bluetooth device name, or `ยังไม่ได้เลือกอุปกรณ์`.
- Shows raw Bluetooth state string.
- Primary action button: `จัดการการเชื่อมต่อ`, opens the Bluetooth overlay.

### Options

- Static option rows:
  - `ภาษา`: `ไทย`
  - `หน้าจอ`: `Mobile`

## Overlay: Add Device

### Entry Points

- Opens from the device menu item `เพิ่มอุปกรณ์ของคุณ`.

### Fields

- `ชื่ออุปกรณ์`: text input, placeholder `เช่น ไม้ค้ำยันของคุณสมชาย`.
- `ประเภทอุปกรณ์`: select input with options:
  - `ไม้เท้า`
  - `Walker`
  - `Crutch`
  - `Rollator`
  - `อื่นๆ`
- `ตำแหน่งติดตั้งโมดูล`: text input, placeholder `เช่น ด้านขวาของด้ามจับ`.
- `รูปอุปกรณ์`: dashed upload-style button labeled `เพิ่มรูปอุปกรณ์`.
- `คำอธิบาย`: textarea, placeholder for length, accessories, or installation details.

### Actions

- `ยกเลิก`: closes overlay.
- `บันทึกอุปกรณ์`: currently closes overlay; no persistence is implemented.

## Overlay: Bluetooth Connect

### Recommended Device

- Recommended name: `NanoIMU`.
- Service UUID: `19b10000-e8f2-537e-4f6c-d104768a1214`.
- Characteristic UUID: `19b10001-e8f2-537e-4f6c-d104768a1214`.

### Known Devices

- Lists devices returned by `navigator.bluetooth.getDevices()`.
- NanoIMU devices are sorted first.
- Each row shows device name, support label, id/detail text, and a selected checkmark if connected.
- Empty state:
  - `ยังไม่มีอุปกรณ์ที่อนุญาตไว้ กดค้นหาเพื่อเปิดหน้าต่างของเบราว์เซอร์`
- Refresh button calls `refreshKnownDevices`.

### Connection Actions

- `NanoIMU`: requests devices filtered by exact name or name prefix `NanoIMU`.
- `ทั้งหมด`: requests all Bluetooth devices with optional services.
- If connected, a separate `ตัดการเชื่อมต่อ` button is shown.
- Buttons are disabled when pending, unsupported, or iOS unsupported.

### Unsupported Platform Handling

- Unsupported browsers show:
  - `Web Bluetooth ต้องใช้ Chrome/Edge บน localhost หรือ HTTPS`
- iPhone/iPad unsupported flow explains:
  - Safari on iOS does not support direct Web Bluetooth.
  - Current workaround: use a Web Bluetooth bridge browser such as WebBLE or Bluefy.
  - More stable alternative: build a native iOS app using CoreBluetooth.

## Bluetooth And NanoIMU Data

### Parsed Payload Format

- Raw string format:
  - `IMU,t,ax,ay,az,gx,gy,gz,pressure`
- Parser requires:
  - Exactly 9 comma-separated fields.
  - First field must be `IMU`.
  - Timestamp and all 7 numeric payload values must be finite.
- Parsed sample fields:
  - `device`: `NanoIMU`
  - `timestamp_ms`
  - `accel.x`, `accel.y`, `accel.z`
  - `gyro.x`, `gyro.y`, `gyro.z`
  - `pressure`
  - `raw`

### Bluetooth Metrics

- `packetCount`: increments for every valid notification sample.
- `badPacketCount`: increments when a notification payload cannot be parsed.
- `latestSample`: updated by initial characteristic read and subsequent notifications.
- `knownDevices`: browser-authorized devices from `getDevices()`.
- Pending state is true during `searching` or `connecting`.

## Biofeedback Metrics

### Input Cleaning

- Filters samples to finite timestamp, accelerometer, and gyroscope values.
- Sorts samples by `timestamp_ms`.
- Converts acceleration magnitude to g using gravity constant `9.80665 m/s²`.
- Computes gyro magnitude in degrees per second from the 3 gyro axes.

### Plant And Gait Detection

- Default plant gyro threshold: `20 dps`.
- Default refractory period: `220 ms`.
- Swing axis is selected as the gyro axis with the highest standard deviation.
- Strict plant detection uses:
  - Entry into still band or local swing valley.
  - Nearby impact from acceleration magnitude.
  - Refractory spacing.
- If strict plants are insufficient, fallback detection uses swing peaks.
- Valid cycle times are kept between `300 ms` and `3000 ms`.

### Calculated Movement Metrics

- `sampleCount`: number of cleaned samples.
- `durationMs`: last timestamp minus first timestamp.
- `swingAxis`: dominant gyro axis (`x`, `y`, or `z`).
- `gyroMagnitudeDps`: latest gyro magnitude.
- `accelMagnitudeG`: latest acceleration magnitude in g.
- `plants`: detected plant timestamps.
- `cycleTimeMs`: mean of the latest 8 valid cycle times.
- `cadenceSpm`: `60000 / cycleTimeMs`.
- `dutyFactorPercent`: mean planted-time ratio across latest cycles.
- `rhythmScore`: combines symmetry and consistency:
  - `100 * (0.6 * symmetryRatio + 0.4 * consistency)`
- `symmetryRatio`: smaller alternating-cycle mean divided by larger alternating-cycle mean.
- `consistency`: inverse average coefficient of variation between alternating cycle groups.

### Pressure And Load Metrics

- Default pressure tare: `101325 Pa`.
- Default baseline pressure delta: `7730 Pa`.
- Pressure delta uses the median of the latest 3 valid pressure deltas.
- `loadPercent`: `(pressureDeltaPa / baselinePressureDeltaPa) * 100`, clamped to `0 - 200`.
- Default target load: `60%`.
- `loadControlPercent`: `100 - abs(loadPercent - targetLoadPercent) * 2`, clamped to `0 - 100`.
- `loadControlLabel`:
  - `กดมากไป` when load exceeds target by more than `15`.
  - `เบาเกินไป` when load is below `max(5, target - 25)`.
  - `อยู่ในเป้าหมาย` otherwise.
- `sessionWeightSupportTrainingLoad`:
  - Calculated from per-cycle peak pressure load.
  - Rewards cycles where peak load is at or below the target load.
  - Uses logarithmic scaling to `0 - 100`.
- `targetCompliancePercent`:
  - Percent of detected cycles whose peak load is at or below target.

### Readiness, Strain, Fatigue, And Confidence

- `activationScore`:
  - Combines motion demand, rhythm penalty, and load demand.
  - Normalized against baseline activation median and MAD.
  - Clamped to `0 - 3`.
- `activationLabel`:
  - `< 1`: `สงบ`
  - `< 2`: `กำลังเดินปกติ`
  - `< 2.7`: `ใช้แรงสูง`
  - otherwise: `ควรชะลอ`
- `gaitReadiness`:
  - Requires a baseline with at least 3 sessions plus rhythm and cadence.
  - Combines rhythm, cadence stability, symmetry, load control, duty factor, and fatigue score.
- `readinessLabel`:
  - `>= 67`: `พร้อมเดิน`
  - `34 - 66`: `เดินแบบระวัง`
  - `< 34`: `พักก่อน`
  - unavailable baseline: `กำลังสร้าง baseline`
- `mobilityStrain`:
  - Log-scaled `0 - 21` score combining walking minutes, high load, asymmetry, high motion, and irregular steps.
- `fatigueSlope`:
  - Requires at least `90` samples.
  - Compares first-third and last-third motion, rhythm drop, load increase, and activation increase.
- `fatigueLabel`:
  - `> 0.66`: `ควรพัก`
  - `> 0.34`: `เริ่มล้า`
  - otherwise: `ยังคงที่`
  - insufficient data: `กำลังอ่าน`
- `confidence`:
  - `sampleCount / 100 + plants / 8 + 0.25 when rhythmScore exists`, clamped to `0 - 1`.

### Action And Recommendation Logic

- `action` priority:
  - Idle -> `Idle`
  - Too few samples/plants -> `เริ่มเก็บข้อมูล`
  - Load above `115%` -> `ลงน้ำหนักมาก`
  - Gyro magnitude above `140 dps` -> `แกว่งมาก`
  - Rhythm below `72` -> `จังหวะไม่สม่ำเสมอ`
  - At least 5 plants -> `เดินต่อเนื่อง`
  - Otherwise -> `กำลังเดิน`
- `recommendation` priority:
  - Idle -> `Idle`
  - Confidence below `0.45` -> `กำลังเก็บข้อมูล เดินต่ออีกเล็กน้อย`
  - Load label `กดมากไป` -> `ลดแรงกดที่ด้ามจับ`
  - Rhythm below `72` -> `ชะลอและรักษาจังหวะให้เท่ากัน`
  - Fatigue label `ควรพัก` -> `พัก 1 นาที ก่อนเดินต่อ`
  - Readiness label `พักก่อน` -> `วันนี้ใช้รอบสั้นและตรวจอุปกรณ์ก่อนเดิน`
  - Otherwise -> `คงจังหวะนี้ไว้`

### Overall Quality

- Averages available component scores:
  - `rhythmScore`
  - `dutyFactorPercent`
  - `sessionWeightSupportTrainingLoad`
- If no component scores are available, quality is `0`.
- Labels:
  - `< 34`: `แย่`
  - `34 - 66`: `ปานกลาง`
  - `>= 67`: `ดีเยี่ยม`

