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

/**
 * Loads the page once for the entire suite. We avoid repeated loadPage()
 * calls because each run adds a new DOMContentLoaded listener (from app.js)
 * that persists across calls, causing duplicate init() invocations.
 */
function loadPage() {
  jest.useFakeTimers();

  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const scriptFn = new Function(appJs);
  scriptFn.call(window);

  document.dispatchEvent(new Event('DOMContentLoaded'));

  // Let debounced updates and onboarding timeout fire
  jest.advanceTimersByTime(6000);

  jest.useRealTimers();
}

// Load once for the entire file
loadPage();

afterAll(() => {
  try { if (window.Testimonials) window.Testimonials.stopAutoPlay(); } catch (_) {}
  try { if (window.SiteNav) window.SiteNav.destroy(); } catch (_) {}
  try { if (window.CommandPalette) window.CommandPalette.destroy(); } catch (_) {}
  try { if (window.ActivityFeed) window.ActivityFeed.destroy(); } catch (_) {}
});

// Helper: reset gallery state between tests
function resetGallery() {
  // Click "All" filter to reset category
  const btns = document.querySelectorAll('.prompt-filter-btn');
  const allBtn = Array.from(btns).find(b => b.dataset.promptCategory === 'all');
  if (allBtn) allBtn.click();

  // Clear search
  const input = document.getElementById('promptSearchInput');
  if (input) {
    input.value = '';
    input.dispatchEvent(new Event('input'));
  }

  // Close modal if open
  const modal = document.getElementById('promptResponseModal');
  if (modal && !modal.hidden) {
    modal.hidden = true;
    document.body.style.overflow = '';
  }
}

// ── Prompt Gallery ─────────────────────────────────────────────────

describe('PromptGallery', () => {
  afterEach(() => {
    resetGallery();
  });

  // ── Rendering ─────────────────────────────────────────────────────

  test('grid is rendered with pre-built card pool', () => {
    const grid = document.getElementById('promptGalleryGrid');
    expect(grid).not.toBeNull();
    const cards = grid.querySelectorAll('.prompt-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  test('all prompt categories have cards', () => {
    const grid = document.getElementById('promptGalleryGrid');
    const categories = new Set();
    grid.querySelectorAll('.prompt-card').forEach(card => {
      categories.add(card.dataset.category);
    });
    expect(categories.has('productivity')).toBe(true);
    expect(categories.has('learning')).toBe(true);
    expect(categories.has('coding')).toBe(true);
    expect(categories.has('creative')).toBe(true);
    expect(categories.has('daily')).toBe(true);
  });

  test('all cards are initially visible', () => {
    const grid = document.getElementById('promptGalleryGrid');
    const cards = grid.querySelectorAll('.prompt-card');
    const hidden = Array.from(cards).filter(c => c.hidden);
    expect(hidden.length).toBe(0);
  });

  test('cards have correct structure', () => {
    const grid = document.getElementById('promptGalleryGrid');
    const card = grid.querySelector('.prompt-card');
    expect(card.getAttribute('role')).toBe('listitem');
    expect(card.getAttribute('tabindex')).toBe('0');
    expect(card.querySelector('.prompt-card-category')).not.toBeNull();
    expect(card.querySelector('.prompt-card-text')).not.toBeNull();
    expect(card.querySelector('.prompt-card-hint')).not.toBeNull();
  });

  test('cards have data-index attributes', () => {
    const grid = document.getElementById('promptGalleryGrid');
    const cards = grid.querySelectorAll('.prompt-card');
    cards.forEach(card => {
      expect(card.dataset.index).toBeDefined();
    });
  });

  test('exactly 15 prompt cards exist', () => {
    const grid = document.getElementById('promptGalleryGrid');
    const cards = grid.querySelectorAll('.prompt-card');
    expect(cards.length).toBe(15);
  });

  // ── Category filter ───────────────────────────────────────────────

  test('filter buttons exist for each category', () => {
    const btns = document.querySelectorAll('.prompt-filter-btn');
    const categories = Array.from(btns).map(b => b.dataset.promptCategory);
    expect(categories).toContain('all');
    expect(categories).toContain('productivity');
    expect(categories).toContain('coding');
    expect(categories).toContain('creative');
  });

  test('clicking category filter shows only matching cards', () => {
    const btns = document.querySelectorAll('.prompt-filter-btn');
    const codingBtn = Array.from(btns).find(b => b.dataset.promptCategory === 'coding');
    expect(codingBtn).toBeDefined();

    codingBtn.click();

    const grid = document.getElementById('promptGalleryGrid');
    const visible = Array.from(grid.querySelectorAll('.prompt-card'))
      .filter(c => !c.hidden);
    expect(visible.length).toBeGreaterThan(0);
    visible.forEach(c => {
      expect(c.dataset.category).toBe('coding');
    });
  });

  test('clicking all filter shows all cards', () => {
    // First filter to coding
    const btns = document.querySelectorAll('.prompt-filter-btn');
    const codingBtn = Array.from(btns).find(b => b.dataset.promptCategory === 'coding');
    codingBtn.click();

    // Then back to all
    const allBtn = Array.from(btns).find(b => b.dataset.promptCategory === 'all');
    allBtn.click();

    const grid = document.getElementById('promptGalleryGrid');
    const visible = Array.from(grid.querySelectorAll('.prompt-card'))
      .filter(c => !c.hidden);
    expect(visible.length).toBe(15);
  });

  test('active filter button has aria-selected=true', () => {
    const btns = document.querySelectorAll('.prompt-filter-btn');
    const codingBtn = Array.from(btns).find(b => b.dataset.promptCategory === 'coding');
    codingBtn.click();

    expect(codingBtn.getAttribute('aria-selected')).toBe('true');
    expect(codingBtn.classList.contains('active')).toBe(true);

    btns.forEach(b => {
      if (b !== codingBtn) {
        expect(b.getAttribute('aria-selected')).toBe('false');
      }
    });
  });

  test('daily filter shows only daily category', () => {
    const btns = document.querySelectorAll('.prompt-filter-btn');
    const dailyBtn = Array.from(btns).find(b => b.dataset.promptCategory === 'daily');
    dailyBtn.click();

    const grid = document.getElementById('promptGalleryGrid');
    const visible = Array.from(grid.querySelectorAll('.prompt-card'))
      .filter(c => !c.hidden);
    expect(visible.length).toBeGreaterThan(0);
    visible.forEach(c => {
      expect(c.dataset.category).toBe('daily');
    });
  });

  // ── Search ────────────────────────────────────────────────────────

  test('search filters cards by prompt text', () => {
    const input = document.getElementById('promptSearchInput');
    input.value = 'python';
    input.dispatchEvent(new Event('input'));

    const grid = document.getElementById('promptGalleryGrid');
    const visible = Array.from(grid.querySelectorAll('.prompt-card'))
      .filter(c => !c.hidden);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(15);
  });

  test('search filters cards by response text', () => {
    const input = document.getElementById('promptSearchInput');
    // "Kahneman" appears in a response but not in any prompt text
    input.value = 'kahneman';
    input.dispatchEvent(new Event('input'));

    const grid = document.getElementById('promptGalleryGrid');
    const visible = Array.from(grid.querySelectorAll('.prompt-card'))
      .filter(c => !c.hidden);
    expect(visible.length).toBeGreaterThanOrEqual(1);
  });

  test('search is case-insensitive', () => {
    const input = document.getElementById('promptSearchInput');
    input.value = 'WEATHER';
    input.dispatchEvent(new Event('input'));

    const grid = document.getElementById('promptGalleryGrid');
    const visible = Array.from(grid.querySelectorAll('.prompt-card'))
      .filter(c => !c.hidden);
    expect(visible.length).toBeGreaterThan(0);
  });

  test('clearing search shows all cards', () => {
    const input = document.getElementById('promptSearchInput');

    input.value = 'python';
    input.dispatchEvent(new Event('input'));

    input.value = '';
    input.dispatchEvent(new Event('input'));

    const grid = document.getElementById('promptGalleryGrid');
    const visible = Array.from(grid.querySelectorAll('.prompt-card'))
      .filter(c => !c.hidden);
    expect(visible.length).toBe(15);
  });

  test('no-match search shows empty state', () => {
    const input = document.getElementById('promptSearchInput');
    input.value = 'zzzznonexistenttermzzzz';
    input.dispatchEvent(new Event('input'));

    const emptyState = document.getElementById('promptGalleryEmpty');
    expect(emptyState.hidden).toBe(false);
  });

  test('search + category filter combine correctly', () => {
    // Set coding filter first
    const btns = document.querySelectorAll('.prompt-filter-btn');
    const codingBtn = Array.from(btns).find(b => b.dataset.promptCategory === 'coding');
    codingBtn.click();

    // Then search within coding
    const input = document.getElementById('promptSearchInput');
    input.value = 'error';
    input.dispatchEvent(new Event('input'));

    const grid = document.getElementById('promptGalleryGrid');
    const visible = Array.from(grid.querySelectorAll('.prompt-card'))
      .filter(c => !c.hidden);
    visible.forEach(c => {
      expect(c.dataset.category).toBe('coding');
    });
  });

  // ── Modal ─────────────────────────────────────────────────────────

  test('clicking a card opens the response modal', () => {
    const grid = document.getElementById('promptGalleryGrid');
    const card = grid.querySelector('.prompt-card');
    card.click();

    const modal = document.getElementById('promptResponseModal');
    expect(modal.hidden).toBe(false);
  });

  test('modal shows question and answer text', () => {
    const grid = document.getElementById('promptGalleryGrid');
    const card = grid.querySelector('.prompt-card');
    card.click();

    const question = document.getElementById('promptModalQuestion');
    const answer = document.getElementById('promptModalAnswer');
    expect(question.textContent.length).toBeGreaterThan(0);
    expect(answer.textContent.length).toBeGreaterThan(0);
  });

  test('modal locks body scroll', () => {
    const grid = document.getElementById('promptGalleryGrid');
    const card = grid.querySelector('.prompt-card');
    card.click();

    expect(document.body.style.overflow).toBe('hidden');
  });

  test('close button closes modal and restores scroll', () => {
    const grid = document.getElementById('promptGalleryGrid');
    grid.querySelector('.prompt-card').click();

    const closeBtn = document.getElementById('promptModalClose');
    closeBtn.click();

    const modal = document.getElementById('promptResponseModal');
    expect(modal.hidden).toBe(true);
    expect(document.body.style.overflow).toBe('');
  });

  test('clicking backdrop closes modal', () => {
    const grid = document.getElementById('promptGalleryGrid');
    grid.querySelector('.prompt-card').click();

    const backdrop = document.getElementById('promptModalBackdrop');
    backdrop.click();

    expect(document.getElementById('promptResponseModal').hidden).toBe(true);
  });

  test('Escape key closes modal', () => {
    const grid = document.getElementById('promptGalleryGrid');
    grid.querySelector('.prompt-card').click();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(document.getElementById('promptResponseModal').hidden).toBe(true);
  });

  // ── Keyboard accessibility ────────────────────────────────────────

  test('Enter key on card opens modal', () => {
    const grid = document.getElementById('promptGalleryGrid');
    const card = grid.querySelector('.prompt-card');
    card.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true
    }));

    expect(document.getElementById('promptResponseModal').hidden).toBe(false);
  });

  test('Space key on card opens modal', () => {
    const grid = document.getElementById('promptGalleryGrid');
    const card = grid.querySelector('.prompt-card');
    card.dispatchEvent(new KeyboardEvent('keydown', {
      key: ' ', bubbles: true
    }));

    expect(document.getElementById('promptResponseModal').hidden).toBe(false);
  });

  // ── Card pool reuse (performance) ─────────────────────────────────

  test('cards are reused (same DOM nodes) across filter changes', () => {
    const grid = document.getElementById('promptGalleryGrid');
    const firstCard = grid.querySelectorAll('.prompt-card')[0];

    // Filter to coding
    const btns = document.querySelectorAll('.prompt-filter-btn');
    const codingBtn = Array.from(btns).find(b => b.dataset.promptCategory === 'coding');
    codingBtn.click();

    // Back to all
    const allBtn = Array.from(btns).find(b => b.dataset.promptCategory === 'all');
    allBtn.click();

    // Same DOM element reference
    expect(grid.querySelectorAll('.prompt-card')[0]).toBe(firstCard);
  });

  test('filtered cards use hidden attribute (not DOM removal)', () => {
    const grid = document.getElementById('promptGalleryGrid');

    // Filter to coding
    const btns = document.querySelectorAll('.prompt-filter-btn');
    const codingBtn = Array.from(btns).find(b => b.dataset.promptCategory === 'coding');
    codingBtn.click();

    // All 15 cards still in DOM
    expect(grid.querySelectorAll('.prompt-card').length).toBe(15);
    // Some are hidden
    const hiddenCards = Array.from(grid.querySelectorAll('.prompt-card'))
      .filter(c => c.hidden);
    expect(hiddenCards.length).toBeGreaterThan(0);
  });

  test('empty state hidden when results exist', () => {
    const emptyState = document.getElementById('promptGalleryEmpty');
    expect(emptyState.hidden).toBe(true);
  });
});
