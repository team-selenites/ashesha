# Team Selenites: Follow a Comet Through SPHEREx

An accessible tool for watching the sky change in NASA's SPHEREx survey, made for everyone, including blind, low vision, colour blind, deaf and neurodivergent users. Built for the NASA Space Apps Challenge 2026 (challenge: Planet X and SPHEREx).

**Status:** in development. The viewer, Selene's guided tour and the viewer side of Mark a candidate are built with practice pictures. Real SPHEREx data and the sound, games and story layers come next. The organisers confirmed that code written before the hackathon is allowed; commit messages show what was built before and during 14 to 15 November 2026.
**Live site:** GitHub Pages, published when the repository goes public on 14 November.

## What is this?

SPHEREx is a NASA infrared space telescope that maps the whole sky in 102 colours. Type a sky position (RA and Dec) or pick an example, and the tool plays every SPHEREx picture of that patch in date order, like a short video, with a Then and Now strip underneath. The headline example is the interstellar comet 3I/ATLAS; a colour slider lets you watch it switch on near 4.27 microns. The five challenge targets (Barnard's Star, Epsilon Indi B, WISE 0855, RW Aurigae and R Draconis) are one-click examples. Sound, stories and short games make the sky open to everyone.

Links can open the tool directly, for example `?target=3I-ATLAS`. Links with coordinates (`?ra=<degrees>&dec=<degrees>`) are planned.

## Where is what?

| If you want to... | Go to |
| --- | --- |
| Understand the plan | docs/ |
| See the data and what each file means | data/ |
| See how raw data becomes website files | pipeline/ |
| Read the science checks | analysis/ |
| Open the website code | site/ |
| See our tests | tests/ |
| Read our Space Apps submission | submission/ |

## Our features

| Name | What it is | Folder |
| --- | --- | --- |
| Cosmic Orchestra | Sound features | site/ |
| Feel the Aetheria | Visual impairment features | site/ |
| Weave the Cosmic Tapestry | Games | site/ |
| Cryostella | Frozen water section | site/ |
| Your Beginnings: The First Light | Birthday idea | site/ |

## The team

Pawana, Elisabetta, Shrashti, a team member, a team member and a team member.

## Data and credits

This project uses SPHEREx data from NASA/IPAC's IRSA archive. The required acknowledgement text and the data DOI are in ACKNOWLEDGEMENTS.md.

## Accessibility

Accessibility is the main goal of this project. The viewer's must-haves are in docs/viewer-accessibility-spec.md. The site works by keyboard alone, has three themes (Light, Dark and Colour-blind friendly), never shows meaning by colour alone, and never plays sound or motion by itself.

## How AI helped

We used Claude Code, and a Gemini image for Selene's picture. Every use is logged in docs/ai-use-log.md for the submission's AI use statement.

## Licence

MIT. See the LICENSE file.
