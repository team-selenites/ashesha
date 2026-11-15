# data/raw

**What is here:** `NOTES.md`, which says where the data comes from, what was downloaded, how each number was made, and which facts are still to verify.

The raw SPHEREx files are not in the repository. The pipeline reads only a small cutout of each image straight from the IRSA archive, so anyone can fetch the same data again.

**Who owns it:** Elisabetta.

**How it connects to the rest:** `pipeline/build_stacks.py` turns the archive's images into the files in `data/processed/`.

**Status:** notes complete for SPHEREx Quick Release 2.
