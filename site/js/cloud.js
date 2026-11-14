// Selene's thought cloud: the shape and the stickers, shared by the tour (js/tour.js) and the
// step guide (js/guide.js), so both clouds look the same.
// SeleneCloud.path(W, H)        { d: SVG path, lobes: [...] } for a cloud filling a W x H box
// SeleneCloud.stickers(lobes)   SVG for a crescent moon and two sparkles on the top lobes
// SeleneType(el)                shows the words in el one by one: .start(), .reveal(n), .all()
(function () {
  "use strict";

  function seeded(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ---------- the thought cloud the words sit in ----------

  // A classic thought cloud, drawn the way it is drawn by hand: a chain of overlapping round lobes
  // of different sizes around a soft body. The outline follows only the outer arc of each lobe,
  // so it dips in where two lobes meet. Bigger lobes along the top make it look fluffy.
  function cloudPath(W, H) {
    // The lobes reach about 30px beyond the body, so the body is inset by that much and the
    // whole cloud stays inside its box (nothing spills off the screen).
    var inset = 32, x0 = inset, y0 = inset, w = W - inset * 2, h = H - inset * 2;
    var r = Math.min(w, h) * 0.4, pts = [], step = 2;
    function edge(ax, ay, bx, by, nx, ny) {
      var n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
      for (var i = 0; i < n; i++) pts.push([ax + (bx - ax) * i / n, ay + (by - ay) * i / n, nx, ny]);
    }
    function arc(cx, cy, a0, a1) {
      var n = Math.max(2, Math.round(Math.abs(a1 - a0) * r / step));
      for (var i = 0; i < n; i++) { var a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a)]); }
    }
    edge(x0 + r, y0, x0 + w - r, y0, 0, -1);
    arc(x0 + w - r, y0 + r, -Math.PI / 2, 0);
    edge(x0 + w, y0 + r, x0 + w, y0 + h - r, 1, 0);
    arc(x0 + w - r, y0 + h - r, 0, Math.PI / 2);
    edge(x0 + w - r, y0 + h, x0 + r, y0 + h, 0, 1);
    arc(x0 + r, y0 + h - r, Math.PI / 2, Math.PI);
    edge(x0, y0 + h - r, x0, y0 + r, -1, 0);
    arc(x0 + r, y0 + r, Math.PI, Math.PI * 1.5);
    var lens = [0];
    for (var i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    var L = lens[lens.length - 1] + Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
    function at(s) {
      s = ((s % L) + L) % L;
      for (var j = 1; j < lens.length; j++) if (lens[j] >= s) return pts[j - 1];
      return pts[pts.length - 1];
    }
    var R = seeded(Math.round(W) * 3 + Math.round(H) * 7);
    var n = Math.max(7, Math.round(L / 80)), S = L / n, lobes = [];
    for (var k = 0; k < n; k++) {
      var p = at((k + 0.5) * S + (R() - 0.5) * S * 0.24);
      var lr = Math.min(S * (0.66 + R() * 0.14) * (p[3] < -0.5 ? 1.12 : p[3] > 0.5 ? 0.9 : 1), (inset - 2) * 2);
      lobes.push({ x: p[0] - p[2] * lr * 0.5, y: p[1] - p[3] * lr * 0.5, r: lr });
    }
    // Where two neighbouring lobes cross, on the outside.
    function meet(a, b) {
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (!d || d >= a.r + b.r) return [(a.x + b.x) / 2 + (a.y - b.y) * 0, (a.y + b.y) / 2];
      var l = (a.r * a.r - b.r * b.r + d * d) / (2 * d), q = Math.sqrt(Math.max(0, a.r * a.r - l * l));
      var mx = a.x + dx * l / d, my = a.y + dy * l / d;
      var p1 = [mx - dy * q / d, my + dx * q / d], p2 = [mx + dy * q / d, my - dx * q / d];
      return Math.hypot(p1[0] - W / 2, p1[1] - H / 2) > Math.hypot(p2[0] - W / 2, p2[1] - H / 2) ? p1 : p2;
    }
    var meets = lobes.map(function (a, k2) { return meet(a, lobes[(k2 + 1) % n]); });
    function f(v) { return (Math.round(v * 10) / 10).toString(); }
    var d = "M" + f(meets[n - 1][0]) + " " + f(meets[n - 1][1]);
    lobes.forEach(function (c, k3) {
      var from = k3 ? meets[k3 - 1] : meets[n - 1], to = meets[k3];
      var a0 = Math.atan2(from[1] - c.y, from[0] - c.x), a1 = Math.atan2(to[1] - c.y, to[0] - c.x), da = a1 - a0;
      while (da <= 0) da += Math.PI * 2;
      d += "A" + f(c.r) + " " + f(c.r) + " 0 " + (da > Math.PI ? 1 : 0) + " 1 " + f(to[0]) + " " + f(to[1]);
    });
    return { d: d + "Z", lobes: lobes };
  }
  function sparkle(x, y, r) {
    var q = r * 0.28;
    return '<path class="cloud-sticker" d="M' + x + ' ' + (y - r) + 'Q' + (x + q) + ' ' + (y - q) + ' ' + (x + r) + ' ' + y + 'Q' + (x + q) + ' ' + (y + q) + ' ' + x + ' ' + (y + r) +
      'Q' + (x - q) + ' ' + (y + q) + ' ' + (x - r) + ' ' + y + 'Q' + (x - q) + ' ' + (y - q) + ' ' + x + ' ' + (y - r) + 'Z"/>';
  }
  // Stickers sit on the top lobes: a crescent moon on the left, sparkles on the right.
  // small: false leaves out the little sparkle, which would sit on the words in a small cloud.
  function stickers(lobes, small) {
    var top = lobes.slice().sort(function (a, b) { return (a.y - a.r) - (b.y - b.r); }).slice(0, 4);
    top.sort(function (a, b) { return a.x - b.x; });
    var L = top[0], Rr = top[top.length - 1];
    var mx = L.x - L.r * 0.55, my = L.y - L.r * 0.7, s = "";
    s += '<path class="cloud-sticker" transform="translate(' + mx.toFixed(1) + ' ' + my.toFixed(1) + ')" d="M2 -15a15 15 0 1 0 12 24a12 12 0 1 1 -12 -24z"/>';
    s += sparkle(Math.round(Rr.x + Rr.r * 0.45), Math.round(Rr.y - Rr.r * 0.78), 10);
    if (small !== false) s += sparkle(Math.round(Rr.x + Rr.r * 0.86), Math.round(Rr.y - Rr.r * 0.22), 5.5);
    return s;
  }

  window.SeleneCloud = { path: cloudPath, stickers: stickers };

  // ---------- the words appearing in a cloud ----------
  // Every word is laid out from the start (invisible), so the lines are fixed and nothing jumps
  // or re-wraps while the words appear. Words then drift in one after another (a soft fade that
  // rises a touch into place), following how far Selene has got in what she is saying. There is
  // no caret. When she is done the words are joined back into plain text, so screen readers and
  // copy and paste see normal text. Inline markup (such as a highlighted name) is kept.
  function unwrap(el) {
    var spans = el.querySelectorAll("span.w");
    for (var i = 0; i < spans.length; i++) spans[i].replaceWith(document.createTextNode(spans[i].textContent));
    el.normalize();
  }
  // Wraps each word in a span. Returns the words and, for each, the index of its first letter
  // in the whole text (so "she has got as far as letter n" can be turned into words).
  function wrap(el) {
    unwrap(el);
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], words = [], starts = [], at = 0;
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var frag = document.createDocumentFragment(), parts = n.nodeValue.split(/(\s+)/);
      parts.forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
        else {
          var w = document.createElement("span");
          w.className = "w";
          w.textContent = p;
          frag.appendChild(w);
          words.push(w);
          starts.push(at);
        }
        at += p.length;
      });
      n.parentNode.replaceChild(frag, n);
    });
    return { words: words, starts: starts };
  }
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  // The gap between two words appearing, in ms: close to how fast Selene says them, never so
  // fast that the words flicker, and quicker when they have fallen behind her.
  var GAP = 95;
  function Typer(el) { this.el = el; this.words = []; this.starts = []; this.shown = 0; this.target = 0; this.timer = 0; this.frame = 0; }
  Typer.prototype.start = function () {
    clearTimeout(this.timer);
    clearTimeout(this.frame); this.frame = 0;
    var w = wrap(this.el);
    this.words = w.words; this.starts = w.starts;
    this.shown = 0; this.target = 0;
    this.el.classList.add("is-typing");
    return this.words.length;
  };
  // She has got as far as letter n: show every word she has started, and the one after it,
  // so the words keep just ahead of her voice.
  Typer.prototype.reveal = function (n) {
    if (!this.el.classList.contains("is-typing")) return;
    if (motionQuery && motionQuery.matches) { this.all(); return; }
    var k = 0;
    while (k < this.starts.length && this.starts[k] < n) k++;
    if (k > 0 && k < this.words.length) k++;
    this.target = Math.max(this.target, Math.min(k, this.words.length));
    if (!this.frame && this.shown < this.target) this.tick();
  };
  Typer.prototype.tick = function () {
    var self = this;
    this.frame = 0;
    if (!this.el.classList.contains("is-typing")) return;
    if (this.shown < this.target) {
      var behind = this.target - this.shown, step = behind > 6 ? 2 : 1;
      for (var i = 0; i < step && this.shown < this.target; i++) this.words[this.shown++].classList.add("on");
    }
    if (this.shown >= this.words.length) { this.finish(700); return; }
    if (this.shown < this.target) this.frame = setTimeout(function () { self.tick(); }, GAP);
  };
  // Everything at once (skip, reduced motion).
  Typer.prototype.all = function () {
    clearTimeout(this.frame); this.frame = 0;
    for (var i = this.shown; i < this.words.length; i++) this.words[i].classList.add("on");
    this.shown = this.words.length;
    this.finish(0);
  };
  Typer.prototype.finish = function (wait) {
    var self = this;
    clearTimeout(this.timer);
    this.timer = setTimeout(function () {
      clearTimeout(self.frame); self.frame = 0;
      self.el.classList.remove("is-typing");
      unwrap(self.el);
      self.words = []; self.starts = [];
    }, wait);
  };
  Typer.prototype.stop = function () { clearTimeout(this.timer); clearTimeout(this.frame); this.frame = 0; this.el.classList.remove("is-typing"); unwrap(this.el); this.words = []; this.starts = []; };

  window.SeleneType = function (el) { return new Typer(el); };
})();
