// Guided tour with Selene, our guide character.
// It only starts when a visitor asks for it (header button or the button in the empty viewer).
// A tour that pops up by itself is disorienting for screen reader users and slows down anyone
// who already knows the tool, so it never opens on its own.
//
// How it is built (learned from tour libraries such as Driver.js and coach-mark guidelines):
// - The spotlight and the card are pinned to the page (not the screen), so they stay exactly on
//   their part while the page scrolls. Step changes run in order: card out, spotlight glides
//   while the page scrolls, card in, then Selene talks.
// - The card sits beside the part it explains, with thought bubbles rising from Selene to it, and
//   never on top of it. On phones it becomes a sheet on whichever side of the screen is free.
// - The card keeps the same width on every step; the space for the words is reserved before they
//   type out, so the card never grows while Selene speaks.
// - It walks through the site page by page, in the order a visitor uses it: a welcome, then
//   step 1 (every part of it), then step 2, then step 3. At the end of each page Selene asks the
//   visitor to click the way on themselves (pick Practice pictures, then "Watch it change", then
//   "My candidates" in the step bar); the tour waits for that real click and carries on.
// - It behaves as a modal dialog: everything outside it is made inert (no clicks, no focus), so
//   focus stays in the tour, Escape closes it, and each step is read out. On a "your turn" step
//   only the highlighted control is left usable, so that is the one thing that can be clicked.
(function () {
  "use strict";

  // Each page's tour is led by its own guide (Selene on Home and the sky viewer, Iris in
  // Cryostella), with her own voice setting and recordings. The page's config names them.
  var CFG0 = window.SELENITES_TOUR || {};
  var GUIDE = CFG0.guide || "selene", GUIDE_NAME = CFG0.guideName || "Selene";
  var SEEN_KEY = "selenites-tour-seen" + (CFG0.page ? "-" + CFG0.page : ""), VOICE_KEY = CFG0.voiceKey || "selenites-selene-voice", CONTINUE_KEY = "selenites-tour-continue";
  // Recorded voice lines are found by their words (assets/voice/manifest.json, read by
  // js/selene.js), so computed lines can have recordings too. A line without one is silent.
  // Set to true once the animated clips are in site/assets/selene/ as selene-tour-<step id>.mp4
  // (Selene talking on a flat green background, with her voice in the clip).
  // See docs/selene-animation-recipe.md.
  var ANIMATED = false;

  function $(id) { return document.getElementById(id); }
  var dialog = $("tour");
  var openers = document.querySelectorAll(".tour-open");
  if (!dialog || typeof dialog.show !== "function" || !("inert" in HTMLElement.prototype)) {
    for (var k = 0; k < openers.length; k++) openers[k].hidden = true;
    return;
  }
  var card = $("tour-card"), bubble = $("tour-bubble"), spot = $("tour-spot");
  var stepEl = $("tour-step"), titleEl = $("tour-title"), textEl = $("tour-text");
  var ghostEl = $("tour-ghost");
  // A step can show a picture in the cloud above its words (media: an HTML string, or a function
  // returning one). The home tour shows the Ashesha logo there. It plays its animation once the
  // card has appeared (the class is-play), not while the card is still out of sight.
  var mediaEl = $("tour-media");
  // The words type in letter by letter, laid out first so nothing jumps (js/cloud.js).
  var typer = window.SeleneType(ghostEl);
  // In a step's words, [name] marks the control to click: it is highlighted in the cloud, and
  // read and spoken as plain text.
  function plain(text) { return text.replace(/\[([^\]]+)\]/g, "$1"); }
  function markup(text) {
    var esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return esc.replace(/\[([^\]]+)\]/g, '<mark class="tour-key">$1</mark>');
  }
  function layWords(text) { typer.stop(); ghostEl.innerHTML = markup(text); typer.start(); }
  var back = $("tour-back"), next = $("tour-next"), skip = $("tour-skip"), voiceBtn = $("tour-voice"), skipPart = $("tour-skip-part");
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(motionQuery && motionQuery.matches); }

  // The words are Selene's. Plain language, honest about practice data, no "discoveries".
  // page: 0 welcome, 1 to 3 the site's steps. view: the screen the step is on.
  // action: a "your turn" step. The visitor clicks the highlighted control themselves and the
  // tour carries on once that has happened (picked: an example was picked; view: a step opened).
  // A page can bring its own tour: set window.SELENITES_TOUR = { page, steps, label(step, k, n),
  // continueAt } before this file loads (the home page does). Without it, this is the sky
  // viewer's tour below.
  var CFG = window.SELENITES_TOUR || null;
  var PAGES = ["Welcome", "Choose a patch of sky", "Watch it change", "My candidates"];
  var DEFAULT_STEPS = [
    { id: "welcome", page: 0, welcome: true, title: "Hi, I'm Selene",
      text: "Welcome to the sky viewer. It shows every picture the SPHEREx space telescope took of one patch of sky, in date order, so you can spot things that move or change. I'll walk you through it one page at a time, and you'll do the clicking.",
      next: "Start the tour" },
    { id: "steps", page: 0, view: "choose", target: "#steps", title: "Three steps",
      text: "The sky viewer works in three steps, and this bar always shows which one you are on: choose a patch of sky, watch it change, then your candidates. Step 2 opens once you have picked something." },

    { id: "examples", page: 1, view: "choose", target: "#examples", title: "Pick a patch of sky",
      text: "Each card is a patch of sky prepared in advance. The headline one is comet 3I/ATLAS, a visitor from another star system. The others are nearby stars and brown dwarfs that move, or stars whose brightness changes. Cards marked Pictures not ready yet are still waiting for their SPHEREx data." },
    { id: "practice", page: 1, view: "choose", target: ".li-practice", title: "Practice pictures",
      text: "The last card holds practice pictures: made-up pictures for trying the viewer. They are not SPHEREx data, and the page always says so." },
    { id: "next-bar", page: 1, view: "choose", target: "#choose-next", title: "Pick, then press Next",
      text: "When you pick a card it is marked Selected, and this bar says what you picked. Nothing opens until you press Next, so you can change your mind first." },
    { id: "search", page: 1, view: "choose", target: ".p-search", title: "Or type a position",
      text: "If you know where to look, you can type a position in the sky here, as right ascension and declination. Live search is not ready yet, so for now the cards are the way in." },
    { id: "tips", page: 1, view: "choose", target: '.guide[data-guide="choose"] .guide-thought', title: "My tips",
      text: "On every page I leave a short tip that says what to do next. If you don't need them, press Hide tips." },
    { id: "do-pick", page: 1, view: "choose", target: '.example[data-id="practice"]', title: "Your turn: pick Practice pictures",
      text: "Click [Practice pictures] now. I'll use them to show you the viewer.",
      action: { event: "selenites:picked", id: "practice" } },
    { id: "do-watch", page: 1, view: "choose", target: '#steps a[data-view="watch"]', title: "Your turn: open step 2",
      text: "Practice pictures is selected. Now click [Watch it change] in the step bar to move on to step 2.",
      action: { event: "selenites:view", view: "watch" } },

    { id: "stage", page: 2, view: "watch", target: "#stage", prepare: ensureLoaded, title: "This is the picture",
      text: "Every picture shows the same patch of sky. The small cross marks the position you chose: it is a pointer, not a discovery. The corners show the picture's number, status, date and colour. These are practice pictures, not real SPHEREx data." },
    { id: "mark", page: 2, view: "watch", target: "#v-mark", prepare: ensureLoaded, title: "Mark as candidate",
      text: "If a picture is worth another look, press Mark as candidate. A candidate is something to check again, not a discovery. The line beside the button says which picture you would mark." },
    { id: "timeline", page: 2, view: "watch", target: "#viewer .timeline", prepare: ensureLoaded, title: "The timeline",
      text: "Each mark is one picture, placed by its real date, so a gap in time shows as a gap. Its shape tells you what was seen: a solid disc is a clear detection, a half ring is faint, a plain ring is not detected and a dashed ring means no picture." },
    { id: "play", page: 2, view: "watch", target: "#viewer .t-buttons", prepare: ensureLoaded, title: "Play and step",
      text: "Press Play to watch the pictures in date order. It stops at the last one. The arrows step one picture at a time, or jump to the first and the last." },
    { id: "more-open", page: 2, view: "watch", target: "#v-more > summary", prepare: moreClosed, skipTo: "tabs-about",
      title: "Your turn: open More controls",
      text: "Some controls are tucked away to keep the screen calm. Click [More controls] to see them. If you don't need them now, choose Skip this part.",
      action: { on: "click" } },
    { id: "more-goto", page: 2, view: "watch", target: "#v-goto", prepare: moreOpen, skipTo: "tabs-about", title: "Go to a picture",
      text: "Type a picture's number here and press Go, or Enter, to jump straight to it. Handy when you want to look at one picture again." },
    { id: "more-speed", page: 2, view: "watch", target: "#viewer .t-speed", prepare: moreOpen, skipTo: "tabs-about", title: "Speed",
      text: "Speed sets how fast Play moves through the pictures: Slow, Normal or Fast. It changes straight away, even while playing." },
    { id: "more-compare", page: 2, view: "watch", target: "#v-compare", prepare: moreOpen, skipTo: "tabs-about", title: "Compare two",
      text: "Compare two lays two pictures on top of each other. Choose a Then picture and a Now picture, then drag the divider across, or use the arrow keys. Each picture is a different colour, so a change in brightness is not always a real change." },
    { id: "more-labels", page: 2, view: "watch", target: "#v-overlay", prepare: moreOpen, title: "Labels",
      text: "Labels shows or hides the words in the corners of the picture: its number, status, date and colour. Hide them for a clear view of the sky." },
    { id: "tabs-about", page: 2, view: "watch", narrow: true, arrow: false, nextToo: true, spot: "#inspector", target: "#tab-colour", prepare: tabOpen("about"), skipTo: "strip",
      title: "Look closer: About",
      text: "These four tabs hold the facts. About, open now, explains this target and what each shape means. Click [Colour] to open the next tab, or press Next.",
      action: { on: "click" } },
    { id: "tabs-colour", page: 2, view: "watch", narrow: true, arrow: false, nextToo: true, spot: "#inspector", target: "#tab-details", prepare: tabOpen("colour"), skipTo: "strip",
      title: "Colour",
      text: "SPHEREx sees infrared colours our eyes cannot. Drag along this bar to move through them. Each mark is one picture, and the sentence underneath says what was seen at that colour. Click [Details] next.",
      action: { on: "click" } },
    { id: "tabs-details", page: 2, view: "watch", narrow: true, arrow: false, nextToo: true, spot: "#inspector", target: "#tab-table", prepare: tabOpen("details"), skipTo: "strip",
      title: "Details",
      text: "Details describes the picture on screen: its date, colour, status, position and a link to it in the archive. Click [Table] next.",
      action: { on: "click" } },
    { id: "tabs-table", page: 2, view: "watch", narrow: true, target: "#inspector", prepare: tabOpen("table"), title: "Table",
      text: "Table lists every picture, one row each, with its date, colour, status and brightness. Screen readers can read it row by row and column by column." },
    { id: "strip", page: 2, view: "watch", target: "#strip-section", prepare: ensureLoaded, title: "Then and Now strip",
      text: "Here are all the pictures side by side, each with its date and status. Pick one to jump straight to it." },
    { id: "do-candidates", page: 2, view: "watch", target: '#steps a[data-view="my-candidates"]', title: "Your turn: open step 3",
      text: "That's the viewer. Now click [My candidates] in the step bar to see where your marked pictures go.",
      action: { event: "selenites:view", view: "my-candidates" } },

    { id: "candidates", page: 3, view: "my-candidates", target: "#mc-root", title: "Your candidates",
      text: "Pictures you mark as candidates are listed here. They are saved in this browser only, and a candidate is a picture worth another look, not a discovery." },
    { id: "again", page: 3, view: "my-candidates", target: '.guide[data-guide="my-candidates"] .guide-thought', title: "Explore more sky",
      text: "When you want more sky, go back to step 1 and pick another example. The step bar takes you to any step you have opened." },
    { id: "themes", page: 3, target: "#themes", title: "Make it yours",
      text: "Last thing: switch between Light, Dark and Colour-blind friendly here. Everything works with a keyboard and a screen reader too. Enjoy exploring!",
      next: "Finish" }
  ];
  var STEPS = CFG && CFG.steps ? CFG.steps : DEFAULT_STEPS;

  // Set the viewer up for a step: More controls closed (so the visitor opens it) or open, and
  // one tab chosen. Each waits for the pictures first.
  function moreClosed() { return ensureLoaded().then(function () { $("v-more").open = false; }); }
  function moreOpen() { return ensureLoaded().then(function () { $("v-more").open = true; }); }
  function tabOpen(name) {
    return function () {
      return ensureLoaded().then(function () {
        if (window.SelenitesViewer && window.SelenitesViewer.selectTab) window.SelenitesViewer.selectTab(name);
      });
    };
  }

  // A page's tour can fit itself to what is on screen (Iris's tour names the spectrum that is
  // open). These are optional on any step:
  //   text: a function returning the words, worked out when the step is shown
  //   target: a function returning the selector
  //   when: a function; the step is passed over while it returns false (a challenge with nothing
  //     to find, or the optional walk through the other spectra once all are seen)
  //   skipTo: a step id, or "next" for just the following step
  function val(v) { return typeof v === "function" ? v() : v; }
  function shown(i) { var w = STEPS[i] && STEPS[i].when; return !w || !!w(); }
  // The nearest step from n, in direction dir, that applies now; -1 if there is none.
  function nearest(n, dir) {
    for (var i = n; i >= 0 && i < STEPS.length; i += dir) if (shown(i)) return i;
    return -1;
  }

  // Where this step sits: "Step 2 of 3 · Part 3 of 8". The count is the steps already shown on
  // this run plus those ahead that apply now, so it never runs backwards when a later choice
  // turns an earlier step off (a challenge that a comet with no marks does not have).
  var passed = {};
  function label(i) {
    var st = STEPS[i], same = STEPS.filter(function (x, j) { return x.page === st.page && (j === i || (j < i ? passed[j] : shown(j))); });
    var k = same.indexOf(st) + 1, n = same.length;
    if (CFG && CFG.label) return CFG.label(st, k, n);
    if (st.page === 0) return "Welcome · Part " + k + " of " + n;
    return "Step " + st.page + " of 3 · Part " + k + " of " + n;
  }

  // The viewer needs pictures before the tour can point at it. If the visitor's own click is
  // still loading them, wait for that; otherwise load the practice pictures.
  function ensureLoaded() {
    var stage = $("stage");
    if (stage.dataset.state === "ready") return Promise.resolve();
    return new Promise(function (resolve) {
      var done = false;
      function ok() { if (done) return; done = true; document.removeEventListener("selenites:viewer", on); resolve(); }
      function on(e) { if (e.detail.action === "loaded") ok(); }
      document.addEventListener("selenites:viewer", on);
      if (stage.dataset.state !== "loading" && window.SelenitesApp) window.SelenitesApp.loadPractice().then(ok, ok);
      setTimeout(ok, 6000);
    });
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // ---------- Selene and her voice ----------

  // Her words appear while her lips move; with her voice switched on she also plays the step's
  // recording. Her voice is on unless the visitor has switched it off (Pawana, 14 November
  // 2026); that choice is remembered. Where the browser holds back sound (a page opened without
  // a click yet), she speaks silently: js/selene.js falls back to words only.
  if (window.Selene) window.Selene.mountAll();
  var selene = window.Selene ? window.Selene.mount($("tour-selene")) : null;
  var voiceOn = true;
  try { voiceOn = localStorage.getItem(VOICE_KEY) !== "off"; } catch (e) {}
  // Only recorded lines are ever played (never the device's built-in voice), so the voice
  // button only appears once this guide's recordings are found. Lines without one stay silent.
  // A step without a recording (such as one that names the visitor's own date) has no voice
  // button at all, rather than a switch that does nothing.
  var voiceAvail = false, voiceText = "";
  function fitVoice() {
    voiceBtn.hidden = !(voiceAvail && (!voiceText || window.Selene.recording(GUIDE, voiceText)));
  }
  voiceBtn.hidden = true;
  if (window.Selene && window.Selene.voiceReady) window.Selene.voiceReady.then(function () { voiceAvail = window.Selene.hasVoice(GUIDE) && window.Selene.canSpeak; fitVoice(); });
  if (!window.Selene || !window.Selene.canSpeak) { voiceBtn.hidden = true; voiceOn = false; }
  function showVoice() {
    voiceBtn.setAttribute("aria-pressed", voiceOn ? "true" : "false");
    voiceBtn.title = voiceOn ? GUIDE_NAME + "'s voice is on" : GUIDE_NAME + "'s voice is off";
  }
  showVoice();

  function speak(i) {
    var raw = val(STEPS[i].text), text = plain(raw);
    textEl.textContent = text;
    voiceText = text;
    if (window.Selene) fitVoice();
    layWords(raw);
    if (!selene) { typer.all(); return; }
    card.classList.add("is-talking");
    selene.say(text, {
      voice: voiceOn,
      video: ANIMATED && typeof STEPS[i].text !== "function" ? "assets/" + GUIDE + "/" + GUIDE + "-tour-" + STEPS[i].id + ".mp4" : null,
      onReveal: function (n) { typer.reveal(n); },
      onSpeaking: function (on) { voiceBtn.classList.toggle("is-speaking", on); },
      onDone: function () { card.classList.remove("is-talking"); }
    });
  }
  // Clicking the words shows them all at once (like skipping dialogue in a game).
  bubble.addEventListener("click", function (e) {
    if (e.target.closest("button") || !selene || !selene.skip) return;
    selene.skip();
  });
  voiceBtn.addEventListener("click", function () {
    voiceOn = !voiceOn;
    showVoice();
    try { localStorage.setItem(VOICE_KEY, voiceOn ? "on" : "off"); } catch (e) {}
    // The tip clouds share this switch (js/guide.js): tell them, so both stay in step.
    document.dispatchEvent(new CustomEvent("selenites:tour-voice", { detail: { on: voiceOn, key: VOICE_KEY } }));
    if (voiceOn) speak(index);
    else if (selene) { selene.stop(); typer.all(); voiceBtn.classList.remove("is-speaking"); card.classList.remove("is-talking"); selene.settle(1200); }
  });
  // Switched in a tip cloud: the tour follows (it speaks with the next step).
  document.addEventListener("selenites:guide-voice", function (e) {
    if (!e.detail || e.detail.key !== VOICE_KEY) return;
    voiceOn = !!e.detail.on;
    showVoice();
  });

  // ---------- the cloud the words sit in ----------

  // The cloud's shape and stickers are shared with Selene's step guide (js/cloud.js).
  var cloudPath = window.SeleneCloud.path, stickers = window.SeleneCloud.stickers;

  var cloudSize = "";
  function drawCloud() {
    var W = bubble.offsetWidth, H = bubble.offsetHeight;
    if (!W || !H || cloudSize === W + "x" + H) return;
    cloudSize = W + "x" + H;
    var svg = $("tour-cloud");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var c = cloudPath(W, H);
    $("cloud-fill").setAttribute("d", c.d);
    $("cloud-glow").setAttribute("d", c.d);
    $("cloud-edge").setAttribute("d", c.d);
    $("cloud-clip-path").setAttribute("d", c.d);
    var pat = $("cloud-pattern");
    pat.setAttribute("x", -40); pat.setAttribute("y", -40); pat.setAttribute("width", W + 80); pat.setAttribute("height", H + 80);
    var gl = $("cloud-gloss");
    gl.setAttribute("cx", (W * 0.3).toFixed(1)); gl.setAttribute("cy", (H * 0.14).toFixed(1));
    gl.setAttribute("rx", (W * 0.22).toFixed(1)); gl.setAttribute("ry", (H * 0.09).toFixed(1));
    $("cloud-stickers").innerHTML = stickers(c.lobes);
  }
  if (window.ResizeObserver) new ResizeObserver(drawCloud).observe(bubble);

  // ---------- the thought bubbles from her head to the cloud ----------

  // A point on her hair just above her head, on the side of her raised hand (picture pixels).
  var tourChar = window.Selene ? window.Selene.character($("tour-selene").getAttribute("data-character") || "selene") : null;
  var HEAD = tourChar ? tourChar.head : { x: 330, y: 62 };
  var thought = card.querySelector(".tour-thought"), figure = card.querySelector(".tour-figure");
  var slot = $("tour-selene"), dots = card.querySelectorAll(".tour-trail i");
  var DOTS = [{ t: 0.16, d: 8 }, { t: 0.43, d: 12 }, { t: 0.74, d: 17 }]; // smallest by her head
  // Three bubbles on a gentle upward arc from her head to the edge of the cloud. Layout values
  // (offsetLeft and so on) are used, so moving or animating the card does not disturb them.
  function placeTrail() {
    if (dots.length < 3 || !slot.offsetWidth) return;
    var rig = tourChar ? tourChar.rig : { w: 632, h: 480 };
    var mirrored = card.dataset.side === "right";
    var sw = slot.offsetWidth, sh = slot.offsetHeight, s = Math.min(sw / rig.w, sh / rig.h);
    var ix = slot.offsetLeft + (sw - rig.w * s) / 2 + HEAD.x * s;
    var iy = slot.offsetTop + (sh - rig.h * s) + HEAD.y * s;
    if (mirrored) ix = figure.offsetWidth - ix;
    var hx = figure.offsetLeft + ix, hy = figure.offsetTop + iy;
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var cx = mirrored ? thought.offsetLeft + bw - 28 : thought.offsetLeft + 28;
    var cy = clamp(hy - 30, thought.offsetTop + bh * 0.28, thought.offsetTop + bh - 48);
    var mx = (hx + cx) / 2, my = Math.min(hy, cy) - 22; // the arc bows upwards
    for (var i = 0; i < 3; i++) {
      var t = DOTS[i].t, u = 1 - t;
      var x = u * u * hx + 2 * u * t * mx + t * t * cx, y = u * u * hy + 2 * u * t * my + t * t * cy;
      var st = dots[i].style;
      st.left = (x - thought.offsetLeft).toFixed(1) + "px";
      st.top = (y - thought.offsetTop).toFixed(1) + "px";
      st.width = st.height = DOTS[i].d + "px";
    }
  }
  // The bubbles puff out one after another from her head.
  function popTrail() {
    card.classList.remove("trail-pop");
    void card.offsetWidth;
    card.classList.add("trail-pop");
  }


  // ---------- spotlight and card, pinned to the page ----------
  //
  // The dialog covers the whole page, not just the screen, and scrolls with it. The spotlight
  // and the card are placed in page coordinates, so while the page scrolls they stay exactly on
  // their part with nothing to chase. (A fixed overlay redrawn after every scroll always trails a
  // frame behind and slides about.) The dimming is one element with a huge shadow around a
  // rounded hole, the way Intro.js does it.
  //
  // A step change runs in order, like Driver.js: the card fades out; the page scrolls the next
  // part into view while the spotlight glides to it; the card fades in beside the part; then
  // Selene starts talking. Where the card goes is worked out for where the part will be once
  // the scroll has finished, so it never has to move again.

  var PAD = 10, GAP = 26, GAP_BASE = 26, GAP_ACTION = 72, EDGE = 12, GLIDE = 520, OUT = 150;
  var index = 0, current = null, lit = null, opener = null, token = 0;
  var spotNow = null, spotFrom = null, spotTo = null, glideStart = 0, raf = 0;
  // Where the page is meant to be scrolled for this step. Re-placing while a smooth scroll is
  // still running uses this, not the halfway position, so the card is not left off screen.
  var plannedY = null;

  function viewport() { return { w: document.documentElement.clientWidth, h: window.innerHeight }; }
  function overlap(a, b) {
    return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  }

  // Beside the part first (right, then left), then below, then above. If nothing fits, the corner
  // that covers the least of it. Phones use a sheet on the free side. t and the result are in
  // screen coordinates. avoid: parts the card must not sit on (the step bar), tried first.
  function place(t, v, cw, ch, avoid, gap) {
    var GAP = gap || GAP_BASE; // wider on "your turn" steps, to leave room for the arrow
    avoid = avoid || [];
    function covers(x, y) {
      var r = { x: x, y: y, w: cw, h: ch }, o = 0;
      for (var a = 0; a < avoid.length; a++) o += overlap(r, avoid[a]);
      return o;
    }
    if (v.w < 640) {
      if (!t) return { x: EDGE, y: Math.max(EDGE, (v.h - ch) / 2), side: "none", sheet: true };
      var atBottom = t.y + Math.min(t.h, v.h) / 2 < v.h / 2;
      return { x: EDGE, y: atBottom ? v.h - ch - EDGE : EDGE, side: atBottom ? "below" : "above", sheet: true };
    }
    if (!t) {
      // No part to point at (the welcome): the middle of the screen, or just below or above
      // the step bar when the middle would cover it.
      var mx = (v.w - cw) / 2, my = Math.max(EDGE, (v.h - ch) / 2);
      if (!covers(mx, my)) return { x: mx, y: my, side: "none" };
      for (var b = 0; b < avoid.length; b++) {
        var below = avoid[b].y + avoid[b].h + GAP, above = avoid[b].y - GAP - ch;
        if (below + ch <= v.h - EDGE && !covers(mx, below)) return { x: mx, y: below, side: "none" };
        if (above >= EDGE && !covers(mx, above)) return { x: mx, y: above, side: "none" };
      }
      return { x: mx, y: my, side: "none", hit: true };
    }
    var cy = clamp(t.y + t.h / 2 - ch / 2, EDGE, v.h - ch - EDGE), cx = clamp(t.x + t.w / 2 - cw / 2, EDGE, v.w - cw - EDGE);
    var options = [
      { side: "right", x: t.x + t.w + GAP, y: cy, ok: t.x + t.w + GAP + cw <= v.w - EDGE },
      { side: "left", x: t.x - GAP - cw, y: cy, ok: t.x - GAP - cw >= EDGE },
      { side: "below", x: cx, y: t.y + t.h + GAP, ok: t.y + t.h + GAP + ch <= v.h - EDGE },
      { side: "above", x: cx, y: t.y - GAP - ch, ok: t.y - GAP - ch >= EDGE }
    ];
    // Beside the part and off the step bar; if that cannot be done, beside the part anyway.
    for (var i = 0; i < options.length; i++) if (options[i].ok && !covers(options[i].x, options[i].y)) return options[i];
    // The part sits just above the step bar (the colour switch in the header): go under the bar.
    for (var a = 0; a < avoid.length; a++) {
      // Only when the bar is on screen and the part is above it.
      if (avoid[a].y < 0 || avoid[a].y + avoid[a].h > v.h || t.y + t.h > avoid[a].y + 8) continue;
      var by = avoid[a].y + avoid[a].h + GAP;
      if (by + ch <= v.h - EDGE && !covers(cx, by) && !overlap({ x: cx, y: by, w: cw, h: ch }, t)) return { side: "below", x: cx, y: by };
    }
    for (var j = 0; j < options.length; j++) if (options[j].ok) { options[j].hit = true; return options[j]; }
    var best = null;
    [[EDGE, EDGE], [v.w - cw - EDGE, EDGE], [EDGE, v.h - ch - EDGE], [v.w - cw - EDGE, v.h - ch - EDGE]].forEach(function (c) {
      var o = overlap({ x: c[0], y: c[1], w: cw, h: ch }, t) + covers(c[0], c[1]);
      if (!best || o < best.o) best = { x: c[0], y: c[1], side: "none", o: o, fallback: true };
    });
    return best;
  }

  function ease(t) { return 1 - Math.pow(1 - t, 5); }
  function mix(a, b, e) { return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, w: a.w + (b.w - a.w) * e, h: a.h + (b.h - a.h) * e }; }

  // The dialog is as tall as the page.
  function sizeDialog() {
    dialog.style.height = "0px";
    dialog.style.height = Math.max(document.documentElement.scrollHeight, window.innerHeight) + "px";
  }

  function drawSpot(r) {
    spot.style.transform = "translate(" + r.x.toFixed(1) + "px," + r.y.toFixed(1) + "px)";
    spot.style.width = Math.max(0, r.w).toFixed(1) + "px";
    spot.style.height = Math.max(0, r.h).toFixed(1) + "px";
  }
  function glide(now) {
    raf = 0;
    if (!dialog.open || !spotTo) return;
    var e = reduced() || !spotFrom ? 1 : ease(clamp((now - glideStart) / GLIDE, 0, 1));
    spotNow = spotFrom ? mix(spotFrom, spotTo, e) : spotTo;
    drawSpot(spotNow);
    if (e < 1) raf = requestAnimationFrame(glide);
  }

  // Where to scroll so the part sits where the card will not cover it: centred if it fits, else
  // its top at the top of the screen.
  function scrollFor(el) {
    var r = el.getBoundingClientRect(), v = viewport(), y = window.scrollY;
    var top = EDGE + PAD, bottom = v.h - EDGE - PAD;
    if (v.w < 640) bottom = v.h - card.offsetHeight - EDGE * 2 - PAD;
    if (r.top >= top && r.bottom <= bottom) return y;
    var room = bottom - top;
    var dy = r.height <= room ? r.top - (top + (room - r.height) / 2) : r.top - top;
    return clampScroll(y + dy);
  }
  // The lit margin around a part: PAD, but never more than half the gap to a neighbouring
  // element, so the spotlight hugs the part instead of cutting into the controls next to it.
  // The neighbours are the part's own siblings and those of the boxes it sits in: a step link
  // alone in its list item has no siblings, but the next step's item is right beside it, so
  // looking only one level up let the light spill over the steps either side.
  function margins(el, r) {
    var m = { t: PAD, b: PAD, l: PAD, r: PAD };
    var sibs = [];
    for (var node = el, depth = 0; node && node.parentElement && node !== document.body && depth < 4; node = node.parentElement, depth++) {
      var kids = node.parentElement.children;
      for (var k = 0; k < kids.length; k++) if (kids[k] !== node) sibs.push(kids[k]);
    }
    for (var i = 0; i < sibs.length; i++) {
      var o = sibs[i];
      if (o === el || o.contains(el) || !o.offsetWidth || !o.offsetHeight) continue;
      var q = o.getBoundingClientRect();
      var across = Math.min(q.right, r.right) - Math.max(q.left, r.left) > 0;
      var along = Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top) > 0;
      // Half the gap, less the spotlight's own outline (about 2.5 px), so even the outline stays
      // clear of the neighbour.
      if (across && q.bottom <= r.top + 1) m.t = Math.min(m.t, Math.max(1, (r.top - q.bottom) / 2 - 2.5));
      if (across && q.top >= r.bottom - 1) m.b = Math.min(m.b, Math.max(1, (q.top - r.bottom) / 2 - 2.5));
      if (along && q.right <= r.left + 1) m.l = Math.min(m.l, Math.max(1, (r.left - q.right) / 2 - 2.5));
      if (along && q.left >= r.right - 1) m.r = Math.min(m.r, Math.max(1, (q.left - r.right) / 2 - 2.5));
    }
    // The same margin on every side, so the ring sits evenly round the part (a slider with a
    // label just above it once got 1 px above and 10 px at the ends, and looked off-centre).
    // Never under 3 px, so the ring never touches the part's own edge.
    var u = Math.max(3, Math.min(m.t, m.b, m.l, m.r));
    return { t: u, b: u, l: u, r: u };
  }
  // The box to light: the part itself, or with step.fit (a selector), just the pieces inside it
  // that the visitor sees, so a full-width row with three buttons on the left is lit round the
  // buttons, not round the empty space beside them.
  function litRect(el, step) {
    var r = el.getBoundingClientRect();
    if (!step || !step.fit) return r;
    var parts = el.querySelectorAll(step.fit), u = null;
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i].offsetWidth) continue;
      var q = parts[i].getBoundingClientRect();
      u = u ? { left: Math.min(u.left, q.left), top: Math.min(u.top, q.top), right: Math.max(u.right, q.right), bottom: Math.max(u.bottom, q.bottom) }
        : { left: q.left, top: q.top, right: q.right, bottom: q.bottom };
    }
    if (!u) return r;
    u.width = u.right - u.left; u.height = u.bottom - u.top;
    return u;
  }
  function clampScroll(y) { return clamp(y, 0, Math.max(0, document.documentElement.scrollHeight - viewport().h)); }

  // Place the spotlight and the card for the current step. animate: glide there and scroll
  // smoothly (a step change); otherwise jump (resizing, content changing size).
  // The card must never sit on the part it explains. So several scroll positions are tried: the
  // part centred, the part at the top of the screen (card below it), the part at the bottom
  // (card above it). If the part is too tall for any of them, its top is shown with the card
  // underneath, and the spotlight covers only the visible top of it.
  function arrange(animate, keepScroll) {
    var v = viewport(), sx = window.scrollX;
    card.classList.toggle("is-sheet", v.w < 640);
    card.classList.remove("is-wide");
    var cw = card.offsetWidth, ch = card.offsetHeight;
    var r = lit ? litRect(lit, STEPS[index]) : null;
    // The card keeps off the whole step bar, even when it points at one of its steps.
    var bar = document.getElementById("steps"), barR = bar && bar.offsetWidth && lit !== bar ? bar.getBoundingClientRect() : null;
    function trial(sy) {
      var shift = sy - window.scrollY;
      var t = null;
      if (r) {
        var m = margins(lit, r);
        t = { x: r.left - m.l, y: r.top - shift - m.t, w: r.width + m.l + m.r, h: r.height + m.t + m.b };
        t.m = m;
      }
      var avoid = barR ? [{ x: barR.left - 8, y: barR.top - shift - 8, w: barR.width + 16, h: barR.height + 16 }] : [];
      // On "your turn" steps, leave room for the arrow if it fits; otherwise the usual gap.
      var pos = place(t, v, cw, ch, avoid, GAP_BASE);
      if (STEPS[index] && STEPS[index].action) {
        var roomy = place(t, v, cw, ch, avoid, GAP_ACTION);
        if (!roomy.fallback && (!roomy.hit || pos.hit || pos.fallback)) pos = roomy;
      }
      return { sy: sy, t: t, pos: pos };
    }
    var pick;
    var here = keepScroll && plannedY !== null ? plannedY : window.scrollY;
    if (!lit || keepScroll || v.w < 640) {
      pick = trial(lit && !keepScroll ? scrollFor(lit) : here);
      // Nothing to point at and no room around the step bar (a short screen): scroll the page
      // just past the bar, so the card does not sit on it.
      if (!lit && !keepScroll && pick.pos.hit && barR) {
        var past = trial(clampScroll(window.scrollY + barR.bottom + 8));
        if (!past.pos.hit) pick = past;
      }
    } else {
      var y0 = window.scrollY;
      var tries = [scrollFor(lit),
        clampScroll(y0 + r.top - (EDGE + PAD)),
        clampScroll(y0 + r.bottom - (v.h - EDGE - PAD))];
      // Best: beside the part and off the step bar. Next best: beside the part. Each scroll
      // position is tried for the best before settling for the next best.
      var trials = tries.map(trial);
      for (var i = 0; i < trials.length && !pick; i++) if (!trials[i].pos.fallback && !trials[i].pos.hit) pick = trials[i];
      for (var k = 0; k < trials.length && !pick; k++) if (!trials[k].pos.fallback) pick = trials[k];
      // A part as wide as the page and too tall to share the screen with the card (the example
      // cards): try a wide, short card first, so the whole part can be lit with the card below.
      if (!pick && !(STEPS[index] && STEPS[index].narrow)) {
        card.classList.add("is-wide");
        cw = card.offsetWidth; ch = card.offsetHeight;
        var wide = tries.map(trial);
        for (var w1 = 0; w1 < wide.length && !pick; w1++) if (!wide[w1].pos.fallback && !wide[w1].pos.hit) pick = wide[w1];
        for (var w2 = 0; w2 < wide.length && !pick; w2++) if (!wide[w2].pos.fallback) pick = wide[w2];
        if (!pick) { card.classList.remove("is-wide"); cw = card.offsetWidth; ch = card.offsetHeight; }
      }
      if (!pick) {
        // Too tall: show its top, put the card under the visible part, light only that part.
        // The light ends below the last whole row of the part (a whole row of cards, say),
        // never halfway through one.
        pick = trial(tries[1]);
        var t = pick.t, cardY = v.h - ch - EDGE, limit = cardY - GAP, sh = tries[1] - window.scrollY, best = 0;
        var kids = lit.children.length === 1 ? lit.children[0].children : lit.children;
        for (var q = 0; q < kids.length; q++) {
          var kb = kids[q].getBoundingClientRect().bottom - sh;
          if (kids[q].offsetHeight && kb + 6 <= limit && kb > best) best = kb;
        }
        t.h = best > t.y + 24 ? best + 6 - t.y : Math.max(48, Math.min(t.h, limit - t.y));
        pick.pos = { x: clamp(t.x + t.w / 2 - cw / 2, EDGE, v.w - cw - EDGE), y: cardY, side: "below" };
      }
    }
    var sy = pick.sy, t = pick.t, pos = pick.pos, shift = sy - window.scrollY;
    plannedY = sy;
    card.dataset.side = pos.side;
    card.classList.toggle("is-sheet", !!pos.sheet);
    card.style.transform = "translate(" + Math.round(pos.x + sx) + "px," + Math.round(pos.y + sy) + "px)";
    spot.classList.toggle("has-ring", !!t);
    // The lit shape follows the part's own corners: a pill stays a pill, a card keeps its curve.
    if (t) {
      var fitEl = STEPS[index] && STEPS[index].fit ? lit.querySelector(STEPS[index].fit) : null;
      var rad = parseFloat(getComputedStyle(fitEl || lit).borderTopLeftRadius) || 0, mm = Math.min(t.m.t, t.m.l);
      spot.style.borderRadius = Math.round(Math.min(rad > 0 ? rad + mm : 10, t.h / 2, t.w / 2)) + "px";
    }
    spotTo = t ? { x: t.x + sx, y: t.y + sy, w: t.w, h: t.h } : { x: sx + v.w / 2, y: sy + v.h / 2, w: 0, h: 0 };
    if (animate) { spotFrom = spotNow; glideStart = performance.now(); }
    else if (!raf) spotFrom = null;
    if (Math.abs(shift) > 0.5 && !keepScroll) window.scrollTo({ top: sy, behavior: animate && !reduced() ? "smooth" : "auto" });
    if (!raf) raf = requestAnimationFrame(glide);
    placeArrow({ x: pos.x + sx, y: pos.y + sy });
    drawCloud();
    placeTrail();
  }

  // On a "your turn" step a painted arrow runs from Selene's thought cloud to the control to
  // click. It is drawn fresh for each step: it starts on the edge of the cloud nearest the
  // control, curves gently, and ends just outside the control, so its shape and length follow
  // where the two are. When they are close it is short with a small head. Colours per theme.
  // (An <svg>, so it is shown and hidden with the hidden attribute, not the .hidden property.)
  var arrow = $("tour-arrow");
  var arrowPaths = { wash: $("arrow-wash"), body: $("arrow-body"), core: $("arrow-core"), headWash: $("arrow-head-wash"), headBody: $("arrow-head-body") };
  function placeArrow(cardPage) {
    var step = STEPS[index];
    if (!step || !step.action || !current || step.arrow === false) { arrow.toggleAttribute("hidden", true); return; }
    // The cloud's box in page coordinates (the card is moved there by a transform).
    var cr = card.getBoundingClientRect(), br = bubble.getBoundingClientRect();
    var inset = 26, b = {
      x: cardPage.x + (br.left - cr.left) + inset, y: cardPage.y + (br.top - cr.top) + inset,
      w: br.width - inset * 2, h: br.height - inset * 2
    };
    var tr = current.getBoundingClientRect();
    var t = { x: tr.left + window.scrollX - 6, y: tr.top + window.scrollY - 6, w: tr.width + 12, h: tr.height + 12 };
    // Start: the point of the cloud nearest the middle of the control. End: the point of the
    // control nearest that start.
    var tc = { x: t.x + t.w / 2, y: t.y + t.h / 2 };
    var a = { x: clamp(tc.x, b.x, b.x + b.w), y: clamp(tc.y, b.y, b.y + b.h) };
    var e = { x: clamp(a.x, t.x, t.x + t.w), y: clamp(a.y, t.y, t.y + t.h) };
    var dx = e.x - a.x, dy = e.y - a.y, d = Math.hypot(dx, dy);
    if (d < 18) { arrow.toggleAttribute("hidden", true); return; }
    // A bow bending upwards: gentle on long arrows; when the cloud and the control are close,
    // a taller hop, so even a short arrow reads clearly as a curved arrow.
    var nx = -dy / d, ny = dx / d;
    if (ny > 0) { nx = -nx; ny = -ny; }
    var bow = d < 140 ? clamp(52 - d * 0.15, 30, 48) : clamp(d * 0.22, 30, 70);
    var c = { x: (a.x + e.x) / 2 + nx * bow, y: (a.y + e.y) / 2 + ny * bow };
    // The head points along the end of the curve.
    var tx = e.x - c.x, ty = e.y - c.y, tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    var hl = clamp(d * 0.2, 13, 20), ang = 0.5;
    function barb(sign) { var cs = Math.cos(sign * ang), sn = Math.sin(sign * ang); return { x: e.x - hl * (tx * cs - ty * sn), y: e.y - hl * (tx * sn + ty * cs) }; }
    var b1 = barb(1), b2 = barb(-1);
    function f(v) { return v.toFixed(1); }
    var line = "M" + f(a.x) + " " + f(a.y) + "Q" + f(c.x) + " " + f(c.y) + " " + f(e.x) + " " + f(e.y);
    var head = "M" + f(b1.x) + " " + f(b1.y) + "L" + f(e.x) + " " + f(e.y) + "L" + f(b2.x) + " " + f(b2.y);
    arrowPaths.wash.setAttribute("d", line); arrowPaths.body.setAttribute("d", line); arrowPaths.core.setAttribute("d", line);
    arrowPaths.headWash.setAttribute("d", head); arrowPaths.headBody.setAttribute("d", head);
    // Shorter arrows get a thinner brush.
    arrow.style.setProperty("--brush", clamp(d / 160, 0.8, 1).toFixed(2));
    arrow.style.setProperty("--nx", (tx * 5).toFixed(1) + "px");
    arrow.style.setProperty("--ny", (ty * 5).toFixed(1) + "px");
    arrow.setAttribute("width", document.documentElement.scrollWidth);
    arrow.setAttribute("height", dialog.offsetHeight);
    var wasHidden = arrow.hasAttribute("hidden");
    arrow.toggleAttribute("hidden", false);
    if (wasHidden || arrow.dataset.step !== step.id) {
      arrow.dataset.step = step.id;
      arrow.classList.remove("is-drawing"); void arrow.getBoundingClientRect(); arrow.classList.add("is-drawing");
    }
  }

  // Resizing the window, or the page changing height (pictures loading), re-places everything
  // at once, once per frame at most, without scrolling the page.
  var relayout = 0;
  function onResize() {
    if (relayout || !dialog.open) return;
    relayout = requestAnimationFrame(function () {
      relayout = 0;
      if (!dialog.open) return;
      sizeDialog();
      arrange(false, true);
    });
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(document.body);

  function setWords(i) {
    var raw = val(STEPS[i].text);
    textEl.textContent = plain(raw);
    layWords(raw);
  }

  // Everything outside the tour is made inert, except (on a "your turn" step) the one control the
  // visitor is asked to click, and the elements that contain it.
  var inerted = [];
  function setInert(keep) {
    inerted.forEach(function (el) { el.inert = false; });
    inerted = [];
    if (!dialog.open) return;
    var path = [];
    for (var n = keep; n && n !== document.body; n = n.parentElement) path.push(n);
    function shut(parent) {
      for (var c = parent.firstElementChild; c; c = c.nextElementSibling) {
        if (c === dialog || c.tagName === "SCRIPT") continue;
        if (path.indexOf(c) >= 0) { if (c !== keep) shut(c); continue; }
        if (!c.inert) { c.inert = true; inerted.push(c); }
      }
    }
    shut(document.body);
    dialog.setAttribute("aria-modal", keep ? "false" : "true");
  }

  // A "your turn" step waits for the visitor's own click, then moves on.
  // action.settle: a hands-on part (dragging a slider, listening, watching a blink). Doing it
  // does not move the tour on, because the visitor is still in the middle of it: a slider sends
  // dozens of moves in one drag, so the tour used to jump away under their finger. Instead the
  // step is marked done (step.doneTitle, read out), Next appears in place of Skip this part, and
  // the control stays usable for as long as they like.
  var waiting = null;
  function stopWaiting() { if (waiting) { (waiting.el || document).removeEventListener(waiting.type, waiting.fn); waiting = null; } }
  function markDone(my) {
    if (!dialog.open || my !== token) return;
    var step = STEPS[index];
    card.classList.add("is-done");
    titleEl.textContent = step.doneTitle || "Nicely done";
    skipPart.hidden = true;
    next.hidden = false;
    pulse(null);
    arrange(false, true);
  }
  function done(action, my) {
    stopWaiting();
    if (action.settle) markDone(my);
    else if (dialog.open && my === token) show(index + 1);
  }
  function waitFor(action, my) {
    stopWaiting();
    if (action.on === "click" && current) {
      var el = current, onClick = function (e) {
        // A click that opens another page: the tour carries on there, with that page's guide.
        // "auto" takes the page from the link clicked (data-tour-continue), so the home tour
        // can hand over to whichever part the visitor picks; other clicks inside wait.
        if (action.continueTo) {
          var to = action.continueTo;
          if (to === "auto") {
            var link = e && e.target && e.target.closest ? e.target.closest("[data-tour-continue]") : null;
            if (!link) return;
            to = link.getAttribute("data-tour-continue");
          }
          stopWaiting();
          try { sessionStorage.setItem(CONTINUE_KEY, to); } catch (err) {}
          return;
        }
        stopWaiting();
        // Let the click do its job (open the panel, choose the tab) before moving on.
        setTimeout(function () { done(action, my); }, 60);
      };
      el.addEventListener("click", onClick);
      waiting = { el: el, type: "click", fn: onClick };
      return;
    }
    var fn = function (e) {
      var d = e.detail || {};
      if (action.id && d.id !== action.id) return;
      if (action.view && d.view !== action.view) return;
      done(action, my);
    };
    waiting = { type: action.event, fn: fn };
    document.addEventListener(action.event, fn);
  }

  // After every step change: wait until the page has stopped scrolling, then make sure the whole
  // card is on screen (and the lit part too, when both fit). If not, scroll just enough.
  function keepInView(my) {
    var last = -1, still = 0, tries = 0;
    (function check() {
      if (!dialog.open || my !== token) return;
      var y = window.scrollY;
      still = Math.abs(y - last) < 0.5 ? still + 1 : 0;
      last = y;
      if (still < 2 && ++tries < 40) { setTimeout(check, 90); return; }
      var v = viewport(), c = card.getBoundingClientRect();
      var top = c.top, bottom = c.bottom;
      if (spotTo && spotTo.h) {
        var st = spotTo.y - y, sb = st + spotTo.h;
        if (Math.max(bottom, sb) - Math.min(top, st) <= v.h - EDGE * 2) { top = Math.min(top, st); bottom = Math.max(bottom, sb); }
      }
      // The arrow on a "your turn" step should be in view too, when everything fits.
      if (!arrow.hasAttribute("hidden")) {
        var ar = arrowPaths.wash.getBoundingClientRect();
        if (Math.max(bottom, ar.bottom) - Math.min(top, ar.top) <= v.h - EDGE * 2) { top = Math.min(top, ar.top); bottom = Math.max(bottom, ar.bottom); }
      }
      var dy = 0;
      if (top < EDGE) dy = top - EDGE;
      else if (bottom > v.h - EDGE) dy = Math.min(bottom - (v.h - EDGE), top - EDGE);
      if (Math.abs(dy) < 1) return;
      plannedY = clampScroll(y + dy);
      window.scrollTo({ top: plannedY, behavior: reduced() ? "auto" : "smooth" });
    })();
  }

  // The part being explained carries data-tour-current, so CSS can show it if it is normally
  // hidden during the tour (Selene's tip cloud).
  var pulsing = null;
  function pulse(el) {
    if (pulsing) pulsing.classList.remove("tour-pulse");
    pulsing = el;
    if (el) el.classList.add("tour-pulse");
  }
  var marked = null;
  function markCurrent(el) {
    if (marked) marked.removeAttribute("data-tour-current");
    marked = el;
    if (el) el.setAttribute("data-tour-current", "");
  }

  // The tour moves focus itself at every step. Browsers then often draw the keyboard focus ring
  // even for mouse users. So the ring is shown only when the visitor is using the keyboard:
  // after a click or tap, focus moves quietly; the first key press brings the ring back.
  var lastInput = "pointer", quiet = [];
  document.addEventListener("pointerdown", function () {
    lastInput = "pointer";
    var ringed = document.querySelectorAll("[data-key-focus]");
    for (var i = 0; i < ringed.length; i++) ringed[i].removeAttribute("data-key-focus");
  }, true);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Tab" || e.key === "Enter" || e.key === " " || e.key.indexOf("Arrow") === 0 || e.key === "Escape") {
      lastInput = "key";
      quiet.forEach(function (el) { el.removeAttribute("data-quiet-focus"); });
      quiet = [];
    }
  }, true);
  function focusQuietly(el) {
    if (!el) return;
    // After a click: no ring. After a key press: always a ring, whatever the browser decides.
    var mark = lastInput !== "key" ? "data-quiet-focus" : "data-key-focus";
    el.removeAttribute(mark === "data-key-focus" ? "data-quiet-focus" : "data-key-focus");
    el.setAttribute(mark, "");
    if (mark === "data-quiet-focus") quiet.push(el);
    el.addEventListener("blur", function off() { el.removeAttribute(mark); el.removeEventListener("blur", off); });
    try { el.focus({ preventScroll: true, focusVisible: lastInput === "key" }); } catch (e) { el.focus({ preventScroll: true }); }
  }

  function show(n, dir) {
    n = clamp(n, 0, STEPS.length - 1);
    var to = nearest(n, dir || 1);
    if (to < 0) to = nearest(n, -(dir || 1));
    if (to < 0) { finish(); return; }
    var my = ++token;
    stopWaiting();
    index = to;
    passed[to] = true;
    var step = STEPS[index];
    next.setAttribute("aria-disabled", "true");
    if (selene) selene.stop();
    voiceBtn.classList.remove("is-speaking");
    card.classList.remove("is-talking");
    var wasShown = !card.classList.contains("is-hidden");
    card.classList.add("is-hidden");
    // Open the step's screen (1 Choose, 2 Watch) before pointing at a part of it.
    if (step.view) {
      if (CFG && CFG.showView) CFG.showView(step.view);
      else if (window.SelenitesApp && window.SelenitesApp.showView) window.SelenitesApp.showView(step.view);
    }
    // The step's setup (opening a panel, choosing a tab) waits until the old card has faded
    // out, so any change in the page happens while nothing is pointing at it.
    var faded = new Promise(function (res) { setTimeout(res, wasShown && !reduced() ? OUT : 0); });
    faded.then(function () {
      if (!dialog.open || my !== token) return;
      return step.prepare ? step.prepare().catch(function () {}) : null;
    }).then(function () {
      if (!dialog.open || my !== token) return;
      var sel = val(step.target);
      current = sel ? document.querySelector(sel) : null;
      if (current && (current.hidden || !current.offsetWidth)) current = null;
      // The lit part: usually the control itself; for the tabs, the whole panel, so its words
      // can be read while only the next tab can be clicked.
      lit = step.spot ? document.querySelector(val(step.spot)) : current;
      if (lit && !lit.offsetWidth) lit = current;
      markCurrent(lit);
      // On a "your turn" step only the control to click stays usable.
      setInert(step.action && current ? current : null);
      if (step.action) waitFor(step.action, my);
      // New words while the card is out of sight, so its new size is known before it moves.
      stepEl.textContent = label(index);
      titleEl.textContent = val(step.title);
      if (mediaEl) {
        var media = step.media ? val(step.media) : "";
        mediaEl.classList.remove("is-play");
        mediaEl.innerHTML = media;
        mediaEl.hidden = !media;
      }
      back.hidden = nearest(index - 1, -1) < 0;
      next.hidden = !!step.action && !step.nextToo;
      // The control to click pulses gently where there is no arrow.
      pulse(step.action && step.arrow === false ? current : null);
      skipPart.hidden = !step.skipTo;
      next.textContent = step.next || "Next";
      card.classList.toggle("is-welcome", !!step.welcome);
      card.classList.toggle("is-action", !!step.action);
      card.classList.remove("is-done");
      // A slimmer card where the part is tall and wide (the tabs), so it fits beside it.
      card.classList.toggle("is-narrow", !!step.narrow);
      setWords(index);
      sizeDialog();
      arrange(true);
      next.setAttribute("aria-disabled", "false");
      // The card appears once the spotlight has nearly arrived, then she talks.
      setTimeout(function () {
        if (!dialog.open || my !== token) return;
        card.classList.remove("is-hidden");
        if (mediaEl && !mediaEl.hidden) { void mediaEl.offsetWidth; mediaEl.classList.add("is-play"); }
        keepInView(my);
        popTrail();
        speak(index);
        // On a "your turn" step, focus goes to the control to click, so a keyboard user can
        // press Enter straight away; Selene's words are read out from the card.
        if (step.action && current) focusQuietly(current);
        else focusQuietly(next);
      }, wasShown && !reduced() ? Math.round(GLIDE * 0.55) : 0);
    });
  }

  function open(fromButton, startAt) {
    if (dialog.open) return;
    opener = fromButton || document.activeElement;
    index = 0;
    passed = {};
    spotNow = spotFrom = spotTo = null;
    card.classList.add("is-hidden");
    var sx = window.scrollX, sy = window.scrollY;
    // Opened with a click: the button the dialog focuses first gets no keyboard ring either.
    if (lastInput !== "key") { next.setAttribute("data-quiet-focus", ""); quiet.push(next); }
    dialog.show();
    setInert(null);
    document.addEventListener("keydown", onEscape);
    // Opening a dialog focuses a button, which can make the page jump; put it back.
    window.scrollTo(sx, sy);
    document.documentElement.classList.add("is-touring");
    sizeDialog();
    window.addEventListener("resize", onResize);
    show(startAt || 0);
  }
  function finish() { if (dialog.open) dialog.close(); }
  function onEscape(e) { if (e.key === "Escape" && dialog.open) { e.preventDefault(); finish(); } }

  dialog.addEventListener("close", function () {
    stopWaiting();
    pulse(null);
    arrow.toggleAttribute("hidden", true);
    markCurrent(null);
    plannedY = null;
    setInert(null);
    document.removeEventListener("keydown", onEscape);
    window.removeEventListener("resize", onResize);
    document.documentElement.classList.remove("is-touring");
    current = null;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (selene) { selene.stop(); selene.setActive(false); }
    voiceBtn.classList.remove("is-speaking");
    card.classList.remove("is-talking", "trail-pop");
    token++;
    try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) {}
    document.documentElement.setAttribute("data-tour-seen", "true");
    // Return focus where the visitor started. If that button has gone (the empty viewer is
    // replaced once pictures load, or the tour moved to another step), land on the heading
    // of the step on screen instead.
    if (opener && document.contains(opener) && opener.offsetParent !== null) {
      focusQuietly(opener);
    } else {
      var h = (CFG && CFG.heading && CFG.heading()) || (window.SelenitesApp && window.SelenitesApp.currentViewHeading && window.SelenitesApp.currentViewHeading()) || $("viewer-h") || $("top");
      h.setAttribute("tabindex", "-1");
      focusQuietly(h);
    }
  });

  next.addEventListener("click", function () {
    if (next.getAttribute("aria-disabled") === "true" || next.hidden) return;
    var st = STEPS[index];
    if (st && st.action && st.nextToo && current) { current.click(); return; }
    if (nearest(index + 1, 1) < 0) finish(); else show(index + 1, 1);
  });
  back.addEventListener("click", function () { show(index - 1, -1); });
  // Jump over the rest of a hands-on part (More controls, the tabs).
  skipPart.addEventListener("click", function () {
    var to = STEPS[index] && val(STEPS[index].skipTo);
    if (to === "next") { show(index + 1, 1); return; }
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === to) { show(i, 1); return; }
  });
  skip.addEventListener("click", finish);
  dialog.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" && e.target.tagName !== "INPUT" && !next.hidden) { e.preventDefault(); next.click(); }
    else if (e.key === "ArrowLeft" && index > 0) { e.preventDefault(); show(index - 1, -1); }
  });
  for (var i = 0; i < openers.length; i++) {
    openers[i].addEventListener("click", function (e) { open(e.currentTarget); });
  }

  // A tour started on another page (the home page) carries on here, at the first step that is
  // not a welcome. It only happens straight after the visitor's own click there.
  try {
    var cont = sessionStorage.getItem(CONTINUE_KEY);
    if (cont) sessionStorage.removeItem(CONTINUE_KEY);
    if (cont && cont === ((CFG && CFG.page) || "viewer")) {
      var at = 0, want = (CFG && CFG.continueAt) || "steps";
      for (var c = 0; c < STEPS.length; c++) if (STEPS[c].id === want) at = c;
      setTimeout(function () { open(null, at); }, 350);
    }
  } catch (e) {}

  // Remember whether this browser has seen the tour, so the invitation can step back.
  try { if (localStorage.getItem(SEEN_KEY)) document.documentElement.setAttribute("data-tour-seen", "true"); } catch (e) {}
})();
