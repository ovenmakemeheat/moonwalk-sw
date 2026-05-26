#!/usr/bin/env python3
"""Moon Walk real-time hub.

Connects one or more Nano 33 BLE "MoonWalk-*" devices over BLE, derives per-walker
gait metrics (cadence via Stick-Cycle detection), and fans everything out to the
dashboard over a single local WebSocket (ADR-0007).

Two modes:
  python hub.py --simulate 3     # no hardware: 3 synthetic walkers
  python hub.py --ble            # connect to every "MoonWalk-*" Nano in range

WebSocket messages (JSON, to ws://localhost:8765):
  {"type":"roster","walkers":["A","B",...]}
  {"type":"sample","walker":"A","t":<ms>,"gz":<deg/s>}          # ~50-100 Hz
  {"type":"metrics","walker":"A","t":<ms>,"cadence":<cyc/min>,"cycles":<n>}

The gait logic (CycleDetector) is identical in both modes — only the data source
differs. In --simulate the input is a synthetic gyro sine at a known cadence, so the
detector genuinely recovers it; the demo data is fake, the pipeline is real.
"""
import argparse, asyncio, json, math, random, struct, time
from collections import deque

import websockets

# ---- BLE GATT identifiers (must match the .ino firmware) ----
GAIT_SERVICE = "9a1e0001-7c4d-4b6f-8b2a-2a1e9a1e0001"
IMU_CHAR     = "9a1e0002-7c4d-4b6f-8b2a-2a1e9a1e0002"

PORT = 8765
CLIENTS: set = set()
ROSTER: list = []


def broadcast(msg: dict):
    if CLIENTS:
        websockets.broadcast(CLIENTS, json.dumps(msg))


async def ws_handler(ws):
    CLIENTS.add(ws)
    try:
        await ws.send(json.dumps({"type": "roster", "walkers": ROSTER}))
        async for _ in ws:          # we don't expect inbound messages; just hold open
            pass
    finally:
        CLIENTS.discard(ws)


class CycleDetector:
    """Counts Stick Cycles from one swing-axis gyro channel and estimates cadence.

    Pure logic over a (t_ms, value) stream: a hysteresis threshold crossing marks one
    cycle; cadence = rolling mean of 60000 / inter-cycle interval. A refractory period
    rejects double-counts. Thresholds are in deg/s and may need tuning per real IMU.
    """
    def __init__(self, hi=45.0, lo=-45.0, refractory_ms=220):
        self.hi, self.lo, self.refractory = hi, lo, refractory_ms
        self.armed = True
        self.last_cross = None
        self.count = 0
        self._cad = deque(maxlen=8)

    def update(self, t_ms: float, v: float):
        if self.armed and v > self.hi:
            self.armed = False
            if self.last_cross is not None:
                dt = t_ms - self.last_cross
                if dt > self.refractory:
                    self._cad.append(60000.0 / dt)
                    self.count += 1
                    self.last_cross = t_ms
            else:
                self.last_cross = t_ms
                self.count += 1
        elif not self.armed and v < self.lo:
            self.armed = True

    @property
    def cadence(self) -> float:
        return sum(self._cad) / len(self._cad) if self._cad else 0.0


# --------------------------------------------------------------------------- simulate
async def run_simulate(n: int):
    ids = [chr(ord("A") + i) for i in range(n)]
    ROSTER[:] = ids
    walkers = []
    for i, wid in enumerate(ids):
        walkers.append({
            "id": wid,
            "amp": 140 + random.uniform(-15, 15),     # gyro swing amplitude (deg/s)
            "base": 54 - i * 6,                         # each walker a bit slower; last = "altered"
            "phase": random.uniform(0, 2 * math.pi),
            "det": CycleDetector(),
        })
    print(f"[simulate] {n} walkers: {', '.join(ids)}")
    t0 = time.time()
    k = 0
    while True:
        now = time.time() - t0
        now_ms = now * 1000.0
        k += 1
        for w in walkers:
            cad = w["base"] + 4 * math.sin(now / 7)     # slow natural wander
            f = cad / 60.0
            v = w["amp"] * math.sin(2 * math.pi * f * now + w["phase"]) + random.gauss(0, 7)
            w["det"].update(now_ms, v)
            broadcast({"type": "sample", "walker": w["id"], "t": round(now_ms), "gz": round(v, 1)})
        if k % 12 == 0:                                  # ~4 Hz metrics
            for w in walkers:
                broadcast({"type": "metrics", "walker": w["id"], "t": round(now_ms),
                           "cadence": round(w["det"].cadence, 1), "cycles": w["det"].count})
        await asyncio.sleep(0.02)                         # 50 Hz


# -------------------------------------------------------------------------------- BLE
async def run_ble():
    from bleak import BleakScanner, BleakClient

    print("[ble] scanning for MoonWalk-* devices (5s)…")
    found = await BleakScanner.discover(timeout=5.0)
    targets = [d for d in found if d.name and d.name.startswith("MoonWalk")]
    if not targets:
        print("[ble] none found. Flash the firmware, power the Nano, retry. "
              "Tip: run `python hub.py --simulate 3` to build the dashboard meanwhile.")
        return
    ROSTER[:] = [d.name.split("-")[-1] for d in targets]
    print(f"[ble] connecting: {', '.join(d.name for d in targets)}")
    await asyncio.gather(*(handle_device(d) for d in targets))


async def handle_device(d):
    from bleak import BleakClient
    wid = d.name.split("-")[-1]
    det = CycleDetector()

    def on_notify(_, data: bytearray):
        # 12 bytes, little-endian int16 x6: gx,gy,gz (0.1 deg/s), ax,ay,az (mg)
        gx, gy, gz, ax, ay, az = struct.unpack("<6h", bytes(data[:12]))
        t_ms = time.time() * 1000.0
        v = gz / 10.0
        det.update(t_ms, v)
        broadcast({"type": "sample", "walker": wid, "t": round(t_ms), "gz": round(v, 1)})

    try:
        async with BleakClient(d) as client:
            await client.start_notify(IMU_CHAR, on_notify)
            print(f"[ble] {d.name} connected")
            while client.is_connected:
                broadcast({"type": "metrics", "walker": wid, "t": round(time.time() * 1000),
                           "cadence": round(det.cadence, 1), "cycles": det.count})
                await asyncio.sleep(0.25)
    except Exception as e:
        print(f"[ble] {d.name} error: {e}")


async def main():
    ap = argparse.ArgumentParser(description="Moon Walk real-time hub")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--simulate", type=int, metavar="N", help="N synthetic walkers, no hardware")
    g.add_argument("--ble", action="store_true", help="connect to MoonWalk-* Nano 33 BLE devices")
    ap.add_argument("--port", type=int, default=PORT)
    args = ap.parse_args()

    async with websockets.serve(ws_handler, "0.0.0.0", args.port):
        print(f"[ws] dashboard feed on ws://localhost:{args.port}")
        if args.simulate:
            await run_simulate(args.simulate)
        else:
            await run_ble()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nbye")
