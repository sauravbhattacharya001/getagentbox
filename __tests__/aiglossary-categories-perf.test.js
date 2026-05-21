/**
 * @jest-environment jsdom
 *
 * Tests for the AIGlossary categories perf optimisation.
 *
 * Before this change, renderCategories() rewrote innerHTML on every call,
 * which:
 *   - allocated/destroyed N DOM nodes per category switch (layout thrash)
 *   - stole keyboard focus from the just-clicked tab (a real a11y bug)
 *
 * After the change, the toolbar is built once and subsequent calls only
 * toggle the `active` class + `aria-selected` attribute on existing nodes.
 */

const fs = require('fs');
const path = require('path');

function loadGlossary() {
  document.body.innerHTML = `
    <div id="glossaryCategories"></div>
    <input id="glossarySearch" />
    <div id="glossaryCount"></div>
    <div id="glossaryList"></div>
  `;
  const code = fs.readFileSync(
    path.resolve(__dirname, '../src/modules/aiglossary.js'),
    'utf8'
  );
  // eslint-disable-next-line no-eval
  eval(code);
  return AIGlossary; // eslint-disable-line no-undef
}

describe('AIGlossary.renderCategories — incremental update', () => {
  let G;

  beforeEach(() => {
    G = loadGlossary();
    G.init();
  });

  test('initial render produces an "All" tab plus one tab per category', () => {
    const buttons = document.querySelectorAll(
      '#glossaryCategories .glossary-cat-btn'
    );
    // At least All + a handful of categories.
    expect(buttons.length).toBeGreaterThanOrEqual(5);
    expect(buttons[0].getAttribute('data-cat')).toBe('all');
    expect(buttons[0].classList.contains('active')).toBe(true);
    expect(buttons[0].getAttribute('aria-selected')).toBe('true');
  });

  test('switching category does NOT rebuild the button nodes', () => {
    const container = document.getElementById('glossaryCategories');
    const before = Array.from(container.querySelectorAll('.glossary-cat-btn'));

    // Click a non-"all" tab.
    const safetyBtn = before.find((b) => b.getAttribute('data-cat') === 'Safety');
    expect(safetyBtn).toBeTruthy();
    safetyBtn.click();

    const after = Array.from(container.querySelectorAll('.glossary-cat-btn'));
    expect(after.length).toBe(before.length);
    // Same node identities — proves no innerHTML rebuild.
    for (let i = 0; i < before.length; i++) {
      expect(after[i]).toBe(before[i]);
    }
  });

  test('active class and aria-selected move to the clicked tab', () => {
    const container = document.getElementById('glossaryCategories');
    const allBtn = container.querySelector('[data-cat="all"]');
    const safetyBtn = container.querySelector('[data-cat="Safety"]');

    safetyBtn.click();

    expect(safetyBtn.classList.contains('active')).toBe(true);
    expect(safetyBtn.getAttribute('aria-selected')).toBe('true');
    expect(allBtn.classList.contains('active')).toBe(false);
    expect(allBtn.getAttribute('aria-selected')).toBe('false');
  });

  test('keyboard focus on the clicked tab survives the category switch', () => {
    const container = document.getElementById('glossaryCategories');
    const safetyBtn = container.querySelector('[data-cat="Safety"]');

    safetyBtn.focus();
    expect(document.activeElement).toBe(safetyBtn);

    safetyBtn.click();

    // Before the perf fix, innerHTML reassignment destroyed the focused
    // node and focus fell back to <body>.  With the fix, the same node
    // still exists and retains focus.
    expect(document.activeElement).toBe(safetyBtn);
  });

  test('filtered list updates when category changes', () => {
    const container = document.getElementById('glossaryCategories');
    const list = document.getElementById('glossaryList');
    const countEl = document.getElementById('glossaryCount');

    const initialCount = countEl.textContent;
    const safetyBtn = container.querySelector('[data-cat="Safety"]');
    safetyBtn.click();

    expect(countEl.textContent).not.toBe(initialCount);
    expect(countEl.textContent).toMatch(/in Safety/);
    // At least one Safety card should be present.
    expect(list.querySelectorAll('.glossary-card').length).toBeGreaterThan(0);
  });
});
