// Sky viewer: the stage, the timeline, playback, Then and Now compare, the strip, the colour
// slider, the image details and the data table. Everything is built from one list of
// observation objects (field names from RULES-FOR-CLAUDE-CODE.md, section 3), so the pictures
// and the text can never disagree.
//
// Use: SelenitesViewer.load(data)      data is { name, summary, placeholder, observations: [...] }
//      SelenitesViewer.loading(label)  shows the loading state on the stage
//      SelenitesViewer.clear(text)     back to the empty stage with a message
//
// Motion rules (docs/design-direction.md): short, ease-out, interruptible. Keyboard steps and
// playback never animate (playback cuts hard, like an astronomer's blink comparison).
(function () {
  "use strict";

  var STATUS = {
    "clear": { label: "Clear detection", cls: "clear" },
    "faint": { label: "Faint", cls: "faint" },
    "not-detected": { label: "Not detected", cls: "nd" },
    "no-observation": { label: "No observation", cls: "noobs" },
    // The pipeline's no_data: the image exists but its brightness could not be measured
    // (for example masked pixels). That is not "not detected", so it gets its own shape.
    "not-measured": { label: "Flagged", cls: "unmeasured" }
  };
  var WL_MIN = 0.75, WL_MAX = 5;

  // ---------- reading the pipeline's files ----------
  // Elisabetta's pipeline writes site/data/<slug>.json. Its names differ a little from the
  // viewer's, so they are translated here once, on load, and the pipeline files stay as they are
  // (a new data release then needs no code change, FR-9).
  var PIPE_STATUS = { "not_detected": "not-detected", "no_observation": "no-observation", "no_data": "not-measured" };
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function readableDate(s) {
    if (typeof s !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s)) return s;
    var t = new Date(s.replace(/Z?$/, "Z"));
    if (isNaN(t.getTime())) return s;
    return t.getUTCDate() + " " + MONTHS[t.getUTCMonth()] + " " + t.getUTCFullYear() + ", " + two(t.getUTCHours()) + ":" + two(t.getUTCMinutes()) + " UTC";
  }
  // Pipeline paths start at the repository root (data/processed/...). GitHub Pages may serve
  // only site/, so tools/copy_site_pictures.py copies them to site/data/pictures/ and the
  // viewer reads them there.
  function sitePath(p) { return typeof p === "string" && /^data\/processed\//.test(p) ? "data/pictures/" + p.slice("data/processed/".length) : p; }
  function fromPipeline(d) {
    if (!d || d.placeholder) return d;
    var out = Object.assign({}, d);
    out.name = d.name || d.target;
    out.observations = (d.observations || []).map(function (o) {
      var c = Object.assign({}, o);
      c.status = PIPE_STATUS[o.status] || o.status;
      c.date_utc = o.date;
      c.date = readableDate(o.date);
      c.image_url = sitePath(o.image_url);
      c.thumbnail = sitePath(o.thumbnail);
      if (c.brightness === undefined && o.flux_mjysr !== undefined) {
        c.brightness = o.flux_mjysr === null ? null : Math.round(o.flux_mjysr * 100) / 100;
      }
      return c;
    });
    if (out.brightness_unit === undefined && d.observations && d.observations.some(function (o) { return o.flux_mjysr !== undefined; })) out.brightness_unit = "MJy/sr";
    if (!out.summary && out.observations.length) {
      var sorted = out.observations.slice().sort(function (a, b) { return a.mjd - b.mjd; });
      var pics = out.observations.filter(function (o) { return o.image_url || o.thumbnail; }).length;
      out.summary = "SPHEREx observed " + out.name + " in " + sorted.length + " images, from " +
        sorted[0].date.split(",")[0] + " to " + sorted[sorted.length - 1].date.split(",")[0] +
        (d.release ? " (data release " + d.release + (d.doi ? ", DOI " + d.doi : "") + ")" : "") + ". " +
        (pics === sorted.length
          ? "Each one has a picture here, and the Table tab lists its numbers."
          : pics + " of these images have a picture on this site so far. Every image is listed in the Table tab with its numbers.");
    }
    return out;
  }

  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(motionQuery && motionQuery.matches); }

  function $(id) { return document.getElementById(id); }
  var el = {
    section: $("viewer-section"), stage: $("stage"), now: $("v-now"), then: $("v-then"),
    stageEmpty: $("stage-empty"), emptyText: $("viewer-empty-text"),
    hud: { tl: $("hud-tl"), tr: $("hud-tr"), bl: $("hud-bl"), br: $("hud-br") },
    splitPos: $("v-split-pos"), split: $("v-split"),
    viewer: $("viewer"), inspector: $("inspector"), stripSection: $("strip-section"), placeholder: $("v-placeholder"), summary: $("v-summary"), chapters: $("v-chapters"),
    desc: $("v-desc"), motion: $("v-motion"), motionWrap: $("v-motion-wrap"),
    tlTrack: $("tl-track"), tlPos: $("tl-pos"), tlThumb: $("v-pos"), tlTicks: $("tl-ticks"), tlScale: $("tl-scale"), tlFill: $("tl-fill"),
    first: $("v-first"), prev: $("v-prev"), play: $("v-play"), playText: $("v-play-text"), next: $("v-next"), last: $("v-last"),
    posOut: $("v-pos-out"), speed: $("v-speed"), compare: $("v-compare"), overlay: $("v-overlay"),
    comparePanel: $("v-compare-panel"), thenSelect: $("v-then-select"), nowSelect: $("v-now-select"), compareText: $("v-compare-text"),
    stripScroll: $("v-strip-scroll"), strip: $("v-strip"),
    wlTrack: $("wl-track"), wlPos: $("wl-pos"), wlThumb: $("v-wl"), wlTicks: $("wl-ticks"), wlScale: $("wl-scale"), wlText: $("v-wl-text"),
    statusGlyph: $("v-status-glyph"), statusLabel: $("v-status-label"), dl: $("v-dl"),
    tbody: $("v-tbody"), tableCap: $("v-table-cap"),
    tableScroll: $("v-table-scroll"), filterOpts: $("v-filter-opts"), filterOut: $("v-filter-out"),
    tableCurrent: $("v-table-current"),
    live: $("v-live"),
    mark: $("v-mark"), markBtn: $("v-mark-btn"), markInfo: $("v-mark-info"), markWhy: $("v-mark-why"),
    goto: $("v-goto"), gotoN: $("v-goto-n"), gotoHelp: $("v-goto-help")
  };

  var data = null, obs = [], index = 0, timer = null;
  var positions = [], chapterStarts = [];
  var comparing = false, thenIndex = 0, split = 50;
  var targetId = null; // the ?target= id of the loaded set, used to build view_link

  // The observation contract (RULES section 3). Only these fields travel in
  // selenites:mark-candidate, so viewer-only extras (brightness, flags, note...) never leak
  // into saved candidates. See docs/candidate-event-contract.md.
  var CONTRACT_FIELDS = ["target", "obs_id", "ra", "dec", "date", "mjd", "detector",
    "wavelength_um", "thumbnail", "image_url", "view_link", "status"];

  function status(o) { return STATUS[o.status] || STATUS["not-detected"]; }
  function hasWl(o) { return o.wavelength_um !== null && o.wavelength_um !== undefined; }
  function microns(v) { return v === null || v === undefined ? null : Number(v).toFixed(2); }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // Per-image description, from the accessibility spec:
  // "Image {n} of {total}. {date}. {wavelength} microns. {status label}. {change note}."
  function describe(i) {
    var o = obs[i], parts = ["Image " + (i + 1) + " of " + obs.length + ".", o.date + "."];
    if (hasWl(o)) parts.push(microns(o.wavelength_um) + " microns.");
    parts.push(status(o).label + ".");
    if (o.note) parts.push(o.note);
    var m = motionSentence(i);
    if (m) parts.push(m);
    return parts.join(" ");
  }

  // ---------- movement in words (REQUIREMENTS B-1) ----------
  // A blind visitor cannot see the target move between pictures, so each image also says how
  // far, and which way, it moved since the last image that has a position.
  //
  // Real data: the pipeline's per-image ra and dec are the target's predicted position (from
  // orbit calculations for the comet, from catalogue position and proper motion for stars).
  // The cutouts are centred on that position, so the target never moves on the picture;
  // the movement is told as a direction on the sky (north, east...) and an angle.
  // Practice data: practice_xy, percent of the picture from the top-left, told on the picture.
  function skyMode() { return !!(data && !data.placeholder); }
  function num(v) { return v !== null && v !== undefined && v !== "" && isFinite(v); }
  function posOf(o) {
    if (!o || o.status === "no-observation") return null;
    if (skyMode()) return num(o.ra) && num(o.dec) ? [Number(o.ra), Number(o.dec)] : null;
    var p = o.position_xy || o.practice_xy;
    return p && p.length === 2 && isFinite(p[0]) && isFinite(p[1]) ? p : null;
  }
  function hasPositions() { return obs.some(function (o) { return !!posOf(o); }); }
  function tracked() {
    if (skyMode()) return "the predicted position of " + ((data && (data.position_label || data.name)) || "the target");
    return (data && data.position_label) || (data && data.placeholder ? "the practice spot" : "the marked spot");
  }
  function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // On the picture (practice data). The ninth of the picture a position falls in.
  function area(p) {
    var h = p[0] < 33.3 ? "left" : p[0] > 66.7 ? "right" : "centre";
    var v = p[1] < 33.3 ? "top" : p[1] > 66.7 ? "bottom" : "middle";
    if (v === "middle" && h === "centre") return { name: "the centre", at: "in" };
    if (v === "middle") return { name: "the " + h + " side", at: "on" };
    if (h === "centre") return { name: "the " + v, at: "near" };
    return { name: "the " + v + " " + h, at: "in" };
  }
  function region(p) { var a = area(p); return a.at + " " + a.name + " of the picture"; }
  function direction(dx, dy) {
    var ax = Math.abs(dx), ay = Math.abs(dy), parts = [];
    if (ay >= 1 && ay >= ax * 0.4) parts.push(dy < 0 ? "up" : "down");
    if (ax >= 1 && ax >= ay * 0.4) parts.push(dx < 0 ? "left" : "right");
    return parts.join(" and ");
  }

  // On the sky (real data). Separation in arcseconds (haversine) and an eight-point direction.
  var RAD = Math.PI / 180;
  function skySep(a, b) {
    var s = Math.pow(Math.sin((b[1] - a[1]) * RAD / 2), 2) +
      Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.pow(Math.sin((b[0] - a[0]) * RAD / 2), 2);
    return 2 * Math.asin(Math.min(1, Math.sqrt(s))) / RAD * 3600;
  }
  function compass(a, b) {
    var dra = ((b[0] - a[0] + 540) % 360) - 180;
    var east = dra * Math.cos((a[1] + b[1]) / 2 * RAD), north = b[1] - a[1];
    var ang = (Math.atan2(east, north) / RAD + 360) % 360; // 0 = north, 90 = east
    return ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(ang / 45) % 8];
  }
  function angleText(arcsec) {
    if (arcsec < 59.5) { var s = Math.round(arcsec); return "about " + s + (s === 1 ? " arcsecond" : " arcseconds"); }
    if (arcsec < 3570) { var m = arcsec / 60; m = m < 10 ? Math.round(m * 10) / 10 : Math.round(m); return "about " + m + (m === 1 ? " arcminute" : " arcminutes"); }
    var d = arcsec / 3600; d = d < 10 ? Math.round(d * 10) / 10 : Math.round(d);
    return "about " + d + (d === 1 ? " degree" : " degrees");
  }
  var STILL_ARCSEC = 1; // below this a move is called "the same place"

  // Distance and direction between two positions, in the mode's own words.
  function move(a, b) {
    if (skyMode()) {
      var s = skySep(a, b), dir = compass(a, b);
      return { still: s < STILL_ARCSEC, how: angleText(s) + " to the " + dir + " on the sky", short: capital(dir) + ", " + angleText(s).replace("about ", "") };
    }
    var d = Math.round(Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2)));
    var pd = direction(b[0] - a[0], b[1] - a[1]);
    return { still: d < 1, how: pd + " by about " + d + " percent of the picture's width", short: capital(pd) + ", about " + d + " percent" };
  }
  function stillText() { return skyMode() ? "stayed in the same place on the sky (it moved less than 1 arcsecond)" : "stayed in about the same place"; }
  function chapterOf(i) {
    var c = 0;
    chapterStarts.forEach(function (s, k) { if (i >= s) c = k; });
    return c;
  }
  function prevWithPos(i) {
    for (var j = i - 1; j >= 0; j--) if (posOf(obs[j])) return j;
    return -1;
  }
  // Honest rules: a position is not a detection. Say so when nothing is seen or measured there.
  function caveat(o) {
    if (o.status === "not-detected") return ", though nothing is seen there in this image";
    if (o.status === "not-measured") return ", though its measurement in this image is flagged as failed";
    return "";
  }

  // One sentence for image i, or "" when there is nothing to say.
  function motionSentence(i) {
    if (!hasPositions()) return "";
    var o = obs[i], p = posOf(o);
    if (!p) return o.status === "no-observation" ? "" : "No position is recorded for this image.";
    var j = prevWithPos(i);
    if (j < 0) return skyMode() ? "This is the first image with " + tracked() + "." : capital(tracked()) + " is " + region(p) + ".";
    var q = posOf(obs[j]), m = move(q, p);
    var gap = chapterOf(j) !== chapterOf(i) ? ", after a gap of " + spanText(o.mjd - obs[j].mjd) : "";
    if (m.still) return "Since image " + (j + 1) + gap + ", " + tracked() + " has " + stillText() + (skyMode() ? "" : ", " + region(p)) + caveat(o) + ".";
    return "Since image " + (j + 1) + " (" + obs[j].date + ")" + gap + ", " + tracked() + " moved " + m.how +
      (skyMode() ? caveat(o) + "." : ". It is now " + region(p) + caveat(o) + ".");
  }
  // Short form for the data table.
  function motionCell(i) {
    if (!hasPositions()) return "None";
    var p = posOf(obs[i]);
    if (!p) return "No position";
    var j = prevWithPos(i);
    if (j < 0) return "First position";
    var m = move(posOf(obs[j]), p);
    return m.still ? "Same place" : m.short;
  }
  // Where the positions come from, for the summary. Set per example in examples.js.
  function sourceText() {
    if (!skyMode()) return " Directions are on the picture, not on the sky.";
    var src = data && data.position_source;
    return (src ? " Positions are predicted " + src + "." : " Positions are predicted, not measured from the pictures.") +
      " Directions are on the sky, not on the picture: each picture is centred on the predicted position.";
  }
  function spanText(days) {
    if (days < 1) { var h = Math.max(1, Math.round(days * 24)); return h + (h === 1 ? " hour" : " hours"); }
    var d = Math.round(days); return d + (d === 1 ? " day" : " days");
  }
  // Groups of images for the summary, as [start, end] index pairs. The pipeline's chapter field
  // (the comet's "Aug" and "Dec") wins; other real targets get one sentence for the whole span;
  // practice data uses the timeline's own chapters.
  function summaryGroups() {
    var groups = [];
    if (obs.length && obs.every(function (o) { return o.chapter; })) {
      obs.forEach(function (o, i) {
        if (i && o.chapter === obs[i - 1].chapter) groups[groups.length - 1][1] = i; else groups.push([i, i]);
      });
      return groups;
    }
    if (skyMode()) return [[0, obs.length - 1]];
    return chapterStarts.map(function (s, c) { return [s, (c + 1 < chapterStarts.length ? chapterStarts[c + 1] : obs.length) - 1]; });
  }
  // One sentence per group of dates, from its first position to its last.
  function motionSummary() {
    if (!hasPositions()) return "";
    var lines = [], groups = summaryGroups();
    groups.forEach(function (g) {
      var s = g[0], e = g[1];
      var first = -1, last = -1;
      for (var i = s; i <= e; i++) if (posOf(obs[i])) { if (first < 0) first = i; last = i; }
      var when = groups.length > 1 ? obs[s].date.split(",")[0] + " to " + obs[e].date.split(",")[0] + ": " : "";
      if (first < 0) { lines.push(when + "no position is recorded."); return; }
      var a = posOf(obs[first]), b = posOf(obs[last]);
      if (first === last) { lines.push(when + tracked() + " has one position" + (skyMode() ? "." : ", " + region(a) + ".")); return; }
      var days = spanText(obs[last].mjd - obs[first].mjd), m = move(a, b);
      if (m.still) { lines.push(when + tracked() + " " + stillText() + " over " + days + (skyMode() ? "." : ", " + region(a) + ".")); return; }
      var where = "";
      if (!skyMode()) {
        var from = area(a).name, to = area(b).name;
        where = from === to ? ", staying " + region(b) : ", from " + from + " to " + to + " of the picture";
      }
      lines.push(when + tracked() + " moved " + m.how + " over " + days + where + ".");
    });
    return lines.map(capital).join(" ") + sourceText();
  }

  function shortLine(i) {
    var o = obs[i];
    return "image " + (i + 1) + " (" + o.date + (hasWl(o) ? ", " + microns(o.wavelength_um) + " microns" : "") + ", " + status(o).label + ")";
  }

  // ---------- pictures ----------

  // Practice pictures are drawn here so the viewer can be tested before real images exist.
  // They are labelled on the picture itself. Real data uses thumbnail and image_url.
  var PRACTICE_STARS = [[12, 18, 1.2], [80, 14, 0.9], [22, 80, 1], [60, 62, 1.4], [90, 88, 0.8], [44, 24, 0.7], [70, 30, 0.6]];
  function practiceSvg(o) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#050508"/>';
    PRACTICE_STARS.forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '" fill="#9a98a8"/>'; });
    if (o.practice_xy && o.brightness !== null) {
      var b = clamp(o.brightness, 0.12, 1);
      s += '<circle cx="' + o.practice_xy[0] + '" cy="' + o.practice_xy[1] + '" r="' + (1.2 + b * 2.6) + '" fill="#ffffff" fill-opacity="' + b + '"/>';
    }
    s += '<text x="50" y="83" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#b9b6c6" letter-spacing="0.8">PRACTICE PICTURE</text></svg>';
    return "data:image/svg+xml," + encodeURIComponent(s);
  }
  function imageSrc(o, small) {
    if (o.status === "no-observation") return null;
    if (small && o.thumbnail) return o.thumbnail;
    if (o.image_url) return o.image_url;
    if (o.thumbnail) return o.thumbnail;
    if (data && data.placeholder) return practiceSvg(o);
    return null;
  }

  // Put image i into a stage layer. With fade, the new picture fades in over the old one
  // (about 180 ms); otherwise it swaps at once.
  function paintLayer(layer, i, fade) {
    var o = obs[i], src = imageSrc(o, false);
    var old = Array.prototype.slice.call(layer.children);
    var node;
    if (src) {
      node = document.createElement("img");
      node.alt = describe(i);
      node.decoding = "async";
      node.src = src;
    } else {
      node = document.createElement("div");
      node.className = "stage-gap";
      node.textContent = o.status === "no-observation" ? "No image covers this place on this date." : "No picture of this image is on the site yet. Its numbers are in the Table tab.";
    }
    if (!fade || reduced()) {
      layer.replaceChildren(node);
      return;
    }
    old.forEach(function (n) { n.setAttribute("aria-hidden", "true"); if (n.alt !== undefined) n.alt = ""; });
    node.classList.add("is-entering");
    layer.appendChild(node);
    var reveal = function () {
      requestAnimationFrame(function () {
        node.classList.remove("is-entering");
        setTimeout(function () { old.forEach(function (n) { if (n.parentNode === layer) layer.removeChild(n); }); }, 220);
      });
    };
    if (node.tagName === "IMG" && !node.complete) { node.onload = reveal; node.onerror = reveal; } else reveal();
  }

  // ---------- announcements ----------

  var announceTimer = null;
  function announce(text) {
    clearTimeout(announceTimer);
    // A short pause lets fast changes (dragging) settle, and makes repeats read again.
    announceTimer = setTimeout(function () {
      el.live.textContent = "";
      setTimeout(function () { el.live.textContent = text; }, 40);
    }, 160);
  }

  // ---------- a small accessible slider (WAI-ARIA slider pattern) ----------
  // The thumb is the focusable role="slider". Its zero-width holder is moved with transform in
  // pixels, so the browser only composites (no layout work while dragging or playing) and
  // nothing sticks out past the track. A resize re-measures the track.
  function makeSlider(o) {
    var value = o.min, dragging = false, lastFrac = 0;
    function move(f) {
      lastFrac = f;
      o.pos.style.transform = "translateX(" + (f * o.track.clientWidth).toFixed(1) + "px)";
    }
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        o.pos.classList.add("is-instant");
        move(lastFrac);
      }).observe(o.track);
    }
    function place(v, glide) {
      o.pos.classList.toggle("is-instant", !glide || reduced());
      var f = o.toFrac(v);
      move(f);
      if (o.fill) o.fill.style.transform = "scaleX(" + f.toFixed(4) + ")";
      o.thumb.setAttribute("aria-valuenow", o.ariaNow ? o.ariaNow(v) : v);
      o.thumb.setAttribute("aria-valuetext", o.text(v));
    }
    function commit(v, how) {
      v = o.snap(clamp(v, o.min, o.max));
      var changed = v !== value;
      value = v;
      place(v, how === "pointer" || how === "glide");
      if (changed) o.onChange(v, how);
    }
    function fromPointer(x) {
      var r = o.track.getBoundingClientRect();
      return o.fromFrac(clamp((x - r.left) / r.width, 0, 1));
    }
    o.thumb.addEventListener("keydown", function (e) {
      var k = e.key, big = o.bigStep || o.step * 10, v = null;
      if (k === "ArrowRight" || k === "ArrowUp") v = value + o.step;
      else if (k === "ArrowLeft" || k === "ArrowDown") v = value - o.step;
      else if (k === "PageUp") v = value + big;
      else if (k === "PageDown") v = value - big;
      else if (k === "Home") v = o.min;
      else if (k === "End") v = o.max;
      if (v === null) return;
      e.preventDefault();
      commit(v, "key");
    });
    o.track.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      try { o.track.setPointerCapture(e.pointerId); } catch (err) {}
      o.thumb.focus({ preventScroll: true });
      o.track.classList.add("is-dragging");
      commit(fromPointer(e.clientX), "pointer");
    });
    o.track.addEventListener("pointermove", function (e) {
      if (dragging) commit(fromPointer(e.clientX), "drag");
    });
    function end() { dragging = false; o.track.classList.remove("is-dragging"); }
    o.track.addEventListener("pointerup", end);
    o.track.addEventListener("pointercancel", end);
    return {
      set: function (v, glide) { value = v; place(v, glide); },
      get: function () { return value; },
      configure: function (min, max) { o.min = min; o.max = max; o.thumb.setAttribute("aria-valuemin", o.ariaNow ? o.ariaNow(min) : min); o.thumb.setAttribute("aria-valuemax", o.ariaNow ? o.ariaNow(max) : max); }
    };
  }

  // Timeline: one stop per image, placed by real date. Long gaps (for example between the
  // comet's August and December chapters) are shortened and marked, so they do not swallow
  // the track, but they are never hidden.
  function layoutTimeline() {
    positions = []; chapterStarts = [0];
    var n = obs.length;
    if (n === 1) { positions = [0.5]; return; }
    var gaps = [];
    for (var i = 1; i < n; i++) gaps.push(Math.max(0, obs[i].mjd - obs[i - 1].mjd));
    var sorted = gaps.slice().sort(function (a, b) { return a - b; });
    var median = sorted[Math.floor(sorted.length / 2)] || 1;
    var cap = Math.max(median * 4, 1);
    var widths = gaps.map(function (g, k) {
      if (g > cap * 2) { chapterStarts.push(k + 1); return cap * 1.6; }
      return Math.max(g, median * 0.4, 0.001);
    });
    var total = widths.reduce(function (a, b) { return a + b; }, 0);
    var run = 0;
    positions.push(0);
    widths.forEach(function (w) { run += w; positions.push(run / total); });
    // Keep the end stops off the very edge so their marks stay inside the track.
    positions = positions.map(function (p) { return 0.02 + p * 0.96; });
  }

  function nearestStop(f) {
    var best = 0, gap = Infinity;
    positions.forEach(function (p, i) { var g = Math.abs(p - f); if (g < gap) { gap = g; best = i; } });
    return best;
  }

  var timeline = makeSlider({
    track: el.tlTrack, pos: el.tlPos, thumb: el.tlThumb, fill: el.tlFill,
    min: 0, max: 0, step: 1, bigStep: 5,
    toFrac: function (i) { return positions[i] === undefined ? 0 : positions[i]; },
    fromFrac: nearestStop,
    snap: function (v) { return Math.round(v); },
    ariaNow: function (i) { return i + 1; },
    text: function (i) { return obs[i] ? (i + 1) + " of " + obs.length + ", " + obs[i].date : ""; },
    onChange: function (i, how) { stop(); go(i, how); }
  });

  // Colour slider: 0.75 to 5 microns. Moving it jumps to the image nearest that colour.
  var colour = makeSlider({
    track: el.wlTrack, pos: el.wlPos, thumb: el.wlThumb,
    min: WL_MIN, max: WL_MAX, step: 0.05, bigStep: 0.5,
    toFrac: function (v) { return (v - WL_MIN) / (WL_MAX - WL_MIN); },
    fromFrac: function (f) { return WL_MIN + f * (WL_MAX - WL_MIN); },
    snap: function (v) { return Math.round(v * 100) / 100; },
    // Read out in words with the status, not just the number (REQUIREMENTS B-6).
    text: function (v) {
      var near = nearestByColour(v);
      if (near.index < 0) return microns(v) + " microns";
      var o = obs[near.index];
      return microns(v) + " microns. Nearest image " + (near.index + 1) + ": " + status(o).label + (near.gap > 0.3 ? ", taken far from this colour" : "");
    },
    onChange: function (v, how) {
      stop();
      el.wlText.textContent = colourText(v);
      var near = nearestByColour(v);
      if (near.index >= 0 && near.index !== index) go(near.index, how === "key" ? "colour-key" : "colour");
      else announce(colourText(v));
    }
  });

  // Then and Now divider, also a slider (percent of the picture that shows Then).
  var divider = makeSlider({
    track: el.stage, pos: el.splitPos, thumb: el.split,
    min: 0, max: 100, step: 5, bigStep: 25,
    toFrac: function (v) { return v / 100; },
    fromFrac: function (f) { return f * 100; },
    snap: function (v) { return Math.round(v); },
    text: function (v) { return "Then fills the left " + v + " percent of the picture"; },
    onChange: function (v) { split = v; el.stage.style.setProperty("--split", v + "%"); }
  });

  function nearestByColour(v) {
    var best = -1, gap = Infinity;
    obs.forEach(function (o, i) {
      if (!hasWl(o)) return;
      var g = Math.abs(o.wavelength_um - v);
      if (g < gap) { gap = g; best = i; }
    });
    return { index: best, gap: gap };
  }
  function colourText(v) {
    var near = nearestByColour(v);
    if (near.index < 0) return "None of these images has a colour recorded.";
    var o = obs[near.index];
    var text = "At " + microns(v) + " microns, the nearest image is image " + (near.index + 1) + " (" +
      microns(o.wavelength_um) + " microns, " + o.date + "). Status there: " + status(o).label + ".";
    if (near.gap > 0.3) text += " No image was taken close to this colour.";
    return text;
  }

  // ---------- building the parts once per target ----------

  function tick(o, f, extraClass) {
    var t = document.createElement("span");
    t.className = "tick glyph glyph-xs " + status(o).cls + (extraClass ? " " + extraClass : "");
    t.style.left = (f * 100).toFixed(3) + "%";
    return t;
  }

  function buildTimeline() {
    layoutTimeline();
    el.tlTicks.replaceChildren();
    el.tlScale.replaceChildren();
    obs.forEach(function (o, i) { el.tlTicks.appendChild(tick(o, positions[i])); });
    // Gap marks between chapters, and a date label at the start of each chapter and at the end.
    chapterStarts.forEach(function (s, c) {
      if (s > 0) {
        var gap = document.createElement("span");
        gap.className = "gap-mark";
        var mid = (positions[s - 1] + positions[s]) / 2;
        gap.style.left = (mid * 100).toFixed(3) + "%";
        var days = Math.round(obs[s].mjd - obs[s - 1].mjd);
        gap.textContent = days + " days";
        el.tlTicks.appendChild(gap);
      }
      var lab = document.createElement("span");
      lab.className = "scale-label";
      lab.style.left = (positions[s] * 100).toFixed(3) + "%";
      lab.textContent = obs[s].date;
      el.tlScale.appendChild(lab);
    });
    var last = obs.length - 1;
    var lastChapter = chapterStarts[chapterStarts.length - 1];
    if (last > 0 && positions[last] - positions[lastChapter] > 0.22) {
      var end = document.createElement("span");
      end.className = "scale-label is-end";
      end.style.left = (positions[last] * 100).toFixed(3) + "%";
      end.textContent = obs[last].date;
      el.tlScale.appendChild(end);
    }
    timeline.configure(0, Math.max(0, obs.length - 1));
  }

  function buildColourTrack() {
    el.wlTicks.replaceChildren();
    obs.forEach(function (o) {
      if (hasWl(o)) el.wlTicks.appendChild(tick(o, (o.wavelength_um - WL_MIN) / (WL_MAX - WL_MIN)));
    });
    el.wlScale.replaceChildren();
    [0.75, 2, 3, 4, 5].forEach(function (v) {
      var lab = document.createElement("span");
      lab.className = "scale-label" + (v === 5 ? " is-end" : "");
      lab.style.left = ((v - WL_MIN) / (WL_MAX - WL_MIN) * 100) + "%";
      lab.textContent = v === 5 ? "5 microns" : String(v);
      el.wlScale.appendChild(lab);
    });
  }

  function buildStrip() {
    el.strip.replaceChildren();
    obs.forEach(function (o, i) {
      var li = document.createElement("li");
      if (chapterStarts.indexOf(i) > 0) li.className = "new-chapter";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "v-thumb";
      btn.tabIndex = -1;
      var src = imageSrc(o, true);
      var pic = document.createElement(src ? "img" : "span");
      pic.className = "v-thumb-pic";
      if (src) { pic.src = src; pic.alt = ""; pic.loading = "lazy"; pic.decoding = "async"; }
      else pic.classList.add("is-empty");
      btn.appendChild(pic);
      var n = document.createElement("span"); n.className = "v-thumb-n"; n.textContent = "Image " + (i + 1);
      var d = document.createElement("span"); d.className = "v-thumb-date"; d.textContent = o.date;
      var st = document.createElement("span"); st.className = "v-thumb-status";
      var g = document.createElement("span"); g.className = "glyph glyph-sm " + status(o).cls; g.setAttribute("aria-hidden", "true");
      st.appendChild(g);
      st.appendChild(document.createTextNode(status(o).label));
      btn.appendChild(n); btn.appendChild(d); btn.appendChild(st);
      btn.addEventListener("click", function () { stop(); go(i, "strip"); });
      li.appendChild(btn);
      el.strip.appendChild(li);
    });
  }

  // The strip is one Tab stop; arrow keys move along it (roving tabindex).
  el.strip.addEventListener("keydown", function (e) {
    var k = e.key, i = null;
    if (k === "ArrowRight" || k === "ArrowDown") i = index + 1;
    else if (k === "ArrowLeft" || k === "ArrowUp") i = index - 1;
    else if (k === "Home") i = 0;
    else if (k === "End") i = obs.length - 1;
    if (i === null) return;
    e.preventDefault();
    stop();
    go(clamp(i, 0, obs.length - 1), "key");
    var b = el.strip.querySelectorAll(".v-thumb")[index];
    if (b) b.focus({ preventScroll: true });
  });

  function revealThumb(smooth) {
    var b = el.strip.querySelectorAll(".v-thumb")[index];
    if (!b) return;
    var box = el.stripScroll;
    var left = b.parentNode.offsetLeft - (box.clientWidth - b.offsetWidth) / 2;
    box.scrollTo({ left: Math.max(0, left), behavior: smooth && !reduced() ? "smooth" : "auto" });
  }

  // The table's date: "1 Aug 2025, 08:01" on one line keeps each row short. The full date
  // (with UTC) is on the stage and in the Details tab.
  function shortDate(s) {
    var m = /^(\d{1,2}) ([A-Z][a-z]+) (\d{4})(?:, (\d\d:\d\d))?/.exec(String(s));
    if (!m) return String(s);
    return m[1] + "\u00a0" + m[2].slice(0, 3) + "\u00a0" + m[3] + (m[4] ? ", " + m[4] : "");
  }

  var tableFilter = "all";
  function buildTable() {
    el.tableCap.textContent = data.name + ": " + obs.length + " images in date order" + (data.placeholder ? " (practice data, not SPHEREx)" : "") + ". Times are UTC.";
    el.tbody.replaceChildren();
    obs.forEach(function (o, i) {
      var tr = document.createElement("tr");
      tr.dataset.status = o.status;
      var th = document.createElement("th"); th.scope = "row";
      var b = document.createElement("button"); b.type = "button"; b.className = "link-btn";
      b.textContent = "Image " + (i + 1);
      b.addEventListener("click", function () { stop(); go(i, "table"); el.stage.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" }); });
      th.appendChild(b); tr.appendChild(th);
      var cells = [shortDate(o.date), microns(o.wavelength_um) || "None", null,
       o.brightness === null || o.brightness === undefined ? "None" : String(o.brightness) + (data.brightness_unit ? " " + data.brightness_unit : ""), motionCell(i), o.note || ""];
      cells.forEach(function (text, c) {
        var td = document.createElement("td");
        if (c === 2) {
          // Status: shape and words together, never colour alone.
          var g = document.createElement("span"); g.className = "glyph glyph-sm " + status(o).cls; g.setAttribute("aria-hidden", "true");
          td.appendChild(g); td.appendChild(document.createTextNode(" " + status(o).label));
          td.className = "v-td-status";
        } else {
          td.textContent = text;
        }
        if (c <= 3) td.classList.add("nowrap");
        tr.appendChild(td);
      });
      el.tbody.appendChild(tr);
    });
    buildFilter();
  }

  // ---------- table filter: All, or one status at a time ----------
  var FILTER_ORDER = ["clear", "faint", "not-detected", "not-measured", "no-observation"];
  function buildFilter() {
    var counts = {};
    obs.forEach(function (o) { counts[o.status] = (counts[o.status] || 0) + 1; });
    var keys = ["all"].concat(FILTER_ORDER.filter(function (k) { return counts[k]; }));
    if (tableFilter !== "all" && !counts[tableFilter]) tableFilter = "all";
    el.filterOpts.replaceChildren();
    keys.forEach(function (k) {
      var lab = document.createElement("label"); lab.className = "v-chip";
      var input = document.createElement("input"); input.type = "radio"; input.name = "v-filter"; input.value = k;
      input.checked = k === tableFilter;
      input.addEventListener("change", function () { if (input.checked) applyFilter(k, true); });
      lab.appendChild(input);
      if (k !== "all") {
        var g = document.createElement("span"); g.className = "glyph glyph-xs " + STATUS[k].cls; g.setAttribute("aria-hidden", "true");
        lab.appendChild(g);
      }
      lab.appendChild(document.createTextNode((k === "all" ? "All" : STATUS[k].label) + " (" + (k === "all" ? obs.length : counts[k]) + ")"));
      el.filterOpts.appendChild(lab);
    });
    applyFilter(tableFilter, false);
  }
  function applyFilter(k, announce) {
    tableFilter = k;
    var rows = el.tbody.querySelectorAll("tr"), shown = 0;
    for (var r = 0; r < rows.length; r++) {
      var on = k === "all" || rows[r].dataset.status === k;
      rows[r].hidden = !on;
      if (on) shown++;
    }
    el.filterOut.textContent = k === "all" ? "" : "Showing " + shown + " of " + obs.length + " images: " + STATUS[k].label + ".";
    if (announce) { el.tableScroll.scrollTop = 0; revealRow(false); }
  }

  // Keep the row of the image on screen in view inside the table box. Only the box scrolls,
  // never the page, and it moves without animation unless asked (Play stays calm).
  function revealRow(smooth) {
    var box = el.tableScroll;
    if (!box || !box.offsetParent || !obs.length) return;
    var row = el.tbody.querySelectorAll("tr")[index];
    if (!row || row.hidden) return;
    var head = box.querySelector("thead");
    var headH = head ? head.offsetHeight : 0;
    var rowTop = row.offsetTop, rowBottom = rowTop + row.offsetHeight;
    var to = null;
    if (rowTop - headH < box.scrollTop) to = rowTop - headH - 8;
    else if (rowBottom > box.scrollTop + box.clientHeight) to = rowBottom - box.clientHeight + 8;
    if (to === null) return;
    // Glide only over short distances; a long glide through hundreds of rows feels slow.
    var near = Math.abs(to - box.scrollTop) < box.clientHeight * 2;
    box.scrollTo({ top: Math.max(0, to), behavior: smooth && near && !reduced() ? "smooth" : "auto" });
  }
  el.tableCurrent.addEventListener("click", function () {
    var row = el.tbody.querySelectorAll("tr")[index];
    if (row && row.hidden) {
      var all = el.filterOpts.querySelector('input[value="all"]');
      if (all) { all.checked = true; applyFilter("all", false); }
    }
    revealRow(true);
    var btn = row && row.querySelector(".link-btn");
    if (btn) btn.focus({ preventScroll: true });
  });

  function buildSelects() {
    [el.thenSelect, el.nowSelect].forEach(function (sel) {
      sel.replaceChildren();
      obs.forEach(function (o, i) {
        var opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = "Image " + (i + 1) + ", " + o.date + (hasWl(o) ? ", " + microns(o.wavelength_um) + " microns" : "") + ", " + status(o).label;
        sel.appendChild(opt);
      });
    });
  }

  // The date without the time of day (real data dates read "15 August 2025, 20:46 UTC").
  function day(i) { return String(obs[i].date).split(",")[0]; }
  function chaptersLine() {
    var parts = chapterStarts.map(function (s, c) {
      var e = (c + 1 < chapterStarts.length ? chapterStarts[c + 1] : obs.length) - 1;
      var a = day(s), z = day(e);
      return a === z ? a : a + " to " + z;
    });
    var n = obs.length + (obs.length === 1 ? " image" : " images");
    if (parts.length === 1) return n + ", " + parts[0] + ".";
    // Many groups make a very long line to hear; give the span and let the timeline show them.
    if (parts.length > 6) return n + " in " + parts.length + " groups of dates, from " + day(0) + " to " + day(obs.length - 1) + ". The timeline marks each group.";
    return n + " in " + parts.length + " groups: " + parts.join("; ") + ".";
  }

  // ---------- showing one image ----------

  function renderDetails(o) {
    el.statusGlyph.className = "glyph " + status(o).cls;
    el.statusLabel.textContent = status(o).label;
    var rows = [
      ["Status", status(o).label],
      ["Date", o.date],
      ["Modified Julian Date", o.mjd],
      ["Colour", hasWl(o) ? microns(o.wavelength_um) + " microns" : "None"],
      ["Detector", o.detector ? o.detector + " of 6" : "None"],
      ["Position (degrees)", "RA " + o.ra + ", Dec " + o.dec],
      ["IRSA observation ID", o.obs_id || "None"],
      ["Contamination flags", o.flags && o.flags.length ? o.flags.join("; ") : "None listed"]
    ];
    var frag = document.createDocumentFragment();
    rows.forEach(function (r) {
      var dt = document.createElement("dt"); dt.textContent = r[0];
      var dd = document.createElement("dd"); dd.textContent = r[1] === null || r[1] === undefined ? "None" : String(r[1]);
      frag.appendChild(dt); frag.appendChild(dd);
    });
    var dt = document.createElement("dt"); dt.textContent = "Permanent link";
    var dd = document.createElement("dd");
    if (o.view_link) {
      var a = document.createElement("a"); a.href = o.view_link; a.textContent = "Link to this image"; dd.appendChild(a);
    } else dd.textContent = "Not available yet";
    frag.appendChild(dt); frag.appendChild(dd);
    dt = document.createElement("dt"); dt.textContent = "At IRSA";
    dd = document.createElement("dd");
    if (o.irsa_link) {
      var b = document.createElement("a"); b.href = o.irsa_link; b.textContent = "Open this image at IRSA"; dd.appendChild(b);
    } else dd.textContent = "Not available yet";
    frag.appendChild(dt); frag.appendChild(dd);
    el.dl.replaceChildren(frag);
  }

  function hudStatus(o) {
    return '<span class="glyph glyph-xs ' + status(o).cls + '"></span>' + status(o).label;
  }
  function renderHud() {
    var o = obs[index];
    if (comparing) {
      var t = obs[thenIndex];
      el.hud.tl.textContent = "Then · " + t.date;
      el.hud.tr.textContent = "Now · " + o.date;
      el.hud.bl.textContent = hasWl(t) ? microns(t.wavelength_um) + " µm" : "No image";
      el.hud.br.textContent = hasWl(o) ? microns(o.wavelength_um) + " µm" : "No image";
    } else {
      el.hud.tl.textContent = "Image " + (index + 1) + " / " + obs.length;
      el.hud.tr.innerHTML = hudStatus(o);
      el.hud.bl.textContent = o.date;
      el.hud.br.textContent = hasWl(o) ? microns(o.wavelength_um) + " µm" : "";
    }
  }

  function compareText() {
    return "Comparing Then, " + shortLine(thenIndex) + ", with Now, " + shortLine(index) +
      ". These two images may be in different colours, so a brightness difference is not automatically a real change.";
  }

  // ---------- Mark as candidate ----------

  // view_link reopens this exact image on our site. The pipeline should write it; if a data
  // file leaves it out we build the same relative link here so every image has one.
  function withViewLink(o) {
    if (o.view_link || !o.obs_id || !targetId) return o;
    var copy = {}; for (var k in o) copy[k] = o[k];
    copy.view_link = "?target=" + encodeURIComponent(targetId) + "&obs=" + encodeURIComponent(o.obs_id);
    return copy;
  }

  function markable(o) { return o.status !== "no-observation"; }

  function renderMark(o) {
    var bits = ["Image " + (index + 1) + " of " + obs.length, o.date || "Date not available",
      hasWl(o) ? microns(o.wavelength_um) + " microns" : "Colour not available", status(o).label,
      (o.ra === null || o.ra === undefined) ? "Position not available" : "RA " + o.ra + ", Dec " + o.dec];
    el.markInfo.textContent = bits.join(" · ");
    var ok = markable(o);
    setDisabled(el.markBtn, !ok);
    el.markWhy.hidden = ok;
    el.markWhy.textContent = ok ? "" : "This date has no picture, so there is nothing to save.";
  }

  el.markBtn.addEventListener("click", function () {
    if (!obs.length) return;
    var o = obs[index];
    if (!markable(o)) { announce(el.markWhy.textContent); return; }
    var observation = {};
    CONTRACT_FIELDS.forEach(function (f) { observation[f] = o[f] === undefined ? null : o[f]; });
    var ev = new CustomEvent("selenites:mark-candidate", {
      cancelable: true,
      detail: { observation: observation, image_number: index + 1, image_count: obs.length }
    });
    document.dispatchEvent(ev);
    // The candidates module calls preventDefault() when it has handled the event, and
    // announces the result itself. If nothing answered, say so instead of failing silently.
    if (!ev.defaultPrevented) announce("My Candidates is not ready yet, so this image was not saved.");
    tell("marked", { saved: ev.defaultPrevented });
  });

  el.goto.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!obs.length) return;
    var n = Number(el.gotoN.value);
    if (!el.gotoN.value || !isFinite(n) || n !== Math.floor(n) || n < 1 || n > obs.length) {
      announce("Type a whole number from 1 to " + obs.length + ".");
      el.gotoN.setAttribute("aria-invalid", "true");
      return;
    }
    el.gotoN.removeAttribute("aria-invalid");
    stop();
    go(n - 1, "button");
  });

  var GLIDE = { pointer: 1, strip: 1, table: 1, button: 1, colour: 1, select: 1 };

  // Tells the page what the visitor just did in the viewer, so Selene's step guide (guide.js)
  // can move on to the next small part: "loaded", "cleared", "play", "pause", "move", "marked".
  function tell(action, extra) {
    var detail = { action: action, index: index, count: obs.length };
    if (extra) for (var k in extra) detail[k] = extra[k];
    document.dispatchEvent(new CustomEvent("selenites:viewer", { detail: detail }));
  }

  // source says what moved us. "play", "load" and "drag" stay quiet; the rest are announced.
  // Keyboard sources ("key", "colour-key") and playback never animate.
  function go(i, source) {
    if (!obs.length) return;
    index = clamp(i, 0, obs.length - 1);
    var o = obs[index];
    var glide = !!GLIDE[source];

    paintLayer(el.now, index, glide);
    el.desc.textContent = comparing ? compareText() : describe(index);

    timeline.set(index, glide);
    var posText = (index + 1) + " of " + obs.length + " · " + o.date;
    el.posOut.textContent = posText;
    if (source !== "colour" && source !== "colour-key" && hasWl(o)) {
      colour.set(Number(o.wavelength_um), glide);
      el.wlText.textContent = colourText(Number(o.wavelength_um));
    }
    renderDetails(o);
    renderHud();
    renderMark(o);

    var thumbs = el.strip.querySelectorAll(".v-thumb");
    for (var t = 0; t < thumbs.length; t++) {
      var on = t === index;
      thumbs[t].tabIndex = on ? 0 : -1;
      if (on) thumbs[t].setAttribute("aria-current", "true"); else thumbs[t].removeAttribute("aria-current");
    }
    revealThumb(glide);
    var rows = el.tbody.querySelectorAll("tr");
    for (var r = 0; r < rows.length; r++) rows[r].classList.toggle("is-current", r === index);
    // Follow the image in the table, except when the visitor picked it there (they can see it).
    if (source !== "table") revealRow(false);
    if (comparing) { el.nowSelect.value = String(index); el.compareText.textContent = compareText(); }

    setDisabled(el.first, index === 0);
    setDisabled(el.prev, index === 0);
    setDisabled(el.next, index === obs.length - 1);
    setDisabled(el.last, index === obs.length - 1);

    if (source === "colour" || source === "colour-key") announce(colourText(colour.get()));
    else if (source !== "play" && source !== "load" && source !== "drag") announce(comparing ? "Now: " + describe(index) : describe(index));
    if (source !== "load") tell("move", { source: source });
  }

  function setDisabled(btn, off) { btn.setAttribute("aria-disabled", off ? "true" : "false"); }

  // ---------- playback ----------

  function setPlaying(on) {
    el.play.classList.toggle("is-playing", on);
    el.playText.textContent = on ? "Pause" : "Play";
    el.stage.classList.toggle("is-playing", on);
    tell(on ? "play" : "pause");
  }
  function stop(message) {
    if (!timer) return;
    clearInterval(timer); timer = null;
    setPlaying(false);
    if (message) announce(message);
  }
  function play() {
    if (timer || obs.length < 2) return;
    if (index === obs.length - 1) go(0, "play");
    setPlaying(true);
    announce("Playing from image " + (index + 1) + ".");
    timer = setInterval(function () {
      go(index + 1, "play");
      if (index >= obs.length - 1) stop("Stopped at the last image. " + describe(index));
    }, Number(el.speed.value));
  }

  el.play.addEventListener("click", function () {
    if (timer) stop("Paused. " + describe(index));
    else play();
  });
  function step(fn) {
    return function () {
      if (this.getAttribute("aria-disabled") === "true") return;
      stop(); go(fn(), "button");
    };
  }
  el.first.addEventListener("click", step(function () { return 0; }));
  el.prev.addEventListener("click", step(function () { return index - 1; }));
  el.next.addEventListener("click", step(function () { return index + 1; }));
  el.last.addEventListener("click", step(function () { return obs.length - 1; }));
  el.speed.addEventListener("change", function () { if (timer) { stop(); play(); } });

  // ---------- Then and Now compare ----------

  function setComparing(on) {
    comparing = on;
    el.compare.setAttribute("aria-pressed", on ? "true" : "false");
    el.comparePanel.hidden = !on;
    el.then.hidden = !on;
    el.splitPos.hidden = !on;
    el.stage.classList.toggle("is-comparing", on);
    if (on) {
      if (thenIndex === index) thenIndex = index === 0 ? obs.length - 1 : 0;
      el.thenSelect.value = String(thenIndex);
      el.nowSelect.value = String(index);
      paintLayer(el.then, thenIndex, false);
      divider.set(split, false);
      el.stage.style.setProperty("--split", split + "%");
      el.compareText.textContent = compareText();
      el.desc.textContent = compareText();
      announce("Compare is on. " + compareText() + " Use the divider on the picture, or the arrow keys on it, to slide between them.");
    } else {
      el.then.replaceChildren();
      el.desc.textContent = describe(index);
      announce("Compare is off. " + describe(index));
    }
    renderHud();
  }
  el.compare.addEventListener("click", function () { stop(); setComparing(!comparing); });
  el.thenSelect.addEventListener("change", function () {
    thenIndex = Number(el.thenSelect.value);
    paintLayer(el.then, thenIndex, true);
    el.compareText.textContent = compareText();
    el.desc.textContent = compareText();
    renderHud();
    announce("Then: " + describe(thenIndex));
  });
  el.nowSelect.addEventListener("change", function () { stop(); go(Number(el.nowSelect.value), "select"); });

  // The divider only takes pointer input while comparing; otherwise clicks on the stage do nothing.
  el.stage.addEventListener("pointerdown", function (e) {
    if (!comparing) e.stopImmediatePropagation();
  }, true);

  el.overlay.addEventListener("click", function () {
    var on = el.overlay.getAttribute("aria-pressed") !== "true";
    el.overlay.setAttribute("aria-pressed", on ? "true" : "false");
    el.stage.classList.toggle("hide-overlay", !on);
  });

  // ---------- inspector tabs (WAI-ARIA tabs, automatic activation) ----------
  // One panel at a time keeps the screen calm. The ink bar slides to the chosen tab.
  var tabs = Array.prototype.slice.call(document.querySelectorAll('#v-tabs [role="tab"]'));
  var ink = document.querySelector("#v-tabs .tab-ink");
  function placeInk(tab, glide) {
    if (!tab || !tab.offsetWidth) return;
    ink.classList.toggle("is-instant", !glide || reduced());
    ink.style.transform = "translateX(" + tab.offsetLeft + "px) scaleX(" + tab.offsetWidth + ")";
  }
  function selectTab(tab, glide, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (tab.id === "tab-table") revealRow(false);
    placeInk(tab, glide);
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t, true, false); });
    t.addEventListener("keydown", function (e) {
      var j = null;
      if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = tabs.length - 1;
      if (j === null) return;
      e.preventDefault();
      selectTab(tabs[j], false, true);
    });
  });
  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      placeInk(tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0], false);
    }).observe($("v-tabs"));
  }

  // ---------- public ----------

  function acquire() {
    el.stage.classList.remove("is-acquiring");
    void el.stage.offsetWidth; // restart the animation
    el.stage.classList.add("is-acquiring");
  }

  window.SelenitesViewer = {
    stop: function () { stop(); },
    selectTab: function (name) { var t = $("tab-" + name); if (t) selectTab(t, true, false); },
    loading: function (label) {
      stop();
      el.stage.dataset.state = "loading";
      el.stage.setAttribute("aria-busy", "true");
      el.emptyText.textContent = "Loading " + label + "...";
    },
    load: function (d, opts) {
      stop();
      if (comparing) setComparing(false);
      d = fromPipeline(d);
      if (opts && opts.positionSource && !d.position_source) d.position_source = opts.positionSource;
      data = d;
      targetId = (opts && opts.id) || d.target || null;
      obs = (d.observations || []).map(withViewLink).sort(function (a, b) { return a.mjd - b.mjd; });
      index = 0; thenIndex = 0; split = 50;
      el.placeholder.hidden = !d.placeholder;
      el.summary.textContent = d.summary || "";
      buildTimeline();
      buildColourTrack();
      buildStrip();
      buildTable();
      buildSelects();
      el.chapters.textContent = chaptersLine();
      var moves = motionSummary();
      el.motion.textContent = moves;
      el.motionWrap.hidden = !moves;
      el.stage.dataset.state = "ready";
      el.stage.removeAttribute("aria-busy");
      el.viewer.hidden = false;
      el.inspector.hidden = false;
      el.stripSection.hidden = false;
      el.mark.hidden = false;
      el.gotoN.max = String(obs.length);
      el.gotoN.value = "";
      el.gotoN.removeAttribute("aria-invalid");
      el.gotoHelp.textContent = "Type a number from 1 to " + obs.length + ", then press Enter.";
      el.stripScroll.scrollLeft = 0;
      go(0, "load");
      selectTab(tabs[0], false, false);
      acquire();
      announce("Loaded " + d.name + ". " + chaptersLine() + (moves ? " " + moves : "") + " " + describe(0));
      tell("loaded", { target: targetId });
    },
    clear: function (text) {
      stop();
      if (comparing) setComparing(false);
      data = null; obs = [];
      el.now.replaceChildren();
      el.stage.dataset.state = "empty";
      el.stage.removeAttribute("aria-busy");
      el.emptyText.textContent = text || "Pick an example to point the viewer at a patch of sky.";
      el.hud.tl.textContent = el.hud.tr.textContent = el.hud.bl.textContent = el.hud.br.textContent = "";
      el.placeholder.hidden = true;
      el.summary.textContent = "";
      el.chapters.textContent = "";
      el.motion.textContent = "";
      el.motionWrap.hidden = true;
      el.desc.textContent = "";
      el.viewer.hidden = true;
      el.inspector.hidden = true;
      el.stripSection.hidden = true;
      el.mark.hidden = true;
      targetId = null;
      tell("cleared");
    },
    // Opens one saved image by its obs_id (used by ?obs= links). Never falls back to a
    // different image: if it is missing, it says so and returns false.
    openObs: function (obsId) {
      for (var i = 0; i < obs.length; i++) {
        if (obs[i].obs_id === obsId) { go(i, "button"); return true; }
      }
      return false;
    }
  };
})();
