/**
 * @jest-environment jsdom
 */

/* ── Community Showcase tests ───────────────────────────── */

beforeEach(() => {
  document.body.innerHTML = `
    <section class="section showcase-section" id="showcaseSection" aria-labelledby="showcaseTitle">
        <h2 class="section-title" id="showcaseTitle">Community Showcase</h2>
        <p class="section-subtitle">See what others are building with AgentBox</p>
        <div class="showcase-controls">
            <div class="showcase-filter-row" role="tablist" aria-label="Filter by category">
                <button class="showcase-filter active" role="tab" aria-selected="true" data-category="All">All</button>
                <button class="showcase-filter" role="tab" aria-selected="false" data-category="Productivity">Productivity</button>
                <button class="showcase-filter" role="tab" aria-selected="false" data-category="Developer">Developer</button>
                <button class="showcase-filter" role="tab" aria-selected="false" data-category="Creative">Creative</button>
                <button class="showcase-filter" role="tab" aria-selected="false" data-category="Business">Business</button>
                <button class="showcase-filter" role="tab" aria-selected="false" data-category="Research">Research</button>
            </div>
            <div class="showcase-actions">
                <div class="showcase-sort-group" role="group" aria-label="Sort order">
                    <button class="showcase-sort-btn active" data-sort="popular" aria-pressed="true">Popular</button>
                    <button class="showcase-sort-btn" data-sort="newest" aria-pressed="false">Newest</button>
                </div>
                <span class="showcase-count" id="showcaseCount" aria-live="polite">10 projects</span>
                <button class="showcase-submit-trigger" id="showcaseSubmitBtn">Share Your Project</button>
            </div>
        </div>
        <div class="showcase-grid" id="showcaseGrid" role="list" aria-label="Community projects"></div>
    </section>
  `;
  localStorage.clear();
  jest.resetModules();
  require('../app.js');
  if (!document.querySelector('.showcase-card')) {
    window.CommunityShowcase.init();
  }
});

/* ── Rendering ───────────────────────────── */

test('renders all 10 seed showcases', () => {
  const cards = document.querySelectorAll('.showcase-card');
  expect(cards.length).toBe(10);
});

test('each card has title, description, author', () => {
  const cards = document.querySelectorAll('.showcase-card');
  cards.forEach(card => {
    expect(card.querySelector('.showcase-title')).toBeTruthy();
    expect(card.querySelector('.showcase-desc')).toBeTruthy();
    expect(card.querySelector('.showcase-author')).toBeTruthy();
  });
});

test('each card has like button with count', () => {
  const btns = document.querySelectorAll('.showcase-like-btn');
  expect(btns.length).toBe(10);
  btns.forEach(btn => {
    expect(btn.querySelector('.showcase-like-count')).toBeTruthy();
  });
});

test('each card has category badge', () => {
  const badges = document.querySelectorAll('.showcase-category-badge');
  expect(badges.length).toBe(10);
});

test('each card has tags', () => {
  const cards = document.querySelectorAll('.showcase-card');
  cards.forEach(card => {
    expect(card.querySelectorAll('.showcase-tag').length).toBeGreaterThan(0);
  });
});

test('displays project count', () => {
  const count = document.getElementById('showcaseCount');
  expect(count.textContent).toBe('10 projects');
});

/* ── Filtering ───────────────────────────── */

test('filter by Productivity shows only productivity cards', () => {
  window.CommunityShowcase.filter('Productivity');
  const cards = document.querySelectorAll('.showcase-card');
  cards.forEach(card => {
    expect(card.getAttribute('data-category')).toBe('Productivity');
  });
  expect(cards.length).toBeGreaterThan(0);
  expect(cards.length).toBeLessThan(10);
});

test('filter by Developer shows developer cards', () => {
  window.CommunityShowcase.filter('Developer');
  const cards = document.querySelectorAll('.showcase-card');
  cards.forEach(card => {
    expect(card.getAttribute('data-category')).toBe('Developer');
  });
  expect(cards.length).toBe(2); // PR Review Copilot + Codebase Documentation Bot
});

test('filter by All shows all cards', () => {
  window.CommunityShowcase.filter('Developer');
  window.CommunityShowcase.filter('All');
  expect(document.querySelectorAll('.showcase-card').length).toBe(10);
});

test('filter updates active state on buttons', () => {
  window.CommunityShowcase.filter('Creative');
  const filters = document.querySelectorAll('.showcase-filter');
  let activeFilter = null;
  filters.forEach(f => {
    if (f.classList.contains('active')) activeFilter = f;
  });
  expect(activeFilter.getAttribute('data-category')).toBe('Creative');
});

test('filter updates project count', () => {
  window.CommunityShowcase.filter('Research');
  const count = document.getElementById('showcaseCount');
  expect(count.textContent).toBe('2 projects');
});

test('empty category shows empty message', () => {
  // Internal showcases have no "Education" category
  window.CommunityShowcase.filter('Education');
  const empty = document.querySelector('.showcase-empty');
  expect(empty).toBeTruthy();
});

/* ── Sorting ─────────────────────────────── */

test('sort by popular puts highest-liked first', () => {
  window.CommunityShowcase.sort('popular');
  const counts = Array.from(document.querySelectorAll('.showcase-like-count'))
    .map(el => parseInt(el.textContent));
  for (let i = 1; i < counts.length; i++) {
    expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
  }
});

test('sort by newest puts most recent date first', () => {
  window.CommunityShowcase.sort('newest');
  const dates = Array.from(document.querySelectorAll('.showcase-date'))
    .map(el => el.textContent);
  // First card should be Mar 7 (most recent)
  expect(dates[0]).toContain('Mar');
});

test('sort updates active button state', () => {
  window.CommunityShowcase.sort('newest');
  const sortBtns = document.querySelectorAll('.showcase-sort-btn');
  let activeSort = null;
  sortBtns.forEach(b => {
    if (b.classList.contains('active')) activeSort = b;
  });
  expect(activeSort.getAttribute('data-sort')).toBe('newest');
});

/* ── Liking ──────────────────────────────── */

test('clicking like button toggles liked state', () => {
  const btn = document.querySelector('.showcase-like-btn');
  const id = btn.getAttribute('data-id');
  expect(btn.classList.contains('liked')).toBe(false);

  window.CommunityShowcase.toggleLike(id);
  const updatedBtn = document.querySelector('[data-id="' + id + '"].showcase-like-btn');
  expect(updatedBtn.classList.contains('liked')).toBe(true);
});

test('liking increases count by 1', () => {
  const btn = document.querySelector('.showcase-like-btn');
  const id = btn.getAttribute('data-id');
  const before = parseInt(btn.querySelector('.showcase-like-count').textContent);

  window.CommunityShowcase.toggleLike(id);
  const after = parseInt(document.querySelector('[data-id="' + id + '"] .showcase-like-count').textContent);
  expect(after).toBe(before + 1);
});

test('unliking decreases count back', () => {
  const btn = document.querySelector('.showcase-like-btn');
  const id = btn.getAttribute('data-id');
  const before = parseInt(btn.querySelector('.showcase-like-count').textContent);

  window.CommunityShowcase.toggleLike(id);
  window.CommunityShowcase.toggleLike(id);
  const after = parseInt(document.querySelector('[data-id="' + id + '"] .showcase-like-count').textContent);
  expect(after).toBe(before);
});

test('likes persist in localStorage', () => {
  const showcases = window.CommunityShowcase.getShowcases();
  window.CommunityShowcase.toggleLike(showcases[0].id);

  const stored = JSON.parse(localStorage.getItem('agentbox_showcase_likes'));
  expect(stored[showcases[0].id]).toBe(true);
});

test('getLikedIds returns liked IDs', () => {
  const showcases = window.CommunityShowcase.getShowcases();
  window.CommunityShowcase.toggleLike(showcases[0].id);
  window.CommunityShowcase.toggleLike(showcases[2].id);

  const liked = window.CommunityShowcase.getLikedIds();
  expect(liked).toContain(showcases[0].id);
  expect(liked).toContain(showcases[2].id);
  expect(liked.length).toBe(2);
});

/* ── Submit Modal ────────────────────────── */

test('submit button opens modal', () => {
  window.CommunityShowcase.showSubmitModal();
  const modal = document.getElementById('showcaseModal');
  expect(modal).toBeTruthy();
  expect(modal.getAttribute('role')).toBe('dialog');
});

test('modal has required form fields', () => {
  window.CommunityShowcase.showSubmitModal();
  expect(document.getElementById('scTitle')).toBeTruthy();
  expect(document.getElementById('scAuthor')).toBeTruthy();
  expect(document.getElementById('scCategory')).toBeTruthy();
  expect(document.getElementById('scDesc')).toBeTruthy();
  expect(document.getElementById('scTags')).toBeTruthy();
});

test('modal close button removes modal', () => {
  window.CommunityShowcase.showSubmitModal();
  expect(document.getElementById('showcaseModal')).toBeTruthy();

  window.CommunityShowcase.closeModal();
  expect(document.getElementById('showcaseModal')).toBeFalsy();
});

test('submitting form adds new showcase card', () => {
  jest.useFakeTimers();
  window.CommunityShowcase.showSubmitModal();

  document.getElementById('scTitle').value = 'Test Project';
  document.getElementById('scAuthor').value = 'Test User';
  document.getElementById('scCategory').value = 'Developer';
  document.getElementById('scDesc').value = 'A test project for testing';
  document.getElementById('scTags').value = 'Test, Jest';

  document.getElementById('showcaseForm').dispatchEvent(new Event('submit'));

  // Toast should show
  const toast = document.getElementById('showcaseToast');
  expect(toast.classList.contains('visible')).toBe(true);

  // Advance past the close timer
  jest.advanceTimersByTime(2000);

  // New card should be in the grid
  const showcases = window.CommunityShowcase.getShowcases();
  expect(showcases[0].title).toBe('Test Project');
  expect(showcases.length).toBe(11);

  jest.useRealTimers();
});

/* ── Accessibility ───────────────────────── */

test('filter buttons have role=tab and aria-selected', () => {
  const filters = document.querySelectorAll('.showcase-filter');
  filters.forEach(f => {
    expect(f.getAttribute('role')).toBe('tab');
    expect(f.hasAttribute('aria-selected')).toBe(true);
  });
});

test('sort buttons have aria-pressed', () => {
  const sortBtns = document.querySelectorAll('.showcase-sort-btn');
  sortBtns.forEach(b => {
    expect(b.hasAttribute('aria-pressed')).toBe(true);
  });
});

test('like buttons have aria-label and aria-pressed', () => {
  const btns = document.querySelectorAll('.showcase-like-btn');
  btns.forEach(btn => {
    expect(btn.hasAttribute('aria-label')).toBe(true);
    expect(btn.hasAttribute('aria-pressed')).toBe(true);
  });
});

test('grid has role=list', () => {
  const grid = document.getElementById('showcaseGrid');
  expect(grid.getAttribute('role')).toBe('list');
});

test('count has aria-live=polite', () => {
  const count = document.getElementById('showcaseCount');
  expect(count.getAttribute('aria-live')).toBe('polite');
});

/* ── Click handlers ──────────────────────── */

test('clicking filter button updates category', () => {
  const devFilter = Array.from(document.querySelectorAll('.showcase-filter'))
    .find(f => f.getAttribute('data-category') === 'Developer');
  devFilter.click();

  const cards = document.querySelectorAll('.showcase-card');
  cards.forEach(card => {
    expect(card.getAttribute('data-category')).toBe('Developer');
  });
});

test('clicking sort button updates order', () => {
  const newestBtn = Array.from(document.querySelectorAll('.showcase-sort-btn'))
    .find(b => b.getAttribute('data-sort') === 'newest');
  newestBtn.click();

  expect(newestBtn.classList.contains('active')).toBe(true);
});

test('clicking like button on card toggles like', () => {
  const likeBtn = document.querySelector('.showcase-like-btn');
  likeBtn.click();
  // After click, re-render happens, find same ID
  const id = likeBtn.getAttribute('data-id');
  const updatedBtn = document.querySelector('[data-id="' + id + '"].showcase-like-btn');
  expect(updatedBtn.classList.contains('liked')).toBe(true);
});
