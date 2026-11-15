# site/js

**What is here:** the site's JavaScript. Plain scripts, no framework and no build step. Each file starts with a comment that says what it does.

| File | What it does |
| --- | --- |
| `nav.js`, `theme.js` | The menu and the colour theme switch, shared by every page |
| `selene.js`, `guide.js`, `cloud.js`, `tour.js` | The guides: their pictures and moving lips, recorded voices, tip clouds and guided tours |
| `home.js` | The home page: Spot the mover, the guides' cards, the sky map and the team's constellations |
| `examples.js`, `app.js`, `viewer.js` | The sky viewer: the example list, the three steps and the position box, and the viewer itself |
| `mark-candidate.js` | Mark a Candidate and My Candidates |
| `spot.js`, `cryostella.js`, `beginnings.js` | Spot a candidate, Cryostella and Your Beginnings |

**Who owns it:** Pawana. `mark-candidate.js` is Shrashti's.

**How it connects to the rest:** the scripts read the files in `site/data/` and `site/assets/voice/`. `docs/candidate-event-contract.md` describes how the viewer and Mark a Candidate talk to each other.

**Status:** live. A changed file gets a new `?v=` number where the pages load it, so no browser keeps an old copy.
