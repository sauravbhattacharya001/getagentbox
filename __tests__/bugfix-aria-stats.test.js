/**
 * @jest-environment jsdom
 */
'use strict';

const AgentBoxComponents = require('../src/index');

describe('Pricing aria-pressed state', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button class="billing-toggle" aria-pressed="false"></button>
      <div class="pricing-card" data-monthly="29" data-yearly="24">
        <span class="price-value">$29</span>
        <span class="price-period">/month</span>
      </div>
    `;
    AgentBoxComponents.Pricing._isYearly = false;
  });

  test('toggle sets aria-pressed to true when switching to yearly', () => {
    AgentBoxComponents.Pricing.toggle();
    const toggle = document.querySelector('.billing-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(AgentBoxComponents.Pricing.isYearly()).toBe(true);
  });

  test('toggle sets aria-pressed back to false when switching to monthly', () => {
    AgentBoxComponents.Pricing.toggle(); // yearly
    AgentBoxComponents.Pricing.toggle(); // monthly
    const toggle = document.querySelector('.billing-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(AgentBoxComponents.Pricing.isYearly()).toBe(false);
  });

  test('price values update correctly on toggle', () => {
    AgentBoxComponents.Pricing.toggle();
    expect(document.querySelector('.price-value').textContent).toBe('$24');
    expect(document.querySelector('.price-period').textContent).toBe('/month (billed yearly)');
  });
});

describe('Stats._ease curve', () => {
  test('ease(0) returns 0', () => {
    expect(AgentBoxComponents.Stats._ease(0)).toBe(0);
  });

  test('ease(1) returns 1', () => {
    expect(AgentBoxComponents.Stats._ease(1)).toBe(1);
  });

  test('ease(0.5) is greater than 0.5 (ease-out)', () => {
    expect(AgentBoxComponents.Stats._ease(0.5)).toBeGreaterThan(0.5);
  });

  test('ease is monotonically increasing', () => {
    let prev = 0;
    for (let t = 0.1; t <= 1.0; t += 0.1) {
      const val = AgentBoxComponents.Stats._ease(t);
      expect(val).toBeGreaterThan(prev);
      prev = val;
    }
  });
});

describe('Stats._animateSingle with non-browser env', () => {
  test('sets final value immediately when no requestAnimationFrame', () => {
    const origRAF = global.requestAnimationFrame;
    delete global.requestAnimationFrame;

    document.body.innerHTML = '<div data-count="1500"><span class="stat-number"></span></div>';
    const el = document.querySelector('[data-count]');
    AgentBoxComponents.Stats._animateSingle(el, 2000);
    expect(el.querySelector('.stat-number').textContent).toBe('1,500');

    global.requestAnimationFrame = origRAF;
  });

  test('handles NaN data-count gracefully', () => {
    document.body.innerHTML = '<div data-count="abc"><span class="stat-number"></span></div>';
    const el = document.querySelector('[data-count]');
    // Should not throw
    AgentBoxComponents.Stats._animateSingle(el, 2000);
    expect(el.querySelector('.stat-number').textContent).toBe('');
  });
});

describe('Feedback.compute edge cases', () => {
  test('filters out NaN scores', () => {
    const entries = [
      { score: 9 },
      { score: NaN },
      { score: 7 },
    ];
    const result = AgentBoxComponents.Feedback.compute(entries);
    expect(result.count).toBe(2);
    expect(result.promoters).toBe(1);
    expect(result.passives).toBe(1);
    expect(result.detractors).toBe(0);
  });

  test('filters out Infinity scores', () => {
    const entries = [{ score: Infinity }, { score: -Infinity }, { score: 5 }];
    const result = AgentBoxComponents.Feedback.compute(entries);
    expect(result.count).toBe(1);
    expect(result.detractors).toBe(1);
  });

  test('filters out out-of-range scores', () => {
    const entries = [{ score: -1 }, { score: 11 }, { score: 10 }];
    const result = AgentBoxComponents.Feedback.compute(entries);
    expect(result.count).toBe(1);
    expect(result.promoters).toBe(1);
  });

  test('NPS calculation: all promoters = 100', () => {
    const entries = [{ score: 10 }, { score: 9 }, { score: 10 }];
    const result = AgentBoxComponents.Feedback.compute(entries);
    expect(result.nps).toBe(100);
  });

  test('NPS calculation: all detractors = -100', () => {
    const entries = [{ score: 0 }, { score: 3 }, { score: 6 }];
    const result = AgentBoxComponents.Feedback.compute(entries);
    expect(result.nps).toBe(-100);
  });

  test('classify returns correct categories', () => {
    expect(AgentBoxComponents.Feedback.classify(0)).toBe('detractor');
    expect(AgentBoxComponents.Feedback.classify(6)).toBe('detractor');
    expect(AgentBoxComponents.Feedback.classify(7)).toBe('passive');
    expect(AgentBoxComponents.Feedback.classify(8)).toBe('passive');
    expect(AgentBoxComponents.Feedback.classify(9)).toBe('promoter');
    expect(AgentBoxComponents.Feedback.classify(10)).toBe('promoter');
  });
});
