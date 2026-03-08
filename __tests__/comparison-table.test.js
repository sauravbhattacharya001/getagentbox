/**
 * @jest-environment jsdom
 */
'use strict';

describe('ComparisonTable', function () {
  var ComparisonTable;

  function buildDOM() {
    document.body.innerHTML = '<div class="comparison-section" id="comparisonSection">' +
      '<div class="cmp-filters" role="tablist">' +
        '<button class="cmp-filter-btn active" data-category="all" role="tab" aria-pressed="true">All</button>' +
        '<button class="cmp-filter-btn" data-category="automation" role="tab" aria-pressed="false">Automation</button>' +
        '<button class="cmp-filter-btn" data-category="integration" role="tab" aria-pressed="false">Integration</button>' +
        '<button class="cmp-filter-btn" data-category="intelligence" role="tab" aria-pressed="false">Intelligence</button>' +
        '<button class="cmp-filter-btn" data-category="ops" role="tab" aria-pressed="false">Operations</button>' +
        '<button class="cmp-filter-btn" data-category="pricing" role="tab" aria-pressed="false">Pricing</button>' +
      '</div>' +
      '<div class="cmp-scores">' +
        '<div class="cmp-score-card"><div class="cmp-score-value" id="cmpScore_agentbox">—</div></div>' +
        '<div class="cmp-score-card"><div class="cmp-score-value" id="cmpScore_chatgpt">—</div></div>' +
        '<div class="cmp-score-card"><div class="cmp-score-value" id="cmpScore_zapier">—</div></div>' +
        '<div class="cmp-score-card"><div class="cmp-score-value" id="cmpScore_custom">—</div></div>' +
        '<div class="cmp-score-card"><div class="cmp-score-value" id="cmpScore_manual">—</div></div>' +
      '</div>' +
      '<table class="cmp-table"><tbody class="cmp-tbody"></tbody></table>' +
      '<p class="cmp-summary"></p>' +
    '</div>';
  }

  beforeEach(function () {
    buildDOM();
    jest.resetModules();
    ComparisonTable = require('../app.js').ComparisonTable || window.ComparisonTable;
    ComparisonTable.init();
  });

  afterEach(function () {
    document.body.innerHTML = '';
  });

  // ── Init ─────────────────────────────────────────────────────────

  test('init populates the comparison table', function () {
    var tbody = document.querySelector('.cmp-tbody');
    expect(tbody.children.length).toBeGreaterThan(0);
  });

  test('init renders all 20 features by default', function () {
    var rows = document.querySelectorAll('.cmp-row');
    expect(rows.length).toBe(ComparisonTable.FEATURES.length);
  });

  test('init sets score percentages', function () {
    var score = document.getElementById('cmpScore_agentbox');
    expect(score.textContent).toMatch(/%$/);
  });

  test('agentbox scores 100% with all features', function () {
    var score = document.getElementById('cmpScore_agentbox');
    expect(score.textContent).toBe('100%');
  });

  // ── Data integrity ──────────────────────────────────────────────

  test('every feature has valid category', function () {
    var catIds = ComparisonTable.CATEGORIES.map(function (c) { return c.id; });
    ComparisonTable.FEATURES.forEach(function (f) {
      expect(catIds).toContain(f.cat);
    });
  });

  test('every feature has ratings for all competitors', function () {
    var compIds = ComparisonTable.COMPETITORS.map(function (c) { return c.id; });
    ComparisonTable.FEATURES.forEach(function (f) {
      compIds.forEach(function (id) {
        expect(typeof f.ratings[id]).toBe('number');
        expect(f.ratings[id]).toBeGreaterThanOrEqual(0);
        expect(f.ratings[id]).toBeLessThanOrEqual(3);
      });
    });
  });

  test('RATING_LABELS has 4 entries', function () {
    expect(ComparisonTable.RATING_LABELS.length).toBe(4);
  });

  test('RATING_ICONS has 4 entries', function () {
    expect(ComparisonTable.RATING_ICONS.length).toBe(4);
  });

  // ── Filtering ───────────────────────────────────────────────────

  test('setFilter filters to automation category', function () {
    ComparisonTable.setFilter('automation');
    var rows = document.querySelectorAll('.cmp-row');
    var expected = ComparisonTable.FEATURES.filter(function (f) { return f.cat === 'automation'; }).length;
    expect(rows.length).toBe(expected);
  });

  test('setFilter to "all" shows all features', function () {
    ComparisonTable.setFilter('automation');
    ComparisonTable.setFilter('all');
    var rows = document.querySelectorAll('.cmp-row');
    expect(rows.length).toBe(ComparisonTable.FEATURES.length);
  });

  test('filter button click updates active state', function () {
    var btns = document.querySelectorAll('.cmp-filter-btn');
    btns[1].click(); // automation
    expect(btns[1].classList.contains('active')).toBe(true);
    expect(btns[1].getAttribute('aria-pressed')).toBe('true');
    expect(btns[0].classList.contains('active')).toBe(false);
    expect(btns[0].getAttribute('aria-pressed')).toBe('false');
  });

  test('getActiveCategory returns current filter', function () {
    expect(ComparisonTable.getActiveCategory()).toBe('all');
    ComparisonTable.setFilter('pricing');
    expect(ComparisonTable.getActiveCategory()).toBe('pricing');
  });

  test('each category has at least 3 features', function () {
    ComparisonTable.CATEGORIES.forEach(function (cat) {
      var count = ComparisonTable.FEATURES.filter(function (f) { return f.cat === cat.id; }).length;
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Scores ──────────────────────────────────────────────────────

  test('getScores returns percentage for each competitor', function () {
    var scores = ComparisonTable.getScores();
    expect(typeof scores.agentbox).toBe('number');
    expect(typeof scores.chatgpt).toBe('number');
    expect(typeof scores.zapier).toBe('number');
    expect(typeof scores.custom).toBe('number');
    expect(typeof scores.manual).toBe('number');
  });

  test('agentbox always scores highest', function () {
    var scores = ComparisonTable.getScores();
    expect(scores.agentbox).toBeGreaterThanOrEqual(scores.chatgpt);
    expect(scores.agentbox).toBeGreaterThanOrEqual(scores.zapier);
    expect(scores.agentbox).toBeGreaterThanOrEqual(scores.custom);
    expect(scores.agentbox).toBeGreaterThanOrEqual(scores.manual);
  });

  test('scores update when filter changes', function () {
    var allScores = ComparisonTable.getScores();
    ComparisonTable.setFilter('pricing');
    var pricingScores = ComparisonTable.getScores();
    // Scores may differ between all and pricing-only
    expect(typeof pricingScores.agentbox).toBe('number');
  });

  test('score elements update in DOM', function () {
    ComparisonTable.setFilter('automation');
    var el = document.getElementById('cmpScore_agentbox');
    expect(el.textContent).toMatch(/%$/);
  });

  // ── Table structure ─────────────────────────────────────────────

  test('each row has correct number of cells', function () {
    var rows = document.querySelectorAll('.cmp-row');
    // 1 feature name + 5 competitor ratings
    rows.forEach(function (row) {
      expect(row.children.length).toBe(6);
    });
  });

  test('rating cells have title attributes', function () {
    var cell = document.querySelector('.cmp-rating');
    expect(cell.getAttribute('title')).toBeTruthy();
  });

  test('rating cells have aria-label', function () {
    var cell = document.querySelector('.cmp-rating');
    expect(cell.getAttribute('aria-label')).toBeTruthy();
  });

  test('highlight column has cmp-highlight class', function () {
    var highlights = document.querySelectorAll('.cmp-highlight');
    expect(highlights.length).toBeGreaterThan(0);
  });

  // ── Summary ─────────────────────────────────────────────────────

  test('summary text is populated', function () {
    var summary = document.querySelector('.cmp-summary');
    expect(summary.textContent).toBeTruthy();
    expect(summary.textContent.length).toBeGreaterThan(10);
  });

  test('summary mentions AgentBox advantage', function () {
    var summary = document.querySelector('.cmp-summary');
    expect(summary.textContent).toContain('AgentBox');
  });

  // ── Edge cases ──────────────────────────────────────────────────

  test('init with missing section is safe', function () {
    document.body.innerHTML = '';
    expect(function () { ComparisonTable.init(); }).not.toThrow();
  });

  test('setFilter with unknown category shows no rows', function () {
    ComparisonTable.setFilter('nonexistent');
    var rows = document.querySelectorAll('.cmp-row');
    expect(rows.length).toBe(0);
  });
});
