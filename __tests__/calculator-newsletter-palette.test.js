/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Polyfills
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = function (cb) { return setTimeout(cb, 0); };
}
if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = function (id) { clearTimeout(id); };
}
if (!window.IntersectionObserver) {
  window.IntersectionObserver = function () {
    return { observe: function () {}, disconnect: function () {} };
  };
}
if (!window.matchMedia) {
  window.matchMedia = function () {
    return { matches: false, addEventListener: function () {} };
  };
}

function loadApp() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
  document.documentElement.innerHTML = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
  (0, eval)(src);
}

describe('Calculator module - init and DOM', () => {
  beforeEach(() => { loadApp(); });

  test('Calculator object is exposed on window', () => {
    expect(window.Calculator).toBeDefined();
    expect(typeof window.Calculator.init).toBe('function');
    expect(typeof window.Calculator.update).toBe('function');
    expect(typeof window.Calculator.getTotal).toBe('function');
  });

  test('calculatorSection exists in HTML', () => {
    const section = document.getElementById('calculatorSection');
    expect(section).not.toBeNull();
  });

  test('slider groups exist with data-minutes attributes', () => {
    const groups = document.querySelectorAll('.calc-slider-group');
    expect(groups.length).toBeGreaterThanOrEqual(1);
    for (const group of groups) {
      expect(group.dataset.minutes).toBeDefined();
      expect(parseInt(group.dataset.minutes, 10)).toBeGreaterThan(0);
    }
  });

  test('result elements exist', () => {
    expect(document.getElementById('calcWeekly')).not.toBeNull();
    expect(document.getElementById('calcMonthly')).not.toBeNull();
    expect(document.getElementById('calcYearly')).not.toBeNull();
    expect(document.getElementById('calcEquivalent')).not.toBeNull();
  });

  test('sliders have range input type', () => {
    const sliders = document.querySelectorAll('.calc-range');
    expect(sliders.length).toBeGreaterThanOrEqual(1);
    for (const slider of sliders) {
      expect(slider.type).toBe('range');
    }
  });
});

describe('Calculator module - calculations', () => {
  beforeEach(() => {
    loadApp();
    window.Calculator.init();
  });

  test('initial state shows zero when all sliders at 0', () => {
    const sliders = document.querySelectorAll('.calc-range');
    for (const slider of sliders) {
      slider.value = '0';
    }
    window.Calculator.update();
    expect(window.Calculator.getTotal()).toBe(0);
  });

  test('getTotal returns numeric value', () => {
    const total = window.Calculator.getTotal();
    expect(typeof total).toBe('number');
    expect(isNaN(total)).toBe(false);
  });

  test('moving slider up increases weekly minutes', () => {
    const sliders = document.querySelectorAll('.calc-range');
    // Set all to 0 first
    for (const slider of sliders) slider.value = '0';
    window.Calculator.update();
    const before = window.Calculator.getTotal();

    // Set first slider to max
    if (sliders.length > 0) {
      sliders[0].value = sliders[0].max || '10';
      window.Calculator.update();
      expect(window.Calculator.getTotal()).toBeGreaterThan(before);
    }
  });

  test('weekly minutes updates in DOM', () => {
    const sliders = document.querySelectorAll('.calc-range');
    for (const slider of sliders) slider.value = '5';
    window.Calculator.update();
    const weeklyEl = document.getElementById('calcWeekly');
    const value = parseInt(weeklyEl.textContent, 10);
    expect(value).toBeGreaterThan(0);
  });

  test('monthly hours is derived from weekly minutes', () => {
    const sliders = document.querySelectorAll('.calc-range');
    for (const slider of sliders) slider.value = '5';
    window.Calculator.update();

    const weekly = parseInt(document.getElementById('calcWeekly').textContent, 10);
    const monthly = parseFloat(document.getElementById('calcMonthly').textContent);
    // Monthly should be roughly weekly * 4.33 / 60
    const expected = (weekly * 4.33) / 60;
    expect(Math.abs(monthly - expected)).toBeLessThan(1);
  });

  test('yearly hours is derived from weekly minutes', () => {
    const sliders = document.querySelectorAll('.calc-range');
    for (const slider of sliders) slider.value = '5';
    window.Calculator.update();

    const weekly = parseInt(document.getElementById('calcWeekly').textContent, 10);
    const yearly = parseInt(document.getElementById('calcYearly').textContent, 10);
    const expected = Math.round((weekly * 52) / 60);
    expect(Math.abs(yearly - expected)).toBeLessThanOrEqual(1);
  });

  test('equivalent message shows for zero usage', () => {
    const sliders = document.querySelectorAll('.calc-range');
    for (const slider of sliders) slider.value = '0';
    window.Calculator.update();

    const equiv = document.getElementById('calcEquivalent');
    expect(equiv.textContent).toContain('Move the sliders');
  });

  test('equivalent message shows hours for small values', () => {
    const sliders = document.querySelectorAll('.calc-range');
    // Set only first slider to 1, keep rest at 0
    for (const slider of sliders) slider.value = '0';
    if (sliders.length > 0) sliders[0].value = '1';
    window.Calculator.update();

    const yearly = parseInt(document.getElementById('calcYearly').textContent, 10);
    const equiv = document.getElementById('calcEquivalent');
    if (yearly > 0 && yearly < 8) {
      expect(equiv.textContent).toContain('hours');
    }
  });

  test('equivalent message shows workdays for large values', () => {
    const sliders = document.querySelectorAll('.calc-range');
    // Max out all sliders
    for (const slider of sliders) {
      slider.value = slider.max || '50';
    }
    window.Calculator.update();

    const yearly = parseInt(document.getElementById('calcYearly').textContent, 10);
    const equiv = document.getElementById('calcEquivalent');
    if (yearly >= 8) {
      expect(equiv.textContent).toContain('workdays');
    }
  });

  test('slider value display updates', () => {
    const groups = document.querySelectorAll('.calc-slider-group');
    if (groups.length === 0) return;

    const slider = groups[0].querySelector('.calc-range');
    const valueEl = groups[0].querySelector('.calc-slider-value');
    slider.value = '7';
    window.Calculator.update();

    expect(valueEl.textContent).toContain('7');
    expect(valueEl.textContent).toContain('/week');
  });
});

describe('Calculator module - edge cases', () => {
  beforeEach(() => {
    loadApp();
    window.Calculator.init();
  });

  test('handles NaN slider values gracefully', () => {
    const sliders = document.querySelectorAll('.calc-range');
    if (sliders.length > 0) {
      sliders[0].value = 'abc';
      expect(() => window.Calculator.update()).not.toThrow();
    }
  });

  test('handles missing data-minutes attribute gracefully', () => {
    const groups = document.querySelectorAll('.calc-slider-group');
    if (groups.length > 0) {
      const original = groups[0].dataset.minutes;
      delete groups[0].dataset.minutes;
      expect(() => window.Calculator.update()).not.toThrow();
      groups[0].dataset.minutes = original;
    }
  });

  test('multiple rapid updates do not crash', () => {
    const sliders = document.querySelectorAll('.calc-range');
    for (let i = 0; i < 50; i++) {
      for (const slider of sliders) {
        slider.value = String(i % 20);
      }
      window.Calculator.update();
    }
    // Should complete without throwing
    expect(window.Calculator.getTotal()).toBeGreaterThanOrEqual(0);
  });

  test('getTotal returns 0 when calcWeekly element missing', () => {
    // Remove the weekly display element
    const weeklyEl = document.getElementById('calcWeekly');
    if (weeklyEl) weeklyEl.remove();

    // getTotal should return 0 gracefully
    expect(window.Calculator.getTotal()).toBe(0);
  });
});

describe('Newsletter module', () => {
  beforeEach(() => { loadApp(); });

  test('Newsletter object is exposed on window', () => {
    expect(window.Newsletter).toBeDefined();
    expect(typeof window.Newsletter.getSubscribers).toBe('function');
  });

  test('getSubscribers returns array', () => {
    const subs = window.Newsletter.getSubscribers();
    expect(Array.isArray(subs)).toBe(true);
  });

  test('getSubscribers returns empty array when no data', () => {
    localStorage.removeItem('agentbox_newsletter');
    const subs = window.Newsletter.getSubscribers();
    expect(subs).toEqual([]);
  });

  test('getSubscribers validates stored data is array', () => {
    localStorage.setItem('agentbox_newsletter', '"not-an-array"');
    const subs = window.Newsletter.getSubscribers();
    expect(subs).toEqual([]);
  });

  test('getSubscribers filters non-string elements', () => {
    localStorage.setItem('agentbox_newsletter', '["valid@test.com", 42, null, "also@valid.com"]');
    const subs = window.Newsletter.getSubscribers();
    expect(subs).toEqual(['valid@test.com', 'also@valid.com']);
  });

  test('getSubscribers handles corrupted JSON', () => {
    localStorage.setItem('agentbox_newsletter', '{broken');
    const subs = window.Newsletter.getSubscribers();
    expect(subs).toEqual([]);
  });

  test('newsletter form exists', () => {
    expect(document.getElementById('newsletterForm')).not.toBeNull();
    expect(document.getElementById('newsletterEmail')).not.toBeNull();
    expect(document.getElementById('newsletterBtn')).not.toBeNull();
  });

  test('email input has correct type', () => {
    const input = document.getElementById('newsletterEmail');
    expect(input.type).toBe('email');
  });

  test('form submit with empty email shows error', () => {
    window.Newsletter.init();
    const form = document.getElementById('newsletterForm');
    const input = document.getElementById('newsletterEmail');
    input.value = '';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const status = document.getElementById('newsletterStatus');
    expect(status.textContent).toContain('valid email');
    expect(status.className).toContain('error');
  });

  test('form submit with invalid email shows error', () => {
    window.Newsletter.init();
    const form = document.getElementById('newsletterForm');
    const input = document.getElementById('newsletterEmail');
    input.value = 'notanemail';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const status = document.getElementById('newsletterStatus');
    expect(status.textContent).toContain('valid email');
  });
});

describe('CommandPalette module', () => {
  beforeEach(() => { loadApp(); });

  test('CommandPalette overlay exists', () => {
    expect(document.getElementById('cmdPaletteOverlay')).not.toBeNull();
    expect(document.getElementById('cmdPaletteInput')).not.toBeNull();
    expect(document.getElementById('cmdPaletteResults')).not.toBeNull();
  });

  test('overlay is hidden by default', () => {
    const overlay = document.getElementById('cmdPaletteOverlay');
    expect(overlay.hidden).toBe(true);
  });

  test('Ctrl+K opens command palette', () => {
    window.CommandPalette.init();
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'k', ctrlKey: true, bubbles: true
    }));
    const overlay = document.getElementById('cmdPaletteOverlay');
    expect(overlay.hidden).toBe(false);
  });

  test('Escape closes command palette', () => {
    window.CommandPalette.init();
    // Open it first
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'k', ctrlKey: true, bubbles: true
    }));
    // Close it
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true
    }));
    const overlay = document.getElementById('cmdPaletteOverlay');
    expect(overlay.hidden).toBe(true);
  });

  test('results list contains items after init', () => {
    window.CommandPalette.init();
    const results = document.getElementById('cmdPaletteResults');
    expect(results.children.length).toBeGreaterThan(0);
  });

  test('filtering reduces visible items', () => {
    window.CommandPalette.init();
    // Open palette
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'k', ctrlKey: true, bubbles: true
    }));
    // Type a search query
    const input = document.getElementById('cmdPaletteInput');
    input.value = 'pricing';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const results = document.getElementById('cmdPaletteResults');
    let visibleCount = 0;
    for (let i = 0; i < results.children.length; i++) {
      if (!results.children[i].hidden) visibleCount++;
    }
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThan(results.children.length);
  });

  test('items have correct ARIA attributes', () => {
    window.CommandPalette.init();
    const results = document.getElementById('cmdPaletteResults');
    const items = results.querySelectorAll('.cmd-palette-item');
    for (const item of items) {
      expect(item.getAttribute('role')).toBe('option');
    }
  });
});

