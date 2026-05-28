"""
MOCK setup-walk loading data — baseline lean (WSFC metric #6)
=============================================================

⚠️  SYNTHETIC DATA — NOT FROM THE SENSOR.
The real capture (data/exports/arduino_*.csv) contains NO per-step walking load
(only ~8 manual squeeze tests), so baseline lean cannot be computed from it. This
script GENERATES a plausible synthetic setup walk so the baseline-lean pipeline
(metric #6) and its downstream (#7 WS compliance, #8 training load) can be
demonstrated end-to-end. Every output row is stamped `source = SYNTHETIC_MOCK`
and written under data/mock/ — it must never be mixed with real exports.

WHAT IT MODELS
--------------
An untrained cane-dependent patient doing a short setup walk. Per-step PEAK cane
load (in dP Pa, same relative scale as the real squeeze tests; absolute kgf is
out of scope — no calibration exists, ADR-0010). The walk contains three kinds of
step, mirroring ADR-0012 model #1's job of recognising non-representative steps:
  - normal      : natural lean, the representative population
  - panic_plant : re-grip / stumble / over-lean spikes  (HIGH outliers)
  - hesitation  : tentative, barely-loaded steps         (LOW outliers)

WHY BASELINE IS AN ML TARGET (ADR-0012 #1), not a fixed percentile
------------------------------------------------------------------
A naive high percentile is inflated by panic_plant spikes -> baseline too high ->
faded target too high -> the therapy UNDER-challenges the patient. A robust /
learned estimator that down-weights non-representative steps recovers the true
baseline. This script reports BOTH so the gap is visible. The robust version here
is a transparent MAD-outlier proxy for model #1 (not the model itself).

CLAIM-SAFETY: relative to the patient's own baseline only; never kgf/N/%BW.
Run:  python mock_baseline_walk.py            # writes data/mock/synthetic_setup_walk.csv
"""
from __future__ import annotations
import csv
import os
import numpy as np

SEED = 42
N_STEPS = 120
MU = 7000.0          # Pa: mean per-step peak of a normal (representative) lean
CV = 0.18            # within-population variability
P_PANIC = 0.06       # fraction of panic-plant / re-grip high outliers
P_HESITATE = 0.06    # fraction of hesitation low outliers
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "mock", "synthetic_setup_walk.csv")


def generate(seed=SEED, n=N_STEPS):
    rng = np.random.default_rng(seed)
    rows = []
    # cadence ~50 cycles/min -> ~1200 ms/step; alternate affected/unaffected sides
    t = 0.0
    for i in range(n):
        r = rng.random()
        if r < P_PANIC:
            kind = "panic_plant"
            peak = rng.normal(1.7 * MU, 0.12 * MU)      # high spike
        elif r < P_PANIC + P_HESITATE:
            kind = "hesitation"
            peak = rng.normal(0.45 * MU, 0.10 * MU)     # barely loaded
        else:
            kind = "normal"
            peak = rng.normal(MU, CV * MU)
        peak = max(0.0, peak)
        side = "affected" if i % 2 == 0 else "unaffected"
        t += rng.normal(1200, 80)                       # step interval, ms
        rows.append({
            "step": i,
            "t_ms": round(t, 1),
            "side": side,
            "kind": kind,
            "peak_dp_pa": round(peak, 1),
            "source": "SYNTHETIC_MOCK",
        })
    return rows


def robust_representative_mask(peaks: np.ndarray) -> np.ndarray:
    """Transparent MAD-outlier proxy for ADR-0012 model #1: keep steps within
    3.0 * MAD of the median (drops panic-plants AND hesitations)."""
    med = np.median(peaks)
    mad = np.median(np.abs(peaks - med)) or 1.0
    return np.abs(peaks - med) <= 3.0 * 1.4826 * mad


def baseline_lean(peaks: np.ndarray, pct=90.0):
    naive = np.percentile(peaks, pct)
    keep = robust_representative_mask(peaks)
    robust = np.percentile(peaks[keep], pct)
    return naive, robust, keep


def main():
    rows = generate()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    peaks = np.array([r["peak_dp_pa"] for r in rows])
    kinds = np.array([r["kind"] for r in rows])
    naive, robust, keep = baseline_lean(peaks)
    n_panic = int((kinds == "panic_plant").sum())
    n_hes = int((kinds == "hesitation").sum())
    dropped = int((~keep).sum())

    print(f"⚠️  SYNTHETIC MOCK DATA — wrote {len(rows)} steps -> {os.path.relpath(OUT)}")
    print(f"   steps: {len(rows)}  (normal {len(rows)-n_panic-n_hes}, panic_plant {n_panic}, hesitation {n_hes})")
    print(f"   per-step peak dP (Pa): min {peaks.min():.0f}  median {np.median(peaks):.0f}  max {peaks.max():.0f}")
    print()
    print("Baseline lean (90th percentile of per-step peaks):")
    print(f"   naive  (all steps)                : {naive:8.0f} Pa")
    print(f"   robust (drop {dropped} non-representative): {robust:8.0f} Pa   <- ADR-0012 #1 target")
    print(f"   inflation from outliers           : {100*(naive-robust)/robust:+.1f}%")
    print()
    print("Downstream effect — week-1 WS target = 60% of baseline (claim-safe % of own baseline):")
    print(f"   from naive  baseline : {0.60*naive:8.0f} Pa  (higher ceiling -> under-challenges)")
    print(f"   from robust baseline : {0.60*robust:8.0f} Pa  (truer ceiling -> correct dose)")
    print()
    print("   (All values RELATIVE — Pa here is the synthetic dP scale, never surfaced as kgf/N/%BW.)")


if __name__ == "__main__":
    main()
