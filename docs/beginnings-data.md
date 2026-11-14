# Your Beginnings: data format

Built by `tools/make_beginnings.py`. Re-run it after a new SPHEREx data release; no page code needs to change.

## Files

- `site/data/beginnings/index.json`: what exists. Open this first.
- `site/data/beginnings/days/YYYY-MM-DD.json`: one file per UTC day SPHEREx observed. Open only the one the visitor needs (about 10 KB each).

## index.json

| Field | Meaning |
| --- | --- |
| `first_date`, `last_date`, `days_count` | Range of observed days. Read these; never hard-code dates. |
| `days` | `"YYYY-MM-DD"` → `[exposures, Messier objects]`, so the page can describe a day before opening its file. |
| `calendar` | `"MM-DD"` → list of real dates, e.g. `"05-08": ["2025-05-08", "2026-05-08"]`. A birthday with two dates can offer both years. `"02-29"` is absent. |
| `leap_day` | Sentence to adapt for visitors born on 29 February. |
| `releases` | `release`, `doi`, `first_date`, `last_date` for each data release found. `doi: null` means nobody has confirmed the DOI yet. |
| `messier` | 110 objects: `messier`, `label` ("M 31"), `name` (everyday name or null), `kind` (plain words or null), `simbad_type`, `simbad_id`, `ra`, `dec`, `headline_ok`. |
| `note`, `pointings_note`, `messier_source` | Wording rules and sources. Keep them true on the page. |

`headline_ok` is false for M 40 and M 73, which SIMBAD lists as "Object of Unknown Nature" and "Not an Object". Never make them the birthday's headline object.

## days/YYYY-MM-DD.json

| Field | Meaning |
| --- | --- |
| `date` | The UTC date. |
| `exposures` | Exposures that day (detector D2). A normal day has about 470 to 530. |
| `full_day` | False when fewer than 300 exposures (24 and 28 April 2025, 5 October 2026). |
| `sun` | Sun's `ra`, `dec` in degrees at 12:00 UTC. |
| `releases` | `[{release, doi}]` for that day's pictures. |
| `release_inferred_from_dates` | True when the day had no Messier image, so the release comes from the date ranges. |
| `pointings` | `[ra, dec, minute]` exposure centres in degrees (rounded to 0.1) in time order, with the minute of the UTC day (0 to 1439), so the page can replay the day. Each exposure covers about 3.5 by 11 degrees across six detectors. |
| `messier` | Objects whose catalogue position lies inside at least one image that day: `messier`, `images`, `detectors`, `wavelength_um` [min, max], and one `example` image (`obs_id`, `time_utc`, `datalink`, `release`). |

## Wording rules for the page

- Say "the sky SPHEREx saw on 8 May 2025", always with the year. Never "this year" or "the sky on the day you were born": SPHEREx launched in 2025, and the same date in another year shows different pictures (Track D).
- "SPHEREx pictured M 31 that day" means the object's position lies inside an image. It does not mean the object is detected or bright in it.
- Eight days have no Messier object in any picture (late June 2025 and 2026, and 5 October 2026). Say so plainly and offer the nearest day that has one.
- Cite the release and DOI shown in the day file. DR1's DOI is not confirmed yet.

## Checks run on 13 November 2026

- 530 days, 24 April 2025 to 5 October 2026, no day missing. 365 of 366 calendar dates covered.
- All 110 Messier objects pictured at least once.
- For all 4,292 object-days, the object lies within 5.8 degrees of a D2 exposure centre that day (median 2.5). That fits the footprint, which reaches about 5.7 degrees from the centre along its long side.
- M 31 is pictured in July and December/January, when the Sun is about 90 degrees from it, as Track D predicts.
