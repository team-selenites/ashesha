# pipeline

**What is here:** `build_stacks.py`, the script that turns SPHEREx images into the files the website reads.

For a sky position it asks the IRSA archive for every SPHEREx image that covers it, reads a 41 by 41 pixel cutout from each one, and measures the brightness at the target. It gives each image a status (clear detection, faint, not detected or no data), builds median stacks for each of the six detectors, draws the pictures, and writes JSON for the site. For the comet it follows the position JPL Horizons predicts for each moment.

**Who owns it:** Elisabetta.

**How it connects to the rest:** it writes `data/processed/<target>/` and `site/data/<target>.json`. After a run:

1. `python tools/copy_site_pictures.py` copies the pictures into `site/data/pictures/`.
2. `python tools/make_patch_index.py` rebuilds the list the viewer's position box searches.
3. `python tools/make_cryostella_from_pipeline.py` and `python tools/make_beginnings.py` rebuild the Cryostella and Your Beginnings data, if those changed.

The notes in `data/raw/NOTES.md` explain every step and its checks.

**Needs:** Python with Astropy, astroquery, PyVO, NumPy, pandas and Matplotlib.

**Status:** run on all six targets with SPHEREx Quick Release 2.
