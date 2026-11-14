# Raw data notes: SPHEREx image stacks

Last updated: 14 November 2026
Script: `pipeline/build_stacks.py`
Outputs: `data/processed/<target>/`

These notes explain where the data come from and how the processed files were made. Items marked **TO VERIFY** were written from memory or reasoning and must not be presented as confirmed until checked (see section 9).

## 1. Data source

- Mission and archive: SPHEREx data served by NASA/IPAC IRSA.
- Product: SPHEREx Quick Release 2 (QR2), Level 2 spectral image files (multi-extension FITS).
- Collection used for the search: `spherex_qr2` (the SPHEREx Wide Survey). Searched with the IRSA Simple Image Access service through `astroquery` (`Irsa.query_sia`).
- Data release DOI (QR2): 10.26131/IRSA652 (checked on the IRSA QR overview page, https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_qr.html, 14 November 2026)
- Acknowledgement: IRSA asks that published work using SPHEREx data includes this sentence (copied from the IRSA SPHEREx mission page, https://irsa.ipac.caltech.edu/Missions/spherex.html, 14 November 2026): "This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration."
- This project is not endorsed by NASA or IRSA.

## 2. What was downloaded

- Whole image files were not downloaded. For each image, only a 41 x 41 pixel window (a "cutout") around the target was read remotely from the `IMAGE` extension.
- SPHEREx pixel size is 6.2 x 6.2 arcseconds (checked on the SPHEREx instrument page, https://spherex.caltech.edu/page/instrument, 14 November 2026). Each detector is a 2048 x 2048 pixel array.
- The cutouts were saved locally as `.npy` files (`cutouts/`). They are **not** in the repository, because they are many files and are only needed to recompute the stacks.
- One PNG per image exists in `all_images/`. These are shared as a ZIP, not in the repository.
- IRSA sometimes returns temporary HTTP errors (for example 503). The script retries quietly after 5, 15 and 45 seconds, and saves progress every 10 images so it can resume.

## 3. Detectors and wavelength bands

Each image comes from one of six detectors. The detector number is read from the file name (for example `..._1D6_spx_...` is detector 6). Approximate bands:

| Detector | Band (micron) |
|---|---|
| D1 | 0.75 to 1.1 |
| D2 | 1.1 to 1.6 |
| D3 | 1.6 to 2.4 |
| D4 | 2.4 to 3.8 |
| D5 | 3.8 to 4.4 |
| D6 | 4.4 to 5.0 |

- Each SPHEREx image covers a different wavelength at a given place in the image. The wavelength of each image (`wavelength_um`) is read from the spectral coordinate map at the pixel where the target falls. If that fails, the middle of the band limits is used.
- Known quirk: `bandwidth_um` can be unreliable for some images (for example one Barnard's Star image from 2025-08-16 reports a bandwidth of about 0.8 micron at 2.03 micron, where about 0.04 to 0.06 micron is typical). Do not rely on it for display.
- Observation time is the midpoint of `t_min` and `t_max` from the IRSA table (MJD, and UTC in `date_utc`).

## 4. Targets and positions

Positions are not typed by hand. For each image the target position is calculated for the observation date.

| Target | Where the position comes from | Proper motion |
|---|---|---|
| WISE 0855 | SIMBAD J2000 position (via the CDS Sesame name resolver). The team's coordinates (RA 08h55m10.831s, Dec -07d14m42.53s) are for the WISE epoch (May 2010), not J2000 (Luhman and Esplin 2016, as confirmed by the team). | About -8.1 arcsec/yr in RA and +0.67 arcsec/yr in Dec, from Luhman and Esplin 2016, as given by the team |
| Barnard's Star | SIMBAD J2000 position (Sesame) | Fallback value used: (-798.6, +10328.1) mas/yr, written from memory because the SIMBAD table service was not available. A later check (Wikipedia infobox, J2000, ICRS) gives (-801.6, +10362.4) mas/yr. The difference is about 0.03 arcsec per year, a small fraction of one 6.2 arcsec pixel, so the positions are not affected. The star falls at the centre of the cutouts, which supports the value. |
| Epsilon Indi B | Sesame, name `eps Ind B` | Fallback value used: (3961, -2535) mas/yr, written from memory. **TO VERIFY**. It is an unresolved pair of brown dwarfs, so SPHEREx sees one source. |
| RW Aurigae | Sesame | Set to 0 because SIMBAD was not available. Assumed small, not verified. |
| R Draconis | Sesame | Set to 0 because SIMBAD was not available. Assumed small, not verified. |
| Comet 3I/ATLAS | JPL Horizons, designation `C/2025 N1`, geocentric (observer code 500), one position for each image time | Not applicable (positions come from the orbit) |

- Search windows for the comet: 1 to 31 August 2025 and 1 to 31 December 2025.
- `C/2025 N1 (ATLAS)` is the cometary designation of 3I/ATLAS assigned by the Minor Planet Center (checked 12 November 2026, https://johnstonsarchive.net/astro/3I_atlas.html). Horizons returned plausible positions for it.
- Position search radius: 120 arcseconds for the stars and 300 arcseconds for the comet. Images where the target falls outside the detector are skipped.

## 5. How the labels were made

Each image has a status label: `clear`, `faint`, `not_detected`, `no_data` (the calculation failed) or `no_observation` (no image covers the target).

- Signal: mean value inside a small circle on the target (radius 1.5 pixels for stars, 2.5 pixels for the comet), minus the median of many identical circles placed on empty parts of the same cutout.
- Noise: standard deviation of those control circles.
- S/N is signal divided by noise. Thresholds: `clear` at S/N of 10 or more, `faint` at 3 or more, otherwise `not_detected`.
- The first version of the labels used a different noise estimate (the median absolute deviation) and gave far too many detections, because real images contain stars and hot pixels with long tails. It was replaced by the standard deviation.
- Limits: the labels do not check for contamination. A single bright pixel or a nearby star can raise the S/N. Example: one WISE 0855 image (2025-11-10, 4.47 micron) has S/N of about 459 and is almost certainly an artefact. Each SPHEREx image is a different colour, so a brightness difference between two images is not automatically a real change.

## 6. Median stacks

- For each detector, the images are sorted by date and split into two observing periods ("early" and "late") at the largest gap in time, keeping the two groups reasonably balanced (between 25% and 75% of the images). With fewer than 6 images no split is made (`all`), and with fewer than 3 no stack is made.
- Each stack is the median of the cutouts, after subtracting the background level (median) of each cutout.
- Cutouts are centred on the target (rounded to the nearest pixel), so the target can be up to half a pixel away from the centre.
- Each stack mixes different wavelengths from within one detector band. Treat it as a band image, not as a single wavelength.

## 7. Weekly images

- One image per week for the website, in `weekly/`. Detector 6 is preferred (so images are comparable over time). If a week has no detector 6 image, any image of that week is used.
- The number of weekly images differs for each target, because SPHEREx only observes each place in some periods of the year (for WISE 0855, 256 images fall in just 9 weeks).
- The table columns `position_xy` (position of the target as `x,y`, in percent from the top-left corner), `position_label` (name of the target) and `position_frame` (what the percentages refer to) were added for the description of movement:
  - **The five stars** (`fixed_patch_north_up_east_left`): the position inside ONE fixed patch of sky, the same for every image of that star, north up and east to the left. The patch has the size of a cutout (41 pixels, about 254 arcseconds) and is centred on the middle of the star's range of positions. The star moves inside it (for example Barnard's Star moves about 10 arcseconds per year, which is about 4% of the patch per year). The patch centre is given in each site JSON (`patch`). The PNG pictures themselves are still centred on the star and use the detector orientation, so these numbers describe the movement on the sky, not where to draw a marker on the picture.
  - **The comet** (`centred_cutout`): the position inside each target-centred cutout, so it is always close to 50,50. Its movement is described from the `ra` and `dec` columns instead.
- `pixel_xy` in the site JSON (and `px`, `py` in the tables) is the 0-based pixel position of the target inside its 41 x 41 pixel cutout.

## 8. Results for each target

Counts are from `stack.csv` and `stacks.json` of each target (14 November 2026). `no_data` means the brightness could not be measured (pixels masked in the measuring circle). Stack S/N values are rough and each stack mixes different wavelengths of one detector, so they are not comparable between detectors or between periods.

| Target | Images | Period | Single-image labels | In `weekly/` |
|---|---|---|---|---|
| WISE 0855 | 256 | 5 May 2025 to 14 May 2026 | 252 not_detected, 3 faint, 1 clear | 9 |
| 3I/ATLAS | 255 (Aug 157, Dec 98) | 1 Aug to 15 Dec 2025 | 182 not_detected, 21 faint, 52 clear | 5 |
| Barnard's Star | 240 | 15 Aug 2025 to 5 May 2026 | 158 clear, 82 no_data | 10 |
| Epsilon Indi B | 327 | 24 Apr 2025 to 4 May 2026 | 139 not_detected, 76 faint, 112 clear | 18 |
| RW Aurigae | 224 | 1 Sep 2025 to 12 Mar 2026 | 223 clear, 1 faint | 7 |
| R Draconis | 536 | 16 May 2025 to 16 Jul 2026 | 499 no_data, 37 clear | 31 |

### WISE 0855

- 256 images from 2025-05-05 to 2026-05-14. Count per detector: D1 36, D2 48, D3 45, D4 36, D5 48, D6 43.
- Single images: 252 `not_detected`, 3 `faint`, 1 `clear` (the artefact above).
- Median stacks: no signal from D1 to D4 (S/N at most 2.1). D5 shows S/N of about 1.9 in both periods. D6 shows 2.8 (early) and 3.7 (late). This is a weak hint, so it is labelled **tentative**, not a detection.

### 3I/ATLAS (comet)

- Images per detector: D1 45, D2 44, D3 40, D4 47, D5 44, D6 35. The median S/N of single images is only 0.4 (maximum 29), so most single images show nothing and the comet is clear only in some bands. Flags: 5 `near_edge`, 2 `single_pixel_peak`, 1 `masked_pixels_in_aperture`.
- Stacks, August (early): D1 S/N 20.7 and D2 10.0 clear, D3 6.8, D4 3.8 and D5 3.4 faint, D6 1.7 not detected.
- Stacks, December (late): all six detectors clear, S/N 17.7 to 26.0. December is clearly stronger than August, in line with the comet being about three times brighter in December (feasibility test).
- The D5 stacks mix 27 (Aug) and 17 (Dec) images over the whole 3.8 to 4.4 micron band. The feasibility test reported much higher S/N (about 25 in August, 57 in December) for stacks of a few images near 4.2 to 4.3 microns, where the comet is bright. The two are not the same measurement, and the full-band stack is diluted by the colours where the comet is faint. This has not been checked image by image.

### Barnard's Star

- Images per detector: D1 42, D2 36, D3 42, D4 41, D5 37, D6 42. 82 images are `no_data` (masked pixels in the measuring circle), mostly in D1 to D4. 2 have `near_edge`.
- Single images that were measured: median S/N about 600 (maximum about 2100).
- All 12 stacks are clear (S/N about 550 to 1470, highest in D6). The late stacks of D1 and D4 come from one day (11 March 2026).

### Epsilon Indi B

- Images per detector: D1 43, D2 68, D3 61, D4 43, D5 56, D6 56. Flags: 13 `single_pixel_peak`, 4 `near_edge`.
- D1 is never clear (13 faint, 30 not_detected). D2 has 30 clear, D5 has 23 clear and D6 has 17 clear. This fits a brown dwarf that is much brighter at long wavelengths.
- Stacks: D1 not detected in both periods (S/N 0.8 and 1.9). D2, D4, D5, D6 clear in both periods. D3 is faint in the early period (8.7) and clear in the late one (22.9). D5 is the strongest (96 and 118).

### RW Aurigae

- Images per detector: D1 38, D2 37, D3 38, D4 38, D5 37, D6 36. 223 clear and 1 faint. Median S/N about 70. Flags: 6 `near_edge`, 1 `single_pixel_peak`, 1 `masked_pixels_in_aperture`.
- All 12 stacks are clear. S/N is lowest in D1 and D2 (18 to 35) and highest in D5 and D6 (740 to 1340).

### R Draconis

- Images per detector: D1 92, D2 89, D3 91, D4 87, D5 88, D6 89. 534 of 536 images have `masked_pixels_in_aperture` and 499 are `no_data`. Only D1 (19) and D6 (18) have clear single images. 37 images have `near_edge`.
- Stacks: D1, D5 and D6 are clear in both periods. D2 and D3 are clear only in the late period (`no_data` in the early one). D4 is `no_data` in both periods.
- Caution: D5 stacks are marked clear (S/N about 530 to 550) although every single D5 image is `no_data`. The stack ignores masked pixels frame by frame, so its measurement may not be reliable for this very bright star. Treat the R Draconis stacks as pictures, not as measurements.

## 9. Known issues and things to verify

1. Proper motions. Barnard's Star: checked, the difference is negligible (see section 4). Epsilon Indi B (fallback value from memory), RW Aurigae and R Draconis (set to 0) are not yet checked against SIMBAD. A proper motion of even 100 mas/yr moves a source only 0.1 arcsec in a year, much less than one pixel (6.2 arcsec), so the cutouts are not affected, but the exact values are not confirmed.
2. (Done) SPHEREx pixel size, 6.2 arcseconds, checked.
3. (Done) Designation of 3I/ATLAS, `C/2025 N1 (ATLAS)`, checked.
4. (Done) The IRSA acknowledgement sentence is in section 1. The DOI 10.26131/IRSA652 is checked.
5. `bandwidth_um` is unreliable for some images.
6. Labels do not include contamination flags.
7. A missing wavelength (one image of Epsilon Indi B on 25 April 2025 and one of 3I/ATLAS) was written as `NaN`, which is not valid JSON. The script now writes `null`. JSON files made before this fix must be regenerated, and the viewer must accept `null` for `wavelength_um`.

## 10. How to reproduce

```
pip install "astroquery>=0.4.8" astropy numpy pandas matplotlib fsspec aiohttp

python pipeline/build_stacks.py --check                  # coordinates and coverage only
python pipeline/build_stacks.py --targets wise0855       # full run for one target
python pipeline/build_stacks.py --relabel                # recompute labels from the cutouts
python pipeline/build_stacks.py --render-all             # one PNG per image
```

If a run is interrupted, run the same command again (without `--fresh`) and it resumes. `--fresh` starts over.
