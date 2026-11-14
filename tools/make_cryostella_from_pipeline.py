"""Turn the pipeline's comet spectrum into Cryostella's data format.

Reads  site/data/3i_atlas_spectrum.json   (written by Elisabetta's pipeline)
Writes site/data/cryostella/3i-atlas-aug.json and 3i-atlas-dec.json
       (format: docs/cryostella-data.md)

The pipeline file is left as it is. Re-run this after the pipeline writes a new spectrum:
    python tools/make_cryostella_from_pipeline.py

Honest rules: every measured image becomes one point, detected or not; nothing is smoothed
or binned; no bump or dip is marked until the team has checked it against published work.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "site" / "data" / "3i_atlas_spectrum.json"
OUT = ROOT / "site" / "data" / "cryostella"

CHAPTERS = {
    # (id, name, when, in the game). August is mostly "not detected", so it is not a fair
    # "comet with bumps" round in the Name that spectrum game.
    "Aug": ("3i-atlas-aug", "Comet 3I/ATLAS, August 2025", "August 2025", False),
    "Dec": ("3i-atlas-dec", "Comet 3I/ATLAS, December 2025", "December 2025", True),
}


def points(entries):
    pts = []
    for e in entries:
        v, w = e.get("flux_mjysr"), e.get("wavelength_um")
        # Left out: brightness not measured, or no wavelength recorded for this image.
        if not all(isinstance(x, (int, float)) and math.isfinite(x) for x in (v, w)):
            continue
        err = e.get("flux_err_mjysr")
        pts.append({
            "wavelength_um": round(w, 4),
            "value": round(v, 4),
            "error": round(err, 4) if isinstance(err, (int, float)) and math.isfinite(err) else None,
            "n_images": 1,
        })
    return sorted(pts, key=lambda p: p["wavelength_um"])


def main():
    src = json.loads(SRC.read_text(encoding="utf-8"))
    for key, (sid, name, when, in_game) in CHAPTERS.items():
        entries = src["chapters"].get(key, [])
        pts = points(entries)
        skipped = len(entries) - len(pts)
        detected = sum(1 for e in entries if e.get("status") in ("clear", "faint"))
        spec = {
            "id": sid,
            "name": name,
            "kind": "comet",
            "placeholder": False,
            "release": src.get("release"),
            "ra": None,
            "dec": None,
            "unit": "MJy/sr",
            "summary": (
                f"SPHEREx observed comet 3I/ATLAS in {len(entries)} images in {when}. "
                f"Each point is one image, measured at the comet's predicted position from orbit calculations. "
                f"The comet is seen clearly or faintly in {detected} of them."
                + (f" {skipped} {'image' if skipped == 1 else 'images'} with no measured brightness or no recorded"
                   f" wavelength {'is' if skipped == 1 else 'are'} left out." if skipped else "")
            ),
            "explain": (
                "Each point is the brightness in one picture, at that picture's colour (wavelength). "
                "The brightness is the mean surface brightness above the local background inside a small circle "
                "on the comet, not the comet's total brightness. Every picture is a different colour and was taken "
                "on a different day, so a change from one point to the next is not automatically a real change."
            ),
            "story": None,
            "game": in_game,
            "features": [],
            "points": pts,
        }
        (OUT / f"{sid}.json").write_text(json.dumps(spec, indent=1, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
        print(f"{sid}: {len(pts)} points ({skipped} left out)")


if __name__ == "__main__":
    main()
