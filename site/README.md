# site

**What is here:** the whole website. GitHub Pages publishes this folder as https://team-selenites.github.io/ashesha/

- `index.html`: the home page, with the Spot the mover game, the guides' cards, the sky map and the team.
- `viewer.html`: the sky viewer, in three steps (choose a patch of sky, watch it change, My candidates).
- `spot-a-candidate.html`, `cryostella.html`, `beginnings.html`, `stories.html`: the other learning sections.
- `css/stories.css`: styles for the Stories from the Sky page.
- `404.html`, `robots.txt`, `sitemap.xml`, `llms.txt`, `site.webmanifest`: the files search engines, AI assistants and browsers look for.
- `css/`, `js/`, `assets/`, `data/`: shared styles, code, pictures and voices, and the data the pages read.

**Who owns it:** Pawana (design, interface and sky viewer). Shrashti owns the Mark a Candidate module inside it.

**How it connects to the rest:** the pages read plain JSON and PNG files from `site/data/`, which `pipeline/` and `tools/` write. There is no build step and no server code.

**Run it:** `python -m http.server 8000 --directory site`, then open http://localhost:8000

**Status:** live.
