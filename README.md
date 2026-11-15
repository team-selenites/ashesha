# Ashesha: follow a comet through SPHEREx

Ashesha is a website for watching the sky change in NASA's SPHEREx survey. It is made to be used by everyone, including blind, low-vision, colour-blind, deaf and neurodivergent visitors. Team Selenites built it for the NASA Space Apps Challenge 2026 (challenge: Planet X and SPHEREx).

**Live site:** https://team-selenites.github.io/ashesha/

The name is Sanskrit for "without remainder". The logo turns the A over into ∀, the mathematician's sign for "for all".

## What it does

SPHEREx is a NASA infrared space telescope that maps the whole sky in 102 colours. Pick an example or type a sky position (right ascension and declination), and the sky viewer plays every SPHEREx picture of that patch in date order, like a short video, with a Then and Now strip underneath. Stars hold still. Anything that moves or changes stands out.

The headline example is the interstellar comet 3I/ATLAS, with a colour slider that walks through SPHEREx's infrared colours. The challenge's five test targets (Barnard's Star, Epsilon Indi B, WISE 0855, RW Aurigae and R Draconis) are one-click examples. Together the six targets hold 1,838 SPHEREx images from the QR2 data release.

## What is built

| Part | What it is | Page |
| --- | --- | --- |
| Sky viewer | Every picture of a patch in date order, a timeline, a Then and Now strip, Compare two, a colour slider, a data table, and a written description of each picture | `site/viewer.html` |
| Mark a candidate | Mark a picture worth another look, keep notes, and export the list. Saved in the visitor's browser only | step 3 of the sky viewer |
| Spot a candidate | Five short steps with Selene on when a picture is worth marking, with trick examples from real SPHEREx pictures | `site/spot-a-candidate.html` |
| Cryostella | Four steps with Iris: walk past red into infrared, read a real spectrum, hear it as sound, then a listening game | `site/cryostella.html` |
| Your Beginnings: The First Light | Enter a birthday and see the ring of sky SPHEREx photographed on that date, and the Messier objects inside it | `site/beginnings.html` |
| Feel the Aetheria | The access features on every page: keyboard use, words for every picture, tables for every chart, three colour themes, recorded guide voices that can be switched off | all pages |
| Guides | Selene (Moon) and Iris (rainbow) lead a tour of each part. Their words are on screen, and their recorded voices are optional | all pages |

## What is not built yet

We would rather say this plainly than let a page promise too much.

- **Live search of the archive.** A typed position opens only when it falls inside one of the six prepared patches. Anywhere else, the site says how far away the nearest prepared patch is.
- **Cosmic Orchestra.** The sound of a spectrum plays in Cryostella. Sound for movement in the sky viewer is designed (`docs/sonification-design.md`) but not built.
- **Weave the Cosmic Tapestry.** The data for the two games, Timeline Puzzle and Predict the Path, is prepared in `site/data/`. The game pages are not built.
- **Screen reader testing.** The site was checked by keyboard and by script in the browser. A full pass with the NVDA screen reader is still to do.
- **Four guide lines** are waiting for a voice recording. They are listed in `docs/selene-voice-script.md`. Their words still appear on screen.

## Links you can share

- `viewer.html?target=3I-ATLAS` opens a prepared target. The other names are `barnards-star`, `epsilon-indi-b`, `wise-0855`, `rw-aur` and `r-dra`.
- `viewer.html?ra=133.79&dec=-7.24` opens the prepared patch that covers that position, if there is one. Right ascension can be in degrees or in hours, minutes and seconds.
- Every picture in the viewer has its own link, in the Details tab.

## Run it on your computer

The site is plain HTML, CSS and JavaScript. It has no build step and no server code.

```bash
python -m http.server 8000 --directory site
```

Then open http://localhost:8000 in a browser. Opening the files directly from disk does not work, because the pages load their data files.

## Where is what

| If you want to... | Go to |
| --- | --- |
| Open the website code | `site/` |
| See the prepared data and what each file means | `data/` and `site/data/` |
| See how SPHEREx images become website files | `pipeline/` and `tools/` |
| Understand the design, access and sound decisions | `docs/` |
| Read how AI was used | `docs/ai-use-log.md` |

Each folder has its own short README.

## New data releases

Each data file records the SPHEREx release it came from. When a new release comes out, re-run the pipeline and the tools for each target and commit the new files. The page code does not change. The steps are in `pipeline/README.md`.

## The team

Pawana, Elisabetta and Shrashti.

- Pawana Shettigar: team lead. Design, all of the interface and styling, and the sky viewer.
- Elisabetta Pavone: the data pipeline, the prepared data and the game data.
- Shrashti Mittal: the Mark a Candidate module.

The organisers confirmed that code written before the hackathon is allowed. `docs/ai-use-log.md` lists the work by date, from 10 November 2026.

## Data and credits

This project uses SPHEREx data from the NASA/IPAC Infrared Science Archive (IRSA). The required acknowledgement text, the data DOI and all other credits are in `ACKNOWLEDGEMENTS.md`. This project is not endorsed by NASA or IRSA.

A candidate is a picture worth another look, not a discovery. The sounds are a sonification: sounds mapped by rules we chose, not a recording of any object.

## Accessibility

Accessibility is the main goal of this project. The viewer's must-haves are in `docs/viewer-accessibility-spec.md`. Every page works by keyboard alone, has three themes (Light, Dark and Colour-blind friendly), never shows meaning by colour alone, and follows the reduced motion setting. Data sounds play only when the visitor presses Play. The guides' recorded voices start on, wait for a screen reader to finish, and can be switched off with one button that is remembered.

## How AI helped

Claude Code (Anthropic) helped write and review the code. Google Gemini made the guides' portraits from prompts the team wrote. ElevenLabs made the guides' recorded voices from lines the team wrote. Every use is logged in `docs/ai-use-log.md`.

## Licence

MIT. See the `LICENSE` file. The SPHEREx data keeps its own terms: see `ACKNOWLEDGEMENTS.md`.
