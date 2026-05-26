/*
 * Moon Walk — Sensor Node firmware (Arduino Nano 33 BLE)
 *
 * Streams the onboard LSM9DS1 IMU (gyro + accel) over BLE notifications so the Python
 * hub (hub.py --ble) can derive gait metrics and fan them to the dashboard.
 *
 * Libraries (install via Library Manager):
 *   - ArduinoBLE
 *   - Arduino_LSM9DS1
 *
 * MULTI-USER: flash each board with a UNIQUE name — change DEVICE_NAME to
 * "MoonWalk-A", "MoonWalk-B", "MoonWalk-C", … one per walker. The hub auto-discovers
 * every "MoonWalk-*" in range.
 *
 * Payload: 12 bytes, little-endian int16 x6 -> gx,gy,gz (0.1 deg/s), ax,ay,az (mg).
 * UUIDs must match GAIT_SERVICE / IMU_CHAR in hub.py.
 */
#include <ArduinoBLE.h>
#include <Arduino_LSM9DS1.h>

#define DEVICE_NAME "MoonWalk-A"   // <-- CHANGE per board: -A, -B, -C ...

BLEService gaitService("9a1e0001-7c4d-4b6f-8b2a-2a1e9a1e0001");
BLECharacteristic imuChar("9a1e0002-7c4d-4b6f-8b2a-2a1e9a1e0002",
                          BLERead | BLENotify, 12);

void setup() {
  Serial.begin(115200);

  if (!IMU.begin()) {
    Serial.println("LSM9DS1 init failed");
    while (1) {}
  }
  if (!BLE.begin()) {
    Serial.println("BLE init failed");
    while (1) {}
  }

  BLE.setLocalName(DEVICE_NAME);
  BLE.setDeviceName(DEVICE_NAME);
  BLE.setAdvertisedService(gaitService);
  gaitService.addCharacteristic(imuChar);
  BLE.addService(gaitService);
  BLE.advertise();

  Serial.print(DEVICE_NAME);
  Serial.println(" advertising…");
}

void loop() {
  BLEDevice central = BLE.central();
  if (!central) return;

  Serial.print("connected: ");
  Serial.println(central.address());

  while (central.connected()) {
    if (IMU.gyroscopeAvailable() && IMU.accelerationAvailable()) {
      float gx, gy, gz, ax, ay, az;
      IMU.readGyroscope(gx, gy, gz);      // deg/s
      IMU.readAcceleration(ax, ay, az);   // g

      int16_t buf[6];
      buf[0] = (int16_t)(gx * 10.0f);     // 0.1 deg/s
      buf[1] = (int16_t)(gy * 10.0f);
      buf[2] = (int16_t)(gz * 10.0f);
      buf[3] = (int16_t)(ax * 1000.0f);   // mg
      buf[4] = (int16_t)(ay * 1000.0f);
      buf[5] = (int16_t)(az * 1000.0f);

      imuChar.writeValue((uint8_t *)buf, sizeof(buf));
    }
  }

  Serial.println("disconnected");
}
