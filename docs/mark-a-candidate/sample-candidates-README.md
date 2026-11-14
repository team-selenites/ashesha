# sample-candidates.json — schema notes

Team Selenites · NASA Space Apps Challenge 2026 · SPHEREx · Module: Mark a Candidate (owner: Shrashti)

**All records in this file are synthetic example data** (`Sample Comet A`, `Sample Comet B`, `SAMPLE-xxxx`). They are not SPHEREx measurements. `mjd` values that are present were derived from the observation date at 00:00 UT for illustration only; null means "not supplied". Asset paths are placeholders.

The same five records appear on every screen of `My-Candidates-Wireframe-Final.html` and `.pdf`.

## 1. Export wrapper

| Key | Type | Meaning |
|---|---|---|
| `format` | string | Always `"selenites-candidates"`. |
| `version` | integer | Schema version, currently `1`. |
| `exportedAt` | string | ISO 8601 UTC time the export was made. |
| `candidates` | array | Saved candidate records, in the visible order at export time. |

Import is out of scope. An exported file is a backup copy; it is **not** read back into the application.

## 2. Candidate record

Each record has 18 keys: 3 application fields, the 12 viewer observation fields, 2 viewer event-envelope fields, and the optional viewer description.

### Application fields (added by My Candidates)

| Key | Type | Rules |
|---|---|---|
| `candidateId` | string | Generated once at save time. Unique in the collection. Never derived from an array index. Stable through note edits, sorting, view changes, delete and Undo. Distinct from `obs_id`. |
| `savedAt` | string | ISO 8601 UTC time the candidate was first saved. Set once. Never changed by editing the personal note. Restored exactly by Undo. Not the observation date. |
| `personal_note` | string or null | The user's own annotation. Optional (empty string or null means none). Editable. Never merged with `note`. Not a scientific result. |

### Viewer observation fields (exactly 12, names unchanged)

These are the fields of `event.detail.observation` in the viewer event `selenites:mark-candidate`. They are stored as received, never renamed or reinterpreted.

| Key | Type | Meaning |
|---|---|---|
| `target` | string | Target name. Always present. |
| `obs_id` | string or null | Observation identifier. |
| `ra` | number or null | Right ascension, degrees. |
| `dec` | number or null | Declination, degrees. |
| `date` | string or null | Astronomical observation date (`YYYY-MM-DD`). |
| `mjd` | number or null | Modified Julian Date. |
| `detector` | integer or null | Detector number, 1 to 6, as supplied, e.g. `3`. The interface adds the word "Detector" on screen ("Detector 3"); the stored value stays a number. |
| `wavelength_um` | number or null | Wavelength in micrometres (µm). |
| `thumbnail` | string or null | Thumbnail path or URL. If null the card shows a neutral placeholder. |
| `image_url` | string or null | Image path or URL. Kept in the record, not shown as raw text. |
| `view_link` | string or null | Link that must open the exact observation. Relative links are made absolute at runtime from the browser's current location; no domain is hard-coded. |
| `status` | string | Always present. Scientific observation status, see section 4. |

### Viewer event-envelope fields (not part of the 12 observation fields)

| Key | Type | Meaning |
|---|---|---|
| `image_number` | integer | Position of the image in the target's sequence, counting from 1. Not an identifier. |
| `image_count` | integer | Total number of images in that sequence. |

They arrive beside `observation` in the event payload (`{ observation, image_number, image_count }`) and are preserved in every saved record. They are never placed inside the 12-field observation object.

### Optional viewer description

| Key | Type | Rules |
|---|---|---|
| `note` | string or null | Description supplied by the viewer. Optional, **read-only** in My Candidates, preserved when supplied, never overwritten by `personal_note`. The interface shows "No description available" when absent. |

**Integration dependency:** `note` is *not* part of the official 12-field event contract. The viewer team must confirm the source and transfer mechanism for it. The data model and interface accommodate it meanwhile. It must not be added to the event object without that confirmation.

## 3. Duplicate rule

Duplicate check key: a **non-empty `obs_id`**, on its own. `obs_id` is the only identifier for an image.

- Match: no new candidate, no overwrite, `personal_note` untouched. The existing candidate is flagged ("This observation is already in My Candidates.") with a "View existing candidate" action. Its `candidateId`, `savedAt`, `personal_note` and metadata stay as they were.
- `obs_id` missing or empty: saved separately; duplicates are never guessed from target, coordinates or date.
- Same target with a different `obs_id`: a separate candidate.
- `image_number` is never part of the key. It is a sequence position and can change when the data set is rebuilt, so the same image can come back with a different number.

In this sample file all five records have distinct `obs_id` values.

## 4. Status ownership

The viewer owns the scientific observation status. My Candidates receives it, stores the raw value, shows the label, and never edits, reinterprets or invents it. The stored status is the status at the time of saving; there is no automatic refresh.

| Raw value | Display label | Saveable |
|---|---|---|
| `clear` | Clear detection | yes |
| `faint` | Faint | yes |
| `not-detected` | Not detected | yes |
| `no-observation` | No observation | no. Disabled in the viewer, and the module rejects such an event. No record in this file has this status. |

## 5. Storage

Records live in browser `localStorage` under `selenites.myCandidates.v1`. It is browser-specific and device-specific, not synced, not encrypted, and may be erased when browser data is cleared.

## 6. Sample coverage

| Obs ID | Target | Image | Status | Observed | Saved (UTC) | `note` | `personal_note` |
|---|---|---|---|---|---|---|---|
| SAMPLE-0012 | Sample Comet A | 12 of 40 | faint | 2026-03-14 | 2026-11-12T09:30:00Z | yes | yes |
| SAMPLE-0007 | Sample Comet A | 7 of 40 | clear | 2026-02-20 | 2026-11-11T17:05:00Z | yes | empty |
| SAMPLE-0003 | Sample Comet A | 3 of 40 | not-detected | 2026-01-30 | 2026-11-10T08:12:00Z | null | yes |
| SAMPLE-0121 | Sample Comet B | 21 of 36 | clear | 2026-03-01 | 2026-11-09T14:40:00Z | null | null |
| SAMPLE-0105 | Sample Comet B | 5 of 36 | faint | 2026-02-11 | 2026-11-08T11:20:00Z | yes | yes |

Note: in the plain-text summary and export, a typographic minus on screen becomes an ASCII `-`, so values paste cleanly.


## 7. Integration handling

The viewer dispatches a cancelable `selenites:mark-candidate` `CustomEvent` on `document`. The payload is in `event.detail` and contains `observation` (the exact 12-field object), `image_number` and `image_count`. The module calls `event.preventDefault()` when it handles the event.

After a successful save the module announces, through the polite live region, "Saved as candidate N.", where N is the number of saved candidates including the new one (so the second save says "Saved as candidate 2."). A duplicate announces "This observation is already in My Candidates." instead. If the module did not handle the event, the viewer itself announces that the image was not saved (REQUIREMENTS B-9). The optional viewer `note` remains outside the official 12-field event object until the viewer team confirms its source and transfer mechanism.

The matching technical specification is `Mark-a-Candidate-Technical-Spec-v1.1.docx`. The wireframe PDF and HTML are companion design artifacts; controls are illustrative, not a working application.
