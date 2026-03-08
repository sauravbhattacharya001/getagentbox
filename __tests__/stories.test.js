/**
 * @jest-environment jsdom
 */

/* ── Success Stories tests ───────────────────────────── */

beforeEach(() => {
  document.body.innerHTML = `
    <div class="stories-section" id="storiesSection">
      <div class="stories-filters" role="tablist">
        <button class="stories-filter active" role="tab" aria-selected="true" data-category="all">All</button>
        <button class="stories-filter" role="tab" aria-selected="false" data-category="productivity">Productivity</button>
        <button class="stories-filter" role="tab" aria-selected="false" data-category="developer">Developer</button>
        <button class="stories-filter" role="tab" aria-selected="false" data-category="creative">Creative</button>
        <button class="stories-filter" role="tab" aria-selected="false" data-category="business">Business</button>
      </div>
      <div class="stories-grid" id="storiesGrid" role="list"></div>
    </div>
  `;
  jest.resetModules();
  require('../app.js');
  // DOMContentLoaded already fires in JSDOM before require completes;
  // Manually init if cards not rendered
  if (!document.querySelector('.story-card')) {
    window.SuccessStories.init();
  }
});

/* ── Rendering ───────────────────────────── */

test('renders all story cards', () => {
  const cards = document.querySelectorAll('.story-card');
  expect(cards.length).toBe(window.SuccessStories.STORIES.length);
  expect(cards.length).toBeGreaterThanOrEqual(6);
});

test('each card has required elements', () => {
  const cards = document.querySelectorAll('.story-card');
  cards.forEach(card => {
    expect(card.querySelector('.story-card-title')).toBeTruthy();
    expect(card.querySelector('.story-card-persona')).toBeTruthy();
    expect(card.querySelector('.story-card-problem')).toBeTruthy();
    expect(card.querySelector('.story-metric')).toBeTruthy();
    expect(card.querySelector('.story-detail')).toBeTruthy();
    expect(card.querySelector('.story-expand-icon')).toBeTruthy();
  });
});

test('cards have category data attribute', () => {
  const cards = document.querySelectorAll('.story-card');
  const validCats = ['productivity', 'developer', 'creative', 'business'];
  cards.forEach(card => {
    expect(validCats).toContain(card.getAttribute('data-category'));
  });
});

test('each card has persona avatar with emoji', () => {
  const avatars = document.querySelectorAll('.story-persona-avatar');
  avatars.forEach(a => {
    expect(a.textContent.length).toBeGreaterThan(0);
  });
});

test('category badges are rendered', () => {
  const badges = document.querySelectorAll('.story-category-badge');
  expect(badges.length).toBe(window.SuccessStories.STORIES.length);
  badges.forEach(b => {
    expect(b.getAttribute('data-cat')).toBeTruthy();
  });
});

/* ── Expand/collapse ─────────────────────── */

test('cards start collapsed', () => {
  const cards = document.querySelectorAll('.story-card');
  cards.forEach(card => {
    expect(card.classList.contains('story-expanded')).toBe(false);
    expect(card.getAttribute('aria-expanded')).toBe('false');
  });
});

test('clicking a card expands it', () => {
  const card = document.querySelector('.story-card');
  card.click();
  expect(card.classList.contains('story-expanded')).toBe(true);
  expect(card.getAttribute('aria-expanded')).toBe('true');
});

test('clicking expanded card collapses it', () => {
  const card = document.querySelector('.story-card');
  card.click(); // expand
  card.click(); // collapse
  expect(card.classList.contains('story-expanded')).toBe(false);
  expect(card.getAttribute('aria-expanded')).toBe('false');
});

test('only one card expanded at a time', () => {
  const cards = document.querySelectorAll('.story-card');
  cards[0].click();
  cards[1].click();
  expect(cards[0].classList.contains('story-expanded')).toBe(false);
  expect(cards[1].classList.contains('story-expanded')).toBe(true);
});

test('Enter key toggles expansion', () => {
  const card = document.querySelector('.story-card');
  card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(card.classList.contains('story-expanded')).toBe(true);
});

test('Space key toggles expansion', () => {
  const card = document.querySelector('.story-card');
  card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  expect(card.classList.contains('story-expanded')).toBe(true);
});

/* ── Flow steps in expanded view ─────────── */

test('expanded card has 3 flow steps', () => {
  const card = document.querySelector('.story-card');
  card.click();
  const steps = card.querySelectorAll('.story-flow-step');
  expect(steps.length).toBe(3);
});

test('flow steps have correct labels', () => {
  const card = document.querySelector('.story-card');
  card.click();
  const labels = card.querySelectorAll('.story-flow-label');
  expect(labels[0].textContent).toBe('The Problem');
  expect(labels[1].textContent).toBe('AgentBox Steps In');
  expect(labels[2].textContent).toBe('The Result');
});

test('flow steps have dot indicators', () => {
  const card = document.querySelector('.story-card');
  card.click();
  const dots = card.querySelectorAll('.story-flow-dot');
  expect(dots.length).toBe(3);
  expect(dots[0].classList.contains('step-problem')).toBe(true);
  expect(dots[1].classList.contains('step-action')).toBe(true);
  expect(dots[2].classList.contains('step-result')).toBe(true);
});

/* ── Outcome stats ───────────────────────── */

test('expanded card shows outcome stats', () => {
  const card = document.querySelector('.story-card');
  card.click();
  const stats = card.querySelectorAll('.story-outcome-stat');
  expect(stats.length).toBe(3);
});

test('outcome stats have values and descriptions', () => {
  const card = document.querySelector('.story-card');
  card.click();
  const stats = card.querySelectorAll('.story-outcome-stat');
  stats.forEach(stat => {
    expect(stat.querySelector('.story-outcome-number').textContent.length).toBeGreaterThan(0);
    expect(stat.querySelector('.story-outcome-desc').textContent.length).toBeGreaterThan(0);
  });
});

/* ── Filtering ───────────────────────────── */

test('filter buttons exist for all categories', () => {
  const filters = document.querySelectorAll('.stories-filter');
  const cats = Array.from(filters).map(f => f.getAttribute('data-category'));
  expect(cats).toContain('all');
  expect(cats).toContain('productivity');
  expect(cats).toContain('developer');
  expect(cats).toContain('creative');
  expect(cats).toContain('business');
});

test('clicking filter shows only matching cards', () => {
  const devBtn = document.querySelector('[data-category="developer"]');
  devBtn.click();

  const visible = document.querySelectorAll('.story-card:not(.story-hidden)');
  const hidden = document.querySelectorAll('.story-card.story-hidden');

  visible.forEach(card => {
    expect(card.getAttribute('data-category')).toBe('developer');
  });

  hidden.forEach(card => {
    expect(card.getAttribute('data-category')).not.toBe('developer');
  });

  expect(visible.length).toBeGreaterThan(0);
  expect(hidden.length).toBeGreaterThan(0);
});

test('clicking All filter shows all cards', () => {
  // First filter to a category
  document.querySelector('[data-category="creative"]').click();
  // Then click All
  document.querySelector('[data-category="all"]').click();

  const hidden = document.querySelectorAll('.story-card.story-hidden');
  expect(hidden.length).toBe(0);
});

test('filter updates active state', () => {
  const prodBtn = document.querySelector('[data-category="productivity"]');
  prodBtn.click();

  expect(prodBtn.classList.contains('active')).toBe(true);
  expect(prodBtn.getAttribute('aria-selected')).toBe('true');

  const allBtn = document.querySelector('[data-category="all"]');
  expect(allBtn.classList.contains('active')).toBe(false);
  expect(allBtn.getAttribute('aria-selected')).toBe('false');
});

test('filtering collapses expanded cards in hidden category', () => {
  // Expand a productivity story card
  const prodCards = document.querySelectorAll('.story-card[data-category="productivity"]');
  prodCards[0].click();
  expect(prodCards[0].classList.contains('story-expanded')).toBe(true);

  // Filter to developer
  document.querySelector('.stories-filter[data-category="developer"]').click();

  expect(prodCards[0].classList.contains('story-expanded')).toBe(false);
});

test('getActiveFilter returns current filter', () => {
  expect(window.SuccessStories.getActiveFilter()).toBe('all');
  document.querySelector('[data-category="business"]').click();
  expect(window.SuccessStories.getActiveFilter()).toBe('business');
});

/* ── Accessibility ───────────────────────── */

test('cards are keyboard focusable', () => {
  const cards = document.querySelectorAll('.story-card');
  cards.forEach(card => {
    expect(card.getAttribute('tabindex')).toBe('0');
  });
});

test('cards have role=listitem', () => {
  const cards = document.querySelectorAll('.story-card');
  cards.forEach(card => {
    expect(card.getAttribute('role')).toBe('listitem');
  });
});

test('grid has role=list', () => {
  const grid = document.getElementById('storiesGrid');
  expect(grid.getAttribute('role')).toBe('list');
});

test('filter buttons have role=tab', () => {
  const filters = document.querySelectorAll('.stories-filter');
  filters.forEach(f => {
    expect(f.getAttribute('role')).toBe('tab');
  });
});

/* ── Data integrity ──────────────────────── */

test('all stories have required fields', () => {
  window.SuccessStories.STORIES.forEach(story => {
    expect(story.id).toBeTruthy();
    expect(story.category).toBeTruthy();
    expect(story.title).toBeTruthy();
    expect(story.persona).toBeTruthy();
    expect(story.persona.name).toBeTruthy();
    expect(story.persona.role).toBeTruthy();
    expect(story.persona.emoji).toBeTruthy();
    expect(story.problem).toBeTruthy();
    expect(story.flow).toHaveLength(3);
    expect(story.metrics).toHaveLength(3);
    expect(story.highlight).toBeTruthy();
  });
});

test('story IDs are unique', () => {
  const ids = window.SuccessStories.STORIES.map(s => s.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('flow steps are problem → action → result', () => {
  window.SuccessStories.STORIES.forEach(story => {
    expect(story.flow[0].type).toBe('problem');
    expect(story.flow[1].type).toBe('action');
    expect(story.flow[2].type).toBe('result');
  });
});

test('getStories returns a copy', () => {
  const stories = window.SuccessStories.getStories();
  stories.pop();
  expect(stories.length).toBeLessThan(window.SuccessStories.STORIES.length);
});
