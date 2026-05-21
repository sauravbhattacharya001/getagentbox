/**
 * @jest-environment jsdom
 *
 * Behavioural tests for WorkflowTemplates module.
 *
 * The module is a global IIFE so we load it the same way other tests do
 * (see __tests__/share-fab.test.js): read the source and `eval` it in the
 * jest jsdom context after providing the small set of globals it relies on.
 */

const fs = require('fs');
const path = require('path');

function loadWorkflowTemplates() {
  // The module references the `prefersReducedMotion` global when scrolling
  // the detail panel into view. Default to false in tests so behaviour
  // matches a normal browser.
  global.prefersReducedMotion = false;
  const code = fs.readFileSync(
    path.resolve(__dirname, '../src/modules/workflow-templates.js'),
    'utf8'
  );
  // eslint-disable-next-line no-eval
  eval(code);
  return WorkflowTemplates; // eslint-disable-line no-undef
}

function markup() {
  document.body.innerHTML = `
    <section id="workflowSection">
      <div class="workflow-filter" role="tablist"></div>
      <div id="workflowGrid" role="list"></div>
      <div id="workflowDetail" hidden>
        <button id="workflowDetailClose">Close</button>
        <h3 id="workflowDetailTitle"></h3>
        <p id="workflowDetailDesc"></p>
        <div id="workflowSteps"></div>
        <pre id="workflowSetupCode"></pre>
        <div id="workflowTags"></div>
        <button id="workflowCopyBtn">Copy</button>
      </div>
    </section>
  `;
}

describe('WorkflowTemplates', () => {
  let WT;

  beforeEach(() => {
    markup();
    WT = loadWorkflowTemplates();
    WT.init();
  });

  describe('seed data contract', () => {
    test('exposes a non-empty TEMPLATES array with the expected shape', () => {
      expect(Array.isArray(WT.TEMPLATES)).toBe(true);
      expect(WT.TEMPLATES.length).toBeGreaterThan(0);

      WT.TEMPLATES.forEach((tpl) => {
        expect(typeof tpl.id).toBe('string');
        expect(typeof tpl.title).toBe('string');
        expect(typeof tpl.icon).toBe('string');
        expect(typeof tpl.category).toBe('string');
        expect(typeof tpl.description).toBe('string');
        expect(typeof tpl.setup).toBe('string');
        expect(typeof tpl.difficulty).toBe('string');
        expect(Array.isArray(tpl.steps)).toBe(true);
        expect(tpl.steps.length).toBeGreaterThan(0);
        expect(Array.isArray(tpl.tags)).toBe(true);
      });
    });

    test('all template ids are unique', () => {
      const ids = WT.TEMPLATES.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    test('every template uses one of the declared categories', () => {
      const declared = new Set(WT.CATEGORIES.map((c) => c.id));
      WT.TEMPLATES.forEach((t) => {
        // 'all' is a UI bucket, never a real category on a template
        expect(t.category).not.toBe('all');
        expect(declared.has(t.category)).toBe(true);
      });
    });

    test('CATEGORIES includes the "all" bucket as the first entry', () => {
      expect(WT.CATEGORIES[0].id).toBe('all');
    });

    test('difficulty is one of easy|medium|hard', () => {
      const allowed = new Set(['easy', 'medium', 'hard']);
      WT.TEMPLATES.forEach((t) => expect(allowed.has(t.difficulty)).toBe(true));
    });
  });

  describe('rendering', () => {
    test('init() renders one card per template when category is "all"', () => {
      const cards = document.querySelectorAll('#workflowGrid .workflow-card');
      expect(cards.length).toBe(WT.TEMPLATES.length);
    });

    test('init() builds one filter button per category', () => {
      const buttons = document.querySelectorAll('.workflow-filter .workflow-filter-btn');
      expect(buttons.length).toBe(WT.CATEGORIES.length);
    });

    test('the "all" filter button starts active and aria-selected', () => {
      const allBtn = document.querySelector('.workflow-filter-btn[data-wf-cat="all"]');
      expect(allBtn).not.toBeNull();
      expect(allBtn.classList.contains('active')).toBe(true);
      expect(allBtn.getAttribute('aria-selected')).toBe('true');
    });

    test('each card carries the template id on data-wf-id and is keyboard-focusable', () => {
      const cards = Array.from(document.querySelectorAll('.workflow-card'));
      const idsFromDom = cards.map((c) => c.dataset.wfId).sort();
      const idsFromData = WT.TEMPLATES.map((t) => t.id).sort();
      expect(idsFromDom).toEqual(idsFromData);
      cards.forEach((c) => expect(c.tabIndex).toBe(0));
    });

    test('cards expose title, description, difficulty and category badges', () => {
      const cards = document.querySelectorAll('.workflow-card');
      cards.forEach((card) => {
        expect(card.querySelector('.workflow-card-title')).toBeTruthy();
        expect(card.querySelector('.workflow-card-desc')).toBeTruthy();
        expect(card.querySelector('.workflow-difficulty')).toBeTruthy();
        expect(card.querySelector('.workflow-category-badge')).toBeTruthy();
      });
    });

    test('init() is a no-op when the grid element is missing', () => {
      document.body.innerHTML = '<div></div>'; // no #workflowGrid
      // Reload module to reset internal cached refs.
      WT = loadWorkflowTemplates();
      expect(() => WT.init()).not.toThrow();
      // getCurrent still returns the default category
      expect(WT.getCurrent()).toBe('all');
    });
  });

  describe('filterBy() / category navigation', () => {
    test('filtering to a real category only renders matching templates', () => {
      const productivityCount = WT.getByCategory('productivity').length;
      expect(productivityCount).toBeGreaterThan(0);

      WT.filterBy('productivity');

      const cards = document.querySelectorAll('.workflow-card');
      expect(cards.length).toBe(productivityCount);
      expect(WT.getCurrent()).toBe('productivity');
    });

    test('filterBy() updates active class and aria-selected on the buttons', () => {
      WT.filterBy('development');
      const buttons = document.querySelectorAll('.workflow-filter-btn');
      buttons.forEach((btn) => {
        const isTarget = btn.dataset.wfCat === 'development';
        expect(btn.classList.contains('active')).toBe(isTarget);
        expect(btn.getAttribute('aria-selected')).toBe(isTarget ? 'true' : 'false');
      });
    });

    test('filtering hides the detail panel if it was open', () => {
      // Open a detail by clicking the first card.
      const firstCard = document.querySelector('.workflow-card');
      firstCard.click();
      const detail = document.getElementById('workflowDetail');
      expect(detail.hidden).toBe(false);

      WT.filterBy('finance');
      expect(detail.hidden).toBe(true);
    });

    test('filter buttons are wired up to filterBy via click', () => {
      const devBtn = document.querySelector('.workflow-filter-btn[data-wf-cat="development"]');
      devBtn.click();
      expect(WT.getCurrent()).toBe('development');
    });

    test('clicking the already-active filter is a no-op', () => {
      WT.filterBy('learning');
      const learningCount = document.querySelectorAll('.workflow-card').length;
      const learningBtn = document.querySelector('.workflow-filter-btn[data-wf-cat="learning"]');
      learningBtn.click();
      expect(WT.getCurrent()).toBe('learning');
      expect(document.querySelectorAll('.workflow-card').length).toBe(learningCount);
    });
  });

  describe('detail panel', () => {
    test('clicking a card opens the detail panel with the right content', () => {
      const cards = Array.from(document.querySelectorAll('.workflow-card'));
      const target = cards.find((c) => c.dataset.wfId === WT.TEMPLATES[0].id);
      target.click();

      const detail = document.getElementById('workflowDetail');
      expect(detail.hidden).toBe(false);

      const title = document.getElementById('workflowDetailTitle').textContent;
      expect(title).toContain(WT.TEMPLATES[0].title);
      expect(title).toContain(WT.TEMPLATES[0].icon);

      expect(document.getElementById('workflowDetailDesc').textContent)
        .toBe(WT.TEMPLATES[0].description);
      expect(document.getElementById('workflowSetupCode').textContent)
        .toBe(WT.TEMPLATES[0].setup);

      const stepItems = document.querySelectorAll('#workflowSteps li');
      expect(stepItems.length).toBe(WT.TEMPLATES[0].steps.length);

      const tagSpans = document.querySelectorAll('#workflowTags .workflow-tag');
      expect(tagSpans.length).toBe(WT.TEMPLATES[0].tags.length);
      // Each tag is prefixed with '#'
      tagSpans.forEach((t) => expect(t.textContent.startsWith('#')).toBe(true));
    });

    test('pressing Enter on a focused card opens the detail panel', () => {
      const card = document.querySelector('.workflow-card');
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      card.dispatchEvent(ev);
      expect(document.getElementById('workflowDetail').hidden).toBe(false);
    });

    test('pressing Space on a focused card opens the detail panel', () => {
      const card = document.querySelector('.workflow-card');
      const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      card.dispatchEvent(ev);
      expect(document.getElementById('workflowDetail').hidden).toBe(false);
    });

    test('detail close button hides the detail panel', () => {
      document.querySelector('.workflow-card').click();
      const detail = document.getElementById('workflowDetail');
      expect(detail.hidden).toBe(false);
      document.getElementById('workflowDetailClose').click();
      expect(detail.hidden).toBe(true);
    });

    test('opening details re-renders steps without stale entries', () => {
      const cards = Array.from(document.querySelectorAll('.workflow-card'));
      cards[0].click();
      const firstStepCount = WT.TEMPLATES[0].steps.length;
      expect(document.querySelectorAll('#workflowSteps li').length).toBe(firstStepCount);

      // Open the second template.
      const second = cards.find((c) => c.dataset.wfId === WT.TEMPLATES[1].id);
      second.click();
      expect(document.querySelectorAll('#workflowSteps li').length)
        .toBe(WT.TEMPLATES[1].steps.length);
    });
  });

  describe('lookup helpers', () => {
    test('getTemplates() returns the full list, not a category-filtered copy', () => {
      expect(WT.getTemplates().length).toBe(WT.TEMPLATES.length);
    });

    test('getByCategory("all") returns a copy of all templates', () => {
      const all = WT.getByCategory('all');
      expect(all.length).toBe(WT.TEMPLATES.length);
      // Copy, not the same reference.
      expect(all).not.toBe(WT.TEMPLATES);
    });

    test('getByCategory(unknown) returns an empty array', () => {
      expect(WT.getByCategory('does-not-exist')).toEqual([]);
    });

    test('getById() returns the matching template', () => {
      const first = WT.TEMPLATES[0];
      expect(WT.getById(first.id)).toBe(first);
    });

    test('getById() returns null for unknown ids', () => {
      expect(WT.getById('no-such-id')).toBeNull();
    });

    test('getCategories() returns a copy of the declared categories', () => {
      const cats = WT.getCategories();
      // Same shape as the exported CATEGORIES…
      expect(cats).toEqual(WT.CATEGORIES);
      // …but a defensive copy, so consumers can’t mutate the originals.
      expect(cats).not.toBe(WT.CATEGORIES);
    });
  });
});
