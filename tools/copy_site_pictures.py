"""Copy the pipeline's pictures into site/ so the site works on its own.

The pipeline (Elisabetta) writes pictures to data/processed/<target>/weekly/ and
.../stacks/, and its site JSON points at them as "data/processed/...". GitHub Pages may
serve only the site/ folder, so this copies every PNG the site JSON files name into
site/data/pictures/<same path after data/processed/>. The viewer reads them from there.

Run from the repository root after each pipeline run:  python tools/copy_site_pictures.py
"""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_DATA = ROOT / "site" / "data"
OUT = SITE_DATA / "pictures"
PREFIX = "data/processed/"


def paths_in(value):
    if isinstance(value, str):
        if value.startswith(PREFIX) and value.lower().endswith(".png"):
            yield value
    elif isinstance(value, dict):
        for v in value.values():
            yield from paths_in(v)
    elif isinstance(value, list):
        for v in value:
            yield from paths_in(v)


def main():
    wanted, missing = set(), []
    for f in sorted(SITE_DATA.glob("*.json")):
        text = re.sub(r":\s*-?(?:NaN|Infinity)(?=\s*[,}\]])", ": null", f.read_text(encoding="utf-8"))
        wanted.update(paths_in(json.loads(text)))
    copied = 0
    for p in sorted(wanted):
        src = ROOT / p
        if not src.is_file():
            missing.append(p)
            continue
        dst = OUT / p[len(PREFIX):]
        dst.parent.mkdir(parents=True, exist_ok=True)
        if not dst.exists() or dst.read_bytes() != src.read_bytes():
            shutil.copyfile(src, dst)
            copied += 1
    print(f"{len(wanted)} pictures named, {copied} copied or updated, {len(missing)} missing")
    for p in missing:
        print("  missing:", p)


if __name__ == "__main__":
    main()
