# data/processed

**What is here:** one folder per target: `3i_atlas`, `barnards_star`, `epsilon_indi_b`, `r_dra`, `rw_aur` and `wise0855`. Each holds:

- `stack.csv` and `stack.json`: one row per SPHEREx image, with its date, colour, brightness, signal to noise and status.
- `stacks.json` and `stacks/`: median stacks for each of the six detectors, for early and late dates.
- `all_images/`: one picture per image. `weekly/`: one picture per week.

**Who owns it:** Elisabetta.

**How it connects to the rest:** written by `pipeline/build_stacks.py`. The website's copies are in `site/data/`.

**Status:** complete for the six targets. Python writes `NaN` where a value is missing, which strict JSON readers reject. The website reads `NaN` as "no value".
