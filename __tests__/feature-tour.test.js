/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

/**
 * Load the page once to avoid duplicate DOMContentLoaded listeners.
 */
function loadPage() {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  // Stub scrollIntoView
  HTMLElement.prototype.scrollIntoView = jest.fn();

  // Stub matchMedia
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    addEventListener: jest.fn()
  });

  // Stub IntersectionObserver
  window.IntersectionObserver = jest.fn().mockReturnValue({
    observe: jest.fn(),
    disconnect: jest.fn(),
    unobserve: jest.fn()
  });

  // Stub setTimeout/setInterval to prevent autoplay loops from other modules
  var origSetTimeout = window.setTimeout;
  var origSetInterval = window.setInterval;

  // Inject app.js
  var script = document.createElement('script');
  script.textContent = appJs;
  document.body.appendChild(script);

  // Fire DOMContentLoaded
  document.dispatchEvent(new Event('DOMContentLoaded'));

  // Create tour target sections if they don't exist in HTML
  ensureTourTargets();
}

/** Ensure all tour target elements exist in the DOM. */
function ensureTourTargets() {
  var targets = [
    { sel: '#chatWindow', tag: 'div', id: 'chatWindow' },
    { sel: '#testimonialsSection', tag: 'section', id: 'testimonialsSection' },
    { sel: '.pricing-section', tag: 'section', cls: 'pricing-section' },
    { sel: '#usecasesSection', tag: 'section', id: 'usecasesSection' },
    { sel: '#integrationsSection', tag: 'section', id: 'integrationsSection' },
    { sel: '.playground-section', tag: 'section', cls: 'playground-section' },
    { sel: '#promptGalleryGrid', tag: 'div', id: 'promptGalleryGrid' },
    { sel: '.trust-section', tag: 'section', cls: 'trust-section' }
  ];
  targets.forEach(function (t) {
    if (!document.querySelector(t.sel)) {
      var el = document.createElement(t.tag);
      if (t.id) el.id = t.id;
      if (t.cls) el.className = t.cls;
      el.textContent = t.sel;
      document.body.appendChild(el);
    }
  });
}

/** Add a Tour trigger button if missing. */
function ensureTrigger() {
  if (!document.getElementById('tourTrigger')) {
    var btn = document.createElement('button');
    btn.id = 'tourTrigger';
    btn.textContent = 'Take a Tour';
    document.body.appendChild(btn);
    // Re-bind (DOMContentLoaded already fired)
    btn.addEventListener('click', function () { window.FeatureTour.start(); });
  }
}

// Load once
loadPage();
ensureTrigger();

afterEach(function () {
  if (window.FeatureTour && window.FeatureTour.isActive()) {
    window.FeatureTour.stop();
  }
  window.FeatureTour.reset();
});

// ── Lifecycle ────────────────────────────────────────────────────

describe('FeatureTour lifecycle', function () {
  test('exposes required public API', function () {
    var FT = window.FeatureTour;
    expect(typeof FT.start).toBe('function');
    expect(typeof FT.stop).toBe('function');
    expect(typeof FT.next).toBe('function');
    expect(typeof FT.prev).toBe('function');
    expect(typeof FT.isActive).toBe('function');
    expect(typeof FT.currentStep).toBe('function');
    expect(typeof FT.hasCompleted).toBe('function');
    expect(typeof FT.reset).toBe('function');
  });

  test('starts inactive', function () {
    expect(window.FeatureTour.isActive()).toBe(false);
    expect(window.FeatureTour.currentStep()).toBe(-1);
  });

  test('start() activates and shows step 0', function () {
    window.FeatureTour.start();
    expect(window.FeatureTour.isActive()).toBe(true);
    expect(window.FeatureTour.currentStep()).toBe(0);
  });

  test('creates overlay, spotlight, and tooltip DOM elements', function () {
    window.FeatureTour.start();
    expect(document.getElementById('tourOverlay')).toBeTruthy();
    expect(document.getElementById('tourSpotlight')).toBeTruthy();
    expect(document.getElementById('tourTooltip')).toBeTruthy();
  });

  test('stop() deactivates and cleans up DOM', function () {
    window.FeatureTour.start();
    window.FeatureTour.stop();
    expect(window.FeatureTour.isActive()).toBe(false);
    expect(window.FeatureTour.currentStep()).toBe(-1);
    expect(document.getElementById('tourOverlay')).toBeNull();
    expect(document.getElementById('tourSpotlight')).toBeNull();
    expect(document.getElementById('tourTooltip')).toBeNull();
  });

  test('double start() is a no-op', function () {
    window.FeatureTour.start();
    window.FeatureTour.start();
    expect(window.FeatureTour.isActive()).toBe(true);
    expect(window.FeatureTour.currentStep()).toBe(0);
  });

  test('double stop() is safe', function () {
    window.FeatureTour.start();
    window.FeatureTour.stop();
    window.FeatureTour.stop(); // should not throw
    expect(window.FeatureTour.isActive()).toBe(false);
  });
});

// ── Navigation ───────────────────────────────────────────────────

describe('FeatureTour navigation', function () {
  test('next() advances the step', function () {
    window.FeatureTour.start();
    expect(window.FeatureTour.currentStep()).toBe(0);
    window.FeatureTour.next();
    expect(window.FeatureTour.currentStep()).toBe(1);
  });

  test('prev() goes back', function () {
    window.FeatureTour.start();
    window.FeatureTour.next();
    window.FeatureTour.prev();
    expect(window.FeatureTour.currentStep()).toBe(0);
  });

  test('prev() at step 0 stays at 0', function () {
    window.FeatureTour.start();
    window.FeatureTour.prev();
    expect(window.FeatureTour.currentStep()).toBe(0);
  });

  test('next() at last step stays at last', function () {
    window.FeatureTour.start();
    var lastIdx = window.FeatureTour._STOPS.length - 1;
    for (var i = 0; i < lastIdx; i++) window.FeatureTour.next();
    expect(window.FeatureTour.currentStep()).toBe(lastIdx);
    window.FeatureTour.next();
    expect(window.FeatureTour.currentStep()).toBe(lastIdx);
  });

  test('can navigate through all stops', function () {
    window.FeatureTour.start();
    for (var i = 0; i < window.FeatureTour._STOPS.length - 1; i++) {
      window.FeatureTour.next();
    }
    expect(window.FeatureTour.currentStep()).toBe(window.FeatureTour._STOPS.length - 1);
  });
});

// ── Tooltip content ──────────────────────────────────────────────

describe('FeatureTour tooltip content', function () {
  test('shows step title with counter', function () {
    window.FeatureTour.start();
    var title = document.getElementById('tourTitle');
    expect(title).toBeTruthy();
    expect(title.textContent).toContain('(1/');
    expect(title.textContent).toContain('Interactive Chat Demo');
  });

  test('shows step body text', function () {
    window.FeatureTour.start();
    var body = document.getElementById('tourBody');
    expect(body).toBeTruthy();
    expect(body.textContent).toContain('live conversation');
  });

  test('updates content on next', function () {
    window.FeatureTour.start();
    window.FeatureTour.next();
    var title = document.getElementById('tourTitle');
    expect(title.textContent).toContain('(2/');
    expect(title.textContent).toContain('What People Say');
  });

  test('shows progress dots matching stop count', function () {
    window.FeatureTour.start();
    var dots = document.getElementById('tourDots');
    var dotEls = dots.querySelectorAll('span');
    expect(dotEls.length).toBe(window.FeatureTour._STOPS.length);
  });

  test('hides prev button on first step', function () {
    window.FeatureTour.start();
    var prevBtn = document.getElementById('tourPrev');
    expect(prevBtn.style.display).toBe('none');
  });

  test('shows prev button on step > 0', function () {
    window.FeatureTour.start();
    window.FeatureTour.next();
    var prevBtn = document.getElementById('tourPrev');
    expect(prevBtn.style.display).not.toBe('none');
  });

  test('next button says "Done" on last step', function () {
    window.FeatureTour.start();
    for (var i = 0; i < window.FeatureTour._STOPS.length - 1; i++) {
      window.FeatureTour.next();
    }
    var nextBtn = document.getElementById('tourNext');
    expect(nextBtn.textContent).toContain('Done');
  });

  test('next button says "Next" on non-last steps', function () {
    window.FeatureTour.start();
    var nextBtn = document.getElementById('tourNext');
    expect(nextBtn.textContent).toContain('Next');
  });
});

// ── Keyboard ─────────────────────────────────────────────────────

describe('FeatureTour keyboard', function () {
  function fireKey(key) {
    var event = new KeyboardEvent('keydown', {
      key: key, bubbles: true, cancelable: true
    });
    document.dispatchEvent(event);
  }

  test('Escape stops the tour', function () {
    window.FeatureTour.start();
    fireKey('Escape');
    expect(window.FeatureTour.isActive()).toBe(false);
  });

  test('ArrowRight advances', function () {
    window.FeatureTour.start();
    fireKey('ArrowRight');
    expect(window.FeatureTour.currentStep()).toBe(1);
  });

  test('ArrowLeft goes back', function () {
    window.FeatureTour.start();
    window.FeatureTour.next();
    fireKey('ArrowLeft');
    expect(window.FeatureTour.currentStep()).toBe(0);
  });

  test('ArrowDown advances (alternative)', function () {
    window.FeatureTour.start();
    fireKey('ArrowDown');
    expect(window.FeatureTour.currentStep()).toBe(1);
  });

  test('ArrowUp goes back (alternative)', function () {
    window.FeatureTour.start();
    window.FeatureTour.next();
    fireKey('ArrowUp');
    expect(window.FeatureTour.currentStep()).toBe(0);
  });
});

// ── Skip button ──────────────────────────────────────────────────

describe('FeatureTour skip', function () {
  test('skip button stops the tour', function () {
    window.FeatureTour.start();
    var skipBtn = document.getElementById('tourSkip');
    skipBtn.click();
    expect(window.FeatureTour.isActive()).toBe(false);
  });
});

// ── Persistence ──────────────────────────────────────────────────

describe('FeatureTour persistence', function () {
  test('marks tour as completed on stop', function () {
    window.FeatureTour.reset();
    expect(window.FeatureTour.hasCompleted()).toBe(false);
    window.FeatureTour.start();
    window.FeatureTour.stop();
    expect(window.FeatureTour.hasCompleted()).toBe(true);
  });

  test('reset() clears completed flag', function () {
    window.FeatureTour.start();
    window.FeatureTour.stop();
    window.FeatureTour.reset();
    expect(window.FeatureTour.hasCompleted()).toBe(false);
  });
});

// ── Tour trigger button ──────────────────────────────────────────

describe('FeatureTour trigger', function () {
  test('clicking #tourTrigger starts the tour', function () {
    var trigger = document.getElementById('tourTrigger');
    expect(trigger).toBeTruthy();
    trigger.click();
    expect(window.FeatureTour.isActive()).toBe(true);
  });
});

// ── Overlay click ────────────────────────────────────────────────

describe('FeatureTour overlay', function () {
  test('clicking overlay backdrop stops the tour', function () {
    window.FeatureTour.start();
    var ov = document.getElementById('tourOverlay');
    // Simulate click on the overlay itself (not on tooltip)
    var event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: ov });
    ov.dispatchEvent(event);
    expect(window.FeatureTour.isActive()).toBe(false);
  });
});

// ── Stop definitions ─────────────────────────────────────────────

describe('FeatureTour stops', function () {
  test('has at least 5 stops', function () {
    expect(window.FeatureTour._STOPS.length).toBeGreaterThanOrEqual(5);
  });

  test('each stop has target, title, body, position', function () {
    window.FeatureTour._STOPS.forEach(function (stop, i) {
      expect(stop.target).toBeTruthy();
      expect(stop.title).toBeTruthy();
      expect(stop.body).toBeTruthy();
      expect(['top', 'bottom']).toContain(stop.position);
    });
  });

  test('has exactly 8 stops', function () {
    expect(window.FeatureTour._STOPS.length).toBe(8);
  });
});

// ── Next button on tooltip ───────────────────────────────────────

describe('FeatureTour next button', function () {
  test('clicking next button advances step', function () {
    window.FeatureTour.start();
    var nextBtn = document.getElementById('tourNext');
    nextBtn.click();
    expect(window.FeatureTour.currentStep()).toBe(1);
  });

  test('clicking prev button goes back', function () {
    window.FeatureTour.start();
    window.FeatureTour.next();
    var prevBtn = document.getElementById('tourPrev');
    prevBtn.click();
    expect(window.FeatureTour.currentStep()).toBe(0);
  });

  test('clicking Done on last step stops tour', function () {
    window.FeatureTour.start();
    for (var i = 0; i < window.FeatureTour._STOPS.length - 1; i++) {
      window.FeatureTour.next();
    }
    var nextBtn = document.getElementById('tourNext');
    nextBtn.click(); // should call stop()
    expect(window.FeatureTour.isActive()).toBe(false);
  });
});
