// Cryostella: the frozen water section, in four short steps with Iris as the guide.
//   1 Colours of light    walk along a rainbow, past red, into infrared
//   2 Read a spectrum     a graph of brightness against colour; find a dip or a bump
//   3 Hear it             the same spectrum as sound (the Spectrum Player)
//   4 Name that spectrum  a listening game: cloud or comet?
// One step is on screen at a time, each with its own address (#colours, #read, #hear, #game),
// and nothing moves on by itself. Iris's tip on each step says what to do now (js/guide.js reads
// window.SELENITES_GUIDE below to know which part to show).
//
// Everything shown comes from data files:
//   data/cryostella/index.json      the list of spectra
//   data/cryostella/<id>.json       one spectrum each (format: docs/cryostella-data.md)
//   data/sound-key.json             what each sound means (a team member's file)
// No sound meaning and no science claim is written in this code.
(function () {
  "use strict";

  var DOIS = { QR2: "10.26131/IRSA652", QR3: "10.26131/IRSA662" };
  var SVG_NS = "http://www.w3.org/2000/svg";
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  root.classList.add("has-views");
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(motionQuery && motionQuery.matches); }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function announce(text) { var l = $("cr-live"); l.textContent = ""; setTimeout(function () { l.textContent = text; }, 30); }
  function svg(tag, attrs, parent) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function fetchJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); });
  }
  function fmtUm(w) { return w.toFixed(2); }
  function fmtVal(v) {
    if (v === null || v === undefined) return "not given";
    var a = Math.abs(v);
    return a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(3);
  }
  function unitText(s) { return s.unit === "relative" ? "(relative units)" : s.unit; }
  function spacing(s) { var p = s.points; return p.length > 1 ? (p[p.length - 1].wavelength_um - p[0].wavelength_um) / (p.length - 1) : 0.1; }
  function featureNear(s, w, reach) {
    var best = null, bestD = Infinity;
    s.features.forEach(function (f) { var d = Math.abs(f.wavelength_um - w); if (d < bestD) { bestD = d; best = f; } });
    return bestD <= spacing(s) * (reach || 1.5) ? best : null;
  }
  function featureName(f) { return f.verified && f.molecule ? f.label + ": " + f.molecule : f.label; }

  // ---------- Iris's tips: which part of each step she is on ----------
  var guideState = { colours: "c-walk", read: "r-explore", hear: "h-play", game: "g-play" };
  window.SELENITES_GUIDE = {
    voiceKey: "selenites-iris-voice",
    state: function (view) { return guideState[view] || ""; },
    // While Iris asks for something, that control has a still ring (css/cryostella.css).
    nudge: { "c-walk": "rb-range", "c-ir": "guide-next", "r-explore": "read-cursor", "r-find": "read-cursor",
      "r-found-dip": "guide-next", "r-found-bump": "guide-next", "r-open": "guide-next", "h-play": "hear-play", "h-heard": "guide-next", "g-play": "game-play" }
  };
  function setGuide(view, state) {
    if (guideState[view] === state) return;
    guideState[view] = state;
    document.dispatchEvent(new CustomEvent("selenites:guide"));
  }
  function irisSlots() { return document.querySelectorAll(".guide-selene"); }
  // Her voice switched on: the spectrum's sound stops, so the two never play together.
  document.addEventListener("selenites:guide-voice", function (e) { if (e.detail && e.detail.on) stopSweep(false); });
  function quietIris() { irisSlots().forEach(function (s) { if (s._selene && s._selene.voiced) s._selene.stop(); }); }

  // ---------- Steps: one screen at a time ----------
  var VIEWS = ["colours", "read", "hear", "game"];
  var TITLES = { colours: "Colours of light", read: "Read a spectrum", hear: "Hear it", game: "Name that spectrum" };
  var SITE_TITLE = "Cryostella · Ashesha";
  var viewEls = document.querySelectorAll("main > .view");
  var stepLinks = document.querySelectorAll("#steps a[data-view]");
  var currentView = null;

  function showView(name, opts) {
    opts = opts || {};
    if (VIEWS.indexOf(name) < 0) name = "colours";
    var changed = name !== currentView;
    if (changed) { stopSweep(false); stopGame(); }
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
      // Charts are drawn at their real width, which is only known once the step is on screen.
      requestAnimationFrame(redrawVisible);
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
  // Iris's tour (the page's tour config) opens steps itself, without moving focus out of the tour,
  // and waits for "cryostella:progress" events to know a "your turn" part is done.
  window.CryostellaApp = {
    showView: function (v) { showView(v, { history: "replace", focus: false }); },
    heading: function () { return document.querySelector('main > .view:not([hidden]) .view-title'); },
    // For the tour's words: the spectrum on screen, all of them in order, and how numbers are
    // written on the page. The tour reads names and marks from the data, never its own.
    spectrum: function () { return chosen; },
    spectra: function () { return order.map(function (id) { return specs[id]; }); },
    fmtUm: function (w) { return fmtUm(w); }
  };
  function progress(id) { document.dispatchEvent(new CustomEvent("cryostella:progress", { detail: { id: id } })); }
  window.addEventListener("popstate", fromAddress);
  window.addEventListener("hashchange", fromAddress);

  // ---------- Step 1: the rainbow ----------
  // The scale is logarithmic, so the narrow band our eyes see is wide enough to look at.
  var LMIN = 0.38, LMAX = 5.0, VIS_END = 0.75;
  function umAt(v) { return LMIN * Math.pow(LMAX / LMIN, v / 1000); }
  function posOf(um) { return 1000 * Math.log(um / LMIN) / Math.log(LMAX / LMIN); }
  // Real colours of visible light: a picture of colour itself, so these are not theme tokens.
  var VIS = [[0.38, "#7A00E6", "violet"], [0.45, "#3046FF", "blue"], [0.49, "#00B4F0", "cyan"], [0.52, "#21C24A", "green"],
    [0.57, "#F2DE00", "yellow"], [0.59, "#FF9A00", "orange"], [0.62, "#FF3A1F", "red"], [0.7, "#B3001B", "deep red"], [0.75, "#5C0010", "deep red"]];
  function visName(um) {
    var n = VIS[0][2];
    for (var i = 0; i < VIS.length; i++) if (um >= VIS[i][0]) n = VIS[i][2];
    return n;
  }
  function visColour(um) {
    for (var i = 1; i < VIS.length; i++) {
      if (um <= VIS[i][0]) {
        var a = VIS[i - 1], b = VIS[i], t = (um - a[0]) / (b[0] - a[0]);
        var ca = parseInt(a[1].slice(1), 16), cb = parseInt(b[1].slice(1), 16);
        var r = Math.round(((ca >> 16) & 255) * (1 - t) + ((cb >> 16) & 255) * t);
        var g = Math.round(((ca >> 8) & 255) * (1 - t) + ((cb >> 8) & 255) * t);
        var bl = Math.round((ca & 255) * (1 - t) + (cb & 255) * t);
        return "rgb(" + r + "," + g + "," + bl + ")";
      }
    }
    return null;
  }
  var band = $("rb-band"), rbRange = $("rb-range"), rbMarker = null, bandK = 1, bandW = 0;
  // Drawn at the band's real width, so its words stay a readable size on a phone.
  function drawBand() {
    var W = Math.round(clamp(band.clientWidth || 1000, 300, 2000));
    if (W === bandW) return;
    bandW = W; bandK = W / 1000;
    var narrow = W < 560, y = narrow ? 40 : 48, h = narrow ? 46 : 54, H = y + h + (narrow ? 30 : 36);
    band.textContent = "";
    band.setAttribute("viewBox", "0 0 " + W + " " + H);
    band.classList.toggle("is-narrow", narrow);
    var xv = posOf(VIS_END) * bandK;
    var defs = svg("defs", {}, band);
    var gv = svg("linearGradient", { id: "rb-vis", x1: "0", x2: "1" }, defs);
    VIS.forEach(function (c) { svg("stop", { offset: (posOf(c[0]) * bandK / xv).toFixed(3), "stop-color": c[1] }, gv); });
    var gi = svg("linearGradient", { id: "rb-ir", x1: "0", x2: "1" }, defs);
    svg("stop", { offset: "0", "stop-color": "#3A0610" }, gi);
    svg("stop", { offset: "1", "stop-color": "#0D0A1A" }, gi);
    var pat = svg("pattern", { id: "rb-hatch", width: "10", height: "10", patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    svg("rect", { width: "4", height: "10", fill: "rgba(255,255,255,0.07)" }, pat);
    svg("rect", { x: 0, y: y, width: xv, height: h, rx: 10, fill: "url(#rb-vis)" }, band);
    svg("rect", { x: xv - 10, y: y, width: W - xv + 10, height: h, rx: 10, fill: "url(#rb-ir)" }, band);
    svg("rect", { x: xv, y: y, width: W - xv, height: h, fill: "url(#rb-hatch)" }, band);
    svg("rect", { x: xv - 1, y: y, width: 2, height: h, fill: "url(#rb-vis)" }, band);
    svg("text", { x: (xv + W) / 2, y: y + h / 2 + 5, "text-anchor": "middle", "class": "rb-ir-text" }, band).textContent = narrow ? "Infrared: invisible to us" : "Infrared: invisible to our eyes";
    // The colours' names are written on the rainbow, so it can be read without telling the
    // colours apart (initials where there is no room for whole words).
    var full = W >= 900;
    [[0.405, "violet"], [0.465, "blue"], [0.515, "green"], [0.585, "yellow"], [0.67, "red"]].forEach(function (c) {
      svg("text", { x: (posOf(c[0]) * bandK).toFixed(1), y: y + h / 2 + 4, "text-anchor": "middle", "class": "rb-cname" }, band)
        .textContent = full ? c[1] : c[1].charAt(0).toUpperCase();
    });
    // Brackets: what our eyes see, and what SPHEREx sees.
    function bracket(a, b, label, cls) {
      svg("path", { d: "M" + (a + 2) + " " + (y - 10) + "v-9h" + (b - a - 4) + "v9", "class": "rb-bracket " + cls }, band);
      svg("text", { x: (a + b) / 2, y: y - 25, "text-anchor": "middle", "class": "rb-bracket-text " + cls }, band).textContent = label;
    }
    bracket(0, xv, "Our eyes", "is-eyes");
    bracket(xv, W, narrow ? "SPHEREx: 0.75 to 5 microns" : "SPHEREx: 0.75 to 5 microns, in 102 colours", "is-spherex");
    (narrow ? [0.4, 0.75, 1, 2, 3, 5] : [0.4, 0.5, 0.6, 0.75, 1, 1.5, 2, 3, 4, 5]).forEach(function (um) {
      var x = posOf(um) * bandK;
      svg("line", { x1: x, x2: x, y1: y + h, y2: y + h + 6, "class": "rb-tick" }, band);
      svg("text", { x: clamp(x, 10, W - 10), y: y + h + 22, "text-anchor": "middle", "class": "rb-tick-text" }, band).textContent = um;
    });
    rbMarker = svg("g", { "class": "rb-marker" }, band);
    svg("line", { x1: 0, x2: 0, y1: y - 5, y2: y + h + 5 }, rbMarker);
    svg("path", { d: "M-7 " + (y - 12) + "h14l-7 8z" }, rbMarker);
    if (rbRange) placeMarker();
  }
  function placeMarker() { if (rbMarker) rbMarker.setAttribute("transform", "translate(" + (posOf(umAt(+rbRange.value)) * bandK).toFixed(1) + " 0)"); }
  drawBand();
  function rainbow() {
    var um = umAt(+rbRange.value), shown = +um.toFixed(2), vis = shown < VIS_END, name = vis ? visName(shown) : "infrared";
    placeMarker();
    $("rb-um").textContent = um.toFixed(2) + " microns";
    $("rb-name").textContent = name;
    var sw = $("rb-swatch");
    sw.style.background = vis ? visColour(um) : "";
    sw.classList.toggle("is-ir", !vis);
    var say = vis
      ? (um >= 0.7 ? "Deep red: the edge of what our eyes can see." : "Our eyes can see this colour.")
      : "Our eyes cannot see this, but SPHEREx can. It takes pictures in 102 colours from 0.75 to 5 microns.";
    $("rb-say").textContent = say;
    rbRange.setAttribute("aria-valuetext", um.toFixed(2) + " microns, " + name + ". " + say);
    if (!vis) { setGuide("colours", "c-ir"); progress("ir"); }
  }
  rbRange.addEventListener("input", rainbow);
  rainbow();

  // ---------- Charts ----------
  // One drawing routine for the three charts: Read (with a cursor), Hear (with a playhead) and the
  // game's mystery graph (no names, no marks). Drawn at the chart's real width.
  var charts = [];
  function Chart(el, opts) {
    this.el = el; this.opts = opts || {}; this.spec = null; this.parts = {};
    this.titleEl = el.querySelector("title"); this.descEl = el.querySelector("desc");
    charts.push(this);
  }
  function niceStep(range, target) {
    var raw = range / target, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
  }
  Chart.prototype.draw = function (s) {
    if (s) this.spec = s;
    s = this.spec;
    var c = this.el, o = this.opts, self = this;
    if (!s) return;
    // The words first: they do not depend on the drawing, so a screen reader has them even
    // while the step is still hidden or waiting for its width.
    this.words();
    if (!c.parentNode.clientWidth) return;
    var pts = s.points;
    Array.prototype.slice.call(c.childNodes).forEach(function (n) { if (n !== self.titleEl && n !== self.descEl) c.removeChild(n); });
    // Drawn at the chart's real width, with a fixed height: on a wide screen the graph gets
    // wider, not taller, so it never towers over the page (or out of the tour's light).
    var W = Math.round(clamp(c.parentNode.clientWidth, 300, 2000));
    var H = o.small ? (W < 560 ? 200 : 230) : (W < 560 ? 280 : 330);
    var M = { top: o.hideFeatures ? 20 : 56, right: 16, bottom: 52, left: 60 };
    c.setAttribute("viewBox", "0 0 " + W + " " + H);
    var x0 = pts[0].wavelength_um, x1 = pts[pts.length - 1].wavelength_um, pad = (x1 - x0) * 0.02 || 0.1;
    x0 -= pad; x1 += pad;
    var yMax = 0, yMin = 0;
    pts.forEach(function (p) { var e = p.error || 0; yMax = Math.max(yMax, p.value + e); yMin = Math.min(yMin, p.value - e); });
    var yStep = niceStep(yMax - yMin || 1, 4);
    yMax = Math.ceil(yMax / yStep) * yStep; yMin = Math.floor(yMin / yStep) * yStep;
    var pw = W - M.left - M.right, ph = H - M.top - M.bottom;
    var sx = function (w) { return M.left + (w - x0) / (x1 - x0) * pw; };
    var sy = function (v) { return M.top + (1 - (v - yMin) / (yMax - yMin)) * ph; };
    this.sx = sx; this.sy = sy; this.M = M; this.W = W; this.H = H;
    var g = svg("g", {}, c);
    var xStep = niceStep(x1 - x0, W < 560 ? 4 : 6);
    for (var xt = Math.ceil(x0 / xStep) * xStep; xt <= x1 + 1e-9; xt += xStep) {
      svg("line", { x1: sx(xt), x2: sx(xt), y1: M.top, y2: H - M.bottom, "class": "cr-grid" }, g);
      svg("text", { x: sx(xt), y: H - M.bottom + 22, "text-anchor": "middle" }, g).textContent = +xt.toFixed(2);
    }
    for (var yt = yMin; yt <= yMax + 1e-9; yt += yStep) {
      svg("line", { x1: M.left, x2: W - M.right, y1: sy(yt), y2: sy(yt), "class": "cr-grid" }, g);
      svg("text", { x: M.left - 10, y: sy(yt) + 5, "text-anchor": "end" }, g).textContent = +yt.toFixed(3);
    }
    svg("line", { x1: M.left, x2: W - M.right, y1: H - M.bottom, y2: H - M.bottom, "class": "cr-axis" }, g);
    svg("line", { x1: M.left, x2: M.left, y1: M.top, y2: H - M.bottom, "class": "cr-axis" }, g);
    svg("text", { x: M.left + pw / 2, y: H - 10, "text-anchor": "middle", "class": "cr-axis-title" }, g).textContent = "Colour (wavelength in microns)";
    svg("text", { x: 16, y: M.top + ph / 2, "text-anchor": "middle", "class": "cr-axis-title", transform: "rotate(-90 16 " + (M.top + ph / 2) + ")" }, g).textContent = "Brightness";

    if (!o.hideFeatures) {
      var lastX = -Infinity, row = 0;
      s.features.slice().sort(function (a, b) { return a.wavelength_um - b.wavelength_um; }).forEach(function (f) {
        var fx = sx(f.wavelength_um);
        svg("line", { x1: fx, x2: fx, y1: M.top - 6, y2: H - M.bottom, "class": "cr-feature-line" }, g);
        row = fx - lastX < 140 ? 1 - row : 0; lastX = fx;
        var ly = 18 + row * 20;
        if (f.kind === "dip") svg("path", { d: "M" + (fx - 7) + " " + (ly - 12) + "h14l-7 12z", "class": "cr-mark-dip" }, g);
        else svg("path", { d: "M" + fx + " " + (ly - 12) + "l7 12h-14z", "class": "cr-mark-bump" }, g);
        var lt = svg("text", { x: fx + 10, y: ly, "class": "cr-feature-text" }, g);
        lt.textContent = featureName(f);
        var len = lt.getComputedTextLength ? lt.getComputedTextLength() : 0;
        if (fx + 10 + len > W - 4) { lt.setAttribute("x", fx - 10); lt.setAttribute("text-anchor", "end"); }
      });
    }
    pts.forEach(function (p) {
      if (p.error) svg("line", { x1: sx(p.wavelength_um), x2: sx(p.wavelength_um), y1: sy(p.value - p.error), y2: sy(p.value + p.error), "class": "cr-err" }, g);
    });
    svg("polyline", { points: pts.map(function (p) { return sx(p.wavelength_um) + "," + sy(p.value); }).join(" "), "class": "cr-line" }, g);
    pts.forEach(function (p) { svg("circle", { cx: sx(p.wavelength_um), cy: sy(p.value), r: 3, "class": "cr-dot" }, g); });

    this.parts.playhead = svg("line", { y1: M.top, y2: H - M.bottom, "class": "cr-playhead", visibility: "hidden" }, g);
    if (o.cursor) {
      this.parts.cursor = svg("line", { y1: M.top, y2: H - M.bottom, "class": "cr-cursor" }, g);
      this.parts.cursorDot = svg("circle", { r: 8, "class": "cr-cursor-dot" }, g);
      this.parts.burst = svg("g", { "class": "cr-burst" }, g);
      var hit = svg("rect", { x: M.left, y: M.top, width: pw, height: ph, "class": "cr-hit" }, g), dragging = false;
      var pick = function (ev) {
        var r = c.getBoundingClientRect();
        var wx = x0 + ((ev.clientX - r.left) / r.width * W - M.left) / pw * (x1 - x0);
        var best = 0, bd = Infinity;
        pts.forEach(function (p, i) { var d = Math.abs(p.wavelength_um - wx); if (d < bd) { bd = d; best = i; } });
        if (o.onPick) o.onPick(best);
      };
      hit.addEventListener("pointerdown", function (ev) { dragging = true; hit.setPointerCapture(ev.pointerId); pick(ev); });
      hit.addEventListener("pointermove", function (ev) { if (dragging) pick(ev); });
      hit.addEventListener("pointerup", function () { dragging = false; });
      hit.addEventListener("pointercancel", function () { dragging = false; });
      if (this.cursorAt !== undefined) this.setCursor(this.cursorAt);
    }
  };
  // The words that stand in for the picture.
  Chart.prototype.words = function () {
    var s = this.spec, o = this.opts, pts = s.points;
    var hi = pts[0], lo = pts[0];
    pts.forEach(function (p) { if (p.value > hi.value) hi = p; if (p.value < lo.value) lo = p; });
    if (o.mystery) {
      this.titleEl.textContent = "The mystery spectrum";
      this.descEl.textContent = "Line graph of brightness against colour, from " + fmtUm(pts[0].wavelength_um) + " to " + fmtUm(pts[pts.length - 1].wavelength_um) +
        " microns. Brightest at " + fmtUm(hi.wavelength_um) + " microns, faintest at " + fmtUm(lo.wavelength_um) + " microns. " + shapeWords(s);
    } else {
      this.titleEl.textContent = "Spectrum of " + s.name + (s.placeholder ? " (practice data)" : "");
      var d = "Line graph of brightness against colour, from " + fmtUm(pts[0].wavelength_um) + " to " + fmtUm(pts[pts.length - 1].wavelength_um) +
        " microns, " + pts.length + " points. Brightest at " + fmtUm(hi.wavelength_um) + " microns, faintest at " + fmtUm(lo.wavelength_um) + " microns.";
      if (s.features.length) d += " Marked: " + s.features.map(function (f) { return (f.kind === "dip" ? "a dip" : "a bump") + " near " + fmtUm(f.wavelength_um) + " microns (" + featureName(f) + ")"; }).join("; ") + ".";
      this.descEl.textContent = d;
    }
  };
  // The mystery graph's description gives its shape in words, without the answer's name.
  function shapeWords(s) {
    var dips = s.features.filter(function (f) { return f.kind === "dip"; }).length, bumps = s.features.length - dips;
    var parts = [];
    if (dips) parts.push(dips + (dips === 1 ? " dip" : " dips"));
    if (bumps) parts.push(bumps + (bumps === 1 ? " bump" : " bumps"));
    return parts.length ? "The curve has " + parts.join(" and ") + "." : "";
  }
  Chart.prototype.setCursor = function (i) {
    this.cursorAt = i;
    if (!this.parts.cursor || !this.spec) return;
    var p = this.spec.points[i], x = this.sx(p.wavelength_um), y = this.sy(p.value);
    this.parts.cursor.setAttribute("x1", x); this.parts.cursor.setAttribute("x2", x);
    this.parts.cursorDot.setAttribute("cx", x); this.parts.cursorDot.setAttribute("cy", y);
  };
  Chart.prototype.setPlayhead = function (w) {
    var ph = this.parts.playhead;
    if (!ph) return;
    if (w === null) { ph.setAttribute("visibility", "hidden"); return; }
    var x = this.sx(w);
    ph.setAttribute("x1", x); ph.setAttribute("x2", x); ph.setAttribute("visibility", "visible");
  };
  // A small burst of sparkles where something was found (skipped with reduced motion).
  Chart.prototype.burst = function (i) {
    var b = this.parts.burst;
    if (!b || reduced()) return;
    var p = this.spec.points[i], x = this.sx(p.wavelength_um), y = this.sy(p.value);
    b.textContent = "";
    for (var k = 0; k < 8; k++) {
      var a = k / 8 * Math.PI * 2;
      var s = svg("path", { d: "M0-5 1.2-1.2 5 0 1.2 1.2 0 5-1.2 1.2-5 0-1.2-1.2z", "class": k % 2 ? "cr-spark is-b" : "cr-spark" }, b);
      s.style.setProperty("--x", (x + Math.cos(a) * 30).toFixed(1) + "px");
      s.style.setProperty("--y", (y + Math.sin(a) * 30).toFixed(1) + "px");
      s.style.setProperty("--x0", x.toFixed(1) + "px");
      s.style.setProperty("--y0", y.toFixed(1) + "px");
    }
    setTimeout(function () { b.textContent = ""; }, 900);
  };
  function redrawVisible() {
    if (band.clientWidth) drawBand();
    charts.forEach(function (ch) { if (ch.el.offsetParent !== null) { ch.draw(); if (ch === readChart && ch.spec) ch.setCursor(+$("read-cursor").value); } });
  }
  var lastW = 0, rt = 0;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { var w = document.documentElement.clientWidth; if (Math.abs(w - lastW) > 8) { lastW = w; redrawVisible(); } }, 150);
  });

  // ---------- The spectra, and which one is chosen ----------
  var specs = {}, order = [], chosen = null;
  function chooseSpectrum(id, from) {
    if (!specs[id] || (chosen && chosen.id === id)) return;
    stopSweep(false);
    chosen = specs[id];
    document.querySelectorAll(".cr-pick-btns button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.id === id ? "true" : "false"); });
    renderRead();
    renderHear();
    try { var u = new URL(window.location.href); u.searchParams.set("target", id); window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash); } catch (e) {}
    if (from) progress("picked");
    if (from) announce(chosen.name + " is on screen." + (chosen.placeholder ? " Practice data, not SPHEREx." : ""));
  }
  function renderPickers() {
    document.querySelectorAll(".cr-pick-btns").forEach(function (box) {
      box.textContent = "";
      order.forEach(function (id) {
        var s = specs[id], b = document.createElement("button");
        b.type = "button"; b.className = "cr-pick-btn"; b.dataset.id = id;
        b.setAttribute("aria-pressed", chosen && chosen.id === id ? "true" : "false");
        b.innerHTML = '<span class="cr-pick-ic" aria-hidden="true"></span>';
        b.appendChild(document.createTextNode(s.name));
        b.dataset.kind = s.kind;
        b.addEventListener("click", function () { chooseSpectrum(id, true); });
        box.appendChild(b);
      });
    });
  }

  // ---------- Step 2: read a spectrum ----------
  var readChart = new Chart($("read-chart"), { cursor: true, onPick: function (i) { $("read-cursor").value = String(i); onCursor(i); } });
  var moves = 0, foundIn = {};
  // What the challenge asks for: only a mark that is really in the data. A spectrum with no
  // bumps or dips marked (the comet files, so far) has nothing to find, so the tip says so.
  function wanted(s) {
    var kinds = s.features.map(function (f) { return f.kind; });
    if (!kinds.length) return null;
    if (s.kind === "ice-source" && kinds.indexOf("dip") >= 0) return "dip";
    if (s.kind === "comet" && kinds.indexOf("bump") >= 0) return "bump";
    return kinds[0];
  }
  function findWords(s) {
    var k = wanted(s), f = k && s.features.filter(function (x) { return x.kind === k; })[0];
    if (!f) return "look at its shape: where it rises and where it drops";
    return k === "dip" ? "find the dip near " + fmtUm(f.wavelength_um) + " microns, where the curve drops"
      : "find the bump near " + fmtUm(f.wavelength_um) + " microns, where the curve rises";
  }
  function readState() {
    if (!chosen) return;
    document.querySelectorAll(".cr-find-what").forEach(function (el) { el.textContent = findWords(chosen); });
    if (foundIn[chosen.id]) setGuide("read", "r-found-" + foundIn[chosen.id]);
    else if (moves >= 3 || guideState.read !== "r-explore") setGuide("read", wanted(chosen) ? "r-find" : "r-open");
  }
  function renderRead() {
    var s = chosen;
    $("read-summary").textContent = s.summary || "";
    var rel = [];
    if (s.placeholder) rel.push("Made-up values for testing. This is not from a SPHEREx data release.");
    else if (s.release) rel.push("Data: SPHEREx " + s.release + (DOIS[s.release] ? " (DOI " + DOIS[s.release] + ")" : "") + ".");
    if (s.ra !== null && s.ra !== undefined && s.dec !== null && s.dec !== undefined) rel.push("Position: RA " + s.ra.toFixed(4) + "°, Dec " + s.dec.toFixed(4) + "°.");
    $("read-release").textContent = rel.join(" ");
    var fl = $("read-features");
    fl.textContent = "";
    if (!s.features.length) { var none = document.createElement("li"); none.textContent = "No bumps or dips are marked on this graph."; fl.appendChild(none); }
    s.features.forEach(function (f) {
      var li = document.createElement("li");
      li.textContent = (f.kind === "dip" ? "Dip (fainter)" : "Bump (brighter)") + " near " + fmtUm(f.wavelength_um) + " microns: " + f.label + ". " +
        (f.verified && f.molecule ? "Checked by the team: " + f.molecule + (f.source ? " (source: " + f.source + ")." : ".") : "Not yet checked, so we do not name what causes it.");
      fl.appendChild(li);
    });
    $("read-table-cap").textContent = "Spectrum of " + s.name + (s.placeholder ? " (practice data)" : "");
    $("read-th-value").textContent = "Brightness " + unitText(s);
    var tb = $("read-tbody");
    tb.textContent = "";
    s.points.forEach(function (p) {
      var tr = document.createElement("tr");
      [fmtUm(p.wavelength_um), fmtVal(p.value), p.error == null ? "not given" : "± " + fmtVal(p.error), p.n_images == null ? "not given" : String(p.n_images)]
        .forEach(function (v) { var td = document.createElement("td"); td.textContent = v; tr.appendChild(td); });
      tb.appendChild(tr);
    });
    var cur = $("read-cursor");
    cur.max = String(s.points.length - 1);
    cur.value = "0";
    readChart.cursorAt = 0;
    readChart.draw(s);
    $("read-found").textContent = "";
    onCursor(0, true);
    readState();
  }
  function onCursor(i, quiet) {
    var s = chosen, p = s.points[i];
    readChart.setCursor(i);
    var text = fmtUm(p.wavelength_um) + " microns: brightness " + fmtVal(p.value) + (s.unit === "relative" ? "" : " " + s.unit) +
      (p.error ? " (± " + fmtVal(p.error) + ")" : "") + (p.n_images ? ", from " + p.n_images + " image" + (p.n_images === 1 ? "" : "s") : "") + ".";
    var f = featureNear(s, p.wavelength_um);
    if (f) text += " Near " + featureName(f) + " (" + (f.kind === "dip" ? "a dip" : "a bump") + ").";
    $("read-readout").textContent = text;
    $("read-cursor").setAttribute("aria-valuetext", text);
    var rows = $("read-tbody").children;
    for (var r = 0; r < rows.length; r++) rows[r].classList.toggle("is-current", r === i);
    if (quiet) return;
    moves++;
    if (moves >= 3 && guideState.read === "r-explore") readState();
    if (moves >= 3) progress("moved");
    // The challenge: the ring sits in the dip (or on the bump) itself.
    var hit = featureNear(s, p.wavelength_um, 1.1);
    var want = wanted(s);
    var onIt = hit && (!want || hit.kind === want);
    if (onIt && guideState.read !== "r-explore" && !foundIn[s.id]) {
      foundIn[s.id] = hit.kind;
      $("read-found").textContent = "Found it: " + featureName(hit) + ", " + (hit.kind === "dip" ? "a dip" : "a bump") + " near " + fmtUm(hit.wavelength_um) + " microns.";
      readChart.burst(i);
      setGuide("read", "r-found-" + hit.kind);
    }
    // For the tour: the ring is on the dip or bump, found before or not.
    if (onIt) progress("found");
  }
  $("read-cursor").addEventListener("input", function () { if (chosen) onCursor(+this.value); });

  // ---------- The sound (Spectrum Player) ----------
  var key = null, ctx = null, master = null, sweep = null;
  function ensureAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) { ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); applyVolume(); }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  // aria-valuetext gives the unit, so a screen reader says "8 seconds", not just "8".
  function applyVolume() { $("cr-volume-out").textContent = $("cr-volume").value + "%"; $("cr-volume").setAttribute("aria-valuetext", $("cr-volume").value + " percent"); if (master) master.gain.value = +$("cr-volume").value / 100; }
  function applySpeed() { $("cr-speed-out").textContent = $("cr-speed").value + " seconds from the shortest colour to the longest"; $("cr-speed").setAttribute("aria-valuetext", $("cr-speed").value + " seconds"); }
  $("cr-volume").addEventListener("input", applyVolume);
  $("cr-speed").addEventListener("input", applySpeed);
  applyVolume(); applySpeed();
  function range(s) {
    var lo = Infinity, hi = -Infinity;
    s.points.forEach(function (p) { lo = Math.min(lo, p.value); hi = Math.max(hi, p.value); });
    return { lo: lo, hi: hi === lo ? lo + 1 : hi };
  }
  function pitchFor(s, w) {
    var p = key.pitch, pts = s.points, a = pts[0].wavelength_um, b = pts[pts.length - 1].wavelength_um;
    return p.low_hz * Math.pow(p.high_hz / p.low_hz, b > a ? (w - a) / (b - a) : 0);
  }
  function gainFor(v, r) { var l = key.loudness; return l.min_gain + (l.max_gain - l.min_gain) * clamp((v - r.lo) / (r.hi - r.lo), 0, 1); }
  function cue(s, f, at) {
    var c = key.cues && key.cues[f.kind];
    if (!c) return null;
    var base = pitchFor(s, f.wavelength_um), len = c.length_s || 0.5;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    if (c.sound === "drop") { o.frequency.setValueAtTime(base, at); o.frequency.exponentialRampToValueAtTime(base * (c.hz_ratio || 0.5), at + len); }
    else o.frequency.setValueAtTime(base * (c.hz_ratio || 2), at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(key.loudness.max_gain, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g); g.connect(master);
    o.start(at); o.stop(at + len + 0.05);
    return o;
  }
  // Play spectrum s from the shortest colour to the longest. hooks.tick(w) while playing,
  // hooks.end(finished) once it stops. cues: false leaves out the marks (the game).
  function playSweep(s, hooks) {
    stopSweep(false);
    if (!key || !ensureAudio()) return false;
    quietIris();
    var pts = s.points, dur = +$("cr-speed").value, r = range(s), t0 = ctx.currentTime + 0.1;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    pts.forEach(function (p, i) {
      var t = t0 + (pts.length > 1 ? i / (pts.length - 1) : 0) * dur;
      if (i === 0) { o.frequency.setValueAtTime(pitchFor(s, p.wavelength_um), t); g.gain.linearRampToValueAtTime(gainFor(p.value, r), t + 0.05); }
      else { o.frequency.linearRampToValueAtTime(pitchFor(s, p.wavelength_um), t); g.gain.linearRampToValueAtTime(gainFor(p.value, r), t); }
    });
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.15);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.2);
    var a = pts[0].wavelength_um, b = pts[pts.length - 1].wavelength_um;
    var extras = hooks.cues === false ? [] : s.features.map(function (f) { return cue(s, f, t0 + (b > a ? (f.wavelength_um - a) / (b - a) : 0) * dur); }).filter(Boolean);
    sweep = { osc: o, gain: g, extras: extras, t0: t0, dur: dur, a: a, b: b, raf: 0, hooks: hooks, s: s };
    o.onended = function () { if (sweep && sweep.osc === o) stopSweep(true); };
    (function tick() {
      if (!sweep || sweep.osc !== o) return;
      var w = a + (b - a) * clamp((ctx.currentTime - t0) / dur, 0, 1);
      if (hooks.tick) hooks.tick(w);
      sweep.raf = requestAnimationFrame(tick);
    })();
    return true;
  }
  // finished: true (played to the end), false (silent stop), null (stopped by the visitor).
  function stopSweep(finished) {
    if (!sweep) return;
    var s = sweep;
    sweep = null;
    cancelAnimationFrame(s.raf);
    try {
      var now = ctx.currentTime;
      s.gain.gain.cancelScheduledValues(now);
      s.gain.gain.setValueAtTime(s.gain.gain.value, now);
      s.gain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
      s.osc.stop(now + 0.06);
      s.extras.forEach(function (x) { try { x.stop(now + 0.06); } catch (e) {} });
    } catch (e) {}
    if (s.hooks.end) s.hooks.end(finished);
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sweep) stopSweep(null); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && sweep) stopSweep(null); });

  // ---------- Step 3: hear it ----------
  var hearChart = new Chart($("hear-chart"), { small: true });
  var hearBtn = $("hear-play");
  function renderHear() { hearChart.draw(chosen); }
  hearBtn.addEventListener("click", function () {
    if (sweep && sweep.hooks.from === "hear") { stopSweep(null); return; }
    var ok = playSweep(chosen, {
      from: "hear",
      tick: function (w) {
        hearChart.setPlayhead(w);
        var f = featureNear(chosen, w);
        $("hear-now").textContent = "Now playing: " + fmtUm(w) + " microns" + (f ? ". " + (f.kind === "dip" ? "Dip" : "Bump") + ": " + featureName(f) : "");
      },
      end: function (finished) {
        hearBtn.textContent = "Play the spectrum";
        hearChart.setPlayhead(null);
        $("hear-now").textContent = "";
        if (finished !== false) announce(finished ? "Finished playing." : "Stopped.");
        if (finished) { setGuide("hear", "h-heard"); progress("played"); }
      }
    });
    if (ok) { hearBtn.textContent = "Stop"; announce("Playing " + chosen.name + ", from the shortest colour to the longest."); }
  });
  function renderSoundKey(k, placeholder) {
    var ul = $("cr-sound-key");
    ul.textContent = "";
    var items = [k.pitch && k.pitch.meaning, k.loudness && k.loudness.meaning];
    if (k.cues) Object.keys(k.cues).forEach(function (n) { items.push(k.cues[n].meaning); });
    items.filter(Boolean).forEach(function (t) { var li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
    $("cr-key-practice").hidden = !placeholder;
    if (k.sweep_seconds) { var sp = $("cr-speed"); sp.min = k.sweep_seconds.min; sp.max = k.sweep_seconds.max; sp.value = k.sweep_seconds["default"]; applySpeed(); }
  }
  function soundOff(text) {
    [hearBtn, $("game-play")].forEach(function (b) { b.disabled = true; });
    var ul = $("cr-sound-key"); ul.textContent = "";
    var li = document.createElement("li"); li.textContent = text; ul.appendChild(li);
    // The game still works by looking.
    $("game-look").click();
  }

  // ---------- Step 4: name that spectrum ----------
  var ROUNDS = 3, game = { round: 0, right: 0, answer: null, done: false, queue: [] };
  var gameChart = new Chart($("game-chart"), { small: true, hideFeatures: true, mystery: true });
  var gamePlay = $("game-play"), gameLook = $("game-look"), choices = document.querySelectorAll(".game-choice");
  function gameIds() { return order.filter(function (id) { return specs[id].game !== false && (specs[id].kind === "ice-source" || specs[id].kind === "comet"); }); }
  function newGame() {
    var ids = gameIds();
    game = { round: 0, right: 0, answer: null, done: false, queue: [] };
    // Each kind comes up at least once in three rounds.
    for (var i = 0; i < ROUNDS; i++) game.queue.push(ids[i % ids.length]);
    for (var j = game.queue.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = game.queue[j]; game.queue[j] = game.queue[k]; game.queue[k] = t; }
    setGuide("game", "g-play");
    nextRound();
  }
  function nextRound() {
    stopSweep(false);
    game.round++;
    game.answer = specs[game.queue[game.round - 1]];
    $("game-round").textContent = "Round " + game.round + " of " + ROUNDS + (game.round > 1 ? " · " + game.right + " right so far" : "");
    $("game-result").textContent = "";
    $("game-result").className = "game-result";
    choices.forEach(function (b) { b.disabled = false; b.classList.remove("is-right", "is-wrong"); });
    $("game-next").hidden = true; $("game-again").hidden = true;
    gameChart.draw(game.answer);
  }
  function stopGame() { if (sweep && sweep.hooks.from === "game") stopSweep(false); }
  gamePlay.addEventListener("click", function () {
    if (sweep && sweep.hooks.from === "game") { stopSweep(null); return; }
    var ok = playSweep(game.answer, {
      from: "game", cues: true,
      tick: function (w) { gameChart.setPlayhead(w); },
      end: function (finished) { gamePlay.textContent = "Play the mystery spectrum"; gameChart.setPlayhead(null); if (finished !== false) announce(finished ? "Finished playing." : "Stopped."); }
    });
    if (ok) gamePlay.textContent = "Stop";
  });
  gameLook.addEventListener("click", function () {
    var box = $("game-look-box"), open = box.hidden;
    box.hidden = !open;
    gameLook.setAttribute("aria-expanded", open ? "true" : "false");
    gameLook.textContent = open ? "Hide the mystery graph" : "Show the mystery graph";
    if (open) requestAnimationFrame(function () { gameChart.draw(); });
  });
  choices.forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.disabled || !game.answer) return;
      stopSweep(false);
      var right = b.dataset.answer === game.answer.kind;
      if (right) game.right++;
      choices.forEach(function (c) {
        c.disabled = true;
        if (c.dataset.answer === game.answer.kind) c.classList.add("is-right");
        else if (c === b) c.classList.add("is-wrong");
      });
      var what = game.answer.name + (game.answer.kind === "comet" ? ", with its bumps" : ", with its dips");
      var res = $("game-result");
      res.className = "game-result " + (right ? "is-right" : "is-wrong");
      res.textContent = (right ? "Right! It was " : "Not this time: it was ") + what + ".";
      if (game.round < ROUNDS) { $("game-next").hidden = false; $("game-next").focus(); }
      else {
        res.textContent += " You named " + game.right + " of " + ROUNDS + ".";
        $("game-round").textContent = "All " + ROUNDS + " rounds played · " + game.right + " right";
        $("game-again").hidden = false;
        $("game-again").focus();
        setGuide("game", "g-done");
      }
    });
  });
  $("game-next").addEventListener("click", function () { nextRound(); gamePlay.focus(); });
  $("game-again").addEventListener("click", function () { newGame(); gamePlay.focus(); });

  // ---------- Start ----------
  var params = new URLSearchParams(window.location.search);
  var keyLoad = fetchJSON("data/sound-key.json").then(function (data) {
    if (!data || !data.spectrum || !data.spectrum.pitch || !data.spectrum.loudness) throw new Error("no spectrum section");
    key = data.spectrum;
    renderSoundKey(key, !!data.placeholder);
  }).catch(function () { soundOff("The sound key could not be loaded, so sound is off. The graphs and tables still work."); });
  if (!(window.AudioContext || window.webkitAudioContext)) soundOff("This browser cannot play sound here. The graphs and tables carry the same information.");

  fetchJSON("data/cryostella/index.json").then(function (idx) {
    // Kept in index.json's order, whichever file arrives first.
    return Promise.all((idx.targets || []).map(function (t) {
      return fetchJSON("data/cryostella/" + t.file).then(function (s) {
        s.points = (s.points || []).slice().sort(function (a, b) { return a.wavelength_um - b.wavelength_um; });
        s.features = s.features || [];
        return s.points.length ? s : null;
      }).catch(function () { return null; });
    })).then(function (list) {
      list.forEach(function (s) { if (s) { specs[s.id] = s; order.push(s.id); } });
    });
  }).then(function () {
    if (!order.length) throw new Error("no spectra");
    var want = params.get("target");
    chosen = specs[want] || specs[order[0]];
    renderPickers();
    var h = window.location.hash.replace(/^#/, "");
    showView(VIEWS.indexOf(h) >= 0 ? h : "colours", { focus: false, history: "replace" });
    renderRead();
    renderHear();
    newGame();
    return keyLoad;
  }).catch(function () {
    showView("colours", { focus: false });
    document.querySelectorAll(".cr-panel").forEach(function (p) {
      var m = document.createElement("p");
      m.className = "message";
      m.textContent = "The spectra could not be loaded. If you opened this file straight from your computer, please open it through a web server instead.";
      p.insertBefore(m, p.firstChild);
    });
  });
})();
