// The home page: a first win in seconds (Spot the mover), the places to go with their guides,
// and the sky map. Research behind it is in docs/design-direction.md ("The home page").
// Nothing moves or plays by itself; every animation starts from the visitor's own click.
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var site = window.SelenitesSite;
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(motionQuery && motionQuery.matches); }
  function seeded(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  if (window.Selene) window.Selene.mountAll();

  // ---------- Spot the mover ----------
  // Two practice pictures of the same patch of sky. Three spots are marked A, B and C; one of
  // them is in a different place in the second picture. Which one changes on every visit.
  var canvas = $("try-canvas"), ctx = canvas.getContext("2d");
  var cap = $("try-cap"), result = $("try-result"), words = $("try-words");
  var blinkBtn = $("try-blink"), autoBtn = $("try-auto"), picks = $("try-picks");
  var W = 560, H = 340;
  var R = seeded(20261114);
  var stars = [];
  for (var i = 0; i < 90; i++) stars.push({ x: R() * W, y: R() * H, r: 0.4 + Math.pow(R(), 3) * 1.6, a: 0.25 + R() * 0.6 });
  var bright = { x: W * 0.52, y: H * 0.44 };
  var SPOTS = [
    { id: "A", where: "near the top left", x: W * 0.2, y: H * 0.26 },
    { id: "B", where: "near the middle, below the bright star", x: W * 0.46, y: H * 0.62 },
    { id: "C", where: "near the bottom right", x: W * 0.8, y: H * 0.74 }
  ];
  var mover = SPOTS[Math.floor(Math.random() * 3)];
  mover.x2 = mover.x + 34; mover.y2 = mover.y - 18;
  var frame = 0, solved = false, burst = 0;

  function fitCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== W * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spotPos(s, f) { return s === mover && f === 1 ? { x: s.x2, y: s.y2 } : { x: s.x, y: s.y }; }
  // The picture is always a dark sky, but its marks follow the theme (css/home.css): Okabe-Ito
  // colours in the colour-blind friendly theme.
  function tone(name, fallback) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; }

  function draw(sparkle) {
    fitCanvas();
    var ring = tone("--try-ring", "#C2B0F0"), letter = tone("--try-letter", "#F2A7D3"), path = tone("--try-path", "#F0E442");
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#050508"); g.addColorStop(1, "#141026");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    stars.forEach(function (s) {
      ctx.globalAlpha = s.a; ctx.fillStyle = "#ECE9F1";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    // One bright star, so there is something to judge positions against.
    var bg = ctx.createRadialGradient(bright.x, bright.y, 0, bright.x, bright.y, 14);
    bg.addColorStop(0, "rgba(255,255,255,1)"); bg.addColorStop(0.3, "rgba(236,233,241,0.7)"); bg.addColorStop(1, "rgba(236,233,241,0)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bright.x, bright.y, 14, 0, Math.PI * 2); ctx.fill();
    // The three spots, each with a ring and its letter.
    SPOTS.forEach(function (s) {
      var p = spotPos(s, frame);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ring; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(s === mover ? (s.x + s.x2) / 2 : s.x, s === mover ? (s.y + s.y2) / 2 : s.y, s === mover ? 34 : 18, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "700 16px 'Atkinson Hyperlegible', system-ui, sans-serif";
      ctx.fillStyle = letter;
      var lx = (s === mover ? (s.x + s.x2) / 2 : s.x) - (s === mover ? 44 : 30), ly = (s === mover ? (s.y + s.y2) / 2 : s.y) - (s === mover ? 26 : 16);
      ctx.fillText(s.id, lx, ly);
    });
    // Once found: the path it took, from the earlier picture to the later one.
    if (solved) {
      ctx.strokeStyle = path; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(mover.x, mover.y); ctx.lineTo(mover.x2, mover.y2); ctx.stroke();
      var a = Math.atan2(mover.y2 - mover.y, mover.x2 - mover.x);
      ctx.beginPath(); ctx.moveTo(mover.x2, mover.y2);
      ctx.lineTo(mover.x2 - 9 * Math.cos(a - 0.5), mover.y2 - 9 * Math.sin(a - 0.5));
      ctx.moveTo(mover.x2, mover.y2);
      ctx.lineTo(mover.x2 - 9 * Math.cos(a + 0.5), mover.y2 - 9 * Math.sin(a + 0.5));
      ctx.stroke();
    }
    if (sparkle) {
      var p2 = spotPos(mover, frame);
      for (var k = 0; k < 8; k++) {
        var ang = k / 8 * Math.PI * 2, d = 10 + sparkle * 26;
        ctx.globalAlpha = 1 - sparkle;
        ctx.fillStyle = k % 2 ? path : letter;
        ctx.beginPath(); ctx.arc(p2.x + Math.cos(ang) * d, p2.y + Math.sin(ang) * d, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    cap.textContent = frame === 0 ? "Picture 1 of 2 (earlier)" : "Picture 2 of 2 (later)";
  }

  function blink() { frame = 1 - frame; draw(); }
  // A screen reader hears which picture is showing after each press of Blink (the picture
  // itself is silent). The first time, it also says where the words for both pictures are.
  var tryLive = $("try-live"), toldWhere = false;
  blinkBtn.addEventListener("click", function () {
    stopAuto();
    blink();
    if (!tryLive) return;
    tryLive.textContent = cap.textContent + "." + (toldWhere ? "" : " To hear what changed, open Describe the two pictures in words, just below the picture.");
    toldWhere = true;
  });

  // Blink for me: flicks back and forth a dozen times (about 7 seconds), then stops. The same
  // button stops it sooner.
  var autoTimer = 0, autoLeft = 0;
  function stopAuto() {
    clearInterval(autoTimer); autoTimer = 0;
    autoBtn.setAttribute("aria-pressed", "false");
    autoBtn.textContent = "Blink for me";
  }
  autoBtn.addEventListener("click", function () {
    if (autoTimer) { stopAuto(); return; }
    autoLeft = 12;
    autoBtn.setAttribute("aria-pressed", "true");
    autoBtn.textContent = "Stop blinking";
    autoTimer = setInterval(function () { blink(); if (--autoLeft <= 0) stopAuto(); }, reduced() ? 900 : 600);
  });

  // The answer buttons, and clicks on the picture itself.
  SPOTS.forEach(function (s) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "try-choice";
    b.dataset.spot = s.id;
    b.innerHTML = '<span class="try-letter">' + s.id + '</span><span class="sr-only"> spot ' + s.where + "</span>";
    b.addEventListener("click", function () { answer(s); });
    picks.appendChild(b);
  });
  canvas.addEventListener("click", function (e) {
    var r = canvas.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    var best = null, bd = 60;
    SPOTS.forEach(function (s) {
      [spotPos(s, 0), spotPos(s, 1)].forEach(function (p) { var d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = s; } });
    });
    if (best) answer(best);
  });

  function answer(s) {
    stopAuto();
    Array.prototype.forEach.call(picks.children, function (b) {
      b.classList.toggle("is-right", b.dataset.spot === mover.id && (s === mover || solved));
      if (b.dataset.spot === s.id && s !== mover) b.classList.add("is-wrong");
    });
    if (s !== mover) {
      result.className = "try-result is-wrong";
      result.textContent = "Not that one: spot " + s.id + " is in the same place in both pictures. Blink again and look for the spot that jumps.";
      return;
    }
    var first = !solved;
    solved = true;
    result.className = "try-result is-right";
    result.innerHTML = "";
    var p = document.createElement("p");
    p.textContent = "Yes! Spot " + mover.id + " jumped between the two pictures, so it moved. Far-away stars stay put. That is how astronomers spot comets and nearby stars in real pictures.";
    var a = document.createElement("a");
    a.className = "btn try-next"; a.href = "viewer.html";
    a.textContent = "Now try real SPHEREx pictures in the sky viewer";
    result.appendChild(p); result.appendChild(a);
    if (first) {
      site.markVisited("first-light");
      drawMap(true);
      celebrate();
    }
  }
  function celebrate() {
    if (reduced()) { draw(); return; }
    var t0 = performance.now();
    (function step(now) {
      var t = Math.min(1, (now - t0) / 650);
      draw(t < 1 ? t : 0);
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }

  // The same two pictures in words, for anyone who cannot see them.
  words.textContent = "Both pictures show the same patch of sky: many faint stars, one bright star near the middle, and three marked spots. " +
    SPOTS.map(function (s) {
      return s === mover
        ? "In picture 1, spot " + s.id + " is " + s.where + ". In picture 2 it has moved a little up and to the right."
        : "Spot " + s.id + " is " + s.where + " in both pictures.";
    }).join(" ");
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(); });
  // A new theme redraws the picture in its colours.
  if (window.MutationObserver) new MutationObserver(function () { draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  draw();

  // ---------- Places to go, with their guides ----------
  // Each card is a small version of the guide on every step: the guide stands beside her thought
  // cloud, with the details underneath. The cloud always holds her line, so the card never
  // changes size; Say hello makes her say it (typing, lips, and her voice if voices are on).
  var HELLO = {
    selene: "Hi, I'm Selene, goddess of the Moon. Come and watch the sky change, and spot what moves!",
    iris: "Hi, I'm Iris, goddess of the rainbow. Come and see the colours your eyes can't, and hear them too!",
    // A guide who leads more than one place says something different for each (by section id).
    spot: "Not sure what's worth marking? Five short steps with me, and you'll know what to look for."
  };
  var DETAIL = {
    viewer: { blurb: "Pick a patch of sky and watch months pass in seconds. If something moves, mark it.", meta: "3 steps · about 2 minutes", cta: "Open the sky viewer" },
    spot: { blurb: "Learn the signs worth marking and the traps that fool everyone, then practise on made-up skies.", meta: "5 steps · about 4 minutes", cta: "Spot a candidate" },
    cryostella: { blurb: "Walk past the end of the rainbow, then read, hear and play with the light beyond it.", meta: "4 steps · about 3 minutes", cta: "Open Cryostella" },
    // Selene guides more than one part, so this card has its own greeting.
    beginnings: { blurb: "Tell Selene your birthday and watch SPHEREx's pictures from that date build a ring around the sky.", meta: "4 steps · about 2 minutes", cta: "Open Your Beginnings",
      hello: "Tell me your birthday, and I'll show you the sky SPHEREx saw that day, and the famous objects it met!" }
  };
  function hello(s) { return (DETAIL[s.id] && DETAIL[s.id].hello) || HELLO[s.id] || HELLO[s.guide]; }
  // A small drawing in the corner of each card, in the guide's own motif (decoration only).
  var DECOR = {
    selene: '<path class="dc-moon" d="M58 10a22 22 0 1 0 14 39A24 24 0 0 1 58 10z"/><path class="dc-star" d="m86 18 1.6 3.8 3.8 1.6-3.8 1.6L86 28.8l-1.6-3.8-3.8-1.6 3.8-1.6z"/><circle class="dc-dot" cx="22" cy="20" r="1.6"/><circle class="dc-dot" cx="94" cy="52" r="1.2"/>',
    iris: '<g class="dc-bow" fill="none" stroke-width="3.2" stroke-linecap="round"><path class="bow-1" d="M8 62a46 46 0 0 1 92 0"/><path class="bow-2" d="M14 62a40 40 0 0 1 80 0"/><path class="bow-3" d="M20 62a34 34 0 0 1 68 0"/><path class="bow-4" d="M26 62a28 28 0 0 1 56 0"/><path class="bow-5" d="M32 62a22 22 0 0 1 44 0"/></g>'
  };
  var IMAGES = { orpheus: "assets/orpheus/orpheus-cutout.webp" };
  var list = $("adv-list"), soon = $("adv-soon"), speakers = [];
  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>';
  var SPEAK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="fill" d="M4 9.5h3.6L12 6v12l-4.4-3.5H4z"/><path d="M15.6 9a4.2 4.2 0 0 1 0 6M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/></svg>';

  function drawCloud(sp) {
    var b = sp.bubble, W = b.offsetWidth, H = b.offsetHeight;
    if (!W || !H || !window.SeleneCloud) return;
    if (sp.size !== W + "x" + H) {
      sp.size = W + "x" + H;
      var c = window.SeleneCloud.path(W, H);
      sp.cloud.setAttribute("viewBox", "0 0 " + W + " " + H);
      sp.cloud.innerHTML = '<path class="cloud-glow" filter="url(#guide-blur)" d="' + c.d + '"/>' +
        '<path class="cloud-fill" fill="url(#guide-shine)" d="' + c.d + '"/>' +
        '<path class="cloud-edge" d="' + c.d + '"/><g>' + window.SeleneCloud.stickers(c.lobes, false) + "</g>";
    }
    // Three thought bubbles rising from her head to the cloud (as in js/guide.js).
    var dots = sp.li.querySelectorAll(".adv-trail i"), fig = sp.fig, th = sp.thought, slot = sp.slot;
    var ch = sp.who && sp.who.ch;
    if (!ch || !slot.offsetWidth || dots.length < 3) return;
    var sw = slot.offsetWidth, sh = slot.offsetHeight, k = Math.min(sw / ch.rig.w, sh / ch.rig.h);
    var hx = fig.offsetLeft + (sw - ch.rig.w * k) / 2 + ch.head.x * k, hy = fig.offsetTop + (sh - ch.rig.h * k) + ch.head.y * k;
    var cx = th.offsetLeft + 20, cy = Math.max(th.offsetTop + H * 0.35, Math.min(hy - 16, th.offsetTop + H - 36));
    var mx = (hx + cx) / 2, my = Math.min(hy, cy) - 16, D = [{ t: 0.18, d: 6 }, { t: 0.45, d: 9 }, { t: 0.75, d: 12 }];
    for (var i = 0; i < 3; i++) {
      var t = D[i].t, u = 1 - t, st = dots[i].style;
      st.left = (u * u * hx + 2 * u * t * mx + t * t * cx).toFixed(1) + "px";
      st.top = (u * u * hy + 2 * u * t * my + t * t * cy).toFixed(1) + "px";
      st.width = st.height = D[i].d + "px";
    }
  }

  site.sections.forEach(function (s) {
    if (s.id === "home" || s.id === "candidates") return;
    var li = document.createElement("li");
    if (s.ready && DETAIL[s.id]) {
      var d = DETAIL[s.id], name = window.Selene ? window.Selene.character(s.guide).name : s.guide;
      li.className = "adv adv-" + s.guide;
      li.innerHTML =
        '<svg class="adv-decor" viewBox="0 0 100 70" aria-hidden="true" focusable="false">' + (DECOR[s.guide] || "") + "</svg>" +
        '<div class="adv-stage">' +
          '<div class="adv-fig" aria-hidden="true"><div class="selene-slot adv-guide" data-variant="figure" data-character="' + s.guide + '"></div></div>' +
          '<div class="adv-thought"><div class="adv-bubble"><svg class="adv-cloud" aria-hidden="true" focusable="false"></svg>' +
            '<p class="adv-says"><span class="sr-only">' + name + ' says: </span><span class="adv-line">' + hello(s) + "</span></p></div></div>" +
          '<span class="adv-trail" aria-hidden="true"><i></i><i></i><i></i></span>' +
        "</div>" +
        '<div class="adv-body">' +
          '<p class="adv-with">With ' + name + ' <span aria-hidden="true">·</span> ' + d.meta + "</p>" +
          '<h3 class="adv-name">' + s.name + "</h3>" +
          '<p class="adv-blurb">' + d.blurb + "</p>" +
          // data-tour-continue: if the home tour is open, this part's own guide carries it on.
          '<div class="adv-actions"><a class="btn adv-go" href="' + s.href + '" data-tour-continue="' + s.id + '"><span>' + d.cta + "</span>" + ARROW + "</a>" +
          '<button type="button" class="adv-hello">' + SPEAK + "<span>Say hello</span></button></div>" +
        "</div>";
      list.appendChild(li);
      var slot = li.querySelector(".adv-guide");
      var sp = { li: li, slot: slot, who: window.Selene ? window.Selene.mount(slot) : null, line: li.querySelector(".adv-line"),
        bubble: li.querySelector(".adv-bubble"), cloud: li.querySelector(".adv-cloud"), fig: li.querySelector(".adv-fig"),
        thought: li.querySelector(".adv-thought"), size: "" };
      speakers.push(sp);
      if (window.ResizeObserver) new ResizeObserver(function () { drawCloud(sp); }).observe(sp.bubble);
      li.querySelector(".adv-hello").addEventListener("click", function () {
        // One guide talks at a time.
        speakers.forEach(function (o) { if (o !== sp && o.who) { o.who.stop(); o.li.classList.remove("is-talking"); if (o.typer) { o.typer.all(); o.typer = null; } } });
        // Selene's tour waits for this ("Your turn: meet Iris").
        var done = function () { document.dispatchEvent(new CustomEvent("selenites:hello-done", { detail: { guide: s.guide } })); };
        if (!sp.who) { done(); return; }
        if (sp.typer) sp.typer.stop();
        sp.typer = window.SeleneType ? window.SeleneType(sp.line) : null;
        if (sp.typer) sp.typer.start();
        li.classList.add("is-talking");
        sp.who.say(hello(s), {
          // Say hello was pressed, so she says it aloud when her recording is there.
          voice: true,
          onReveal: function (n) { if (sp.typer) sp.typer.reveal(n); },
          onDone: function () { li.classList.remove("is-talking"); setTimeout(done, 500); }
        });
      });
    } else if (!s.ready) {
      li.className = "adv-later";
      li.innerHTML = (IMAGES[s.guide] ? '<img src="' + IMAGES[s.guide] + '" alt="" width="670" height="692" loading="lazy">' : site.icon(s.icon)) +
        '<span><strong>' + s.name + "</strong><span>" + s.desc + (s.guide ? " (with " + s.guide.charAt(0).toUpperCase() + s.guide.slice(1) + ")" : "") + '</span></span><span class="adv-badge">Being built</span>';
      soon.appendChild(li);
    }
  });
  window.addEventListener("load", function () { speakers.forEach(drawCloud); });

  // ---------- Your sky map ----------
  // One star per place, joined like a constellation. Lit once visited; a dashed ring for parts
  // still being built. The list beside it says the same in words.
  var MAP = [
    { id: "first-light", name: "Spot the mover", x: 40, y: 170, ready: true },
    { id: "viewer", x: 118, y: 92 },
    { id: "cryostella", x: 200, y: 152 },
    { id: "orchestra", x: 272, y: 64 },
    { id: "games", x: 334, y: 146 },
    { id: "beginnings", x: 386, y: 70 }
  ];
  MAP.forEach(function (m) {
    var s = site.sections.filter(function (x) { return x.id === m.id; })[0];
    if (s) { m.name = s.name === "Weave the Cosmic Tapestry" ? "Games" : s.name; m.ready = s.ready; m.href = s.href; }
  });
  function drawMap(fresh) {
    var seen = site.visited(), svg = $("map-svg"), out = "";
    for (var i = 1; i < MAP.length; i++) {
      var a = MAP[i - 1], b = MAP[i], lit = seen.indexOf(a.id) >= 0 && seen.indexOf(b.id) >= 0;
      out += '<line class="map-line' + (lit ? " is-lit" : "") + '" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"/>';
    }
    MAP.forEach(function (m) {
      var on = seen.indexOf(m.id) >= 0;
      if (on) {
        out += '<g class="map-star is-lit' + (fresh && m.id === "first-light" ? " is-new" : "") + '" transform="translate(' + m.x + " " + m.y + ')">' +
          '<circle r="16" class="map-glow"/><path d="M0-12 2.6-2.6 12 0 2.6 2.6 0 12-2.6 2.6-12 0-2.6-2.6z"/></g>';
      } else if (m.ready) {
        out += '<circle class="map-star is-dim" cx="' + m.x + '" cy="' + m.y + '" r="5"/>';
      } else {
        out += '<circle class="map-star is-later" cx="' + m.x + '" cy="' + m.y + '" r="7"/>';
      }
      out += '<text class="map-label" x="' + m.x + '" y="' + (m.y + 30) + '" text-anchor="middle">' + m.name + "</text>";
    });
    svg.innerHTML = out;
    var ready = MAP.filter(function (m) { return m.ready; });
    var lit = ready.filter(function (m) { return seen.indexOf(m.id) >= 0; }).length;
    var later = MAP.length - ready.length;
    $("map-count").textContent = "You have lit " + lit + " of " + ready.length + " stars." + (later ? " " + later + " more appear as new parts open." : "");
    $("map-list").innerHTML = MAP.map(function (m) {
      var on = seen.indexOf(m.id) >= 0;
      var state = on ? "lit" : m.ready ? "not visited yet" : "being built";
      var name = m.href && !on ? '<a href="' + m.href + '">' + m.name + "</a>" : m.name;
      return '<li class="' + (on ? "is-lit" : m.ready ? "" : "is-later") + '"><span class="map-dot" aria-hidden="true"></span>' + name + ": " + state + "</li>";
    }).join("");
  }
  $("map-reset").addEventListener("click", function () {
    try { localStorage.removeItem("selenites-visited"); } catch (e) {}
    drawMap(false);
    $("map-count").setAttribute("tabindex", "-1");
    $("map-count").focus();
  });
  drawMap(false);

  // ---------- Meet the Selenites ----------
  // The little sky on each team card: the constellation the person's star sign is named after,
  // plotted from real star positions (J2000 RA and Dec in degrees, and V magnitude, from the
  // Yale Bright Star Catalogue). North is up and east is left, as on a sky chart, and the lines
  // follow the usual figure. A card set to "moon" shows a crescent moon instead. To add one, put
  // its stars and lines here and set data-sky on the card in index.html.
  var SKIES = {
    leo: { // Regulus, eta, Algieba, Adhafera, Rasalas, epsilon, Zosma, Chertan, Denebola
      stars: [[152.093, 11.967, 1.35], [151.833, 16.763, 3.48], [154.993, 19.842, 2.01], [154.173, 23.417, 3.44], [148.191, 26.007, 3.88],
        [146.463, 23.774, 2.98], [168.527, 20.524, 2.56], [168.560, 15.430, 3.33], [177.265, 14.572, 2.14]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [6, 8], [8, 7], [7, 6], [7, 0]] },
    libra: { // Zubenelgenubi, Zubeneschamali, gamma, sigma, upsilon, tau
      stars: [[222.720, -16.042, 2.75], [229.252, -9.383, 2.61], [233.882, -14.790, 3.91], [226.018, -25.282, 3.29], [234.256, -28.135, 3.58], [234.664, -29.778, 3.66]],
      lines: [[0, 1], [1, 2], [2, 0], [0, 3], [2, 4], [4, 5]] },
    taurus: { // Aldebaran, theta2, gamma, delta1, Ain, Elnath, zeta, lambda, omicron; then the Pleiades (no lines)
      stars: [[68.980, 16.509, 0.86], [67.166, 15.871, 3.40], [64.948, 15.628, 3.65], [65.734, 17.543, 3.76], [67.154, 19.180, 3.53],
        [81.573, 28.608, 1.65], [84.411, 21.143, 3.00], [60.170, 12.490, 3.47], [51.203, 9.029, 3.60],
        [56.871, 24.105, 2.87], [56.219, 24.113, 3.70], [56.457, 24.368, 3.87], [56.581, 23.948, 4.18], [57.291, 24.053, 3.62]],
      lines: [[6, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 7], [7, 8]] },
    aries: { // Hamal, Sheratan, Mesarthim, 41 Arietis
      stars: [[31.793, 23.462, 2.00], [28.660, 20.808, 2.64], [28.383, 19.294, 3.88], [42.496, 27.260, 3.63]],
      lines: [[3, 0], [0, 1], [1, 2]] },
    sagittarius: { // The Teapot: Alnasl, Kaus Media, Kaus Australis, Kaus Borealis, phi, Nunki, tau, Ascella
      stars: [[271.452, -30.424, 2.98], [275.249, -29.828, 2.70], [276.043, -34.385, 1.85], [276.993, -25.422, 2.81],
        [281.414, -26.991, 3.17], [283.816, -26.297, 2.05], [286.735, -27.671, 3.32], [285.653, -29.880, 2.60]],
      lines: [[0, 1], [0, 2], [1, 2], [2, 7], [7, 4], [4, 1], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7]] },
    pisces: { // The Circlet (gamma, b, theta, iota, lambda, kappa), the cord through omega, delta, epsilon,
      // zeta, mu, nu and xi to the knot at Alrescha, then north through omicron and Alpherg (eta,
      // the brightest) to the northern fish (chi, phi, upsilon, tau). Pisces straddles RA 0h.
      stars: [[349.291, 3.282, 3.69], [350.086, 5.381, 5.05], [351.992, 6.379, 4.27], [354.988, 5.626, 4.13], [355.512, 1.780, 4.49],
        [351.733, 1.256, 4.94], [359.828, 6.863, 4.03], [12.171, 7.585, 4.43], [15.736, 7.890, 4.27], [18.433, 7.576, 5.21],
        [22.546, 6.144, 4.84], [25.358, 5.488, 4.44], [28.389, 3.188, 4.62], [30.512, 2.764, 3.82], [26.348, 9.158, 4.26],
        [22.871, 15.346, 3.62], [17.863, 21.035, 4.66], [18.437, 24.584, 4.67], [19.866, 27.264, 4.74], [17.915, 30.090, 4.51]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [3, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13],
        [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [18, 19], [19, 17]] }
  };
  var SKY_W = 120, SKY_H = 120, SKY_PAD = 16;
  function drawSky(box) {
    var key = box.getAttribute("data-sky"), out = "";
    if (key === "moon") {
      // The menu's moon, larger, in the middle of the window.
      out = '<g transform="translate(11 17) scale(2.7)"><path class="ts-moon" d="M20.5 4.5a11.5 11.5 0 1 0 7 20.6A12.5 12.5 0 0 1 20.5 4.5z"/></g>';
    } else {
      var c = SKIES[key];
      if (!c) return;
      var ras = c.stars.map(function (s) { return s[0]; }), decs = c.stars.map(function (s) { return s[1]; });
      // A constellation that straddles RA 0h (Pisces) would otherwise be split across the sky:
      // count the stars just past 0h as 360 degrees and more.
      if (Math.max.apply(null, ras) - Math.min.apply(null, ras) > 180) ras = ras.map(function (r) { return r < 180 ? r + 360 : r; });
      var stars = c.stars.map(function (s, i) { return [ras[i], s[1], s[2]]; });
      var ra0 = (Math.min.apply(null, ras) + Math.max.apply(null, ras)) / 2, dec0 = (Math.min.apply(null, decs) + Math.max.apply(null, decs)) / 2;
      var k = Math.cos(dec0 * Math.PI / 180);
      var pts = stars.map(function (s) { return { x: -(s[0] - ra0) * k, y: -(s[1] - dec0), m: s[2] }; });
      var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
      var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
      var scale = Math.min((SKY_W - 2 * SKY_PAD) / (maxX - minX || 1), (SKY_H - 2 * SKY_PAD) / (maxY - minY || 1));
      var ox = SKY_W / 2 - (minX + maxX) / 2 * scale, oy = SKY_H / 2 - (minY + maxY) / 2 * scale;
      pts.forEach(function (p) { p.x = (ox + p.x * scale).toFixed(1); p.y = (oy + p.y * scale).toFixed(1); });
      c.lines.forEach(function (l) {
        out += '<line class="ts-line" x1="' + pts[l[0]].x + '" y1="' + pts[l[0]].y + '" x2="' + pts[l[1]].x + '" y2="' + pts[l[1]].y + '"/>';
      });
      // Brighter stars are bigger; the brightest gets a soft glow.
      var brightest = Math.min.apply(null, pts.map(function (p) { return p.m; }));
      pts.forEach(function (p, i) {
        if (p.m === brightest) out += '<circle class="ts-glow" cx="' + p.x + '" cy="' + p.y + '" r="7.5"/>';
        out += '<circle class="ts-star" style="--i:' + i + '" cx="' + p.x + '" cy="' + p.y + '" r="' + Math.max(1.3, 3.9 - 0.7 * p.m).toFixed(2) + '"/>';
      });
    }
    box.insertAdjacentHTML("afterbegin", '<svg class="team-stars" viewBox="0 0 ' + SKY_W + " " + SKY_H + '" aria-hidden="true" focusable="false">' + out + "</svg>");
  }
  Array.prototype.forEach.call(document.querySelectorAll(".team-sky[data-sky]"), drawSky);

  // The polaroid's holographic shine follows the pointer across the card, like a foil trading
  // card. It only shows while pointing at the card (css/home.css), and stays still with
  // reduced motion.
  if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
    Array.prototype.forEach.call(document.querySelectorAll(".team-card"), function (card) {
      var photo = card.querySelector(".team-photo");
      if (!photo) return;
      card.addEventListener("pointermove", function (e) {
        if (reduced()) return;
        var r = card.getBoundingClientRect();
        var x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
        photo.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        photo.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        photo.style.setProperty("--hx", (100 - x * 100).toFixed(1) + "%");
      });
    });
  }
})();
