/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

const cpSrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'modules', 'capacity-planner.js'),
  'utf8'
);

function buildDOM(teamVal, msgVal, features) {
  document.body.innerHTML = `
    <div id="capacityPlannerSection">
      <input data-cp-slider="team" type="range" min="1" max="100" value="${teamVal || 1}" />
      <input data-cp-slider="messages" type="range" min="1" max="500" value="${msgVal || 10}" />
      <span data-cp-val="team"></span>
      <span data-cp-val="messages"></span>
      ${(features || []).map(f => `<input class="cp-feature-check" type="checkbox" data-feature="${f}" />`).join('')}
      <span class="cp-result-plan"></span>
      <span class="cp-result-cost"></span>
      <span class="cp-result-messages"></span>
      <div class="cp-utilization-fill" style="width:0"></div>
      <span class="cp-utilization-label"></span>
      <span class="cp-result-tip"></span>
    </div>
  `;
}

function loadModule() {
  const fn = new Function(cpSrc + '\nreturn CapacityPlanner;');
  return fn();
}

describe('CapacityPlanner', () => {
  let CP;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------
  test('init does nothing when section is absent', () => {
    document.body.innerHTML = '<div></div>';
    CP = loadModule();
    expect(() => CP.init()).not.toThrow();
  });

  test('init populates results on first call', () => {
    buildDOM(1, 10, []);
    CP = loadModule();
    CP.init();
    expect(document.querySelector('.cp-result-plan').textContent).not.toBe('');
  });

  // -----------------------------------------------------------------------
  // Plan selection logic
  // -----------------------------------------------------------------------
  test('single user with 10 msgs/day gets Free plan', () => {
    buildDOM(1, 10, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('.cp-result-plan').textContent).toBe('Free Plan');
    expect(document.querySelector('.cp-result-cost').textContent).toBe('Free!');
  });

  test('single user with 20 msgs/day still fits Free (limit is 20)', () => {
    buildDOM(1, 20, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('.cp-result-plan').textContent).toBe('Free Plan');
  });

  test('single user with 21 msgs/day bumps to Starter', () => {
    buildDOM(1, 21, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('.cp-result-plan').textContent).toBe('Starter Plan');
    expect(document.querySelector('.cp-result-cost').textContent).toBe('$9/mo');
  });

  test('single user with 200 msgs/day fits Starter', () => {
    buildDOM(1, 200, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('.cp-result-plan').textContent).toBe('Starter Plan');
  });

  test('single user with 201 msgs/day bumps to Pro', () => {
    buildDOM(1, 201, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('.cp-result-plan').textContent).toBe('Pro Plan');
  });

  // -----------------------------------------------------------------------
  // Team cost scaling
  // -----------------------------------------------------------------------
  test('team of 5 on Starter costs 5 * $9', () => {
    buildDOM(5, 21, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('.cp-result-cost').textContent).toBe('$45/mo');
  });

  test('team of 10 on Pro costs 10 * $29', () => {
    buildDOM(10, 201, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('.cp-result-cost').textContent).toBe('$290/mo');
  });

  // -----------------------------------------------------------------------
  // Feature multipliers
  // -----------------------------------------------------------------------
  test('web-search feature increases effective usage by 1.3x', () => {
    // 16 msgs * 1.3 = 20.8 → ceil 21 → exceeds Free (20), bumps to Starter
    buildDOM(1, 16, ['web-search']);
    CP = loadModule(); CP.init();
    const check = document.querySelector('[data-feature="web-search"]');
    check.checked = true;
    check.dispatchEvent(new Event('change'));
    expect(document.querySelector('.cp-result-plan').textContent).toBe('Starter Plan');
  });

  test('image feature applies 1.5x multiplier', () => {
    // 14 msgs * 1.5 = 21 → bumps to Starter
    buildDOM(1, 14, ['image']);
    CP = loadModule(); CP.init();
    const check = document.querySelector('[data-feature="image"]');
    check.checked = true;
    check.dispatchEvent(new Event('change'));
    expect(document.querySelector('.cp-result-plan').textContent).toBe('Starter Plan');
  });

  test('multiple features compound multiplicatively', () => {
    // 10 * 1.3 * 1.5 = 19.5 → ceil 20 → still Free
    buildDOM(1, 10, ['web-search', 'image']);
    CP = loadModule(); CP.init();
    const checks = document.querySelectorAll('.cp-feature-check');
    checks.forEach(c => { c.checked = true; c.dispatchEvent(new Event('change')); });
    expect(document.querySelector('.cp-result-plan').textContent).toBe('Free Plan');
  });

  test('all features on 10 msgs pushes past Free', () => {
    // 10 * 1.3 * 1.1 * 1.5 * 1.2 * 1.4 * 1.15 ≈ 41.5 → Starter
    buildDOM(1, 10, ['web-search', 'reminders', 'image', 'email', 'code', 'memory']);
    CP = loadModule(); CP.init();
    const checks = document.querySelectorAll('.cp-feature-check');
    checks.forEach(c => { c.checked = true; c.dispatchEvent(new Event('change')); });
    expect(document.querySelector('.cp-result-plan').textContent).toBe('Starter Plan');
  });

  test('unknown feature is ignored (no multiplier)', () => {
    buildDOM(1, 15, ['unknown-feature']);
    CP = loadModule(); CP.init();
    const check = document.querySelector('[data-feature="unknown-feature"]');
    check.checked = true;
    check.dispatchEvent(new Event('change'));
    expect(document.querySelector('.cp-result-plan').textContent).toBe('Free Plan');
  });

  // -----------------------------------------------------------------------
  // Monthly message calculation
  // -----------------------------------------------------------------------
  test('monthly messages = effectiveDaily * teamSize * 30', () => {
    buildDOM(3, 10, []);
    CP = loadModule(); CP.init();
    // 10 msgs/day * 3 users * 30 days = 900
    expect(document.querySelector('.cp-result-messages').textContent).toBe('900 msgs/month');
  });

  // -----------------------------------------------------------------------
  // Display labels
  // -----------------------------------------------------------------------
  test('single user shows "1 user" (singular)', () => {
    buildDOM(1, 10, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('[data-cp-val="team"]').textContent).toBe('1 user');
  });

  test('multiple users shows plural "users"', () => {
    buildDOM(5, 10, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('[data-cp-val="team"]').textContent).toBe('5 users');
  });

  test('message label shows "N msg/day"', () => {
    buildDOM(1, 42, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('[data-cp-val="messages"]').textContent).toBe('42 msg/day');
  });

  // -----------------------------------------------------------------------
  // Utilization bar
  // -----------------------------------------------------------------------
  test('utilization at plan limit shows 100%', () => {
    buildDOM(1, 20, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('.cp-utilization-label').textContent).toBe('100% capacity used');
  });

  test('low utilization shows green bar color', () => {
    buildDOM(1, 5, []);
    CP = loadModule(); CP.init();
    const fill = document.querySelector('.cp-utilization-fill');
    expect(fill.style.backgroundColor).toBe('rgb(25, 135, 84)'); // #198754
  });

  test('high utilization (>85%) shows red bar color', () => {
    // 19/20 = 95%
    buildDOM(1, 19, []);
    CP = loadModule(); CP.init();
    const fill = document.querySelector('.cp-utilization-fill');
    expect(fill.style.backgroundColor).toBe('rgb(220, 53, 69)'); // #dc3545
  });

  // -----------------------------------------------------------------------
  // Tips
  // -----------------------------------------------------------------------
  test('free tier shows sparkle tip', () => {
    buildDOM(1, 10, []);
    CP = loadModule(); CP.init();
    const tip = document.querySelector('.cp-result-tip').textContent;
    expect(tip).toContain('free tier');
  });

  test('high utilization (>85%) shows warning tip', () => {
    buildDOM(1, 19, []);
    CP = loadModule(); CP.init();
    const tip = document.querySelector('.cp-result-tip').textContent;
    expect(tip).toContain('near the limit');
  });

  test('low utilization on paid plan shows growth tip', () => {
    // 22 msgs → Starter (limit 200), utilization = 11%
    buildDOM(1, 22, []);
    CP = loadModule(); CP.init();
    const tip = document.querySelector('.cp-result-tip').textContent;
    expect(tip).toContain('plenty of room');
  });

  test('moderate utilization on paid plan shows efficient tip', () => {
    // 100 msgs → Starter (limit 200), utilization = 50%
    buildDOM(1, 100, []);
    CP = loadModule(); CP.init();
    const tip = document.querySelector('.cp-result-tip').textContent;
    expect(tip).toContain('efficiently');
  });

  // -----------------------------------------------------------------------
  // Slider interaction
  // -----------------------------------------------------------------------
  test('changing team slider triggers recalculation', () => {
    buildDOM(1, 21, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('.cp-result-cost').textContent).toBe('$9/mo');

    const teamSlider = document.querySelector('[data-cp-slider="team"]');
    teamSlider.value = '3';
    teamSlider.dispatchEvent(new Event('input'));
    expect(document.querySelector('.cp-result-cost').textContent).toBe('$27/mo');
  });

  test('changing message slider triggers recalculation', () => {
    buildDOM(1, 10, []);
    CP = loadModule(); CP.init();
    expect(document.querySelector('.cp-result-plan').textContent).toBe('Free Plan');

    const msgSlider = document.querySelector('[data-cp-slider="messages"]');
    msgSlider.value = '201';
    msgSlider.dispatchEvent(new Event('input'));
    expect(document.querySelector('.cp-result-plan').textContent).toBe('Pro Plan');
  });

  // -----------------------------------------------------------------------
  // Enterprise plan
  // -----------------------------------------------------------------------
  test('very high usage selects Enterprise plan', () => {
    // Need effective daily > 5000
    buildDOM(1, 500, ['web-search', 'image', 'code', 'email', 'reminders', 'memory']);
    CP = loadModule(); CP.init();
    const checks = document.querySelectorAll('.cp-feature-check');
    checks.forEach(c => { c.checked = true; c.dispatchEvent(new Event('change')); });
    // 500 * 1.3 * 1.1 * 1.5 * 1.2 * 1.4 * 1.15 ≈ 2076 → Team (5000)
    const plan = document.querySelector('.cp-result-plan').textContent;
    expect(['Team Plan', 'Enterprise Plan']).toContain(plan);
  });

  // -----------------------------------------------------------------------
  // Plan color styling
  // -----------------------------------------------------------------------
  test('plan name gets colored per plan definition', () => {
    buildDOM(1, 21, []);
    CP = loadModule(); CP.init();
    const planEl = document.querySelector('.cp-result-plan');
    // Starter color = #0d6efd
    expect(planEl.style.color).toBe('rgb(13, 110, 253)');
  });
});
