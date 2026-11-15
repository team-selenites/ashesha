# data

**What is here:** the data the pipeline produced, before it is copied into the website.

- `processed/`: one folder per target, with the measurements, the pictures and the stacks.
- `raw/`: notes on where the data comes from. The raw SPHEREx files themselves are not kept here.

**Who owns it:** Elisabetta.

**How it connects to the rest:** `pipeline/build_stacks.py` writes `processed/`. `tools/copy_site_pictures.py` copies the pictures into `site/data/pictures/`, and the website reads only from `site/data/`.

**Status:** complete for the six targets, from SPHEREx Quick Release 2 (DOI 10.26131/IRSA652).
