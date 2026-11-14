"""Write the Cryostella practice spectra (site/data/cryostella/practice-*.json).

These are made-up curves drawn by our own code so the Cryostella page can be built and tested
before real spectra arrive. They are NOT SPHEREx data. The bumps and dips sit at invented
positions and carry no molecule names on purpose: we only name a feature once the team has
checked it against published work (honest rules, section 7).

When Elisabetta's pipeline writes real spectra in the same format (docs/cryostella-data.md),
add them to site/data/cryostella/index.json and these practice files can be dropped.

Run from the repository root:  python tools/make_cryostella_practice.py
"""
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "site" / "data" / "cryostella"
N_POINTS = 60
LOW_UM, HIGH_UM = 0.75, 5.0


def gauss(x, centre, width, depth):
    return depth * math.exp(-0.5 * ((x - centre) / width) ** 2)


def wavelengths():
    step = (HIGH_UM - LOW_UM) / (N_POINTS - 1)
    return [round(LOW_UM + i * step, 3) for i in range(N_POINTS)]


def wobble(i):
    # A fixed, repeatable small wiggle so the curve looks measured, not drawn with a ruler.
    return 0.012 * math.sin(i * 1.7) + 0.008 * math.cos(i * 3.1)


def cloud():
    pts = []
    for i, w in enumerate(wavelengths()):
        base = 0.25 + 0.6 * (w - LOW_UM) / (HIGH_UM - LOW_UM)  # rises towards long wavelengths
        v = base * (1 - gauss(w, 2.3, 0.18, 0.45) - gauss(w, 3.7, 0.12, 0.35)) + wobble(i)
        pts.append({"wavelength_um": w, "value": round(v, 4), "error": round(0.02 + 0.01 * (w > 4), 4), "n_images": 6 + (i % 4)})
    return {
        "id": "practice-cloud",
        "name": "Practice cloud",
        "kind": "ice-source",
        "placeholder": True,
        "release": None,
        "ra": None,
        "dec": None,
        "unit": "relative",
        "summary": "A practice spectrum drawn by our own code, shaped like light passing through a cold, dusty cloud. It is not SPHEREx data.",
        "explain": "Light from a star behind a cold cloud has to pass through the cloud. Ice in the cloud can soak up light at particular colours, which leaves a dip in the graph. In this practice curve the two dips are placed at made-up colours.",
        "story": None,
        "features": [
            {"kind": "dip", "wavelength_um": 2.3, "label": "Practice dip A", "molecule": None, "verified": False, "source": None},
            {"kind": "dip", "wavelength_um": 3.7, "label": "Practice dip B", "molecule": None, "verified": False, "source": None},
        ],
        "points": pts,
    }


def comet():
    pts = []
    for i, w in enumerate(wavelengths()):
        base = 0.9 * math.exp(-(w - LOW_UM) / 1.6) + 0.12  # reflected sunlight fading towards the red
        v = base + gauss(w, 2.0, 0.1, 0.22) + gauss(w, 3.3, 0.08, 0.5) + wobble(i)
        pts.append({"wavelength_um": w, "value": round(v, 4), "error": round(0.025, 4), "n_images": 3 + (i % 5)})
    return {
        "id": "practice-comet",
        "name": "Practice comet",
        "kind": "comet",
        "placeholder": True,
        "release": None,
        "ra": None,
        "dec": None,
        "unit": "relative",
        "summary": "A practice spectrum drawn by our own code, shaped like a comet: reflected sunlight plus a few bright bumps. It is not SPHEREx data.",
        "explain": "A comet reflects sunlight, which fades towards the longer colours. Gas around a comet can also glow at particular colours, which makes a bump in the graph. In this practice curve the bumps are placed at made-up colours.",
        "story": None,
        "features": [
            {"kind": "bump", "wavelength_um": 2.0, "label": "Practice bump A", "molecule": None, "verified": False, "source": None},
            {"kind": "bump", "wavelength_um": 3.3, "label": "Practice bump B", "molecule": None, "verified": False, "source": None},
        ],
        "points": pts,
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in (cloud(), comet()):
        path = OUT / f"{spec['id']}.json"
        path.write_text(json.dumps(spec, indent=1) + "\n", encoding="utf-8")
        print("wrote", path)


if __name__ == "__main__":
    main()
