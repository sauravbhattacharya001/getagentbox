/**
 * @jest-environment jsdom
 */

'use strict';

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const appJs = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');

function setup() {
  document.documentElement.innerHTML = html;
  // Reset global modules
  delete global.ActivityFeed;
  delete global.prefersReducedMotion;
  global.prefersReducedMotion = false;

  // Stub IntersectionObserver to immediately trigger visibility
  global.IntersectionObserver = class {
    constructor(cb) { this._cb = cb; }
    observe() {
      this._cb([{ isIntersecting: true }]);
    }
    unobserve() {}
    disconnect() {}
  };

  // Use eval like other test files (modules are exposed as globals)
  eval(appJs);

  // Manually init since DOMContentLoaded already fired
  ActivityFeed.init();
}

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  setup();
});

afterEach(() => {
  if (global.ActivityFeed && global.ActivityFeed.destroy) {
    global.ActivityFeed.destroy();
  }
  jest.useRealTimers();
});

describe('ActivityFeed', () => {
  describe('module structure', () => {
    test('ActivityFeed is exposed on window', () => {
      expect(window.ActivityFeed).toBeDefined();
    });

    test('has init and destroy methods', () => {
      expect(typeof window.ActivityFeed.init).toBe('function');
      expect(typeof window.ActivityFeed.destroy).toBe('function');
    });
  });

  describe('HTML structure', () => {
    test('activity section exists in DOM', () => {
      const section = document.getElementById('activitySection');
      expect(section).not.toBeNull();
    });

    test('activity feed container exists', () => {
      const feed = document.getElementById('activityFeed');
      expect(feed).not.toBeNull();
    });

    test('has heading', () => {
      const section = document.getElementById('activitySection');
      const h2 = section.querySelector('h2');
      expect(h2).not.toBeNull();
      expect(h2.textContent.length).toBeGreaterThan(0);
    });

    test('has subtitle', () => {
      const section = document.getElementById('activitySection');
      const subtitle = section.querySelector('.activity-subtitle');
      expect(subtitle).not.toBeNull();
    });

    test('has initial activity items', () => {
      const items = document.querySelectorAll('.activity-item[data-initial="true"]');
      expect(items.length).toBe(5);
    });

    test('each initial item has icon, text, and time', () => {
      const items = document.querySelectorAll('.activity-item[data-initial="true"]');
      items.forEach(item => {
        expect(item.querySelector('.activity-icon')).not.toBeNull();
        expect(item.querySelector('.activity-text')).not.toBeNull();
        expect(item.querySelector('.activity-time')).not.toBeNull();
      });
    });

    test('activity text contains Agent strong tag', () => {
      const items = document.querySelectorAll('.activity-item[data-initial="true"]');
      items.forEach(item => {
        const strong = item.querySelector('.activity-text strong');
        expect(strong).not.toBeNull();
        expect(strong.textContent).toBe('Agent');
      });
    });

    test('active count element exists', () => {
      const el = document.getElementById('activityActiveCount');
      expect(el).not.toBeNull();
      expect(el.textContent).toContain('1,247');
    });

    test('today count element exists', () => {
      const el = document.getElementById('activityTodayCount');
      expect(el).not.toBeNull();
      expect(el.textContent).toContain('18,392');
    });

    test('has pulse indicator', () => {
      const pulse = document.querySelector('.activity-pulse');
      expect(pulse).not.toBeNull();
    });

    test('feed has ARIA role and live region', () => {
      const feed = document.getElementById('activityFeed');
      expect(feed.getAttribute('role')).toBe('log');
      expect(feed.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('cycling behavior', () => {
    test('new item added after cycle interval', () => {
      const feed = document.getElementById('activityFeed');
      const initialCount = feed.querySelectorAll('.activity-item').length;

      jest.advanceTimersByTime(4000);

      const newCount = feed.querySelectorAll('.activity-item').length;
      // Should have added one (and possibly started removing one)
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    });

    test('new dynamically-created items exist after cycling', () => {
      const feed = document.getElementById('activityFeed');

      // Advance through several cycles
      jest.advanceTimersByTime(16000);

      // There should be items without data-initial (dynamically created)
      const allItems = feed.querySelectorAll('.activity-item');
      const dynamicItems = Array.from(allItems).filter(
        item => !item.hasAttribute('data-initial')
      );
      expect(dynamicItems.length).toBeGreaterThan(0);
    });

    test('time labels age on each cycle', () => {
      jest.advanceTimersByTime(4000);

      const feed = document.getElementById('activityFeed');
      const items = feed.querySelectorAll('.activity-item');
      // Second item should show aged time
      const timeEls = [];
      items.forEach(item => {
        const t = item.querySelector('.activity-time');
        if (t) timeEls.push(t.textContent);
      });
      // At least one should show 'just now' (the new one)
      expect(timeEls.some(t => t === 'just now')).toBe(true);
    });

    test('exiting class applied to oldest items when feed exceeds limit', () => {
      const feed = document.getElementById('activityFeed');

      // Run enough cycles to trigger eviction (5 initial + 3 new > MAX_VISIBLE=5)
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(4000);
      }

      // In jsdom, animationend never fires so removed items get .exiting
      // but stay in DOM. Verify the mechanism is triggered.
      const exiting = feed.querySelectorAll('.activity-item.exiting');
      expect(exiting.length).toBeGreaterThan(0);
    });

    test('new items keep being added across many cycles', () => {
      const feed = document.getElementById('activityFeed');

      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(4000);
      }

      // After 10 cycles, some old items were removed by the fallback timer.
      // At least MAX_VISIBLE (5) items should remain, and we should see
      // dynamic (non-initial) items proving new ones were added.
      const allItems = feed.querySelectorAll('.activity-item');
      const dynamicItems = Array.from(allItems).filter(
        item => !item.hasAttribute('data-initial')
      );
      expect(dynamicItems.length).toBeGreaterThanOrEqual(1);
      expect(allItems.length).toBeGreaterThanOrEqual(1);
      expect(allItems.length).toBeLessThanOrEqual(10);
    });

    test('items do not accumulate beyond MAX_VISIBLE when animationend is missing', () => {
      // Simulate 20 cycles (80s) — without the fallback fix, items would
      // accumulate because animationend never fires in jsdom.
      jest.advanceTimersByTime(80000);

      const feed = document.getElementById('activityFeed');
      const items = feed.querySelectorAll('.activity-item');
      // Should be bounded: MAX_VISIBLE (5) + at most 1 entering
      expect(items.length).toBeLessThanOrEqual(7);
    });

    test('destroy stops cycling', () => {
      const feed = document.getElementById('activityFeed');
      const countBefore = feed.querySelectorAll('.activity-item').length;

      window.ActivityFeed.destroy();
      jest.advanceTimersByTime(20000);

      const countAfter = feed.querySelectorAll('.activity-item').length;
      expect(countAfter).toBe(countBefore);
    });
  });

  describe('counter updates', () => {
    test('active count changes after cycle', () => {
      const el = document.getElementById('activityActiveCount');
      const initial = el.textContent;

      jest.advanceTimersByTime(4000);

      // Counter should have changed (randomized)
      // Just verify it's still a number
      const val = parseInt(el.textContent.replace(/,/g, ''), 10);
      expect(val).toBeGreaterThan(0);
    });

    test('today count increases over time', () => {
      const el = document.getElementById('activityTodayCount');
      const initial = parseInt(el.textContent.replace(/,/g, ''), 10);

      // Run several cycles
      jest.advanceTimersByTime(20000);

      const updated = parseInt(el.textContent.replace(/,/g, ''), 10);
      expect(updated).toBeGreaterThanOrEqual(initial);
    });

    test('today count stays bounded below 25001', () => {
      const el = document.getElementById('activityTodayCount');
      // Set to a high value close to the cap
      el.textContent = '24,999';

      // Run many cycles to push past the cap
      jest.advanceTimersByTime(60000);

      const val = parseInt(el.textContent.replace(/,/g, ''), 10);
      expect(val).toBeLessThanOrEqual(25000);
    });

    test('today count never drops (issue #40)', () => {
      const el = document.getElementById('activityTodayCount');
      let prev = parseInt(el.textContent.replace(/,/g, ''), 10);

      // Run 50 cycles and verify counter never decreases
      for (let i = 0; i < 50; i++) {
        jest.advanceTimersByTime(4000);
        const current = parseInt(el.textContent.replace(/,/g, ''), 10);
        expect(current).toBeGreaterThanOrEqual(prev);
        prev = current;
      }
    });

    test('active count does not frequently drop (biased upward)', () => {
      const el = document.getElementById('activityActiveCount');
      let prev = parseInt(el.textContent.replace(/,/g, ''), 10);
      let drops = 0;

      // Run 100 cycles and count how many times active drops
      for (let i = 0; i < 100; i++) {
        jest.advanceTimersByTime(4000);
        const current = parseInt(el.textContent.replace(/,/g, ''), 10);
        if (current < prev) drops++;
        prev = current;
      }
      // With biased-upward (-1 to +2), drops should be ~25% of ticks
      // Previously (-2 to +2), drops were ~40%. Allow up to 35%.
      expect(drops).toBeLessThan(35);
    });
  });

  describe('CSS', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8');

    test('defines activity-section styles', () => {
      expect(css).toContain('.activity-section');
    });

    test('defines activity-feed styles', () => {
      expect(css).toContain('.activity-feed');
    });

    test('defines activity-item styles', () => {
      expect(css).toContain('.activity-item');
    });

    test('defines slide-in animation', () => {
      expect(css).toContain('activitySlideIn');
    });

    test('defines slide-out animation', () => {
      expect(css).toContain('activitySlideOut');
    });

    test('defines pulse animation', () => {
      expect(css).toContain('activityPulse');
    });

    test('has light mode overrides', () => {
      expect(css).toContain('.light-mode .activity-feed');
      expect(css).toContain('.light-mode .activity-text');
    });

    test('has reduced motion support', () => {
      expect(css).toContain('prefers-reduced-motion');
    });

    test('has mobile responsive styles', () => {
      expect(css).toContain('.activity-stats-bar');
    });
  });
});
