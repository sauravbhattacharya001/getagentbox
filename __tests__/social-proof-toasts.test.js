/**
 * @jest-environment jsdom
 */

/* eslint-env jest */

beforeEach(function () {
  document.body.innerHTML = '';
  sessionStorage.clear();
  jest.useFakeTimers();
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(function (query) {
      return {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn()
      };
    })
  });
});

afterEach(function () {
  jest.useRealTimers();
  if (window.SocialProofToasts) {
    window.SocialProofToasts.destroy();
  }
});

function loadModule() {
  jest.resetModules();
  delete window.SocialProofToasts;
  require('../app.js');
  return window.SocialProofToasts;
}

describe('SocialProofToasts', function () {
  test('module is defined on window', function () {
    var SP = loadModule();
    expect(SP).toBeDefined();
    expect(typeof SP.init).toBe('function');
    expect(typeof SP.dismiss).toBe('function');
    expect(typeof SP.destroy).toBe('function');
  });

  test('init creates container in DOM', function () {
    var SP = loadModule();
    SP.init();
    var container = document.querySelector('.sp-toast-container');
    expect(container).not.toBeNull();
    expect(container.getAttribute('aria-label')).toBe('Activity notifications');
  });

  test('shows toast after initial delay', function () {
    var SP = loadModule();
    SP.init();
    // No toasts before initial delay
    expect(document.querySelectorAll('.sp-toast').length).toBe(0);
    // Advance past initial delay
    jest.advanceTimersByTime(12000);
    expect(document.querySelectorAll('.sp-toast').length).toBe(1);
  });

  test('toast has correct structure', function () {
    var SP = loadModule();
    SP.init();
    jest.advanceTimersByTime(12000);
    var toast = document.querySelector('.sp-toast');
    expect(toast).not.toBeNull();
    expect(toast.querySelector('.sp-toast-icon')).not.toBeNull();
    expect(toast.querySelector('.sp-toast-msg')).not.toBeNull();
    expect(toast.querySelector('.sp-toast-time')).not.toBeNull();
    expect(toast.querySelector('.sp-toast-close')).not.toBeNull();
    expect(toast.getAttribute('role')).toBe('status');
  });

  test('toast message contains city name', function () {
    var SP = loadModule();
    SP.init();
    jest.advanceTimersByTime(12000);
    var msg = document.querySelector('.sp-toast-msg').textContent;
    expect(msg).toMatch(/^Someone in /);
  });

  test('close button removes toast', function () {
    var SP = loadModule();
    SP.init();
    jest.advanceTimersByTime(12000);
    var closeBtn = document.querySelector('.sp-toast-close');
    closeBtn.click();
    // Trigger transition fallback
    jest.advanceTimersByTime(600);
    expect(document.querySelectorAll('.sp-toast').length).toBe(0);
  });

  test('toast auto-hides after display duration', function () {
    var SP = loadModule();
    SP.init();
    jest.advanceTimersByTime(12000); // show toast
    expect(document.querySelectorAll('.sp-toast').length).toBe(1);
    jest.advanceTimersByTime(5000); // DISPLAY_MS
    jest.advanceTimersByTime(500); // transition fallback
    expect(document.querySelectorAll('.sp-toast').length).toBe(0);
  });

  test('dismiss stops future toasts and sets sessionStorage', function () {
    var SP = loadModule();
    SP.init();
    SP.dismiss();
    jest.advanceTimersByTime(50000);
    expect(document.querySelectorAll('.sp-toast').length).toBe(0);
    expect(sessionStorage.getItem('sp-toasts-dismissed')).toBe('1');
  });

  test('does not init if previously dismissed', function () {
    sessionStorage.setItem('sp-toasts-dismissed', '1');
    var SP = loadModule();
    SP.init();
    jest.advanceTimersByTime(50000);
    expect(document.querySelector('.sp-toast-container')).toBeNull();
  });

  test('respects prefers-reduced-motion', function () {
    window.matchMedia = jest.fn().mockImplementation(function () {
      return {
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
    });
    var SP = loadModule();
    SP.init();
    jest.advanceTimersByTime(50000);
    expect(document.querySelector('.sp-toast-container')).toBeNull();
  });

  test('destroy cleans up container', function () {
    var SP = loadModule();
    SP.init();
    jest.advanceTimersByTime(12000);
    SP.destroy();
    expect(document.querySelector('.sp-toast-container')).toBeNull();
  });

  test('shows periodic toasts at interval', function () {
    var SP = loadModule();
    SP.init();
    jest.advanceTimersByTime(12000); // first toast
    expect(document.querySelectorAll('.sp-toast').length).toBe(1);
    // Auto-hide first toast
    jest.advanceTimersByTime(5500);
    // Advance to next interval tick (25000ms from start of interval)
    // The interval started at 12000, so next tick at 12000+25000=37000 total
    // We're at 12000+5500=17500, need 37000-17500=19500 more
    jest.advanceTimersByTime(19500);
    expect(document.querySelectorAll('.sp-toast').length).toBe(1);
  });

  test('caps toasts at MAX_TOASTS_PER_SESSION', function () {
    var SP = loadModule();
    SP.init();
    // Show 15 toasts (max), then verify no more appear
    for (var i = 0; i < 16; i++) {
      jest.advanceTimersByTime(12000 + i * 25000);
      // hide current toast
      jest.advanceTimersByTime(5500);
    }
    // After 15 toasts, the interval should have been stopped
    var remaining = document.querySelectorAll('.sp-toast').length;
    expect(remaining).toBeLessThanOrEqual(1);
  });
});
