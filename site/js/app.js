// Page wiring: the three steps (one screen each), the search form, example buttons,
// permanent links (?target=), theme switch and Back to top. The sky viewer lives in viewer.js.
(function () {
  "use strict";

  var form = document.getElementById("search-form");
  var message = document.getElementById("form-message");
  var examplesList = document.getElementById("examples");
  var caption = document.getElementById("viewer-caption");

  function findExample(id) {
    for (var i = 0; i < SELENITES_EXAMPLES.length; i++) {
      if (SELENITES_EXAMPLES[i].id === id) return SELENITES_EXAMPLES[i];
    }
    return null;
  }

  function setMessage(text) {
    message.textContent = text;
  }

  function showEmpty(text) {
    window.SelenitesViewer.clear(text);
  }

  // ---------- Steps: one screen at a time ----------
  // 1 Choose a patch of sky, 2 Watch it change, 3 My candidates. Only one is on screen, so a
  // visitor deals with one decision at a time, and nothing moves on by itself: picking an example
  // only selects it, and the visitor presses Next to open it. Step 2 stays locked until something
  // is picked; My candidates can always be opened. Each step has its own address (#choose,
  // #watch, #my-candidates), so the browser's Back button and bookmarks work. Without JavaScript
  // the three sections simply stay on one page.
  var VIEWS = ["choose", "watch", "my-candidates"];
  var VIEW_TITLES = { "choose": "Choose a patch of sky", "watch": "Watch it change", "my-candidates": "My candidates" };
  var SITE_TITLE = document.title;
  var root = document.documentElement;
  var viewEls = document.querySelectorAll("main > .view");
  var stepLinks = document.querySelectorAll("#steps a[data-view]");
  var currentView = null;
  var currentTarget = null;   // the ?target= id on screen, if any
  root.classList.add("has-views");

  function viewFromHash(hash) {
    var h = (hash || "").replace(/^#/, "");
    if (h === "watch" || h.indexOf("watch/") === 0) return "watch";
    return VIEWS.indexOf(h) >= 0 ? h : null;
  }

  function urlFor(view) {
    var q = currentTarget ? "?target=" + encodeURIComponent(currentTarget) : window.location.pathname;
    return q + "#" + view;
  }

  // opts.history: "push" (a visitor moved on), "replace" (keep the address in step) or none.
  // opts.focus: false while the tour drives the page, so focus stays in the tour.
  function showView(name, opts) {
    opts = opts || {};
    if (VIEWS.indexOf(name) < 0) name = "choose";
    var changed = name !== currentView;
    if (changed && currentView === "watch" && window.SelenitesViewer && window.SelenitesViewer.stop) {
      window.SelenitesViewer.stop();
    }
    currentView = name;
    for (var i = 0; i < viewEls.length; i++) viewEls[i].hidden = viewEls[i].dataset.view !== name;
    for (var j = 0; j < stepLinks.length; j++) {
      if (stepLinks[j].dataset.view === name) stepLinks[j].setAttribute("aria-current", "step");
      else stepLinks[j].removeAttribute("aria-current");
    }
    root.setAttribute("data-view", name);
    document.title = VIEW_TITLES[name] + " · " + SITE_TITLE;
    if (opts.history && window.history && window.history.pushState) {
      try {
        if (opts.history === "push" && changed) window.history.pushState({ view: name }, "", urlFor(name));
        else window.history.replaceState({ view: name }, "", urlFor(name));
      } catch (e) { /* the page still works without the address */ }
    }
    if (changed && opts.focus !== false) {
      // A new screen starts at the top, and focus lands on its heading so a screen reader
      // announces where the visitor is.
      window.scrollTo(0, 0);
      var h = document.querySelector('main > .view[data-view="' + name + '"] .view-title');
      if (h) h.focus({ preventScroll: true });
    }
    if (changed) document.dispatchEvent(new CustomEvent("selenites:view", { detail: { view: name } }));
  }

  // Moving to a step the visitor asked for. Step 2 opens what was picked on step 1; with nothing
  // picked yet, the visitor is taken to step 1 and told what to do first.
  function goTo(view) {
    if (view === "watch" && !picked) {
      showView("choose", { history: "push" });
      nudgePick();
      return;
    }
    showView(view, { history: "push" });
    if (view === "watch") openPicked();
  }

  // Any link marked data-view (step bar, back links, Next) changes the screen in place.
  document.addEventListener("click", function (event) {
    var a = event.target.closest ? event.target.closest("a[data-view]") : null;
    if (!a || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goTo(a.dataset.view);
  });
  // Back and Forward, and the skip link to My Candidates.
  function fromAddress() {
    var v = viewFromHash(window.location.hash);
    if (v === "watch" && !picked) v = "choose";
    if (v) showView(v);
  }
  window.addEventListener("popstate", fromAddress);
  window.addEventListener("hashchange", fromAddress);

  // An ?obs= link (a saved candidate's view_link) asks for one exact image. It is used once,
  // on the first load after the page opens.
  var pendingObs = null;

  // Load a prepared data file (JSON from the pipeline, or the practice set) into the viewer.
  // id is the ?target= id, so the viewer can build each image's view_link.
  function loadData(path, label, id) {
    setMessage("Loading " + label + "...");
    window.SelenitesViewer.loading(label);
    return fetch(path)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      // Python's json writes NaN and Infinity, which are not valid JSON. Read them as "no value".
      .then(function (t) { return JSON.parse(t.replace(/:\s*-?(?:NaN|Infinity)(?=\s*[,}\]])/g, ": null")); })
      .then(function (d) {
        window.SelenitesViewer.load(d, { id: id, positionSource: picked && picked.position_source });
        // Pipeline files name the object in "target"; the practice set uses "name".
        var name = d.name || d.target || label;
        setMessage("Showing " + name + (d.placeholder ? " (practice data, not SPHEREx)." : "."));
        if (pendingObs) {
          var wanted = pendingObs; pendingObs = null;
          if (!window.SelenitesViewer.openObs(wanted)) {
            // Never show a different image in its place.
            window.SelenitesViewer.clear("The saved image " + wanted + " could not be found in " + name + ".");
            setMessage("Could not open the saved image " + wanted + ". It is not in " + name + ". Choose an example to carry on.");
          }
        }
      })
      .catch(function () {
        setMessage("Could not load " + label + ". If you opened the page as a file, run it from a local web server instead.");
        showEmpty("No images loaded yet. Choose an example.");
      });
  }

  // The practice pictures: made-up pictures to try the viewer with, offered as the last choice
  // on step 1 and from the empty viewer.
  var PRACTICE = { id: "practice", name: "Practice pictures", note: "Made-up pictures to try the viewer. Not SPHEREx data.", ra: null, dec: null, data: "data/practice.json", practice: true };

  function loadPractice() {
    pick(PRACTICE, { quiet: true });
    return openPicked();
  }
  document.getElementById("load-practice").addEventListener("click", function () { loadPractice(); });
  // The guided tour (tour.js) loads the practice pictures when it needs something to point at,
  // and moves between the steps as it explains them.
  window.SelenitesApp = {
    loadPractice: function () { return loadPractice(); },
    showView: function (name) { showView(name, { history: "replace", focus: false }); },
    picked: function () { return picked; },
    currentViewHeading: function () {
      return document.querySelector('main > .view[data-view="' + currentView + '"] .view-title');
    }
  };

  // ---------- Step 1: pick, then press Next ----------
  // Picking an example only selects it: it is marked "Selected", the Next bar says what was
  // picked, and Selene says to press Next. Nothing opens until the visitor presses Next, so they
  // can change their mind first.
  var picked = null;
  var nextBtn = document.getElementById("choose-next-btn");
  var nextMsg = document.getElementById("choose-next-msg");
  var stepLock = document.getElementById("step-lock");
  var watchStep = document.querySelector('#steps a[data-view="watch"]');

  function setNextState() {
    var on = !!picked;
    nextBtn.setAttribute("aria-disabled", on ? "false" : "true");
    if (watchStep) watchStep.setAttribute("aria-disabled", on ? "false" : "true");
    if (stepLock) stepLock.hidden = on;
    root.classList.toggle("has-pick", on);
  }

  function pick(item, opts) {
    opts = opts || {};
    picked = item;
    var buttons = examplesList.querySelectorAll(".example");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", buttons[i].dataset.id === item.id ? "true" : "false");
    }
    if (item.ra !== null) {
      document.getElementById("ra").value = item.ra;
      document.getElementById("dec").value = item.dec;
    }
    nextMsg.textContent = "You picked " + item.name + ". " + (item.data
      ? "Press Next to open it in the sky viewer."
      : "Its SPHEREx pictures are not ready yet, so the viewer will be empty. Practice pictures work now.");
    nextMsg.classList.remove("is-nudge");
    setNextState();
    document.dispatchEvent(new CustomEvent("selenites:picked", { detail: { id: item.id, name: item.name, ready: !!item.data, quiet: !!opts.quiet } }));
  }

  // Asked for step 2 with nothing picked: say so, and put focus on the first example.
  function nudgePick() {
    nextMsg.textContent = "First pick an example above. Then press Next to open it.";
    nextMsg.classList.add("is-nudge");
    var first = examplesList.querySelector(".example");
    if (first) first.focus();
    document.dispatchEvent(new CustomEvent("selenites:nudge", { detail: { view: "choose" } }));
  }

  // Step 2 opens the picked target (only if it is not already on screen).
  function openPicked() {
    if (!picked) return Promise.resolve();
    if (currentTarget === picked.id && document.getElementById("stage").dataset.state !== "empty") return Promise.resolve();
    var item = picked;
    caption.textContent = item.practice ? "" : item.name + ": " + item.note;
    setPermanentLink(item.id);
    if (item.data) return loadData(item.data, item.practice ? "the practice pictures" : item.name, item.id);
    setMessage(item.name + " is not loaded yet. Its data comes from the pipeline.");
    showEmpty("Images for " + item.name + " will appear here once the data is prepared.");
    return Promise.resolve();
  }

  // The address always names the target on screen (?target=) and the step (#watch).
  function setPermanentLink(id) {
    currentTarget = id;
    if (!window.history || !window.history.replaceState) return;
    try {
      window.history.replaceState({ view: currentView }, "", urlFor(currentView || "watch"));
    } catch (e) {
      // Some viewers block history changes. The page still works without the link.
    }
  }

  function renderExamples() {
    examplesList.innerHTML = "";
    SELENITES_EXAMPLES.concat([PRACTICE]).forEach(function (ex) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "example";
      btn.dataset.id = ex.id;
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = ex.name;
      var small = document.createElement("small");
      small.textContent = ex.note;
      btn.appendChild(small);
      if (ex.practice) { btn.classList.add("example-practice"); li.classList.add("li-practice"); }
      if (!ex.data) {
        var soon = document.createElement("small");
        soon.className = "example-soon";
        soon.textContent = "Pictures not ready yet";
        btn.appendChild(soon);
      }
      btn.addEventListener("click", function () { pick(ex); });
      li.appendChild(btn);
      examplesList.appendChild(li);
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var ra = document.getElementById("ra").value.trim();
    var dec = document.getElementById("dec").value.trim();
    if (!ra || !dec) {
      setMessage("Enter both a right ascension and a declination, or pick an example below.");
      return;
    }
    setMessage("Live search is not available yet. Pick one of the examples above; their images are prepared in advance.");
  });

  // The colour theme switch lives in js/theme.js (shared by every page).

  // Back to top lives in js/nav.js now, so every page has it.

  renderExamples();

  // Open a permanent link on load: ?target=wise-0855, or #watch/wise-0855. A target opens on
  // step 2; otherwise the address's step, or step 1.
  var params = new URLSearchParams(window.location.search);
  var target = params.get("target");
  var hashTarget = /^#watch\/(.+)$/.exec(window.location.hash);
  if (!target && hashTarget) { try { target = decodeURIComponent(hashTarget[1]); } catch (e) {} }
  pendingObs = params.get("obs");
  // A refresh starts completely fresh at step 1: nothing picked (an old pick, for example the
  // tour's practice pictures, would otherwise greet the visitor as if they had chosen it).
  // Opening a shared ?target= link fresh still goes straight to step 2 with that target.
  var nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
  var reloaded = !!(nav && nav.type === "reload");
  if (reloaded) { target = null; pendingObs = null; }
  var found = target ? findExample(target) : null;
  if (found) pick(found, { quiet: true });
  else if (target === "practice") pick(PRACTICE, { quiet: true });
  else setNextState();
  var startView = reloaded ? "choose" : picked ? "watch" : (viewFromHash(window.location.hash) || "choose");
  if (startView === "watch" && !picked) startView = "choose";
  showView(startView, { focus: false });
  // A step address (#choose, #watch) names a screen, not a place to scroll to: start at the top.
  if (viewFromHash(window.location.hash)) {
    try { window.history.scrollRestoration = "manual"; } catch (e) {}
    window.scrollTo(0, 0);
  }
  if (picked && startView === "watch") openPicked();
  else showView(startView, { history: "replace", focus: false });
  if (!found || !found.data) { if (target !== "practice") pendingObs = null; }
})();
