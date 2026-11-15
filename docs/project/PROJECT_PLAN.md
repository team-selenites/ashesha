# Team Selenites: NASA Space Apps Challenge 2026 Project Plan

**Challenge:** Planet X and SPHEREx (advanced difficulty)
**Repo:** https://github.com/Team-Selenites-rough-work/spherex
**Status:** Snapshot as of 9 November 2026. The living plan is in Claude Docs.

## 1. Goal

A public, accessible web tool. Anyone types in the coordinates (RA and Dec) of a patch of sky, or picks an example, and sees SPHEREx images of it in date order, played like a little video, with a Then and Now strip underneath. The headline example is the comet 3I/ATLAS. The five challenge test targets (Barnard's Star, Epsilon Indi B, WISE 0855, RW Aurigae, R Draconis) must all work as one-click examples.

Accessibility is the main goal: blind, low vision, colour blind, and deaf users must be able to use it as well as everyone else.

## 2. Scope

Must have, in order:
1. Coordinate search, sky video, Then and Now strip, and the colour slider (the comet switches on near 4.27 microns).
2. Cosmic Orchestra sound, in two layers.
3. Accessibility (Feel the Aetheria).
4. Learn-to-listen onboarding.

Should have:
5. Selene and the stories.
6. Cryostella.
7. Timeline Puzzle.

If time allows:
8. Predict the Path.
9. Your Beginnings: The First Light.

Creative extras once the core works:
10. Mark a Candidate (Shrashti).
11. Sky postcards.

Dropped on 9 November: Hear the difference.

Cut order if time runs short, from the bottom: Sky postcards, Your Beginnings, Predict the Path, Timeline Puzzle, Cryostella. Mark a Candidate stays if the core works. Items 1 to 4 always stay.

## 3. Key decisions (9 November)

- Prepared stacks for the five test targets and the comet's two chapters. Custom coordinates use a live mode with a few images and a progress message.
- Live queries to IRSA from the browser are still untested.
- Feature names are fixed: Feel the Aetheria, Cosmic Orchestra, Weave the Cosmic Tapestry, Your Beginnings: The First Light, Cryostella, Selene.

## 4. Timeline

| Dates | Phase |
| --- | --- |
| Mon 9 Nov | Decisions made. Send Shrashti her brief. Ask organisers in writing about the code rule. Run the browser test. |
| Tue 10 Nov | Update docs. Write the rules page for Claude Code (observation object, module interface, sound mapping, accessibility checklist, themes, fonts). |
| Wed 11 Nov | Wireframes, demo targets, a dummy GitHub Pages deploy. |
| Thu 12 Nov | Shrashti's spec in `docs/`. Everyone's access check. Video storyboard. Team call. |
| Fri 13 Nov | Rest. Shrashti travels. |
| Sat 14 Nov | Hackathon starts. Build order: sky video and strip with colour slider; status labels and permanent links; sound engine; learn to listen; Selene and stories; Cryostella; Timeline Puzzle; Predict the Path; Your Beginnings; then Mark a Candidate and Sky postcards. |
| Sun 15 Nov | Freeze and submit by 6 PM local time. The official deadline is 11:59 PM. |

## 5. Working rules

- One branch per task, one pull request per branch. A second person reviews any change to the public site.
- Every image needs alt text. Every sound has a text or visual equivalent.
- Honest rules: say "SPHEREx observed this object on these dates", "candidate" not "discovery", and "a sonification: sounds mapped by rules we chose". A brightness difference between two pictures is not automatically a real change. Keep a "Just the data" mode.
- Credit the data with IRSA's required acknowledgement and the DOI of the release used (QR2: 10.26131/IRSA652, QR3: 10.26131/IRSA662).
- Decisions go in `docs/`, so they are not lost.

## 6. Risks

| Risk | Mitigation | Owner |
| --- | --- | --- |
| Data or website critical path falls behind (Elisabetta and Pawana) | If either is behind at hour 10 on Saturday, cut the games first and help | Pawana |
| IRSA returns temporary HTTP 503 errors | Quiet retries on every request | Elisabetta |
| Browser cannot call IRSA directly | Prepared stacks cover the five targets and the comet | Elisabetta |
| Accessibility left until the end | Accessibility checklist reviewed at each milestone | Pawana |
| Scope grows past the weekend | Cut order in section 2 | Pawana |
| Deadline missed | Submission drafted before Sunday; freeze at 6 PM | Pawana |

## 7. Open questions

1. Is the repo name `Team-Selenites-rough-work` going to stay, given it goes public on 14 November?
2. Is a live IRSA query from a web page possible?
3. Does the team want the 90 second video, slides, or both?
