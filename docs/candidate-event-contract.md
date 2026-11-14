# Mark a Candidate: event contract

The handshake between the sky viewer (Pawana and a team member) and the Mark a Candidate module (Shrashti). It answers the open questions in section 6 of Shrashti's technical spec. Decided by Pawana on 11 November 2026.

## The event

| Item | Decision |
| --- | --- |
| Name | `selenites:mark-candidate` (unchanged) |
| Dispatched on | `document` |
| Type | `CustomEvent`, `cancelable: true` |
| When | The user activates the **Mark as candidate** button (mouse, touch or keyboard all go through the same click). |

```js
event.detail = {
  observation: { target, obs_id, ra, dec, date, mjd, detector,
                 wavelength_um, thumbnail, image_url, view_link, status },
  image_number: 3,   // place of this image in date order, counting from 1
  image_count: 12    // how many images the loaded set has
}
```

- `observation` carries **exactly** the 12 contract fields from RULES section 3. Nothing is renamed. Viewer-only extras (`brightness`, `flags`, the viewer's own `note`, `irsa_link`) are not sent.
- **Handled signal:** the module calls `event.preventDefault()` once it has dealt with the event, whether it saved the image or found a duplicate. If nobody does, the viewer announces "My Candidates is not ready yet, so this image was not saved." The module announces its own result ("Saved…", "This observation is already in My Candidates.").

## Fields that can be null

`target` and `status` are always present. Any other field can be `null`, especially in practice data and in images from live custom searches. Show "Not available" for null fields, as your spec already says.

## Status values

The `status` value is a string. Show the label, never the raw value.

| Value | Label |
| --- | --- |
| `clear` | Clear detection |
| `faint` | Faint |
| `not-detected` | Not detected |
| `no-observation` | No observation |

Images with status `no-observation` cannot be marked, because there is no picture. The button is disabled there, and the reason is shown under it.

## Image number, position and RA/Dec

- **Image number** and **timeline position** are the same thing: `image_number` (1 = earliest image). It only makes sense together with `image_count` and the target. It can change if the data set is re-made, so never use it as an ID.
- **RA/Dec** (`ra`, `dec`, in degrees) is the sky position. It is a different idea from the image number.
- **`obs_id`** is the only identifier for an image. Use it for duplicate checks, as your spec already says.

## view_link

- `view_link` is now **our site's** link to the exact image, relative to the page, for example `?target=3I-ATLAS&obs=<obs_id>`. The IRSA link moved to a separate field, `irsa_link`. The viewer shows it in the Details tab, and it is not part of the event.
- Opening a `view_link` loads the target and jumps to that `obs_id`. If the image is not there (the data changed, or the link is wrong), the viewer shows "The saved image … could not be found" and **does not** show any other image in its place.
- **Copy Observation Link:** because the link is relative, turn it into a full address before copying: `new URL(view_link, location.href).href`.

## Placement on the page

| Piece | Where |
| --- | --- |
| Mark as candidate button | `#v-mark-btn`, directly under the picture caption, above the timeline. The always-visible info line (image n of N, date, microns, status, RA/Dec) sits beside it in `#v-mark-info`. Both are made by the viewer. |
| My Candidates | `<section id="my-candidates">`, its own screen (step 3 of 3, address `#my-candidates`). There is a skip link to it at the top of the page. Your module draws everything inside `#mc-root`. You may replace the placeholder paragraph `#mc-empty`. |
| Module file | `site/js/mark-candidate.js`, loaded after `app.js` (the script tag is waiting, commented out, in `viewer.html`; the sky viewer moved there from `index.html` on 12 November 2026). Styles go in `site/css/` and use the colour tokens, never raw hex. |

## Keyboard selection

- **Type a position:** the new **Go to image** box beside the timeline readout. Type a number and press Enter.
- **Choose from a list:** the Table tab (each row's button opens that image), the Then and Now strip (arrow keys), or the timeline slider (arrow keys, Home, End).
- All of these change the active image. The Mark button always applies to the active image.

## Still open

- Whether the dark theme values are final (RULES section 11). This doesn't block the module.
