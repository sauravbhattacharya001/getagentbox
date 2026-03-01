/**
 * @jest-environment jsdom
 */

/* global Changelog */

const fs = require('fs');
const path = require('path');

beforeEach(() => {
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  document.documentElement.innerHTML = html;

  // Reset module by re-evaluating app.js
  const script = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');
  eval(script);
});

describe('Changelog', () => {
  // ── Init ────────────────────────────────────────────────────────
  test('Changelog object exists with expected API', () => {
    expect(Changelog).toBeDefined();
    expect(typeof Changelog.filterBy).toBe('function');
    expect(typeof Changelog.getCurrent).toBe('function');
    expect(typeof Changelog.getTags).toBe('function');
    expect(typeof Changelog.getEntries).toBe('function');
    expect(typeof Changelog.getTagCounts).toBe('function');
    expect(typeof Changelog.init).toBe('function');
  });

  test('init does not throw', () => {
    expect(() => Changelog.init()).not.toThrow();
  });

  // ── Default State ──────────────────────────────────────────────
  test('default filter is "all"', () => {
    expect(Changelog.getCurrent()).toBe('all');
  });

  test('all entries are visible by default', () => {
    const entries = document.querySelectorAll('.changelog-entry');
    entries.forEach(e => {
      expect(e.classList.contains('hidden')).toBe(false);
    });
  });

  // ── getEntries ─────────────────────────────────────────────────
  test('getEntries returns all entries when no filter', () => {
    const entries = Changelog.getEntries();
    expect(entries.length).toBe(8);
  });

  test('getEntries returns entries with correct structure', () => {
    const entries = Changelog.getEntries();
    entries.forEach(e => {
      expect(e).toHaveProperty('tag');
      expect(e).toHaveProperty('date');
      expect(e).toHaveProperty('title');
      expect(e).toHaveProperty('description');
    });
  });

  test('getEntries("feature") returns only features', () => {
    const entries = Changelog.getEntries('feature');
    expect(entries.length).toBeGreaterThan(0);
    entries.forEach(e => expect(e.tag).toBe('feature'));
  });

  test('getEntries("improvement") returns only improvements', () => {
    const entries = Changelog.getEntries('improvement');
    expect(entries.length).toBeGreaterThan(0);
    entries.forEach(e => expect(e.tag).toBe('improvement'));
  });

  test('getEntries("fix") returns only fixes', () => {
    const entries = Changelog.getEntries('fix');
    expect(entries.length).toBeGreaterThan(0);
    entries.forEach(e => expect(e.tag).toBe('fix'));
  });

  test('getEntries("all") returns all entries', () => {
    const all = Changelog.getEntries('all');
    const noFilter = Changelog.getEntries();
    expect(all.length).toBe(noFilter.length);
  });

  // ── getTags ────────────────────────────────────────────────────
  test('getTags returns available filter tags', () => {
    const tags = Changelog.getTags();
    expect(tags).toContain('all');
    expect(tags).toContain('feature');
    expect(tags).toContain('improvement');
    expect(tags).toContain('fix');
  });

  test('getTags returns 4 tags', () => {
    expect(Changelog.getTags().length).toBe(4);
  });

  // ── getTagCounts ───────────────────────────────────────────────
  test('getTagCounts returns counts per tag', () => {
    const counts = Changelog.getTagCounts();
    expect(counts.feature).toBeGreaterThan(0);
    expect(counts.improvement).toBeGreaterThan(0);
    expect(counts.fix).toBeGreaterThan(0);
  });

  test('tag counts sum to total entries', () => {
    const counts = Changelog.getTagCounts();
    const total = counts.feature + counts.improvement + counts.fix;
    expect(total).toBe(Changelog.getEntries().length);
  });

  // ── filterBy ───────────────────────────────────────────────────
  test('filterBy("feature") hides non-feature entries', () => {
    Changelog.filterBy('feature');
    const entries = document.querySelectorAll('.changelog-entry');
    entries.forEach(e => {
      if (e.dataset.tag === 'feature') {
        expect(e.classList.contains('hidden')).toBe(false);
      } else {
        expect(e.classList.contains('hidden')).toBe(true);
      }
    });
  });

  test('filterBy("improvement") shows only improvements', () => {
    Changelog.filterBy('improvement');
    const entries = document.querySelectorAll('.changelog-entry');
    entries.forEach(e => {
      expect(e.classList.contains('hidden')).toBe(e.dataset.tag !== 'improvement');
    });
  });

  test('filterBy("fix") shows only fixes', () => {
    Changelog.filterBy('fix');
    const entries = document.querySelectorAll('.changelog-entry');
    entries.forEach(e => {
      expect(e.classList.contains('hidden')).toBe(e.dataset.tag !== 'fix');
    });
  });

  test('filterBy("all") shows all entries', () => {
    Changelog.filterBy('feature');
    Changelog.filterBy('all');
    const entries = document.querySelectorAll('.changelog-entry');
    entries.forEach(e => {
      expect(e.classList.contains('hidden')).toBe(false);
    });
  });

  test('filterBy returns visible count', () => {
    const featureCount = Changelog.filterBy('feature');
    expect(featureCount).toBe(Changelog.getTagCounts().feature);
  });

  test('filterBy updates current tag', () => {
    Changelog.filterBy('fix');
    expect(Changelog.getCurrent()).toBe('fix');
  });

  test('filterBy updates button active states', () => {
    Changelog.filterBy('improvement');
    const buttons = document.querySelectorAll('.changelog-filter-btn');
    buttons.forEach(btn => {
      if (btn.dataset.tag === 'improvement') {
        expect(btn.classList.contains('active')).toBe(true);
        expect(btn.getAttribute('aria-selected')).toBe('true');
      } else {
        expect(btn.classList.contains('active')).toBe(false);
        expect(btn.getAttribute('aria-selected')).toBe('false');
      }
    });
  });

  test('filterBy with null returns 0', () => {
    expect(Changelog.filterBy(null)).toBe(0);
  });

  // ── Click Delegation ──────────────────────────────────────────
  test('clicking filter button triggers filter', () => {
    Changelog.init();
    const btn = document.querySelector('.changelog-filter-btn[data-tag="fix"]');
    btn.click();
    expect(Changelog.getCurrent()).toBe('fix');
  });

  test('clicking "All" button after filter shows everything', () => {
    Changelog.init();
    document.querySelector('.changelog-filter-btn[data-tag="feature"]').click();
    document.querySelector('.changelog-filter-btn[data-tag="all"]').click();
    const entries = document.querySelectorAll('.changelog-entry');
    entries.forEach(e => {
      expect(e.classList.contains('hidden')).toBe(false);
    });
  });

  // ── Content Verification ───────────────────────────────────────
  test('entries have non-empty titles', () => {
    const entries = Changelog.getEntries();
    entries.forEach(e => {
      expect(e.title.length).toBeGreaterThan(0);
    });
  });

  test('entries have non-empty descriptions', () => {
    const entries = Changelog.getEntries();
    entries.forEach(e => {
      expect(e.description.length).toBeGreaterThan(0);
    });
  });

  test('entries have dates', () => {
    const entries = Changelog.getEntries();
    entries.forEach(e => {
      expect(e.date.length).toBeGreaterThan(0);
    });
  });

  // ── DOM Structure ──────────────────────────────────────────────
  test('section has heading', () => {
    const section = document.getElementById('changelogSection');
    const h2 = section.querySelector('h2');
    expect(h2.textContent).toBe("What's new");
  });

  test('section has subtitle', () => {
    const subtitle = document.querySelector('.changelog-subtitle');
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent.length).toBeGreaterThan(0);
  });

  test('each entry has a date element', () => {
    const entries = document.querySelectorAll('.changelog-entry');
    entries.forEach(e => {
      expect(e.querySelector('.changelog-date')).not.toBeNull();
    });
  });

  test('each entry has a dot with tag class', () => {
    const entries = document.querySelectorAll('.changelog-entry');
    entries.forEach(e => {
      const dot = e.querySelector('.changelog-dot');
      expect(dot).not.toBeNull();
      expect(dot.classList.contains(e.dataset.tag)).toBe(true);
    });
  });

  test('each entry has a badge with tag class', () => {
    const entries = document.querySelectorAll('.changelog-entry');
    entries.forEach(e => {
      const badge = e.querySelector('.changelog-badge');
      expect(badge).not.toBeNull();
      expect(badge.classList.contains(e.dataset.tag)).toBe(true);
    });
  });

  test('timeline container has line pseudo-element parent', () => {
    const timeline = document.getElementById('changelogTimeline');
    expect(timeline).not.toBeNull();
    expect(timeline.classList.contains('changelog-timeline')).toBe(true);
  });

  // ── ARIA ───────────────────────────────────────────────────────
  test('filter buttons have role="tab"', () => {
    const buttons = document.querySelectorAll('.changelog-filter-btn');
    buttons.forEach(btn => {
      expect(btn.getAttribute('role')).toBe('tab');
    });
  });

  test('filter container has role="tablist"', () => {
    const filter = document.querySelector('.changelog-filter');
    expect(filter.getAttribute('role')).toBe('tablist');
  });

  test('filter has aria-label', () => {
    const filter = document.querySelector('.changelog-filter');
    expect(filter.getAttribute('aria-label')).toBeTruthy();
  });

  test('only one button has aria-selected=true initially', () => {
    const selected = document.querySelectorAll('.changelog-filter-btn[aria-selected="true"]');
    expect(selected.length).toBe(1);
    expect(selected[0].dataset.tag).toBe('all');
  });

  // ── Edge Cases ─────────────────────────────────────────────────
  test('filterBy unknown tag hides all entries', () => {
    const count = Changelog.filterBy('nonexistent');
    expect(count).toBe(0);
  });

  test('multiple rapid filter switches work correctly', () => {
    Changelog.filterBy('feature');
    Changelog.filterBy('fix');
    Changelog.filterBy('improvement');
    Changelog.filterBy('all');
    expect(Changelog.getCurrent()).toBe('all');
    const entries = document.querySelectorAll('.changelog-entry.hidden');
    expect(entries.length).toBe(0);
  });

  test('same filter applied twice is idempotent', () => {
    const count1 = Changelog.filterBy('feature');
    const count2 = Changelog.filterBy('feature');
    expect(count1).toBe(count2);
  });
});
