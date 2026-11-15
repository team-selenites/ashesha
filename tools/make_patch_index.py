"""Builds site/data/patch-index.json: where on the sky each prepared target's pictures are.

The sky viewer's "Or type a position" box has no live search of the IRSA archive. It looks the
typed right ascension and declination up in this small file instead, so a position that falls
inside a prepared patch opens that target, and any other position is told how far away the
nearest prepared patch is.

Nothing here is typed in by hand. Every number is read from the target files the pipeline wrote
(site/data/<target>.json), so run this again whenever those files change:

    python tools/make_patch_index.py

For a star, the entry is the centre of its fixed patch. For the comet, which moves, the entry
lists the predicted position each picture is centred on, with that picture's observation ID and
date. A typed position counts as "inside" when it is within half a picture's width (the radius)
of one of those points.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = SITE / "data" / "patch-index.json"

# Python's json writes NaN and Infinity, which are not valid JSON. Read them as "no value".
NOT_A_NUMBER = re.compile(r":\s*-?(?:NaN|Infinity)(?=\s*[,}\]])")


def read_examples():
    """The (id, name, data file) of each example, from the list the viewer itself uses."""
    text = (SITE / "js" / "examples.js").read_text(encoding="utf-8")
    found = re.findall(r'\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)".*?data:\s*"([^"]+)"', text, flags=re.S)
    if not found:
        raise SystemExit("No examples found in site/js/examples.js")
    return found


def main():
    targets = []
    release = None
    for example_id, name, data_path in read_examples():
        raw = (SITE / data_path).read_text(encoding="utf-8")
        data = json.loads(NOT_A_NUMBER.sub(": null", raw))
        release = release or data.get("release")
        observations = [o for o in data["observations"] if o.get("ra") is not None and o.get("dec") is not None]
        patch = data.get("patch")
        if patch:
            radius = round(patch["size_arcsec"] / 2, 1)
            targets.append({
                "id": example_id, "name": name, "moving": False,
                "ra": patch["center_ra"], "dec": patch["center_dec"], "radius_arcsec": radius,
            })
        else:
            # A moving target: each picture is a cutout of the same size, centred on the
            # position predicted for that moment.
            sizes = {t["radius_arcsec"] for t in targets}
            radius = sizes.pop() if len(sizes) == 1 else 127.1
            targets.append({
                "id": example_id, "name": name, "moving": True, "radius_arcsec": radius,
                "positions": [[o["ra"], o["dec"], o["obs_id"], o["date"][:10]] for o in observations],
            })
    # Moving targets were given a radius before every star was read: set it again now.
    star_radii = {t["radius_arcsec"] for t in targets if not t["moving"]}
    if len(star_radii) == 1:
        radius = star_radii.pop()
        for t in targets:
            t["radius_arcsec"] = radius
    index = {
        "about": "Where each prepared target's pictures are on the sky. Made by tools/make_patch_index.py "
                 "from the target files in site/data. Do not edit by hand.",
        "release": release,
        "angles": "degrees (ICRS); radius in arcseconds",
        "targets": targets,
    }
    OUT.write_text(json.dumps(index, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote", OUT.relative_to(ROOT), "with", len(targets), "targets,", OUT.stat().st_size, "bytes")
    for t in targets:
        where = "%d positions" % len(t["positions"]) if t["moving"] else "RA %.5f, Dec %.5f" % (t["ra"], t["dec"])
        print("  %-16s %s, radius %s arcsec" % (t["id"], where, t["radius_arcsec"]))


if __name__ == "__main__":
    main()
