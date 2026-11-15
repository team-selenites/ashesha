# tools

**What is here:** small Python scripts that prepare files for the website. Each one starts with a note on what it does and how to run it.

| Script | What it makes |
| --- | --- |
| `copy_site_pictures.py` | Copies the pipeline's pictures into `site/data/pictures/` |
| `make_patch_index.py` | `site/data/patch-index.json`, the list the viewer's position box searches |
| `make_cryostella_from_pipeline.py`, `make_ice_spectrum.py` | Cryostella's real spectra |
| `make_cryostella_practice.py` | Cryostella's two practice spectra |
| `make_beginnings.py` | The data for Your Beginnings: where SPHEREx looked each day, and which Messier objects were inside its pictures |
| `cutout_green.py` | Cuts a guide's portrait out of its green background |

**Who owns it:** Pawana and Elisabetta.

**How it connects to the rest:** the scripts read `data/processed/` and the files in `site/data/`, and write the files the website reads, in `site/data/` and `site/assets/`.

**Status:** all run for SPHEREx Quick Release 2.
