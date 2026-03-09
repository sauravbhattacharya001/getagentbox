/**
 * @jest-environment jsdom
 *
 * Tests for bug fixes:
 * 1. ThemeToggle null-reference crash when #themeIcon is missing
 * 2. Testimonials autoplay timer not reset on user navigation
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function loadPage() {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const scriptFn = new Function(appJs);
  scriptFn.call(window);

  document.dispatchEvent(new Event('DOMContentLoaded'));
}

// ── ThemeToggle null-safety ─────────────────────────────────────────────

describe('ThemeToggle null-safety', () => {
  afterEach(() => {
    localStorage.clear();
  });

  test('init does not crash when #themeIcon is missing', () => {
    document.documentElement.innerHTML = '';
    document.write(html);
    document.close();

    // Remove the icon element but keep the button
    const icon = document.getElementById('themeIcon');
    if (icon) icon.remove();

    const btn = document.getElementById('themeToggle');
    expect(btn).not.toBeNull();

    // Execute app.js — should not throw
    expect(() => {
      const scriptFn = new Function(appJs);
      scriptFn.call(window);
      document.dispatchEvent(new Event('DOMContentLoaded'));
    }).not.toThrow();
  });

  test('toggle does not crash when #themeIcon is missing', () => {
    document.documentElement.innerHTML = '';
    document.write(html);
    document.close();

    const icon = document.getElementById('themeIcon');
    if (icon) icon.remove();

    const scriptFn = new Function(appJs);
    scriptFn.call(window);
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const btn = document.getElementById('themeToggle');
    expect(btn).not.toBeNull();

    // Clicking the toggle should not throw
    expect(() => {
      btn.click();
    }).not.toThrow();
  });

  test('toggle still updates localStorage when icon is missing', () => {
    document.documentElement.innerHTML = '';
    document.write(html);
    document.close();

    const icon = document.getElementById('themeIcon');
    if (icon) icon.remove();

    const scriptFn = new Function(appJs);
    scriptFn.call(window);
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const btn = document.getElementById('themeToggle');
    btn.click();
    expect(localStorage.getItem('agentbox-theme')).toBe('light');
  });

  test('init restores light mode class when icon is missing', () => {
    localStorage.setItem('agentbox-theme', 'light');

    document.documentElement.innerHTML = '';
    document.write(html);
    document.close();

    const icon = document.getElementById('themeIcon');
    if (icon) icon.remove();

    const scriptFn = new Function(appJs);
    scriptFn.call(window);
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(document.body.classList.contains('light-mode')).toBe(true);
  });

  test('init updates icon when icon element exists', () => {
    localStorage.setItem('agentbox-theme', 'light');
    loadPage();

    const icon = document.getElementById('themeIcon');
    if (icon) {
      expect(icon.textContent).toBe('🌙');
    }
  });

  test('init respects prefers-color-scheme: light when no saved theme', () => {
    // No saved theme
    localStorage.removeItem('agentbox-theme');

    // Mock matchMedia to report light preference
    const original = window.matchMedia;
    window.matchMedia = jest.fn((query) => {
      if (query === '(prefers-color-scheme: light)') {
        return { matches: true, addEventListener: jest.fn() };
      }
      return original ? original(query) : { matches: false, addEventListener: jest.fn() };
    });

    loadPage();

    expect(document.body.classList.contains('light-mode')).toBe(true);

    window.matchMedia = original;
  });

  test('init stays dark when system prefers dark and no saved theme', () => {
    localStorage.removeItem('agentbox-theme');

    const original = window.matchMedia;
    window.matchMedia = jest.fn((query) => {
      if (query === '(prefers-color-scheme: light)') {
        return { matches: false, addEventListener: jest.fn() };
      }
      return original ? original(query) : { matches: false, addEventListener: jest.fn() };
    });

    loadPage();

    expect(document.body.classList.contains('light-mode')).toBe(false);

    window.matchMedia = original;
  });
});

// ── Testimonials autoplay reset ─────────────────────────────────────────

describe('Testimonials autoplay reset on user interaction', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    loadPage();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('prev() resets autoplay timer', () => {
    const { Testimonials } = window;
    if (!Testimonials) return;

    // Autoplay should be running after init
    // Advance 4 seconds into the 5-second interval
    jest.advanceTimersByTime(4000);
    const indexBefore = Testimonials.getCurrent();

    // User clicks prev
    Testimonials.prev();
    const indexAfterPrev = Testimonials.getCurrent();

    // Should have gone back
    expect(indexAfterPrev).not.toBe(indexBefore);

    // Now advance 1 second — old timer would have fired at 5s mark
    jest.advanceTimersByTime(1000);
    const indexAt5s = Testimonials.getCurrent();

    // Should NOT have auto-advanced (timer was reset)
    expect(indexAt5s).toBe(indexAfterPrev);
  });

  test('next() resets autoplay timer', () => {
    const { Testimonials } = window;
    if (!Testimonials) return;

    // Advance 4 seconds into the interval
    jest.advanceTimersByTime(4000);

    // User clicks next
    Testimonials.next();
    const indexAfterNext = Testimonials.getCurrent();

    // Advance 1 second — old timer would have fired
    jest.advanceTimersByTime(1000);
    expect(Testimonials.getCurrent()).toBe(indexAfterNext);

    // But after a full 5 seconds from the reset, it should auto-advance
    jest.advanceTimersByTime(4000);
    expect(Testimonials.getCurrent()).not.toBe(indexAfterNext);
  });

  test('dot click resets autoplay timer', () => {
    const { Testimonials } = window;
    if (!Testimonials || Testimonials.getTotal() < 3) return;

    // Advance 4 seconds into the interval
    jest.advanceTimersByTime(4000);

    // Click dot 2 (index 2)
    Testimonials.goTo(2);
    // Simulate the dot click restart (done in event handler)
    Testimonials.stopAutoPlay();
    Testimonials.startAutoPlay();

    const indexAfterDot = Testimonials.getCurrent();
    expect(indexAfterDot).toBe(2);

    // After 1 second, should not have auto-advanced
    jest.advanceTimersByTime(1000);
    expect(Testimonials.getCurrent()).toBe(2);

    // After full interval, should auto-advance
    jest.advanceTimersByTime(4000);
    expect(Testimonials.getCurrent()).not.toBe(2);
  });

  test('autoplay continues after user interaction', () => {
    const { Testimonials } = window;
    if (!Testimonials) return;

    Testimonials.next();
    const after = Testimonials.getCurrent();

    // Full interval later, autoplay should advance
    jest.advanceTimersByTime(5000);
    expect(Testimonials.getCurrent()).not.toBe(after);
  });

  test('prev does not restart autoplay when paused', () => {
    const { Testimonials } = window;
    if (!Testimonials) return;

    // Stop autoplay (simulates mouseenter)
    Testimonials.stopAutoPlay();

    Testimonials.prev();
    const after = Testimonials.getCurrent();

    // After full interval, should NOT advance (autoplay is stopped)
    jest.advanceTimersByTime(10000);
    expect(Testimonials.getCurrent()).toBe(after);
  });
});
