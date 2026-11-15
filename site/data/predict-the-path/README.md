
# Predict the Path — Data Notes

**Target:** Comet 3I/ATLAS

**Source:** JPL Horizons, using geocentric positions at the observation time of each SPHEREx image.

**Files:**
- `path.json`: the comet's apparent sky positions and pixel coordinates in the selected SPHEREx image cutouts.
- `answer_key.json`: the correct positions used by the game.

**Important scientific distinction:**
These points describe the comet's apparent movement across the sky in the selected images. They do not represent its complete orbit around the Sun.

3I/ATLAS follows an open, hyperbolic, unbound trajectory. It is an interstellar comet passing through our Solar System, not an object on a closed elliptical orbit.

**Coordinate note:** Pixel positions are zero-based coordinates inside the 41 × 41 pixel cutouts.
