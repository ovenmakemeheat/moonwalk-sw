/*
 * nano_imu_ble_sender.ino
 * --------------------------------------------------------------------------
 * Arduino Nano 33 BLE (original gen, LSM9DS1 IMU) -> BLE peripheral.
 *
 * Runs a motion-estimation pipeline (calibration, deadband, zero-velocity
 * update, velocity/position/distance/angle integration) and notifies the
 * result as one compact CSV line over BLE every 50 ms. The UNO Q Linux-side
 * receiver (ble_receiver.py) subscribes and prints/parses it.
 *
 * Payload (single CSV line):
 *   IMU,timestamp_ms,linAccX,linAccY,linAccZ,velX,velY,velZ,posX,posY,posZ,distance,angleX,angleY,angleZ
 *
 * NOTE: velocity / position / distance come from double-integrating noisy
 * accelerometer data. They DRIFT and are experimental, not trusted metrics.
 *
 * Libraries: Arduino_LSM9DS1, ArduinoBLE.  Board: "Arduino Nano 33 BLE".
 * --------------------------------------------------------------------------
 */

#include <Arduino_LSM9DS1.h>   // Nano 33 BLE original gen IMU
#include <ArduinoBLE.h>

// ---- Shared BLE contract (must match the receiver) ----------------------
static const char* DEVICE_NAME  = "NanoIMU";
static const char* SERVICE_UUID = "19B10000-E8F2-537E-4F6C-D104768A1214";
static const char* CHAR_UUID    = "19B10001-E8F2-537E-4F6C-D104768A1214";

const float G = 9.80665;
const unsigned long PRINT_INTERVAL_MS = 50;   // serial echo + BLE notify rate

const float ACC_DEADBAND = 0.08;  // m/s^2
const float ACC_STILL    = 0.15;  // m/s^2
const float GYRO_STILL   = 2.0;   // deg/s

// ---- BLE objects ---------------------------------------------------------
BLEService imuService(SERVICE_UUID);
// A 15-number CSV line exceeds the default 20-byte notification, so size the
// characteristic generously (200). Central stacks (bleak/BlueZ) negotiate a
// larger ATT MTU, so the whole line fits in one notification.
BLEStringCharacteristic imuChar(CHAR_UUID, BLERead | BLENotify, 200);

// ==========================================================================
// Vec3: tiny value type + pure helpers, so per-axis math is written once.
// ==========================================================================
struct Vec3 { float x, y, z; };

Vec3  vadd(Vec3 a, Vec3 b)   { return { a.x + b.x, a.y + b.y, a.z + b.z }; }
Vec3  vsub(Vec3 a, Vec3 b)   { return { a.x - b.x, a.y - b.y, a.z - b.z }; }
Vec3  vscale(Vec3 v, float s){ return { v.x * s, v.y * s, v.z * s }; }
float vmag(Vec3 v)           { return sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }

float applyDeadband(float value, float threshold) {
  if (abs(value) < threshold) return 0;
  return value;
}
Vec3 vdeadband(Vec3 v, float th) {
  return { applyDeadband(v.x, th), applyDeadband(v.y, th), applyDeadband(v.z, th) };
}

// ==========================================================================
// Motion state
// ==========================================================================
Vec3  accOffset  = {0, 0, 0};  // baseline accel removed each sample (m/s^2)
Vec3  lastLinAcc = {0, 0, 0};  // most recent linear accel, for the payload
Vec3  vel        = {0, 0, 0};  // velocity (m/s)
Vec3  pos        = {0, 0, 0};  // position (m)
Vec3  angle      = {0, 0, 0};  // integrated gyro angle (deg)
float totalDistance = 0;
int   stillCount    = 0;

unsigned long prevMicros  = 0;
unsigned long lastPrintMs = 0;

// ==========================================================================
// Setup helpers
// ==========================================================================
void resetMotion() {
  vel = pos = angle = {0, 0, 0};
  totalDistance = 0;
  stillCount = 0;
}

// Collect a stationary accelerometer baseline (with timeout + diagnostics).
void calibrateIMU() {
  Serial.println("Calibrating... keep board still");

  const int samples = 300;
  const unsigned long timeoutMs = 10000;   // safety: don't loop forever

  Vec3 sum = {0, 0, 0};
  int count = 0;
  unsigned long startMs = millis();

  while (count < samples && millis() - startMs < timeoutMs) {
    if (IMU.accelerationAvailable()) {
      float ax, ay, az;
      IMU.readAcceleration(ax, ay, az);          // g
      sum = vadd(sum, vscale({ax, ay, az}, G));  // accumulate in m/s^2
      count++;
      delay(10);
    }
  }

  if (count == 0) {
    Serial.println("Calibration failed: no accelerometer data");
    Serial.println("Check: board = Arduino Nano 33 BLE, Arduino_LSM9DS1 library, wiring/board health");
    while (1) { delay(1000); }
  }

  accOffset = vscale(sum, 1.0 / count);
  Serial.print("Calibration done, samples = ");
  Serial.println(count);
}

void startBle() {
  if (!BLE.begin()) {
    Serial.println("BLE init FAILED");
    while (1) { delay(1000); }
  }
  Serial.println("BLE init OK");

  BLE.setLocalName(DEVICE_NAME);
  BLE.setDeviceName(DEVICE_NAME);
  BLE.setAdvertisedService(imuService);
  imuService.addCharacteristic(imuChar);
  BLE.addService(imuService);
  imuChar.writeValue("IMU,0,0,0,0,0,0,0,0,0,0,0,0,0,0");   // initial value

  BLE.advertise();
  Serial.print("BLE advertising started as \"");
  Serial.print(DEVICE_NAME);
  Serial.println("\"");
}

// ==========================================================================
// loop() helpers
// ==========================================================================

// Poll BLE, log connect/disconnect transitions, return current state.
bool updateConnection() {
  static bool wasConnected = false;
  BLEDevice central = BLE.central();
  bool connected = central && central.connected();

  if (connected && !wasConnected) {
    Serial.print("central connected: ");
    Serial.println(central.address());
  } else if (!connected && wasConnected) {
    Serial.println("central disconnected");
  }
  wasConnected = connected;
  return connected;
}

// 'r' over Serial resets the motion estimates.
void handleSerialReset() {
  if (Serial.available() && Serial.read() == 'r') {
    resetMotion();
    Serial.println("RESET");
  }
}

// Read accel (g) + gyro (deg/s) if both are ready; false otherwise.
bool readImu(Vec3& acc, Vec3& gyro) {
  if (!IMU.accelerationAvailable() || !IMU.gyroscopeAvailable()) return false;
  IMU.readAcceleration(acc.x, acc.y, acc.z);
  IMU.readGyroscope(gyro.x, gyro.y, gyro.z);
  return true;
}

// Seconds elapsed since the previous sample.
float computeDt() {
  unsigned long now = micros();
  float dt = (now - prevMicros) / 1000000.0;
  prevMicros = now;
  return dt;
}

// Zero-velocity update: after sustained stillness, kill velocity drift.
void updateStillness(Vec3 linAcc, Vec3 gyro) {
  bool isStill = vmag(linAcc) < ACC_STILL && vmag(gyro) < GYRO_STILL;
  if (isStill) {
    stillCount++;
    if (stillCount > 10) vel = {0, 0, 0};
  } else {
    stillCount = 0;
  }
}

// Integrate displacement, position, distance, velocity and gyro angle.
void integrateMotion(Vec3 linAcc, Vec3 gyro, float dt) {
  Vec3 d = vadd(vscale(vel, dt), vscale(linAcc, 0.5 * dt * dt));
  pos = vadd(pos, d);
  totalDistance += vmag(d);
  vel = vadd(vel, vscale(linAcc, dt));
  angle = vadd(angle, vscale(gyro, dt));
}

// One estimation step; false if there's no fresh data or dt is out of range.
bool motionStep() {
  Vec3 acc, gyro;
  if (!readImu(acc, gyro)) return false;

  float dt = computeDt();
  if (dt <= 0 || dt > 0.2) return false;

  // g -> m/s^2, remove baseline, then deadband small noise.
  lastLinAcc = vdeadband(vsub(vscale(acc, G), accOffset), ACC_DEADBAND);
  updateStillness(lastLinAcc, gyro);
  integrateMotion(lastLinAcc, gyro, dt);
  return true;
}

// Every 50 ms: format the payload, notify over BLE (if connected), echo Serial.
void maybePublish(bool connected) {
  unsigned long now = millis();
  if (now - lastPrintMs < PRINT_INTERVAL_MS) return;
  lastPrintMs = now;

  char payload[200];
  snprintf(payload, sizeof(payload),
           "IMU,%lu,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.2f,%.2f,%.2f",
           now,
           lastLinAcc.x, lastLinAcc.y, lastLinAcc.z,
           vel.x, vel.y, vel.z,
           pos.x, pos.y, pos.z,
           totalDistance,
           angle.x, angle.y, angle.z);

  if (connected) imuChar.writeValue(payload);   // BLE notify
  Serial.println(payload);                       // local debug echo
}

// ==========================================================================
// Arduino entry points
// ==========================================================================
void setup() {
  Serial.begin(115200);
  // Bounded wait for Serial so the board still runs headless (battery / powered
  // by the gateway with no Serial Monitor attached).
  unsigned long t0 = millis();
  while (!Serial && millis() - t0 < 3000);

  if (!IMU.begin()) {
    Serial.println("IMU init FAILED");
    Serial.println("Check board type / Arduino_LSM9DS1 library / Tools > Board");
    while (1) { delay(1000); }
  }
  Serial.println("IMU init OK");

  calibrateIMU();
  resetMotion();
  startBle();

  prevMicros = micros();
  lastPrintMs = millis();

  // CSV header (matches the BLE payload field order) for serial debugging.
  Serial.println("IMU,timestamp_ms,linAccX,linAccY,linAccZ,velX,velY,velZ,posX,posY,posZ,distance,angleX,angleY,angleZ");
}

void loop() {
  bool connected = updateConnection();
  handleSerialReset();
  if (!motionStep()) return;
  maybePublish(connected);
}
