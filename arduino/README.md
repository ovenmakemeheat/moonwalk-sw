# Nano 33 BLE → UNO Q IMU BLE Prototype

A self-contained Bluetooth Low Energy prototype:

1. **Arduino Nano 33 BLE** (LSM9DS1 IMU) runs the motion-estimation pipeline
   (calibration, deadband, zero-velocity update, velocity/position/distance/angle)
   and **notifies** one compact CSV line over BLE every 50 ms.
2. The **Arduino UNO Q** receives the data on its **Linux side** (`ble_receiver.py`)
   and prints it (raw + parsed).
3. The receiver is structured so it can later forward data to Supabase
   (**TODO hooks only — no upload implemented yet**).

> Separate from the `../hardware/` code, which uses a different sensor (LSM6DSOX
> Modulino) and a wired-UART/Bridge design.

## Files (all at this root)

| File                       | Role                                                            |
| -------------------------- | --------------------------------------------------------------- |
| `nano_imu_ble_sender.ino`  | Nano 33 BLE peripheral: IMU + motion estimation + BLE notify.   |
| `ble_receiver.py`          | UNO Q Linux-side BLE central (Python `bleak`). Prints payloads. |

> The UNO Q's BLE radio is on its **Qualcomm Linux** side, not the STM32 MCU, so
> the receiver is a Python script (not an `ArduinoBLE` central sketch).

## Shared BLE contract (identical in both files)

| Item                | Value                                       |
| ------------------- | ------------------------------------------- |
| Device name         | `NanoIMU`                                   |
| Service UUID        | `19B10000-E8F2-537E-4F6C-D104768A1214`      |
| Characteristic UUID | `19B10001-E8F2-537E-4F6C-D104768A1214`      |
| Properties          | notify + read                               |
| Send interval       | 50 ms (~20 Hz)                              |
| Gravity             | 9.80665 (g → m/s²)                          |

**Payload** (one CSV line):

```
IMU,timestamp_ms,linAccX,linAccY,linAccZ,velX,velY,velZ,posX,posY,posZ,distance,angleX,angleY,angleZ
```

> ⚠️ velocity / position / distance come from double-integrating noisy
> accelerometer data — they **drift** and are experimental, not trusted metrics.
> The deadband + zero-velocity update only slow the drift down.

## Setup & run

### Sender (Nano 33 BLE)
1. Arduino IDE → install **Arduino Mbed OS Nano Boards**.
2. Library Manager: install **Arduino_LSM9DS1** and **ArduinoBLE**.
3. Select board **Arduino Nano 33 BLE**, open `nano_imu_ble_sender.ino`, upload.
   - The IDE may offer to move the file into a matching sketch folder — accept it,
     or open it directly; the code is unchanged either way.
4. Serial Monitor @ **115200**, keep the board still during calibration. Expect:
   `IMU init OK` → `Calibration done` → `BLE init OK` → `BLE advertising started`.
5. Send `r` in the Serial Monitor to reset velocity/position/distance/angle.

### Receiver (UNO Q Linux side)
```bash
pip install bleak
python3 ble_receiver.py
```
Expect: `scanning...` → `found NanoIMU` → `connected` → `subscribed` → payload
lines ~every 50 ms (raw CSV + parsed `linAccX=.. velX=.. ...`).

## Testing plan
1. Upload the sender; confirm the init/calibration/advertising logs and that it
   prints payloads every 50 ms.
2. Run `ble_receiver.py`; confirm scan → connect → subscribe → payload sequence.
3. **Move the Nano** and confirm the values change in the receiver output.
4. Confirm the receiver prints both the raw CSV line and parsed values.

## Future work
- **Supabase upload:** `ble_receiver.py` has a `TODO(Supabase)` hook where a parsed
  sample would be forwarded. No network/database code is implemented yet.
