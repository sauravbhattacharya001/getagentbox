/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function loadPage() {
  const callerOwnsFakeTimers = typeof setTimeout.clock !== 'undefined';
  if (!callerOwnsFakeTimers) jest.useFakeTimers();

  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const scriptFn = new Function(appJs);
  scriptFn.call(window);

  document.dispatchEvent(new Event('DOMContentLoaded'));
  jest.advanceTimersByTime(300);

  if (!callerOwnsFakeTimers) jest.useRealTimers();
}

afterAll(() => {
  try { if (window.Testimonials) window.Testimonials.stopAutoPlay(); } catch (_) {}
  try { if (window.SiteNav) window.SiteNav.destroy(); } catch (_) {}
  try { if (window.CommandPalette) window.CommandPalette.destroy(); } catch (_) {}
});

describe('WorkflowTemplates', () => {
  beforeAll(() => loadPage());

  describe('init and DOM', () => {
    test('workflow section exists in DOM', () => {
      expect(document.getElementById('workflowSection')).not.toBeNull();
    });

    test('grid renders all templates', () => {
      const grid = document.getElementById('workflowGrid');
      expect(grid).not.toBeNull();
      expect(grid.children.length).toBe(window.WorkflowTemplates.TEMPLATES.length);
    });

    test('filter buttons rendered for all categories', () => {
      const btns = document.querySelectorAll('.workflow-filter-btn');
      expect(btns.length).toBe(window.WorkflowTemplates.CATEGORIES.length);
    });

    test('All filter is active by default', () => {
      const activeBtn = document.querySelector('.workflow-filter-btn.active');
      expect(activeBtn).not.toBeNull();
      expect(activeBtn.dataset.wfCat).toBe('all');
    });

    test('detail panel starts hidden', () => {
      const detail = document.getElementById('workflowDetail');
      expect(detail.hidden).toBe(true);
    });
  });

  describe('TEMPLATES data', () => {
    test('all templates have required fields', () => {
      const templates = window.WorkflowTemplates.getTemplates();
      templates.forEach(t => {
        expect(t.id).toBeTruthy();
        expect(t.title).toBeTruthy();
        expect(t.icon).toBeTruthy();
        expect(t.category).toBeTruthy();
        expect(t.description).toBeTruthy();
        expect(t.steps.length).toBeGreaterThan(0);
        expect(t.setup).toBeTruthy();
        expect(t.tags.length).toBeGreaterThan(0);
        expect(['easy', 'medium', 'hard']).toContain(t.difficulty);
      });
    });

    test('all template IDs are unique', () => {
      const ids = window.WorkflowTemplates.getTemplates().map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    test('all template categories match defined CATEGORIES', () => {
      const catIds = window.WorkflowTemplates.CATEGORIES.map(c => c.id).filter(id => id !== 'all');
      const templates = window.WorkflowTemplates.getTemplates();
      templates.forEach(t => {
        expect(catIds).toContain(t.category);
      });
    });

    test('at least 10 templates exist', () => {
      expect(window.WorkflowTemplates.getTemplates().length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('filtering', () => {
    test('filterBy productivity shows only productivity templates', () => {
      window.WorkflowTemplates.filterBy('productivity');
      const grid = document.getElementById('workflowGrid');
      const productivityCount = window.WorkflowTemplates.getByCategory('productivity').length;
      expect(grid.children.length).toBe(productivityCount);
      expect(productivityCount).toBeGreaterThan(0);
    });

    test('filterBy all shows all templates', () => {
      window.WorkflowTemplates.filterBy('all');
      const grid = document.getElementById('workflowGrid');
      expect(grid.children.length).toBe(window.WorkflowTemplates.TEMPLATES.length);
    });

    test('getCurrent reflects active filter', () => {
      window.WorkflowTemplates.filterBy('health');
      expect(window.WorkflowTemplates.getCurrent()).toBe('health');
      window.WorkflowTemplates.filterBy('all');
    });

    test('active button updates on filter change', () => {
      window.WorkflowTemplates.filterBy('finance');
      const active = document.querySelector('.workflow-filter-btn.active');
      expect(active.dataset.wfCat).toBe('finance');
      window.WorkflowTemplates.filterBy('all');
    });

    test('filter hides detail panel', () => {
      // Open a detail first
      const card = document.querySelector('.workflow-card');
      card.click();
      const detail = document.getElementById('workflowDetail');
      expect(detail.hidden).toBe(false);

      window.WorkflowTemplates.filterBy('development');
      expect(detail.hidden).toBe(true);
      window.WorkflowTemplates.filterBy('all');
    });
  });

  describe('detail panel', () => {
    test('clicking a card opens detail panel', () => {
      window.WorkflowTemplates.filterBy('all');
      const card = document.querySelector('.workflow-card');
      card.click();

      const detail = document.getElementById('workflowDetail');
      expect(detail.hidden).toBe(false);
    });

    test('detail shows correct title', () => {
      const firstTemplate = window.WorkflowTemplates.TEMPLATES[0];
      const cards = document.querySelectorAll('.workflow-card');
      cards[0].click();

      const title = document.getElementById('workflowDetailTitle');
      expect(title.textContent).toContain(firstTemplate.title);
    });

    test('detail shows steps as ordered list', () => {
      const firstTemplate = window.WorkflowTemplates.TEMPLATES[0];
      const cards = document.querySelectorAll('.workflow-card');
      cards[0].click();

      const stepsEl = document.getElementById('workflowSteps');
      const items = stepsEl.querySelectorAll('li');
      expect(items.length).toBe(firstTemplate.steps.length);
      expect(items[0].textContent).toBe(firstTemplate.steps[0]);
    });

    test('detail shows setup command', () => {
      const firstTemplate = window.WorkflowTemplates.TEMPLATES[0];
      const cards = document.querySelectorAll('.workflow-card');
      cards[0].click();

      const codeEl = document.getElementById('workflowSetupCode');
      expect(codeEl.textContent).toBe(firstTemplate.setup);
    });

    test('detail shows tags', () => {
      const firstTemplate = window.WorkflowTemplates.TEMPLATES[0];
      const cards = document.querySelectorAll('.workflow-card');
      cards[0].click();

      const tagsEl = document.getElementById('workflowTags');
      const tags = tagsEl.querySelectorAll('.workflow-tag');
      expect(tags.length).toBe(firstTemplate.tags.length);
    });

    test('close button hides detail panel', () => {
      const card = document.querySelector('.workflow-card');
      card.click();

      const closeBtn = document.getElementById('workflowDetailClose');
      closeBtn.click();

      const detail = document.getElementById('workflowDetail');
      expect(detail.hidden).toBe(true);
    });

    test('keyboard Enter opens detail', () => {
      const card = document.querySelector('.workflow-card');
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      card.dispatchEvent(event);

      const detail = document.getElementById('workflowDetail');
      expect(detail.hidden).toBe(false);
    });
  });

  describe('cards', () => {
    test('each card has difficulty badge', () => {
      window.WorkflowTemplates.filterBy('all');
      const cards = document.querySelectorAll('.workflow-card');
      cards.forEach(card => {
        const badge = card.querySelector('.workflow-difficulty');
        expect(badge).not.toBeNull();
        expect(['easy', 'medium', 'hard']).toContain(badge.textContent);
      });
    });

    test('each card has category badge', () => {
      const cards = document.querySelectorAll('.workflow-card');
      cards.forEach(card => {
        const badge = card.querySelector('.workflow-category-badge');
        expect(badge).not.toBeNull();
      });
    });

    test('cards have role=listitem', () => {
      const cards = document.querySelectorAll('.workflow-card');
      cards.forEach(card => {
        expect(card.getAttribute('role')).toBe('listitem');
      });
    });

    test('cards are focusable', () => {
      const card = document.querySelector('.workflow-card');
      expect(card.tabIndex).toBe(0);
    });
  });

  describe('API methods', () => {
    test('getTemplates returns a copy', () => {
      const t1 = window.WorkflowTemplates.getTemplates();
      const t2 = window.WorkflowTemplates.getTemplates();
      expect(t1).not.toBe(t2);
      expect(t1).toEqual(t2);
    });

    test('getCategories returns all categories', () => {
      const cats = window.WorkflowTemplates.getCategories();
      expect(cats.length).toBe(window.WorkflowTemplates.CATEGORIES.length);
      expect(cats.find(c => c.id === 'all')).toBeTruthy();
    });

    test('getByCategory returns filtered results', () => {
      const health = window.WorkflowTemplates.getByCategory('health');
      health.forEach(t => expect(t.category).toBe('health'));
      expect(health.length).toBeGreaterThan(0);
    });

    test('getByCategory all returns everything', () => {
      const all = window.WorkflowTemplates.getByCategory('all');
      expect(all.length).toBe(window.WorkflowTemplates.TEMPLATES.length);
    });

    test('getById returns correct template', () => {
      const t = window.WorkflowTemplates.getById('daily-briefing');
      expect(t).not.toBeNull();
      expect(t.title).toBe('Daily Briefing');
    });

    test('getById returns null for unknown id', () => {
      expect(window.WorkflowTemplates.getById('nonexistent')).toBeNull();
    });
  });

  describe('copy button', () => {
    test('copy button exists in detail panel', () => {
      const copyBtn = document.getElementById('workflowCopyBtn');
      expect(copyBtn).not.toBeNull();
    });

    test('copy button changes text on click', () => {
      jest.useFakeTimers();
      // Mock clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: jest.fn().mockResolvedValue(undefined) },
        writable: true,
        configurable: true,
      });

      const card = document.querySelector('.workflow-card');
      card.click();

      const copyBtn = document.getElementById('workflowCopyBtn');
      copyBtn.click();

      expect(copyBtn.textContent).toContain('Copied');

      jest.advanceTimersByTime(2500);
      expect(copyBtn.textContent).toContain('Copy');

      jest.useRealTimers();
    });
  });
});
