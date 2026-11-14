// Selene's step guide. On each of the three steps, Selene stands beside a small thought cloud
// that says what to do on this screen and offers the way to the next one. It is not a tour: it
// sits in the page, never covers anything and never pops up. Visitors can fold it away
// ("Hide tips") for the rest of this visit; it is back on the next visit.
//
// The words live in the page (viewer.html, cryostella.html), one block per small part of a step (data-when), so they can be
// edited without code. Which part shows is decided below, from what the visitor has done.
(function () {
  "use strict";

  var guides = Array.prototype.slice.call(document.querySelectorAll(".guide"));
  if (!guides.length) return;
  // Fill her pictures (the tour does this too; already-filled ones are skipped).
  if (window.Selene) window.Selene.mountAll();
  var root = document.documentElement;
  var KEY = "selenites-guide";
  // Another page (Cryostella) can drive its own guide: window.SELENITES_GUIDE = { state(view)
  // returns which part to show, nudge: { part: control to ring } }. It then sends
  // "selenites:guide" whenever the part may have changed.
  var CFG = window.SELENITES_GUIDE || null;
  var stage = document.getElementById("stage");
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(motionQuery && motionQuery.matches); }

  // ---------- folded or open ----------

  var folded = false;
  try { folded = sessionStorage.getItem(KEY) === "hidden"; } catch (e) {}
  function setFolded(on, focusFrom) {
    folded = on;
    root.classList.toggle("guide-folded", on);
    guides.forEach(function (g) {
      g.querySelector(".guide-open").setAttribute("aria-expanded", on ? "false" : "true");
    });
    try { sessionStorage.setItem(KEY, on ? "hidden" : "shown"); } catch (e) {}
    // Keep focus on the matching button of the same guide, so keyboard users are not lost.
    if (focusFrom) {
      var g = focusFrom.closest(".guide");
      var to = g && g.querySelector(on ? ".guide-open" : ".guide-hide");
      if (to) to.focus();
    }
    refresh(!on);
  }
  root.classList.toggle("guide-folded", folded);

  // ---------- Selene and the cloud ----------

  // A point on her hair just above her head, on the side of her raised hand (picture pixels),
  // the same point the tour uses.
  var HEAD = { x: 330, y: 62 };
  var DOTS = [{ t: 0.16, d: 7 }, { t: 0.43, d: 10 }, { t: 0.74, d: 14 }];

  guides.forEach(function (g, n) {
    var slot = g.querySelector(".guide-selene");
    g._selene = window.Selene && slot ? window.Selene.mount(slot) : null;
    g._bubble = g.querySelector(".guide-bubble");
    g._svg = g.querySelector(".guide-cloud");
    g._size = "";
    g.querySelector(".guide-hide").addEventListener("click", function (e) { setFolded(true, e.currentTarget); });
    g.querySelector(".guide-open").addEventListener("click", function (e) { setFolded(false, e.currentTarget); });
    if (window.ResizeObserver) new ResizeObserver(function () { draw(g); }).observe(g._bubble);
  });

  function draw(g) {
    var b = g._bubble, W = b.offsetWidth, H = b.offsetHeight;
    if (!W || !H || !window.SeleneCloud) return;
    if (g._size !== W + "x" + H) {
      g._size = W + "x" + H;
      var c = window.SeleneCloud.path(W, H);
      g._svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      g._svg.innerHTML =
        '<path class="cloud-glow" filter="url(#guide-blur)" d="' + c.d + '"/>' +
        '<path class="cloud-fill" fill="url(#guide-shine)" d="' + c.d + '"/>' +
        '<path class="cloud-edge" d="' + c.d + '"/>' +
        '<g>' + window.SeleneCloud.stickers(c.lobes, false) + '</g>';
    }
    trail(g);
  }

  // Three thought bubbles rising on a gentle arc from her head to the edge of the cloud.
  function trail(g) {
    var dots = g.querySelectorAll(".guide-trail i"), slot = g.querySelector(".guide-selene");
    var fig = g.querySelector(".guide-figure"), th = g.querySelector(".guide-thought");
    if (dots.length < 3 || !slot.offsetWidth) return;
    // Each guide (Selene, Iris) has her own picture, so her own head point.
    var ch = g._selene && g._selene.ch;
    var rig = ch ? ch.rig : { w: 632, h: 480 }, head = ch ? ch.head : HEAD;
    var sw = slot.offsetWidth, sh = slot.offsetHeight, s = Math.min(sw / rig.w, sh / rig.h);
    var hx = fig.offsetLeft + (sw - rig.w * s) / 2 + head.x * s;
    var hy = fig.offsetTop + (sh - rig.h * s) + head.y * s;
    var bh = g._bubble.offsetHeight;
    var cx = th.offsetLeft + 22, cy = Math.max(th.offsetTop + bh * 0.3, Math.min(hy - 18, th.offsetTop + bh - 40));
    var mx = (hx + cx) / 2, my = Math.min(hy, cy) - 18;
    for (var i = 0; i < 3; i++) {
      var t = DOTS[i].t, u = 1 - t;
      var st = dots[i].style;
      st.left = (u * u * hx + 2 * u * t * mx + t * t * cx).toFixed(1) + "px";
      st.top = (u * u * hy + 2 * u * t * my + t * t * cy).toFixed(1) + "px";
      st.width = st.height = DOTS[i].d + "px";
    }
  }

  // ---------- her voice ----------
  // The voice switch in each cloud plays the tip's recording (found by its words, see
  // js/selene.js). It is the same switch as the page's tour, so one choice covers both, and it
  // only shows once her recordings are found. The device's built-in voice is never used.
  var VOICE_KEY = (CFG && CFG.voiceKey) || "selenites-selene-voice";
  var voiceOn = false;
  try { voiceOn = localStorage.getItem(VOICE_KEY) === "on"; } catch (e) {}
  var voiceBtns = Array.prototype.slice.call(document.querySelectorAll(".guide-voice"));
  function showVoice() {
    voiceBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", voiceOn ? "true" : "false");
      var name = (b.textContent || "").trim();
      b.title = name + (voiceOn ? " is on" : " is off");
    });
  }
  voiceBtns.forEach(function (b) { b.hidden = true; });
  showVoice();
  if (window.Selene && window.Selene.voiceReady) window.Selene.voiceReady.then(function () {
    voiceBtns.forEach(function (b) {
      var g = b.closest(".guide"), slot = g && g.querySelector(".guide-selene");
      b.hidden = !window.Selene.hasVoice((slot && slot.getAttribute("data-character")) || "selene");
    });
  });
  voiceBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      voiceOn = !voiceOn;
      try { localStorage.setItem(VOICE_KEY, voiceOn ? "on" : "off"); } catch (e) {}
      showVoice();
      guides.forEach(function (g) { if (g._selene) g._selene.stop(); stopTyping(g); g.classList.remove("is-talking", "is-speaking"); });
      document.dispatchEvent(new CustomEvent("selenites:guide-voice", { detail: { on: voiceOn, key: VOICE_KEY } }));
      // Turned on: she says the current tip again, aloud.
      if (voiceOn) refresh(true);
    });
  });
  // Switched in the tour: the tips follow (they speak with the next tip).
  document.addEventListener("selenites:tour-voice", function (e) {
    if (!e.detail || e.detail.key !== VOICE_KEY) return;
    voiceOn = !!e.detail.on;
    showVoice();
  });

  // ---------- which part of the step, and what she says ----------
  // Each step is split into small parts, and Selene only moves on once the visitor has done the
  // part she asked for. Nothing moves the visitor on by itself.
  //   Step 1: "pick" (pick an example), then "picked" (press Next).
  //   Step 2: "empty" (nothing to show), "play" (press Play), "mark" (pause on a picture and
  //           mark it), then "next-saved", "next-unsaved" or "next-skip" (press Next).
  //   Step 3: one message.
  // While she asks for something, that control gets a ring (html[data-nudge], see app.css).
  var step1 = "pick", step2 = "play";
  // A permanent link (?target=) picks before this file loads: start from what is picked.
  var already = window.SelenitesApp && window.SelenitesApp.picked && window.SelenitesApp.picked();
  if (already) {
    step1 = "picked";
    document.querySelectorAll(".guide-picked").forEach(function (el) { el.textContent = already.name; });
    document.querySelectorAll(".guide-picked-note").forEach(function (el) {
      el.textContent = already.data ? "" : " Its pictures are not ready yet, so you may like Practice pictures instead.";
    });
  }
  var NUDGE = (CFG && CFG.nudge) || { "picked": "next", "play": "play", "mark": "mark", "next-saved": "guide-next", "next-unsaved": "guide-next", "next-skip": "guide-next" };

  function state(view) {
    if (CFG && CFG.state) return CFG.state(view);
    if (view === "choose") return step1;
    if (view === "watch") return stage && stage.dataset.state === "ready" ? step2 : "empty";
    return "";
  }

  function stopTyping(g) { if (g._typing) { g._typing.stop(); g._typing = null; } }

  function current() {
    var v = root.getAttribute("data-view");
    for (var i = 0; i < guides.length; i++) if (guides[i].dataset.guide === v) return guides[i];
    return null;
  }

  // Show the right part for this step; when it changes (or a new step opens) and she is on
  // screen, her lips move while the words appear (silently: the words are already there for
  // screen readers).
  function refresh(talk) {
    var g = current();
    var now = g ? state(g.dataset.guide) : "";
    if (!folded && NUDGE[now]) root.setAttribute("data-nudge", NUDGE[now]);
    else root.removeAttribute("data-nudge");
    if (!g) return;
    var changed = false;
    g.querySelectorAll("[data-when]").forEach(function (el) {
      var on = el.dataset.when.split(" ").indexOf(now) >= 0;
      if (el.hidden === on) changed = true;
      el.hidden = !on;
    });
    draw(g);
    if ((talk || changed) && !folded && g._selene && !reduced() && !root.classList.contains("is-touring")) {
      // The tip types in letter by letter while her lips move (laid out first, so nothing jumps).
      var p = Array.prototype.filter.call(g.querySelectorAll(".guide-text"), function (el) { return !el.closest("[hidden]"); })[0];
      if (!p) return;
      stopTyping(g);
      g._typing = window.SeleneType ? window.SeleneType(p) : null;
      if (g._typing) g._typing.start();
      g.classList.add("is-talking");
      g._selene.say(p.textContent, {
        // Her recorded voice, when the visitor has switched it on (off by default: it would
        // talk over a screen reader). The words on screen are the captions.
        voice: voiceOn,
        onSpeaking: function (on) { g.classList.toggle("is-speaking", on); },
        onReveal: function (n) { if (g._typing) g._typing.reveal(n); },
        onDone: function () { g.classList.remove("is-talking"); }
      });
    }
  }

  // Step 1: an example was picked. Her words name it.
  document.addEventListener("selenites:picked", function (e) {
    step1 = "picked";
    document.querySelectorAll(".guide-picked").forEach(function (el) { el.textContent = e.detail.name; });
    document.querySelectorAll(".guide-picked-note").forEach(function (el) {
      el.textContent = e.detail.ready ? "" : " Its pictures are not ready yet, so you may like Practice pictures instead.";
    });
    refresh(true);
  });
  // Step 2 was asked for before anything was picked: she says part 1 again.
  document.addEventListener("selenites:nudge", function () { refresh(true); });
  // Step 2: follow what the visitor does in the viewer.
  document.addEventListener("selenites:viewer", function (e) {
    var a = e.detail.action, was = step2;
    if (a === "loaded") step2 = "play";
    else if ((a === "play" || a === "move") && step2 === "play") step2 = "mark";
    else if (a === "marked") step2 = e.detail.saved ? "next-saved" : "next-unsaved";
    if (step2 !== was || a === "cleared") refresh(false);
  });
  // Not everyone wants to mark something: "Skip marking" goes straight to the last part.
  guides.forEach(function (g) {
    var skip = g.querySelector(".guide-skip");
    if (!skip) return;
    skip.addEventListener("click", function () {
      step2 = "next-skip";
      refresh(false);
      var next = g.querySelector('.guide-next[data-when~="next-skip"]');
      if (next) next.focus();
    });
  });

  document.addEventListener("selenites:guide", function (e) { refresh(!(e.detail && e.detail.quiet)); });
  document.addEventListener("selenites:view", function () {
    guides.forEach(function (g) { if (g !== current()) { if (g._selene) g._selene.stop(); stopTyping(g); } });
    // Wait a frame so the new step has its size before the cloud is drawn.
    requestAnimationFrame(function () { refresh(true); });
  });
  if (stage && window.MutationObserver) {
    new MutationObserver(function () { refresh(false); }).observe(stage, { attributes: true, attributeFilter: ["data-state"] });
  }
  guides.forEach(function (g) { g.querySelector(".guide-open").setAttribute("aria-expanded", folded ? "false" : "true"); });
  requestAnimationFrame(function () { refresh(true); });
})();
