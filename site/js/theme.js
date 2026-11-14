// The colour theme switch: Light, Dark and Colour-blind friendly, shared by every page.
// Each page puts <div class="ts-slot" data-theme-switch></div> where the switch should go; the
// switch is drawn here, so every page has the same one. The saved choice is applied before the
// page paints by a short script in each page's <head>.
(function () {
  "use strict";

  var MARKUP = "<fieldset class=\"ts\" id=\"themes\" data-selected=\"light\">\n  <legend>Colour theme</legend>\n  <div class=\"ts-grid\">\n    <div class=\"ts-track\" aria-hidden=\"true\">\n      <svg class=\"ts-scene ts-scene-light\" viewBox=\"0 0 360 56\" preserveAspectRatio=\"xMidYMid slice\" focusable=\"false\">\n        <defs><linearGradient id=\"g-light\" x1=\"0\" x2=\"1\"><stop offset=\"0\" stop-color=\"#F4EEFA\"/><stop offset=\"1\" stop-color=\"#F6D3EA\"/></linearGradient></defs>\n        <rect width=\"360\" height=\"56\" fill=\"url(#g-light)\"/>\n        <g fill=\"#fff\" opacity=\"0.9\">\n          <circle cx=\"58\" cy=\"52\" r=\"9\"/><circle cx=\"74\" cy=\"48\" r=\"12\"/><circle cx=\"92\" cy=\"52\" r=\"9\"/><rect x=\"50\" y=\"50\" width=\"50\" height=\"8\"/>\n          <circle cx=\"196\" cy=\"54\" r=\"8\"/><circle cx=\"210\" cy=\"50\" r=\"11\"/><circle cx=\"226\" cy=\"54\" r=\"8\"/><rect x=\"190\" y=\"52\" width=\"44\" height=\"8\"/>\n          <circle cx=\"318\" cy=\"52\" r=\"9\"/><circle cx=\"334\" cy=\"48\" r=\"11\"/><circle cx=\"350\" cy=\"52\" r=\"9\"/><rect x=\"310\" y=\"50\" width=\"50\" height=\"8\"/>\n        </g>\n      </svg>\n      <svg class=\"ts-scene ts-scene-dark\" viewBox=\"0 0 360 56\" preserveAspectRatio=\"xMidYMid slice\" focusable=\"false\">\n        <defs><linearGradient id=\"g-dark\" x1=\"0\" x2=\"1\"><stop offset=\"0\" stop-color=\"#07060B\"/><stop offset=\"1\" stop-color=\"#1A1530\"/></linearGradient></defs>\n        <rect width=\"360\" height=\"56\" fill=\"url(#g-dark)\"/>\n        <g fill=\"#fff\">\n          <circle cx=\"20\" cy=\"12\" r=\"0.9\"/><circle cx=\"45\" cy=\"40\" r=\"0.7\"/><circle cx=\"72\" cy=\"16\" r=\"1.1\"/><circle cx=\"96\" cy=\"46\" r=\"0.7\"/>\n          <circle cx=\"132\" cy=\"10\" r=\"0.8\"/><circle cx=\"158\" cy=\"42\" r=\"1\"/><circle cx=\"200\" cy=\"14\" r=\"0.7\"/><circle cx=\"232\" cy=\"44\" r=\"0.9\"/>\n          <circle cx=\"262\" cy=\"12\" r=\"1.1\"/><circle cx=\"292\" cy=\"38\" r=\"0.7\"/><circle cx=\"322\" cy=\"16\" r=\"0.9\"/><circle cx=\"344\" cy=\"46\" r=\"0.7\"/>\n          <polygon points=\"112,22 113.5,26.5 118,28 113.5,29.5 112,34 110.5,29.5 106,28 110.5,26.5\"/>\n          <polygon points=\"216,18 217.8,24.2 224,26 217.8,27.8 216,34 214.2,27.8 208,26 214.2,24.2\"/>\n        </g>\n      </svg>\n      <svg class=\"ts-scene ts-scene-cbf\" viewBox=\"0 0 360 56\" preserveAspectRatio=\"xMidYMid slice\" focusable=\"false\">\n        <rect width=\"360\" height=\"56\" fill=\"#1E1238\"/>\n        <g stroke-width=\"1.8\" fill=\"none\">\n          <circle cx=\"28\" cy=\"14\" r=\"4\" fill=\"#F0E442\" stroke=\"none\"/>\n          <circle cx=\"100\" cy=\"40\" r=\"4\" stroke=\"#56B4E9\"/><path d=\"M100 36a4 4 0 0 0 0 8z\" fill=\"#56B4E9\" stroke=\"none\"/>\n          <circle cx=\"146\" cy=\"16\" r=\"4\" stroke=\"#fff\"/>\n          <circle cx=\"214\" cy=\"42\" r=\"4\" stroke=\"#CC79A7\" stroke-dasharray=\"2.2 1.8\"/>\n          <circle cx=\"250\" cy=\"14\" r=\"4\" fill=\"#F0E442\" stroke=\"none\"/>\n          <circle cx=\"262\" cy=\"40\" r=\"4\" stroke=\"#56B4E9\"/><path d=\"M262 36a4 4 0 0 0 0 8z\" fill=\"#56B4E9\" stroke=\"none\"/>\n          <circle cx=\"338\" cy=\"42\" r=\"4\" stroke=\"#fff\"/>\n        </g>\n      </svg>\n      <span class=\"ts-thumb\">\n        <svg class=\"ts-icon ts-icon-light\" viewBox=\"0 0 24 24\" focusable=\"false\"><g class=\"sun-rays\" stroke=\"#D4529E\" stroke-width=\"1.8\" stroke-linecap=\"round\"><path d=\"M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6\"/></g><circle class=\"sun-core\" cx=\"12\" cy=\"12\" r=\"5.2\" fill=\"#D4529E\"/></svg>\n        <svg class=\"ts-icon ts-icon-dark\" viewBox=\"0 0 24 24\" focusable=\"false\"><circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"#E9E6F2\"/><circle class=\"crater\" cx=\"9\" cy=\"10\" r=\"3\" fill=\"#5A5670\"/><circle class=\"crater\" cx=\"16\" cy=\"15\" r=\"1.8\" fill=\"#5A5670\"/><circle class=\"crater\" cx=\"15\" cy=\"7\" r=\"1.2\" fill=\"#5A5670\"/></svg>\n        <svg class=\"ts-icon ts-icon-cbf\" viewBox=\"0 0 24 24\" focusable=\"false\"><path class=\"eye-lid\" d=\"M2 12c2.6-4.6 6-7 10-7s7.4 2.4 10 7c-2.6 4.6-6 7-10 7S4.6 16.6 2 12z\" fill=\"#fff\" stroke=\"#1E1238\" stroke-width=\"1.6\"/><g class=\"eye-pupil\"><circle cx=\"12\" cy=\"12\" r=\"3.6\" fill=\"#1E1238\"/><circle cx=\"13.2\" cy=\"10.8\" r=\"1\" fill=\"#fff\"/></g></svg>\n      </span>\n    </div>\n\n    <label class=\"ts-opt\">\n      <input type=\"radio\" name=\"theme\" value=\"light\" aria-describedby=\"ts-d-light\">\n      <span class=\"ts-text\">Light</span>\n    </label>\n    <label class=\"ts-opt\">\n      <input type=\"radio\" name=\"theme\" value=\"dark\" aria-describedby=\"ts-d-dark\">\n      <span class=\"ts-text\">Dark</span>\n    </label>\n    <label class=\"ts-opt\">\n      <input type=\"radio\" name=\"theme\" value=\"colour-blind-friendly\" aria-describedby=\"ts-d-cbf\">\n      <span class=\"ts-text\">Colour-blind friendly</span>\n    </label>\n  </div>\n  <span id=\"ts-d-light\" class=\"sr-only\">Pale lavender background with deep purple text. This is the starting setting.</span>\n  <span id=\"ts-d-dark\" class=\"sr-only\">Near-black background with stars.</span>\n  <span id=\"ts-d-cbf\" class=\"sr-only\">Deep violet background. Colours chosen to stay distinct for common types of colour blindness. Every status also has its own shape and a written label.</span>\n  <p class=\"ts-desc\" id=\"ts-desc\"></p>\n</fieldset>";

  var slot = document.querySelector("[data-theme-switch]");
  if (!slot) return;
  var holder = document.createElement("div");
  holder.innerHTML = MARKUP;
  slot.parentNode.replaceChild(holder.firstElementChild, slot);

  // Colour choice: Light, Dark or Colour-blind friendly. Saved in the browser when allowed.
  // Light is the default for every first-time visitor, whatever their device setting
  // (Pawana, 11 November 2026; it was Dark before).
  var themeRadios = document.querySelectorAll('input[name="theme"]');
  var saved = null;
  try { saved = localStorage.getItem("selenites-theme"); } catch (e) {}
  if (saved !== "light" && saved !== "dark" && saved !== "colour-blind-friendly") {
    saved = "light";
  }
  var themeBox = document.getElementById("themes");
  var themeDesc = document.getElementById("ts-desc");
  var themeText = {
    "light": "Light is on. Pale lavender background with deep purple text. This is the starting setting.",
    "dark": "Dark is on. Near-black background with stars.",
    "colour-blind-friendly": "Colour-blind friendly is on. Deep violet background. The colours are chosen to stay distinct for common types of colour blindness, and every status also has its own shape and a written label."
  };
  var barColours = { "light": "#F4EEFA", "dark": "#0B0A0E", "colour-blind-friendly": "#1E1238" };
  function showTheme(value) {
    themeBox.setAttribute("data-selected", value);
    themeDesc.textContent = themeText[value];
    // Colour the phone browser's address bar to match.
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", barColours[value]);
  }
  showTheme(saved);
  var fadeTimer = null;
  for (var r = 0; r < themeRadios.length; r++) {
    themeRadios[r].checked = themeRadios[r].value === saved;
    themeRadios[r].addEventListener("change", function (event) {
      var value = event.target.value;
      // Fade the page colours for a moment (the CSS skips this for reduced motion).
      var root = document.documentElement;
      root.classList.add("theme-fade");
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(function () { root.classList.remove("theme-fade"); }, 400);
      root.setAttribute("data-theme", value);
      // Only announce changes the visitor makes, not the starting setting.
      themeDesc.setAttribute("aria-live", "polite");
      showTheme(value);
      try { localStorage.setItem("selenites-theme", value); } catch (e) {}
    });
  }

  // Drag or swipe the round thumb along the bar. A plain click or tap on a position
  // still works through the labels, and the arrow keys still work on the radio buttons.
  // While dragging, the bar's scenes, icon and thumb colour blend continuously with the
  // thumb position, so nothing snaps; letting go glides to the nearest position.
  (function () {
    var grid = document.querySelector(".ts-grid");
    var track = grid.querySelector(".ts-track");
    var thumb = grid.querySelector(".ts-thumb");
    var scenes = grid.querySelectorAll(".ts-scene");   // light, dark, colour-blind friendly
    var icons = grid.querySelectorAll(".ts-icon");
    var order = ["light", "dark", "colour-blind-friendly"];
    var thumbColours = [[255, 255, 255], [233, 230, 242], [194, 176, 240]];
    var startX = 0, dragging = false, pointerId = null, grabOffset = 0, progress = 1;

    function geometry() {
      var rect = track.getBoundingClientRect();
      var inner = rect.width - 4; // 2px border each side
      return { left: rect.left + 2, inner: inner, half: (inner - 52) / 2 };
    }

    // x is where the thumb centre should be, in pixels from the left of the track.
    function moveThumb(centreClientX) {
      var g = geometry();
      var x = Math.min(Math.max(centreClientX - g.left, 26), g.inner - 26);
      thumb.style.setProperty("--x", (x - 22) + "px");
      progress = (x - 26) / g.half;           // 0 = Light, 1 = Dark, 2 = Colour-blind friendly
      var w = [Math.max(0, 1 - progress), Math.max(0, 1 - Math.abs(progress - 1)), Math.max(0, progress - 1)];
      for (var i = 0; i < 3; i++) {
        scenes[i].style.opacity = w[i];
        icons[i].style.opacity = w[i];
        icons[i].style.transform = "scale(" + (0.75 + 0.25 * w[i]) + ")";
      }
      var lo = Math.min(1, Math.floor(progress)), t = Math.min(1, Math.max(0, progress - lo));
      var c = [0, 1, 2].map(function (k) { return Math.round(thumbColours[lo][k] + (thumbColours[lo + 1][k] - thumbColours[lo][k]) * t); });
      thumb.style.backgroundColor = "rgb(" + c.join(",") + ")";
    }

    function clearDragStyles() {
      thumb.style.removeProperty("--x");
      thumb.style.backgroundColor = "";
      for (var i = 0; i < 3; i++) {
        scenes[i].style.opacity = "";
        icons[i].style.opacity = "";
        icons[i].style.transform = "";
      }
    }

    grid.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      startX = event.clientX;
      pointerId = event.pointerId;
      dragging = false;
      // Grab the thumb where it was touched, so it does not jump to the pointer.
      var b = thumb.getBoundingClientRect();
      var centre = b.left + b.width / 2;
      grabOffset = Math.abs(event.clientX - centre) <= 26 ? event.clientX - centre : 0;
    });

    grid.addEventListener("pointermove", function (event) {
      if (pointerId === null || event.pointerId !== pointerId) return;
      if (!dragging && Math.abs(event.clientX - startX) > 6) {
        dragging = true;
        grid.classList.add("is-dragging");
        try { grid.setPointerCapture(pointerId); } catch (e) {}
      }
      if (dragging) moveThumb(event.clientX - grabOffset);
    });

    function finish(event) {
      if (pointerId === null || event.pointerId !== pointerId) return;
      var wasDragging = dragging;
      pointerId = null;
      dragging = false;
      grid.classList.remove("is-dragging");
      if (!wasDragging) return;
      var target = document.querySelector('input[name="theme"][value="' + order[Math.round(progress)] + '"]');
      clearDragStyles();
      if (target && !target.checked) target.click();
      // Stop the click that follows a drag from picking a different option.
      var stop = function (e) { e.stopPropagation(); e.preventDefault(); };
      grid.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(function () { grid.removeEventListener("click", stop, true); }, 300);
    }
    grid.addEventListener("pointerup", finish);
    grid.addEventListener("pointercancel", function (event) {
      if (event.pointerId !== pointerId) return;
      pointerId = null; dragging = false;
      grid.classList.remove("is-dragging");
      clearDragStyles();
    });
  })();

})();
