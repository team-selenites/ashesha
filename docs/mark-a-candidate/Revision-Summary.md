# My Candidates, final revision summary (14 Nov 2026)

Team Selenites · NASA Space Apps 2026 · SPHEREx · Mark a Candidate (owner: Shrashti). Originals in the supplied zip and spec are untouched.

## Pawana's feedback, item by item
| Item | Addressed by | Screens |
|---|---|---|
| Viewer description in sample JSON | `note` in every record (string or null), read-only, separate from `personal_note`; not added to the 12-field event contract | 2, 12, JSON |
| Snackbar replaced by inline Undo | Inline "Candidate deleted." row + Undo, focus moved to it, stays until the user leaves the view, committed on navigation (option A); exact record restored | 4, 15 |
| Themes | Dark and Colour-blind friendly remain proposals; Light is the default | 16 |
| No-results state | "No matching candidates" + Clear filters (search, all unticked, combined); mobile too | 7, 8, 14 |
| Duplicate rule | `obs_id` alone -> flag, never overwrite; no `obs_id` -> never a duplicate | 9, 12 |
| Status owner | Viewer owns it; module preserves raw value, not editable | 12 |
| One Open label | "Open" everywhere, unique accessible names | 1, 2, 12 |
| Error states | Save, load, copy link, copy summary, with exact messages | 10, 12 |
| Summary format + long lists | Canonical plain-text format; Export Text never truncates | 11 |

## Follow-up fixes (14 Nov, after Pawana's review)
- `detector` is an integer 1 to 6 in the JSON and README; the word "Detector" is added on screen only.
- Duplicate key is `obs_id` alone.
- A successful save announces "Saved as candidate N." (REQUIREMENTS B-9).
- Theme names now match the project: Light (default), Dark and Colour-blind friendly.

## Still open
1. Viewer team: source and transfer of optional `note`.
2. Viewer team: `image_number` / `image_count` supplied exactly as documented; `view_link` opens the exact image.
3. Integration testing of event handling and navigation.
4. For Pawana: Export text / Export JSON placement (not shown in the earlier wireframe), definition of "leaving the view", wording marked Proposed. (Duplicate behaviour when `image_number` is missing is settled: `image_number` is no longer part of the key.)
5. Spec v1.1 (.docx) now matches, including the follow-up fixes.
