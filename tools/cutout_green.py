"""Cut a character out of a flat green-screen picture (Team Selenites).

Used for the Gemini character pictures (Selene, Iris, Orpheus, Argus Panoptes), which are made on a
flat chroma-key green background (#00B140) with no green on the character itself; see
docs/character-prompts.md.

How it works:
  1. Transparency from "greenness" (how much green exceeds the larger of red and blue). The
     background is very green; skin, hair, cloth, gold and white are not. Edge pixels, which mix
     the two, become partly transparent.
  2. Edge colours are un-mixed from the green and any green spill left on them is removed, so no
     green fringe shows on the light or dark themes.
  3. Gemini's small sparkle mark in the bottom-right corner is removed with the background.
  4. The picture is trimmed to the character with a small margin and saved as a WebP with
     transparency.

Usage:  python -I tools/cutout_green.py <input image> <output .webp>
"""
import sys

import numpy as np
from PIL import Image


def cut_out(src_path, dst_path):
    im = Image.open(src_path).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]

    # The key colour: the median of a thin frame around the picture (all background).
    frame = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    key = np.median(frame, axis=0)
    key_green = key[1] - max(key[0], key[2])

    # 1. Transparency from greenness: fully clear well inside the green, fully solid once a
    # pixel is no greener than neutral, with a soft ramp between for the edges.
    greenness = g - np.maximum(r, b)
    lo, hi = 0.18 * key_green, 0.62 * key_green
    alpha = 1.0 - np.clip((greenness - lo) / (hi - lo), 0.0, 1.0)

    # 3. Gemini's sparkle mark: a small pale-green star near the bottom-right corner, on the
    # background. Clear that corner box, where no character reaches in these pictures.
    x0, x1, y0, y1 = int(0.855 * w), int(0.94 * w), int(0.815 * h), int(0.92 * h)
    corner = alpha[y0:y1, x0:x1]
    if corner.mean() < 0.35:
        alpha[y0:y1, x0:x1] = 0.0

    # 2. Un-mix edge colours from the key green, then remove leftover green spill.
    safe = np.maximum(alpha, 0.05)[..., None]
    rgb = (a - (1.0 - safe) * key[None, None, :]) / safe
    rgb = np.clip(rgb, 0, 255)
    rr, gg, bb = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    gg = np.minimum(gg, np.maximum(rr, bb) + 6.0)  # no pixel may stay greener than its neighbours' hue allows
    rgb = np.stack([rr, gg, bb], axis=-1)
    # Solid pixels keep their own colour (only any green spill is trimmed).
    solid = np.stack([r, np.minimum(g, np.maximum(r, b) + 6.0), b], axis=-1)
    rgb = np.where(alpha[..., None] > 0.98, solid, rgb)

    out = np.dstack([rgb, alpha * 255.0]).round().clip(0, 255).astype(np.uint8)

    # 4. Trim to the character, keeping a small margin.
    ys, xs = np.nonzero(out[..., 3] > 8)
    pad = 8
    top, bottom = max(0, ys.min() - pad), min(h, ys.max() + pad + 1)
    left, right = max(0, xs.min() - pad), min(w, xs.max() + pad + 1)
    trimmed = Image.fromarray(out[top:bottom, left:right], "RGBA")
    trimmed.save(dst_path, "WEBP", quality=90, method=6, exact=False)
    return trimmed.size, (left, top)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    size, offset = cut_out(sys.argv[1], sys.argv[2])
    print("saved", sys.argv[2], "size", size, "trimmed from", offset)
