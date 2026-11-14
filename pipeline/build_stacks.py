#!/usr/bin/env python3
"""
build_stacks.py - builds the SPHEREx (QR2) image stacks for the website targets.

For each target it writes to data/processed/<target>/ :
  - stack.csv / stack.json  every image in date order: date, detector, wavelength,
                            S/N, label (clear / faint / not_detected / no_data /
                            no_observation), position_xy, position_label
  - weekly/                 one PNG per week (for the website)
  - stacks/ + stacks.json   median stacks per detector (D1-D6), split into two
                            observing periods ("early" / "late")
  - cutouts/                raw 41x41 pixel cutouts (.npy), used to recompute
                            everything without downloading again
  - all_images/             one PNG per image (only with --render-all)

Typical use:
    python build_stacks.py --check                       # coordinates + coverage only
    python build_stacks.py --targets wise0855 --max-images 5 --fresh   # quick test
    python build_stacks.py --targets wise0855            # full run (resumes if interrupted)
    python build_stacks.py --relabel                     # recompute labels from cutouts
    python build_stacks.py --render-all                  # PNG for every image

Dependencies:
    pip install "astroquery>=0.4.8" astropy numpy pandas matplotlib fsspec aiohttp
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import logging
import sys
import time
import warnings
from pathlib import Path

import astropy.units as u
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from astropy.coordinates import SkyCoord
from astropy.io import fits
from astropy.nddata import Cutout2D
from astropy.time import Time
from astropy.visualization import AsinhStretch, ImageNormalize, ZScaleInterval
from astropy.wcs import WCS
from astroquery.ipac.irsa import Irsa

warnings.filterwarnings("ignore")
from astropy import log as astropy_log

astropy_log.setLevel("WARNING")  # hide the long INFO messages about the WCS/SIP header
logging.getLogger("astropy").setLevel(logging.ERROR)
logging.getLogger("astropy.wcs.wcs").setLevel(logging.ERROR)


def _clean_for_json(obj):
    """Replace NaN and infinity by None (null). Plain NaN is not valid JSON and
    makes JSON.parse() fail in the browser."""
    if isinstance(obj, dict):
        return {k: _clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean_for_json(v) for v in obj]
    if isinstance(obj, (float, np.floating)):
        return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.integer):
        return int(obj)
    return obj



def _wl_text(w):
    """Wavelength for picture titles; '?' when the wavelength is missing (None or NaN)."""
    return f"{w:.2f}" if w is not None and np.isfinite(w) else "?"

def dumps_clean(obj, **kwargs):
    """json.dumps that always writes valid JSON (NaN becomes null)."""
    return json.dumps(_clean_for_json(obj), allow_nan=False, **kwargs)

# ----------------------------------------------------------------------------
# CONFIGURATION
# ----------------------------------------------------------------------------
COLLECTION = "spherex_qr2"      # Wide Survey, QR2. If needed: "spherex_qr2_deep"
PIXEL_SCALE_ARCSEC = 6.2          # SPHEREx pixel size (checked, see NOTES.md)
CUTOUT_PIX = 41                 # cutout side in pixels (1 pixel = 6.2")
ANNULUS = (3.0, 6.0)            # background annulus, in pixels
SNR_CLEAR = 10.0                # S/N >= this -> "clear"
SNR_FAINT = 3.0                 # S/N >= this -> "faint", otherwise "not_detected"
REF_EPOCH = Time("2026-01-01")  # epoch used only for the footprint query

TARGETS = {
    # "given" = coordinates supplied by the team, used only for the comparison in --check.
    "wise0855": dict(label="WISE 0855 (fast-moving brown dwarf)", kind="fixed", simbad="WISE J085510.83-071442.5",
                     given="08h55m10.831s -07d14m42.53s", ap_r=1.5),
    "barnards_star": dict(label="Barnard's Star", kind="fixed", simbad="Barnard's star", ap_r=1.5),
    "epsilon_indi_b": dict(label="Epsilon Indi B (brown dwarf pair)", kind="fixed", simbad=["eps Ind Ba", "* eps Ind Ba", "eps Ind B", "* eps Ind B",
                                "2MASS J22041052-5646577"], ap_r=1.5),
    "rw_aur": dict(label="RW Aurigae (variable star)", kind="fixed", simbad="RW Aur", ap_r=1.5),
    "r_dra": dict(label="R Draconis (variable star)", kind="fixed", simbad="R Dra", ap_r=1.5),
    "3i_atlas": dict(label="Comet 3I/ATLAS", kind="comet", horizons_id="C/2025 N1", ap_r=2.5,
                     windows=[("2025-08-01", "2025-08-31"),
                              ("2025-12-01", "2025-12-31")]),
}


# ----------------------------------------------------------------------------
# POSITIONS
# ----------------------------------------------------------------------------
# Fallback proper motion (mas/yr), APPROXIMATE: used only if SIMBAD does not answer.
# To be verified. If a target is not listed here and SIMBAD is down, its proper motion is 0.
MANUAL_PM = {
    "WISE J085510.83-071442.5": (-8100.0, 670.0),  # Luhman & Esplin 2016
    "Barnard's star": (-798.6, 10328.1),
    "eps Ind Ba": (3961.0, -2535.0),
}


def _pm_from_simbad_tap(ra, dec):
    """Proper motion from SIMBAD with a 10" cone search, without calling 'capabilities'."""
    import pyvo
    svc = pyvo.dal.TAPService("https://simbad.cds.unistra.fr/simbad/sim-tap")
    adql = ("SELECT TOP 1 pmra, pmdec FROM basic WHERE "
            f"CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', {ra}, {dec}, {10/3600})) = 1")
    t = svc.run_sync(adql).to_table()
    if len(t) == 0:
        raise RuntimeError("no result from the SIMBAD cone search")
    return float(t["pmra"][0]), float(t["pmdec"][0])


def resolve_simbad(names):
    """J2000 position (Sesame) + proper motion (SIMBAD TAP, then manual values).
    'names' can be a string or a list of alternative names to try."""
    names = [names] if isinstance(names, str) else list(names)
    c, name = None, names[0]
    for n in names:
        try:
            c = SkyCoord.from_name(n)
            break
        except Exception:
            print(f"  name not resolved by Sesame: {n}")
    if c is None:
        raise RuntimeError(f"none of the names {names} could be resolved")
    ra, dec = float(c.ra.deg), float(c.dec.deg)
    try:
        pmra, pmdec = _pm_from_simbad_tap(ra, dec)
    except Exception as e:
        pm = MANUAL_PM.get(name)
        if pm is None:
            print(f"  WARNING: proper motion of '{name}' not found ({type(e).__name__}); using 0")
            pm = (0.0, 0.0)
        else:
            print(f"  SIMBAD TAP not available ({type(e).__name__}); using approximate manual proper motion")
        pmra, pmdec = pm
    if not np.isfinite(pmra) or not np.isfinite(pmdec):
        pmra, pmdec = 0.0, 0.0
    return ra, dec, pmra, pmdec


def fixed_position_fn(cfg):
    """Returns f(Time) -> SkyCoord, with proper motion applied."""
    ra, dec, pmra, pmdec = resolve_simbad(cfg["simbad"])
    base = SkyCoord(ra * u.deg, dec * u.deg,
                    pm_ra_cosdec=pmra * u.mas / u.yr, pm_dec=pmdec * u.mas / u.yr,
                    obstime=Time("J2000"), frame="icrs")
    return (lambda t: base.apply_space_motion(new_obstime=t)), (ra, dec, pmra, pmdec)


def horizons_positions(hid, epochs_jd):
    """Geocentric RA/Dec (degrees) from JPL Horizons, in chunks."""
    from astroquery.jplhorizons import Horizons
    out = []
    for i in range(0, len(epochs_jd), 30):
        chunk = list(epochs_jd[i:i + 30])
        eph = Horizons(id=hid, id_type="designation", location="500",
                       epochs=chunk).ephemerides()
        out += [SkyCoord(r["RA"] * u.deg, r["DEC"] * u.deg) for r in eph]
    return out


# ----------------------------------------------------------------------------
# IRSA QUERY
# ----------------------------------------------------------------------------
def query_footprints(coord, radius_arcsec):
    tab = Irsa.query_sia(pos=(coord, radius_arcsec * u.arcsec), collection=COLLECTION)
    df = tab.to_pandas()
    if len(df) == 0:
        return df
    needed = {"access_url", "t_min", "t_max"}
    if not needed <= set(df.columns):
        raise SystemExit(f"Unexpected columns in the SIA response: {list(df.columns)}")
    df["t_mid"] = 0.5 * (df["t_min"] + df["t_max"])  # MJD
    return df.sort_values("t_mid").reset_index(drop=True)


# ----------------------------------------------------------------------------
# MEASUREMENT + IMAGE
# ----------------------------------------------------------------------------
def open_fits(url):
    """Lazy remote read; if fsspec is not available, download to cache."""
    try:
        return fits.open(url, use_fsspec=True)
    except Exception:
        return fits.open(url, cache=True)


def empirical_snr(img, px, py, ap_r, step=2, exclude=5.0):
    """Returns (S/N, signal, noise). Signal = mean in the central aperture minus the median of the
    control apertures. Noise = STANDARD DEVIATION of the control apertures (not the MAD):
    real images contain stars and hot pixels, with long tails that the MAD would ignore,
    overestimating the S/N of faint sources."""
    yy, xx = np.indices(img.shape)
    def ap_mean(cx, cy):
        m = np.hypot(xx - cx, yy - cy) <= ap_r
        v = img[m]
        v = v[np.isfinite(v)]
        return v.mean() if v.size >= max(3, 0.6 * m.sum()) else np.nan
    centre = ap_mean(px, py)
    ctrl = []
    margin = int(np.ceil(ap_r)) + 1
    for cy in range(margin, img.shape[0] - margin, step):
        for cx in range(margin, img.shape[1] - margin, step):
            if np.hypot(cx - px, cy - py) < exclude:
                continue
            ctrl.append(ap_mean(cx, cy))
    ctrl = np.array([c for c in ctrl if np.isfinite(c)])
    if not np.isfinite(centre) or ctrl.size < 20:
        return np.nan, np.nan, np.nan
    base = np.median(ctrl)
    sigma = max(ctrl.std(), 1.4826 * np.median(np.abs(ctrl - base)))
    if sigma <= 0:
        return np.nan, np.nan, np.nan
    return (centre - base) / sigma, centre - base, sigma


def read_cutout(hdu, x, y, size):
    """Reads only the window around (x, y) (0-based), without downloading the whole image.
    Returns (size x size cutout with NaN outside the edges, x0, y0), or None if outside the image."""
    ny, nx = hdu.shape
    x, y = float(x), float(y)
    if not (0 <= x < nx and 0 <= y < ny):
        return None
    half = size // 2
    x0, y0 = int(round(x)) - half, int(round(y)) - half
    xa, xb = max(x0, 0), min(x0 + size, nx)
    ya, yb = max(y0, 0), min(y0 + size, ny)
    try:
        part = np.asarray(hdu.section[ya:yb, xa:xb], dtype=float)
    except Exception as e:
        if is_network_error(e):
            raise
        part = np.asarray(hdu.data[ya:yb, xa:xb], dtype=float)  # fallback: whole image
    out = np.full((size, size), np.nan)
    out[ya - y0:yb - y0, xa - x0:xb - x0] = part
    return out, x0, y0


def measure(url, coord, ap_r, row):
    """Returns a dict with the measurement, or None if the source falls outside the image."""
    with open_fits(url) as hdul:
        hdu = hdul["IMAGE"]
        wcs = WCS(hdu.header)
        x, y = wcs.world_to_pixel(coord)
        x, y = float(x), float(y)  # from 0-d numpy array to plain numbers
        got = read_cutout(hdu, x, y, CUTOUT_PIX)
        if got is None:
            return None
        cut_data, x0, y0 = got
        # wavelength at the source pixel
        try:
            swcs = WCS(hdu.header, fobj=hdul, key="W")
            wl, bw = swcs.pixel_to_world(x, y)
            wavelength = float(wl.to(u.um).value)
            bandwidth = float(bw.to(u.um).value)
        except Exception:
            wavelength = float(0.5 * (row.get("em_min", np.nan) + row.get("em_max", np.nan)) * 1e6)
            bandwidth = float((row.get("em_max", np.nan) - row.get("em_min", np.nan)) * 1e6)

    img = cut_data
    px, py = x - x0, y - y0
    yy, xx = np.indices(img.shape)
    rr = np.hypot(xx - px, yy - py)
    ap = img[rr <= ap_r]
    ann = img[(rr >= ANNULUS[0]) & (rr <= ANNULUS[1])]
    ap, ann = ap[np.isfinite(ap)], ann[np.isfinite(ann)]

    res = dict(image=img, px=px, py=py, wavelength_um=wavelength,
               bandwidth_um=bandwidth, snr=np.nan, flux_mjysr=np.nan,
               flux_err_mjysr=np.nan, status="no_data")
    if ap.size == 0 or ann.size < 10:
        return res
    # Empirical S/N: the same aperture measured at many "empty" spots of the cutout.
    # The scatter of those values includes correlated noise, gradients and faint stars.
    snr, signal, sigma = empirical_snr(img, px, py, ap_r)
    res.update(snr=float(snr), flux_mjysr=float(signal), flux_err_mjysr=float(sigma))
    if not np.isfinite(snr):
        res["status"] = "no_data"
    elif snr >= SNR_CLEAR:
        res["status"] = "clear"
    elif snr >= SNR_FAINT:
        res["status"] = "faint"
    else:
        res["status"] = "not_detected"
    return res


def save_png(res, path, title, ap_r):
    fig, ax = plt.subplots(figsize=(4, 4), dpi=120)
    img = res["image"]
    if np.isfinite(img).any():
        norm = ImageNormalize(img[np.isfinite(img)], interval=ZScaleInterval(),
                              stretch=AsinhStretch())
        ax.imshow(img, origin="lower", cmap="magma", norm=norm)
    ax.add_patch(plt.Circle((res["px"], res["py"]), ap_r + 2, fill=False,
                            ec="cyan", lw=0.8, ls="--"))
    ax.set_title(title, fontsize=8)
    ax.axis("off")
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)


# ----------------------------------------------------------------------------
# BUILDING THE STACKS
# ----------------------------------------------------------------------------
NET_HINTS = ("getaddrinfo", "nameresolution", "connectionerror", "connectionreset",
             "contentlength", "timed out", "timeout", "max retries",
             "remotedisconnected", "not enough data", "connection aborted")


class NetworkDown(Exception):
    pass


def is_network_error(e):
    txt = f"{type(e).__name__} {e}".lower()
    return any(h in txt for h in NET_HINTS)


def with_retry(fn, *a, tries=4, **kw):
    """Retries (5 s, 15 s, 45 s) only if the error looks like a network error."""
    for k in range(tries):
        try:
            return fn(*a, **kw)
        except Exception as e:
            if not is_network_error(e) or k == tries - 1:
                raise
            wait = 5 * 3 ** k
            print(f"  unstable network ({type(e).__name__}); retrying in {wait}s...")
            time.sleep(wait)


FLAG_NOTES = {
    "near_edge": "The target is close to the edge of the detector.",
    "masked_pixels_in_aperture": "Some pixels inside the measurement circle are masked.",
    "single_pixel_peak": ("One bright pixel dominates the signal: this may be a hot pixel or a "
                          "cosmic ray, or a very compact source."),
}


def compute_flags(img, px, py, ap_r, snr):
    """Simple contamination / quality flags for one cutout. 'single_pixel_peak' is only
    tested when the signal is at least 'faint' (otherwise noise would trigger it)."""
    flags = []
    if np.isnan(img).mean() > 0.05:
        flags.append("near_edge")
    yy, xx = np.indices(img.shape)
    vals = img[np.hypot(xx - px, yy - py) <= ap_r]
    if np.isnan(vals).any():
        flags.append("masked_pixels_in_aperture")
    v = vals[np.isfinite(vals)]
    if v.size >= 3 and snr is not None and snr >= SNR_FAINT:
        ex = v - np.nanmedian(img)
        pos = ex[ex > 0]
        if pos.size and ex.max() / pos.sum() > 0.7:
            flags.append("single_pixel_peak")
    return flags


def flags_to_note(flags):
    return " ".join(FLAG_NOTES[f] for f in flags) if flags else None


def add_derived_columns(records):
    """obs_id, irsa_link, release and chapter (Aug/Dec for the comet) for every record."""
    for r in records:
        url = r.get("source_url")
        if url:
            r["obs_id"] = Path(url).stem
            r["irsa_link"] = url
        r["release"] = "QR2"
        w = r.get("window") or ""
        try:
            r["chapter"] = datetime.strptime(w, "%Y-%m").strftime("%b")
        except ValueError:
            r["chapter"] = None


def fixed_patch_center(records):
    """Centre (RA, Dec in degrees) of the fixed patch of sky of a moving star: the middle of
    the range of its positions over all observations."""
    ras = [r["ra_deg"] for r in records if r.get("ra_deg") is not None]
    decs = [r["dec_deg"] for r in records if r.get("dec_deg") is not None]
    if not ras:
        return None
    return 0.5 * (min(ras) + max(ras)), 0.5 * (min(decs) + max(decs))


def add_position_columns(records, slug):
    """position_xy = [x, y] in % from the top-left corner, position_label = target name,
    position_frame = what the percentages refer to.
    - Stars (fixed targets): position inside ONE fixed patch of sky, the same for every image
      of the target (north up, east to the left, patch = cutout size). The star moves inside it.
    - Comet: position inside each (target-centred) cutout, so it stays close to 50,50."""
    import math
    cfg = TARGETS.get(slug, {})
    label = cfg.get("label", slug)
    center = fixed_patch_center(records) if cfg.get("kind") == "fixed" else None
    box = CUTOUT_PIX * PIXEL_SCALE_ARCSEC          # patch side in arcseconds
    for r in records:
        if center is not None and r.get("ra_deg") is not None and r.get("dec_deg") is not None:
            ra0, dec0 = center
            dx = (r["ra_deg"] - ra0) * math.cos(math.radians(dec0)) * 3600.0   # east, arcsec
            dy = (r["dec_deg"] - dec0) * 3600.0                               # north, arcsec
            r["position_xy"] = [round(50.0 - dx / box * 100.0, 1),             # east is to the left
                                round(50.0 - dy / box * 100.0, 1)]             # north is up
            r["position_frame"] = "fixed_patch_north_up_east_left"
            r["position_label"] = label
            continue
        if r.get("px") is None or r.get("py") is None:
            continue
        x = (float(r["px"]) + 0.5) / CUTOUT_PIX * 100.0
        y = 100.0 - (float(r["py"]) + 0.5) / CUTOUT_PIX * 100.0   # images are drawn with the origin at the bottom
        r["position_xy"] = [round(x, 1), round(y, 1)]
        r["position_frame"] = "centred_cutout"
        r["position_label"] = label


def save_stack(out, slug, records, outside, complete, subset=False):
    records = sorted(records, key=lambda r: r.get("mjd", 0))
    for i, r in enumerate(records, 1):
        r["order"] = i
    add_position_columns(records, slug)
    add_derived_columns(records)
    df = pd.DataFrame(records)
    if "flags" in df.columns:
        df["flags"] = df["flags"].apply(lambda v: ";".join(v) if isinstance(v, (list, tuple)) else v)
    if "position_xy" in df.columns:
        df["position_xy"] = df["position_xy"].apply(
            lambda v: f"{v[0]},{v[1]}" if isinstance(v, (list, tuple)) else v)
    df.to_csv(out / "stack.csv", index=False)
    (out / "stack.json").write_text(dumps_clean(
        dict(target=slug, collection=COLLECTION, complete=complete,
             subset=subset,  # True = test run / subsampling (--max-images or --every)
             thresholds=dict(clear=SNR_CLEAR, faint=SNR_FAINT),
             outside_detector=sorted(outside), images=records), indent=2))


import re
from datetime import datetime, timedelta

DET_RE = re.compile(r"_\d+D(\d)_spx")
DET_BANDS = {1: "0.75-1.1", 2: "1.1-1.6", 3: "1.6-2.4", 4: "2.4-3.8", 5: "3.8-4.4", 6: "4.4-5.0"}


def detector_of(url):
    m = DET_RE.search(url)
    return int(m.group(1)) if m else None


def select_one_per(jobs, per, detector):
    """One image per month/week, preferring the chosen detector (same wavelength band in
    every period, so comparisons over time are consistent). Takes the one in the middle of
    the period's list. If the period has no image from that detector, falls back to any
    image of the period."""
    groups = {}
    for j in jobs:
        d = datetime(1858, 11, 17) + timedelta(days=float(j[0]["t_mid"]))
        key = d.strftime("%Y-%m") if per == "month" else "%d-W%02d" % d.isocalendar()[:2]
        groups.setdefault(key, []).append(j)
    picked = []
    for key in sorted(groups):
        g = sorted(groups[key], key=lambda j: j[0]["t_mid"])
        match = [j for j in g if detector is None or detector_of(j[0]["access_url"]) == detector]
        pool = match or g
        picked.append(pool[len(pool) // 2])
    return picked


def classify(snr):
    if snr is None or not np.isfinite(snr):
        return "no_data"
    return "clear" if snr >= SNR_CLEAR else "faint" if snr >= SNR_FAINT else "not_detected"


def make_products(out, slug, records, ap_r, detector):
    """From all saved cutouts: (1) one image per week for the website (weekly/ folder),
    (2) median stacks per detector and period (early vs late observations) in stacks/."""
    recs = [r for r in records if r.get("cutout") and (out / r["cutout"]).exists()]
    if len(recs) < len(records):
        print(f"  note: {len(records) - len(recs)} images without a cutout (old run): use --fresh")
    if not recs:
        return
    # --- 1) one per week
    fake = [({"t_mid": r["mjd"], "access_url": r["source_url"]}, None, r) for r in recs]
    weekly_urls = {j[0]["access_url"] for j in select_one_per(fake, "week", detector)}
    wdir = out / "weekly"
    wdir.mkdir(exist_ok=True)
    for old in wdir.glob("*.png"):
        old.unlink()
    for r in recs:
        r["weekly"] = r["source_url"] in weekly_urls
        r["image"] = ""
        if r["weekly"]:
            name = Path(r["cutout"]).stem + ".png"
            save_png(dict(image=np.load(out / r["cutout"]), px=r["px"], py=r["py"]),
                     wdir / name,
                     f"{r['date_utc'][:10]}  {_wl_text(r.get('wavelength_um'))} um  [{r['status']}]", ap_r)
            r["image"] = f"weekly/{name}"
    # --- 2) median stacks: per detector, split into two observing "seasons"
    sdir = out / "stacks"
    sdir.mkdir(exist_ok=True)
    for old in list(sdir.glob("*.png")) + list(sdir.glob("*.npy")):
        old.unlink()
    info = []
    for det in range(1, 7):
        drecs = sorted([r for r in recs if r.get("detector") == det], key=lambda r: r["mjd"])
        n = len(drecs)
        if n == 0:
            info.append(dict(detector=det, band_um=DET_BANDS[det], n_images=0,
                             note="no images"))
            continue
        groups = [("all", drecs)]
        if n >= 6:
            # cut at the largest time gap, trying to keep the two groups
            # reasonably balanced (between 25% and 75% of the images)
            lo, hi = max(3, int(np.ceil(0.25 * n))), min(n - 3, int(np.floor(0.75 * n)))
            cuts = range(lo, hi + 1) if lo <= hi else [n // 2]
            i = max(cuts, key=lambda k: drecs[k]["mjd"] - drecs[k - 1]["mjd"])
            groups = [("early", drecs[:i]), ("late", drecs[i:])]
        for epoch, sel in groups:
            entry = dict(detector=det, band_um=DET_BANDS[det], epoch=epoch, n_images=len(sel))
            if len(sel) < 3:
                entry["note"] = "fewer than 3 images: stack not made"
                info.append(entry)
                continue
            arrs = []
            for r in sel:
                a = np.load(out / r["cutout"]).astype(float)
                arrs.append(a - np.nanmedian(a))      # remove the background level of each frame
            med = np.nanmedian(np.stack(arrs), axis=0)
            px = float(np.median([r["px"] for r in sel]))
            py = float(np.median([r["py"] for r in sel]))
            snr, signal, _sigma = empirical_snr(med, px, py, ap_r)
            snr = float(snr) if np.isfinite(snr) else None
            status = classify(snr)
            base = f"stack_D{det}_{epoch}"
            np.save(sdir / f"{base}.npy", med.astype("float32"))
            d0 = min(r["date_utc"] for r in sel)[:10]
            d1 = max(r["date_utc"] for r in sel)[:10]
            wl = [r["wavelength_um"] for r in sel
                  if r.get("wavelength_um") is not None and np.isfinite(r["wavelength_um"])]
            save_png(dict(image=med, px=px, py=py), sdir / f"{base}.png",
                     f"D{det} {epoch}: {len(sel)} img, {d0}..{d1}  [{status}]", ap_r)
            entry.update(date_start=d0, date_end=d1,
                         wavelength_min_um=round(min(wl), 3) if wl else None,
                         wavelength_max_um=round(max(wl), 3) if wl else None,
                         snr=None if snr is None else round(snr, 2), status=status,
                         image=f"stacks/{base}.png", data=f"stacks/{base}.npy")
            info.append(entry)
            print(f"  stack D{det} {epoch}: {len(sel)} images ({d0}..{d1}), "
                  f"S/N={snr if snr is None else round(snr,1)} -> {status}")
    (out / "stacks.json").write_text(dumps_clean(
        dict(target=slug, method="median of the cutouts, background subtracted per frame",
             stacks=info), indent=2))


def build_stack(slug, cfg, outdir, max_images=None, fresh=False, workers=6, every=1, one_per=None, detector=6):
    out = Path(outdir) / slug
    (out / "images").mkdir(parents=True, exist_ok=True)
    print(f"\n=== {slug} ===")

    # resume: reuse what has already been done
    records, outside = [], set()
    jpath = out / "stack.json"
    if jpath.exists() and not fresh:
        try:
            old = json.loads(jpath.read_text())
            records = [r for r in old.get("images", []) if r.get("source_url")]
            outside = set(old.get("outside_detector", []))
            print(f"  resuming: {len(records)} images already present")
        except Exception:
            pass
    done = {r["source_url"] for r in records} | outside

    jobs = []
    if cfg["kind"] == "fixed":
        pos_fn, _ = fixed_position_fn(cfg)
        df = with_retry(query_footprints, pos_fn(REF_EPOCH), 120)
        for _, r in df.iterrows():
            t = Time(r["t_mid"], format="mjd")
            jobs.append((r, pos_fn(t), ""))
    else:
        seen = set()
        for start, stop in cfg["windows"]:
            for d in pd.date_range(start, stop, freq="D"):
                jd = Time(d.strftime("%Y-%m-%d 12:00")).jd
                c = with_retry(horizons_positions, cfg["horizons_id"], [jd])[0]
                df = with_retry(query_footprints, c, 300)
                if len(df) == 0:
                    continue
                mjd0 = Time(jd, format="jd").mjd
                df = df[(df["t_mid"] >= mjd0 - 0.5) & (df["t_mid"] < mjd0 + 0.5)]
                for _, r in df.iterrows():
                    if r["access_url"] in seen:
                        continue
                    seen.add(r["access_url"])
                    jobs.append((r, None, f"{start[:7]}"))
        if jobs:
            jds = [Time(r["t_mid"], format="mjd").jd for r, _, _ in jobs]
            coords = with_retry(horizons_positions, cfg["horizons_id"], jds)
            jobs = [(r, c, w) for (r, _, w), c in zip(jobs, coords)]
        jobs.sort(key=lambda j: j[0]["t_mid"])

    subset = bool(max_images) or every > 1 or bool(one_per)
    if one_per:
        n0 = len(jobs)
        jobs = select_one_per(jobs, one_per, detector)
        print(f"  selection: 1 per {one_per}, "
              f"detector {detector} ({DET_BANDS.get(detector, '?')} um): {len(jobs)} of {n0}")
    if every > 1:
        jobs = jobs[::every]
    if max_images:
        jobs = jobs[:max_images]

    if not jobs:
        records = [dict(order=0, status="no_observation", window="",
                        note="No SPHEREx QR2 image covers this target")]
        print("  no observation found")
        save_stack(out, slug, records, outside, True, subset)
        return

    todo = [j for j in jobs if j[0]["access_url"] not in done]
    print(f"  {len(jobs)} images in total, {len(todo)} to process")
    failed, new_count, done_n, net_fail = 0, 0, 0, 0
    pool = ThreadPoolExecutor(max_workers=max(1, workers))
    futs = {pool.submit(with_retry, measure, row["access_url"], coord, cfg["ap_r"], row):
            (row, coord, window) for row, coord, window in todo}
    try:
        for fut in as_completed(futs):
            row, coord, window = futs[fut]
            done_n += 1
            t = Time(row["t_mid"], format="mjd")
            date = t.utc.strftime("%Y-%m-%dT%H:%M:%S")
            try:
                res = fut.result()
                net_fail = 0
            except Exception as e:
                failed += 1
                print(f"  [{done_n}/{len(todo)}] error: {type(e).__name__}: {str(e)[:120]}")
                if is_network_error(e):
                    net_fail += 1
                    if net_fail >= 5:
                        for f in futs:
                            f.cancel()
                        save_stack(out, slug, records, outside, False, subset)
                        raise NetworkDown(
                            f"no connection. Saved {len(records)} images; "
                            "check your internet and rerun the same command: it resumes from here.")
                continue
            if res is None:
                outside.add(row["access_url"])
                continue
            stem = (f"{date[:10]}_{date[11:].replace(':', '')}_"
                    f"{res['wavelength_um']:.2f}um")
            (out / "cutouts").mkdir(exist_ok=True)
            np.save(out / "cutouts" / f"{stem}.npy", res["image"].astype("float32"))
            records.append(dict(
                order=0, date_utc=date, mjd=float(row["t_mid"]),
                detector=detector_of(row["access_url"]),
                window=window, wavelength_um=round(res["wavelength_um"], 4),
                bandwidth_um=round(res["bandwidth_um"], 4),
                snr=None if np.isnan(res["snr"]) else round(res["snr"], 2),
                flux_mjysr=None if np.isnan(res["flux_mjysr"]) else round(res["flux_mjysr"], 5),
                flux_err_mjysr=None if np.isnan(res["flux_err_mjysr"]) else round(res["flux_err_mjysr"], 5),
                flags=compute_flags(res["image"], res["px"], res["py"], cfg["ap_r"],
                                    None if np.isnan(res["snr"]) else res["snr"]),
                status=res["status"], ra_deg=round(coord.ra.deg, 6),
                dec_deg=round(coord.dec.deg, 6), weekly=False, image="",
                cutout=f"cutouts/{stem}.npy", px=round(float(res["px"]), 3),
                py=round(float(res["py"]), 3), source_url=row["access_url"]))
            new_count += 1
            print(f"  [{done_n}/{len(todo)}] {date[:10]} {res['wavelength_um']:.2f} um "
                  f"S/N={res['snr']:.1f} -> {res['status']}")
            if new_count % 10 == 0:
                save_stack(out, slug, records, outside, False, subset)  # checkpoint
    finally:
        pool.shutdown(wait=False, cancel_futures=True)

    complete = failed == 0
    make_products(out, slug, records, cfg["ap_r"], detector)
    save_stack(out, slug, records, outside, complete, subset)
    if subset:
        print("  WARNING: stack with a selection (--one-per/--every/--max-images): it does not contain all the images")
    msg = "complete" if complete else f"INCOMPLETE: {failed} images failed, rerun to retry them"
    print(f"  saved in {out} ({len(records)} images, {msg})")


def render_all(outdir, slugs):
    """Draws one PNG for EVERY processed image, starting from the saved cutouts.
    Downloads nothing. Output: <target>/all_images/ + the image_all column."""
    for slug in slugs:
        out = Path(outdir) / slug
        jp = out / "stack.json"
        if not jp.exists():
            print(f"{slug}: no stack.json in {out}, skipping")
            continue
        data = json.loads(jp.read_text())
        recs = data.get("images", [])
        adir = out / "all_images"
        adir.mkdir(exist_ok=True)
        ap_r = TARGETS[slug]["ap_r"] if slug in TARGETS else 1.5
        n = 0
        for r in recs:
            c = r.get("cutout")
            if not c or not (out / c).exists():
                continue
            name = Path(c).stem + ".png"
            save_png(dict(image=np.load(out / c), px=r["px"], py=r["py"]), adir / name,
                     f"{r['date_utc'][:10]}  {_wl_text(r.get('wavelength_um'))} um  [{r['status']}]", ap_r)
            r["image_all"] = f"all_images/{name}"
            n += 1
            if n % 50 == 0:
                print(f"  {slug}: {n}/{len(recs)}")
        jp.write_text(dumps_clean(data, indent=2))
        pd.DataFrame(recs).to_csv(out / "stack.csv", index=False)
        print(f"{slug}: {n} PNGs in {adir}")


def relabel(outdir, slugs, detector):
    """Recomputes S/N and labels of every image from the saved cutouts (no download),
    then rebuilds weekly/, stacks/ and, if it exists, all_images/."""
    for slug in slugs:
        out = Path(outdir) / slug
        jp = out / "stack.json"
        if not jp.exists():
            print(f"{slug}: no stack.json, skipping")
            continue
        data = json.loads(jp.read_text())
        recs = data.get("images", [])
        ap_r = TARGETS[slug]["ap_r"] if slug in TARGETS else 1.5
        n = 0
        for r in recs:
            c = r.get("cutout")
            if not c or not (out / c).exists():
                continue
            img = np.load(out / c).astype(float)
            snr, signal, sigma = empirical_snr(img, r["px"], r["py"], ap_r)
            r["snr"] = None if not np.isfinite(snr) else round(float(snr), 2)
            r["flux_mjysr"] = None if not np.isfinite(signal) else round(float(signal), 5)
            r["flux_err_mjysr"] = None if not np.isfinite(sigma) else round(float(sigma), 5)
            r["status"] = classify(None if r["snr"] is None else r["snr"])
            r["flags"] = compute_flags(img, r["px"], r["py"], ap_r, r["snr"])
            r["note"] = flags_to_note(r["flags"])
            n += 1
        cnt = {}
        for r in recs:
            cnt[r.get("status")] = cnt.get(r.get("status"), 0) + 1
        print(f"{slug}: recomputed {n}/{len(recs)} images -> {cnt}")
        make_products(out, slug, recs, ap_r, detector)
        save_stack(out, slug, recs, set(data.get("outside_detector", [])),
                   data.get("complete", True), data.get("subset", False))
        if (out / "all_images").exists():
            render_all(outdir, [slug])


def rel_path(slug, p):
    """Path of a processed file, relative to the repository root."""
    return f"data/processed/{slug}/{p}" if p else None


def write_comet_spectrum(slug, label, obs, siteout):
    """Spectrum file for the colour slider: one entry per image and wavelength, by chapter."""
    chapters = {}
    for o in obs:
        if o.get("chapter") and o.get("wavelength_um") is not None and np.isfinite(o["wavelength_um"]):
            chapters.setdefault(o["chapter"], []).append(dict(
                obs_id=o["obs_id"], detector=o["detector"], wavelength_um=o["wavelength_um"],
                flux_mjysr=o["flux_mjysr"], flux_err_mjysr=o["flux_err_mjysr"],
                snr=o["snr"], status=o["status"], flags=o["flags"]))
    for rows in chapters.values():
        rows.sort(key=lambda r: r["wavelength_um"])
    doc = dict(target=label, release="QR2",
               flux_unit=("MJy/sr: mean surface brightness above the local background inside a "
                          "circle on the comet. It is not the total flux of the comet."),
               flux_err="Standard deviation of the same measurement on empty parts of the cutout.",
               chapters=chapters)
    (Path(siteout) / f"{slug}_spectrum.json").write_text(dumps_clean(doc, indent=1))
    # quick look at the 4.27 micron "switch-on" (detector 5)
    print(f"{slug}: spectrum file written. Check of the 4.27 micron switch-on (detector 5, median S/N):")
    for ch, rows in sorted(chapters.items()):
        for lo, hi in [(3.8, 4.1), (4.1, 4.2), (4.2, 4.3), (4.3, 4.4)]:
            sel = [r for r in rows if r["detector"] == 5 and lo <= r["wavelength_um"] < hi
                   and r["snr"] is not None]
            if sel:
                med = float(np.median([r["snr"] for r in sel]))
                nclear = sum(r["status"] == "clear" for r in sel)
                print(f"  {ch}: {lo}-{hi} micron: {len(sel)} images, median S/N {med:.1f}, {nclear} clear")
            else:
                print(f"  {ch}: {lo}-{hi} micron: no images")


def build_site_json(outdir, siteout, slugs):
    """Website-ready JSON, one file per target (observation-object field names)."""
    Path(siteout).mkdir(parents=True, exist_ok=True)
    for slug in slugs:
        out = Path(outdir) / slug
        jp = out / "stack.json"
        if not jp.exists():
            print(f"{slug}: no stack.json, skipping")
            continue
        recs = json.loads(jp.read_text()).get("images", [])
        label = TARGETS.get(slug, {}).get("label", slug)
        add_derived_columns(recs)
        add_position_columns(recs, slug)
        obs = []
        for r in sorted(recs, key=lambda r: r.get("mjd", 0)):
            if not r.get("source_url"):       # placeholder: no image covers the target
                obs.append(dict(target=label, status="no_observation", flags=[],
                                note=r.get("note"), release="QR2"))
                continue
            # Every image's own picture (all_images/, from --render-all or the data-v1
            # release) when it exists; otherwise the weekly picture, as before.
            pic = None
            if r.get("cutout"):
                own = out / "all_images" / (Path(r["cutout"]).stem + ".png")
                if own.exists():
                    pic = f"all_images/{own.name}"
            if pic is None and r.get("weekly"):
                pic = r.get("image")
            img = rel_path(slug, pic)
            obs.append(dict(
                target=label, obs_id=r["obs_id"], ra=r.get("ra_deg"), dec=r.get("dec_deg"),
                date=r.get("date_utc"), mjd=r.get("mjd"), detector=r.get("detector"),
                wavelength_um=r.get("wavelength_um"), thumbnail=img, image_url=img,
                view_link=None, status=r.get("status"), snr=r.get("snr"),
                flux_mjysr=r.get("flux_mjysr"), flux_err_mjysr=r.get("flux_err_mjysr"),
                chapter=r.get("chapter"), irsa_link=r.get("irsa_link"), release=r.get("release"),
                flags=r.get("flags") or [], note=r.get("note"),
                position_xy=r.get("position_xy"), position_frame=r.get("position_frame"),
                pixel_xy=[r["px"], r["py"]] if r.get("px") is not None else None,
                position_label=r.get("position_label"), weekly=bool(r.get("weekly"))))
        stacks = []
        sp = out / "stacks.json"
        if sp.exists():
            for e in json.loads(sp.read_text()).get("stacks", []):
                e = dict(e)
                for k in ("image", "data"):
                    if e.get(k):
                        e[k] = rel_path(slug, e[k])
                stacks.append(e)
        center = fixed_patch_center(recs) if TARGETS.get(slug, {}).get("kind") == "fixed" else None
        patch = None if center is None else dict(
            center_ra=round(center[0], 6), center_dec=round(center[1], 6),
            size_arcsec=round(CUTOUT_PIX * PIXEL_SCALE_ARCSEC, 1),
            orientation="north up, east to the left")
        doc = dict(target=label, slug=slug, release="QR2", doi="10.26131/IRSA652", patch=patch,
                   status_labels=["clear", "faint", "not_detected", "no_observation"],
                   thresholds=dict(clear=SNR_CLEAR, faint=SNR_FAINT),
                   observations=obs, stacks=stacks)
        (Path(siteout) / f"{slug}.json").write_text(dumps_clean(doc, indent=1))
        print(f"{slug}: {len(obs)} observations, {sum(1 for o in obs if o.get('thumbnail'))} with a picture, "
              f"{sum(o.get('weekly', False) for o in obs)} weekly, "
              f"{len(stacks)} stacks -> {Path(siteout) / (slug + '.json')}")
        if slug == "3i_atlas":
            write_comet_spectrum(slug, label, [o for o in obs if o.get("obs_id")], siteout)


def build_games(outdir, siteout, slug="3i_atlas"):
    """Game data and answer keys for the comet (Timeline Puzzle, Predict the Path)."""
    import random
    out = Path(outdir) / slug
    jp = out / "stack.json"
    if not jp.exists():
        print(f"{slug}: no stack.json, skipping games")
        return
    recs = json.loads(jp.read_text()).get("images", [])
    add_derived_columns(recs)
    label = TARGETS[slug]["label"]
    ap_r = TARGETS[slug]["ap_r"]

    # ---- Timeline Puzzle: 3 pictures from August, 3 from December (detector 5)
    chosen = []
    for ch in ("Aug", "Dec"):
        cand = [r for r in recs if r.get("chapter") == ch and r.get("detector") == 5
                and r.get("cutout") and (out / r["cutout"]).exists()]
        good = [r for r in cand if r.get("status") == "clear"]
        pool = good if len(good) >= 3 else sorted(cand, key=lambda r: -(r.get("snr") or -99))[:6]
        pool = sorted(pool, key=lambda r: r["mjd"])
        if len(pool) < 3:
            print(f"  WARNING: only {len(pool)} usable detector-5 images for {ch}")
        picks = sorted({0, len(pool) // 2, len(pool) - 1}) if pool else []
        chosen += [pool[i] for i in picks]
        print(f"  Timeline Puzzle {ch}: {len(good)} clear detector-5 images, {len(picks)} chosen")
    chosen.sort(key=lambda r: r["mjd"])
    correct_order = [r["obs_id"] for r in chosen]
    shuffled = chosen[:]
    random.Random(14).shuffle(shuffled)
    tdir = Path(siteout) / "timeline-puzzle"
    tdir.mkdir(parents=True, exist_ok=True)
    pictures = []
    for k, r in enumerate(shuffled, 1):
        fname = f"picture_{k}.png"          # neutral name: no date in the file name
        save_png(dict(image=np.load(out / r["cutout"]), px=r["px"], py=r["py"]),
                 tdir / fname, "", ap_r)    # no title: the title would show the date
        pictures.append(dict(obs_id=r["obs_id"], file=fname,
                             alt=f"Picture {k} of {len(shuffled)}: a small patch of sky with the "
                                 "comet inside the dashed circle."))
    (tdir / "puzzle.json").write_text(dumps_clean(
        dict(target=label, pictures=pictures), indent=1))
    (tdir / "answer_key.json").write_text(dumps_clean(
        dict(correct_order=correct_order,
             note="obs_ids from oldest to newest."), indent=1))
    print(f"  Timeline Puzzle: {len(pictures)} pictures -> {tdir}")

    # ---- Predict the Path: first observation of each day, JPL Horizons positions
    seen, points = set(), []
    for r in sorted((r for r in recs if r.get("source_url")), key=lambda r: r["mjd"]):
        day = r["date_utc"][:10]
        if day in seen:
            continue
        seen.add(day)
        points.append(dict(obs_id=r["obs_id"], chapter=r.get("chapter"), date=r["date_utc"],
                           mjd=r["mjd"], ra=r["ra_deg"], dec=r["dec_deg"],
                           pixel_xy=[r["px"], r["py"]]))
    pdir = Path(siteout) / "predict-the-path"
    pdir.mkdir(parents=True, exist_ok=True)
    (pdir / "path.json").write_text(dumps_clean(
        dict(target=label, source="JPL Horizons, geocentric positions at each image time",
             pixel_xy_note="0-based pixel position of the comet inside the 41 x 41 pixel cutout",
             points=points), indent=1))
    (pdir / "answer_key.json").write_text(dumps_clean(
        dict(positions=[dict(obs_id=p["obs_id"], ra=p["ra"], dec=p["dec"], pixel_xy=p["pixel_xy"])
                        for p in points]), indent=1))
    print(f"  Predict the Path: {len(points)} points (one per day) -> {pdir}")


def check(slugs):
    """Quick check: resolved coordinates and number of images covering them."""
    for slug in slugs:
        try:
            _check_one(slug)
        except Exception as e:
            print(f"\n--- {slug} ---\n  ERROR: {type(e).__name__}: {e}")


def _check_one(slug):
    if True:
        cfg = TARGETS[slug]
        print(f"\n--- {slug} ---")
        if cfg["kind"] == "comet":
            for start, _ in cfg["windows"]:
                jd = Time(start + " 12:00").jd
                c = horizons_positions(cfg["horizons_id"], [jd])[0]
                n = len(query_footprints(c, 300))
                print(f"  {start}: Horizons RA={c.ra.deg:.5f} Dec={c.dec.deg:.5f}, "
                      f"{n} images (all dates) at that position")
            return
        pos_fn, (ra, dec, pmra, pmdec) = fixed_position_fn(cfg)
        now = pos_fn(REF_EPOCH)
        print(f"  SIMBAD J2000: RA={ra:.6f} Dec={dec:.6f}  PM=({pmra:.1f},{pmdec:.1f}) mas/yr")
        print(f"  at {REF_EPOCH.iso[:10]}: RA={now.ra.deg:.6f} Dec={now.dec.deg:.6f}")
        if "given" in cfg:
            g = SkyCoord(cfg["given"])
            print(f"  coordinates given by the team: RA={g.ra.deg:.6f} Dec={g.dec.deg:.6f}"
                  f"  -> distance from current position: {g.separation(now).arcsec:.1f}\"")
        n = len(query_footprints(now, 120))
        print(f"  QR2 images covering the point: {n}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--targets", nargs="*", default=list(TARGETS))
    ap.add_argument("--out", default="data/processed")
    ap.add_argument("--max-images", type=int, default=None,
                    help="limit the number of images (for tests)")
    ap.add_argument("--workers", type=int, default=6,
                    help="parallel downloads (default 6)")
    ap.add_argument("--every", type=int, default=1,
                    help="use 1 image out of every N (e.g. 3 = three times faster)")
    ap.add_argument("--one-per", choices=["month", "week"], default=None,
                    help="keep only one image per month (or week)")
    ap.add_argument("--detector", type=int, default=6, choices=[1, 2, 3, 4, 5, 6],
                    help="preferred band for the website's weekly images (6 = 4.4-5.0 um, default)")
    ap.add_argument("--site-json", action="store_true",
                    help="write the website-ready JSON files (and the comet spectrum) to --site-out")
    ap.add_argument("--games", action="store_true",
                    help="write the comet game data and answer keys to --site-out")
    ap.add_argument("--site-out", default="site/data",
                    help="output folder for --site-json and --games (default site/data)")
    ap.add_argument("--relabel", action="store_true",
                    help="recompute S/N and labels from the saved cutouts (no download)")
    ap.add_argument("--render-all", action="store_true",
                    help="create one PNG per image from the saved cutouts (no download)")
    ap.add_argument("--fresh", action="store_true",
                    help="ignore the saved results and start over")
    ap.add_argument("--check", action="store_true",
                    help="only check coordinates and coverage")
    args = ap.parse_args()
    bad = [t for t in args.targets if t not in TARGETS]
    if bad:
        sys.exit(f"Unknown targets: {bad}. Available: {list(TARGETS)}")
    if args.site_json:
        build_site_json(args.out, args.site_out, args.targets)
        return
    if args.games:
        build_games(args.out, args.site_out)
        return
    if args.relabel:
        relabel(args.out, args.targets, args.detector)
        return
    if args.render_all:
        render_all(args.out, args.targets)
        return
    if args.check:
        check(args.targets)
        return
    for slug in args.targets:
        try:
            build_stack(slug, TARGETS[slug], args.out, args.max_images, args.fresh,
                        args.workers, args.every, args.one_per, args.detector)
        except Exception as e:
            print(f"  ERROR on {slug}: {type(e).__name__}: {str(e)[:200]}")
            if isinstance(e, NetworkDown) or is_network_error(e):
                print("\nSTOP: internet is not reachable. Check your connection and "
                      "rerun the same command (it resumes where it stopped).")
                break


if __name__ == "__main__":
    main()
