/**
 * @jest-environment jsdom
 */

/* eslint-disable no-undef */

const fs = require('fs');
const path = require('path');

const vm = require('vm');

function loadStats() {
  const code = fs.readFileSync(
    path.resolve(__dirname, '..', 'src', 'modules', 'stats.js'),
    'utf8'
  );
  global.prefersReducedMotion = false;
  // Replace `var Stats =` with `global.Stats =` so the IIFE result lands on global
  const patched = code.replace(/\bvar\s+Stats\s*=/, 'global.Stats =');
  // Use Function constructor so jsdom globals (document, window) are accessible
  new Function(patched)();
  return global.Stats;
}

function createStatsSection(cards) {
  const section = document.createElement('div');
  section.id = 'statsSection';
  cards.forEach(function (c) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.dataset.target = String(c.target);
    if (c.suffix) card.dataset.suffix = c.suffix;
    if (c.decimal) card.dataset.decimal = c.decimal;
    const num = document.createElement('span');
    num.className = 'stat-number';
    num.textContent = c.initial || '0';
    card.appendChild(num);
    section.appendChild(card);
  });
  document.body.appendChild(section);
  return section;
}

let Stats;

beforeEach(() => {
  document.body.innerHTML = '';
  global.prefersReducedMotion = false;
  // Stub requestAnimationFrame / cancelAnimationFrame
  let rafId = 0;
  global.requestAnimationFrame = function (cb) {
    rafId++;
    setTimeout(function () { cb(performance.now()); }, 0);
    return rafId;
  };
  global.cancelAnimationFrame = function () {};
  Stats = loadStats();
});

afterEach(() => {
  delete global.prefersReducedMotion;
  delete global.Stats;
});

describe('Stats', () => {
  test('exports expected public API', () => {
    expect(typeof Stats.init).toBe('function');
    expect(typeof Stats.isAnimated).toBe('function');
    expect(typeof Stats.reset).toBe('function');
    expect(typeof Stats.animateAll).toBe('function');
    expect(typeof Stats.animateCard).toBe('function');
    expect(typeof Stats.formatNumber).toBe('function');
    expect(typeof Stats.easeOutCubic).toBe('function');
    expect(typeof Stats.DURATION).toBe('number');
  });

  describe('formatNumber', () => {
    test('formats small numbers without commas', () => {
      expect(Stats.formatNumber(0)).toBe('0');
      expect(Stats.formatNumber(999)).toBe('999');
    });

    test('adds commas for thousands', () => {
      expect(Stats.formatNumber(1000)).toBe('1,000');
      expect(Stats.formatNumber(1234567)).toBe('1,234,567');
    });

    test('handles negative numbers', () => {
      expect(Stats.formatNumber(-1500)).toBe('-1,500');
    });
  });

  describe('easeOutCubic', () => {
    test('returns 0 at start', () => {
      expect(Stats.easeOutCubic(0)).toBe(0);
    });

    test('returns 1 at end', () => {
      expect(Stats.easeOutCubic(1)).toBe(1);
    });

    test('is monotonically increasing', () => {
      let prev = 0;
      for (let t = 0.1; t <= 1.0; t += 0.1) {
        const val = Stats.easeOutCubic(t);
        expect(val).toBeGreaterThanOrEqual(prev);
        prev = val;
      }
    });

    test('eases out (faster at start, slower at end)', () => {
      expect(Stats.easeOutCubic(0.5)).toBeGreaterThan(0.5);
    });
  });

  describe('isAnimated / reset', () => {
    test('starts not animated', () => {
      expect(Stats.isAnimated()).toBe(false);
    });

    test('isAnimated returns true after animateAll', () => {
      createStatsSection([{ target: 100 }]);
      const cards = document.querySelectorAll('.stat-card');
      global.prefersReducedMotion = true;
      Stats.animateAll(cards);
      expect(Stats.isAnimated()).toBe(true);
    });

    test('reset sets animated back to false', () => {
      createStatsSection([{ target: 100 }]);
      const cards = document.querySelectorAll('.stat-card');
      global.prefersReducedMotion = true;
      Stats.animateAll(cards);
      Stats.reset();
      expect(Stats.isAnimated()).toBe(false);
    });
  });

  describe('animateAll with reduced motion', () => {
    test('shows final values immediately when prefersReducedMotion is true', () => {
      global.prefersReducedMotion = true;
      createStatsSection([
        { target: 5000, suffix: '+' },
        { target: 99, suffix: '%', decimal: '9' }
      ]);
      const cards = document.querySelectorAll('.stat-card');
      Stats.animateAll(cards);

      expect(cards[0].querySelector('.stat-number').textContent).toBe('5,000+');
      expect(cards[1].querySelector('.stat-number').textContent).toBe('99.9%');
      expect(cards[0].classList.contains('animated')).toBe(true);
      expect(cards[1].classList.contains('animated')).toBe(true);
    });

    test('handles prefix < in display', () => {
      global.prefersReducedMotion = true;
      createStatsSection([{ target: 2, suffix: 's', initial: '<0' }]);
      const cards = document.querySelectorAll('.stat-card');
      cards[0].querySelector('.stat-number').textContent = '<0';
      Stats.animateAll(cards);
      expect(cards[0].querySelector('.stat-number').textContent).toBe('<2s');
    });
  });

  describe('animateCard', () => {
    test('skips card without .stat-number element', () => {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.dataset.target = '100';
      expect(() => Stats.animateCard(card)).not.toThrow();
    });

    test('skips card with NaN target', () => {
      createStatsSection([{ target: 'abc' }]);
      const card = document.querySelector('.stat-card');
      card.dataset.target = 'abc';
      expect(() => Stats.animateCard(card)).not.toThrow();
    });
  });

  describe('init', () => {
    test('does nothing when statsSection is missing', () => {
      expect(() => Stats.init()).not.toThrow();
    });

    test('does nothing when section has no cards', () => {
      const section = document.createElement('div');
      section.id = 'statsSection';
      document.body.appendChild(section);
      expect(() => Stats.init()).not.toThrow();
    });

    test('falls back to immediate animation when IntersectionObserver is unavailable', () => {
      const origIO = global.IntersectionObserver;
      delete global.IntersectionObserver;
      global.prefersReducedMotion = true;

      createStatsSection([{ target: 42 }]);
      Stats.init();

      const card = document.querySelector('.stat-card');
      expect(card.querySelector('.stat-number').textContent).toBe('42');
      expect(card.classList.contains('animated')).toBe(true);

      if (origIO) global.IntersectionObserver = origIO;
    });
  });

  describe('reset', () => {
    test('cancels in-flight animations and resets text to 0', () => {
      createStatsSection([{ target: 500, suffix: '+' }]);
      const card = document.querySelector('.stat-card');
      card.classList.add('animated');
      card.querySelector('.stat-number').textContent = '500+';

      Stats.reset();

      expect(card.classList.contains('animated')).toBe(false);
      expect(card.querySelector('.stat-number').textContent).toBe('0');
    });
  });
});
