/*
 * wsfc_load_feedback.ino
 * --------------------------------------------------------------------------
 * Moon Walk — WSFC real-time Handle Load biofeedback (self-contained, Nano-only)
 *
 * Flagship application (CONTEXT.md / ADR-0013, ADR-0009, ADR-0010, ADR-0011):
 *   Read Handle Load from the pneumatic bladder (air bladder under the grip ->
 *   onboard LPS22HB barometer), compare each moment's load to the patient's own
 *   Weight Support Target (a ceiling = a fraction of their baseline lean), and
 *   give an IMMEDIATE auditory + visual cue the moment they OVER-LEAN on the cane
 *   (i.e. over-protect the healing limb). Silence + green = loading the leg
 *   correctly. The whole loop runs on the always-on Nano so feedback is instant
 *   and works fully offline.
 *
 * Why auditory-first (research-grounded): for load feedback on a walking aid,
 * auditory cues are the only modality with direct trial evidence (Tamburella
 * et al., Front. Neurol. 2021: instrumented-crutch load tones raised weight-
 * bearing compliance +19.7%, no speed loss, not distracting). A visual cue
 * competes with the user's gaze on the path; the onboard RGB LED is therefore a
 * STATUS light, not the primary walking cue. Tone is kept LOW (presbycusis hits
 * high frequencies first; IEC 60601-1-8 alarm band is ~150-1000 Hz), and the
 * cue is INTERMITTENT + threshold-gated to avoid alarm fatigue (ADR-0011).
 *
 * CLAIM SAFETY (CONTEXT.md): the target is a % of the PATIENT'S OWN baseline
 * cane-dependence. This sketch never knows or surfaces kgf / Newtons / %body-
 * weight. dP (Pa above the session tare) is an internal relative signal only.
 *
 * Hardware:
 *   - Board:   Arduino Nano 33 BLE  (onboard RGB LED, active-LOW: LEDR/LEDG/LEDB)
 *   - Sensor:  LPS22HB barometer    (Arduino_LPS22HB; reads kPa) reading the
 *              pneumatic Handle Load bladder.
 *   - Buzzer:  passive piezo on BUZZER_PIN (plays tones via tone()).
 *
 * Session flow (supervised WSFC tare cadence = once per session, ADR-0010):
 *   1. TARE       — hold the cane in the air (zero load). Blinks BLUE ~2 s,
 *                   averages pressure -> P_tare.
 *   2. CALIBRATE  — lean on the cane normally for ~8 s. Solid CYAN. Captures the
 *                   peak load -> baseline lean. (This is the patient's own
 *                   baseline cane-dependence; the target is a fraction of it.)
 *   3. RUN        — GREEN + silent while in-band; RED + intermittent high tone
 *                   while over-leaning. Target ceiling fades by recovery week.
 *
 * Serial controls (115200 baud) — optional, for bench / demo:
 *   t : re-tare      c : re-calibrate baseline
 *   1..4 : set recovery week (target = 60/50/40/30% of baseline — the fading
 *          schedule from ml_pipeline/wsfc_loading_metrics.py)
 *   ?  : print status
 * --------------------------------------------------------------------------
 */

#include <Arduino_LPS22HB.h>

// --------------------------------------------------------------------------
// Tunables
// --------------------------------------------------------------------------

// Output pin for the passive piezo buzzer (any digital pin; uses tone()).
const int BUZZER_PIN = 9;

// Onboard RGB LED is active-LOW on the Nano 33 BLE (LOW = on).
const int LED_ON  = LOW;
const int LED_OFF = HIGH;

// Init recovery (mirrors nano_imu_ble_sender.ino): retry, then reboot a dead
// sensor so a transient power-up fault self-recovers unattended.
const unsigned long INIT_RETRY_MS     = 1000;
const unsigned int  INIT_MAX_ATTEMPTS = 10;

// Tare: average pressure with the cane held in the air (zero load).
const unsigned long TARE_MS = 2000;

// Calibrate: capture the peak load while the patient leans normally.
const unsigned long CAL_MS = 8000;
// Sanity floor: a baseline lean below this (Pa above tare) is implausibly small
// (bladder not loaded / not connected) — re-prompt instead of accepting it.
const float BASELINE_MIN_DP_PA = 100.0;

// Weight Support Target = TARGET schedule fraction x baseline lean. The Clinician
// fades the ceiling as the injury heals; these are the same fractions as the
// Python pipeline's WS_TARGET_SCHEDULE (week 1..4).
const float WEEK_TARGET_FRAC[4] = {0.60f, 0.50f, 0.40f, 0.30f};

// Schmitt deadband (ADR-0011): enter "over-lean" above the target; only clear it
// once load drops a margin below, so a load hovering on the line does not chatter.
const float HYST_FRAC = 0.10f;            // clear at target * (1 - HYST_FRAC)

// Min on / min off so a brief excursion still gives a clear cue and a brief dip
// does not cut the cue off mid-beep (ADR-0011 anti-chatter).
const unsigned long MIN_CUE_ON_MS  = 300;
const unsigned long MIN_CUE_OFF_MS = 200;

// Intermittent over-lean tone: beep-pause-beep, never a continuous alarm.
const unsigned int  OVER_TONE_HZ = 900;   // low band, audible with presbycusis
const unsigned long BEEP_ON_MS   = 150;
const unsigned long BEEP_OFF_MS  = 150;

// --------------------------------------------------------------------------
// State
// --------------------------------------------------------------------------

enum Mode { MODE_TARE, MODE_CALIBRATE, MODE_RUN };
Mode mode = MODE_TARE;

float pTarePa     = 0.0f;   // session zero-load reference (Pa)
float baselineDp  = 0.0f;   // baseline lean: peak load over calibration (Pa above tare)
int   week        = 1;      // recovery week -> target fraction

bool          overLean      = false;   // Schmitt state
unsigned long cueChangedMs  = 0;       // last over-lean state transition

// --------------------------------------------------------------------------
// Pressure helpers (LPS22HB returns kPa; we work in Pa above the session tare)
// --------------------------------------------------------------------------

float readPressurePa() {
  return BARO.readPressure() * 1000.0f;  // kPa -> Pa
}

// Load relative to the session tare. Clamped at 0: sub-tare drift is "no load".
float readLoadDp() {
  float dp = readPressurePa() - pTarePa;
  return dp > 0.0f ? dp : 0.0f;
}

float currentTargetDp() {
  return WEEK_TARGET_FRAC[week - 1] * baselineDp;
}

// --------------------------------------------------------------------------
// RGB status LED (onboard, active-LOW)
// --------------------------------------------------------------------------

void setRgb(bool r, bool g, bool b) {
  digitalWrite(LEDR, r ? LED_ON : LED_OFF);
  digitalWrite(LEDG, g ? LED_ON : LED_OFF);
  digitalWrite(LEDB, b ? LED_ON : LED_OFF);
}

// --------------------------------------------------------------------------
// Sensor init (retry-then-reboot, matching the IMU sketch)
// --------------------------------------------------------------------------

void initBarometer() {
  if (BARO.begin()) {
    return;
  }
  Serial.println("LPS22HB init FAILED");
  Serial.println("Check: Arduino_LPS22HB library + LPS22HB present (Nano 33 BLE Sense or external module)");
  for (unsigned int attempt = 1; !BARO.begin(); attempt++) {
    if (attempt >= INIT_MAX_ATTEMPTS) {
      Serial.println("LPS22HB still failing — rebooting");
      delay(100);
      NVIC_SystemReset();
    }
    delay(INIT_RETRY_MS);
  }
}

// --------------------------------------------------------------------------
// TARE — average pressure with the cane in the air (zero load)
// --------------------------------------------------------------------------

void runTare() {
  Serial.println("TARE: hold the cane in the air (no load)...");
  double sum = 0.0;
  unsigned long n = 0;
  unsigned long t0 = millis();
  unsigned long lastBlink = 0;
  bool on = false;
  while (millis() - t0 < TARE_MS) {
    sum += readPressurePa();
    n++;
    if (millis() - lastBlink >= 200) {   // blink blue = taring
      lastBlink = millis();
      on = !on;
      setRgb(false, false, on);
    }
    delay(10);
  }
  pTarePa = (n > 0) ? (float)(sum / n) : readPressurePa();
  Serial.print("TARE done. P_tare = ");
  Serial.print(pTarePa, 1);
  Serial.println(" Pa");
  mode = MODE_CALIBRATE;
}

// --------------------------------------------------------------------------
// CALIBRATE — capture the patient's baseline lean (peak load over the window)
// --------------------------------------------------------------------------

void runCalibrate() {
  Serial.println("CALIBRATE: lean on the cane as you normally would...");
  float peak = 0.0f;
  unsigned long t0 = millis();
  while (millis() - t0 < CAL_MS) {
    setRgb(false, true, true);           // cyan = calibrating
    float dp = readLoadDp();
    if (dp > peak) {
      peak = dp;
    }
    delay(10);
  }
  if (peak < BASELINE_MIN_DP_PA) {
    Serial.print("CALIBRATE: baseline too low (");
    Serial.print(peak, 1);
    Serial.println(" Pa) — is the bladder loaded? Retrying.");
    // Flash red briefly, then retry calibration (stay in this mode).
    for (int i = 0; i < 3; i++) { setRgb(true, false, false); delay(120); setRgb(false, false, false); delay(120); }
    return;                              // mode stays MODE_CALIBRATE
  }
  baselineDp = peak;
  Serial.print("CALIBRATE done. baseline lean = ");
  Serial.print(baselineDp, 1);
  Serial.print(" Pa (relative). Target = ");
  Serial.print(WEEK_TARGET_FRAC[week - 1] * 100.0f, 0);
  Serial.print("% -> ");
  Serial.print(currentTargetDp(), 1);
  Serial.println(" Pa. RUN: green=in-band, red+beep=over-leaning.");
  mode = MODE_RUN;
}

// --------------------------------------------------------------------------
// Intermittent over-lean beep (non-blocking)
// --------------------------------------------------------------------------

void beepPattern() {
  static bool toneOn = false;
  static unsigned long lastToggle = 0;
  unsigned long now = millis();
  unsigned long span = toneOn ? BEEP_ON_MS : BEEP_OFF_MS;
  if (now - lastToggle >= span) {
    lastToggle = now;
    toneOn = !toneOn;
    if (toneOn) {
      tone(BUZZER_PIN, OVER_TONE_HZ);
    } else {
      noTone(BUZZER_PIN);
    }
  }
}

// --------------------------------------------------------------------------
// RUN — real-time compare against the Weight Support Target
// --------------------------------------------------------------------------

void runFeedback() {
  float dp = readLoadDp();
  float target = currentTargetDp();
  unsigned long now = millis();

  // Schmitt deadband + min on/off (ADR-0011) to keep the cue from chattering.
  if (!overLean) {
    if (dp > target && (now - cueChangedMs) >= MIN_CUE_OFF_MS) {
      overLean = true;
      cueChangedMs = now;
    }
  } else {
    if (dp < target * (1.0f - HYST_FRAC) && (now - cueChangedMs) >= MIN_CUE_ON_MS) {
      overLean = false;
      cueChangedMs = now;
    }
  }

  if (overLean) {
    setRgb(true, false, false);   // red = over-leaning on the cane
    beepPattern();                // intermittent high tone: ease off the cane
  } else {
    setRgb(false, true, false);   // green = loading the leg correctly
    noTone(BUZZER_PIN);
  }
}

// --------------------------------------------------------------------------
// Serial controls (optional, for bench / demo)
// --------------------------------------------------------------------------

void handleSerial() {
  if (!Serial.available()) {
    return;
  }
  char c = Serial.read();
  switch (c) {
    case 't':
      noTone(BUZZER_PIN);
      mode = MODE_TARE;
      break;
    case 'c':
      noTone(BUZZER_PIN);
      mode = MODE_CALIBRATE;
      break;
    case '1': case '2': case '3': case '4':
      week = c - '0';
      Serial.print("week ");
      Serial.print(week);
      Serial.print(" -> target ");
      Serial.print(WEEK_TARGET_FRAC[week - 1] * 100.0f, 0);
      Serial.print("% (");
      Serial.print(currentTargetDp(), 1);
      Serial.println(" Pa)");
      break;
    case '?':
      Serial.print("mode=");
      Serial.print((int)mode);
      Serial.print(" P_tare=");
      Serial.print(pTarePa, 1);
      Serial.print(" Pa  baseline=");
      Serial.print(baselineDp, 1);
      Serial.print(" Pa  week=");
      Serial.print(week);
      Serial.print("  target=");
      Serial.print(currentTargetDp(), 1);
      Serial.print(" Pa  load=");
      Serial.print(readLoadDp(), 1);
      Serial.println(" Pa");
      break;
    default:
      break;
  }
}

// --------------------------------------------------------------------------
// Setup / loop
// --------------------------------------------------------------------------

void setup() {
  Serial.begin(115200);
  unsigned long t0 = millis();
  while (!Serial && millis() - t0 < 3000) {
    delay(10);
  }

  pinMode(LEDR, OUTPUT);
  pinMode(LEDG, OUTPUT);
  pinMode(LEDB, OUTPUT);
  setRgb(false, false, false);
  pinMode(BUZZER_PIN, OUTPUT);
  noTone(BUZZER_PIN);

  initBarometer();
  Serial.println("LPS22HB init OK — WSFC load feedback");

  mode = MODE_TARE;
}

void loop() {
  handleSerial();
  switch (mode) {
    case MODE_TARE:      runTare();      break;
    case MODE_CALIBRATE: runCalibrate(); break;
    case MODE_RUN:       runFeedback();  break;
  }
}
