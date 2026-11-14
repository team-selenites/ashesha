# Supporting characters: Gemini prompts

Team Selenites, 12 November 2026. For Pawana to generate with Google Gemini, like Selene's portrait.

The project plan names three supporting characters besides Selene: **Iris** (colours), **Orpheus** (sound) and **Argus Panoptes** (SPHEREx's 102 colours). Each is made the same way as Selene: one picture on a flat green background, which our script cuts out, so the page can place the character on any theme and give it the same moving lips, blinks and explaining hand.

## How to use

1. Paste the **shared rules** first, then one **character** block, as a single message to Gemini.
2. Check the result against the checklist at the end. If anything green appears on the character, or the background is not flat, ask Gemini to fix only that ("make the background one flat colour #00B140 with no shading"; "remove all green from her clothes").
3. Save the full-size picture in `site/assets/<name>/` and tell Claude Code; it will cut out the green, measure the mouth and eyes for the lip rig, and split off the raised hand.
4. Log it in `docs/ai-use-log.md` and credit it in the footer, as for Selene. The Space Apps rules on AI images are still to be checked (see the log).

## Shared rules (paste first, every time)

> Create one character portrait for an educational astronomy website, in the same style as a soft watercolour illustration: semi-realistic, gentle and friendly, natural proportions, delicate ink lines, soft washes of colour, calm expression. Show one adult character only, from the waist up, facing the viewer at a slight three-quarter angle, centred, with empty space around them.
>
> Green screen rules, very important: the background must be one completely flat, even chroma-key green, colour #00B140, edge to edge, with no gradient, texture, vignette, light spill, shadow, floor or horizon. Do not use any green, teal, lime or olive anywhere on the character: not in clothes, eyes, jewellery, objects or light effects. No see-through fabric, veils, glass, smoke or glow that the green would show through. Keep the outline of the hair and clothes clean and clearly separated from the background, with no stray wisps fading into it. No text, logo, watermark, signature or frame.
>
> Pose, so the character can be animated: mouth gently closed and relaxed, lips clearly drawn; both eyes open and looking towards the viewer; one hand raised at shoulder height on the right side of the picture, palm open and fingers slightly apart, as if explaining something, with the whole hand and wrist visible and not overlapping the face or hair; the other hand resting lower, against the chest. Even, soft front lighting. Landscape picture, 4:3, at least 1600 by 1200 pixels.

## Iris: the colours guide

Goddess of the rainbow and messenger between sky and earth. She explains SPHEREx's colours and the colour slider.

> The character is Iris, the Greek goddess of the rainbow, as a warm, curious young woman with light brown skin and long wavy dark hair tied loosely with a gold ribbon. She wears a flowing dress in violet, sky blue, gold and rose, softly blending like a sunrise (no green). Small iridescent wings at her shoulders in violet and gold. In her raised hand she holds a small clear crystal prism, and a thin band of light from it fans out in violet, blue, gold, orange and rose only. A gentle, encouraging smile.

## Orpheus: the sound guide

The musician of Greek myth. He explains the sonification ("sounds mapped by rules we chose") and the Cosmic Orchestra.

> The character is Orpheus, the musician from Greek myth, as a kind, thoughtful young man with dark brown skin, short curly black hair and a neat short beard. He wears a deep blue tunic with a bronze clasp and a wine-red cloak over one shoulder. His lower hand holds a small golden lyre against his chest; his raised hand is open, as if about to explain a sound. A small row of music-note shapes made of soft gold starlight curves above the lyre. A warm, attentive expression.

## Argus Panoptes: the 102 colours guide

The watchful giant of Greek myth, who had many eyes. He stands for SPHEREx seeing the whole sky in 102 colours. Kept friendly, never creepy: no extra real eyes on the body.

> The character is Argus Panoptes from Greek myth, shown as a gentle, friendly giant: a broad-shouldered older man with warm pale skin, kind eyes, a short silver beard and silver hair. He wears a deep indigo robe embroidered with many small round gems, like little stars, in 102 different colours from deep violet through blue, gold, orange and red (no green, use teal-blue sparingly at most). His raised hand is open, as if pointing out the colours on his robe. A calm, wise, slightly amused expression. No eyes anywhere except his own two.

## Check before using a picture

- [ ] The background is one flat green from edge to edge, with no shadow or shading.
- [ ] There is no green, teal or lime anywhere on the character.
- [ ] Nothing is see-through (veils, glows, glass).
- [ ] The mouth is closed and relaxed, the lips are clear, and both eyes are open.
- [ ] One raised, open hand on the right side, not touching the face or hair; the other hand lower.
- [ ] Waist up, centred, with space around the character.
- [ ] No text, logo or watermark.

## Where each one appears (planned)

The project plan (part 5, Selene and the stories) names the three and what they stand for. Where each will appear, tied to the plan's parts:

| Character | Where they appear | What they do there |
| --- | --- | --- |
| Iris | The colour slider and the viewer's Colour tab (part 1); Cryostella (part 6) | Guides people through SPHEREx's colours: what a micron is, where the comet switches on near 4.27 microns, and how a spectrum (brightness against colour) works. |
| Orpheus | Cosmic Orchestra (part 2), Learn to listen (part 4) and the Spectrum Player | Explains what each sound stands for, says it is a sonification (sounds mapped by rules we chose), and leads the listening practice. |
| Argus Panoptes | The SPHEREx introduction in Selene's stories (part 5), and the viewer's Details and Table tabs | Explains, playfully, how SPHEREx sees the whole sky in 102 colours (a fun parallel, not a literal one), and points out the facts behind each picture. |

Selene stays the main guide (the tour and the tips on every step); the others step in only in their own part, so only one character is on screen at a time.

## Made (12 November 2026)

| Character | Cut-out | Notes |
| --- | --- | --- |
| Iris | `site/assets/iris/iris-cutout.webp` (842 x 713) | Her prism and the light beam came through the cut-out cleanly. |
| Orpheus | `site/assets/orpheus/orpheus-cutout.webp` (670 x 692) | The golden notes stay, including the ones off his cloak. |
| Argus Panoptes | `site/assets/argus/argus-cutout.webp` (727 x 709) | |

Cut out with `python -I tools/cutout_green.py <picture> <output.webp>`; the script reads the green from the picture's own border, un-mixes the edge colours, removes green spill and Gemini's corner mark, and trims to the character. Gemini returned 1024 x 765 pictures, smaller than the prompt asked for but larger than they will be shown. Keep the original green pictures outside the repository in case they need cutting again.

Before a character speaks on the site: measure its mouth, eyes and wrist on its cut-out (as `RIG` in `site/js/selene.js` for Selene), split off its raised hand, and credit the picture in the footer.

## Optional: talking clips

For fully animated characters, the clip recipe in `docs/selene-animation-recipe.md` applies to these characters too; the same green-screen rules carry over to the video.
