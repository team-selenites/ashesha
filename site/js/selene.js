// Selene, our guide (project plan, section 5).
//
// Selene is a figure with no frame or background: just her and her moon. Whichever files exist:
//   1. a cut-out picture (MEDIA.cutout): Selene and her moon on a transparent background, cut
//      from a Gemini picture made on a flat green background. Her lips move with her words and
//      she blinks: a small WebGL "rig" bends her lower face and eyelids (see RIG below);
//   2. fully animated video clips made on a flat green background. The green is removed live in
//      the browser (a WebGL "chroma key"), so she stands on the page whatever the theme. Each
//      clip carries her recorded voice, and the words on screen follow the clip;
//   3. without a cut-out: her Gemini portrait with softly faded edges.
// The pictures were made with Google Gemini (credited in the footer, logged in docs/ai-use-log.md).
//
// Motion rules: she only moves while she is talking and settles a few seconds after; reduced
// motion shows a still picture (her voice can still play). She is decorative (aria-hidden); her
// words are on screen.
//
// Selene.mountAll()                fills every .selene-slot (data-variant: figure or head)
// instance.say(text, options)      types the words while she speaks
//                                  options.video: a talking clip on green; options.voice: sound on;
//                                  options.audio: a recording (otherwise the recording of these
//                                  exact words, from assets/voice/manifest.json). Without one she
//                                  talks silently: the device's built-in voice is never used.
// instance.stop() / .skip()        stop talking / show all the words at once
(function () {
  "use strict";

  // The same rig drives every guide (Selene, Iris, and later Orpheus and Argus). A slot picks its
  // guide with data-character="iris"; without it, it is Selene. Each guide needs its own files
  // and its own measurements (CHARACTERS below).

  // Selene's files. Set idle once it exists in site/assets/selene/.
  var MEDIA = {
    portrait: "assets/selene/selene-portrait.webp",
    face: "assets/selene/selene-face.webp",
    cutout: "assets/selene/selene-cutout.webp", // Selene and her moon, transparent background
    // The same picture split in two for the rig: top half without her raised hand (the moon
    // painted in behind it), bottom half the hand alone, so it can move.
    rig: "assets/selene/selene-rig.webp",
    idle: null      // "assets/selene/selene-idle.mp4": a few seconds of her breathing, on green
  };

  // Where her mouth and eyes are, in pixels of selene-cutout.webp (632 x 480), measured on a
  // zoomed copy of the picture. A new picture needs new measurements.
  //   mouth: x = centre, hw = half its width, y = the lip line at the corners, curve = how far the
  //          lip line dips in the middle, chin = bottom of the chin, neck = how far below the chin
  //          the jaw movement fades out, open = how far the lower lip drops on a wide-open "a".
  //   eyes:  cx, hw = centre and half width; c0, c1 = height of the left and right corner;
  //          up, lo = how far the upper and lower lids curve away from the corners.
  //   lid:   how much eyelid skin above the lashes is stretched down to close the eye.
  //   wrist: where her raised hand turns.
  var RIG = {
    w: 632, h: 480,
    wrist: { x: 521, y: 254 },
    mouth: { x: 286.5, hw: 27, y: 206.3, curve: 3, chin: 247, neck: 22, open: 11.5 },
    eyes: [
      { cx: 256.65, hw: 14.15, c0: 152.5, c1: 155, up: 3.95, lo: 4.05 },
      { cx: 317.5, hw: 16.7, c0: 155, c1: 151.7, up: 3.9, lo: 4 }
    ],
    lid: 7,
    hand: 1      // how far and which way the raised hand turns (1 = Selene's own)
  };

  // Iris, guide to colours (Cryostella). Measured on a zoomed copy of iris-cutout.webp (842 x 713)
  // with the curves drawn over it to check the fit (12 November 2026). Her raised hand holds a
  // floating prism: the hand turns at the wrist, gently and away from the prism (hand: -0.6),
  // and the prism and its light stay where they are.
  var IRIS_MEDIA = {
    portrait: null,
    face: "assets/iris/iris-face.webp",
    cutout: "assets/iris/iris-cutout.webp",
    rig: "assets/iris/iris-rig.webp",
    idle: null
  };
  var IRIS_RIG = {
    w: 842, h: 713,
    wrist: { x: 570, y: 352 },
    mouth: { x: 330, hw: 29, y: 210.4, curve: 5, chin: 258, neck: 27, open: 14 },
    eyes: [
      { cx: 296.15, hw: 18.35, c0: 142.5, c1: 148.3, up: 8.1, lo: 4.9 },
      { cx: 364.35, hw: 14.35, c0: 147.5, c1: 142.5, up: 8.5, lo: 5.5 }
    ],
    lid: 9,
    hand: -0.6,
    handTop: 205  // the hand starts below this line; nothing above it is read from the hand layer
  };

  // head: a point on the hair just above the head, on the side of the raised hand (picture
  // pixels), where thought bubbles start.
  var CHARACTERS = {
    selene: { name: "Selene", media: MEDIA, rig: RIG, head: { x: 330, y: 62 } },
    iris: { name: "Iris", media: IRIS_MEDIA, rig: IRIS_RIG, head: { x: 372, y: 34 }, pitch: 1.12 }
  };

  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() { return !!(motionQuery && motionQuery.matches); }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // How words are said aloud when they are not spelled the way they sound.
  var SAY_AS = [
    [/SPHEREx/g, "Sphere-ex"],
    [/3I\/ATLAS/g, "three-eye Atlas"],
    [/\bIRSA\b/g, "Irsa"],
    [/\bRA\b/g, "R A"]
  ];
  function spoken(text) { return SAY_AS.reduce(function (t, r) { return t.replace(r[0], r[1]); }, text); }

  // Mouth shapes for letters: how open (0 to 1) and how wide (-1 rounded, 1 stretched).
  var SHAPES = {};
  [["a", 0.95, 0.25], ["e", 0.6, 0.75], ["i", 0.45, 0.85], ["o", 0.8, -0.65], ["u", 0.45, -0.9], ["y", 0.4, 0.6],
   ["mbp", 0, 0], ["fv", 0.12, 0.25], ["w", 0.25, -0.85], ["ltdn", 0.35, 0.25], ["sz", 0.18, 0.65], ["cx", 0.25, 0.5],
   ["r", 0.32, -0.35], ["kgqh", 0.45, 0.1], ["j", 0.3, -0.4], ["0123456789", 0.45, 0.2]].forEach(function (s) {
    s[0].split("").forEach(function (ch) { SHAPES[ch] = [s[1], s[2]]; });
  });
  var REST = [0, 0];
  function shapeOf(ch) { return SHAPES[(ch || "").toLowerCase()] || REST; }
  // The word at or just after position i.
  function wordAt(text, i) { var m = text.slice(Math.max(0, i)).match(/[A-Za-z0-9']+/); return m ? m[0] : ""; }

  function compile(gl, vsrc, fsrc) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = sh(gl.VERTEX_SHADER, vsrc), fs = sh(gl.FRAGMENT_SHADER, fsrc);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return prog;
  }

  // ---------- removing the green from a video, live ----------

  var VERT = "attribute vec2 p;varying vec2 v;void main(){v=vec2((p.x+1.0)*0.5,(1.0-p.y)*0.5);gl_Position=vec4(p,0.0,1.0);}";
  // Compare each pixel's colour (ignoring brightness) with the key green; fade it out when close,
  // and pull leftover green off the edges of her hair ("spill").
  var FRAG = "precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec3 key;uniform float sim;uniform float soft;uniform float spill;" +
    "vec2 cc(vec3 c){return vec2(-0.169*c.r-0.331*c.g+0.5*c.b,0.5*c.r-0.419*c.g-0.081*c.b);}" +
    "void main(){vec4 c=texture2D(t,v);float d=distance(cc(c.rgb),cc(key));float a=smoothstep(sim,sim+soft,d);" +
    "float g=c.g-max(c.r,c.b);if(g>0.0){c.g-=g*spill;}gl_FragColor=vec4(c.rgb*a,a);}";

  function Keyer(canvas) {
    this.canvas = canvas;
    var gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    this.gl = gl;
    if (!gl) { this.ctx = canvas.getContext("2d", { willReadFrequently: true }); return; }
    var prog = compile(gl, VERT, FRAG);
    if (!prog) { this.gl = null; this.ctx = null; return; }
    gl.uniform3f(gl.getUniformLocation(prog, "key"), 0, 1, 0);
    gl.uniform1f(gl.getUniformLocation(prog, "sim"), 0.14);
    gl.uniform1f(gl.getUniformLocation(prog, "soft"), 0.1);
    gl.uniform1f(gl.getUniformLocation(prog, "spill"), 0.7);
  }
  Keyer.prototype.draw = function (src) {
    var w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
    if (!w || !h || (!this.gl && !this.ctx)) return false;
    var c = this.canvas;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; if (this.gl) this.gl.viewport(0, 0, w, h); }
    if (this.gl) {
      var gl = this.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return true;
    }
    // Without WebGL: the same idea, one pixel at a time.
    var ctx = this.ctx;
    ctx.drawImage(src, 0, 0, w, h);
    var img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2], ex = g - Math.max(r, b);
      if (ex > 40) d[i + 3] = Math.max(0, 255 - (ex - 40) * 4);
      if (ex > 0) d[i + 1] = g - ex * 0.7;
    }
    ctx.putImageData(img, 0, 0);
    return true;
  };

  // ---------- the talking rig ----------
  //
  // One small WebGL program draws the cut-out. For every pixel it asks which pixel of the picture
  // lands there (an "inverse warp"), the way 2D game characters are rigged (Live2D) but on a
  // single picture:
  // - jaw: everything under the lip line slides down, most at the middle of the lower lip and
  //   the chin, not at all at the mouth corners, fading out down the neck;
  // - the upper lip lifts a little on open sounds; rounded sounds (o, u, w) pull the mouth
  //   narrower, stretched ones (e, i, s) widen it;
  // - the gap between the lips is painted as a mouth: dark, with a hint of upper teeth;
  // - a blink stretches the eyelid skin above the lashes down until the lash line meets the
  //   lower lid.
  function n3(v) { return v.toFixed(3); }
  function rigFrag(RIG) {
    var m = RIG.mouth, e = RIG.eyes;
    function eye(E) { return "lid(vec4(" + [E.cx, E.hw, E.c0, E.c1].map(n3).join(",") + "),vec2(" + n3(E.up) + "," + n3(E.lo) + "),sx,p.y,sy);"; }
    return [
      "#ifdef GL_FRAGMENT_PRECISION_HIGH",
      "precision highp float;",
      "#else",
      "precision mediump float;",
      "#endif",
      "uniform sampler2D t;uniform vec2 view;uniform float openA;uniform float wideA;uniform float blinkA;uniform float handA;",
      "const vec2 SRC=vec2(" + n3(RIG.w) + "," + n3(RIG.h) + ");",
      "const vec2 WRIST=vec2(" + n3(RIG.wrist.x) + "," + n3(RIG.wrist.y) + ");",
      // The picture is stored twice as tall: the body on top, the hand underneath.
      "vec4 body(vec2 q){return texture2D(t,vec2(q.x/SRC.x,q.y/(2.0*SRC.y)));}",
      "vec4 hand(vec2 q){if(q.y<" + n3(RIG.handTop || 0.5) + "||q.y>SRC.y-0.5)return vec4(0.0);return texture2D(t,vec2(q.x/SRC.x,(q.y+SRC.y)/(2.0*SRC.y)));}",
      "const float MX=" + n3(m.x) + ",HW=" + n3(m.hw) + ",MY=" + n3(m.y) + ",CURVE=" + n3(m.curve) + ",CHIN=" + n3(m.chin) +
        ",NECK=" + n3(m.neck) + ",OPEN=" + n3(m.open) + ",LID=" + n3(RIG.lid) + ";",
      "float prof(float x,float hw,float e){float q=(x-MX)/hw;return pow(max(1.0-q*q,1e-5),e);}",
      "float jaw(float sy,float sx,float lp,float o,float e){float hwy=HW*(0.98+0.62*clamp((sy-lp)/22.0,0.0,1.0));" +
        "return o*prof(sx,hwy,e)*(1.0-smoothstep(CHIN,CHIN+NECK,sy));}",
      "void lid(vec4 E,vec2 F,float sx,float y,inout float sy){float t=(sx-E.x)/E.y;if(abs(t)>=1.0||blinkA<0.001)return;" +
        "float k=1.0-t*t;float cy=mix(E.z,E.w,(t+1.0)*0.5);float U=cy-F.x*k;float L=cy+F.y*k;float N=U+blinkA*(L-U);float T=U-LID;" +
        "if(y>=T&&y<=N&&N>U+0.001){sy=T+(y-T)*(U-T)/(N-T);}}",
      "void main(){",
      "vec2 p=vec2(gl_FragCoord.x,view.y-gl_FragCoord.y)/view*SRC;",
      "float rnd=max(0.0,-wideA),wid=max(0.0,wideA),o=openA*OPEN;",
      "float e=0.85-0.22*rnd-0.3*wid,k=0.27*rnd-0.15*wid;",
      "float dx=(p.x-MX)/(HW*1.4),dy=(p.y-MY-CURVE)/14.0;",
      "float sx=MX+(p.x-MX)*(1.0+k*exp(-dx*dx-dy*dy));",
      "float u=clamp((sx-MX)/HW,-1.0,1.0);float lp=MY+CURVE*(1.0-u*u);",
      "float h0=prof(sx,HW,e);float lift=0.3*o;float top=lp-lift*h0;float bot=lp+o*h0;",
      "float sy=p.y;",
      "if(o>0.001&&p.y>lp-14.0&&p.y<CHIN+NECK+2.0){",
      "if(p.y<(top+bot)*0.5){float s=p.y;for(int i=0;i<3;i++){s=min(p.y+lift*h0*(1.0-smoothstep(0.0,12.0,lp-s)),lp);}sy=s;}",
      "else{float s=max(p.y-jaw(max(p.y,lp),sx,lp,o,e),lp);for(int i=0;i<3;i++){s=max(p.y-jaw(s,sx,lp,o,e),lp);}sy=s;}",
      "}",
      eye(e[0]),
      eye(e[1]),
      "vec4 c=body(vec2(sx,sy));",
      "float gap=bot-top;",
      "if(gap>0.01){",
      "float rel=clamp((p.y-top)/gap,0.0,1.0);",
      "vec3 col=mix(vec3(0.27,0.11,0.15),vec3(0.20,0.07,0.10),smoothstep(0.0,0.5,rel));",
      "col=mix(col,vec3(0.50,0.24,0.28),smoothstep(0.55,1.0,rel)*0.6);",
      "float th=clamp(1.7/gap,0.0,0.42);",
      "float tm=(1.0-smoothstep(th-0.12,th+0.08,rel))*smoothstep(2.0,3.5,gap)*(1.0-smoothstep(0.45,0.75,abs((sx-MX)/HW)));",
      "col=mix(col,vec3(0.90,0.86,0.85),tm);",
      "float aa=0.5*SRC.x/view.x;",
      "float a=smoothstep(-aa,aa,p.y-top)*(1.0-smoothstep(-aa,aa,p.y-bot))*clamp(gap,0.0,1.0);",
      "c.rgb=mix(c.rgb,col*c.a,a);",
      "}",
      // Her raised hand, turned at the wrist, laid over the body.
      "float ca=cos(handA),sa=sin(handA);vec2 d=p-WRIST;",
      "vec4 h=hand(WRIST+vec2(ca*d.x+sa*d.y,-sa*d.x+ca*d.y));",
      "gl_FragColor=h+c*(1.0-h.a);}"
    ].join("\n");
  }

  function Rig(canvas, img, RIG) {
    this.canvas = canvas; this.img = img; this.ok = false; this.w = 0; this.R = RIG;
    var gl = null;
    try { gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false }); } catch (e) {}
    if (!gl) return;
    var prog = compile(gl, "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}", rigFrag(RIG));
    if (!prog) return;
    this.gl = gl;
    this.u = {
      view: gl.getUniformLocation(prog, "view"), open: gl.getUniformLocation(prog, "openA"),
      wide: gl.getUniformLocation(prog, "wideA"), blink: gl.getUniformLocation(prog, "blinkA"),
      hand: gl.getUniformLocation(prog, "handA")
    };
    var self = this;
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); self.ok = false; if (self.onlost) self.onlost(); });
    this.ok = true;
  }
  // Match the canvas to the size the picture is shown at (sharp on high-density screens, never
  // larger than the picture) and hand the GPU a copy at that size. Returns false while hidden.
  Rig.prototype.fit = function () {
    if (!this.ok) return false;
    var box = this.canvas.parentNode, w = box.offsetWidth, h = box.offsetHeight; // the canvas fills its slot
    if (!w || !h) return false;
    var RIG = this.R, ar = RIG.w / RIG.h, cover = getComputedStyle(this.canvas).objectFit === "cover";
    var shown = (w / h > ar) !== cover ? h * ar : w;
    var pw = Math.max(16, Math.round(Math.min(RIG.w, shown * Math.min(window.devicePixelRatio || 1, 2))));
    if (pw === this.w) return true;
    var ph = Math.round(pw / ar), gl = this.gl;
    var copy = document.createElement("canvas");
    copy.width = pw; copy.height = ph * 2; // body on top, hand underneath
    var x = copy.getContext("2d");
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    // The two halves are shrunk one at a time, so the bottom of the body never bleeds into the
    // top of the hand layer (it showed as a thin line across Iris's figure).
    var iw = this.img.naturalWidth, ih = this.img.naturalHeight / 2;
    x.drawImage(this.img, 0, 0, iw, ih, 0, 0, pw, ph);
    x.drawImage(this.img, 0, ih, iw, ih, 0, ph, pw, ph);
    // And a clear gap where the halves meet, so nothing can bleed across on any screen.
    x.clearRect(0, ph - 1, pw, 3);
    this.canvas.width = pw; this.canvas.height = ph;
    gl.viewport(0, 0, pw, ph);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, copy);
    gl.uniform2f(this.u.view, pw, ph);
    this.w = pw;
    return true;
  };
  Rig.prototype.draw = function (open, wide, blink, hand) {
    if (!this.ok || !this.w) return;
    var gl = this.gl;
    gl.uniform1f(this.u.open, open);
    gl.uniform1f(this.u.wide, wide);
    gl.uniform1f(this.u.blink, blink);
    gl.uniform1f(this.u.hand, (hand || 0) * (this.R.hand === undefined ? 1 : this.R.hand));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  // Loudness of a recording, for the mouth. Only when sound already plays through Web Audio,
  // so a blocked audio context can never silence her voice.
  var audioCtx = null;
  function meter(audio) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      audioCtx = audioCtx || new AC();
      if (audioCtx.state !== "running") { audioCtx.resume(); return null; }
      var src = audioCtx.createMediaElementSource(audio), an = audioCtx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      an.connect(audioCtx.destination);
      var buf = new Float32Array(an.fftSize);
      return function () {
        an.getFloatTimeDomainData(buf);
        var s = 0;
        for (var i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        return Math.sqrt(s / buf.length);
      };
    } catch (e) { return null; }
  }

  // ---------- an instance ----------

  function Instance(slot) {
    var variant = slot.getAttribute("data-variant") || "figure";
    var who = slot.getAttribute("data-character") || "selene";
    var ch = CHARACTERS[who] || CHARACTERS.selene, MEDIA = ch.media;
    this.ch = ch;
    this.who = who;
    slot.classList.add("selene", "selene-" + variant, "guide-char-" + who);
    slot.setAttribute("aria-hidden", "true");
    this.slot = slot;
    this.variant = variant;
    if (variant === "head") {
      slot.innerHTML = '<img class="selene-still" alt="" decoding="async" draggable="false" src="' + MEDIA.face + '">';
    } else {
      var still = MEDIA.cutout || MEDIA.portrait;
      slot.setAttribute("data-media", MEDIA.cutout ? "cutout" : "portrait");
      slot.innerHTML = '<img class="selene-still" alt="" decoding="async" draggable="false" src="' + still + '">' +
        '<canvas class="selene-canvas selene-rig" hidden></canvas>' +
        '<canvas class="selene-canvas selene-keyed" hidden></canvas>' +
        '<video class="selene-video" playsinline preload="auto" hidden></video>';
      this.rigCanvas = slot.querySelector(".selene-rig");
      this.canvas = slot.querySelector(".selene-keyed");
      this.video = slot.querySelector(".selene-video");
      this.keyer = null;
    }
    this.still = slot.querySelector(".selene-still");
    this.timers = []; this.settleTimer = 0; this.run = 0; this.frame = 0;
    this.speaking = false; this.voiced = false; this.audio = null;
    // The rig's state: where the mouth and eyelids are now, and what she is saying.
    this.rig = null; this.view = "still"; this.loop = 0; this.last = 0;
    this.mouth = { open: 0, wide: 0, blink: 0 }; this.drawn = null;
    this.lip = { word: "", t0: 0, ms: 70 }; this.level = null;
    this.nextBlink = 0; this.blinkAt = 0; this.blinkTwice = false;
    this.arm = { a: 0, v: 0, pose: 0, beat: 0, words: 0, next: 2 };
    this.tick = this.tick.bind(this);
    slot._selene = this;
    if (MEDIA.cutout && MEDIA.rig && this.rigCanvas && !reduced()) this.initRig();
  }

  // Which picture shows: the still, the rig (the same picture, able to move) or a keyed clip.
  Instance.prototype.show = function (which) {
    this.view = which;
    this.still.hidden = which !== "still";
    if (this.rigCanvas) this.rigCanvas.hidden = which !== "rig";
    if (this.canvas) this.canvas.hidden = which !== "video";
  };
  Instance.prototype.restView = function () { return this.rig && this.rig.ok && this.rig.w ? "rig" : "still"; };

  Instance.prototype.initRig = function () {
    var self = this, img = new Image();
    img.decoding = "async";
    img.src = this.ch.media.rig;
    function start() {
      var rig = new Rig(self.rigCanvas, img, self.ch.rig);
      if (!rig.ok) return;
      self.rig = rig;
      rig.onlost = function () { self.rig = null; if (self.view === "rig") self.show("still"); };
      self.refit();
      if (window.ResizeObserver) new ResizeObserver(function () { self.refit(); }).observe(self.slot);
    }
    if (img.complete && img.naturalWidth) start();
    else img.addEventListener("load", start, { once: true });
  };
  // Called when the figure changes size (and when the tour opens): resize, redraw, show.
  Instance.prototype.refit = function () {
    var rig = this.rig;
    if (!rig || !rig.ok) return;
    var was = rig.w;
    if (!rig.fit()) return;
    if (rig.w !== was || !this.drawn) {
      var m = this.mouth;
      rig.draw(m.open, m.wide, m.blink, this.arm.a);
      this.drawn = [m.open, m.wide, m.blink, this.arm.a];
    }
    if (this.view === "still") this.show("rig");
  };

  // Lips: mouth one word, letter by letter, ms milliseconds a letter.
  Instance.prototype.lipWord = function (word, ms) {
    this.lip.word = String(word || "");
    this.lip.t0 = performance.now();
    this.lip.ms = ms || 70;
    // Some words are said more fully than others, as in real speech.
    this.lip.gain = 0.82 + Math.random() * 0.3;
    if (this.lip.word) this.gesture();
    this.wake();
  };
  // Her hand while she explains: every few words it settles into a new open pose towards the
  // cloud, and it gives small beats on words, the way people move their hands when they explain.
  // Angles are in radians; positive turns her fingers towards the cloud.
  var POSES = [0.07, 0.13, 0.03, 0.16, 0.10, -0.02];
  Instance.prototype.gesture = function () {
    var arm = this.arm;
    arm.words++;
    if (arm.words >= arm.next) {
      var p;
      do { p = POSES[Math.floor(Math.random() * POSES.length)]; } while (p === arm.pose);
      arm.pose = p;
      arm.next = arm.words + 2 + Math.floor(Math.random() * 3);
    }
    if (Math.random() < 0.55) arm.beat = 0.04 + Math.random() * 0.03;
  };
  Instance.prototype.lipBusy = function () {
    var l = this.lip;
    return !!l.word && performance.now() < l.t0 + l.word.length * l.ms;
  };
  // Between sentences the hand relaxes a little, like a breath.
  Instance.prototype.lipStop = function () { this.lip.word = ""; this.level = null; this.arm.pose = Math.min(this.arm.pose, 0.04); };

  // The rig runs only while she talks, blinks or is still closing her mouth, then stops.
  Instance.prototype.wake = function () {
    if (!this.rig || !this.rig.ok || reduced() || this.loop) return;
    this.last = performance.now();
    this.loop = requestAnimationFrame(this.tick);
  };
  Instance.prototype.tick = function (now) {
    this.loop = 0;
    if (!this.rig || !this.rig.ok) return;
    var dt = Math.min(64, Math.max(0, now - this.last));
    this.last = now;
    var m = this.mouth, l = this.lip, target = REST;
    if (l.word) {
      var i = Math.floor((now - l.t0) / l.ms);
      if (i < l.word.length) target = shapeOf(l.word.charAt(i));
      else l.word = "";
    }
    var open = target[0] * (l.word ? (l.gain || 1) : 1);
    if (this.level) open = clamp((this.level() - 0.015) * 8, 0, 1);
    // Open quickly, close a little slower. The shape (round "o", wide "e") follows quickly too,
    // so each sound reads as its own shape rather than a plain open and close.
    m.open += (open - m.open) * (1 - Math.exp(-dt / (open > m.open ? 40 : 60)));
    m.wide += (target[1] - m.wide) * (1 - Math.exp(-dt / 50));

    // Blinks every few seconds while she is talking, now and then twice.
    var active = this.slot.classList.contains("is-active");
    if (active && !this.blinkAt && now >= this.nextBlink) {
      this.blinkAt = now;
      this.blinkTwice = Math.random() < 0.2;
      this.nextBlink = now + 2200 + Math.random() * 3200;
    }
    m.blink = 0;
    if (this.blinkAt) {
      var bt = now - this.blinkAt; // close in 70 ms, hold 30 ms, open in 120 ms
      if (bt < 0) m.blink = 0;
      else if (bt < 70) m.blink = (bt / 70) * (bt / 70);
      else if (bt < 100) m.blink = 1;
      else if (bt < 220) { var q = (bt - 100) / 120; m.blink = 1 - q * (2 - q); }
      else if (this.blinkTwice) { this.blinkTwice = false; this.blinkAt = now + 70; }
      else this.blinkAt = 0;
    }

    // The hand follows its pose on a soft spring (a little follow-through, no wobble); beats
    // fade quickly; when she stops talking it returns to rest.
    var arm = this.arm, s = dt / 1000;
    arm.beat *= Math.exp(-dt / 140);
    var aim = this.speaking ? arm.pose + arm.beat : 0;
    var K = 48, C = 2 * Math.sqrt(K) * 0.82;
    arm.v += (K * (aim - arm.a) - C * arm.v) * s;
    arm.a = clamp(arm.a + arm.v * s, -0.12, 0.26);

    var d = this.drawn;
    if (!d || Math.abs(d[0] - m.open) > 0.002 || Math.abs(d[1] - m.wide) > 0.004 || Math.abs(d[2] - m.blink) > 0.002 || Math.abs(d[3] - arm.a) > 0.0008) {
      this.rig.draw(m.open, m.wide, m.blink, arm.a);
      this.drawn = [m.open, m.wide, m.blink, arm.a];
    }
    var moving = l.word || this.level || this.blinkAt || m.open > 0.003 || Math.abs(m.wide) > 0.01 ||
      Math.abs(arm.a) > 0.001 || Math.abs(arm.v) > 0.003;
    if (active || moving) { this.loop = requestAnimationFrame(this.tick); return; }
    m.open = 0; m.wide = 0; arm.a = 0; arm.v = 0;
    this.rig.draw(0, 0, 0, 0);
    this.drawn = [0, 0, 0, 0];
  };

  Instance.prototype.setView = function () {};
  Instance.prototype.setActive = function (on) {
    clearTimeout(this.settleTimer);
    this.slot.classList.toggle("is-active", !!on && !reduced());
    if (on) this.wake();
  };
  // Stay lively for a moment after talking, then rest completely.
  Instance.prototype.settle = function (ms) {
    var self = this;
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(function () { self.setActive(false); self.rest(); }, ms);
  };

  // Show the keyed video in place of the still picture.
  Instance.prototype.showVideo = function (on) {
    if (!this.canvas) return;
    this.show(on ? "video" : this.restView());
  };
  Instance.prototype.drawLoop = function () {
    var self = this, v = this.video;
    if (!this.keyer) this.keyer = new Keyer(this.canvas);
    cancelAnimationFrame(this.frame);
    function tick() {
      if (v.paused || v.ended) return;
      if (self.keyer.draw(v)) self.showVideo(true);
      self.frame = requestAnimationFrame(tick);
    }
    this.frame = requestAnimationFrame(tick);
  };
  // After talking: a few seconds of the idle clip if there is one, then the still picture.
  Instance.prototype.rest = function () {
    if (!this.video) return;
    cancelAnimationFrame(this.frame);
    try { this.video.pause(); } catch (e) {}
    this.showVideo(false);
  };

  // ---------- recorded voices ----------

  // assets/voice/manifest.json lists every recorded line as { guide, text, file }. A line is found
  // by its exact words (spaces tidied), so when the words on screen change, the old recording is
  // never played for them: the line stays silent until it is recorded again.
  var VOICE_DIR = "assets/voice/", LINES = {}, VOICED = {}, voiceLoaded = false;
  function lineKey(who, text) { return who + "|" + String(text).replace(/\s+/g, " ").trim(); }
  var voiceReady = (window.fetch ? fetch(VOICE_DIR + "manifest.json")
    .then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; }) : Promise.resolve({}))
    .then(function (m) {
      (m.lines || []).forEach(function (l) { LINES[lineKey(l.guide, l.text)] = VOICE_DIR + l.file; VOICED[l.guide] = true; });
      voiceLoaded = true;
    });
  function recording(who, text) { return LINES[lineKey(who, text)] || null; }

  // One voice at a time. A tip cloud and the tour (or Selene and Iris) each have their own
  // guide, so a tip still being read aloud would talk over the tour when it opens. Whoever starts
  // speaking aloud takes the voice; the one who had it goes quiet and shows the rest of her words
  // at once.
  var voiceOwner = null;
  function takeVoice(inst) {
    if (voiceOwner && voiceOwner !== inst && voiceOwner.hush) voiceOwner.hush();
    voiceOwner = inst;
  }

  // ---------- one thing at a time: a guide's voice and a sound (REQUIREMENTS B-5) ----------
  // A sonification (the Spectrum Player) and a guide's voice never play together, and the sound
  // is never just turned down under her voice: one of them stops.
  //   A sound starts        the guide who is speaking aloud goes quiet (her words stay on screen).
  //   A line comes due      it waits until the sound has ended, plus a short gap.
  //   The visitor moves on  (a voice button, the tour's next step): the page stops the sound
  //                         first with Selene.sound.stop(), so the line does not wait.
  // The timings are the "separation" section of data/sound-key.json; the numbers below are used
  // only if that file cannot be read. A page that plays a sound calls Selene.sound.begin(stop)
  // when it starts and the function it gets back when it has ended.
  var SEP = { gap: 0.25, hold: 1 };
  if (window.fetch) fetch("data/sound-key.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (k) {
    var s = k && k.separation, g = s && s.guide_and_screen_reader;
    if (s && isFinite(s.gap_before_speech_s)) SEP.gap = Math.max(0, +s.gap_before_speech_s);
    if (g && isFinite(g.voice_waits_after_focus_move_s)) SEP.hold = Math.max(0, +g.voice_waits_after_focus_move_s);
  }).catch(function () {});
  var soundNow = null, quietAt = 0, afterSound = [];
  function soundBegin(stop) {
    if (soundNow && soundNow.stop) { var old = soundNow; soundNow = null; try { old.stop(); } catch (e) {} }
    if (voiceOwner && voiceOwner.hush) voiceOwner.hush();
    var token = { stop: stop || null };
    soundNow = token;
    return function ended() {
      if (soundNow !== token) return;
      soundNow = null;
      quietAt = performance.now() + SEP.gap * 1000;
      var queue = afterSound;
      afterSound = [];
      if (queue.length) setTimeout(function () { queue.forEach(function (fn) { fn(); }); }, SEP.gap * 1000);
    };
  }
  function soundStop() { if (soundNow && soundNow.stop) soundNow.stop(); }
  // Run fn once no sound is playing: now, or a short gap after the sound has ended.
  function whenQuiet(fn) {
    if (soundNow) { afterSound.push(fn); return; }
    var left = quietAt - performance.now();
    if (left > 0) setTimeout(fn, left); else fn();
  }
  // Tab or Escape: the visitor is moving on, and a screen reader is about to read where they
  // land, so the guide who is speaking aloud goes quiet. Her words stay on screen.
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Tab" || e.key === "Escape") && voiceOwner && voiceOwner.hush) voiceOwner.hush();
  }, true);

  Instance.prototype.stop = function () {
    if (voiceOwner === this) voiceOwner = null;
    this.hush = null;
    this.run++;
    this.pending = (this.pending || 0) + 1;
    this.timers.forEach(clearInterval);
    this.timers = [];
    if (this.audio) { try { this.audio.pause(); } catch (e) {} this.audio = null; }
    if (this.video) { try { this.video.pause(); } catch (e) {} }
    cancelAnimationFrame(this.frame);
    this.lipStop();
    if (this.onSpeaking) this.onSpeaking(false);
    this.speaking = false;
    this.voiced = false;
  };

  // Show the words as she says them. onReveal(n) receives how many characters to show.
  Instance.prototype.say = function (text, opts) {
    opts = opts || {};
    // With her voice on, wait for the list of recordings (only on the very first line).
    if (opts.voice && !opts.audio && !voiceLoaded) {
      var me = this;
      this.stop();
      var token = this.pending;
      voiceReady.then(function () { if (me.pending === token) me.say(text, opts); });
      return;
    }
    var audio = opts.audio || (opts.voice ? recording(this.who, text) : null);
    // A line she will say aloud waits for a sound that is playing to end (B-5), and, with
    // opts.hold, a moment more, so a screen reader can first read what was just focused.
    var aloud = !!(opts.voice && (audio || (opts.video && this.video)));
    var holdNow = !!(opts.hold && !opts.held);
    if (aloud && (soundNow || performance.now() < quietAt || holdNow)) {
      var waiter = this, ready = {};
      for (var k in opts) ready[k] = opts[k];
      ready.held = true;
      this.stop();
      var mine = this.pending;
      // Asked again when the wait is over, in case a sound started in the meantime.
      whenQuiet(function () {
        setTimeout(function () { if (waiter.pending === mine) waiter.say(text, ready); }, holdNow ? SEP.hold * 1000 : 0);
      });
      return;
    }
    var self = this, reveal = opts.onReveal || function () {}, done = opts.onDone || function () {};
    this.stop();
    this.onSpeaking = opts.onSpeaking || null;
    var run = this.run, len = text.length, cursor = 0, finished = false;
    // opts.onVoiced(true) once her recording really plays; (false) when the line is shown
    // without sound (no recording, voice off, or the browser held the sound back). A page uses
    // it so each line is heard once: from her, or from the screen reader, never both.
    var toldVoiced = false;
    function voicedIs(ok) { if (toldVoiced || run !== self.run) return; toldVoiced = true; if (opts.onVoiced) opts.onVoiced(ok); }
    this.nextBlink = performance.now() + 500 + Math.random() * 1500;
    // She opens her hand towards the cloud as she starts.
    this.arm.pose = 0.09; this.arm.words = 0; this.arm.next = 2;

    function speaking(on) { if (self.onSpeaking) self.onSpeaking(on); }
    // Mouth the next word when the last one is done (used when the exact timing is unknown).
    function mouthAt(i, ms) { if (!self.lipBusy()) self.lipWord(wordAt(text, i), ms); }
    function finish() {
      if (finished || run !== self.run) return;
      finished = true;
      self.timers.forEach(clearInterval);
      self.timers = [];
      self.speaking = false;
      self.voiced = false;
      self.audio = null;
      self.level = null;
      self.hush = null;
      if (voiceOwner === self) voiceOwner = null;
      speaking(false);
      reveal(len);
      self.settle(2600);
      done();
    }
    this.skip = function () { if (!self.audio) { finish(); self.lipStop(); if (self.video) self.rest(); } };
    // Another guide has started speaking aloud: stop the sound, show the rest of the words.
    this.hush = function () {
      if (finished || run !== self.run) return;
      if (self.audio) { try { self.audio.pause(); } catch (e) {} }
      if (self.video) { try { self.video.pause(); } catch (e) {} self.rest(); }
      self.lipStop();
      finish();
    };

    // A talking clip: she moves and speaks in the video, and the words follow it.
    if (opts.video && this.video) {
      var v = this.video, started = false;
      var fallback = function () {
        if (run !== self.run || started) return;
        self.rest();
        plain();
      };
      v.onerror = fallback;
      v.onplaying = function () {
        if (run !== self.run) return;
        started = true;
        voicedIs(!v.muted);
        if (!v.muted) speaking(true);
        if (!reduced()) self.drawLoop();
      };
      v.onended = function () { if (run === self.run) finish(); };
      v.muted = !opts.voice;
      if (opts.voice) takeVoice(self);
      v.src = opts.video;
      this.setActive(true);
      this.speaking = true;
      v.play().catch(fallback);
      this.timers.push(setInterval(function () {
        if (run !== self.run || !started || !v.duration) return;
        reveal(Math.floor(len * Math.min(1, v.currentTime / v.duration)));
      }, 60));
      return;
    }
    plain();

    function plain() {
      if (reduced() && !(audio && opts.voice)) { voicedIs(false); reveal(len); done(); return; }
      self.setActive(true);
      self.speaking = true;
      if (audio && opts.voice) { takeVoice(self); recorded(); return; }
      silent();
    }
    function silent() {
      // Silent: the words type out at a brisk reading pace, and her lips move at a speaking pace
      // while they do, like a character in a game.
      voicedIs(false);
      self.timers.push(setInterval(function () {
        if (run !== self.run) return;
        cursor = Math.min(len, cursor + 4.6);
        reveal(Math.floor(cursor));
        if (cursor >= len) finish();
        else mouthAt(Math.floor(cursor), 72);
      }, 80));
    }

    // A recorded voice file: the words follow the recording, and her mouth its loudness.
    function recorded() {
      var a = new Audio(audio), started = false;
      a.addEventListener("error", function () { if (run === self.run && !started) { self.audio = null; silent(); } }, { once: true });
      // If the recording is slow to start (a slow connection), show the words anyway after a
      // moment, so the cloud is never empty while the sound loads. They still follow the voice
      // once it plays (the typer only ever moves forward).
      var late = setTimeout(function () { if (run === self.run && !started) reveal(len); }, 700);
      a.addEventListener("playing", function () { clearTimeout(late); started = true; self.voiced = true; voicedIs(true); speaking(true); if (!self.level) self.level = meter(a); self.wake(); });
      a.addEventListener("ended", function () { clearTimeout(late); finish(); });
      self.audio = a;
      a.play().catch(function () { if (run === self.run && !started) { self.audio = null; silent(); } });
      self.timers.push(setInterval(function () {
        if (run !== self.run || !started || !a.duration) return;
        var at = Math.floor(len * Math.min(1, a.currentTime / a.duration));
        reveal(at);
        mouthAt(at, 66);
      }, 60));
    }

  };

  window.Selene = {
    canSpeak: typeof window.Audio === "function",
    // Recorded voices: ready once the list is loaded; hasVoice(guide) says if she has any.
    voiceReady: voiceReady,
    hasVoice: function (who) { return !!VOICED[who]; },
    recording: recording,
    media: MEDIA,
    rig: RIG,
    characters: CHARACTERS,
    character: function (who) { return CHARACTERS[who] || CHARACTERS.selene; },
    mountAll: function (root) {
      var list = (root || document).querySelectorAll(".selene-slot:not(.selene)");
      var made = [];
      for (var i = 0; i < list.length; i++) made.push(new Instance(list[i]));
      return made;
    },
    mount: function (slot) { return slot._selene || new Instance(slot); },
    // One thing at a time (B-5): see "a guide's voice and a sound" above.
    sound: {
      begin: soundBegin,
      stop: soundStop,
      active: function () { return !!soundNow; },
      whenQuiet: whenQuiet,
      gap: function () { return SEP.gap; }
    },
    spoken: spoken
  };
})();
