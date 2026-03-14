/**
 * @jest-environment jsdom
 */
'use strict';

/* ── helpers ── */

function setupDOM() {
  document.body.innerHTML = `
    <div id="scrollProgressBar" style="width:0%"></div>
    <button id="backToTop"></button>
  `;
  // jsdom doesn't compute offsetParent; stub it so update() doesn't bail
  Object.defineProperty(
    document.getElementById('scrollProgressBar'),
    'offsetParent',
    { get: () => document.body, configurable: true }
  );
}

function teardownDOM() {
  document.body.innerHTML = '';
}

function mockScroll(scrollTop, scrollHeight, clientHeight) {
  Object.defineProperty(document.documentElement, 'scrollTop', {
    value: scrollTop, writable: true, configurable: true,
  });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: scrollHeight, writable: true, configurable: true,
  });
  Object.defineProperty(document.documentElement, 'clientHeight', {
    value: clientHeight, writable: true, configurable: true,
  });
  Object.defineProperty(window, 'pageYOffset', {
    value: scrollTop, writable: true, configurable: true,
  });
}

/* ── rAF polyfill ── */
let rafCallbacks = [];
window.requestAnimationFrame = jest.fn((cb) => {
  rafCallbacks.push(cb);
  return rafCallbacks.length;
});

function flushRAF() {
  const cbs = rafCallbacks.slice();
  rafCallbacks = [];
  cbs.forEach((cb) => cb(performance.now()));
}

/* ── matchMedia mock (prefersReducedMotion) ── */
let _reducedMotion = false;
const _listeners = [];
window.matchMedia = jest.fn((query) => ({
  matches: query === '(prefers-reduced-motion: reduce)' ? _reducedMotion : false,
  media: query,
  addEventListener: jest.fn((_, handler) => _listeners.push(handler)),
  removeEventListener: jest.fn(),
}));

// Load app.js — captures prefersReducedMotion at load time
require('../app.js');

const SP = window.ScrollProgress;

/* ── tests ── */

beforeEach(() => {
  SP.destroy();
  teardownDOM();
  rafCallbacks = [];
});

describe('ScrollProgress', () => {
  /* ── Initialization ── */

  describe('init()', () => {
    test('is a no-op when elements are missing (no errors)', () => {
      expect(() => SP.init()).not.toThrow();
    });

    test('attaches scroll listener when both elements exist', () => {
      setupDOM();
      const addSpy = jest.spyOn(window, 'addEventListener');
      SP.init();
      expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
      addSpy.mockRestore();
    });

    test('double init does not leak listeners (calls destroy first)', () => {
      setupDOM();
      const removeSpy = jest.spyOn(window, 'removeEventListener');
      SP.init();
      SP.init();
      expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      removeSpy.mockRestore();
    });
  });

  /* ── Progress Bar ── */

  describe('progress bar width', () => {
    test('0% when scrollTop is 0', () => {
      setupDOM();
      mockScroll(0, 2000, 800);
      SP.init();
      expect(document.getElementById('scrollProgressBar').style.width).toBe('0%');
    });

    test('100% when scrolled to bottom', () => {
      setupDOM();
      mockScroll(1200, 2000, 800);
      SP.init();
      expect(document.getElementById('scrollProgressBar').style.width).toBe('100%');
    });

    test('50% at midpoint', () => {
      setupDOM();
      mockScroll(600, 2000, 800);
      SP.init();
      expect(document.getElementById('scrollProgressBar').style.width).toBe('50%');
    });

    test('0% when document height equals viewport (no scrollable content)', () => {
      setupDOM();
      mockScroll(0, 800, 800);
      SP.init();
      expect(document.getElementById('scrollProgressBar').style.width).toBe('0%');
    });
  });

  /* ── Back-to-Top Button ── */

  describe('back-to-top button', () => {
    test('gets visible class when scrollTop > 400', () => {
      setupDOM();
      mockScroll(401, 2000, 800);
      SP.init();
      expect(document.getElementById('backToTop').classList.contains('visible')).toBe(true);
    });

    test('loses visible class when scrollTop <= 400', () => {
      setupDOM();
      mockScroll(400, 2000, 800);
      SP.init();
      expect(document.getElementById('backToTop').classList.contains('visible')).toBe(false);
    });

    test('clicking scrolls to top with smooth behavior', () => {
      setupDOM();
      mockScroll(500, 2000, 800);
      SP.init();
      const scrollToSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
      document.getElementById('backToTop').click();
      // prefersReducedMotion is false at load time
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      scrollToSpy.mockRestore();
    });
  });

  /* ── Throttling ── */

  describe('rAF throttling', () => {
    test('multiple rapid scroll events queue only one rAF callback', () => {
      setupDOM();
      mockScroll(0, 2000, 800);
      SP.init();
      rafCallbacks = []; // clear init's rAF calls

      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));

      // Only 1 rAF should have been queued (ticking blocks re-entry)
      expect(rafCallbacks.length).toBe(1);

      // After flush, further scrolls can queue again
      mockScroll(600, 2000, 800);
      flushRAF();
      expect(document.getElementById('scrollProgressBar').style.width).toBe('50%');
    });
  });

  /* ── Cleanup ── */

  describe('destroy()', () => {
    test('removes scroll listener so bar no longer updates', () => {
      setupDOM();
      mockScroll(0, 2000, 800);
      SP.init();
      const bar = document.getElementById('scrollProgressBar');
      expect(bar.style.width).toBe('0%');

      SP.destroy();
      // scroll events after destroy should not update bar
      mockScroll(600, 2000, 800);
      window.dispatchEvent(new Event('scroll'));
      flushRAF();
      expect(bar.style.width).toBe('0%');
    });

    test('is safe to call multiple times', () => {
      expect(() => {
        SP.destroy();
        SP.destroy();
        SP.destroy();
      }).not.toThrow();
    });

    test('is safe to call before init', () => {
      expect(() => SP.destroy()).not.toThrow();
    });
  });
});
