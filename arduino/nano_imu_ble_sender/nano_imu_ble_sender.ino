/*
 * nano_imu_ble_sender.ino
 * --------------------------------------------------------------------------
 * Arduino Nano 33 BLE (original gen, LSM9DS1 IMU) -> BLE peripheral.
 *
 * Keeps the original motion-estimation pipeline (calibration, deadband,
 * zero-velocity update, velocity/position/distance/angle integration) and
 * ALSO notifies the result as one compact CSV line over BLE every 50 ms.
 * A BLE central (the UNO Q Linux-side receiver in ble_receiver.py) subscribes
 * and prints/parses it.
 *
 * Payload (single CSV line):
 *   IMU,timestamp_ms,linAccX,linAccY,linAccZ,velX,velY,velZ,posX,posY,posZ,distance,angleX,angleY,angleZ
 *
 * NOTE: velocity / position / distance come from double-integrating noisy
 * accelerometer data. They DRIFT and are experimental, not trusted metrics.
 *
 * Libraries (install via Library Manager): Arduino_LSM9DS1, ArduinoBLE.
 * Board: "Arduino Nano 33 BLE".
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

// ---- BLE objects ---------------------------------------------------------
BLEService imuService(SERVICE_UUID);
// CSV line of 15 numbers can grow past the default 20-byte notification, so we
// size generously (200). Most central stacks (incl. bleak/BlueZ) negotiate a
// larger ATT MTU, so the whole line fits in one notification.
BLEStringCharacteristic imuChar(CHAR_UUID, BLERead | BLENotify, 200);

// baseline offset
float accOffsetX = 0, accOffsetY = 0, accOffsetZ = 0;

// velocity
float velX = 0, velY = 0, velZ = 0;

// position
float posX = 0, posY = 0, posZ = 0;

// total distance
float totalDistance = 0;

// gyro angle
float angleX = 0, angleY = 0, angleZ = 0;

unsigned long prevMicros = 0;
unsigned long lastPrintMs = 0;

const float ACC_DEADBAND = 0.08;  // m/s^2
const float ACC_STILL = 0.15;     // m/s^2
const float GYRO_STILL = 2.0;     // deg/s

int stillCount = 0;

float applyDeadband(float value, float threshold) {
  if (abs(value) < threshold) return 0;
  return value;
}

void calibrateIMU() {
  Serial.println("Calibrating... keep board still");

  const int samples = 300;
  const unsigned long timeoutMs = 10000;   // safety: don't loop forever

  float sumX = 0, sumY = 0, sumZ = 0;
  int count = 0;
  unsigned long startMs = millis();

  while (count < samples && millis() - startMs < timeoutMs) {
    float ax, ay, az;
    if (IMU.accelerationAvailable()) {
      IMU.readAcceleration(ax, ay, az);
      sumX += ax * G;
      sumY += ay * G;
      sumZ += az * G;
      count++;
      delay(10);
    }
  }

  if (count == 0) {
    // No accelerometer data at all -> clear diagnostics, then halt.
    Serial.println("Calibration failed: no accelerometer data");
    Serial.println("Check: board = Arduino Nano 33 BLE, Arduino_LSM9DS1 library, wiring/board health");
    while (1) { delay(1000); }
  }

  accOffsetX = sumX / count;
  accOffsetY = sumY / count;
  accOffsetZ = sumZ / count;

  Serial.print("Calibration done, samples = ");
  Serial.println(count);
}

void resetMotion() {
  velX = velY = velZ = 0;
  posX = posY = posZ = 0;
  totalDistance = 0;
  angleX = angleY = angleZ = 0;
  stillCount = 0;
}

void setup() {
  Serial.begin(115200);
  // Bounded wait for Serial so the board still runs headless (battery / powered
  // by the gateway with no Serial Monitor attached).
  unsigned long t0 = millis();
  while (!Serial && millis() - t0 < 3000);

  // ---- IMU init ----------------------------------------------------------
  if (!IMU.begin()) {
    Serial.println("IMU init FAILED");
    Serial.println("Check board type / Arduino_LSM9DS1 library / Tools > Board");
    while (1) { delay(1000); }
  }
  Serial.println("IMU init OK");

  calibrateIMU();
  resetMotion();

  // ---- BLE init ----------------------------------------------------------
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

  prevMicros = micros();
  lastPrintMs = millis();

  // CSV header (matches the BLE payload field order) for serial debugging.
  Serial.println("IMU,timestamp_ms,linAccX,linAccY,linAccZ,velX,velY,velZ,posX,posY,posZ,distance,angleX,angleY,angleZ");
}

void loop() {
  // Track connection state so we can log connect / disconnect transitions.
  static bool wasConnected = false;
  BLEDevice central = BLE.central();
  bool isConnected = central && central.connected();

  if (isConnected && !wasConnected) {
    Serial.print("central connected: ");
    Serial.println(central.address());
  } else if (!isConnected && wasConnected) {
    Serial.println("central disconnected");
  }
  wasConnected = isConnected;

  float ax, ay, az;
  float gx, gy, gz;

  // Send 'r' over Serial to reset motion estimates.
  if (Serial.available()) {
    char c = Serial.read();
    if (c == 'r') {
      resetMotion();
      Serial.println("RESET");
    }
  }

  // Run the motion estimator as fast as IMU data is available.
  if (IMU.accelerationAvailable() && IMU.gyroscopeAvailable()) {
    IMU.readAcceleration(ax, ay, az);
    IMU.readGyroscope(gx, gy, gz);

    unsigned long nowMicros = micros();
    float dt = (nowMicros - prevMicros) / 1000000.0;
    prevMicros = nowMicros;

    if (dt <= 0 || dt > 0.2) return;

    // acceleration: g -> m/s^2 then subtract baseline offset
    float linAccX = ax * G - accOffsetX;
    float linAccY = ay * G - accOffsetY;
    float linAccZ = az * G - accOffsetZ;

    linAccX = applyDeadband(linAccX, ACC_DEADBAND);
    linAccY = applyDeadband(linAccY, ACC_DEADBAND);
    linAccZ = applyDeadband(linAccZ, ACC_DEADBAND);

    float accMag = sqrt(
      linAccX * linAccX +
      linAccY * linAccY +
      linAccZ * linAccZ
    );

    float gyroMag = sqrt(
      gx * gx +
      gy * gy +
      gz * gz
    );

    bool isStill = accMag < ACC_STILL && gyroMag < GYRO_STILL;

    if (isStill) {
      stillCount++;
      // Zero-velocity update: kill drift after sustained stillness.
      if (stillCount > 10) {
        velX = 0;
        velY = 0;
        velZ = 0;
      }
    } else {
      stillCount = 0;
    }

    // displacement
    float dx = velX * dt + 0.5 * linAccX * dt * dt;
    float dy = velY * dt + 0.5 * linAccY * dt * dt;
    float dz = velZ * dt + 0.5 * linAccZ * dt * dt;

    posX += dx;
    posY += dy;
    posZ += dz;

    totalDistance += sqrt(dx * dx + dy * dy + dz * dz);

    // velocity
    velX += linAccX * dt;
    velY += linAccY * dt;
    velZ += linAccZ * dt;

    // gyro angle integration
    angleX += gx * dt;
    angleY += gy * dt;
    angleZ += gz * dt;

    // Every 50 ms: format payload, notify over BLE (if connected), echo Serial.
    unsigned long nowMs = millis();
    if (nowMs - lastPrintMs >= PRINT_INTERVAL_MS) {
      lastPrintMs = nowMs;

      char payload[200];
      snprintf(payload, sizeof(payload),
               "IMU,%lu,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.4f,%.2f,%.2f,%.2f",
               nowMs,
               linAccX, linAccY, linAccZ,
               velX, velY, velZ,
               posX, posY, posZ,
               totalDistance,
               angleX, angleY, angleZ);

      if (isConnected) {
        imuChar.writeValue(payload);   // BLE notify to subscribed central
      }
      Serial.println(payload);         // local debug echo
    }
  }
}
