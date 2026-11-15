# Acknowledgements

## SPHEREx data

"This publication makes use of data products from the Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute of Technology, and is funded by the National Aeronautics and Space Administration."

Data release DOI: 10.26131/IRSA652 (SPHEREx Quick Release 2, served by the NASA/IPAC Infrared Science Archive, IRSA).

This project is not endorsed by NASA, IRSA, JPL or Caltech.

## Other data and services

- **JPL Horizons** (NASA Jet Propulsion Laboratory): the predicted positions of comet 3I/ATLAS.
- **SIMBAD** (CDS, Strasbourg, France): the positions, names and types of the 110 Messier objects in Your Beginnings. This research has made use of the SIMBAD database, operated at CDS, Strasbourg, France.
- **IRSA** image search and data access services, used by the pipeline.

## Software

- **Astropy**, **astroquery**, **PyVO**, **NumPy**, **pandas** and **Matplotlib**, used by the data pipeline in `pipeline/` and `tools/`. This research made use of Astropy, a community-developed core Python package for astronomy.
- The website uses no framework and no outside code library.

## Type and colour

- **Atkinson Hyperlegible**, a typeface made by the Braille Institute for low-vision readers, loaded from Google Fonts under the SIL Open Font License.
- The Colour-blind friendly theme uses the **Okabe-Ito** palette (Masataka Okabe and Kei Ito).

## AI use

- **Claude Code** (Anthropic) helped write and review the website code, the pipeline and the documents.
- **Google Gemini** made the portraits of Selene, Iris, Orpheus and Argus, from prompts written by the team (`docs/character-prompts.md`).
- **ElevenLabs** made Selene's and Iris's recorded voices, from lines written by the team (`docs/selene-voice-script.md`).

Every use, with its date, is in `docs/ai-use-log.md`. Each page of the site also credits the AI-made portraits and voices in its footer.

### Elisabetta (data pipeline): AI use statement

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
