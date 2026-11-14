# Making Selene fully animated

Team Selenites, 10 November 2026. How to turn Selene into a talking, gesturing character for the guided tour, with free tools. The site is already built for it: drop the clips in and switch one setting.

## How it works on the site

- Each tour step plays a short clip of Selene talking, made on a **flat green background**.
- The page removes the green live (a "chroma key", like a weather presenter's green screen), so only Selene shows, standing in front of a moon the page draws itself. No box, no background, in every theme.
- Her voice is the clip's own sound. With the speaker button off, the clip plays silently and the words still type out in step with it.
- Reduced motion shows a still picture of her instead (her voice can still play).

Done so far (10 November): step 1. Pawana made Selene and her moon on green in Gemini; she is cut out as `site/assets/selene/selene-cutout.webp`, and her lips and blinks already move in code while she talks. The clips below would add gestures and head movement on top.

## Step 1: Selene on a green background (Gemini, free)

Open the Selene portrait in Gemini and ask:

```
Recreate this exact character: same face, curly dark violet hair, gold laurel crown with the
silver crescent, gold earrings, white chiton with gold crescent clasps and lavender drapery, and
the same soft watercolour style. Half-length portrait from the waist up, facing the viewer,
centred, calm gentle smile, mouth closed, both hands visible and relaxed in front of her.
Background: one flat, solid, pure green colour (#00FF00) filling the whole image, with no moon,
no stars, no paint splashes, no shadow and no glow on the background. Clean edges around her
hair. Nothing green on her. Portrait orientation, 3:4.
```

Save it as `selene-green.png`. Send it to Claude Code: it can cut her out for the still picture straight away.

## Step 2: her voice (one file per line)

Use the lines in `docs/selene-voice-script.md`. Either:

- **a team member records them** (most human, nothing to declare), or
- **ElevenLabs, free plan**: pick a warm, calm female voice, speed about 0.95, and download one MP3 per line. Free output is non-commercial and must be credited ("Voice made with ElevenLabs"), or
- **Kokoro** (open source): Claude Code can make the files on the laptop after a download of about 120 MB.

## Step 3: make her talk (Dreamina, free daily credits)

1. Go to Dreamina (CapCut's AI studio) and open **AI Avatar**, which uses the OmniHuman model.
2. Upload `selene-green.png` and one voice file.
3. If there is a prompt box, add:
   ```
   Calm, graceful and warm. Natural lip-sync, soft blinking, gentle explaining hand gestures at
   chest height, small head movements, a soft smile between sentences. Camera completely still.
   Keep the plain green background exactly as it is.
   ```
4. Generate, check it, and download the MP4. Repeat for each line. Free credits refresh daily, so this may take two or three days.
5. Optional: one silent 4-second clip of her breathing and blinking, for between steps.

Check whether free videos carry a watermark. If they do, tell Claude Code; a corner mark can sometimes be cropped, otherwise another tool is needed.

Backups if Dreamina is busy: HeyGen's free plan (about 3 short videos a month, watermarked) or Hedra (only a few free seconds).

## Step 4: put them in the site

1. Name the clips `selene-tour-1.mp4` to `selene-tour-7.mp4` (same order as the script) and put them in `site/assets/selene/`.
2. In `site/js/tour.js`, change `var ANIMATED = false;` to `var ANIMATED = true;`.
3. Ask Claude Code to check the edges (green fringe on hair) and tune the key, and to shrink the files if they are large.

## Credit and honesty

- Add each tool to `docs/ai-use-log.md` and to the site footer (for example "Selene animated with Dreamina; voice by ...").
- Ask the Space Apps organisers whether AI-generated images, voices and video are fine. No published rule was found online as of 10 November 2026.
