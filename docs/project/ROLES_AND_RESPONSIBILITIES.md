# Team Selenites: Roles and Responsibilities

**Team:** Pawana, Elisabetta, Shrashti

**Source of truth:** the living roles doc in Claude Docs. This file is a snapshot as of 9 November 2026, matching the decisions made that day.

## Roles

| Person | Role | Owns |
| --- | --- | --- |
| Pawana | Project lead and main viewer builder | The main viewer build with Claude Code. Detection labels. Cryostella. Your Beginnings: The First Light. Submission text. Science tracks. Decides only when the team is stuck, within five minutes. |
| Unassigned | Co-builder, tester, and quality lead | Co-builds the main viewer with Claude Code in their own session. Tests the viewer. Tracker and daily check-ins. Honest rules checklist. Data checks (dates, positions, units, wavelengths). False positive checks. Outsider tests. |
| Elisabetta | Data pipeline and games | IRSA data pipeline, DataLink step, prepared stacks for the five test targets and the comet, and game data. Difference images and candidate list. |
| Shrashti | Mark a Candidate module only | Builds the Mark a Candidate module on her own schedule. Not on the critical path. Moves to Rome on 13 November. |
| Unassigned | Sound design and accessibility lead | Sound mapping spec and sound key text. Accessibility checklist and tests. Feel the Aetheria. Learn-to-listen logic. |
| Unassigned | Story, narration, and video lead | Selene's stories and scripts, learn-to-listen scripts, narration and captions, the 90 second demo video, the wording for Mark a Candidate, and Sky postcard captions and translations. |

## Mark a Candidate: Shrashti's deliverables

- **By Thursday 12 November:** a one-page spec, a sketch of the "My candidates" list, and a sample JSON file. No code before 14 November.
- **During the hackathon:** save a candidate; the list (open, delete, edit note); export as text and JSON; copy link. Fully keyboard and screen-reader accessible. Always say "candidate", never "discovery".
- **Ready for integration:** Sunday 15 November, 12:00 UTC (13:00 Rome).
- **If travel gets in the way:** someone else builds it from her spec.

Module contract: the viewer dispatches an event named `selenites:mark-candidate` carrying the observation object (target, obs_id, ra, dec, date, mjd, detector, wavelength_um, thumbnail, image_url, view_link, status).

## Who to ask for what

| Question | Ask |
| --- | --- |
| Can I change the plan or the timeline? | Pawana |
| Is the main viewer build on track? | Pawana |
| Where does this data file come from? | Elisabetta |
| Is this science claim right? | Pawana (science), unassigned (data checks) |
| Does this feature work with a keyboard, screen reader, or sound? | Pawana |
| What should a story or caption say? | Pawana |
| Mark a Candidate? | Shrashti |

## Working agreements

- Before 14 November: docs, specs, and research only. No project code in the repo. The repo is private until 14 November.
- From 14 November: one branch per task, one pull request per branch. A second person reviews anything that changes the public site.
- Anyone who uses AI tools for a piece of work notes it in ACKNOWLEDGEMENTS.md, as the README says.
- Check-ins are short and daily during the hackathon, run by Pawana.

## Checklist

- [ ] Everyone has access to the GitHub repo
- [ ] Everyone has Claude Code set up
- [ ] Shrashti's spec is in `docs/` by Thursday 12 November
- [ ] Each person knows who to ask for what
