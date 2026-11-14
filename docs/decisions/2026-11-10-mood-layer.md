# Mood layer: Immersive vs Scientific audio

Date: 10 November 2026
Decided by: Pawana (idea from Elisabetta, toggle from Pawana)

## Decision

- The viewer gets an audio toggle with two modes: **Scientific** and **Immersive**.
- **Scientific** is a sonification of the data only. It is the default.
- **Immersive** adds atmosphere on top. It is off until a visitor turns it on. Sound never starts by itself.
- Immersive shows a short line: the added sound is atmosphere, not data, and not what the object sounds like.
- If ambient sound is tied to background data, the mapping is written in Priyanshi's sound mapping file, one line per sound.
- The asteroid cue is not in the first build. Add it later only for a target that is an asteroid. None of the five test targets is one.

## Why

Keeps the honest rules: say "a sonification", never "this is what the comet sounds like", and never let decoration pass as data.

## Owners

- Toggle in the viewer: Pawana and Yeabisra
- Sound mapping and accessibility checks: Priyanshi
