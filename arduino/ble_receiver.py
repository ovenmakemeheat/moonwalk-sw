#!/usr/bin/env python3
"""
ble_receiver.py
---------------------------------------------------------------------------
UNO Q receiver: runs on the UNO Q's Linux (Debian / Qualcomm) side, where the
BLE radio actually lives. Uses `bleak` to scan for the Nano 33 BLE peripheral
named "NanoIMU", subscribe to its IMU characteristic, and print each payload
(raw CSV + parsed values).

Payload format (from nano_imu_ble_sender.ino):
    IMU,timestamp_ms,linAccX,linAccY,linAccZ,velX,velY,velZ,posX,posY,posZ,distance,angleX,angleY,angleZ

Setup (on the UNO Q Linux side):
    pip install bleak
Run:
    python3 ble_receiver.py

Supabase upload is intentionally NOT implemented yet -- see the TODO stub.
---------------------------------------------------------------------------
"""

import asyncio

from bleak import BleakClient, BleakScanner

# ---- Shared BLE contract (must match the sender) ------------------------
DEVICE_NAME = "NanoIMU"
SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214"
CHAR_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214"

# Field names matching the CSV payload, in order, after the leading "IMU" tag.
FIELDS = (
    "timestamp",
    "linAccX", "linAccY", "linAccZ",
    "velX", "velY", "velZ",
    "posX", "posY", "posZ",
    "distance",
    "angleX", "angleY", "angleZ",
)


def handle_payload(raw: str) -> None:
    """Print the raw line and a readable parsed form."""
    print(f"raw: {raw}")
    parts = raw.split(",")
    if not parts or parts[0] != "IMU" or len(parts) != len(FIELDS) + 1:
        # Not a payload line we understand; skip parsing.
        return

    values = parts[1:]  # drop the leading "IMU" tag
    parsed = dict(zip(FIELDS, values))
    print(" ".join(f"{name}={parsed[name]}" for name in FIELDS))

    # TODO(Supabase): forward `parsed` to the gateway / Supabase here.
    # e.g. upload_to_supabase(parsed)


def notification_handler(_characteristic, data: bytearray) -> None:
    """bleak notify callback: decode bytes -> str and dispatch."""
    raw = data.decode("utf-8", errors="replace").strip()
    handle_payload(raw)


async def run_once() -> None:
    """Scan -> connect -> subscribe -> stream until disconnect."""
    print("scanning...")
    device = await BleakScanner.find_device_by_name(DEVICE_NAME, timeout=15.0)
    if device is None:
        print(f"{DEVICE_NAME} not found")
        return
    print(f"found {DEVICE_NAME} ({device.address})")

    # Event set by bleak when the peripheral drops the link.
    disconnected = asyncio.Event()

    def on_disconnect(_client: BleakClient) -> None:
        disconnected.set()

    async with BleakClient(device, disconnected_callback=on_disconnect) as client:
        print("connected")
        await client.start_notify(CHAR_UUID, notification_handler)
        print("subscribed")

        # Block here until the peripheral disconnects.
        await disconnected.wait()

    print("disconnected / reconnecting")


async def main() -> None:
    # Reconnect loop: keep trying so a power cycle of the Nano recovers cleanly.
    while True:
        try:
            await run_once()
        except Exception as exc:
            print(f"error: {exc} (retrying)")
        await asyncio.sleep(2.0)


# TODO(Supabase): implement the real upload path once a gateway is chosen.
# def upload_to_supabase(sample: dict) -> None:
#     """Insert one parsed IMU sample into Supabase. Not implemented yet."""
#     raise NotImplementedError


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nstopped")
