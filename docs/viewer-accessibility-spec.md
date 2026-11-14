# Viewer accessibility spec (must-haves)

Team Selenites, NASA Space Apps 2026. Draft of 10 November 2026. Owner: Pawana.
Applies to the sky viewer, the Then and Now strip and the colour slider.

## Why

A blind or low-vision visitor must get the same facts as a sighted one without seeing the pictures. Sound is an extra, never the only route. Everything below must also work by keyboard alone.

## Rules for every part of the viewer

- Say "candidate", never "discovery". Say "a sonification", never "this is what the comet sounds like".
- A brightness change between images is not automatically a real change. Say so where it is shown.
- Never claim an ice or gas feature unless the data shows it.
- No meaning by colour alone. Every status has its own shape and a written label.
- Nothing plays by itself: no video, no sound. Nothing moves for more than 5 seconds without a pause control.
- Targets are at least 44 by 44 pixels, and focus is always visible.

## The six must-haves

Each one lists who builds it and when it counts as done.

1. **A written description for every image.** (Pawana, Yeabisra)
   Template: "Image {n} of {total}. {date}. {wavelength} microns. {status label}. {change note}."
   Done when every frame shows this text under the image and uses it as the image's text alternative.

2. **A data table with the same facts.** (Yeabisra)
   Columns: image number, date, wavelength (microns), status, brightness, note. A real table with a caption and header cells, built from the same data as the strip, never a separate copy.
   Done when a screen reader can read it row by row and column by column.

3. **Keyboard controls.** (Yeabisra)
   Play, pause, previous, next, first and last as real buttons. A slider that reads out "3 of 12, 14 August 2025". Arrow keys step, Home and End jump. Autoplay is off.
   Done when the whole viewer can be used with no mouse.

4. **A plain-language summary for each target.** (Pawana, Fateme)
   Two or three sentences above the viewer saying what you are looking at. Facts checked against the data.
   Done when all five test targets and the comet have one.

5. **Sound as an optional extra.** (Priyanshi)
   Off by default. Volume and speed controls. The mapping is written in the sound mapping file, one line per sound, and explained in text. The Scientific and Immersive toggle (decided 10 November) applies: Scientific is a sonification of the data only.
   Done when every sound has a written equivalent and the viewer is fully usable with sound off.

6. **A text version of the colour slider.** (Pawana)
   The slider shows its value in microns and reads it out. A sentence beside it updates, for example "At this wavelength the comet is {status}".
   Done when the wording is checked against the data. The switch-on near 4.27 microns must be confirmed first.

## Announcements

Use one polite live region. Announce when the visitor steps to a frame, moves the slider or pauses, and say the current frame. Do not announce every frame during playback.

## Data the pipeline must provide per image (Elisabetta)

The descriptions and the table are built from these fields, so the strip and the text never disagree.

```json
{
  "id": 3,
  "date": "EXAMPLE 2025-01-01",
  "wavelength_um": "EXAMPLE 1.0",
  "status": "clear | faint | not-detected | no-observation",
  "brightness": "EXAMPLE 0.0",
  "note": "EXAMPLE short plain sentence"
}
```

These values are placeholders, not SPHEREx data. Elisabetta decides what counts as "clear", "faint" and "not detected", and writes the rule down.

### Positions, so blind visitors can follow the movement (added 12 November, real data 12 November)

The viewer turns positions into words (REQUIREMENTS B-1): one sentence per image, a one-line summary in the About tab ("How it moves") and a "Movement since last position" column in the table.

**Real data.** The pipeline's cutouts are centred on the target, so the target never moves on the picture and `position_xy` stays near 50, 50. The viewer therefore uses each image's `ra` and `dec`, which are the target's predicted position, and tells the movement as a direction and an angle on the sky: "Since image 3 (1 August 2025, 08:03 UTC), the predicted position of Comet 3I/ATLAS moved about 4 arcseconds to the west on the sky." Under 1 arcsecond counts as the same place. The summary uses the pipeline's `chapter` field when every image has one (the comet's August and December), and otherwise one sentence for the whole span, for example "The predicted position of Barnard's Star moved about 7 arcseconds to the north on the sky over 262 days." It ends by saying where the positions come from (`position_source` in `site/js/examples.js`: orbit calculations for the comet, catalogue position and proper motion for the stars) and that directions are on the sky, not on the picture.

**Practice data** keeps `practice_xy` (percent of the picture from the top-left) and says up, down, left and right on the picture.

Honest rules: a position is not a detection. A "Not detected" image adds "though nothing is seen there in this image", and a "Flagged" image adds "though its measurement in this image is flagged as failed".

These are viewer-only extras, like `brightness` and `note`. They are not sent in the `selenites:mark-candidate` event.

### Reading the pipeline's files

`site/js/viewer.js` (`fromPipeline`) translates Elisabetta's `site/data/<slug>.json` on load, so her files stay as they are:

- Status `not_detected` becomes `not-detected`, `no_observation` becomes `no-observation`, and `no_data` (the measurement failed, for example masked pixels) becomes a fifth state, **Flagged** (the usual photometry term for a measurement marked unusable by quality flags), with its own shape: an outline struck through. RULES section 5 lists four states; tell the team about this fifth one when they are free.
- ISO dates become "15 August 2025, 20:46 UTC". Brightness is `flux_mjysr`, shown in MJy/sr.
- Picture paths start at the repository root (`data/processed/...`). GitHub Pages may serve only `site/`, so `tools/copy_site_pictures.py` copies every picture the site JSON files name into `site/data/pictures/` (same layout), and the viewer reads them there. Run it after each pipeline run: `python tools/copy_site_pictures.py`.
- `site/js/app.js` reads `NaN` and `Infinity` in the files as "no value". Python's `json` writes them, but browsers refuse them, and one in a file stops the whole target loading. **OPEN** for Elisabetta: write `null` instead (for example `json.dump(..., allow_nan=False)` after replacing NaN values).
- When a file has no `summary`, the viewer writes a factual one: how many images, the date span, the data release and DOI, and how many images have a picture on the site.

## How we test before the freeze (6 PM, 15 November)

1. Keyboard only, no mouse, start to finish.
2. NVDA on Windows, and VoiceOver on a phone or Mac if one can be borrowed.
3. Zoom to 200 and 400 percent, and phone width.
4. Windows high contrast and the reduced motion setting.
5. If possible, one blind or low-vision tester. Record what they find in `docs/`.

## Not in the first build

Text size and spacing controls, a keyboard shortcut list, skip links inside the viewer, CSV download, a read-aloud button, game alternatives and Mark a Candidate without a mouse (Shrashti's spec covers the last two).

## Open items

- The 4.27 micron switch-on and the ice wavelengths are not confirmed yet (project plan, section 12).
- Brightness values and the status rules need Elisabetta.
- Someone has to write the target summaries (item 4) and have them checked.
