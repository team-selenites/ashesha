# Acknowledgements

## Data

"This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration."

Data release DOI: 10.26131/IRSA652

## Tools and AI use

We used Claude Code during the hackathon. Log of where AI helped:

| Date | What | Who |

Elisabetta (data pipeline) – AI use log
Tool: Claude (Anthropic), November 2026.

What Claude did:
- Wrote the Python pipeline (pipeline/build_stacks.py) that finds SPHEREx QR2 images through IRSA, reads small cutouts, makes labels, stacks and weekly images, and writes the site JSON and the games data.
- Helped find and fix errors in the pipeline (for example the first S/N labels were too optimistic and were corrected after testing on a real cutout).
- Wrote the raw-data notes (data/raw/NOTES.md).
- Reviewed the practice cases in lessons.json against the pipeline tables and suggested two wording fixes.
- Looked up public facts (SPHEREx pixel size, comet designation, DOI, a proper motion) on web pages, which I then used with the source named in the notes.

What I did myself:
- Ran the pipeline on my own computer on all six targets and checked the outputs and images.
- Checked the numbers used in the lessons (Epsilon Indi B, R Dra, WISE 0855) against my tables.
- Decided what to keep, what to send to the team, and uploaded the files.
