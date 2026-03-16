

/* Accessibility Preferences Panel */
var AccessibilityPanel = (function () {
  'use strict';
  const STORAGE_KEY = 'agentbox-a11y-prefs';
  const DEFAULTS = { fontSize: 'medium', highContrast: false, reduceMotion: false, dyslexiaFont: false, focusIndicators: false, lineSpacing: 'normal' };
  let _prefs = {};
  let _panel = null;
  let _trigger = null;
  let _isOpen = false;

  function load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        _prefs = {};
        for (var key in DEFAULTS) { if (DEFAULTS.hasOwnProperty(key)) { _prefs[key] = parsed.hasOwnProperty(key) ? parsed[key] : DEFAULTS[key]; } }
        return;
      }
    } catch (e) { /* noop */ }
    _prefs = {};
    for (var k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) _prefs[k] = DEFAULTS[k]; }
  }

  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_prefs)); } catch (e) { /* noop */ } }

  function applyAll() {
    let html = document.documentElement;
    html.classList.remove('a11y-font-large', 'a11y-font-xlarge');
    if (_prefs.fontSize === 'large') html.classList.add('a11y-font-large');
    else if (_prefs.fontSize === 'xlarge') html.classList.add('a11y-font-xlarge');
    html.classList.toggle('a11y-high-contrast', !!_prefs.highContrast);
    html.classList.toggle('a11y-reduce-motion', !!_prefs.reduceMotion);
    html.classList.toggle('a11y-dyslexia-font', !!_prefs.dyslexiaFont);
    html.classList.toggle('a11y-focus-indicators', !!_prefs.focusIndicators);
    html.classList.remove('a11y-spacing-wide', 'a11y-spacing-extra');
    if (_prefs.lineSpacing === 'wide') html.classList.add('a11y-spacing-wide');
    else if (_prefs.lineSpacing === 'extra') html.classList.add('a11y-spacing-extra');
    if (_trigger) {
      let hasChanges = false;
      for (var key in DEFAULTS) { if (DEFAULTS.hasOwnProperty(key) && _prefs[key] !== DEFAULTS[key]) { hasChanges = true; break; } }
      _trigger.classList.toggle('a11y-active', hasChanges);
    }
    updatePanelUI();
  }

  function createPanel() {
    _panel = document.createElement('div');
    _panel.className = 'a11y-panel';
    _panel.id = 'a11yPanel';
    _panel.setAttribute('role', 'dialog');
    _panel.setAttribute('aria-label', 'Accessibility preferences');
    _panel.setAttribute('aria-modal', 'false');
    _panel.innerHTML =
      '<div class="a11y-panel-header"><span class="a11y-panel-title"><span aria-hidden="true">\u2699\uFE0F</span> Accessibility</span><button class="a11y-panel-close" id="a11yClose" aria-label="Close accessibility panel">&times;</button></div>' +
      '<div class="a11y-panel-body">' +
      '<div class="a11y-group"><span class="a11y-group-label">Text Size</span><div class="a11y-segmented" id="a11yFontSize" role="radiogroup" aria-label="Text size"><button class="a11y-seg-btn" data-value="small" role="radio" aria-checked="false">A<span style="font-size:0.7em">\u2212</span></button><button class="a11y-seg-btn" data-value="medium" role="radio" aria-checked="false">A</button><button class="a11y-seg-btn" data-value="large" role="radio" aria-checked="false">A<span style="font-size:1.1em">+</span></button><button class="a11y-seg-btn" data-value="xlarge" role="radio" aria-checked="false">A<span style="font-size:1.3em">++</span></button></div></div>' +
      '<div class="a11y-group"><span class="a11y-group-label">Display</span>' +
      '<button class="a11y-toggle" id="a11yContrast" role="switch" aria-checked="false" aria-label="High contrast"><span class="a11y-toggle-text"><span class="a11y-toggle-icon" aria-hidden="true">\uD83D\uDD32</span> High contrast</span><span class="a11y-switch"></span></button>' +
      '<button class="a11y-toggle" id="a11yMotion" role="switch" aria-checked="false" aria-label="Reduce motion"><span class="a11y-toggle-text"><span class="a11y-toggle-icon" aria-hidden="true">\u23F8\uFE0F</span> Reduce motion</span><span class="a11y-switch"></span></button>' +
      '<button class="a11y-toggle" id="a11yDyslexia" role="switch" aria-checked="false" aria-label="Dyslexia-friendly font"><span class="a11y-toggle-text"><span class="a11y-toggle-icon" aria-hidden="true">\uD83D\uDD24</span> Dyslexia font</span><span class="a11y-switch"></span></button>' +
      '<button class="a11y-toggle" id="a11yFocus" role="switch" aria-checked="false" aria-label="Enhanced focus indicators"><span class="a11y-toggle-text"><span class="a11y-toggle-icon" aria-hidden="true">\uD83C\uDFAF</span> Focus indicators</span><span class="a11y-switch"></span></button></div>' +
      '<div class="a11y-group"><span class="a11y-group-label">Line Spacing</span><div class="a11y-segmented" id="a11ySpacing" role="radiogroup" aria-label="Line spacing"><button class="a11y-seg-btn" data-value="normal" role="radio" aria-checked="false">Normal</button><button class="a11y-seg-btn" data-value="wide" role="radio" aria-checked="false">Wide</button><button class="a11y-seg-btn" data-value="extra" role="radio" aria-checked="false">Extra</button></div></div>' +
      '<button class="a11y-reset" id="a11yReset" aria-label="Reset all accessibility preferences">\u21A9 Reset to defaults</button></div>';
    document.body.appendChild(_panel);
    _panel.querySelector('#a11yClose').addEventListener('click', close);
    const fontBtns = _panel.querySelectorAll('#a11yFontSize .a11y-seg-btn');
    for (var i = 0; i < fontBtns.length; i++) { fontBtns[i].addEventListener('click', function (e) { _prefs.fontSize = e.currentTarget.getAttribute('data-value'); save(); applyAll(); }); }
    _panel.querySelector('#a11yContrast').addEventListener('click', function () { _prefs.highContrast = !_prefs.highContrast; save(); applyAll(); });
    _panel.querySelector('#a11yMotion').addEventListener('click', function () { _prefs.reduceMotion = !_prefs.reduceMotion; save(); applyAll(); });
    _panel.querySelector('#a11yDyslexia').addEventListener('click', function () { _prefs.dyslexiaFont = !_prefs.dyslexiaFont; save(); applyAll(); });
    _panel.querySelector('#a11yFocus').addEventListener('click', function () { _prefs.focusIndicators = !_prefs.focusIndicators; save(); applyAll(); });
    const spaceBtns = _panel.querySelectorAll('#a11ySpacing .a11y-seg-btn');
    for (var j = 0; j < spaceBtns.length; j++) { spaceBtns[j].addEventListener('click', function (e) { _prefs.lineSpacing = e.currentTarget.getAttribute('data-value'); save(); applyAll(); }); }
    _panel.querySelector('#a11yReset').addEventListener('click', function () { for (var key in DEFAULTS) { if (DEFAULTS.hasOwnProperty(key)) _prefs[key] = DEFAULTS[key]; } save(); applyAll(); });
    _panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); _trigger.focus(); } });
  }

  function updatePanelUI() {
    if (!_panel) return;
    const fontBtns = _panel.querySelectorAll('#a11yFontSize .a11y-seg-btn');
    for (var i = 0; i < fontBtns.length; i++) { var active = fontBtns[i].getAttribute('data-value') === _prefs.fontSize; fontBtns[i].classList.toggle('a11y-seg-active', active); fontBtns[i].setAttribute('aria-checked', active ? 'true' : 'false'); }
    const toggles = [{ id: 'a11yContrast', key: 'highContrast' }, { id: 'a11yMotion', key: 'reduceMotion' }, { id: 'a11yDyslexia', key: 'dyslexiaFont' }, { id: 'a11yFocus', key: 'focusIndicators' }];
    for (var j = 0; j < toggles.length; j++) { var el = _panel.querySelector('#' + toggles[j].id); if (el) el.setAttribute('aria-checked', _prefs[toggles[j].key] ? 'true' : 'false'); }
    const spaceBtns = _panel.querySelectorAll('#a11ySpacing .a11y-seg-btn');
    for (var k = 0; k < spaceBtns.length; k++) { var spActive = spaceBtns[k].getAttribute('data-value') === _prefs.lineSpacing; spaceBtns[k].classList.toggle('a11y-seg-active', spActive); spaceBtns[k].setAttribute('aria-checked', spActive ? 'true' : 'false'); }
  }

  function open() { if (!_panel) createPanel(); _isOpen = true; _panel.classList.add('a11y-panel-open'); _trigger.setAttribute('aria-expanded', 'true'); updatePanelUI(); var firstBtn = _panel.querySelector('.a11y-seg-btn, .a11y-toggle'); if (firstBtn) firstBtn.focus(); }
  function close() { _isOpen = false; if (_panel) _panel.classList.remove('a11y-panel-open'); if (_trigger) _trigger.setAttribute('aria-expanded', 'false'); }
  function toggle() { if (_isOpen) close(); else open(); }

  function init() {
    if (typeof document === 'undefined') return;
    _trigger = document.getElementById('a11yTrigger');
    if (!_trigger) return;
    _trigger.setAttribute('aria-expanded', 'false');
    _trigger.setAttribute('aria-controls', 'a11yPanel');
    _trigger.addEventListener('click', toggle);
    document.addEventListener('click', function (e) { if (_isOpen && _panel && !_panel.contains(e.target) && e.target !== _trigger && !_trigger.contains(e.target)) { close(); } });
    load(); applyAll();
  }

  function destroy() { close(); if (_panel && _panel.parentNode) _panel.parentNode.removeChild(_panel); _panel = null; _isOpen = false; var html = document.documentElement; html.classList.remove('a11y-font-large', 'a11y-font-xlarge', 'a11y-high-contrast', 'a11y-reduce-motion', 'a11y-dyslexia-font', 'a11y-focus-indicators', 'a11y-spacing-wide', 'a11y-spacing-extra'); if (_trigger) _trigger.classList.remove('a11y-active'); }
  function getPrefs() { var copy = {}; for (var key in _prefs) { if (_prefs.hasOwnProperty(key)) copy[key] = _prefs[key]; } return copy; }
  function isOpen() { return _isOpen; }

  return { init: init, open: open, close: close, toggle: toggle, destroy: destroy, getPrefs: getPrefs, isOpen: isOpen, DEFAULTS: DEFAULTS, STORAGE_KEY: STORAGE_KEY };
})();
