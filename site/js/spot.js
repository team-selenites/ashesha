// Spot a candidate (spot-a-candidate.html): Selene teaches when a picture is worth marking as a
// candidate, in five steps. The cases, answers and their words live in
// data/spot-a-candidate/lessons.json, so the team can check and change them without code.
//
// Every picture here is drawn by this file from a few numbers: it is practice, not SPHEREx data,
// and the page says so. Nothing moves or plays by itself, there is no timer, and every picture
// has a sentence in words. Selene's tip on each step changes as the visitor does each part
// (js/guide.js shows the part that SELENITES_GUIDE.state() names).
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  root.classList.add("has-views");
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(motionQuery && motionQuery.matches); }
  function announce(text) { var l = $("sp-live"); l.textContent = ""; setTimeout(function () { l.textContent = text; }, 30); }
  function seeded(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ---------- Selene's tips: which part of each step she is on ----------
  var guideState = { what: "w-ask", signs: "s-look", traps: "t-ask", practice: "p-play", viewer: "v-read" };
  var VOICE_KEY = "selenites-selene-voice", voiceOn = false;
  try { voiceOn = localStorage.getItem(VOICE_KEY) === "on"; } catch (e) {}
  window.SELENITES_GUIDE = {
    state: function (view) { return guideState[view] || ""; },
    // While Selene asks for something, that part of the page has a still ring (css/spot.css).
    nudge: { "w-ask": "what-choices", "w-done": "guide-next", "s-look": "signs-pick", "s-done": "guide-next",
      "t-ask": "traps-choices", "t-done": "guide-next", "p-play": "practice-choices", "p-done": "guide-next" },
    voice: function () { return voiceOn; }
  };
  function setGuide(view, state) {
    if (guideState[view] === state) return;
    guideState[view] = state;
    document.dispatchEvent(new CustomEvent("selenites:guide"));
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
    // Turned on: she says the current tip again, aloud.
    if (voiceOn) document.dispatchEvent(new CustomEvent("selenites:guide"));
  });

  // ---------- Steps: one screen at a time ----------
  var VIEWS = ["what", "signs", "traps", "practice", "viewer"];
  var TITLES = { what: "What a candidate is", signs: "Signs to look for", traps: "Traps", practice: "Practice", viewer: "In the sky viewer" };
  var SITE_TITLE = "Spot a candidate · Ashesha";
  var viewEls = document.querySelectorAll("main > .view");
  var stepLinks = document.querySelectorAll("#steps a[data-view]");
  var currentView = null;

  function showView(name, opts) {
    opts = opts || {};
    if (VIEWS.indexOf(name) < 0) name = "what";
    var changed = name !== currentView;
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
      // Pictures are drawn once the step is on screen (it is, now that hidden is off).
      redrawVisible();
      document.dispatchEvent(new CustomEvent("selenites:view", { detail: { view: name } }));
    }
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[data-view]") : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    showView(a.dataset.view, { history: "push" });
  });
  window.addEventListener("popstate", function () {
    var h = window.location.hash.replace(/^#/, "");
    showView(VIEWS.indexOf(h) >= 0 ? h : "what", { focus: true });
  });

  // ---------- Drawing a practice picture ----------
  // Made to look like the pipeline's own pictures (pipeline/build_stacks.py, save_png): a cutout
  // of 41 by 41 pixels, every pixel noisy, each picture stretched on its own (zscale-like range,
  // asinh stretch) and coloured with matplotlib's "magma" scale, with a cyan dashed circle at the
  // chosen position. Masked pixels are holes (drawn white, as matplotlib leaves them), and a few
  // cold pixels are black. The numbers come from lessons.json, so every answer is known.
  var PIX = 41, SCALE = 8, SIDE = PIX * SCALE;
  // matplotlib "magma", sampled at 11 points (0 to 1) and blended in between.
  var MAGMA = [[0, 0, 4], [20, 14, 54], [59, 15, 112], [100, 26, 128], [140, 41, 129], [183, 55, 121],
    [222, 73, 104], [247, 112, 92], [254, 159, 109], [254, 207, 146], [252, 253, 191]];
  function magma(t) {
    t = Math.max(0, Math.min(1, t)) * (MAGMA.length - 1);
    var i = Math.min(MAGMA.length - 2, Math.floor(t)), u = t - i, a = MAGMA[i], b = MAGMA[i + 1];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }
  function gauss(R) { var u = 1 - R(), v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function asinh(x) { return Math.log(x + Math.sqrt(x * x + 1)); }

  // The pixel values of one picture, in units of the noise (1 = one sigma).
  function pixels(scene, f) {
    var pic = scene.pictures[f], field = pic.field || 1;
    var img = new Float64Array(PIX * PIX), mask = new Uint8Array(PIX * PIX);
    function add(px, py, amp, sig) {
      for (var y = Math.max(0, Math.floor(py - 4 * sig)); y <= Math.min(PIX - 1, Math.ceil(py + 4 * sig)); y++) {
        for (var x = Math.max(0, Math.floor(px - 4 * sig)); x <= Math.min(PIX - 1, Math.ceil(px + 4 * sig)); x++) {
          var d2 = (x - px) * (x - px) + (y - py) * (y - py);
          img[y * PIX + x] += amp * Math.exp(-d2 / (2 * sig * sig));
        }
      }
    }
    // Noise is new in every picture (its own seed); the background stars are the same in all.
    var N = seeded((scene.seed || 1) * 97 + f * 7919 + 13);
    for (var k = 0; k < img.length; k++) img[k] = gauss(N);
    var S = seeded(scene.seed || 1);
    var nStars = 6 + Math.floor(S() * 5);
    for (var s = 0; s < nStars; s++) {
      var sx = 2 + S() * (PIX - 4), sy = 2 + S() * (PIX - 4);
      // Keep the chosen position's circle clear of background stars, so the lesson is clear.
      var dx = sx - PIX / 2, dy = sy - PIX / 2, dist = Math.hypot(dx, dy) || 1;
      if (dist < 10) { sx = PIX / 2 + dx / dist * 10; sy = PIX / 2 + dy / dist * 10; }
      add(sx, sy, (3 + Math.pow(S(), 2) * 40) * field, 0.9 + S() * 0.4);
    }
    (scene.objects || []).forEach(function (o) {
      var b = o.b[f] || 0;
      if (b <= 0) return;
      var ox = o.x[f] / 100 * (PIX - 1), oy = o.y[f] / 100 * (PIX - 1);
      // A blip is one hot pixel; a star is a soft blob a few pixels across.
      if (o.kind === "blip") img[Math.round(oy) * PIX + Math.round(ox)] += 60 * b;
      else add(ox, oy, 28 * b * field, 1.15);
    });
    // A few cold pixels, different in each picture.
    for (var c = 0; c < 4; c++) img[Math.floor(N() * img.length)] = -8;
    if (pic.masked) {
      var m = pic.masked;
      for (var my = Math.round(m[1] / 100 * (PIX - 1)); my <= Math.round(m[3] / 100 * (PIX - 1)); my++)
        for (var mx = Math.round(m[0] / 100 * (PIX - 1)); mx <= Math.round(m[2] / 100 * (PIX - 1)); mx++) {
          // Real masks are patchy: some pixels in the box, not all of them.
          if (N() < 0.5) mask[my * PIX + mx] = 1;
        }
    }
    return { img: img, mask: mask };
  }

  // Each picture is stretched on its own, as the pipeline does: the range follows this picture's
  // own background and brightest pixel, so two pictures of the same sky can look quite different.
  function stretch(img, mask) {
    var vals = [];
    for (var k = 0; k < img.length; k++) if (!mask[k]) vals.push(img[k]);
    vals.sort(function (a, b) { return a - b; });
    var med = vals[vals.length >> 1], peak = vals[vals.length - 1];
    var dev = vals.map(function (v) { return Math.abs(v - med); }).sort(function (a, b) { return a - b; });
    var sig = 1.4826 * dev[dev.length >> 1] || 1;
    var lo = med - 2 * sig, hi = med + 3 * sig + 0.12 * Math.max(0, peak - med - 3 * sig);
    return function (v) { var x = Math.max(0, Math.min(1, (v - lo) / (hi - lo))); return asinh(x / 0.1) / asinh(1 / 0.1); };
  }

  function drawFrame(canvas, scene, f, ring) {
    if (canvas.width !== SIDE || canvas.height !== SIDE) { canvas.width = SIDE; canvas.height = SIDE; }
    var ctx = canvas.getContext("2d");
    var p = pixels(scene, f), st = stretch(p.img, p.mask);
    var small = document.createElement("canvas"); small.width = small.height = PIX;
    var sctx = small.getContext("2d"), data = sctx.createImageData(PIX, PIX);
    for (var y = 0; y < PIX; y++) {
      for (var x = 0; x < PIX; x++) {
        // Positions in lessons.json count from the top-left corner, so rows are drawn top down.
        var k = y * PIX + x, o = k * 4;
        var rgb = p.mask[k] ? [255, 255, 255] : magma(st(p.img[k]));
        data.data[o] = rgb[0]; data.data[o + 1] = rgb[1]; data.data[o + 2] = rgb[2]; data.data[o + 3] = 255;
      }
    }
    sctx.putImageData(data, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, SIDE, SIDE);
    // The chosen position: a cyan dashed circle, as in the pipeline's pictures.
    var cx = (scene.target[0] / 100 * (PIX - 1) + 0.5) * SCALE, cy = (scene.target[1] / 100 * (PIX - 1) + 0.5) * SCALE;
    ctx.strokeStyle = "#00FFFF"; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, 4 * SCALE, 0, Math.PI * 2); ctx.stroke();
    // While teaching: a rounded square round the place to look (not a circle, so it is never
    // mistaken for the pipeline's own mark). Black under white shows on every colour.
    if (ring && scene.look) {
      var lx = (scene.look[0] / 100 * (PIX - 1) + 0.5) * SCALE, ly = (scene.look[1] / 100 * (PIX - 1) + 0.5) * SCALE;
      var r = scene.look[2] / 100 * SIDE;
      ctx.setLineDash([10, 6]);
      [["#000000", 5], [tone("--sp-ring", "#FFFFFF"), 2.5]].forEach(function (pen) {
        ctx.strokeStyle = pen[0]; ctx.lineWidth = pen[1];
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(lx - r, ly - r, 2 * r, 2 * r, r * 0.35); else ctx.rect(lx - r, ly - r, 2 * r, 2 * r);
        ctx.stroke();
      });
    }
    ctx.setLineDash([]);
  }
  function tone(name, fallback) { var v = getComputedStyle(root).getPropertyValue(name).trim(); return v || fallback; }

  function micronsText(m) { return Number(m).toFixed(1) + " µm"; }
  // A row of pictures, oldest first, each with its date and colour underneath. The canvases are
  // decoration for screen readers: the row's sentence (scene.words) says the same in words.
  function renderFrames(box, scene, ring) {
    box.replaceChildren();
    box.style.setProperty("--n", scene.pictures.length);
    var sameColour = scene.pictures.every(function (p) { return p.microns === scene.pictures[0].microns; });
    scene.pictures.forEach(function (p, f) {
      var fig = document.createElement("figure"); fig.className = "sp-frame";
      var c = document.createElement("canvas"); c.setAttribute("aria-hidden", "true");
      c._draw = function () { drawFrame(c, scene, f, ring); };
      var cap = document.createElement("figcaption");
      cap.innerHTML = '<span class="sp-n">Picture ' + (f + 1) + "</span>" +
        '<span class="sp-date">' + p.date + "</span>" +
        '<span class="sp-um' + (sameColour ? "" : " is-different") + '">Colour ' + micronsText(p.microns) + "</span>" +
        (p.status ? '<span class="sp-flag"><span class="glyph glyph-xs unmeasured" aria-hidden="true"></span>' + p.status + "</span>" : "");
      fig.appendChild(c); fig.appendChild(cap);
      box.appendChild(fig);
    });
    if (box.offsetParent) redraw(box);
  }
  function redraw(box) { box.querySelectorAll("canvas").forEach(function (c) { if (c._draw) c._draw(); }); }
  function redrawVisible() { document.querySelectorAll("main > .view:not([hidden]) .sp-frames").forEach(redraw); }
  // Theme changes recolour the marks.
  if (window.MutationObserver) new MutationObserver(redrawVisible).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  // ---------- Step 1: what a candidate is ----------
  function stepWhat(check) {
    $("what-q").textContent = check.question;
    var box = $("what-choices"), result = $("what-result");
    check.choices.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "sp-choice sp-choice-wide"; b.textContent = c.text;
      b.addEventListener("click", function () {
        box.querySelectorAll(".sp-choice").forEach(function (x) { x.classList.remove("is-right", "is-wrong"); x.removeAttribute("aria-describedby"); });
        b.classList.add(c.right ? "is-right" : "is-wrong");
        b.setAttribute("aria-describedby", "what-result");
        result.textContent = c.why;
        result.className = "sp-result " + (c.right ? "is-right" : "is-wrong");
        if (c.right) { $("what-rules").hidden = false; setGuide("what", "w-done"); }
      });
      box.appendChild(b);
    });
  }

  // ---------- Steps 2 and 3: a case picker over a row of pictures ----------
  function casePicker(opts) {
    var pick = $(opts.prefix + "-pick"), seen = {}, current = null;
    var buttons = opts.cases.map(function (c, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "sp-case";
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = '<span class="sp-case-n" aria-hidden="true">' + (i + 1) + '</span><span class="sp-case-t">' + c.title + '</span><span class="sp-case-tick" aria-hidden="true"></span><span class="sr-only sp-case-state"></span>';
      b.addEventListener("click", function () { open(i); });
      pick.appendChild(b);
      return b;
    });
    function open(i) {
      current = opts.cases[i];
      buttons.forEach(function (b, k) { b.setAttribute("aria-pressed", k === i ? "true" : "false"); });
      $(opts.prefix + "-title").textContent = current.title;
      renderFrames($(opts.prefix + "-frames"), current, true);
      $(opts.prefix + "-words").textContent = current.words;
      if (opts.onOpen) opts.onOpen(current, i);
    }
    function done(i) {
      seen[i] = true;
      buttons[i].classList.add("is-done");
      buttons[i].querySelector(".sp-case-state").textContent = ", done";
      return Object.keys(seen).length === opts.cases.length;
    }
    open(0);
    return { done: done, open: open, current: function () { return current; }, count: function () { return Object.keys(seen).length; } };
  }

  function stepSigns(signs) {
    var picker = casePicker({
      prefix: "signs", cases: signs,
      onOpen: function (c, i) {
        $("signs-lesson").textContent = c.lesson;
        // Opening a sign counts as seeing it.
        if (picker && picker.done(i)) setGuide("signs", "s-done");
      }
    });
    if (picker.done(0) && signs.length === 1) setGuide("signs", "s-done");
  }

  function stepTraps(traps) {
    var answered = {}, result = $("traps-result"), choices = $("traps-choices").querySelectorAll(".sp-choice");
    var picker = casePicker({
      prefix: "traps", cases: traps,
      onOpen: function (c, i) {
        // Each trap keeps the visitor's decision, so going back shows it again.
        choices.forEach(function (b) { b.classList.remove("is-right", "is-wrong"); });
        result.textContent = ""; result.className = "sp-result";
        $("traps-real").hidden = true;
        if (answered[i]) show(c, answered[i]);
      }
    });
    function show(c, chose) {
      choices.forEach(function (b) {
        b.classList.toggle("is-right", b.dataset.answer === c.answer);
        b.classList.toggle("is-wrong", b.dataset.answer === chose && chose !== c.answer);
      });
      var good = chose === c.answer;
      result.className = "sp-result " + (good ? "is-right" : "is-wrong");
      result.textContent = (good ? "Good call: wait. " : "Careful: this one is a trap. ") + c.lesson;
      showReal(c.real);
    }
    // The same trap in real SPHEREx pictures: the pipeline's own PNGs, with their labels.
    function showReal(real) {
      var box = $("traps-real");
      if (!real || !real.images || !real.images.length) { box.hidden = true; return; }
      $("traps-real-h").textContent = real.title;
      $("traps-real-text").textContent = real.text;
      var imgs = $("traps-real-imgs");
      imgs.replaceChildren();
      imgs.style.setProperty("--n", real.images.length);
      real.images.forEach(function (im) {
        var fig = document.createElement("figure"); fig.className = "sp-realcase-fig";
        var img = document.createElement("img");
        img.src = im.src; img.alt = im.alt; img.width = 400; img.height = 404; img.loading = "lazy";
        var cap = document.createElement("figcaption"); cap.textContent = im.label;
        fig.appendChild(img); fig.appendChild(cap); imgs.appendChild(fig);
      });
      box.hidden = false;
    }
    choices.forEach(function (b) {
      b.addEventListener("click", function () {
        var c = picker.current(), i = traps.indexOf(c);
        answered[i] = b.dataset.answer;
        show(c, b.dataset.answer);
        if (picker.done(i)) setGuide("traps", "t-done");
      });
    });
  }

  // ---------- Step 4: practice rounds ----------
  function stepPractice(rounds) {
    var at = 0, right = 0, answered = false;
    var result = $("practice-result"), nextBtn = $("practice-next"), againBtn = $("practice-again");
    var choices = $("practice-choices").querySelectorAll(".sp-choice");
    function show() {
      var r = rounds[at];
      answered = false;
      $("practice-round").textContent = "Round " + (at + 1) + " of " + rounds.length + (at ? " · " + right + " right so far" : "");
      renderFrames($("practice-frames"), r, false);
      $("practice-words").textContent = r.words;
      choices.forEach(function (b) { b.disabled = false; b.classList.remove("is-right", "is-wrong"); });
      result.textContent = ""; result.className = "sp-result";
      nextBtn.hidden = true; againBtn.hidden = true;
    }
    choices.forEach(function (b) {
      b.addEventListener("click", function () {
        if (answered) return;
        answered = true;
        var r = rounds[at], good = b.dataset.answer === r.answer;
        if (good) right++;
        choices.forEach(function (x) {
          x.disabled = true;
          x.classList.toggle("is-right", x.dataset.answer === r.answer);
          x.classList.toggle("is-wrong", x === b && !good);
        });
        result.className = "sp-result " + (good ? "is-right" : "is-wrong");
        result.textContent = (good ? "Yes! " : "Not this time. ") + r.why;
        var last = at === rounds.length - 1;
        if (last) {
          result.textContent += " That's all " + rounds.length + " rounds: " + right + " right. " +
            (right === rounds.length ? "Perfect!" : right >= rounds.length - 1 ? "Very good!" : "Every round teaches something.");
          againBtn.hidden = false;
          setGuide("practice", "p-done");
          againBtn.focus();
        } else {
          nextBtn.hidden = false;
          nextBtn.focus();
        }
      });
    });
    nextBtn.addEventListener("click", function () { at++; show(); choices[0].focus(); });
    againBtn.addEventListener("click", function () { at = 0; right = 0; show(); choices[0].focus(); });
    show();
  }

  // ---------- Step 5: the checks, and whether saving is on ----------
  function stepViewer() {
    var boxes = document.querySelectorAll(".sp-checks input"), out = $("viewer-checks-out");
    boxes.forEach(function (b) {
      b.addEventListener("change", function () {
        var n = Array.prototype.filter.call(boxes, function (x) { return x.checked; }).length;
        out.textContent = n === boxes.length ? "All four checks done. If it still looks interesting, mark it!" : n ? n + " of " + boxes.length + " checks done." : "";
      });
    });
    // Saving belongs to the My candidates module (Shrashti). Say honestly whether it is here.
    var saving = $("viewer-saving");
    fetch("js/mark-candidate.js", { method: "HEAD", cache: "no-cache" }).then(function (r) {
      saving.textContent = r.ok
        ? "Saving is switched on: your marked pictures are kept in My candidates."
        : "Saving is not switched on in this version yet. You can still practise marking, but the picture is not kept.";
      saving.classList.toggle("is-off", !r.ok);
    }).catch(function () {
      saving.textContent = "Saving is not switched on in this version yet. You can still practise marking, but the picture is not kept.";
      saving.classList.add("is-off");
    });
  }

  var resizeTimer = 0;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(redrawVisible, 120); });

  // ---------- Start ----------
  var h0 = window.location.hash.replace(/^#/, "");
  fetch("data/spot-a-candidate/lessons.json", { cache: "no-cache" }).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function (data) {
    stepWhat(data.check);
    stepSigns(data.signs);
    stepTraps(data.traps);
    stepPractice(data.rounds);
    stepViewer();
    showView(VIEWS.indexOf(h0) >= 0 ? h0 : "what", { focus: false, history: "replace" });
    if (data.answers_checked === false) {
      var note = document.querySelector(".sp-practice-note");
      if (note) note.textContent += " The answers are a draft that the team is still checking.";
    }
  }).catch(function () {
    showView("what", { focus: false });
    document.querySelectorAll(".sp-panel").forEach(function (p) {
      var m = document.createElement("p");
      m.className = "message";
      m.textContent = "The lessons could not be loaded. If you opened this file straight from your computer, please open it through a web server instead.";
      p.insertBefore(m, p.firstChild);
    });
  });
})();
