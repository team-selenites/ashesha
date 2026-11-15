# Sonification design: B-2, B-3 and B-5

Draft for Pawana to approve, 15 November 2026. The numbers are in `site/data/sound-key.json`. Only B-5 is built; it awaits the NVDA test. All of it is the Scientific layer: data only, off until a button press, labelled "a sonification: sounds mapped by rules we chose".

## What stays

Pitch follows wavelength (220 to 880 Hz) and loudness follows brightness, as in Cryostella. The Spectrum Player already uses it, and a visitor learns one rule for the whole site.

One addition for the viewer: the pitch range is fixed to 0.75 to 5 microns, so a colour is the same note on every target.

## B-2: motion sonification (while the images play)

Each image plays up to two short sounds in turn.

| Sound | Follows | Why |
| --- | --- | --- |
| Note: a smooth tone, 0.18 s | Pitch is the image's wavelength. Loudness is its brightness, scaled within the target | This is what SPHEREx measured |
| Slide: a softer, reedier tone from 440 Hz | The move of the predicted position since the last image | Predicted, not measured, so it gets a different voice |
| One soft low tick | "Not detected" | An image exists, nothing was seen, no note plays |
| Two ticks | "Flagged" | A failed measurement is not an empty one |
| Silence | "No observation" | Nothing to play |

The slide uses the same eight compass directions as the B-1 sentence, so sound and text cannot disagree.

- East slides to the left ear and west to the right, as on a sky chart. The PNGs are not turned north up (Elisabetta, 15 November), so directions are on the sky, never on the picture.
- North bends the note up, south bends it down.
- Length follows distance in three steps, tied to the unit the sentence uses: 0.15 s for arcseconds, 0.3 s for arcminutes, 0.5 s for degrees. Under 1 arcsecond there is no slide.

I dropped the requirement's "height sets pitch": the cutouts are centred on the target, so it never moves on the picture, and pitch already means colour.

**A listener can tell:** a short or a long colour, louder or quieter within one target, whether anything was detected, which of eight directions the predicted position moved, and whether the move was small, medium or large.

**A listener cannot tell:** exact microns, brightness or arcseconds, or whether a loudness change is real, because each image is a different colour. On one speaker, or with one hearing ear, east and west are lost; the text carries them. A slide never means SPHEREx saw the object move.

The five stars almost never move 1 arcsecond between images, so they play no slides and their summary sentence carries the movement. On the comet 182 of 255 images are "Not detected", so its playback is mostly ticks.

## B-3: keyboard image explorer (stepping between pictures)

After the visitor presses "Explore with sound", each step with the existing keys (arrows, Home, End; no letter keys, B-4) plays that image's B-2 sounds once, in under 0.9 seconds. Then the description is read.

- Holding an arrow key skims the pictures. Each new step fades the last sound out in 0.05 s, so notes never pile up. Speech waits until the keys have rested for 0.4 s.
- A soft low thud marks the first and last image, and a "Hear this image again" button repeats the sound.

Why: playing and stepping share one set of sounds, and a blind visitor can skim 255 images by ear and stop at a note among the ticks.

**Can tell:** where the detections sit in the series, and each image's colour, loudness and move. **Cannot tell:** anything inside a picture. The requirement's pixel cursor is parked: it needs measured pixel values from the pipeline, because the PNGs are stretched for display.

## B-5: separation

One thing at a time. The sound stops for speech and is never just turned down: a quiet sound under a voice is still an overlap.

- **Guide's voice.** Starting a sound stops Selene or Iris. Starting her voice stops the sound (0.05 s fade). A guide line due while a sound plays waits until 0.25 s after it ends.
- **Guide and screen reader.** Each guide line is heard once. While her recording plays, its words are not sent to the screen reader; with her voice off, or no recording, they are. Her voice waits 1 second after the tour moves focus, so the heading is read first. Tab or Escape stops her. Voices stay on by default.
- **Sound and screen reader.** During playback the live region stays silent and the description is written on pause. When stepping, the text is written 0.25 s after the sound ends.
- **Own controls.** The sound has its own volume slider and off switch, separate from the guide's voice. The switch is kept for one visit; a new visit starts off. Escape, hiding the tab or opening another step stops it at once.

**Limit:** a web page cannot tell when a screen reader is talking, or ask it to wait. We choose only what we give it to read, and when. The NVDA test (B-12) must confirm this.

## Safety and comfort

- No sound exceeds gain 0.22, ticks are 0.05, and a master limiter caps the total at 0.3. The volume slider only turns sound down.
- Every sound fades in and out. New sounds stay between 110 and 880 Hz.
- With prefers-reduced-motion, a slide becomes two steady notes (where it was, where it is), with no sweep.
- Every sound has a `meaning` and a `text` equivalent, shown on screen. With sound off, nothing is lost.

## Decided, 15 November

Pawana chose ticks. The other choices are Claude's best estimates, at her request. Cryostella keeps its pitch range and now has the limiter.
