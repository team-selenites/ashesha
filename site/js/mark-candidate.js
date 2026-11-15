/*
 * Mark a Candidate module
 * Team Selenites · NASA Space Apps Challenge 2026 · SPHEREx · Owner: Shrashti
 *
 * What it does
 *   - Listens for the cancelable `selenites:mark-candidate` CustomEvent on `document`.
 *   - Validates the payload against the agreed contract and saves the observation to
 *     localStorage (key `selenites.myCandidates.v1`).
 *   - Draws the whole My Candidates interface inside `#mc-root`.
 *
 * Event contract (docs/candidate-event-contract.md, 11 November 2026)
 *   event.detail = {
 *     observation: { target, obs_id, ra, dec, date, mjd, detector, wavelength_um,
 *                    thumbnail, image_url, view_link, status },   // exactly 12 fields
 *     image_number, image_count,
 *     note                                                        // string or null (optional)
 *   }
 *
 * Handled signal: event.preventDefault() is called when a candidate was saved or was found
 * to be a duplicate. It is NOT called when the event was rejected or the save failed.
 *
 * Plain JavaScript, no dependencies, no modules. Load after app.js:
 *   <script src="js/mark-candidate.js?v=1"></script>
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var EVENT_NAME = 'selenites:mark-candidate';
  var STORAGE_KEY = 'selenites.myCandidates.v1';
  var STORAGE_VERSION = 1;
  var ROOT_ID = 'mc-root';
  var NOTE_MAX_LENGTH = 1000;
  var NOT_AVAILABLE = 'Not available';
  var NO_NOTE = 'None';
  var SEARCH_DEBOUNCE_MS = 200;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var DISCLAIMER = 'This is a saved candidate observation, not a confirmed discovery.';

  // The 12 agreed observation fields, in contract order. Nothing is renamed or added.
  var OBSERVATION_FIELDS = [
    'target', 'obs_id', 'ra', 'dec', 'date', 'mjd', 'detector',
    'wavelength_um', 'thumbnail', 'image_url', 'view_link', 'status'
  ];
  var TEXT_FIELDS = ['obs_id', 'date', 'thumbnail', 'image_url', 'view_link'];
  var NUMBER_FIELDS = ['ra', 'dec', 'mjd', 'wavelength_um'];

  var STATUS_LABELS = {
    'clear': 'Clear detection',
    'faint': 'Faint',
    'not-detected': 'Not detected',
    'no-observation': 'No observation'
  };
  // Statuses that can be saved. `no-observation` is rejected: there is no picture to save.
  var SAVEABLE_STATUSES = ['clear', 'faint', 'not-detected'];

  var MESSAGES = {
    empty: 'No candidates yet. Explore observations in the viewer and mark interesting ones as candidates.',
    noMatchTitle: 'No matching candidates',
    noMatchBody: 'No candidates match your current search or filters.',
    duplicate: 'This observation is already in My Candidates.',
    saveFailed: 'Could not save this candidate. Your observation has not been added to My Candidates.',
    loadFailed: 'Your saved candidates could not be loaded. Please try again.',
    copyLinkFailed: 'Could not copy the observation link. Please try again.',
    copySummaryFailed: 'Could not copy the candidate summary. Please try again.',
    copyExportFailed: 'Could not copy the candidate text. Please try again.',
    noObservation: 'This date has no picture, so there is nothing to save.',
    unknownStatus: 'This image has a status that My Candidates does not recognise, so it was not saved.',
    invalidDetector: 'This image has a detector value that is not valid, so it was not saved.',
    invalidData: 'Some details of this image are not in the expected format, so it was not saved.',
    noLinkToCopy: 'This candidate has no observation link to copy.',
    noLinkToOpen: 'This candidate has no observation link, so it cannot be opened.',
    deleteFailed: 'Could not delete this candidate. It is still in My Candidates.',
    undoFailed: 'Could not restore this candidate. Please try again.',
    noteFailed: 'Could not save your personal note. Your existing note has not been changed.',
    noteSaved: 'Personal note saved.',
    deleted: 'Candidate deleted.',
    restored: 'Candidate restored.'
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  var root = null;
  var dom = {};
  var searchTimer = null;
  var viewWasShowing = false;
  var bannerSeenInView = false;

  var state = {
    candidates: [],       // active saved records, as stored
    loadFailed: false,    // true when storage could not be read: never treated as "empty"
    pending: [],          // [{ record, index }] deleted but still undoable
    query: '',
    statusOn: { 'clear': true, 'faint': true, 'not-detected': true },
    expanded: {},         // candidateId -> true
    editing: {},          // candidateId -> true while the personal note is being edited
    drafts: {},           // candidateId -> unsaved textarea content
    noteErrors: {},       // candidateId -> message
    cardMessages: {},     // candidateId -> { text, kind }
    banner: null,         // { kind, text, candidateId }
    exportFallback: null  // text shown for manual copying when the clipboard fails
  };

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function isWholeNumber(value, min, max) {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value &&
      value >= min && (max === undefined || value <= max);
  }

  function hasText(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  function textOrNotAvailable(value) {
    return hasText(value) ? value : NOT_AVAILABLE;
  }

  function plural(count, singular, pluralForm) {
    return count === 1 ? singular : (pluralForm || singular + 's');
  }

  function safeDomId(value) {
    return String(value).replace(/[^A-Za-z0-9_-]/g, '_');
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function statusLabel(rawStatus) {
    return Object.prototype.hasOwnProperty.call(STATUS_LABELS, rawStatus) ?
      STATUS_LABELS[rawStatus] : 'Status not recognised';
  }

  // Screen formatting: trims long decimals and uses a real minus sign. Never used for stored data.
  function displayNumber(value, decimals, suffix) {
    if (!isFiniteNumber(value)) { return NOT_AVAILABLE; }
    var text = String(Number(value.toFixed(decimals))).replace('-', '\u2212');
    return suffix ? text + suffix : text;
  }

  // Summary formatting: the value as stored, with an ASCII minus so it pastes cleanly.
  function rawNumber(value, suffix) {
    if (!isFiniteNumber(value)) { return NOT_AVAILABLE; }
    return String(value) + (suffix || '');
  }

  function imageNumberText(record) {
    var number = record.image_number, count = record.image_count;
    if (isWholeNumber(number, 1) && isWholeNumber(count, 1)) { return number + ' of ' + count; }
    if (isWholeNumber(number, 1)) { return String(number); }
    return NOT_AVAILABLE;
  }

  function detectorText(value) {
    return isWholeNumber(value, 1, 6) ? value + ' of 6' : NOT_AVAILABLE;
  }

  function formatSaved(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) { return NOT_AVAILABLE; }
    try {
      return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (error) {
      return date.toLocaleString();
    }
  }

  // Name used in accessible labels so repeated buttons stay unique.
  function describeCandidate(record) {
    var o = record.observation, parts = [o.target];
    if (hasText(o.obs_id)) { parts.push('observation ' + o.obs_id); }
    if (isWholeNumber(record.image_number, 1)) {
      parts.push('image ' + imageNumberText(record));
    }
    return parts.join(', ');
  }

  // Resolve a saved relative view_link against the current page, as the contract says.
  function resolveViewLink(viewLink) {
    if (!hasText(viewLink)) { return null; }
    try {
      var url = new URL(viewLink, location.href);
      if (['http:', 'https:', 'file:'].indexOf(url.protocol) === -1) { return null; }
      return url.href;
    } catch (error) {
      return null;
    }
  }

  function generateCandidateId() {
    var taken = {};
    state.candidates.forEach(function (record) { taken[record.candidateId] = true; });
    state.pending.forEach(function (entry) { taken[entry.record.candidateId] = true; });
    var id;
    do {
      var random = (window.crypto && typeof window.crypto.randomUUID === 'function') ?
        window.crypto.randomUUID() :
        Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      id = 'mc-' + random;
    } while (taken[id]);
    return id;
  }

  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------

  function h(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var value = props[key];
        if (value === null || value === undefined || value === false) { return; }
        if (key === 'className') { node.className = value; }
        else if (key === 'text') { node.textContent = value; }
        else if (value === true) { node.setAttribute(key, ''); }
        else { node.setAttribute(key, String(value)); }
      });
    }
    if (children) {
      children.forEach(function (child) {
        if (child === null || child === undefined || child === false) { return; }
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      });
    }
    return node;
  }

  function svgNode(tag, attributes) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }

  function action(label, name, id, extra) {
    var props = {
      type: 'button',
      className: 'mc-btn' + (extra && extra.primary ? ' mc-btn--primary' : ''),
      'data-mc-action': name,
      text: label
    };
    if (id) { props['data-mc-id'] = id; }
    if (extra) {
      if (extra.label) { props['aria-label'] = extra.label; }
      if (extra.key) { props['data-mc-key'] = extra.key; }
      if (extra.controls) { props['aria-controls'] = extra.controls; }
      if (extra.expanded !== undefined) { props['aria-expanded'] = extra.expanded ? 'true' : 'false'; }
      if (extra.describedBy) { props['aria-describedby'] = extra.describedBy; }
      if (extra.ariaDisabled) { props['aria-disabled'] = 'true'; }
    }
    return h('button', props);
  }

  // Each status has its own shape as well as its written label.
  function statusIcon(rawStatus) {
    var svg = svgNode('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false', 'class': 'mc-status-icon' });
    if (rawStatus === 'clear') {
      svg.appendChild(svgNode('circle', { cx: '8', cy: '8', r: '6', 'class': 'mc-icon-fill' }));
    } else if (rawStatus === 'faint') {
      svg.appendChild(svgNode('circle', { cx: '8', cy: '8', r: '6', 'class': 'mc-icon-stroke' }));
      svg.appendChild(svgNode('path', { d: 'M8 2a6 6 0 0 1 0 12z', 'class': 'mc-icon-fill' }));
    } else if (rawStatus === 'not-detected') {
      svg.appendChild(svgNode('circle', { cx: '8', cy: '8', r: '6', 'class': 'mc-icon-stroke' }));
    } else {
      svg.appendChild(svgNode('rect', { x: '2.5', y: '2.5', width: '11', height: '11', 'class': 'mc-icon-stroke mc-icon-dashed' }));
    }
    return svg;
  }

  function statusBadge(rawStatus) {
    var known = SAVEABLE_STATUSES.indexOf(rawStatus) !== -1;
    return h('span', { className: 'mc-status mc-status--' + (known ? rawStatus : 'unknown') }, [
      statusIcon(rawStatus),
      h('span', { className: 'mc-status-text', text: statusLabel(rawStatus) })
    ]);
  }

  function thumbPlaceholder() {
    var svg = svgNode('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false', 'class': 'mc-placeholder-icon' });
    svg.appendChild(svgNode('rect', { x: '3', y: '4', width: '18', height: '16', rx: '2', 'class': 'mc-icon-stroke' }));
    svg.appendChild(svgNode('circle', { cx: '9', cy: '10', r: '1.8', 'class': 'mc-icon-stroke' }));
    svg.appendChild(svgNode('path', { d: 'M4 18l5-5 4 4 3-3 4 4', 'class': 'mc-icon-stroke' }));
    return h('span', { className: 'mc-thumb-placeholder', 'aria-hidden': 'true' }, [svg]);
  }

  function factList(pairs) {
    return h('dl', { className: 'mc-facts' }, pairs.map(function (pair) {
      return h('div', { className: 'mc-fact' }, [
        h('dt', { text: pair[0] }),
        h('dd', null, [typeof pair[1] === 'string' ? document.createTextNode(pair[1]) : pair[1]])
      ]);
    }));
  }

  function timeNode(iso) {
    var text = formatSaved(iso);
    if (text === NOT_AVAILABLE) { return document.createTextNode(text); }
    return h('time', { datetime: iso, text: text });
  }

  // ---------------------------------------------------------------------------
  // Announcements
  // ---------------------------------------------------------------------------

  // One polite live region owned by this module. It lives in <body>, not in #mc-root, so a
  // save made while the My Candidates screen is hidden is still announced.
  function createLiveRegion() {
    dom.live = h('div', { className: 'mc-live', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    document.body.appendChild(dom.live);
  }

  function announce(message) {
    if (!dom.live) { return; }
    dom.live.textContent = '';
    window.setTimeout(function () { dom.live.textContent = message; }, 60);
  }

  // ---------------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------------

  function isValidStoredRecord(record) {
    return isObject(record) &&
      hasText(record.candidateId) &&
      isObject(record.observation) &&
      typeof record.observation.target === 'string' &&
      typeof record.observation.status === 'string' &&
      typeof record.savedAt === 'string' &&
      (record.note === null || typeof record.note === 'string') &&
      (record.personal_note === null || typeof record.personal_note === 'string') &&
      (record.image_number === null || isWholeNumber(record.image_number, 1)) &&
      (record.image_count === null || isWholeNumber(record.image_count, 1));
  }

  // Returns { ok: true, candidates } or { ok: false }. A failure is never reported as "empty".
  function readStorage() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) { return { ok: true, candidates: [] }; }
      var parsed = JSON.parse(raw);
      if (!isObject(parsed) || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.candidates)) {
        return { ok: false };
      }
      var seen = {};
      for (var i = 0; i < parsed.candidates.length; i += 1) {
        var record = parsed.candidates[i];
        if (!isValidStoredRecord(record) || seen[record.candidateId]) { return { ok: false }; }
        seen[record.candidateId] = true;
      }
      return { ok: true, candidates: parsed.candidates };
    } catch (error) {
      return { ok: false };
    }
  }

  function writeStorage(candidates) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, candidates: candidates }));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Re-reads storage so changes made in another tab are never overwritten.
  function loadFresh() {
    var result = readStorage();
    if (result.ok) {
      state.candidates = result.candidates;
      state.loadFailed = false;
      return true;
    }
    state.loadFailed = true;
    state.candidates = [];
    return false;
  }

  // ---------------------------------------------------------------------------
  // Event validation
  // ---------------------------------------------------------------------------

  function rejection(message, reason) {
    return { ok: false, message: message, reason: reason };
  }

  function validateMarkEvent(detail) {
    if (!isObject(detail) || !isObject(detail.observation)) {
      return rejection(MESSAGES.invalidData, 'event.detail.observation is missing');
    }
    var source = detail.observation;
    var observation = {};
    OBSERVATION_FIELDS.forEach(function (field) {
      observation[field] = source[field] === undefined ? null : source[field];
    });

    if (!hasText(observation.target)) {
      return rejection(MESSAGES.invalidData, 'observation.target must be a non-empty string');
    }
    if (typeof observation.status !== 'string') {
      return rejection(MESSAGES.invalidData, 'observation.status must be a string');
    }
    if (observation.status === 'no-observation') {
      return rejection(MESSAGES.noObservation, 'status "no-observation" cannot be saved');
    }
    if (SAVEABLE_STATUSES.indexOf(observation.status) === -1) {
      return rejection(MESSAGES.unknownStatus, 'unrecognised status "' + observation.status + '"');
    }
    for (var t = 0; t < TEXT_FIELDS.length; t += 1) {
      var textValue = observation[TEXT_FIELDS[t]];
      if (textValue !== null && typeof textValue !== 'string') {
        return rejection(MESSAGES.invalidData, 'observation.' + TEXT_FIELDS[t] + ' must be a string or null');
      }
    }
    for (var n = 0; n < NUMBER_FIELDS.length; n += 1) {
      var numberValue = observation[NUMBER_FIELDS[n]];
      if (numberValue !== null && !isFiniteNumber(numberValue)) {
        return rejection(MESSAGES.invalidData, 'observation.' + NUMBER_FIELDS[n] + ' must be a number or null');
      }
    }
    // The contract allows a whole number from 1 to 6, or null. Nothing else is accepted.
    if (observation.detector !== null && !isWholeNumber(observation.detector, 1, 6)) {
      return rejection(MESSAGES.invalidDetector, 'observation.detector must be a whole number from 1 to 6 or null');
    }

    var imageNumber = detail.image_number === undefined ? null : detail.image_number;
    var imageCount = detail.image_count === undefined ? null : detail.image_count;
    if (imageNumber !== null && !isWholeNumber(imageNumber, 1)) {
      return rejection(MESSAGES.invalidData, 'image_number must be a whole number from 1 or null');
    }
    if (imageCount !== null && !isWholeNumber(imageCount, 1)) {
      return rejection(MESSAGES.invalidData, 'image_count must be a whole number from 1 or null');
    }
    if (imageNumber !== null && imageCount !== null && imageNumber > imageCount) {
      return rejection(MESSAGES.invalidData, 'image_number is larger than image_count');
    }

    // `note` sits outside `observation`. Older viewer versions omit it: treat that as null.
    var note = detail.note === undefined ? null : detail.note;
    if (note !== null && typeof note !== 'string') {
      return rejection(MESSAGES.invalidData, 'note must be a string or null');
    }

    return { ok: true, value: { observation: observation, image_number: imageNumber, image_count: imageCount, note: note } };
  }

  // ---------------------------------------------------------------------------
  // Saving (the event handler)
  // ---------------------------------------------------------------------------

  function setBanner(kind, text, candidateId) {
    state.banner = { kind: kind, text: text, candidateId: candidateId || null };
    bannerSeenInView = isViewShowing();
  }

  function findCandidate(candidateId) {
    for (var i = 0; i < state.candidates.length; i += 1) {
      if (state.candidates[i].candidateId === candidateId) { return state.candidates[i]; }
    }
    return null;
  }

  function findPending(candidateId) {
    for (var i = 0; i < state.pending.length; i += 1) {
      if (state.pending[i].record.candidateId === candidateId) { return state.pending[i]; }
    }
    return null;
  }

  // obs_id alone identifies a duplicate. A missing or empty obs_id is never matched.
  function findDuplicate(obsId) {
    if (!hasText(obsId)) { return null; }
    for (var i = 0; i < state.candidates.length; i += 1) {
      if (state.candidates[i].observation.obs_id === obsId) { return state.candidates[i]; }
    }
    return null;
  }

  function reportSaveFailure(message, reason) {
    if (reason && window.console && console.warn) {
      console.warn('[Mark a Candidate] Not saved: ' + reason);
    }
    setBanner('error', message, null);
    announce(message);
    renderAll();
  }

  function onMarkCandidate(event) {
    var result = validateMarkEvent(event.detail);
    if (!result.ok) {
      reportSaveFailure(result.message, result.reason);
      return;
    }
    if (!loadFresh()) {
      reportSaveFailure(MESSAGES.saveFailed, 'saved candidates could not be read');
      return;
    }

    var incoming = result.value;
    var duplicate = findDuplicate(incoming.observation.obs_id);
    if (duplicate) {
      event.preventDefault();
      setBanner('duplicate', MESSAGES.duplicate, duplicate.candidateId);
      announce(MESSAGES.duplicate);
      renderAll();
      return;
    }

    var record = {
      candidateId: generateCandidateId(),
      observation: incoming.observation,
      image_number: incoming.image_number,
      image_count: incoming.image_count,
      note: incoming.note,
      personal_note: null,
      savedAt: new Date().toISOString()
    };
    var next = state.candidates.concat([record]);
    if (!writeStorage(next)) {
      reportSaveFailure(MESSAGES.saveFailed, 'localStorage write failed');
      return;
    }
    state.candidates = next;

    // Marking an observation again supersedes a pending, undoable deletion of the same one.
    if (hasText(record.observation.obs_id)) {
      state.pending = state.pending.filter(function (entry) {
        return entry.record.observation.obs_id !== record.observation.obs_id;
      });
    }

    event.preventDefault();
    var where = isWholeNumber(record.image_number, 1) ? ', image ' + imageNumberText(record) : '';
    var text = 'Saved to My Candidates: ' + record.observation.target + where + '.';
    setBanner('saved', text, record.candidateId);
    announce(text);
    renderAll();
  }

  // ---------------------------------------------------------------------------
  // Filtering, grouping and ordering
  // ---------------------------------------------------------------------------

  function savedTime(record) {
    var time = Date.parse(record.savedAt);
    return isNaN(time) ? 0 : time;
  }

  function compareNewestFirst(a, b) {
    var difference = savedTime(b) - savedTime(a);
    if (difference !== 0) { return difference; }
    if (a.candidateId === b.candidateId) { return 0; }
    return a.candidateId < b.candidateId ? 1 : -1;
  }

  function filtersAreActive() {
    return state.query.trim() !== '' || Object.keys(state.statusOn).some(function (key) { return !state.statusOn[key]; });
  }

  function matchesFilters(record) {
    var query = state.query.trim().toLowerCase();
    var o = record.observation;
    if (query) {
      var target = String(o.target).toLowerCase();
      var obsId = hasText(o.obs_id) ? o.obs_id.toLowerCase() : '';
      if (target.indexOf(query) === -1 && obsId.indexOf(query) === -1) { return false; }
    }
    return state.statusOn[o.status] !== false;
  }

  // Groups by target. Groups are ordered by their newest save; cards inside by newest first.
  // Pending (just deleted) records stay in the order so their inline row keeps its position.
  function buildGroups() {
    var groups = {};
    var order = [];

    function add(record, pending) {
      var target = record.observation.target;
      if (!groups[target]) {
        groups[target] = { target: target, latest: 0, items: [], total: 0, matched: 0 };
        order.push(target);
      }
      var group = groups[target];
      group.latest = Math.max(group.latest, savedTime(record));
      if (pending) {
        group.items.push({ record: record, pending: true });
        return;
      }
      group.total += 1;
      if (matchesFilters(record)) {
        group.matched += 1;
        group.items.push({ record: record, pending: false });
      }
    }

    state.candidates.forEach(function (record) { add(record, false); });
    state.pending.forEach(function (entry) { add(entry.record, true); });

    var list = order.map(function (target) { return groups[target]; });
    list.forEach(function (group) {
      group.items.sort(function (a, b) { return compareNewestFirst(a.record, b.record); });
    });
    list.sort(function (a, b) {
      if (b.latest !== a.latest) { return b.latest - a.latest; }
      return a.target < b.target ? -1 : (a.target > b.target ? 1 : 0);
    });
    return list;
  }

  // ---------------------------------------------------------------------------
  // Copy and export text
  // ---------------------------------------------------------------------------

  function noteBlock(note) {
    if (!hasText(note)) { return NO_NOTE; }
    return note.replace(/\r\n?/g, '\n').split('\n').join('\n  ');
  }

  function buildSummary(record) {
    var o = record.observation;
    var link = resolveViewLink(o.view_link);
    return [
      'Target: ' + o.target,
      'Observation ID: ' + textOrNotAvailable(o.obs_id),
      'Image: ' + imageNumberText(record),
      'Observation date: ' + textOrNotAvailable(o.date),
      'Status: ' + statusLabel(o.status),
      'Wavelength: ' + rawNumber(o.wavelength_um, ' \u00B5m'),
      'Detector: ' + (isWholeNumber(o.detector, 1, 6) ? String(o.detector) : NOT_AVAILABLE),
      'RA: ' + rawNumber(o.ra, '\u00B0'),
      'Dec: ' + rawNumber(o.dec, '\u00B0'),
      'MJD: ' + rawNumber(o.mjd),
      'Viewer note: ' + noteBlock(record.note),
      'Personal note: ' + noteBlock(record.personal_note),
      'Saved: ' + textOrNotAvailable(record.savedAt),
      'Observation link: ' + (link || NOT_AVAILABLE),
      '',
      DISCLAIMER
    ].join('\n');
  }

  // Every active candidate, grouped by target, in the same order as the screen. Never truncated.
  function buildExportText() {
    var groups = [];
    var all = state.candidates.slice();
    var byTarget = {};
    all.forEach(function (record) {
      var target = record.observation.target;
      if (!byTarget[target]) { byTarget[target] = { target: target, latest: 0, records: [] }; groups.push(byTarget[target]); }
      byTarget[target].latest = Math.max(byTarget[target].latest, savedTime(record));
      byTarget[target].records.push(record);
    });
    groups.forEach(function (group) { group.records.sort(compareNewestFirst); });
    groups.sort(function (a, b) {
      if (b.latest !== a.latest) { return b.latest - a.latest; }
      return a.target < b.target ? -1 : (a.target > b.target ? 1 : 0);
    });

    var total = all.length;
    var lines = [
      'MY CANDIDATES (Team Selenites, SPHEREx)',
      'Exported: ' + new Date().toISOString(),
      'Candidates: ' + total + ' in ' + groups.length + ' ' + plural(groups.length, 'target'),
      ''
    ];
    var counter = 0;
    groups.forEach(function (group) {
      lines.push('==================================================');
      lines.push('TARGET: ' + group.target + ' (' + group.records.length + ' ' + plural(group.records.length, 'candidate') + ')');
      lines.push('==================================================');
      lines.push('');
      group.records.forEach(function (record) {
        counter += 1;
        lines.push('--- Candidate ' + counter + ' of ' + total + ' ---');
        lines.push(buildSummary(record));
        lines.push('');
      });
    });
    return lines.join('\n');
  }

  function legacyCopy(text) {
    var previous = document.activeElement;
    var buffer = h('textarea', { className: 'mc-copy-buffer', readonly: true, 'aria-hidden': 'true', tabindex: '-1' });
    buffer.value = text;
    try {
      document.body.appendChild(buffer);
      buffer.select();
      var copied = document.execCommand('copy');
      document.body.removeChild(buffer);
      if (previous && previous.focus) { previous.focus(); }
      return copied === true;
    } catch (error) {
      if (buffer.parentNode) { buffer.parentNode.removeChild(buffer); }
      return false;
    }
  }

  // Resolves to true only when the text really reached the clipboard.
  function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  // ---------------------------------------------------------------------------
  // Rendering: skeleton
  // ---------------------------------------------------------------------------

  function buildControls() {
    var search = h('input', {
      id: 'mc-search', type: 'search', className: 'mc-input', autocomplete: 'off', spellcheck: 'false'
    });
    dom.search = search;

    var filters = h('fieldset', { className: 'mc-filters' }, [h('legend', { className: 'mc-label', text: 'Filter by status' })]);
    SAVEABLE_STATUSES.forEach(function (status) {
      var input = h('input', { type: 'checkbox', className: 'mc-check-input', value: status, 'data-mc-filter': status, checked: true });
      input.checked = true;
      filters.appendChild(h('label', { className: 'mc-check' }, [input, statusIcon(status), h('span', { text: STATUS_LABELS[status] })]));
    });

    dom.controls = h('div', { className: 'mc-controls' }, [
      h('div', { className: 'mc-field' }, [h('label', { className: 'mc-label', 'for': 'mc-search', text: 'Search by target or observation ID' }), search]),
      filters,
      h('div', { className: 'mc-controls-actions' }, [
        action('Clear filters', 'clear-filters'),
        action('Export All as Text', 'export-text')
      ])
    ]);
  }

  function buildSkeleton() {
    root.textContent = '';
    root.classList.add('mc-root');
    buildControls();
    dom.banner = h('div', { className: 'mc-banner', hidden: true });
    dom.overview = h('section', { className: 'mc-overview', 'aria-label': 'Candidate overview', hidden: true });
    dom.summary = h('p', { className: 'mc-results-summary', role: 'status' });
    dom.exportFallback = h('div', { className: 'mc-export-fallback', hidden: true });
    dom.list = h('div', { className: 'mc-list', tabindex: '-1' });
    [dom.banner, dom.overview, dom.controls, dom.summary, dom.exportFallback, dom.list].forEach(function (node) {
      root.appendChild(node);
    });
  }

  // ---------------------------------------------------------------------------
  // Rendering: regions
  // ---------------------------------------------------------------------------

  function renderBanner() {
    dom.banner.textContent = '';
    if (!state.banner) { dom.banner.hidden = true; return; }
    var banner = state.banner;
    dom.banner.className = 'mc-banner mc-banner--' + banner.kind;
    dom.banner.appendChild(h('p', { className: 'mc-banner-text', text: banner.text }));
    var actions = h('div', { className: 'mc-banner-actions' });
    if (banner.kind === 'duplicate' && banner.candidateId && findCandidate(banner.candidateId)) {
      actions.appendChild(action('View existing candidate', 'view-existing', banner.candidateId, { primary: true }));
    }
    actions.appendChild(action('Dismiss', 'dismiss-banner', null, { label: 'Dismiss this message' }));
    dom.banner.appendChild(actions);
    dom.banner.hidden = false;
  }

  function renderOverview() {
    dom.overview.textContent = '';
    var total = state.candidates.length;
    if (state.loadFailed || total === 0) { dom.overview.hidden = true; return; }

    var counts = {}, latest = {}, targets = [];
    state.candidates.forEach(function (record) {
      var target = record.observation.target;
      if (!counts[target]) { counts[target] = 0; latest[target] = 0; targets.push(target); }
      counts[target] += 1;
      latest[target] = Math.max(latest[target], savedTime(record));
    });
    targets.sort(function (a, b) { return latest[b] - latest[a] || (a < b ? -1 : 1); });

    dom.overview.appendChild(h('p', { className: 'mc-total' }, [
      h('strong', { text: String(total) }),
      ' ' + plural(total, 'candidate') + ' saved across ' + targets.length + ' ' + plural(targets.length, 'target')
    ]));
    var list = h('ul', { className: 'mc-target-counts', 'aria-label': 'Candidates per target' });
    targets.forEach(function (target) {
      list.appendChild(h('li', { className: 'mc-target-count' }, [
        h('span', { className: 'mc-target-name', text: target }),
        h('span', { className: 'mc-target-num' }, [String(counts[target]), h('span', { className: 'mc-sr-only', text: ' ' + plural(counts[target], 'candidate') })])
      ]));
    });
    dom.overview.appendChild(list);
    dom.overview.hidden = false;
  }

  function renderControls() {
    var hasRecords = !state.loadFailed && (state.candidates.length > 0 || state.pending.length > 0);
    dom.controls.hidden = !hasRecords;
    dom.search.value = state.query;
    Array.prototype.forEach.call(dom.controls.querySelectorAll('[data-mc-filter]'), function (input) {
      input.checked = state.statusOn[input.getAttribute('data-mc-filter')] !== false;
    });
    var exportButton = dom.controls.querySelector('[data-mc-action="export-text"]');
    exportButton.disabled = state.candidates.length === 0;
  }

  function renderExportFallback() {
    dom.exportFallback.textContent = '';
    if (state.exportFallback === null) { dom.exportFallback.hidden = true; return; }
    dom.exportFallback.appendChild(h('p', { className: 'mc-error', text: MESSAGES.copyExportFailed + ' You can select and copy the text below instead.' }));
    var area = h('textarea', { className: 'mc-export-fallback-text', readonly: true, rows: '10', 'aria-label': 'Candidate text for manual copying', 'data-mc-key': 'export-fallback' });
    area.value = state.exportFallback;
    dom.exportFallback.appendChild(area);
    dom.exportFallback.appendChild(action('Close', 'close-export-fallback'));
    dom.exportFallback.hidden = false;
  }

  function renderSummary() {
    var total = state.candidates.length;
    if (state.loadFailed || total === 0) { dom.summary.textContent = ''; dom.summary.hidden = true; return; }
    var matched = state.candidates.filter(matchesFilters).length;
    dom.summary.hidden = false;
    dom.summary.textContent = filtersAreActive() ?
      'Showing ' + matched + ' of ' + total + ' ' + plural(total, 'candidate') + '.' :
      'Showing all ' + total + ' ' + plural(total, 'candidate') + '.';
  }

  function renderList() {
    dom.list.textContent = '';

    if (state.loadFailed) {
      dom.list.appendChild(h('div', { className: 'mc-error-state', role: 'alert' }, [
        h('p', { className: 'mc-error', text: MESSAGES.loadFailed }),
        action('Try again', 'retry-load', null, { primary: true })
      ]));
      return;
    }
    if (state.candidates.length === 0 && state.pending.length === 0) {
      dom.list.appendChild(h('p', { className: 'mc-empty', text: MESSAGES.empty }));
      return;
    }

    var groups = buildGroups().filter(function (group) { return group.items.length > 0; });
    if (groups.length === 0) {
      dom.list.appendChild(h('div', { className: 'mc-empty mc-empty--filtered' }, [
        h('h3', { className: 'mc-empty-title', text: MESSAGES.noMatchTitle }),
        h('p', { text: MESSAGES.noMatchBody }),
        action('Clear filters', 'clear-filters', null, { primary: true })
      ]));
      return;
    }

    groups.forEach(function (group, groupIndex) {
      var headingId = 'mc-group-' + groupIndex;
      var countText = (filtersAreActive() && group.matched < group.total) ?
        group.matched + ' of ' + group.total + ' ' + plural(group.total, 'candidate') :
        group.total + ' ' + plural(group.total, 'candidate');
      var cards = h('ul', { className: 'mc-card-list' });
      group.items.forEach(function (item) {
        cards.appendChild(item.pending ? buildDeletedRow(item.record) : buildCard(item.record));
      });
      dom.list.appendChild(h('section', { className: 'mc-group', 'aria-labelledby': headingId }, [
        h('h3', { className: 'mc-group-title', id: headingId }, [
          h('span', { className: 'mc-group-name', text: group.target }),
          h('span', { className: 'mc-group-count', text: countText })
        ]),
        cards
      ]));
    });
  }

  // ---------------------------------------------------------------------------
  // Rendering: cards
  // ---------------------------------------------------------------------------

  function buildThumb(record) {
    var o = record.observation;
    var frame = h('span', { className: 'mc-thumb-frame' });
    if (hasText(o.thumbnail)) {
      frame.appendChild(h('img', {
        className: 'mc-thumb', src: o.thumbnail, loading: 'lazy', width: '96', height: '96',
        alt: 'Thumbnail of ' + o.target + (isWholeNumber(record.image_number, 1) ? ', image ' + imageNumberText(record) : '')
      }));
    } else {
      frame.appendChild(thumbPlaceholder());
    }
    return frame;
  }

  function buildOpenControl(record, key) {
    var link = resolveViewLink(record.observation.view_link);
    var name = 'Open ' + describeCandidate(record);
    if (link) {
      return h('a', { className: 'mc-btn mc-btn--primary', href: link, 'aria-label': name, 'data-mc-key': key, text: 'Open' });
    }
    return action('Open', 'open-unavailable', record.candidateId, { primary: true, label: name, key: key, ariaDisabled: true });
  }

  function buildPersonalNote(record) {
    var id = record.candidateId, safe = safeDomId(id);
    var section = h('div', { className: 'mc-details-section' });

    if (!state.editing[id]) {
      section.appendChild(h('h5', { className: 'mc-subtitle', text: 'Personal note' }));
      section.appendChild(h('p', { className: 'mc-note-text' + (hasText(record.personal_note) ? '' : ' mc-note-text--empty'), 'data-mc-key': 'note-text:' + id, tabindex: '-1', text: hasText(record.personal_note) ? record.personal_note : 'No personal note yet.' }));
      section.appendChild(action('Edit note', 'edit-note', id, { label: 'Edit note for ' + describeCandidate(record), key: 'note-edit:' + id }));
      return section;
    }

    var draft = state.drafts[id] !== undefined ? state.drafts[id] : (record.personal_note || '');
    var fieldId = 'mc-note-field-' + safe, countId = 'mc-note-count-' + safe, hintId = 'mc-note-hint-' + safe;
    var field = h('textarea', {
      id: fieldId, className: 'mc-note-field', rows: '4', maxlength: String(NOTE_MAX_LENGTH),
      'data-mc-note-field': id, 'data-mc-key': 'note-field:' + id,
      'aria-describedby': hintId + ' ' + countId + (state.noteErrors[id] ? ' mc-note-error-' + safe : '')
    });
    field.value = draft;
    section.appendChild(h('label', { className: 'mc-subtitle', 'for': fieldId, text: 'Personal note' }));
    section.appendChild(h('p', { className: 'mc-hint', id: hintId, text: 'Only you can see this note. It is saved in this browser only.' }));
    section.appendChild(field);
    section.appendChild(h('p', { className: 'mc-count', id: countId, 'data-mc-count': id, text: countLabel(draft.length) }));
    if (state.noteErrors[id]) {
      section.appendChild(h('p', { className: 'mc-error', id: 'mc-note-error-' + safe, text: state.noteErrors[id] }));
    }
    section.appendChild(h('div', { className: 'mc-actions' }, [
      action('Save note', 'save-note', id, { primary: true, label: 'Save note for ' + describeCandidate(record), key: 'note-save:' + id }),
      action('Cancel', 'cancel-note', id, { label: 'Cancel editing note for ' + describeCandidate(record) })
    ]));
    return section;
  }

  function countLabel(length) {
    return length.toLocaleString() + ' of ' + NOTE_MAX_LENGTH.toLocaleString() + ' characters';
  }

  function buildDetails(record) {
    var o = record.observation;
    var link = resolveViewLink(o.view_link);
    var id = record.candidateId;
    var panel = h('div', { className: 'mc-details-body' });

    panel.appendChild(h('div', { className: 'mc-details-section' }, [
      h('h5', { className: 'mc-subtitle', text: 'Observation details (read-only)' }),
      factList([
        ['Target', o.target],
        ['Observation ID', textOrNotAvailable(o.obs_id)],
        ['Image', imageNumberText(record)],
        ['Observation date', textOrNotAvailable(o.date)],
        ['Status', statusBadge(o.status)],
        ['Wavelength', displayNumber(o.wavelength_um, 3, ' \u00B5m')],
        ['Detector', detectorText(o.detector)],
        ['RA', displayNumber(o.ra, 5, '\u00B0')],
        ['Dec', displayNumber(o.dec, 5, '\u00B0')],
        ['MJD', displayNumber(o.mjd, 5)],
        ['Thumbnail', hasText(o.thumbnail) ? 'Available' : NOT_AVAILABLE],
        ['Image file', hasText(o.image_url) ? 'Available' : NOT_AVAILABLE],
        ['Observation link', link || NOT_AVAILABLE],
        ['Saved', timeNode(record.savedAt)]
      ])
    ]));

    panel.appendChild(h('div', { className: 'mc-details-section' }, [
      h('h5', { className: 'mc-subtitle', text: 'Viewer description (read-only)' }),
      h('p', { className: 'mc-readonly-note' + (hasText(record.note) ? '' : ' mc-note-text--empty'), text: hasText(record.note) ? record.note : 'No description available' })
    ]));

    panel.appendChild(buildPersonalNote(record));

    panel.appendChild(h('div', { className: 'mc-actions mc-actions--card' }, [
      buildOpenControl(record, 'open-details:' + id),
      action('Copy Observation Link', 'copy-link', id, { label: 'Copy Observation Link for ' + describeCandidate(record), key: 'copy-link:' + id }),
      action('Copy Candidate Summary', 'copy-summary', id, { label: 'Copy Candidate Summary for ' + describeCandidate(record), key: 'copy-summary:' + id }),
      action('Delete', 'delete', id, { label: 'Delete ' + describeCandidate(record), key: 'delete:' + id })
    ]));
    if (!link) {
      panel.appendChild(h('p', { className: 'mc-hint', text: MESSAGES.noLinkToOpen }));
    }
    return panel;
  }

  function buildCard(record) {
    var o = record.observation;
    var id = record.candidateId, safe = safeDomId(id);
    var expanded = !!state.expanded[id];
    var titleId = 'mc-card-title-' + safe, detailsId = 'mc-details-' + safe;

    var facts = factList([
      ['Image', imageNumberText(record)],
      ['Observation ID', textOrNotAvailable(o.obs_id)],
      ['Observation date', textOrNotAvailable(o.date)],
      ['Status', statusBadge(o.status)],
      ['Wavelength', displayNumber(o.wavelength_um, 3, ' \u00B5m')],
      ['Detector', detectorText(o.detector)],
      ['RA', displayNumber(o.ra, 5, '\u00B0')],
      ['Dec', displayNumber(o.dec, 5, '\u00B0')],
      ['Saved', timeNode(record.savedAt)]
    ]);

    var headerActions = h('div', { className: 'mc-card-actions' });
    if (!expanded) { headerActions.appendChild(buildOpenControl(record, 'open:' + id)); }
    headerActions.appendChild(action('Details', 'toggle', id, {
      label: 'Details for ' + describeCandidate(record), key: 'toggle:' + id, controls: detailsId, expanded: expanded
    }));

    var message = state.cardMessages[id];
    var details = h('div', { className: 'mc-details', id: detailsId, hidden: !expanded });
    if (expanded) { details.appendChild(buildDetails(record)); }

    return h('li', { className: 'mc-card-item' }, [
      h('article', { className: 'mc-card' + (expanded ? ' mc-card--expanded' : ''), 'aria-labelledby': titleId, 'data-mc-card': id }, [
        h('div', { className: 'mc-card-main' }, [
          buildThumb(record),
          h('div', { className: 'mc-card-body' }, [h('h4', { className: 'mc-card-title', id: titleId, text: o.target }), facts]),
          headerActions
        ]),
        message ? h('p', { className: 'mc-card-message mc-card-message--' + message.kind, text: message.text }) : null,
        details
      ])
    ]);
  }

  function buildDeletedRow(record) {
    var id = record.candidateId;
    var message = state.cardMessages[id];
    return h('li', { className: 'mc-card-item' }, [
      h('div', { className: 'mc-deleted', tabindex: '-1', role: 'group', 'aria-label': 'Deleted candidate: ' + describeCandidate(record), 'data-mc-key': 'deleted:' + id }, [
        h('p', { className: 'mc-deleted-text', text: MESSAGES.deleted }),
        action('Undo', 'undo', id, { primary: true, label: 'Undo delete of ' + describeCandidate(record), key: 'undo:' + id }),
        message ? h('p', { className: 'mc-card-message mc-card-message--' + message.kind, text: message.text }) : null
      ])
    ]);
  }

  // ---------------------------------------------------------------------------
  // Render driver and focus handling
  // ---------------------------------------------------------------------------

  function findByKey(key) {
    var nodes = root.querySelectorAll('[data-mc-key]');
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].getAttribute('data-mc-key') === key) { return nodes[i]; }
    }
    return null;
  }

  function findCardElement(candidateId) {
    var nodes = root.querySelectorAll('[data-mc-card]');
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].getAttribute('data-mc-card') === candidateId) { return nodes[i]; }
    }
    return null;
  }

  function currentFocusKey() {
    var active = document.activeElement;
    return active && root.contains(active) ? active.getAttribute('data-mc-key') : null;
  }

  function renderAll(options) {
    var focusKey = options && options.focus ? options.focus : currentFocusKey();
    renderBanner();
    renderOverview();
    renderControls();
    renderSummary();
    renderExportFallback();
    renderList();
    if (focusKey) {
      var target = findByKey(focusKey);
      if (target) { target.focus(); }
    }
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function setCardMessage(candidateId, kind, text) {
    state.cardMessages[candidateId] = { kind: kind, text: text };
    announce(text);
  }

  function resetFilters() {
    state.query = '';
    Object.keys(state.statusOn).forEach(function (key) { state.statusOn[key] = true; });
  }

  function showCandidate(candidateId) {
    var record = findCandidate(candidateId);
    if (!record) { return; }
    if (!matchesFilters(record)) { resetFilters(); }
    state.expanded[candidateId] = true;
    renderAll({ focus: 'toggle:' + candidateId });
    var card = findCardElement(candidateId);
    if (card && card.scrollIntoView) {
      card.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }

  function copyObservationLink(candidateId) {
    var record = findCandidate(candidateId);
    if (!record) { return; }
    var link = resolveViewLink(record.observation.view_link);
    if (!link) {
      setCardMessage(candidateId, 'error', MESSAGES.noLinkToCopy);
      renderAll();
      return;
    }
    copyText(link).then(function (copied) {
      if (copied) { setCardMessage(candidateId, 'success', 'Observation link copied.'); }
      else { setCardMessage(candidateId, 'error', MESSAGES.copyLinkFailed); }
      renderAll();
    });
  }

  function copyCandidateSummary(candidateId) {
    var record = findCandidate(candidateId);
    if (!record) { return; }
    copyText(buildSummary(record)).then(function (copied) {
      if (copied) { setCardMessage(candidateId, 'success', 'Candidate summary copied.'); }
      else { setCardMessage(candidateId, 'error', MESSAGES.copySummaryFailed); }
      renderAll();
    });
  }

  function exportAllAsText() {
    if (!loadFresh() || state.candidates.length === 0) { renderAll(); return; }
    var text = buildExportText();
    var count = state.candidates.length;
    copyText(text).then(function (copied) {
      if (copied) {
        state.exportFallback = null;
        setBanner('saved', 'Copied ' + count + ' ' + plural(count, 'candidate') + ' as text.', null);
        announce(state.banner.text);
        renderAll();
      } else {
        // Honest failure: nothing was copied. Offer the text for manual copying.
        state.exportFallback = text;
        setBanner('error', MESSAGES.copyExportFailed, null);
        announce(MESSAGES.copyExportFailed);
        renderAll({ focus: 'export-fallback' });
      }
    });
  }

  function savePersonalNote(candidateId) {
    var draft = state.drafts[candidateId];
    if (draft === undefined) {
      var existing = findCandidate(candidateId);
      draft = existing && existing.personal_note ? existing.personal_note : '';
    }
    var value = draft.replace(/\r\n?/g, '\n').slice(0, NOTE_MAX_LENGTH);
    var noteToStore = value.trim() === '' ? null : value;

    if (!loadFresh()) { return failNote(candidateId); }
    var index = -1;
    state.candidates.forEach(function (record, i) { if (record.candidateId === candidateId) { index = i; } });
    if (index === -1) { return failNote(candidateId); }

    // Only personal_note changes. Everything else, including savedAt, is carried over untouched.
    var next = state.candidates.slice();
    var updated = JSON.parse(JSON.stringify(next[index]));
    updated.personal_note = noteToStore;
    next[index] = updated;
    if (!writeStorage(next)) { return failNote(candidateId); }

    state.candidates = next;
    delete state.editing[candidateId];
    delete state.drafts[candidateId];
    delete state.noteErrors[candidateId];
    setCardMessage(candidateId, 'success', MESSAGES.noteSaved);
    renderAll({ focus: 'note-edit:' + candidateId });
  }

  function failNote(candidateId) {
    // The draft stays in the textarea and the stored note is untouched.
    state.noteErrors[candidateId] = MESSAGES.noteFailed;
    announce(MESSAGES.noteFailed);
    renderAll({ focus: 'note-save:' + candidateId });
  }

  function deleteCandidate(candidateId) {
    delete state.cardMessages[candidateId];
    if (!loadFresh()) { renderAll(); return; }
    var index = -1;
    state.candidates.forEach(function (record, i) { if (record.candidateId === candidateId) { index = i; } });
    if (index === -1) { renderAll(); return; }

    var record = state.candidates[index];
    var next = state.candidates.slice();
    next.splice(index, 1);
    if (!writeStorage(next)) {
      state.candidates = state.candidates.slice();
      setCardMessage(candidateId, 'error', MESSAGES.deleteFailed);
      renderAll({ focus: 'delete:' + candidateId });
      return;
    }
    state.candidates = next;
    state.pending.push({ record: record, index: index });
    delete state.editing[candidateId];
    delete state.drafts[candidateId];
    delete state.noteErrors[candidateId];
    announce(MESSAGES.deleted + ' Undo is available.');
    renderAll({ focus: 'deleted:' + candidateId });
  }

  function undoDelete(candidateId) {
    var entry = findPending(candidateId);
    if (!entry) { return; }
    delete state.cardMessages[candidateId];
    if (!loadFresh()) {
      setCardMessage(candidateId, 'error', MESSAGES.undoFailed);
      renderAll({ focus: 'undo:' + candidateId });
      return;
    }
    var next = state.candidates.slice();
    if (!findCandidate(candidateId)) {
      // The exact record goes back to its original position: same candidateId, notes and savedAt.
      next.splice(Math.min(entry.index, next.length), 0, entry.record);
      if (!writeStorage(next)) {
        setCardMessage(candidateId, 'error', MESSAGES.undoFailed);
        renderAll({ focus: 'undo:' + candidateId });
        return;
      }
      state.candidates = next;
    }
    state.pending = state.pending.filter(function (item) { return item.record.candidateId !== candidateId; });
    announce(MESSAGES.restored);
    renderAll({ focus: 'toggle:' + candidateId });
  }

  // Leaving My Candidates commits every pending deletion (the records are already gone from
  // storage; this just removes the Undo rows).
  function commitPendingDeletions() {
    if (state.pending.length === 0) { return; }
    state.pending.forEach(function (entry) { delete state.cardMessages[entry.record.candidateId]; });
    state.pending = [];
    renderAll();
  }

  // ---------------------------------------------------------------------------
  // Delegated UI events
  // ---------------------------------------------------------------------------

  function onRootClick(event) {
    var button = event.target.closest ? event.target.closest('[data-mc-action]') : null;
    if (!button || !root.contains(button)) { return; }
    var name = button.getAttribute('data-mc-action');
    var id = button.getAttribute('data-mc-id');
    var record = id ? findCandidate(id) : null;

    if (id && name !== 'undo') { delete state.cardMessages[id]; }

    switch (name) {
      case 'toggle':
        state.expanded[id] = !state.expanded[id];
        renderAll({ focus: 'toggle:' + id });
        break;
      case 'edit-note':
        if (record) { state.editing[id] = true; state.drafts[id] = record.personal_note || ''; delete state.noteErrors[id]; }
        renderAll({ focus: 'note-field:' + id });
        break;
      case 'save-note': savePersonalNote(id); break;
      case 'cancel-note':
        delete state.editing[id]; delete state.drafts[id]; delete state.noteErrors[id];
        renderAll({ focus: 'note-edit:' + id });
        break;
      case 'copy-link': copyObservationLink(id); break;
      case 'copy-summary': copyCandidateSummary(id); break;
      case 'delete': deleteCandidate(id); break;
      case 'undo': undoDelete(id); break;
      case 'open-unavailable':
        setCardMessage(id, 'error', MESSAGES.noLinkToOpen);
        renderAll();
        break;
      case 'clear-filters':
        resetFilters();
        renderAll({ focus: null });
        dom.search.focus();
        announce('Filters cleared.');
        break;
      case 'export-text': exportAllAsText(); break;
      case 'close-export-fallback':
        state.exportFallback = null;
        renderAll();
        dom.controls.querySelector('[data-mc-action="export-text"]').focus();
        break;
      case 'retry-load':
        if (loadFresh()) {
          announce('Your saved candidates were loaded.');
          renderAll();
          dom.list.focus();
        } else {
          announce(MESSAGES.loadFailed);
          renderAll();
        }
        break;
      case 'view-existing': showCandidate(id); break;
      case 'dismiss-banner':
        state.banner = null;
        renderAll({ focus: null });
        break;
    }
  }

  function onRootInput(event) {
    var target = event.target;
    if (target === dom.search) {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(function () {
        state.query = dom.search.value;
        renderSummary();
        renderList();
      }, SEARCH_DEBOUNCE_MS);
      return;
    }
    var noteId = target.getAttribute && target.getAttribute('data-mc-note-field');
    if (noteId) {
      state.drafts[noteId] = target.value;
      var counters = root.querySelectorAll('[data-mc-count]');
      Array.prototype.forEach.call(counters, function (counter) {
        if (counter.getAttribute('data-mc-count') === noteId) { counter.textContent = countLabel(target.value.length); }
      });
    }
  }

  function onRootChange(event) {
    var status = event.target.getAttribute && event.target.getAttribute('data-mc-filter');
    if (!status) { return; }
    state.statusOn[status] = event.target.checked;
    renderSummary();
    renderList();
  }

  function onRootKeydown(event) {
    if (event.key !== 'Escape') { return; }
    var noteId = event.target.getAttribute && event.target.getAttribute('data-mc-note-field');
    if (!noteId) { return; }
    event.preventDefault();
    delete state.editing[noteId]; delete state.drafts[noteId]; delete state.noteErrors[noteId];
    renderAll({ focus: 'note-edit:' + noteId });
  }

  // A thumbnail that fails to load becomes the neutral placeholder.
  function onRootImageError(event) {
    var image = event.target;
    if (image && image.classList && image.classList.contains('mc-thumb') && image.parentNode) {
      image.parentNode.replaceChild(thumbPlaceholder(), image);
    }
  }

  // ---------------------------------------------------------------------------
  // Leaving the My Candidates view
  // ---------------------------------------------------------------------------

  // "Showing" means the module's container is actually displayed. The main viewer decides how
  // screens are switched; this only observes the result and never touches its code.
  function isViewShowing() {
    return !!root && root.getClientRects().length > 0;
  }

  function syncViewState() {
    var showing = isViewShowing();
    if (showing && !viewWasShowing) {
      loadFresh();
      if (state.banner) { bannerSeenInView = true; }
      renderAll();
    } else if (!showing && viewWasShowing) {
      commitPendingDeletions();
      if (state.banner && bannerSeenInView) { state.banner = null; renderAll(); }
      bannerSeenInView = false;
    }
    viewWasShowing = showing;
  }

  function watchViewState() {
    var scheduled = false;
    function schedule() {
      if (scheduled) { return; }
      scheduled = true;
      window.requestAnimationFrame(function () { scheduled = false; syncViewState(); });
    }
    window.addEventListener('hashchange', schedule);
    window.addEventListener('popstate', schedule);
    if (window.MutationObserver) {
      var observer = new MutationObserver(schedule);
      var node = root;
      while (node && node !== document.documentElement) {
        observer.observe(node, { attributes: true, attributeFilter: ['hidden', 'class', 'style', 'aria-hidden'] });
        node = node.parentElement;
      }
    }
    viewWasShowing = isViewShowing();
    bannerSeenInView = viewWasShowing;
  }

  // ---------------------------------------------------------------------------
  // Start-up
  // ---------------------------------------------------------------------------

  function init() {
    root = document.getElementById(ROOT_ID);
    if (!root || root.getAttribute('data-mc-ready') === 'true') { return; }
    root.setAttribute('data-mc-ready', 'true');

    buildSkeleton();
    createLiveRegion();
    loadFresh();
    renderAll();

    root.addEventListener('click', onRootClick);
    root.addEventListener('input', onRootInput);
    root.addEventListener('change', onRootChange);
    root.addEventListener('keydown', onRootKeydown);
    root.addEventListener('error', onRootImageError, true);

    // Another tab changed the collection.
    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY || event.key === null) { loadFresh(); renderAll(); }
    });

    watchViewState();

    // Registered only when the container exists, so an integrated page without #mc-root keeps
    // the viewer's own "not ready" message.
    document.addEventListener(EVENT_NAME, onMarkCandidate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
