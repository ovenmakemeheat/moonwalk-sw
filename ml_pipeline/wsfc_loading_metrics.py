"""
WSFC Loading Metrics 5–8 — squeeze-test pipeline
==================================================

This script computes WSFC metrics 5 (Handle Load), 6 (Baseline Lean), 7 (WS Target
Compliance), and 8 (Session Training Load) from the Arduino wide CSV export.

IMPORTANT CAVEAT
----------------
The `A.pressure_pa` channel in the current capture contains NO per-step walking load.
The only transduced load events are ~8 isolated **manual squeeze/lean-hold test events**
(the pneumatic bladder working, but not during gait). This script treats each squeeze
event as one loading cycle ("step") to demonstrate the pipeline end-to-end on real
transduced load. **All outputs are labelled: computed from squeeze-test loading events,
not walking steps.**

RELATIVE-ONLY / NO-KGF BOUNDARY
---------------------------------
No bench calibration constants (a, b, c) exist in this repo. Absolute force (kgf, N,
%BW) is OUT OF SCOPE. All load values are expressed as **% of the session's own
baseline** only. Never surface Newtons, kgf, or %BW from this script.

SWAP-IN POINT FOR REAL GAIT DATA
---------------------------------
To make metrics 5–8 gait-valid, replace the event detection block (Step 2, ~lines 90–130)
with a stance-gated, per-step peak sampler: detect gait cycles from the IMU (plant
detection per csv-to-metrics.md Stage 2), then sample one peak dP per stance phase from
the pressure signal. Everything from Step 3 onward is unchanged.

Usage
-----
    python wsfc_loading_metrics.py [path/to/arduino_wide.csv]

Default CSV path: ../data/exports/arduino_wide.csv (relative to this script).

Dependencies: pandas, numpy (stdlib: os, sys, math, pathlib).
"""

from __future__ import annotations

import math
import os
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

# ── Configuration ─────────────────────────────────────────────────────────────
P_TARE = 101_325.0          # Pa — standard atmosphere; mode of cleaned signal agrees to <1 Pa
OUTLIER_FLOOR_PA = 90_000   # Pa — drop sub-ambient startup transients
SMOOTH_WINDOW_SAMPLES = 50  # ~100 ms at 500 Hz
THRESHOLD_PA = 200.0        # Pa — dP above which a loading burst is detected
REFRACTORY_MS = 2_000.0     # ms — min gap between separate squeeze events
BASELINE_PERCENTILE = 90.0  # % — p90 of per-event peak dP defines the baseline lean
WS_TARGET_SCHEDULE = {1: 0.60, 2: 0.50, 3: 0.40, 4: 0.30}  # week: fraction of baseline
DEMO_WEEK = 1               # which week's target to use for metrics 7 & 8


def load_and_clean(csv_path: "str | Path") -> pd.DataFrame:
    """Load the wide CSV and return a cleaned pressure-window DataFrame.

    Returns a DataFrame with columns: _time, t_ms, A.pressure_pa, dP_raw, dP
    (rows restricted to valid, cleaned pressure samples only).
    """
    df = pd.read_csv(csv_path)
    df["_time"] = pd.to_datetime(df["_time"], format="ISO8601", utc=True)
    df = df.sort_values("_time").reset_index(drop=True)
    df["t_ms"] = (df["_time"] - df["_time"].iloc[0]).dt.total_seconds() * 1000.0

    # Drop zero-glitches (15%) and sub-ambient outliers
    P_raw = df["A.pressure_pa"]
    mask = P_raw.notna() & (P_raw > 0) & (P_raw >= OUTLIER_FLOOR_PA)
    df_p = df.loc[mask, ["_time", "t_ms", "A.pressure_pa"]].copy().reset_index(drop=True)

    # dP = max(0, P - P_tare), smoothed with ~100 ms rolling median
    df_p["dP_raw"] = np.maximum(0.0, df_p["A.pressure_pa"] - P_TARE)
    df_p["dP"] = (
        df_p["dP_raw"]
        .rolling(SMOOTH_WINDOW_SAMPLES, min_periods=1, center=True)
        .median()
    )
    return df_p


def detect_events(df_p: pd.DataFrame) -> list[dict]:
    """Detect discrete loading bursts and return one peak-dP record per event.

    Each record: {event_num, t_start_ms, t_end_ms, peak_dP, n_samples, duration_s}

    ── SWAP-IN POINT FOR GAIT DATA ──────────────────────────────────────────────
    Replace this function body with a per-step stance-gated sampler:
      1. Detect gait-cycle plants from IMU (csv-to-metrics.md Stage 2).
      2. For each stance phase, find max(dP) within that window.
      3. Return one record per step with peak_dP.
    Everything downstream (compute_metrics) is unchanged.
    ─────────────────────────────────────────────────────────────────────────────
    """
    above = df_p["dP"] > THRESHOLD_PA
    # Label contiguous above-threshold bursts
    df_p = df_p.copy()
    df_p["above"] = above
    df_p["burst_id"] = (above & ~above.shift(1, fill_value=False)).cumsum()
    df_p.loc[~above, "burst_id"] = 0

    burst_stats = (
        df_p[df_p["burst_id"] > 0]
        .groupby("burst_id")
        .agg(t_start_ms=("t_ms", "min"), t_end_ms=("t_ms", "max"), peak_dP=("dP", "max"), n_samples=("dP", "count"))
        .reset_index(drop=True)
        .to_dict("records")
    )

    # Merge bursts separated by less than REFRACTORY_MS (multi-peak squeeze)
    if not burst_stats:
        return []
    merged: list[dict] = []
    cur = burst_stats[0].copy()
    for r in burst_stats[1:]:
        if r["t_start_ms"] - cur["t_end_ms"] < REFRACTORY_MS:
            cur["t_end_ms"] = r["t_end_ms"]
            cur["peak_dP"] = max(cur["peak_dP"], r["peak_dP"])
            cur["n_samples"] += r["n_samples"]
        else:
            merged.append(cur)
            cur = r.copy()
    merged.append(cur)

    for i, ev in enumerate(merged):
        ev["event_num"] = i + 1
        ev["duration_s"] = (ev["t_end_ms"] - ev["t_start_ms"]) / 1000.0
    return merged


def compute_metrics(events: list[dict], demo_week: int = DEMO_WEEK) -> dict:
    """Compute metrics 5–8 from the list of per-event peak_dP records.

    Parameters
    ----------
    events : list of dicts with at least {peak_dP, event_num}.
    demo_week : which week of the WS target schedule to use for metrics 7 & 8.

    Returns
    -------
    dict with all metric values plus per-event detail lists.
    """
    if not events:
        raise ValueError("No loading events detected — cannot compute metrics.")

    peaks = [ev["peak_dP"] for ev in events]
    n = len(peaks)

    # ── Metric 6: Baseline lean ────────────────────────────────────────────────
    baseline_dP = float(np.percentile(peaks, BASELINE_PERCENTILE))

    # ── Metric 5: per-event load% ─────────────────────────────────────────────
    load_pcts = [100.0 * pk / baseline_dP for pk in peaks]
    for ev, lp in zip(events, load_pcts):
        ev["load_pct"] = lp

    # ── Metric 7: WS Target Compliance ────────────────────────────────────────
    target_frac = WS_TARGET_SCHEDULE[demo_week]
    target_dP = target_frac * baseline_dP
    in_band_count = sum(1 for pk in peaks if pk <= target_dP)
    in_band_pct = 100.0 * in_band_count / n
    advance = in_band_pct >= 80.0

    # Full schedule preview
    schedule_results = {}
    for wk, frac in WS_TARGET_SCHEDULE.items():
        tgt = frac * baseline_dP
        ib = sum(1 for pk in peaks if pk <= tgt)
        ib_pct = 100.0 * ib / n
        schedule_results[wk] = {
            "target_frac": frac,
            "target_dP": tgt,
            "in_band_count": ib,
            "in_band_pct": ib_pct,
            "advance": ib_pct >= 80.0,
        }

    # ── Metric 8: Session Training Load ───────────────────────────────────────
    # raw_max = n (all events at load%=0 and all in-band: lean_reduction=1 each)
    raw_max = float(n)
    raw = 0.0
    event_contributions = []
    for ev, lp in zip(events, load_pcts):
        in_band_factor = 1 if ev["peak_dP"] <= target_dP else 0
        lean_reduction = max(0.0, 1.0 - lp / 100.0)
        contrib = lean_reduction * in_band_factor
        raw += contrib
        ev["in_band_factor"] = in_band_factor
        ev["lean_reduction"] = lean_reduction
        ev["stl_contribution"] = contrib
        event_contributions.append(contrib)

    score = 100.0 * math.log(1.0 + raw) / math.log(1.0 + raw_max)

    return {
        # Metric 6
        "baseline_dP_pa": baseline_dP,
        "baseline_percentile": BASELINE_PERCENTILE,
        # Metric 7
        "demo_week": demo_week,
        "target_frac": target_frac,
        "target_dP_pa": target_dP,
        "in_band_count": in_band_count,
        "in_band_pct": in_band_pct,
        "advance": advance,
        "schedule": schedule_results,
        # Metric 8
        "raw_max": raw_max,
        "raw": raw,
        "stl_score": score,
        # Per-event detail
        "n_events": n,
        "peaks_pa": peaks,
        "load_pcts": load_pcts,
        "events": events,
    }


def print_report(m: dict, csv_path: str) -> None:
    """Print a human-readable report of all metric values."""
    SEP = "=" * 70
    divider = "-" * 70

    print(SEP)
    print("WSFC LOADING METRICS 5–8  (squeeze-test pipeline)")
    print("computed from squeeze-test loading events, NOT walking steps")
    print(f"CSV: {csv_path}")
    print(SEP)

    print()
    print("── Step 1: Clean & Tare ─────────────────────────────────────────────")
    print(f"  P_tare          = {P_TARE:.0f} Pa  (standard atmosphere; mode of cleaned signal agrees to <1 Pa)")
    print(f"  Outlier floor   = {OUTLIER_FLOOR_PA} Pa  (drop == 0 and sub-ambient)")
    print(f"  Smooth window   = {SMOOTH_WINDOW_SAMPLES} samples (~100 ms at 500 Hz)")
    print(f"  dP = max(0, P - P_tare), rolling-median smoothed")

    print()
    print("── Step 2: Loading Events ───────────────────────────────────────────")
    print(f"  Detection threshold = {THRESHOLD_PA:.0f} Pa above P_tare")
    print(f"  Refractory gap      = {REFRACTORY_MS:.0f} ms between separate events")
    print(f"  N events detected   = {m['n_events']}")
    print(f"  Sorted peak dP (Pa): {sorted(m['peaks_pa'])}")
    print()
    print("  Per-event detail:")
    for ev in m["events"]:
        print(
            f"    Event {ev['event_num']:2d}: peak_dP={ev['peak_dP']:7.0f} Pa  "
            f"dur={ev['duration_s']:5.1f}s"
        )

    print()
    print(divider)
    print("METRIC 6 — Baseline Lean")
    print(divider)
    print(f"  baseline_dP = p{m['baseline_percentile']:.0f} of per-event peak dP")
    print(f"              = {m['baseline_dP_pa']:.0f} Pa")
    print("  NOTE: derived from {n} squeeze-test events, not a gait walk.".format(n=m["n_events"]))
    print("  Replace with a proper loading-walk capture for a clinical baseline.")

    print()
    print(divider)
    print("METRIC 5 — Handle Load (relative)  [computed from squeeze-test events, not walking steps]")
    print(divider)
    print(f"  load% = 100 × peak_dP / baseline_dP  (relative only; no kgf/N/%BW)")
    print()
    print(f"  {'Event':>6}  {'peak_dP (Pa)':>14}  {'load%':>8}")
    for ev in m["events"]:
        print(f"  {ev['event_num']:>6}  {ev['peak_dP']:>14.0f}  {ev['load_pct']:>8.1f}%")

    print()
    print(divider)
    print("METRIC 7 — Weight Support Target Compliance  [squeeze-test events, not walking steps]")
    print(divider)
    print(f"  Target schedule: week fades {list(WS_TARGET_SCHEDULE.values())} × baseline_dP")
    print(f"  Advance criterion: in_band_% ≥ 80%")
    print()
    print(f"  {'Week':>6}  {'Target (Pa)':>12}  {'Target %':>9}  {'In-band':>9}  {'In-band%':>9}  {'Decision':>10}")
    for wk, res in m["schedule"].items():
        dec = "ADVANCE" if res["advance"] else "HOLD"
        print(
            f"  {wk:>6}  {res['target_dP']:>12.0f}  {res['target_frac']*100:>8.0f}%  "
            f"  {res['in_band_count']}/{m['n_events']:>1}     "
            f"{res['in_band_pct']:>7.1f}%  {dec:>10}"
        )

    print()
    print(divider)
    print("METRIC 8 — Session Training Load  [squeeze-test events, not walking steps]")
    print(divider)
    print(f"  Using week {m['demo_week']} target = {m['target_frac']*100:.0f}% of baseline = {m['target_dP_pa']:.0f} Pa")
    print(f"  raw_max = {m['raw_max']:.1f}  (all {m['n_events']} events at load%=0 and in-band)")
    print()
    print(f"  {'Event':>6}  {'load%':>8}  {'in_band':>8}  {'lean_red':>10}  {'contrib':>8}")
    for ev in m["events"]:
        print(
            f"  {ev['event_num']:>6}  {ev['load_pct']:>7.1f}%  "
            f"  {ev['in_band_factor']:>7}  {ev['lean_reduction']:>10.3f}  {ev['stl_contribution']:>8.3f}"
        )
    print()
    print(f"  raw   = {m['raw']:.4f}")
    print(f"  score = 100 × log(1 + {m['raw']:.4f}) / log(1 + {m['raw_max']:.1f})")
    print(f"        = {m['stl_score']:.2f}  (0–100 scale)")

    print()
    print(SEP)
    print("SUMMARY — real numbers, squeeze-test loading events")
    print(SEP)
    print(f"  N loading events   : {m['n_events']}")
    print(f"  Metric 6  baseline_dP        : {m['baseline_dP_pa']:.0f} Pa  (p90 of {m['n_events']} squeeze peaks)")
    print(f"  Metric 5  load% range        : {min(m['load_pcts']):.1f}% – {max(m['load_pcts']):.1f}%")
    print(f"  Metric 7  in_band (wk1, 60%) : {m['in_band_pct']:.1f}%  → {'ADVANCE' if m['advance'] else 'HOLD'}")
    print(f"  Metric 8  STL score          : {m['stl_score']:.2f} / 100  (raw={m['raw']:.4f})")
    print()
    print("SWAP-IN POINT FOR GAIT-VALID DATA")
    print("  Replace detect_events() (~line 90) with a stance-gated per-step peak")
    print("  sampler driven by IMU plant detection (csv-to-metrics.md Stage 2).")
    print("  compute_metrics() and print_report() are unchanged.")
    print(SEP)


def main(csv_path: Optional[str] = None) -> dict:
    if csv_path is None:
        default = Path(__file__).parent.parent / "data" / "exports" / "arduino_wide.csv"
        csv_path = str(default)
    if not os.path.exists(csv_path):
        sys.exit(f"ERROR: CSV not found at {csv_path}")

    df_p = load_and_clean(csv_path)
    events = detect_events(df_p)
    if not events:
        sys.exit("ERROR: No loading events detected. Check threshold or data.")
    m = compute_metrics(events)
    print_report(m, csv_path)
    return m


if __name__ == "__main__":
    csv_arg = sys.argv[1] if len(sys.argv) > 1 else None
    main(csv_arg)
