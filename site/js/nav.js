// The site's main menu, shared by every page, and the one list of the site's sections.
//
// Each page has <div class="sn" data-page="viewer"></div> at the top of <body>; the menu is
// drawn here from SECTIONS, so a new section is added in one place and shows up in the menu,
// on the home page and in the sky map.
//
// How it behaves:
// - Wide screens: the brand on the left, the sections in a floating capsule in the middle, the
//   tour button on the right. A soft pill sits behind the page you are on, with a small moon
//   resting on its top edge. Pointing at another section only hints at it; the pill glides
//   there when you click (it jumps with reduced motion). Content that scrolls under the menu
//   blurs and fades softly, like a sky behind thin cloud.
// - Phones: the brand and a Menu button. Menu opens a panel with each section and a line about
//   it. Escape or a click outside closes it, and focus goes back to the Menu button.
// - The page you are on is marked aria-current="page", for screen readers too.
// - Each page you open is remembered in this browser (selenites-visited), for the sky map on the
//   home page. Nothing is sent anywhere.
(function () {
  "use strict";

  // ready: false keeps a section out of the menu (it still shows on the home page as
  // "Being built"). Flip it to true once its page exists.
  var SECTIONS = [
    { id: "home", href: "index.html", name: "Home", desc: "Start here", icon: "home", menu: true, ready: true },
    { id: "viewer", href: "viewer.html", name: "Sky viewer", desc: "Watch a patch of sky change", icon: "viewer", guide: "selene", ready: true, map: true },
    { id: "spot", href: "spot-a-candidate.html", name: "Spot a candidate", desc: "Learn when a picture is worth marking", icon: "spot", guide: "selene", ready: true, map: true },
    { id: "cryostella", href: "cryostella.html", name: "Cryostella", desc: "Find ice in a rainbow of light", icon: "ice", guide: "iris", ready: true, map: true },
    { id: "orchestra", href: null, name: "Cosmic Orchestra", desc: "Hear the sky as sound", icon: "sound", guide: "orpheus", ready: false, map: true },
    { id: "games", href: null, name: "Weave the Cosmic Tapestry", desc: "Puzzles made from SPHEREx pictures", icon: "games", ready: false, map: true },
    { id: "beginnings", href: "beginnings.html", name: "Your Beginnings", desc: "The sky SPHEREx saw on your birthday", icon: "star", guide: "selene", ready: true, map: true },
    { id: "candidates", href: "viewer.html#my-candidates", name: "My candidates", desc: "Pictures you marked", icon: "mark", ready: true, map: false }
  ];

  var ICONS = {
    home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/><path d="M10.5 19v-4.5h3V19"/>',
    viewer: '<rect x="3.5" y="5" width="17" height="12" rx="2"/><path d="m10.5 8.8 4.2 2.7-4.2 2.7z"/><path d="M8 20h8"/>',
    ice: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="m9.6 4.6 2.4 2 2.4-2M9.6 19.4l2.4-2 2.4 2"/>',
    sound: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>',
    games: '<path d="M12 3.5 14.4 9l5.6.5-4.3 3.6 1.4 5.6L12 15.8l-5.1 2.9 1.4-5.6L4 9.5 9.6 9z"/>',
    star: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
    spot: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/><path d="m10.5 7.6.8 1.8 1.9.2-1.4 1.3.4 1.9-1.7-1-1.7 1 .4-1.9-1.4-1.3 1.9-.2z"/>',
    mark: '<path d="M7 4h10v16l-5-3.6L7 20z"/><path d="m12 7.6.9 1.9 2 .2-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.2z"/>'
  };
  function icon(name) {
    return '<svg class="sn-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || "") + "</svg>";
  }
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  // The Ashesha mark: the A turned over into ∀ ("for all" in mathematics), with a comet
  // streaking through it as the crossbar. The comet's head breaks out past the right leg; a thin
  // ring in the background colour cuts it free of the leg, so the two never blur together, even
  // small. One idea, two meanings: for all, and a comet followed through the sky.
  // The comet sits a little low and is tipped 14 degrees clockwise, so it dives down to the
  // right through the legs like a comet falling across the sky. A glint (a soft band of light,
  // clipped to the comet's shape) runs along it once when the logo is hovered; at rest it is
  // hidden. Selene's home tour shows it large and plays it in (index.html, the "name" step).
  var markCount = 0;
  function brandMark(cls) {
    var n = ++markCount, id = "ash-tail-" + n, clip = "ash-clip-" + n, shine = "ash-shine-" + n;
    var tail = "M2 21.6 52 18V28L2 24.4Z";
    return '<svg class="ash-mark ' + (cls || "") + '" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + id + '" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="ash-tail-a"/><stop offset="1" class="ash-tail-b"/></linearGradient>' +
        '<linearGradient id="' + shine + '" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="ash-glint-edge"/><stop offset="0.5" class="ash-glint-mid"/><stop offset="1" class="ash-glint-edge"/></linearGradient>' +
        '<clipPath id="' + clip + '"><path d="' + tail + '"/><circle cx="52" cy="23" r="6.5"/></clipPath></defs>' +
      '<path class="ash-legs" d="M4 6H16L32 42L48 6H60L37 58H27Z"/>' +
      '<g class="ash-comet"><g transform="translate(0 7) rotate(14 52 23)">' +
        '<path class="ash-cut" d="M1 20.2 52 16.6V29.4L1 25.8Z"/>' +
        '<path class="ash-tail" fill="url(#' + id + ')" d="' + tail + '"/>' +
        '<circle class="ash-cut" cx="52" cy="23" r="9"/>' +
        '<circle class="ash-head" cx="52" cy="23" r="6.5"/>' +
        '<g clip-path="url(#' + clip + ')"><rect class="ash-glint" x="-16" y="10" width="14" height="26" fill="url(#' + shine + ')"/></g>' +
      "</g></g></svg>";
  }

  var VISITED_KEY = "selenites-visited";
  function visited() {
    try { var v = JSON.parse(localStorage.getItem(VISITED_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function markVisited(id) {
    var v = visited();
    if (v.indexOf(id) < 0) { v.push(id); try { localStorage.setItem(VISITED_KEY, JSON.stringify(v)); } catch (e) {} }
  }

  window.SelenitesSite = { sections: SECTIONS, icon: icon, brandMark: brandMark, visited: visited, markVisited: markVisited };

  var host = document.querySelector(".sn[data-page]");
  if (!host) return;
  var page = host.getAttribute("data-page");
  var section = SECTIONS.filter(function (s) { return s.id === page; })[0];
  if (section && section.map) markVisited(page);

  var links = SECTIONS.filter(function (s) { return s.ready && s.href; }).map(function (s) {
    var current = s.id === page;
    return '<li><a class="sn-link" href="' + esc(s.href) + '" data-section="' + s.id + '"' + (current ? ' aria-current="page"' : "") + ">" +
      icon(s.icon) + '<span class="sn-text"><span class="sn-name">' + esc(s.name) + '</span><span class="sn-desc">' + esc(s.desc) + "</span></span></a></li>";
  }).join("");

  var tourFigure = document.getElementById("tour-selene");
  var tourGuide = (tourFigure && tourFigure.getAttribute("data-character")) || "selene";
  host.innerHTML =
    '<nav class="sn-bar" id="site-nav" aria-label="Main">' +
      '<div class="sn-brand-wrap"><a class="sn-brand" href="index.html">' +
        brandMark("sn-logo") +
        '<span class="sn-brand-t"><span class="sn-brand-a">Ashesha<span class="sr-only"> (home page)</span>' +
        '</span><span class="sn-brand-b">Follow a comet through SPHEREx</span></span></a></div>' +
      '<button type="button" class="sn-toggle" aria-expanded="false" aria-controls="sn-menu">' +
        '<span class="sn-burger" aria-hidden="true"><i></i><i></i><i></i></span><span class="sn-toggle-t">Menu</span>' +
      "</button>" +
      '<div class="sn-menu" id="sn-menu">' +
        '<div class="sn-island"><span class="sn-pill" aria-hidden="true"><i class="sn-pill-moon"></i></span><ul class="sn-links">' + links + "</ul></div>" +
        // The tour button shows the face of the guide who leads this page's tour.
        '<button type="button" class="sn-tour tour-open" hidden><span class="selene-slot selene-avatar selene-avatar-sm" data-variant="head" data-character="' + tourGuide + '"></span><span>Take the tour</span></button>' +
      "</div>" +
    "</nav>";

  var bar = host.querySelector(".sn-bar");
  var toggle = host.querySelector(".sn-toggle");
  var menu = host.querySelector(".sn-menu");
  var list = host.querySelector(".sn-links");
  var island = host.querySelector(".sn-island");
  var pill = host.querySelector(".sn-pill");
  var tourBtn = host.querySelector(".sn-tour");
  var narrowQuery = window.matchMedia("(max-width: 959px)");

  // The tour button only appears on pages that have a tour (tour.js hides it again if the
  // browser cannot run the tour).
  if (document.getElementById("tour")) tourBtn.hidden = false;

  // ---------- the pill behind the current page ----------
  // The pill marks where you are. Pointing at or tabbing to another section only hints at it (a
  // faint tint, css/nav.css); the pill moves when you click. On the sky viewer, My candidates is
  // one of its steps, so the pill follows the step on screen: My candidates while that step is
  // open, Sky viewer otherwise.
  var currentLink = list.querySelector('[aria-current="page"]');
  function linkFor(id) { return list.querySelector('.sn-link[data-section="' + id + '"]'); }
  function setCurrent(a) {
    Array.prototype.forEach.call(list.querySelectorAll(".sn-link"), function (l) {
      if (l === a) l.setAttribute("aria-current", "page"); else l.removeAttribute("aria-current");
    });
    currentLink = a;
  }
  function pillTo(a, instant) {
    if (!a) { pill.classList.remove("is-shown"); return; }
    if (narrowQuery.matches) return;
    var r = a.getBoundingClientRect(), b = island.getBoundingClientRect();
    if (instant) pill.classList.add("no-glide");
    pill.style.setProperty("--x", (r.left - b.left).toFixed(1) + "px");
    pill.style.setProperty("--w", r.width.toFixed(1) + "px");
    pill.classList.add("is-shown");
    if (instant) { void pill.offsetWidth; pill.classList.remove("no-glide"); }
  }
  function placePill() { pillTo(currentLink, true); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placePill);
  window.addEventListener("resize", placePill);
  placePill();

  // The sky viewer's own steps: Sky viewer and My candidates change the step in place.
  if (page === "viewer") {
    var viewerLink = linkFor("viewer"), candLink = linkFor("candidates");
    if (viewerLink) viewerLink.setAttribute("href", "#choose");
    if (candLink) candLink.setAttribute("href", "#my-candidates");
    var follow = function (view) {
      var a = view === "my-candidates" ? candLink : viewerLink;
      if (a && a !== currentLink) { setCurrent(a); pillTo(a); }
    };
    document.addEventListener("selenites:view", function (e) { follow(e.detail && e.detail.view); });
    follow(document.documentElement.getAttribute("data-view") || (/^#my-candidates/.test(location.hash) ? "my-candidates" : "choose"));
    // The page sets its step a moment after this file runs; place the pill once it has.
    requestAnimationFrame(function () { follow(document.documentElement.getAttribute("data-view")); placePill(); });
  }

  // ---------- moving between pages ----------
  // Where the browser can carry a view from one page to the next (cross-document view
  // transitions, css/nav.css), the menu stays put while the page fades over, and the pill glides
  // from the old section to the new one. Only the pill and the row of links are named, and only
  // for the moment of the change: a name makes an element its own layer, which would cut the
  // capsule's frosted blur off from the page behind it.
  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var crossPage = "onpagereveal" in window && !!(window.CSS && CSS.supports && CSS.supports("view-transition-name", "sn-pill"));
  function nameNav(on) {
    pill.style.viewTransitionName = on ? "sn-pill" : "";
    list.style.viewTransitionName = on ? "sn-links" : "";
  }
  window.addEventListener("pageswap", function (e) { if (e.viewTransition) nameNav(true); });
  window.addEventListener("pagereveal", function (e) {
    if (!e.viewTransition) { nameNav(false); return; }   // also a page brought back with Back
    nameNav(true);
    // The clouds already settled on the last page: keep them still, so the sky does not slide
    // under the fade (css/app.css, .sky). Picking a theme lets them drift in again (js/theme.js).
    document.documentElement.classList.add("sky-still");
    e.viewTransition.finished.then(function () { nameNav(false); }, function () { nameNav(false); });
    // A change cut short (a quick second click, a reload) rejects this; nothing to do then.
    e.viewTransition.ready.catch(function () {});
  });

  // Elsewhere, a click moves the pill to the section, then the next page opens once it has arrived.
  list.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest(".sn-link") : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var href = a.getAttribute("href");
    if (href.charAt(0) === "#") { if (!narrowQuery.matches) pillTo(a); return; }   // a step of this page
    if (a === currentLink || narrowQuery.matches || reduceQuery.matches || crossPage) return;
    e.preventDefault();
    setCurrent(a);
    pillTo(a);
    setTimeout(function () { window.location.href = href; }, 260);
  });

  // ---------- the phone menu ----------
  function setOpen(on, returnFocus) {
    toggle.setAttribute("aria-expanded", on ? "true" : "false");
    host.classList.toggle("is-open", on);
    if (on) {
      var first = menu.querySelector(".sn-link");
      if (first) first.focus();
    } else if (returnFocus) {
      toggle.focus();
    }
  }
  toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && host.classList.contains("is-open")) { e.preventDefault(); setOpen(false, true); }
  });
  document.addEventListener("click", function (e) {
    if (host.classList.contains("is-open") && !host.contains(e.target)) setOpen(false);
  });
  // Opening the tour from the panel closes the panel first.
  tourBtn.addEventListener("click", function () { if (host.classList.contains("is-open")) setOpen(false); });
  // A link to a step of the same page (My candidates on the viewer) closes the panel too.
  list.addEventListener("click", function () { if (host.classList.contains("is-open")) setOpen(false); });
  function onWidth() { if (!narrowQuery.matches) { host.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); placePill(); } }
  if (narrowQuery.addEventListener) narrowQuery.addEventListener("change", onWidth);

  // The soft blur behind the menu (css/nav.css) shows once the page has scrolled under it.
  // Set straight away on every scroll (a class toggle is cheap), so the blur is never late.
  // Back to top, on every page: it appears once the page has scrolled most of a screen, and
  // takes focus to the page's title, so keyboard and screen reader users land at the top too.
  // Smooth scrolling is skipped with reduced motion. Styles in css/app.css (.to-top).
  var toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "to-top";
  toTop.id = "to-top";
  toTop.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Back to top</span>';
  document.body.appendChild(toTop);
  toTop.addEventListener("click", function () {
    var title = document.getElementById("top");
    if (title) title.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reduceQuery.matches ? "auto" : "smooth" });
  });

  function onScroll() {
    var y = window.scrollY, on = y > 4;
    if (host.classList.contains("is-scrolled") !== on) host.classList.toggle("is-scrolled", on);
    var far = y > Math.max(400, window.innerHeight * 0.75);
    if (toTop.classList.contains("is-visible") !== far) toTop.classList.toggle("is-visible", far);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  if (window.Selene) window.Selene.mountAll(host);
})();
