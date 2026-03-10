/**
 * @jest-environment jsdom
 */
'use strict';

describe('PrivacyDashboard', function () {
  var PD;

  function buildDOM() {
    document.body.innerHTML = [
      '<div class="privacy-dash-section" id="privacyDashSection">',
      '  <svg viewBox="0 0 120 120">',
      '    <circle cx="60" cy="60" r="52" class="privacy-dash-fill" id="privacyScoreFill" stroke-dasharray="326.73" stroke-dashoffset="0"/>',
      '  </svg>',
      '  <span class="privacy-dash-score-num" id="privacyScoreNum">0</span>',
      '  <span class="privacy-dash-score-unit">/ 100</span>',
      '  <p class="privacy-dash-grade" id="privacyGrade"></p>',
      '  <div class="privacy-dash-grid" id="privacyGrid" role="list"></div>',
      '</div>'
    ].join('\n');
  }

  beforeEach(function () {
    localStorage.clear();
    buildDOM();
    jest.resetModules();
    require('../app.js');
    PD = window.PrivacyDashboard;
    PD.init();
  });

  afterEach(function () { document.body.innerHTML = ''; });

  test('init renders all data item cards', function () {
    expect(document.querySelectorAll('.privacy-dash-card').length).toBe(PD.DATA_ITEMS.length);
  });

  test('each card has a valid data-status', function () {
    document.querySelectorAll('.privacy-dash-card').forEach(function (c) {
      expect(['none', 'optional', 'required']).toContain(c.dataset.status);
    });
  });

  test('none cards show Never collected', function () {
    var nc = document.querySelectorAll('[data-status="none"]');
    expect(nc.length).toBeGreaterThan(0);
    nc.forEach(function (c) { expect(c.querySelector('.privacy-dash-badge-none').textContent).toBe('Never collected'); });
  });

  test('required cards show Required', function () {
    var rc = document.querySelectorAll('[data-status="required"]');
    expect(rc.length).toBeGreaterThan(0);
    rc.forEach(function (c) { expect(c.querySelector('.privacy-dash-badge-required').textContent).toBe('Required'); });
  });

  test('optional cards have toggles', function () {
    var oc = document.querySelectorAll('[data-status="optional"]');
    expect(oc.length).toBeGreaterThan(0);
    oc.forEach(function (c) { expect(c.querySelector('.privacy-dash-toggle input[type="checkbox"]')).not.toBeNull(); });
  });

  test('non-optional cards lack toggles', function () {
    document.querySelectorAll('[data-status="none"], [data-status="required"]').forEach(function (c) {
      expect(c.querySelector('.privacy-dash-toggle')).toBeNull();
    });
  });

  test('score is 60-100', function () {
    var v = parseInt(document.getElementById('privacyScoreNum').textContent, 10);
    expect(v).toBeGreaterThanOrEqual(60); expect(v).toBeLessThanOrEqual(100);
  });

  test('grade text valid', function () {
    expect(['Excellent', 'Good', 'Fair', 'Needs review']).toContain(document.getElementById('privacyGrade').textContent);
  });

  test('SVG offset in range', function () {
    var o = parseFloat(document.getElementById('privacyScoreFill').getAttribute('stroke-dashoffset'));
    expect(o).toBeGreaterThanOrEqual(0); expect(o).toBeLessThanOrEqual(326.73);
  });

  test('toggle OFF raises score', function () {
    var before = PD.calcScore();
    document.querySelectorAll('.privacy-dash-toggle input').forEach(function (t) {
      if (t.checked) { t.checked = false; t.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    expect(PD.calcScore()).toBeGreaterThanOrEqual(before);
  });

  test('toggle ON lowers score', function () {
    var tg = document.querySelectorAll('.privacy-dash-toggle input');
    tg.forEach(function (t) { t.checked = false; t.dispatchEvent(new Event('change', { bubbles: true })); });
    var off = PD.calcScore();
    tg.forEach(function (t) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(PD.calcScore()).toBeLessThanOrEqual(off);
  });

  test('prefs persist to localStorage', function () {
    var t = document.querySelector('.privacy-dash-toggle input');
    t.checked = !t.checked; t.dispatchEvent(new Event('change', { bubbles: true }));
    expect(JSON.parse(localStorage.getItem('agentbox_privacy_prefs'))).toBeTruthy();
  });

  test('prefs restore on re-init', function () {
    document.querySelectorAll('.privacy-dash-toggle input').forEach(function (t) {
      t.checked = false; t.dispatchEvent(new Event('change', { bubbles: true }));
    });
    var saved = localStorage.getItem('agentbox_privacy_prefs');
    document.getElementById('privacyGrid').innerHTML = '';
    jest.resetModules(); require('../app.js'); PD = window.PrivacyDashboard; PD.init();
    expect(localStorage.getItem('agentbox_privacy_prefs')).toEqual(saved);
  });

  test('cards have role=listitem', function () {
    document.querySelectorAll('.privacy-dash-card').forEach(function (c) { expect(c.getAttribute('role')).toBe('listitem'); });
  });

  test('toggles have aria-label', function () {
    document.querySelectorAll('.privacy-dash-toggle input').forEach(function (t) { expect(t.getAttribute('aria-label')).toMatch(/^Toggle /); });
  });

  test('cards have data-testid', function () {
    document.querySelectorAll('.privacy-dash-card').forEach(function (c) { expect(c.dataset.testid).toMatch(/^privacy-card-/); });
  });

  test('DATA_ITEMS have required fields', function () {
    PD.DATA_ITEMS.forEach(function (i) {
      expect(i.id).toBeTruthy(); expect(i.title).toBeTruthy(); expect(i.desc).toBeTruthy();
      expect(['none', 'optional', 'required']).toContain(i.status);
    });
  });

  test('score caps at 100', function () {
    document.querySelectorAll('.privacy-dash-toggle input').forEach(function (t) { t.checked = false; t.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(PD.calcScore()).toBeLessThanOrEqual(100);
  });

  test('score floor at 70', function () {
    document.querySelectorAll('.privacy-dash-toggle input').forEach(function (t) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(PD.calcScore()).toBeGreaterThanOrEqual(70);
  });

  test('fill stroke is valid hex', function () {
    expect(document.getElementById('privacyScoreFill').getAttribute('stroke')).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test('location is none', function () { expect(document.querySelector('[data-testid="privacy-card-location"]').dataset.status).toBe('none'); });
  test('biometrics is none', function () { expect(document.querySelector('[data-testid="privacy-card-biometrics"]').dataset.status).toBe('none'); });
  test('chat_history is required', function () { expect(document.querySelector('[data-testid="privacy-card-chat_history"]').dataset.status).toBe('required'); });
  test('grid has role=list', function () { expect(document.getElementById('privacyGrid').getAttribute('role')).toBe('list'); });

  test('no crash when section missing', function () {
    document.body.innerHTML = ''; jest.resetModules(); require('../app.js');
    expect(function () { window.PrivacyDashboard.init(); }).not.toThrow();
  });

  test('score UI updates on toggle', function () {
    var n = document.getElementById('privacyScoreNum');
    var t = document.querySelector('.privacy-dash-toggle input');
    if (t) { t.checked = !t.checked; t.dispatchEvent(new Event('change', { bubbles: true })); }
    expect(parseInt(n.textContent, 10)).not.toBeNaN();
  });

  test('_getStates has optional keys', function () {
    var s = PD._getStates();
    PD.DATA_ITEMS.filter(function (i) { return i.status === 'optional'; }).forEach(function (i) { expect(i.id in s).toBe(true); });
  });
});
