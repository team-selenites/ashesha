// Your Beginnings: The First Light, in four short steps with Selene as the guide.
//   1 Your day       a birthday (day and month only), then a year if SPHEREx saw it twice
//   2 SPHEREx's ring replay the day: each picture lands on a whole-sky map, building a ring
//                    about 90 degrees from the Sun
//   3 Who it met     the Messier objects whose positions sat inside that day's pictures;
//                    each one met joins a collection kept in this browser
//   4 Your card      a keepsake drawn on a canvas in the theme's colours, to save as a picture
// One step is on screen at a time, each with its own address (#day, #ring, #meet, #card), and
// nothing moves on by itself. Selene's tip on each step says what to do now (js/guide.js reads
// window.SELENITES_GUIDE below to know which part to show).
//
// Everything shown comes from data files built by tools/make_beginnings.py:
//   data/beginnings/index.json             dates, releases, the 110 Messier objects
//   data/beginnings/days/YYYY-MM-DD.json   one observed day each (format: docs/beginnings-data.md)
// The birthday is never saved or sent: the page only opens that day's file from this site.
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  root.classList.add("has-views");
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(motionQuery && motionQuery.matches); }
  function announce(text) { var l = $("bg-live"); l.textContent = ""; setTimeout(function () { l.textContent = text; }, 30); }
  function svg(tag, attrs, parent) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function fetchJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); });
  }
  function progress(id) { document.dispatchEvent(new CustomEvent("beginnings:progress", { detail: { id: id } })); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function setText(cls, text) { document.querySelectorAll("." + cls).forEach(function (el) { el.textContent = text; }); }

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];   // February keeps 29: leap birthdays exist
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtDate(iso) { var p = iso.split("-"); return +p[2] + " " + MONTHS[+p[1] - 1] + " " + p[0]; }
  function fmtMD(md) { var p = md.split("-"); return +p[1] + " " + MONTHS[+p[0] - 1]; }
  function fmtTime(min) { return pad(Math.floor(min / 60)) + ":" + pad(min % 60) + " UTC"; }
  function an(w) { return (/^[aeiou]/i.test(w) ? "an " : "a ") + w; }
  function listWords(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }

  // ---------- State ----------
  var idx = null;                 // index.json
  var info = {};                  // Messier number -> index entry
  var dayCache = {};              // date -> day file (loaded once)
  var chosen = null, day = null;  // the chosen date and its day file
  var shown = null;               // the Messier number on the sheet
  var ringDone = false;

  // ---------- Selene's tips: which part of each step she is on ----------
  var guideState = { day: "d-pick", ring: "r-none", meet: "m-none", card: "c-none" };
  var VOICE_KEY = "selenites-selene-voice", voiceOn = false;
  try { voiceOn = localStorage.getItem(VOICE_KEY) === "on"; } catch (e) {}
  window.SELENITES_GUIDE = {
    state: function (view) { return guideState[view] || ""; },
    // While Selene asks for something, that control has a still ring (css/beginnings.css).
    nudge: { "d-pick": "bd-fields", "d-year": "bd-stubs", "d-leap": "bd-stubs", "d-ready": "guide-next",
      "r-none": "guide-next", "r-play": "ring-play", "r-done": "guide-next",
      "m-none": "guide-next", "m-meet": "meet-others", "m-one": "guide-next", "m-more": "guide-next", "m-empty": "meet-near",
      "c-none": "guide-next", "c-card": "card-save", "c-saved": "guide-next" },
    voice: function () { return voiceOn; }
  };
  function setGuide(view, state, quiet) {
    if (guideState[view] === state) return;
    guideState[view] = state;
    document.dispatchEvent(new CustomEvent("selenites:guide", { detail: { quiet: !!quiet } }));
  }
  function showVoice() {
    document.querySelectorAll(".guide-voice").forEach(function (b) {
      b.setAttribute("aria-pressed", voiceOn ? "true" : "false");
      b.title = voiceOn ? "Selene's voice is on" : "Selene's voice is off";
    });
  }
  showVoice();
  if (!("speechSynthesis" in window)) document.querySelectorAll(".guide-voice").forEach(function (b) { b.hidden = true; });
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".guide-voice") : null;
    if (!b) return;
    voiceOn = !voiceOn;
    try { localStorage.setItem(VOICE_KEY, voiceOn ? "on" : "off"); } catch (err) {}
    showVoice();
    document.querySelectorAll(".guide-selene").forEach(function (s) { if (s._selene) s._selene.stop(); });
    if (voiceOn) document.dispatchEvent(new CustomEvent("selenites:guide"));
  });

  // ---------- Steps: one screen at a time ----------
  var VIEWS = ["day", "ring", "meet", "card"];
  var TITLES = { day: "Your day", ring: "SPHEREx's ring", meet: "Who it met", card: "Your card" };
  var SITE_TITLE = "Your Beginnings · Ashesha";
  var viewEls = document.querySelectorAll("main > .view");
  var stepLinks = document.querySelectorAll("#steps a[data-view]");
  var currentView = null;

  function showView(name, opts) {
    opts = opts || {};
    if (VIEWS.indexOf(name) < 0) name = "day";
    var changed = name !== currentView;
    if (changed) stopPlay();
    currentView = name;
    for (var i = 0; i < viewEls.length; i++) viewEls[i].hidden = viewEls[i].dataset.view !== name;
    for (var j = 0; j < stepLinks.length; j++) {
      if (stepLinks[j].dataset.view === name) stepLinks[j].setAttribute("aria-current", "step");
      else stepLinks[j].removeAttribute("aria-current");
    }
    root.setAttribute("data-view", name);
    document.title = TITLES[name] + " · " + SITE_TITLE;
    if (opts.history) {
      try {
        var url = window.location.pathname + window.location.search + "#" + name;
        if (opts.history === "push" && changed) window.history.pushState({ view: name }, "", url);
        else window.history.replaceState({ view: name }, "", url);
      } catch (e) {}
    }
    if (changed && opts.focus !== false) {
      window.scrollTo(0, 0);
      var h = document.querySelector('main > .view[data-view="' + name + '"] .view-title');
      if (h) h.focus({ preventScroll: true });
    }
    if (changed) {
      if (name === "meet") renderMeet();
      if (name === "card") drawCard();
      document.dispatchEvent(new CustomEvent("selenites:view", { detail: { view: name } }));
    }
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[data-view]") : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    showView(a.dataset.view, { history: "push" });
  });
  function fromAddress() { var h = window.location.hash.replace(/^#/, ""); if (VIEWS.indexOf(h) >= 0) showView(h); }
  window.addEventListener("popstate", fromAddress);
  window.addEventListener("hashchange", fromAddress);

  // Selene's tour (the page's tour config) opens steps itself and reads the day from here.
  window.BeginningsApp = {
    showView: function (v) { showView(v, { history: "replace", focus: false }); },
    heading: function () { return document.querySelector("main > .view:not([hidden]) .view-title"); },
    dateText: function () { return chosen ? fmtDate(chosen) : "your day"; },
    others: function () { return day ? Math.max(0, day.messier.length - 1) : 0; }
  };

  // ---------- The sky map: whole sky in ecliptic coordinates ----------
  // The ecliptic (the Sun's yearly path) runs across the middle, so the Sun always sits on that
  // line and the ring of pictures stands upright about 90 degrees either side of it. Hammer
  // projection (equal-area, like a world map); longitude grows to the left, as on star charts.
  var RAD = Math.PI / 180, EPS = 23.4393 * RAD;
  var MW = 1000, MH = 520, CX = 500, CY = 262, RX = 476, RY = 238, LON0 = 180;
  function toEcl(ra, dec) {
    var a = ra * RAD, d = dec * RAD;
    var b = Math.asin(Math.sin(d) * Math.cos(EPS) - Math.cos(d) * Math.sin(EPS) * Math.sin(a));
    var l = Math.atan2(Math.sin(a) * Math.cos(EPS) + Math.tan(d) * Math.sin(EPS), Math.cos(a));
    return [((l / RAD) % 360 + 360) % 360, b / RAD];
  }
  function proj(lon, lat) {
    var l = (((lon - LON0) % 360 + 540) % 360 - 180) * -RAD, b = lat * RAD;
    var den = Math.sqrt(1 + Math.cos(b) * Math.cos(l / 2));
    var x = 2 * Math.SQRT2 * Math.cos(b) * Math.sin(l / 2) / den, y = Math.SQRT2 * Math.sin(b) / den;
    return [CX + x * RX / (2 * Math.SQRT2), CY - y * RY / Math.SQRT2];
  }
  function line(points) {
    // Break the line where it jumps across the map's edge.
    var d = "", last = null;
    points.forEach(function (p) {
      var xy = proj(p[0], p[1]);
      d += (last && Math.abs(xy[0] - last[0]) < MW / 3 ? "L" : "M") + xy[0].toFixed(1) + " " + xy[1].toFixed(1);
      last = xy;
    });
    return d;
  }
  function meridian(lon) { var p = []; for (var b = -90; b <= 90; b += 3) p.push([lon, b]); return line(p); }
  function parallel(lat) { var p = []; for (var l = 0; l <= 360; l += 3) p.push([LON0 + 180 - l + 0.001, lat]); return line(p); }

  // The Sun's ecliptic longitude on a date (low-precision formula from the Astronomical
  // Almanac, good to about 0.01 degrees), for the month marks along the Sun's path.
  function sunLon(y, m, d) {
    var jd = Date.UTC(y, m - 1, d, 12) / 864e5 + 2440587.5, n = jd - 2451545;
    var L = 280.46 + 0.9856474 * n, g = (357.528 + 0.9856003 * n) * RAD;
    return ((L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360 + 360) % 360;
  }

  function drawBase(map) {
    // Clear the drawing but keep the map's <title> and <desc> (its words for screen readers).
    Array.prototype.slice.call(map.childNodes).forEach(function (n) {
      if (n.nodeName !== "title" && n.nodeName !== "desc") map.removeChild(n);
    });
    var defs = svg("defs", {}, map);
    var clipId = map.id + "-clip";
    var cp = svg("clipPath", { id: clipId }, defs);
    svg("ellipse", { cx: CX, cy: CY, rx: RX, ry: RY }, cp);
    svg("ellipse", { class: "map-sky", cx: CX, cy: CY, rx: RX, ry: RY }, map);
    var g = svg("g", { "clip-path": "url(#" + clipId + ")" }, map);
    var grid = svg("g", { class: "map-grid" }, g);
    [-60, -30, 30, 60].forEach(function (b) { svg("path", { d: parallel(b) }, grid); });
    for (var l = 0; l < 360; l += 30) svg("path", { d: meridian(l) }, grid);
    svg("path", { class: "map-ecliptic", d: parallel(0) }, g);
    // Where the Sun stands in each month (the middle of the month, 2025).
    var months = svg("g", { class: "map-months" }, g);
    for (var m = 1; m <= 12; m++) {
      var xy = proj(sunLon(2025, m, 15), 0);
      svg("path", { class: "map-tick", d: "M" + xy[0].toFixed(1) + " " + (xy[1] - 6) + "v12" }, months);
      var t = svg("text", { x: xy[0].toFixed(1), y: (xy[1] + 28).toFixed(1), "text-anchor": "middle" }, months);
      t.textContent = MONTHS[m - 1].slice(0, 3);
    }
    var layers = { g: g };
    layers.ninety = svg("g", { class: "map-ninety" }, g);
    layers.far = svg("g", { class: "map-far" }, g);
    layers.pts = svg("g", { class: "map-pts" }, g);
    layers.sun = svg("g", { class: "map-sun" }, g);
    layers.now = svg("g", { class: "map-now" }, g);
    layers.spark = svg("g", { class: "map-sparks" }, g);
    svg("ellipse", { class: "map-edge", cx: CX, cy: CY, rx: RX, ry: RY }, map);
    var lab = svg("text", { class: "map-path-label", x: CX - RX + 18, y: CY - 10 }, map);
    lab.textContent = "the Sun's path";
    return layers;
  }
  function drawSun(layers, d) {
    var e = toEcl(d.sun.ra, d.sun.dec), xy = proj(e[0], e[1]);
    layers.sun.innerHTML = "";
    svg("circle", { class: "sun-glow", cx: xy[0], cy: xy[1], r: 22, filter: "url(#bg-glow)" }, layers.sun);
    svg("circle", { class: "sun-disc", cx: xy[0], cy: xy[1], r: 13 }, layers.sun);
    var t = svg("text", { class: "sun-label", x: xy[0], y: xy[1] - 24, "text-anchor": "middle" }, layers.sun);
    t.textContent = "Sun";
    return e[0];
  }
  function drawNinety(layers, sunL) {
    layers.ninety.innerHTML = "";
    [sunL + 90, sunL - 90].forEach(function (l) { svg("path", { d: meridian(l) }, layers.ninety); });
    // Label the line nearer the middle, on its inner side, low down where the map is wide,
    // so the words never run off the edge of the sky.
    var a = proj(sunL + 90, -40), b = proj(sunL - 90, -40), at = Math.abs(a[0] - CX) < Math.abs(b[0] - CX) ? a : b;
    var inner = at[0] > CX;
    var t = svg("text", { x: at[0] + (inner ? -14 : 14), y: at[1], "text-anchor": inner ? "end" : "start", class: "ninety-label" }, layers.ninety);
    t.textContent = "90° from the Sun";
  }
  function drawPoints(layers, d) {
    layers.pts.innerHTML = "";
    var els = [];
    d.pointings.forEach(function (p) {
      var e = toEcl(p[0], p[1]), xy = proj(e[0], e[1]);
      els.push(svg("circle", { class: "pt", cx: xy[0].toFixed(1), cy: xy[1].toFixed(1), r: 4.4 }, layers.pts));
    });
    return els;
  }
  function sparkAt(parent, lon, lat, size, cls) {
    var xy = proj(lon, lat);
    return svg("use", { href: "#bg-spark", x: xy[0] - size / 2, y: xy[1] - size / 2, width: size, height: size, class: cls || "" }, parent);
  }

  // ---------- Step 1: the birthday ----------
  var monthSel = $("bd-month"), daySel = $("bd-day"), stubs = $("bd-stubs"), years = $("bd-years");
  MONTHS.forEach(function (m, i) { var o = document.createElement("option"); o.value = pad(i + 1); o.textContent = m; monthSel.appendChild(o); });
  function fillDays() {
    var keep = daySel.value, m = +monthSel.value;
    // Selene's ring moves from Month to Day once a month is chosen (css/beginnings.css).
    document.querySelector(".bd-fields").classList.toggle("has-month", !!m);
    daySel.innerHTML = '<option value="">Choose a day</option>';
    daySel.disabled = !m;
    if (!m) return;
    for (var d = 1; d <= MONTH_DAYS[m - 1]; d++) { var o = document.createElement("option"); o.value = pad(d); o.textContent = d; daySel.appendChild(o); }
    if (keep && +keep <= MONTH_DAYS[m - 1]) daySel.value = keep;
  }
  function summary(date) { var s = idx && idx.days && idx.days[date]; return s ? { n: s[0], m: s[1] } : null; }
  function stubWords(date) {
    var s = summary(date);
    if (!s) return "";
    return plural(s.n, "picture", "pictures") + " · " + (s.m ? plural(s.m, "famous object", "famous objects") : "no famous objects");
  }
  function renderStubs(dates, legend) {
    $("bd-years-legend").textContent = legend;
    stubs.innerHTML = "";
    dates.forEach(function (date) {
      var p = date.split("-");
      var lab = document.createElement("label");
      lab.className = "bd-stub";
      lab.innerHTML = '<input type="radio" name="bd-year" value="' + date + '">' +
        '<span class="stub-y">' + p[0] + "</span>" +
        '<span class="stub-d">' + fmtMD(p[1] + "-" + p[2]) + "</span>" +
        '<span class="stub-n">' + stubWords(date) + "</span>";
      lab.querySelector("input").addEventListener("change", function () { choose(date); });
      stubs.appendChild(lab);
    });
    years.hidden = !dates.length;
  }
  function stubsFor(md) {
    var dates = idx.calendar[md] || [];
    renderStubs(dates, dates.length > 1 ? "SPHEREx saw this date twice. Which year?" : "Your day");
  }
  function onDate() {
    var m = monthSel.value, d = daySel.value;
    chooseToken++;   // a new date cancels any day file still on its way
    if (!m || !d || !idx) return;
    var md = m + "-" + d;
    $("bd-moon-date").textContent = fmtMD(md);
    setText("g-md", fmtMD(md));
    var dates = idx.calendar[md] || [];
    chosen = null; day = null;
    if (md === "02-29") {
      var near = (idx.calendar["02-28"] || []).concat(idx.calendar["03-01"] || []);
      renderStubs(near, "No 29 February yet. Choose a day beside it:");
      $("bd-status").textContent = "";
      resetLater();
      setGuide("day", "d-leap");
      return;
    }
    if (!dates.length) {
      renderStubs([], "");
      $("bd-status").textContent = "SPHEREx has no pictures for " + fmtMD(md) + " yet.";
      resetLater();
      setGuide("day", "d-pick");
      return;
    }
    if (dates.length === 1) {
      renderStubs(dates, "Your day");
      stubs.querySelector("input").checked = true;
      choose(dates[0]);
      return;
    }
    renderStubs(dates, "SPHEREx saw this date twice. Which year?");
    $("bd-status").textContent = "";
    resetLater();
    setGuide("day", "d-year");
  }
  monthSel.addEventListener("change", function () { fillDays(); onDate(); });
  daySel.addEventListener("change", onDate);
  $("bd-surprise").addEventListener("click", function () {
    if (!idx) return;
    var keys = Object.keys(idx.calendar);
    var k = keys[Math.floor(Math.random() * keys.length)].split("-");
    monthSel.value = k[0]; fillDays(); daySel.value = k[1];
    onDate();
    var pick = stubs.querySelector("input:not(:checked)");
    if (pick && !chosen) { pick.checked = true; choose(pick.value); }
  });

  function resetLater() {
    ringDone = false; shown = null;
    setGuide("ring", "r-none", true); setGuide("meet", "m-none", true); setGuide("card", "c-none", true);
  }

  function loadDay(date) {
    if (dayCache[date]) return Promise.resolve(dayCache[date]);
    return fetchJSON("data/beginnings/days/" + date + ".json").then(function (d) { dayCache[date] = d; return d; });
  }

  // Only the latest choice may finish: a slow file for an earlier date must not overwrite it.
  var chooseToken = 0;
  function choose(date) {
    var my = ++chooseToken;
    $("bd-status").textContent = "Opening " + fmtDate(date) + "…";
    return loadDay(date).then(function (d) {
      if (my !== chooseToken) return;
      chosen = date; day = d; ringDone = false; shown = null;
      setText("g-date", fmtDate(date));
      setText("g-count", String(d.exposures));
      $("bd-status").textContent = fmtDate(date) + ": " + stubWords(date) + ". Press Next to watch it.";
      stubs.querySelectorAll("input").forEach(function (i) { i.checked = i.value === date; });
      prepareRing();
      setGuide("day", "d-ready");
      setGuide("ring", "r-play", true);
      setGuide("meet", d.messier.length === 0 ? "m-empty" : d.messier.length === 1 ? "m-one" : "m-meet", true);
      setGuide("card", "c-card", true);
      progress("picked");
    }).catch(function () {
      if (my !== chooseToken) return;
      $("bd-status").textContent = "That day's pictures could not be loaded. If you opened this file straight from your computer, please open it through a web server instead.";
    });
  }

  // ---------- Step 2: replay the day ----------
  var ringMap = $("ring-map"), scrub = $("ring-scrub"), playBtn = $("ring-play");
  var ring = null, ptEls = [], shownN = 0, sunL = 0;
  function prepareRing() {
    ring = drawBase(ringMap);
    sunL = drawSun(ring, day);
    ptEls = drawPoints(ring, day);
    shownN = 0;
    scrub.max = String(day.pointings.length);
    scrub.value = "0";
    setShown(0);
    $("ring-when").textContent = fmtDate(chosen);
    $("ring-map-d").textContent = "A map of the whole sky with the Sun's path across the middle. On " + fmtDate(chosen) + " the Sun sits on that path, and the " +
      day.exposures + " pictures SPHEREx took that day, shown as dots, form a ring through the top and bottom of the sky, about 90 degrees either side of the Sun.";
    var rel = day.releases.map(function (r) { return "SPHEREx " + r.release + (r.doi ? " (DOI " + r.doi + ")" : ""); });
    $("ring-data-note").textContent = "Dots are the centres of the pictures from detector 2; each picture covers about 3.5 by 11 degrees with all six detectors. Data: " + listWords(rel) + ", NASA/IPAC IRSA.";
  }
  function setShown(n) {
    if (!day) return;
    n = Math.max(0, Math.min(n, ptEls.length));
    var a = Math.min(n, shownN), b = Math.max(n, shownN), on = n > shownN;
    for (var i = a; i < b; i++) ptEls[i].classList.toggle("is-on", on);
    shownN = n;
    // The newest picture glows: "SPHEREx is looking here now".
    ring.now.innerHTML = "";
    if (n > 0 && n < ptEls.length) {
      var p = ptEls[n - 1];
      svg("circle", { class: "now-glow", cx: p.getAttribute("cx"), cy: p.getAttribute("cy"), r: 16, filter: "url(#bg-glow)" }, ring.now);
      svg("circle", { class: "now-ring", cx: p.getAttribute("cx"), cy: p.getAttribute("cy"), r: 10 }, ring.now);
    }
    var total = ptEls.length, time = n ? fmtTime(day.pointings[n - 1][2]) : "00:00 UTC";
    var words = time + " · " + n + " of " + total + " pictures";
    $("ring-readout").textContent = words;
    scrub.setAttribute("aria-valuetext", words);
    if (+scrub.value !== n) scrub.value = String(n);
    if (n === total && !ringDone) finishRing();
  }
  function finishRing() {
    ringDone = true;
    drawNinety(ring, sunL);
    ringMap.classList.add("is-full");
    announce("The day is complete: " + ptEls.length + " pictures, in a ring about 90 degrees from the Sun.");
    setGuide("ring", "r-done");
    progress("ring-full");
  }
  scrub.addEventListener("input", function () { stopPlay(); setShown(+scrub.value); });

  var playing = null;
  function setPlaying(on) {
    playBtn.classList.toggle("is-playing", on);
    playBtn.querySelector("span").textContent = on ? "Pause" : shownN >= ptEls.length && ptEls.length ? "Play it again" : "Play the day";
  }
  function stopPlay() { if (playing) { cancelAnimationFrame(playing); playing = null; } if (playBtn) setPlaying(false); }
  playBtn.addEventListener("click", function () {
    if (!day) { showView("day", { history: "push" }); return; }
    if (playing) { stopPlay(); return; }
    var total = ptEls.length;
    if (shownN >= total) setShown(0);
    if (reduced()) { setShown(total); setPlaying(false); return; }
    // About 7 seconds for the whole day, whatever is left of it.
    var from = shownN, t0 = null, dur = 7000 * (total - from) / total;
    setPlaying(true);
    (function tick(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      setShown(Math.round(from + (total - from) * k));
      if (k < 1) playing = requestAnimationFrame(tick);
      else { playing = null; setPlaying(false); }
    })(performance.now());
  });

  // ---------- Step 3: who it met ----------
  var MET_KEY = "selenites-messier-met";
  var met = [];
  try { met = JSON.parse(localStorage.getItem(MET_KEY) || "[]"); if (!Array.isArray(met)) met = []; } catch (e) { met = []; }
  function saveMet() { try { localStorage.setItem(MET_KEY, JSON.stringify(met)); } catch (e) {} }
  function nameOf(n) { var m = info[n]; return m ? (m.name || m.label) : "M " + n; }
  function fullName(n) { var m = info[n]; return m && m.name ? m.name + " (" + m.label + ")" : "M " + n; }
  // The headline: a named, real object first, then the one pictured most often.
  function headline(d) {
    var list = d.messier.slice().sort(function (a, b) {
      var A = info[a.messier] || {}, B = info[b.messier] || {};
      return (B.headline_ok ? 2 : 0) + (B.name ? 1 : 0) - (A.headline_ok ? 2 : 0) - (A.name ? 1 : 0) || b.images - a.images;
    });
    return list.length ? list[0].messier : null;
  }
  var meetMap = $("meet-map"), meetLayers = null, meetFor = null;
  function renderMeet() {
    if (!day || meetFor === chosen) { if (day) updateCollection(); return; }
    meetFor = chosen;
    meetLayers = drawBase(meetMap);
    drawSun(meetLayers, day);
    drawPoints(meetLayers, day).forEach(function (el) { el.classList.add("is-on", "is-quiet"); });
    // The rest of the 110, faint, so you can see the ring "catching" some of them.
    var today = {};
    day.messier.forEach(function (o) { today[o.messier] = true; });
    idx.messier.forEach(function (m) {
      if (today[m.messier]) return;
      var e = toEcl(m.ra, m.dec), xy = proj(e[0], e[1]);
      svg("circle", { class: "far-dot", cx: xy[0].toFixed(1), cy: xy[1].toFixed(1), r: 3.2 }, meetLayers.far);
    });
    day.messier.forEach(function (o) {
      var m = info[o.messier], e = toEcl(m.ra, m.dec);
      var s = sparkAt(meetLayers.spark, e[0], e[1], 26, "spark");
      s.dataset.n = o.messier;
      s.addEventListener("click", function () { pick(o.messier, true); });
    });
    var others = $("meet-others");
    others.innerHTML = "";
    $("meet-others-box").hidden = !day.messier.length;
    $("meet-empty").hidden = !!day.messier.length;
    $("meet-sheet").hidden = !day.messier.length;
    $("meet-others-h").textContent = day.messier.length > 1 ? "In that day's pictures: " + day.messier.length + " famous objects" : "In that day's pictures";
    day.messier.slice().sort(function (a, b) { return a.messier - b.messier; }).forEach(function (o) {
      var m = info[o.messier], li = document.createElement("li");
      li.innerHTML = '<button type="button" class="meet-pick" data-n="' + o.messier + '" aria-pressed="false">' +
        '<svg class="meet-pick-ic" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><use href="#bg-spark" width="20" height="20"/></svg>' +
        '<span class="meet-pick-name">' + (m.name || m.label) + "</span>" +
        '<span class="meet-pick-meta">' + (m.name ? m.label + " · " : "") + (m.kind || "type uncertain") + " · " + plural(o.images, "picture", "pictures") + "</span></button>";
      li.querySelector("button").addEventListener("click", function () { pick(o.messier, true); });
      others.appendChild(li);
    });
    $("meet-map-d").textContent = day.messier.length
      ? "The same whole-sky map. Sparkles mark the " + plural(day.messier.length, "famous object", "famous objects") + " inside that day's pictures: " +
        listWords(day.messier.map(function (o) { return fullName(o.messier); })) + ". Faint dots are the rest of Messier's 110."
      : "The same whole-sky map. None of Messier's 110 objects sat inside that day's pictures.";
    if (!day.messier.length) renderNearest();
    var h = headline(day);
    setText("g-mcount", plural(day.messier.length, "famous object", "famous objects"));
    setText("g-head", h ? fullName(h) : "");
    if (h) pick(h, false);
    updateCollection();
  }
  function pick(n, byVisitor) {
    var o = day.messier.filter(function (x) { return x.messier === n; })[0], m = info[n];
    if (!o || !m) return;
    var first = shown === null;
    shown = n;
    $("meet-kicker").textContent = m.label + (m.kind ? " · " + m.kind : "");
    $("meet-name").textContent = m.name || m.label;
    $("meet-what").textContent = (m.kind ? an(m.kind).replace(/^a/, "A") + ". " : "") + "SIMBAD lists its type as " + (m.simbad_type || "unknown") + ".";
    var dets = o.detectors.length === 6 ? "all six detectors" : (o.detectors.length === 1 ? "detector " : "detectors ") + listWords(o.detectors.map(String));
    var t = o.example && o.example.time_utc ? o.example.time_utc.slice(11, 16) + " UTC" : "";
    $("meet-seen").textContent = "On " + fmtDate(chosen) + ", SPHEREx pictured the spot where it sits " + plural(o.images, "time", "times") +
      (t ? ", first at " + t : "") + ", with " + dets + ", in colours from " + o.wavelength_um[0].toFixed(2) + " to " + o.wavelength_um[1].toFixed(2) + " microns.";
    $("meet-honest").textContent = "Being in a picture means SPHEREx looked right at it. It doesn't mean it shows up brightly there." +
      (m.headline_ok ? "" : " SIMBAD isn't sure what this one is, so treat it as a curiosity.");
    document.querySelectorAll(".meet-pick").forEach(function (b) { b.setAttribute("aria-pressed", +b.dataset.n === n ? "true" : "false"); });
    // Selene's ring suggests one name to try next: one not met yet if there is one.
    var picks = Array.prototype.slice.call(document.querySelectorAll('.meet-pick[aria-pressed="false"]'));
    var next = picks.filter(function (b) { return met.indexOf(+b.dataset.n) < 0; })[0] || picks[0];
    document.querySelectorAll(".meet-pick").forEach(function (b) { b.classList.toggle("is-suggested", b === next); });
    if (meetLayers) meetLayers.spark.querySelectorAll("use").forEach(function (u) { u.classList.toggle("is-picked", +u.dataset.n === n); });
    drawLabel(n);
    var isNew = met.indexOf(n) < 0;
    if (isNew) { met.push(n); saveMet(); }
    updateCollection(isNew ? n : null);
    if (byVisitor) {
      announce("Meet " + fullName(n) + (isNew ? ". New in your collection." : "."));
      if (n !== headline(day) && guideState.meet === "m-meet") { setGuide("meet", "m-more"); progress("met"); }
      else if (guideState.meet === "m-more") document.dispatchEvent(new CustomEvent("selenites:guide", { detail: { quiet: true } }));
    } else if (!first) announce("Meet " + fullName(n) + ".");
  }
  function drawLabel(n) {
    if (!meetLayers) return;
    var old = meetLayers.g.querySelector(".spark-label");
    if (old) old.remove();
    var m = info[n], e = toEcl(m.ra, m.dec), xy = proj(e[0], e[1]);
    var right = xy[0] < CX + RX * 0.55;
    var t = svg("text", { class: "spark-label", x: xy[0] + (right ? 20 : -20), y: xy[1] + 6, "text-anchor": right ? "start" : "end" }, meetLayers.g);
    t.textContent = m.name || m.label;
  }
  function renderNearest() {
    var all = Object.keys(idx.days).sort(), i = all.indexOf(chosen), before = null, after = null;
    for (var a = i - 1; a >= 0 && !before; a--) if (idx.days[all[a]][1] > 0) before = all[a];
    for (var b = i + 1; b < all.length && !after; b++) if (idx.days[all[b]][1] > 0) after = all[b];
    $("meet-empty-text").textContent = "None of Messier's 110 objects sat inside SPHEREx's pictures on " + fmtDate(chosen) + ".";
    var box = $("meet-near");
    box.innerHTML = "";
    [before, after].forEach(function (date) {
      if (!date) return;
      var b = document.createElement("button");
      b.type = "button"; b.className = "btn btn-quiet";
      b.textContent = "Look at " + fmtDate(date) + " instead (" + plural(idx.days[date][1], "famous object", "famous objects") + ")";
      b.addEventListener("click", function () {
        var p = date.split("-");
        monthSel.value = p[1]; fillDays(); daySel.value = p[2];
        $("bd-moon-date").textContent = fmtMD(p[1] + "-" + p[2]);
        setText("g-md", fmtMD(p[1] + "-" + p[2]));
        stubsFor(p[1] + "-" + p[2]);
        choose(date).then(function () { renderMeet(); $("meet-h").focus(); });
      });
      box.appendChild(b);
    });
  }
  function updateCollection(fresh) {
    var dots = $("collect-dots");
    if (!dots.childElementCount) for (var i = 1; i <= 110; i++) { var s = document.createElement("i"); s.dataset.n = i; dots.appendChild(s); }
    dots.querySelectorAll("i").forEach(function (s) {
      var n = +s.dataset.n;
      s.classList.toggle("is-met", met.indexOf(n) >= 0);
      s.classList.toggle("is-fresh", n === fresh);
      s.classList.toggle("is-today", !!day && day.messier.some(function (o) { return o.messier === n; }));
    });
    var c = met.length;
    $("collect-count").textContent = "Your collection: " + c + " of 110 Messier objects met.";
    $("collect-hint").textContent = c >= 110 ? "All 110! Charles Messier would be proud." : "Try a friend's birthday to meet more. It's kept in this browser only, and nothing expires.";
    setText("g-met", c + " of the 110");
    $("collect-reset").hidden = !c;
  }
  var resetArmed = false;
  $("collect-reset").addEventListener("click", function () {
    if (!resetArmed) { resetArmed = true; this.textContent = "Press again to clear your collection"; return; }
    resetArmed = false; this.textContent = "Start my collection again";
    met = []; saveMet(); updateCollection(); announce("Your collection is empty again.");
  });
  $("collect-reset").addEventListener("blur", function () { if (resetArmed) { resetArmed = false; this.textContent = "Start my collection again"; } });

  // ---------- Step 4: the card ----------
  // A story-shaped keepsake (1080 x 1920: the size phones share full screen; nothing that matters
  // sits in the top or bottom 220 px, where Instagram and WhatsApp draw their own buttons). Built
  // from what makes cards worth sharing: one hero picture, the date as the headline, the
  // visitor's own name if they want it, their choice of colours, and a quiet credit.
  //
  // The hero is a "halo chart": the whole sky drawn around the Sun (Lambert equal-area,
  // centred on the Sun, ecliptic north up, east to the left as on star charts). SPHEREx always
  // looks about 90 degrees from the Sun, so a day of its pictures forms a ring around it.
  // Inside the chart there is only real data; the scrapbook dressing stays outside it.
  var canvas = $("card-canvas");
  // The card is a scrapbook keepsake, shabby chic with a little Y2K, made from the same pieces
  // as the Meet the Selenites cards on the home page (css/home.css): paper a shade off the page
  // with a scalloped edge, a faint grain and a blush in one corner, a sewn stitch, a taped
  // polaroid with a holographic rim, sparkle stickers and a marker squiggle. The polaroid is
  // always a night sky, so the halo of pictures glows in every colour set.
  var HOLO = ["#FFC6EA", "#C3EEFF", "#E0CFFF", "#FFF0BC"];
  var SKY = { a: "#07060C", b: "#171130", haze: "rgba(150, 120, 230, 0.32)", dot: "#F4F1FA", faint: "rgba(236, 233, 241, 0.32)", edge: "rgba(236, 233, 241, 0.22)" };
  var STYLES = {
    night: { name: "Night", page: "#0B0A0E", paper: "#1D1924", blush: "rgba(242, 167, 211, 0.10)", ink: "#ECE9F1", muted: "#BDB6CB", pop: "#F2A7D3", link: "#C2B0F0",
      kicker: "#F2A7D3", stitch: "rgba(242, 167, 211, 0.42)", grain: "255, 240, 250", shadow: "rgba(0, 0, 0, 0.55)", polaroid: "#FBF8FD",
      tapes: ["rgba(242, 167, 211, 0.6)", "rgba(194, 176, 240, 0.55)", "rgba(195, 238, 255, 0.5)"],
      sun: "#F6D77A", spark: "#F7B7D6", guide: "rgba(242, 167, 211, 0.75)", moonLit: "#EFE9F8", moonDark: "#2E2744" },
    dawn: { name: "Dawn", page: "#F4EEFA", paper: "#FBF9FD", blush: "rgba(168, 50, 122, 0.08)", ink: "#2A1247", muted: "#5B3F86", pop: "#A8327A", link: "#6A3FB5",
      kicker: "#A8327A", stitch: "rgba(106, 63, 181, 0.38)", grain: "107, 71, 97", shadow: "rgba(42, 18, 71, 0.18)", polaroid: "#FFFFFF",
      tapes: ["rgba(168, 50, 122, 0.36)", "rgba(106, 63, 181, 0.32)", "rgba(194, 176, 240, 0.7)"],
      sun: "#F6D77A", spark: "#F7B7D6", guide: "rgba(242, 167, 211, 0.75)", moonLit: "#EFE9F8", moonDark: "#2E2744" },
    cbf: { name: "Colour-blind friendly", page: "#1E1238", paper: "#30234C", blush: "rgba(240, 228, 66, 0.07)", ink: "#FFFFFF", muted: "#DCCFF2", pop: "#F0E442", link: "#9ED4F7",
      kicker: "#F0E442", stitch: "rgba(240, 228, 66, 0.45)", grain: "255, 255, 255", shadow: "rgba(0, 0, 0, 0.5)", polaroid: "#FBF8FD",
      tapes: ["rgba(240, 228, 66, 0.6)", "rgba(86, 180, 233, 0.62)", "rgba(204, 121, 167, 0.62)"],
      sun: "#F0E442", spark: "#E69F00", guide: "rgba(86, 180, 233, 0.95)", moonLit: "#FFFFFF", moonDark: "#3B2D68" }
  };
  var cardStyle = null;   // null: follow the page's colour theme
  var cardName = "";      // optional, typed by the visitor; never saved or sent
  function styleKey() {
    if (cardStyle) return cardStyle;
    var t = root.getAttribute("data-theme");
    return t === "light" ? "dawn" : t === "colour-blind-friendly" ? "cbf" : "night";
  }
  function hexA(hex, a) { var n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + ", " + (n >> 8 & 255) + ", " + (n & 255) + ", " + a + ")"; }
  function possessive(n) { return /s$/i.test(n) ? n + "’" : n + "’s"; }

  // Where a point of the sky lands on the halo chart: [x, y, degrees from the Sun].
  function halo(lon, lat, sunL, cx, cy, R) {
    var dl = (lon - sunL) * RAD, b = lat * RAD;
    var east = Math.cos(b) * Math.sin(dl), north = Math.sin(b), toward = Math.cos(b) * Math.cos(dl);
    var theta = Math.acos(Math.max(-1, Math.min(1, toward)));
    var r = R * Math.sin(theta / 2), n = Math.sqrt(east * east + north * north) || 1;
    return [cx - r * east / n, cy - r * north / n, theta / RAD];
  }
  // The Moon on a date, at 12:00 UTC (low-precision formulas from the Astronomical Almanac,
  // good to about a degree): where it is, how much is lit, and the phase's name.
  function moonOn(iso) {
    var p = iso.split("-"), d = Date.UTC(+p[0], +p[1] - 1, +p[2], 12) / 864e5 + 2440587.5 - 2451545;
    var L = 218.316 + 13.176396 * d, M = (134.963 + 13.064993 * d) * RAD, Fa = (93.272 + 13.22935 * d) * RAD;
    var lon = ((L + 6.289 * Math.sin(M)) % 360 + 360) % 360, lat = 5.128 * Math.sin(Fa);
    var e = ((lon - sunLon(+p[0], +p[1], +p[2])) % 360 + 360) % 360;
    var names = ["new Moon", "waxing crescent", "first quarter", "waxing gibbous", "full Moon", "waning gibbous", "last quarter", "waning crescent"];
    return { lon: lon, lat: lat, lit: (1 - Math.cos(e * RAD)) / 2, name: names[Math.floor(((e + 22.5) % 360) / 45)] };
  }
  // A small seeded random sequence, so the same date always gets the same paper and stickers.
  function seeded(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
  }
  function wrap(ctx, text, x, y, maxW, lh) {
    var words = text.split(" "), lineText = "";
    for (var i = 0; i < words.length; i++) {
      var test = lineText ? lineText + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && lineText) { ctx.fillText(lineText, x, y); y += lh; lineText = words[i]; }
      else lineText = test;
    }
    if (lineText) ctx.fillText(lineText, x, y);
    return y + lh;
  }
  function fit(ctx, text, weight, size, min, maxW, F) {
    ctx.font = weight + " " + size + "px " + F;
    while (ctx.measureText(text).width > maxW && size > min) { size -= 2; ctx.font = weight + " " + size + "px " + F; }
    return size;
  }
  function star(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.22, y - r * 0.22); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.22, y + r * 0.22);
    ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.22, y + r * 0.22); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.22, y - r * 0.22);
    ctx.closePath(); ctx.fill();
  }
  // The site's soft sparkle sticker (the same curve as the team cards), filled with paint.
  var SPARKLE = new Path2D("M12 0c.9 6.5 4.6 10.6 12 12-7.4 1.4-11.1 5.5-12 12-.9-6.5-4.6-10.6-12-12C7.4 10.6 11.1 6.5 12 0z");
  function sparkle(ctx, x, y, size, rot, fill, outline) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot * RAD); ctx.scale(size / 24, size / 24); ctx.translate(-12, -12);
    if (outline) { ctx.lineWidth = 160 / size; ctx.strokeStyle = outline; ctx.stroke(SPARKLE); }
    ctx.fillStyle = fill; ctx.fill(SPARKLE);
    ctx.restore();
  }
  function holoFill(ctx, x0, y0, x1, y1) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, HOLO[0]); g.addColorStop(0.35, HOLO[1]); g.addColorStop(0.65, HOLO[2]); g.addColorStop(1, HOLO[3]);
    return g;
  }
  // The Moon's phase, with its lit side facing the Sun on the chart.
  function moonGlyph(ctx, x, y, r, lit, towardSun, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(towardSun);
    ctx.fillStyle = s.moonDark; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = s.moonLit; ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    ctx.ellipse(0, 0, r * Math.abs(1 - 2 * lit), r, 0, Math.PI / 2, -Math.PI / 2, lit < 0.5);
    ctx.fill();
    ctx.strokeStyle = SKY.edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // The Ashesha mark (from js/nav.js): the A turned over into "for all", a comet as its crossbar.
  function mark(ctx, x, y, size, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 64, size / 64);
    ctx.fillStyle = s.ink; ctx.fill(new Path2D("M4 6H16L32 42L48 6H60L37 58H27Z"));
    ctx.translate(0, 7); ctx.translate(52, 23); ctx.rotate(14 * RAD); ctx.translate(-52, -23);
    ctx.fillStyle = s.pop; ctx.fill(new Path2D("M2 21.6 52 18V28L2 24.4Z"));
    ctx.beginPath(); ctx.arc(52, 23, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // Paper with a row of half-circles all round its edge, like a scalloped doily.
  function scallopPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    roundRectPath(ctx, x, y, w, h, 14);
    var step = r * 1.9, i;
    for (i = x + r; i <= x + w - r; i += step) { ctx.moveTo(i + r, y); ctx.arc(i, y, r, 0, Math.PI * 2); ctx.moveTo(i + r, y + h); ctx.arc(i, y + h, r, 0, Math.PI * 2); }
    for (i = y + r; i <= y + h - r; i += step) { ctx.moveTo(x + r, i); ctx.arc(x, i, r, 0, Math.PI * 2); ctx.moveTo(x + w + r, i); ctx.arc(x + w, i, r, 0, Math.PI * 2); }
  }
  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // A strip of striped, see-through washi tape.
  function tape(ctx, x, y, w, h, rot, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot * RAD);
    var pc = document.createElement("canvas"); pc.width = pc.height = 20;
    var p = pc.getContext("2d");
    p.fillStyle = color; p.fillRect(0, 0, 20, 20);
    p.globalCompositeOperation = "destination-out"; p.fillStyle = "rgba(0, 0, 0, 0.42)";
    p.beginPath(); p.moveTo(0, 10); p.lineTo(10, 0); p.lineTo(20, 0); p.lineTo(0, 20); p.closePath(); p.fill();
    p.beginPath(); p.moveTo(10, 20); p.lineTo(20, 10); p.lineTo(20, 20); p.closePath(); p.fill();
    ctx.shadowColor = "rgba(0, 0, 0, 0.12)"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    ctx.fillStyle = ctx.createPattern(pc, "repeat");
    // Torn-looking short ends: small zigzags.
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2);
    for (var k = 0; k <= 6; k++) ctx.lineTo(-w / 2 + (k % 2 ? 5 : 0), -h / 2 + h * k / 6);
    for (k = 0; k <= 6; k++) ctx.lineTo(w / 2 - (k % 2 ? 5 : 0), h / 2 - h * k / 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // The marker squiggle under the date, shading from pink to violet (as under the lead's title).
  function squiggle(ctx, x0, x1, y, s) {
    var g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, s.pop); g.addColorStop(1, s.link);
    ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x0, y);
    for (var x = x0; x <= x1; x += 4) ctx.lineTo(x, y + Math.sin((x - x0) / 15) * 6);
    ctx.stroke(); ctx.restore();
  }
  // A faint paper grain, seeded so it never changes for a date.
  function grain(ctx, x, y, w, h, s, rnd) {
    var g = document.createElement("canvas"); g.width = g.height = 180;
    var gc = g.getContext("2d"), img = gc.createImageData(180, 180), c = s.grain.split(",").map(Number);
    for (var i = 0; i < img.data.length; i += 4) { img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = rnd() < 0.5 ? Math.floor(rnd() * 26) : 0; }
    gc.putImageData(img, 0, 0);
    ctx.save(); ctx.fillStyle = ctx.createPattern(g, "repeat"); ctx.fillRect(x, y, w, h); ctx.restore();
  }

  function cardFacts() {
    if (!day) return null;
    var h = headline(day), more = day.messier.length - 1, moon = moonOn(chosen), whose = cardName ? possessive(cardName) : "my";
    return {
      date: fmtDate(chosen), md: fmtMD(chosen.slice(5)), year: chosen.slice(0, 4), moon: moon, head: h,
      line: "The sky NASA’s SPHEREx saw on " + whose + " birthday",
      name: h ? (info[h].name || info[h].label) : "A quiet sky",
      about: h ? (info[h].name ? info[h].label + " · " : "") + (info[h].kind ? an(info[h].kind) : "type uncertain") + (more > 0 ? " · and " + plural(more, "more famous object", "more famous objects") : "")
        : "None of Messier’s 110 sat in its pictures that day",
      stats: plural(day.exposures, "picture", "pictures") + " in a ring · the Moon: " + moon.name,
      chin: "SPHEREx · " + fmtDate(chosen),
      credit: "Data: SPHEREx " + day.releases.map(function (r) { return r.release; }).join(" and ") + ", NASA/IPAC IRSA · Messier list: SIMBAD · Moon calculated by us · Not endorsed by NASA or IRSA"
    };
  }

  function drawCard() {
    var ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height, s = STYLES[styleKey()], f = cardFacts();
    var F = '"Atkinson Hyperlegible", system-ui, sans-serif', cx = W / 2;
    var rnd = seeded((chosen || "none") + styleKey());
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

    // ---- The page, and the scalloped paper on it ----
    ctx.fillStyle = s.page; ctx.fillRect(0, 0, W, H);
    var px = 56, py = 64, pw = W - 112, ph = H - 128;
    ctx.save(); ctx.shadowColor = s.shadow; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    ctx.fillStyle = s.paper; scallopPath(ctx, px, py, pw, ph, 11); ctx.fill("nonzero"); ctx.restore();
    ctx.save(); scallopPath(ctx, px, py, pw, ph, 11); ctx.clip("nonzero");
    var bl = ctx.createRadialGradient(px + pw, py, 0, px + pw, py, pw * 1.1);
    bl.addColorStop(0, s.blush); bl.addColorStop(1, hexA("#000000", 0));
    ctx.fillStyle = bl; ctx.fillRect(px - 20, py - 20, pw + 40, ph + 40);
    grain(ctx, px - 20, py - 20, pw + 40, ph + 40, s, rnd);
    ctx.restore();
    // The sewn stitch.
    ctx.strokeStyle = s.stitch; ctx.lineWidth = 3.5; ctx.setLineDash([16, 12]); ctx.lineCap = "round";
    roundRect(ctx, px + 24, py + 24, pw - 48, ph - 48, 18); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = "butt";

    if (!f) {
      ctx.fillStyle = s.muted; ctx.font = "700 52px " + F; ctx.fillText("Choose a birthday first", cx, H / 2);
      $("card-alt").textContent = "Your card appears here once you choose a birthday in step 1.";
      ctx.restore();
      return;
    }

    // ---- Top: a crescent, whose first light, and the date with a marker squiggle ----
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(cx + 10, 205, 19, 0, Math.PI * 2); ctx.clip("evenodd");
    ctx.fillStyle = s.pop; ctx.beginPath(); ctx.arc(cx, 212, 22, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    sparkle(ctx, cx + 34, 190, 18, 8, s.pop);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
    ctx.fillStyle = s.kicker; ctx.font = "700 30px " + F;
    fit(ctx, ("The first light" + (cardName ? " · for " + cardName : "")).toUpperCase(), "700", 30, 22, W - 220, F);
    ctx.fillText(("The first light" + (cardName ? " · for " + cardName : "")).toUpperCase(), cx, 282);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.fillStyle = s.ink;
    fit(ctx, f.md, "700", 160, 92, W - 220, F);
    var dw = ctx.measureText(f.md).width;
    ctx.fillText(f.md, cx, 440);
    squiggle(ctx, cx - dw / 2 + 10, cx + dw / 2 - 10, 474, s);
    ctx.fillStyle = s.muted; ctx.font = "400 84px " + F;
    ctx.fillText(f.year, cx, 568);
    fit(ctx, f.line, "400", 32, 22, W - 240, F);
    ctx.fillText(f.line, cx, 624);

    // ---- The polaroid: a night-sky photo of the halo chart, holographic rim, taped on ----
    var PW = 680, pad = 28, chin = 84, PH = pad + (PW - 2 * pad) + chin, photo = PW - 2 * pad;
    var qx = cx, qy = 680 + PH / 2, tilt = -2.2;
    ctx.save(); ctx.translate(qx, qy); ctx.rotate(tilt * RAD); ctx.translate(-PW / 2, -PH / 2);
    // Frame with its shadow, then the holographic rim.
    ctx.save(); ctx.shadowColor = s.shadow; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
    ctx.fillStyle = s.polaroid; roundRect(ctx, 0, 0, PW, PH, 8); ctx.fill(); ctx.restore();
    var rim = ctx.createConicGradient ? ctx.createConicGradient(200 * RAD, PW / 2, PH / 2) : holoFill(ctx, 0, 0, PW, PH);
    if (ctx.createConicGradient) { [0, 0.25, 0.5, 0.75, 1].forEach(function (t, i) { rim.addColorStop(t, HOLO[i % 4]); }); }
    ctx.strokeStyle = rim; ctx.lineWidth = 7; roundRect(ctx, 3.5, 3.5, PW - 7, PH - 7, 7); ctx.stroke();
    // The photo: a little window of night sky.
    var ox = pad, oy = pad, ccx = ox + photo / 2, ccy = oy + photo / 2, R = photo / 2 - 34;
    ctx.save(); roundRect(ctx, ox, oy, photo, photo, 4); ctx.clip();
    var sky = ctx.createLinearGradient(ox, oy, ox + photo * 0.6, oy + photo);
    sky.addColorStop(0, SKY.a); sky.addColorStop(1, SKY.b);
    ctx.fillStyle = sky; ctx.fillRect(ox, oy, photo, photo);
    var hz = ctx.createRadialGradient(ox + photo, oy, 0, ox + photo, oy, photo * 1.2);
    hz.addColorStop(0, SKY.haze); hz.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = hz; ctx.fillRect(ox, oy, photo, photo);
    // The chart.
    var se = toEcl(day.sun.ra, day.sun.dec), sunL = se[0];
    ctx.strokeStyle = SKY.edge; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ccx, ccy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(ccx, ccy, R, 0, Math.PI * 2); ctx.clip();
    ctx.beginPath(); ctx.moveTo(ccx - R, ccy); ctx.lineTo(ccx + R, ccy); ctx.stroke();
    var r90 = R * Math.SQRT1_2;
    ctx.strokeStyle = s.guide; ctx.lineWidth = 2.5; ctx.setLineDash([9, 11]); ctx.beginPath(); ctx.arc(ccx, ccy, r90, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    var today = {};
    day.messier.forEach(function (o) { today[o.messier] = true; });
    ctx.fillStyle = SKY.faint;
    idx.messier.forEach(function (m) {
      if (today[m.messier]) return;
      var e = toEcl(m.ra, m.dec), q = halo(e[0], e[1], sunL, ccx, ccy, R);
      ctx.beginPath(); ctx.arc(q[0], q[1], 2.6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = "lighter"; ctx.shadowColor = SKY.dot; ctx.shadowBlur = 9;
    ctx.fillStyle = SKY.dot; ctx.globalAlpha = 0.55;
    day.pointings.forEach(function (p) {
      var e = toEcl(p[0], p[1]), q = halo(e[0], e[1], sunL, ccx, ccy, R);
      ctx.beginPath(); ctx.arc(q[0], q[1], 3.6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.globalCompositeOperation = "source-over";
    var glow = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, 80);
    glow.addColorStop(0, s.sun); glow.addColorStop(0.3, hexA(s.sun, 0.7)); glow.addColorStop(1, hexA(s.sun, 0));
    ctx.globalAlpha = 0.5; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(ccx, ccy, 80, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = s.sun; ctx.beginPath(); ctx.arc(ccx, ccy, 19, 0, Math.PI * 2); ctx.fill();
    var h = f.head, hq = null;
    ctx.fillStyle = s.spark;
    day.messier.forEach(function (o) {
      var m = info[o.messier], e = toEcl(m.ra, m.dec), q = halo(e[0], e[1], sunL, ccx, ccy, R);
      if (o.messier === h) hq = q; else star(ctx, q[0], q[1], 11);
    });
    if (hq) { ctx.shadowColor = s.spark; ctx.shadowBlur = 16; star(ctx, hq[0], hq[1], 22); ctx.shadowBlur = 0; }
    var mq = halo(f.moon.lon, f.moon.lat, sunL, ccx, ccy, R);
    moonGlyph(ctx, mq[0], mq[1], 15, f.moon.lit, Math.atan2(ccy - mq[1], ccx - mq[0]), s);
    ctx.restore();
    function label(text, x, y, align, size, color) {
      ctx.font = "700 " + size + "px " + F; ctx.textAlign = align;
      ctx.lineJoin = "round"; ctx.lineWidth = 7; ctx.strokeStyle = SKY.a; ctx.globalAlpha = 0.8; ctx.strokeText(text, x, y); ctx.globalAlpha = 1;
      ctx.fillStyle = color; ctx.fillText(text, x, y);
    }
    label("Sun", ccx, ccy + 54, "center", 24, "#F4F1FA");
    label("90° from the Sun", ccx, ccy - r90 - 14, "center", 20, s.guide.replace(/[\d.]+\)$/, "1)"));
    var mr = mq[0] > ccx ? "left" : "right";
    label("Moon", mq[0] + (mr === "left" ? 24 : -24), mq[1] + 7, mr, 20, "#D9D2E6");
    if (hq) {
      // Beside the sparkle on the outer side, unless the name would run off the photo: then the
      // other side, or above it if neither side has room.
      ctx.font = "700 27px " + F;
      var nw = ctx.measureText(f.name).width, hr = hq[0] > ccx ? "left" : "right", nx = hq[0] + (hr === "left" ? 32 : -32), ny = hq[1] + 9;
      if (hr === "left" && nx + nw > ox + photo - 12) { hr = "right"; nx = hq[0] - 32; }
      else if (hr === "right" && nx - nw < ox + 12) { hr = "left"; nx = hq[0] + 32; }
      if ((hr === "left" && nx + nw > ox + photo - 12) || (hr === "right" && nx - nw < ox + 12)) { hr = "center"; nx = Math.min(Math.max(hq[0], ox + nw / 2 + 12), ox + photo - nw / 2 - 12); ny = hq[1] - 32; }
      label(f.name, nx, ny, hr, 27, "#FFFFFF");
    }
    // The holographic sheen across the photo.
    var sheen = ctx.createLinearGradient(ox, oy, ox + photo, oy + photo);
    sheen.addColorStop(0.2, "rgba(255, 255, 255, 0)"); sheen.addColorStop(0.42, "rgba(255, 160, 225, 0.10)");
    sheen.addColorStop(0.52, "rgba(150, 225, 255, 0.12)"); sheen.addColorStop(0.62, "rgba(255, 240, 160, 0.08)"); sheen.addColorStop(0.8, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sheen; ctx.fillRect(ox, oy, photo, photo);
    ctx.restore();
    // The chin, written like a label on a photo.
    if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
    ctx.textAlign = "center"; ctx.fillStyle = "#2A1247"; ctx.font = "700 24px " + F;
    ctx.fillText(f.chin.toUpperCase(), PW / 2, PH - chin / 2 + 8);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.restore();
    // Washi tape at two corners, and sparkle stickers: one holographic, a few small.
    var top = 680;
    tape(ctx, qx - PW / 2 + 40, top + 14, 150, 44, -38, s.tapes[0]);
    tape(ctx, qx + PW / 2 - 36, top + 10, 150, 44, 34, s.tapes[1]);
    sparkle(ctx, qx + PW / 2 - 18, top + PH - 40, 74, 12, holoFill(ctx, qx + PW / 2 - 56, top + PH - 78, qx + PW / 2 + 20, top + PH), "rgba(255, 255, 255, 0.85)");
    sparkle(ctx, qx - PW / 2 + 6, top + PH * 0.55, 30, -10, s.pop);
    sparkle(ctx, qx + PW / 2 + 28, top + PH * 0.32, 22, 14, s.link);

    // ---- Who it met ----
    var by = top + PH + 76;
    sparkle(ctx, cx - 132, by - 10, 18, 0, s.pop);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "5px";
    ctx.textAlign = "center"; ctx.fillStyle = s.kicker; ctx.font = "700 26px " + F;
    ctx.fillText(h ? "SPHEREX MET" : "THAT DAY", cx + 6, by);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.fillStyle = s.ink; fit(ctx, f.name, "700", 72, 44, W - 240, F);
    ctx.fillText(f.name, cx, by + 80);
    ctx.fillStyle = s.muted; fit(ctx, f.about, "400", 31, 22, W - 240, F);
    ctx.fillText(f.about, cx, by + 130);
    fit(ctx, f.stats, "400", 27, 20, W - 240, F);
    ctx.fillText(f.stats, cx, by + 176);

    // ---- Footer: the mark and a quiet credit ----
    ctx.font = "700 28px " + F;
    var brand = "Ashesha · Team Selenites", bw = ctx.measureText(brand).width, fy = H - 180;
    mark(ctx, cx - bw / 2 - 50, fy - 30, 38, s);
    ctx.fillStyle = s.ink; ctx.textAlign = "left"; ctx.fillText(brand, cx - bw / 2, fy);
    ctx.textAlign = "center"; ctx.fillStyle = s.muted; ctx.font = "400 21px " + F;
    wrap(ctx, f.credit, cx, fy + 44, W - 260, 29);
    ctx.restore();

    $("card-alt").textContent = "Your card, in " + s.name + " colours: a scrapbook page with a taped polaroid. " + f.date + ". " + f.line + ". The polaroid is a round chart of the whole sky with the Sun at its heart: the " +
      day.exposures + " pictures SPHEREx took that day circle it about 90 degrees away, and the Moon, a " + f.moon.name + " that day, is marked too. " +
      (h ? "SPHEREx met " + fullName(h) + more(h) + "." : "None of Messier's 110 sat in its pictures that day.");
    $("card-credit").textContent = "Data: " + listWords(day.releases.map(function (r) { return "SPHEREx " + r.release + (r.doi ? " (DOI " + r.doi + ")" : " (DOI not confirmed yet)"); })) +
      ", NASA/IPAC IRSA. Messier positions and names: SIMBAD. The Moon's place and phase are calculated by us (to about a degree), not measured.";
  }
  function more(h) { var n = day.messier.length - 1; return (info[h].kind ? ", " + an(info[h].kind) : "") + (n > 0 ? ", and " + plural(n, "more famous object", "more famous objects") : ""); }

  // ---------- The card's controls: colours, a name, share, save, link ----------
  document.querySelectorAll('input[name="card-look"]').forEach(function (r) {
    r.addEventListener("change", function () { cardStyle = r.value; drawCard(); });
  });
  function syncLook() {
    var k = styleKey();
    document.querySelectorAll('input[name="card-look"]').forEach(function (r) { r.checked = r.value === k; });
  }
  $("card-name").addEventListener("input", function () {
    cardName = this.value.replace(/\s+/g, " ").trim().slice(0, 24);
    drawCard();
  });
  function fileName() { return "first-light-" + chosen + ".png"; }
  function done(msg) { $("card-status").textContent = msg; setGuide("card", "c-saved"); progress("saved"); }
  function withBlob(fn) {
    if (!day) { showView("day", { history: "push" }); return; }
    drawCard();
    canvas.toBlob(function (blob) {
      if (!blob) { $("card-status").textContent = "This browser could not make the picture. You can right-click the card and save it instead."; return; }
      fn(blob);
    }, "image/png");
  }
  $("card-save").addEventListener("click", function () {
    withBlob(function (blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      done("Saved as " + fileName() + ".");
    });
  });
  // Share straight to another app (the phone's own share sheet), where the browser can share
  // pictures; otherwise the button stays hidden and Save does the job.
  var shareBtn = $("card-share");
  try {
    var probeFile = new File([new Blob(["x"], { type: "image/png" })], "probe.png", { type: "image/png" });
    shareBtn.hidden = !(navigator.canShare && navigator.canShare({ files: [probeFile] }));
  } catch (e) { shareBtn.hidden = true; }
  shareBtn.addEventListener("click", function () {
    withBlob(function (blob) {
      var file = new File([blob], fileName(), { type: "image/png" });
      navigator.share({ files: [file], title: "My first light", text: "The sky NASA's SPHEREx saw on my birthday" })
        .then(function () { done("Shared."); })
        .catch(function (err) { if (!err || err.name !== "AbortError") $("card-status").textContent = "Sharing didn't work here. Save the card instead, then share the picture."; });
    });
  });
  $("card-copy").addEventListener("click", function () {
    if (!day) { showView("day", { history: "push" }); return; }
    var url = window.location.origin + window.location.pathname + "?date=" + chosen + "#card";
    var ok = function () { $("card-status").textContent = "Link copied."; };
    var show = function () { $("card-status").textContent = "Copy this link: " + url; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, show); else show();
  });
  // Follow the colour theme until the visitor picks the card's own colours.
  if (window.MutationObserver) new MutationObserver(function () { syncLook(); if (currentView === "card") drawCard(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  syncLook();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (currentView === "card") drawCard(); });

  // ---------- Start ----------
  fetchJSON("data/beginnings/index.json").then(function (data) {
    idx = data;
    idx.messier.forEach(function (m) { info[m.messier] = m; });
    var h = window.location.hash.replace(/^#/, "");
    // A shared card link: ?date=YYYY-MM-DD opens that day.
    var want = new URLSearchParams(window.location.search).get("date");
    if (want && idx.days[want]) {
      var p = want.split("-");
      monthSel.value = p[1]; fillDays(); daySel.value = p[2];
      $("bd-moon-date").textContent = fmtMD(p[1] + "-" + p[2]);
      setText("g-md", fmtMD(p[1] + "-" + p[2]));
      stubsFor(p[1] + "-" + p[2]);
      return choose(want).then(function () { showView(VIEWS.indexOf(h) >= 0 ? h : "card", { focus: false, history: "replace" }); });
    }
    showView(VIEWS.indexOf(h) >= 0 ? h : "day", { focus: false, history: "replace" });
  }).catch(function () {
    showView("day", { focus: false });
    var m = document.createElement("p");
    m.className = "message";
    m.textContent = "The birthday data could not be loaded. If you opened this file straight from your computer, please open it through a web server instead.";
    document.querySelector(".bg-day").insertBefore(m, document.querySelector(".bg-day").firstChild);
  });
})();
