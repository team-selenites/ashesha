"""Build the data for Your Beginnings: The First Light.

For every day SPHEREx observed, this writes one small file saying where SPHEREx
looked that day and which Messier objects fell inside its pictures. The page
looks a birthday up by day and month and opens the matching file(s).

Writes
    site/data/beginnings/index.json            what dates exist, releases, Messier list
    site/data/beginnings/days/YYYY-MM-DD.json  one file per observed day

Reads (downloaded on first run, then reused; delete a file to fetch it again)
    data/raw/beginnings/messier_simbad.json    Messier positions, names, types (SIMBAD)
    data/raw/beginnings/pointings_D2.ecsv       every exposure's centre, detector D2 (IRSA)
    data/raw/beginnings/messier_obs/M<n>.ecsv   every image whose footprint holds M<n> (IRSA)

Run from the repository root:
    python tools/make_beginnings.py

Why it is built this way (Track D, 12 November 2026):
- SPHEREx always looks about 90 degrees from the Sun, so each day's pictures
  form a ring. The same date a year later gives the same region but different
  pictures, so the page shows the real date and its year, never "this year".
- The archive had every day from 24 April 2025 to 5 October 2026. 29 February
  has no data (2025 and 2026 are not leap years); the page handles that date.

Honest rules: "SPHEREx pictured the centre of M 31 that day" means the object's
catalogue position lies inside at least one image footprint. It does not mean
the object is detected or bright in that image.
"""
import json
import re
import sys
import time
from collections import defaultdict
from datetime import date
from pathlib import Path

import numpy as np
import pyvo
from astropy.table import Table
from astropy.time import Time
from astropy.coordinates import get_sun

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "beginnings"
OUT = ROOT / "site" / "data" / "beginnings"

IRSA_TAP = "https://irsa.ipac.caltech.edu/TAP"
# The main SIMBAD server returned 404 on 12 November 2026; the Harvard mirror serves the same database.
SIMBAD_TAP = "https://simbad.harvard.edu/simbad/sim-tap"

# Release DOIs from IRSA's SPHEREx pages. A release missing here is written as
# doi: null and listed by the script, so someone adds it before publishing.
DOIS = {"QR2": "10.26131/IRSA652", "QR3": "10.26131/IRSA662"}

FULL_DAY = 300   # a normal day has about 470 to 530 exposures

# Plain-word kinds, grouped from SIMBAD's object-type codes.
KIND = {
    "galaxy": {"G", "GiG", "GiC", "GiP", "AGN", "Sy2", "SyG", "LIN", "SBG", "H2G"},
    "globular cluster": {"GlC"},
    "open cluster": {"OpC"},
    "glowing gas cloud": {"HII"},
    "dusty cloud lit by starlight": {"RNe"},
    "planetary nebula": {"PN"},
    "supernova remnant": {"SNR"},
    "star cloud": {"As*"},
}
# SIMBAD lists M 40 as "Object of Unknown Nature" and M 73 as "Not an Object".
# Keep them in the lists, but never make them a birthday's headline object.
NOT_HEADLINE = {40, 73}


def log(*a):
    print(*a, flush=True)


def retry(fn, tries=6, wait=15):
    for i in range(tries):
        try:
            return fn()
        except Exception as e:  # IRSA often answers 503 for a moment
            if i == tries - 1:
                raise
            log(f"   retry after {type(e).__name__}")
            time.sleep(wait * (i + 1))


# ---------- 1. Messier positions and names (SIMBAD) ----------

# Where SIMBAD lists several everyday names, use the most familiar one. Every
# choice here is one of SIMBAD's own NAME entries for that object.
PREFER = {27: "Dumbbell Nebula", 42: "Orion Nebula", 44: "Beehive",
          64: "Black Eye Galaxy", 76: "Little Dumbbell Nebula"}
# Constellation abbreviations written out (IAU abbreviations).
SPELL_OUT = {"Sgr": "Sagittarius"}


def friendly_name(n, names):
    """Pick an everyday name from SIMBAD's NAME entries, or None."""
    if PREFER.get(n) in names:
        return PREFER[n]
    names = [" ".join(SPELL_OUT.get(w, w) for w in x.split()) for x in names]
    abbrev = re.compile(r"\b(Ori|And|UMa|Vir|Tau)\b|^M \d|^FAUST")
    ok = [x for x in names if not x.isupper() and "*" not in x and not abbrev.search(x)]
    preferred = [x for x in ok if re.search(r"Nebula|Galaxy|Cluster", x)]
    pool = preferred or ok
    return min(pool, key=len) if pool else None


def fetch_messier():
    path = RAW / "messier_simbad.json"
    if path.exists():
        return json.loads(path.read_text())
    log("SIMBAD: positions, types and names of M 1 to M 110")
    s = pyvo.dal.TAPService(SIMBAD_TAP)
    ids = ",".join(f"'M {i}'" for i in range(1, 111))
    base = retry(lambda: s.search(
        f"SELECT i.id, b.main_id, b.ra, b.dec, b.otype FROM ident AS i "
        f"JOIN basic AS b ON i.oidref = b.oid WHERE i.id IN ({ids})").to_table())
    names = retry(lambda: s.search(
        f"SELECT m.id AS mid, n.id AS name FROM ident AS m JOIN ident AS n "
        f"ON m.oidref = n.oidref WHERE m.id IN ({ids}) AND n.id LIKE 'NAME %'", maxrec=5000).to_table())
    odesc = retry(lambda: s.search("SELECT otype, description FROM otypedef", maxrec=5000).to_table())
    odesc = {str(r["otype"]).strip(): str(r["description"]) for r in odesc}
    by = defaultdict(list)
    for r in names:
        by[int(re.sub(r"\D", "", str(r["mid"])))].append(str(r["name"])[5:].strip())
    out = []
    for r in base:
        n = int(re.sub(r"\D", "", str(r["id"])))
        otype = str(r["otype"]).strip()
        out.append({"messier": n, "simbad_id": " ".join(str(r["main_id"]).split()),
                    "ra": round(float(r["ra"]), 6), "dec": round(float(r["dec"]), 6),
                    "otype": otype, "otype_description": odesc.get(otype),
                    "names": sorted(by.get(n, []), key=len)})
    out.sort(key=lambda o: o["messier"])
    RAW.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=1))
    return out


# ---------- 2. Which images cover each Messier object (IRSA) ----------

def fetch_messier_obs(messier):
    folder = RAW / "messier_obs"
    folder.mkdir(parents=True, exist_ok=True)
    s = pyvo.dal.TAPService(IRSA_TAP)
    tables = {}
    for o in messier:
        path = folder / f"M{o['messier']}.ecsv"
        if not path.exists():
            log(f"IRSA: images covering M {o['messier']}")
            q = ("select obs_id, t_min, energy_bandpassname, em_min, em_max, access_url "
                 "from spherex.obscore where CONTAINS(POINT('ICRS', "
                 f"{o['ra']}, {o['dec']}), s_region) = 1")
            retry(lambda: s.search(q, maxrec=100000).to_table()).write(path, overwrite=True)
        tables[o["messier"]] = Table.read(path)
    return tables


# ---------- 3. Every exposure's centre (IRSA, one big job) ----------

def fetch_pointings():
    path = RAW / "pointings_D2.ecsv"
    if path.exists():
        return Table.read(path)
    log("IRSA: every exposure centre on detector D2 (one long job, can take 15 minutes)")
    s = pyvo.dal.TAPService(IRSA_TAP)
    job = retry(lambda: s.submit_job(
        "select t_min, s_ra, s_dec from spherex.obscore where energy_bandpassname = 'SPHEREx-D2'",
        maxrec=2000000))
    job.run()
    while True:
        try:
            if job.phase in ("COMPLETED", "ERROR", "ABORTED"):
                break
        except Exception:
            pass  # the connection drops sometimes; the job keeps running at IRSA
        time.sleep(30)
    job.raise_if_error()
    t = retry(lambda: job.fetch_result().to_table())
    t.write(path, overwrite=True)
    return t


# ---------- 4. Build the site files ----------

def release_of(url):
    # DataLink links look like ...?ID=ivo://irsa.ipac/spherex_dr1?<obs_id>/D1
    m = re.search(r"spherex_((?:qr|dr)\d+)", str(url), re.I)
    return m.group(1).upper() if m else None


def mjd_to_date(mjd):
    return Time(mjd, format="mjd").to_datetime()


def build():
    messier = fetch_messier()
    obs = fetch_messier_obs(messier)
    pts = fetch_pointings()

    # Pointings grouped by UTC date
    good = ~np.ma.getmaskarray(np.ma.asarray(pts["t_min"]))
    pts = pts[good]
    # In time order, each with its minute of the UTC day, so the page can replay the day.
    pts = pts[np.argsort(np.asarray(pts["t_min"], float))]
    stamps = mjd_to_date(np.asarray(pts["t_min"], float))
    by_day = defaultdict(list)
    for dt, ra, dec in zip(stamps, np.asarray(pts["s_ra"], float), np.asarray(pts["s_dec"], float)):
        by_day[dt.date().isoformat()].append((round(ra, 1), round(dec, 1), dt.hour * 60 + dt.minute))

    # Messier images grouped by UTC date, plus the release each image belongs to
    info = {o["messier"]: o for o in messier}
    seen = defaultdict(lambda: defaultdict(list))   # day -> messier -> rows
    release_days = defaultdict(set)
    for n, t in obs.items():
        if len(t) == 0:
            continue
        t = t[~np.ma.getmaskarray(np.ma.asarray(t["t_min"]))]
        for row, dt in zip(t, mjd_to_date(np.asarray(t["t_min"], float))):
            d = dt.date().isoformat()
            seen[d][n].append(row)
            rel = release_of(row["access_url"])
            if rel:
                release_days[rel].add(d)

    def kind(o):
        for k, codes in KIND.items():
            if o["otype"] in codes:
                return k
        return None

    messier_out = []
    for o in messier:
        messier_out.append({
            "messier": o["messier"], "label": f"M {o['messier']}",
            "name": friendly_name(o["messier"], o["names"]), "kind": kind(o),
            "simbad_type": o["otype_description"], "simbad_id": " ".join(o["simbad_id"].split()),
            "ra": o["ra"], "dec": o["dec"],
            "headline_ok": o["messier"] not in NOT_HEADLINE and kind(o) is not None,
        })

    days_dir = OUT / "days"
    days_dir.mkdir(parents=True, exist_ok=True)
    for old in days_dir.glob("*.json"):
        old.unlink()

    # Date range of each release, from the Messier images. A day with no Messier
    # image gets its release from these ranges and is marked "inferred".
    ranges = {r: (min(ds), max(ds)) for r, ds in release_days.items()}

    def releases_by_date(d):
        return sorted(r for r, (a, b) in ranges.items() if a <= d <= b)

    calendar = defaultdict(list)
    summary = {}   # date -> [exposures, Messier objects], so the page can describe a day before opening it
    all_days = sorted(by_day)
    unknown_release = set()
    for d in all_days:
        p = by_day[d]
        sun = get_sun(Time(d + "T12:00:00"))
        objs = []
        rels = set()
        for n, rows in sorted(seen.get(d, {}).items()):
            dets = sorted({int(str(r["energy_bandpassname"])[-1]) for r in rows})
            wl = [float(x) * 1e6 for r in rows for x in (r["em_min"], r["em_max"])]
            first = min(rows, key=lambda r: float(r["t_min"]))
            rel = release_of(first["access_url"])
            rels.update(release_of(r["access_url"]) for r in rows)
            objs.append({
                "messier": n, "images": len(rows), "detectors": dets,
                "wavelength_um": [round(min(wl), 2), round(max(wl), 2)],
                "example": {"obs_id": str(first["obs_id"]),
                            "time_utc": mjd_to_date(float(first["t_min"])).isoformat(timespec="seconds"),
                            "datalink": str(first["access_url"]), "release": rel},
            })
        rels.discard(None)
        inferred = not rels
        if inferred:
            rels = set(releases_by_date(d)) or {
                min(ranges, key=lambda r: min(abs((date.fromisoformat(d) - date.fromisoformat(x)).days)
                                              for x in ranges[r]))}
        rel_list = sorted(rels)
        for r in rel_list:
            if r not in DOIS:
                unknown_release.add(r)
        record = {
            "date": d,
            "exposures": len(p),
            "full_day": len(p) >= FULL_DAY,
            "sun": {"ra": round(float(sun.ra.deg), 2), "dec": round(float(sun.dec.deg), 2)},
            "releases": [{"release": r, "doi": DOIS.get(r)} for r in rel_list],
            "release_inferred_from_dates": inferred,
            "pointings": [list(x) for x in p],
            "messier": objs,
        }
        (days_dir / f"{d}.json").write_text(json.dumps(record, separators=(",", ":")))
        calendar[d[5:]].append(d)
        summary[d] = [len(p), len(objs)]

    releases = []
    for r, ds in sorted(release_days.items()):
        releases.append({"release": r, "doi": DOIS.get(r), "first_date": min(ds), "last_date": max(ds)})

    index = {
        "note": ("Your Beginnings data. One file per day SPHEREx observed, in days/. "
                 "Built by tools/make_beginnings.py; re-run it after a new data release. "
                 "A Messier object is listed for a day when its catalogue position lies inside "
                 "at least one SPHEREx image footprint taken that UTC day. That does not mean it "
                 "is detected or bright in the image."),
        "built": date.today().isoformat(),
        "first_date": all_days[0],
        "last_date": all_days[-1],
        "days_count": len(all_days),
        "pointings_note": "Exposure centres on detector D2 in time order, as [ra, dec, minute of the UTC day], rounded to 0.1 degree. Each exposure covers about 3.5 by 11 degrees across its six detectors.",
        "releases": releases,
        "leap_day": "No SPHEREx data exists for 29 February yet: 2025 and 2026 are not leap years.",
        "calendar": {k: calendar[k] for k in sorted(calendar)},
        "days": summary,
        "messier_source": "SIMBAD (positions, types and names), queried through the Harvard mirror",
        "messier": messier_out,
    }
    (OUT / "index.json").write_text(json.dumps(index, indent=1))

    # Report
    no_obj = [d for d in all_days if not seen.get(d)]
    log(f"\nWrote {len(all_days)} day files, {all_days[0]} to {all_days[-1]}")
    log(f"Releases: {releases}")
    if unknown_release:
        log(f"WARNING: no DOI recorded for {sorted(unknown_release)}. Add it to DOIS before publishing.")
    log(f"Days with no Messier object in any picture: {len(no_obj)}")
    never = [o["messier"] for o in messier if len(obs[o["messier"]]) == 0]
    log(f"Messier objects never pictured: {never or 'none'}")
    mds = [k for k in calendar]
    log(f"Calendar dates covered: {len(mds)} of 366")
    return index


if __name__ == "__main__":
    sys.exit(0 if build() else 1)
