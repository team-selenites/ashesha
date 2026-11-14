# Cryostella: data format

Cryostella (the frozen water section, S2) shows a spectrum for each of 2 or 3 targets: a chart, a data table, a Spectrum Player that plays it as sound, and a short explanation. Owner: Pawana. Data: Elisabetta. Sound meanings: a team member.

The page reads only these files, so real data replaces the practice data without code changes.

## Files

| File | Written by | What it holds |
| --- | --- | --- |
| `site/data/cryostella/index.json` | Pawana | The list of targets, in the order shown: `{ "targets": [ { "id", "file" } ] }` |
| `site/data/cryostella/<id>.json` | Elisabetta's pipeline | One spectrum (format below) |
| `site/data/sound-key.json` | a team member | What each sound means. Cryostella reads the `spectrum` section |

The page opens one target directly with `cryostella.html?target=<id>`.

## One spectrum

| Field | Meaning |
| --- | --- |
| `id` | Short name used in links, for example `3I-ATLAS` |
| `name` | Name shown on screen |
| `kind` | `ice-source`, `comet` or `galaxy` |
| `placeholder` | `true` for practice data. The page then shows a "Practice data, not SPHEREx" label |
| `release` | `QR2`, `QR3`, or `null`. The page shows the release and its DOI |
| `ra`, `dec` | Position in degrees, or `null` |
| `unit` | Unit of `value`, for example `mJy`, or `relative` |
| `summary` | One or two plain sentences: what this target is and where the data came from |
| `explain` | Plain-words explanation of the graph for this target |
| `game` | Optional. `false` keeps this spectrum out of the Name that spectrum game (for example a spectrum that is mostly "not detected") |
| `story` | Optional story text. Always shown with a "Story" label and hidden in "Just the data" mode |
| `features` | Bumps and dips to mark on the graph (below) |
| `points` | `[ { "wavelength_um", "value", "error", "n_images" } ]`, sorted by wavelength. `error` and `n_images` may be `null` |

### Features

| Field | Meaning |
| --- | --- |
| `kind` | `bump` or `dip` |
| `wavelength_um` | Where it sits |
| `label` | Text on the graph, for example "Bump near 4.27 microns" |
| `molecule` | For example "carbon dioxide", or `null` |
| `verified` | `true` only after the team has checked the feature against published work |
| `source` | The paper or page it was checked against (text or a link) |

**Honest rule:** the page shows `molecule` only when `verified` is `true`, and then names the `source`. Otherwise it shows the `label` and says the feature is not yet checked. The plan's section 12 facts (the comet's bumps near 2.7, 4.27 and 4.67 microns, and what SPLICES contains) stay `verified: false` until someone checks them.

## Real data

`tools/make_cryostella_from_pipeline.py` turns the pipeline's `site/data/3i_atlas_spectrum.json` into `3i-atlas-aug.json` and `3i-atlas-dec.json`, one point per measured image, with no smoothing and no features marked. Re-run it after the pipeline writes a new spectrum.

## Practice data

`tools/make_cryostella_practice.py` writes `practice-cloud.json` and `practice-comet.json`. These curves are made up, with bumps and dips at invented colours and no molecule names. They are there so the page can be built and tested, and they come out once real spectra arrive.
