"""Make Cryostella's ice spectrum from SPHEREx images, using Elisabetta's pipeline unchanged.

Target: Elias 16, a background star behind the Taurus dark cloud, a standard example of
starlight passing through icy dust.

    python tools/make_ice_spectrum.py --check          # is it covered by SPHEREx QR2?
    python tools/make_ice_spectrum.py --out <folder>   # measure every image (slow, resumable)
    python tools/make_ice_spectrum.py --out <folder> --write   # then write the Cryostella file

The pipeline (pipeline/build_stacks.py) is imported as it is; this script only adds one
target to its list and writes site/data/cryostella/elias-16.json (format:
docs/cryostella-data.md). Cutouts stay in --out, outside the repository.

Honest rules: one point per measured image, no smoothing, no feature marked as verified.
"""
import argparse
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
import build_stacks as bs  # noqa: E402

SLUG = "elias16"
bs.TARGETS[SLUG] = dict(label="Elias 16 (star behind the Taurus dark cloud)", kind="fixed",
                        simbad=["2MASS J04393886+2611266"], ap_r=1.5)


def write_cryostella(outdir):
    stack = json.loads((Path(outdir) / SLUG / "stack.json").read_text(encoding="utf-8"))
    imgs = stack["images"]
    pts = []
    for im in imgs:
        v, w, e = im.get("flux_mjysr"), im.get("wavelength_um"), im.get("flux_err_mjysr")
        if not all(isinstance(x, (int, float)) and math.isfinite(x) for x in (v, w)):
            continue
        pts.append({"wavelength_um": round(w, 4), "value": round(v, 4),
                    "error": round(e, 4) if isinstance(e, (int, float)) and math.isfinite(e) else None,
                    "n_images": 1})
    pts.sort(key=lambda p: p["wavelength_um"])
    seen = sum(1 for im in imgs if im.get("status") in ("clear", "faint"))
    dates = sorted(im["date_utc"][:10] for im in imgs if im.get("date_utc"))
    ras = [im["ra_deg"] for im in imgs if im.get("ra_deg") is not None]
    decs = [im["dec_deg"] for im in imgs if im.get("dec_deg") is not None]
    spec = {
        "id": "elias-16",
        "name": "Elias 16, a star behind an icy cloud",
        "kind": "ice-source",
        "placeholder": False,
        "release": "QR2",
        "ra": round(sum(ras) / len(ras), 5) if ras else None,
        "dec": round(sum(decs) / len(decs), 5) if decs else None,
        "unit": "MJy/sr",
        "summary": (f"Elias 16 is a star seen through the Taurus dark cloud. SPHEREx observed it in {len(imgs)} images"
                    + (f" between {dates[0]} and {dates[-1]}" if dates else "")
                    + f"; the star is seen clearly or faintly in {seen} of them. Each point is one image."),
        "explain": ("Each point is the star's brightness in one picture, at that picture's colour (wavelength). "
                    "The light passes through a cold cloud on its way to us. Where ice in the cloud absorbs a colour, "
                    "the star would look fainter, which makes a dip in the graph. Every picture was taken on a different "
                    "day, so a change from one point to the next is not automatically a real change."),
        "story": None,
        # Seen in the QR2 data (about 3 times fainter at 2.85-3.2 microns). Marked, not verified:
        # the page names the molecule only after the team checks it against published work.
        "features": [{"kind": "dip", "wavelength_um": 3.05, "label": "Dip near 3 microns", "molecule": "water ice",
                      "verified": False, "source": None}],
        "points": pts,
    }
    out = ROOT / "site" / "data" / "cryostella" / "elias-16.json"
    out.write_text(json.dumps(spec, indent=1, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {out.name}: {len(pts)} points from {len(imgs)} images, {seen} seen")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--out", default=None)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--max-images", type=int, default=None)
    a = ap.parse_args()
    if a.check:
        bs.check([SLUG])
        return
    if not a.out:
        ap.error("--out is required (a folder outside the repository)")
    if a.write:
        write_cryostella(a.out)
        return
    Path(a.out).mkdir(parents=True, exist_ok=True)
    bs.build_stack(SLUG, bs.TARGETS[SLUG], Path(a.out), max_images=a.max_images)


if __name__ == "__main__":
    main()
