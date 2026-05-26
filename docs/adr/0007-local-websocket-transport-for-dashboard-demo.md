# Use a local WebSocket (not BLE) for the dashboard's data path during the demo

The companion dashboard is built as a **local web app** (React + Vite) running on a
developer **Mac**, and it receives live gait metrics from the Compute Brain over a
**local WebSocket** on the LAN — a Python `websockets` server on the UNO Q Linux side
emits JSON gait events; the browser consumes them with the native `WebSocket` API. This
**deviates from Module 8 / US-5**, which describe the companion app pairing with the
User's phone **over BLE** (a hand-rolled GATT server via BlueZ/`bleak`).

**Why.** The PRD itself flags hand-rolled BLE GATT to the phone as a **top known risk**
("not covered by UNO Q docs ... must be hand-rolled"). For the demo's purpose — showing
the `sense → classify → dashboard → cue → action` loop and the Baseline/Drift pipeline
live — a LAN WebSocket to a Mac browser is dramatically lower-risk, faster to build, and
keeps **all gait/health data local** (UNO Q ↔ Mac, no cloud), so [ADR-0003]'s privacy
posture is fully preserved. The dashboard front-end stays static and Vercel-deployable
later, but health data never transits a cloud backend.

## Status

accepted (demo scope). BLE-to-phone (Module 8 / US-5) remains the **eventual target**
for the shipped product; this WebSocket path does not retire it.

## Consequences

- The UNO Q Linux side runs a small `websockets` server bound to the LAN; the Mac
  browser connects directly. No phone and no hand-rolled GATT for the demo.
- The data contract is a JSON gait-event schema over the socket (the same metrics the
  BLE GATT characteristics would later carry), so swapping the transport to BLE later
  is a transport change, not a data-model change.
- The dashboard must run over the LAN/local network only; it must not be exposed to the
  internet, since the gait stream is health data ([ADR-0003]).

[ADR-0003]: ./0003-add-see-and-speak-assistive-layer.md
