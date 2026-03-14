/**
 * @jest-environment jsdom
 */

/* global ScrollProgress */

function setupDOM() {
  document.body.innerHTML = `
    <div id="scrollProgressBar" style="width:0%"></div>
    <button id="backToTop"></button>
  `;
  // Make bar visible for offsetParent check
  Object.defineProperty(document.getElementById('scrollProgressBar'), 'offsetParent', {
    get: () => document.body,
    configurable: true,
  });
}

function setScrollState(pageYOffset, scrollHeight, clientHeight) {
  Object.defineProperty(window, 'pageYOffset', { value: pageYOffset, writable: true, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollTop', { value: pageYOffset, writable: true, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: scrollHeight, writable: true, configurable: true });
  Object.defineProperty(document.documentElement, 'clientHeight', { value: clientHeight, writable: true, configurable: true });
}

beforeAll(() => {
  window.matchMedia = window.matchMedia || function () {
    return { matches: false, addListener: function () {}, removeListener: function () {} };
  };
  window.requestAnimationFrame = window.requestAnimationFrame || function (cb) { cb(); return 0; };
  window.scrollTo = jest.fn();

  setupDOM();
  setScrollState(0, 800, 800);
  require('../app.js');
});

afterEach(() => {
  ScrollProgress.destroy();
  window.scrollTo.mockClear();
});

describe('ScrollProgress', () => {
  describe('Initialization', () => {
    test('init() attaches scroll listener when both elements exist', () => {
      setupDOM();
      setScrollState(0, 2000, 800);
      const addSpy = jest.spyOn(window, 'addEventListener');
      ScrollProgress.init();
      expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
      addSpy.mockRestore();
    });

    test('init() is a no-op when elements are missing', () => {
      document.body.innerHTML = '';
      const addSpy = jest.spyOn(window, 'addEventListener');
      const scrollCallsBefore = addSpy.mock.calls.filter(c => c[0] === 'scroll').length;
      ScrollProgress.init();
      const scrollCallsAfter = addSpy.mock.calls.filter(c => c[0] === 'scroll').length;
      expect(scrollCallsAfter).toBe(scrollCallsBefore);
      addSpy.mockRestore();
    });

    test('double init() calls destroy first to avoid listener leaks', () => {
      setupDOM();
      setScrollState(0, 2000, 800);
      const removeSpy = jest.spyOn(window, 'removeEventListener');
      ScrollProgress.init();
      ScrollProgress.init();
      expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      removeSpy.mockRestore();
    });
  });

  describe('Progress Bar', () => {
    test('bar width is 0% when scrollTop is 0', () => {
      setupDOM();
      setScrollState(0, 2000, 800);
      ScrollProgress.init();
      expect(document.getElementById('scrollProgressBar').style.width).toBe('0%');
    });

    test('bar width is 100% when scrolled to bottom', () => {
      setupDOM();
      setScrollState(1200, 2000, 800);
      ScrollProgress.init();
      expect(document.getElementById('scrollProgressBar').style.width).toBe('100%');
    });

    test('bar width reflects intermediate scroll position', () => {
      setupDOM();
      setScrollState(500, 2000, 1000);
      ScrollProgress.init();
      expect(document.getElementById('scrollProgressBar').style.width).toBe('50%');
    });

    test('bar width stays at 0% when no scrollable content', () => {
      setupDOM();
      setScrollState(0, 800, 800);
      ScrollProgress.init();
      expect(document.getElementById('scrollProgressBar').style.width).toBe('0%');
    });
  });

  describe('Back-to-Top Button', () => {
    test('button gets visible class when scrollTop > 400', () => {
      setupDOM();
      setScrollState(500, 3000, 800);
      ScrollProgress.init();
      expect(document.getElementById('backToTop').classList.contains('visible')).toBe(true);
    });

    test('button does not have visible class when scrollTop <= 400', () => {
      setupDOM();
      setScrollState(200, 3000, 800);
      ScrollProgress.init();
      expect(document.getElementById('backToTop').classList.contains('visible')).toBe(false);
    });

    test('clicking button calls scrollTo', () => {
      setupDOM();
      setScrollState(500, 3000, 800);
      ScrollProgress.init();
      document.getElementById('backToTop').click();
      expect(window.scrollTo).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('destroy() removes scroll listener', () => {
      setupDOM();
      setScrollState(0, 2000, 800);
      ScrollProgress.init();
      const removeSpy = jest.spyOn(window, 'removeEventListener');
      ScrollProgress.destroy();
      expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      removeSpy.mockRestore();
    });

    test('destroy() is safe to call multiple times', () => {
      expect(() => {
        ScrollProgress.destroy();
        ScrollProgress.destroy();
        ScrollProgress.destroy();
      }).not.toThrow();
    });

    test('destroy() is safe to call before init()', () => {
      expect(() => {
        ScrollProgress.destroy();
      }).not.toThrow();
    });

    test('scroll events no longer update bar after destroy()', () => {
      setupDOM();
      setScrollState(0, 2000, 800);
      ScrollProgress.init();
      const bar = document.getElementById('scrollProgressBar');
      expect(bar.style.width).toBe('0%');

      ScrollProgress.destroy();
      setScrollState(600, 2000, 800);
      window.dispatchEvent(new Event('scroll'));
      // Bar should still be 0% since listener was removed
      expect(bar.style.width).toBe('0%');
    });
  });
});
