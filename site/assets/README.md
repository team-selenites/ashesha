# site/assets

**What is here:** the pictures and voices that are not data.

- `ashesha-mark.svg`: the logo, drawn by the team.
- `selene/`, `iris/`, `orpheus/`, `argus/`: the guides' portraits. Made with Google Gemini from prompts written by the team (`docs/character-prompts.md`), then cut out from their green background with `tools/cutout_green.py`.
- `voice/`: Selene's and Iris's recorded lines, made with ElevenLabs from lines written by the team. `voice/manifest.json` lists every recording with its exact words.

**Who owns it:** Pawana.

**How it connects to the rest:** `site/js/selene.js` draws the guides and plays a recording only when the words on screen match it exactly. `docs/selene-voice-script.md` explains how to add or re-record a line.

**Status:** live. Every AI-made asset is logged in `docs/ai-use-log.md` and credited in the page footers.
