/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Load dependency sources
const domUtilsSrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'modules', 'dom-utils.js'),
  'utf8'
);
const storageSrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'modules', 'storage.js'),
  'utf8'
);
const featureBoardSrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'modules', 'feature-board.js'),
  'utf8'
);

function buildDOM() {
  document.body.innerHTML = `
    <div id="featureBoardList" role="list"></div>
    <button class="fb-filter active" data-filter="all" aria-pressed="true">All</button>
    <button class="fb-filter" data-filter="popular" aria-pressed="false">Popular</button>
    <button class="fb-filter" data-filter="new" aria-pressed="false">New</button>
    <button class="fb-filter" data-filter="planned" aria-pressed="false">Planned</button>
    <button id="fbSuggestBtn">Suggest</button>
    <div id="fbSuggestForm" hidden>
      <input id="fbFormTitle" type="text" value="" />
      <textarea id="fbFormDesc"></textarea>
      <select id="fbFormCategory"><option value="feature">Feature</option><option value="ux">UX</option></select>
      <button id="fbFormSubmit">Submit</button>
      <button id="fbFormClose">Close</button>
      <div id="fbFormBackdrop"></div>
    </div>
    <div id="fbToast" hidden></div>
  `;
}

function loadModule() {
  const domFn = new Function(domUtilsSrc + '\nreturn DOMUtil;');
  global.DOMUtil = domFn();
  const storageFn = new Function(storageSrc + '\nreturn StorageUtil;');
  global.StorageUtil = storageFn();
  const fn = new Function('DOMUtil', 'StorageUtil', featureBoardSrc + '\nreturn FeatureBoard;');
  return fn(global.DOMUtil, global.StorageUtil);
}

describe('FeatureBoard', () => {
  let FB;

  beforeEach(() => {
    localStorage.clear();
    buildDOM();
    FB = loadModule();
    FB.init();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    delete global.DOMUtil;
    delete global.StorageUtil;
  });

  // ─── Initialization & Rendering ───────────────────────────────
  test('init renders all 12 seed features', () => {
    const cards = document.querySelectorAll('.fb-card');
    expect(cards.length).toBe(12);
  });

  test('getFeatures returns array of all features', () => {
    const features = FB.getFeatures();
    expect(features.length).toBe(12);
    expect(features[0]).toHaveProperty('id');
    expect(features[0]).toHaveProperty('title');
    expect(features[0]).toHaveProperty('votes');
  });

  test('cards are sorted by votes descending', () => {
    const counts = Array.from(document.querySelectorAll('.fb-vote-count'))
      .map(el => parseInt(el.textContent, 10));
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    }
  });

  test('each card has a vote button with aria-label', () => {
    const btns = document.querySelectorAll('.fb-vote-btn');
    expect(btns.length).toBe(12);
    btns.forEach(btn => {
      expect(btn.getAttribute('aria-label')).toContain('Vote for');
    });
  });

  test('cards display status badges', () => {
    const badges = document.querySelectorAll('.fb-card-badge');
    expect(badges.length).toBe(12);
    const labels = Array.from(badges).map(b => b.textContent);
    expect(labels).toContain('Planned');
    expect(labels).toContain('Building');
    expect(labels).toContain('Shipped');
    expect(labels).toContain('New');
  });

  test('cards display category icons', () => {
    const tags = document.querySelectorAll('.fb-category-tag');
    expect(tags.length).toBe(12);
    const text = Array.from(tags).map(t => t.textContent).join(' ');
    expect(text).toContain('🔗'); // integration
    expect(text).toContain('⚡'); // feature
    expect(text).toContain('🎨'); // ux
    expect(text).toContain('📱'); // platform
  });

  // ─── Voting ───────────────────────────────────────────────────
  test('clicking vote button increments the vote count', () => {
    const firstVoteBtn = document.querySelector('.fb-vote-btn');
    const countEl = firstVoteBtn.querySelector('.fb-vote-count');
    const before = parseInt(countEl.textContent, 10);
    firstVoteBtn.click();
    // Re-render happens, get fresh element
    const newCountEl = document.querySelector('.fb-vote-btn .fb-vote-count');
    const after = parseInt(newCountEl.textContent, 10);
    expect(after).toBe(before + 1);
  });

  test('voting adds voted class to button', () => {
    const firstVoteBtn = document.querySelector('.fb-vote-btn');
    const id = firstVoteBtn.getAttribute('data-id');
    firstVoteBtn.click();
    const updatedBtn = document.querySelector(`[data-id="${id}"] .fb-vote-btn, .fb-vote-btn[data-id="${id}"]`);
    expect(updatedBtn.classList.contains('voted')).toBe(true);
  });

  test('clicking vote twice toggles vote off', () => {
    const firstCard = document.querySelector('.fb-card');
    const id = firstCard.getAttribute('data-id');
    const voteBtn = firstCard.querySelector('.fb-vote-btn');
    const originalCount = parseInt(voteBtn.querySelector('.fb-vote-count').textContent, 10);

    voteBtn.click(); // vote
    voteBtn.click(); // unvote (re-rendered, need fresh ref)

    // After re-render find the card again
    const card = document.querySelector(`[data-id="${id}"]`);
    const count = parseInt(card.querySelector('.fb-vote-count').textContent, 10);
    expect(count).toBe(originalCount);
  });

  test('votes persist in localStorage', () => {
    const firstVoteBtn = document.querySelector('.fb-vote-btn');
    const id = firstVoteBtn.getAttribute('data-id');
    firstVoteBtn.click();

    const stored = JSON.parse(localStorage.getItem('agentbox_feature_votes'));
    expect(stored[id]).toBe(true);
  });

  test('votes are restored from localStorage on init', () => {
    localStorage.setItem('agentbox_feature_votes', JSON.stringify({ 'calendar-sync': true }));
    document.body.innerHTML = '';
    buildDOM();
    FB = loadModule();
    FB.init();

    const votes = FB.getVotes();
    expect(votes['calendar-sync']).toBe(true);
  });

  // ─── Filters ──────────────────────────────────────────────────
  test('default filter is "all"', () => {
    expect(FB.getFilter()).toBe('all');
  });

  test('clicking "popular" filter shows top 6 features', () => {
    const popularBtn = document.querySelector('[data-filter="popular"]');
    popularBtn.click();
    const cards = document.querySelectorAll('.fb-card');
    expect(cards.length).toBe(6);
    expect(FB.getFilter()).toBe('popular');
  });

  test('clicking "new" filter shows only new-status features', () => {
    const newBtn = document.querySelector('[data-filter="new"]');
    newBtn.click();
    const cards = document.querySelectorAll('.fb-card');
    // Count features with status "new" in seed data
    const badges = document.querySelectorAll('.fb-card-badge');
    badges.forEach(b => expect(b.textContent).toBe('New'));
    expect(cards.length).toBeGreaterThan(0);
  });

  test('clicking "planned" filter shows planned and building features', () => {
    const plannedBtn = document.querySelector('[data-filter="planned"]');
    plannedBtn.click();
    const badges = document.querySelectorAll('.fb-card-badge');
    badges.forEach(b => {
      expect(['Planned', 'Building']).toContain(b.textContent);
    });
  });

  test('filter button gets active class and aria-pressed', () => {
    const popularBtn = document.querySelector('[data-filter="popular"]');
    popularBtn.click();
    expect(popularBtn.classList.contains('active')).toBe(true);
    expect(popularBtn.getAttribute('aria-pressed')).toBe('true');
    // "all" should no longer be active
    const allBtn = document.querySelector('[data-filter="all"]');
    expect(allBtn.classList.contains('active')).toBe(false);
    expect(allBtn.getAttribute('aria-pressed')).toBe('false');
  });

  test('clicking "all" after another filter shows all features', () => {
    document.querySelector('[data-filter="popular"]').click();
    expect(document.querySelectorAll('.fb-card').length).toBe(6);
    document.querySelector('[data-filter="all"]').click();
    expect(document.querySelectorAll('.fb-card').length).toBe(12);
  });

  // ─── Suggest Feature Form ─────────────────────────────────────
  test('suggest button opens the form', () => {
    const form = document.getElementById('fbSuggestForm');
    expect(form.hidden).toBe(true);
    document.getElementById('fbSuggestBtn').click();
    expect(form.hidden).toBe(false);
  });

  test('close button hides the form', () => {
    document.getElementById('fbSuggestBtn').click();
    document.getElementById('fbFormClose').click();
    expect(document.getElementById('fbSuggestForm').hidden).toBe(true);
  });

  test('backdrop click hides the form', () => {
    document.getElementById('fbSuggestBtn').click();
    document.getElementById('fbFormBackdrop').click();
    expect(document.getElementById('fbSuggestForm').hidden).toBe(true);
  });

  test('submitting a suggestion adds it to the board', () => {
    document.getElementById('fbSuggestBtn').click();
    document.getElementById('fbFormTitle').value = 'Dark mode for mobile';
    document.getElementById('fbFormDesc').value = 'OLED-friendly dark theme';
    document.getElementById('fbFormSubmit').click();

    const features = FB.getFeatures();
    const custom = features.find(f => f.title === 'Dark mode for mobile');
    expect(custom).toBeDefined();
    expect(custom.description).toBe('OLED-friendly dark theme');
    expect(custom.category).toBe('feature');
    expect(custom.status).toBe('new');
    expect(custom.votes).toBe(1);
  });

  test('submitted suggestion appears in the card list', () => {
    document.getElementById('fbSuggestBtn').click();
    document.getElementById('fbFormTitle').value = 'Export to Notion';
    document.getElementById('fbFormSubmit').click();

    const cards = document.querySelectorAll('.fb-card');
    const texts = Array.from(cards).map(c => c.textContent);
    expect(texts.some(t => t.includes('Export to Notion'))).toBe(true);
  });

  test('submitted suggestion auto-votes for the user', () => {
    document.getElementById('fbSuggestBtn').click();
    document.getElementById('fbFormTitle').value = 'API v2';
    document.getElementById('fbFormSubmit').click();

    const features = FB.getFeatures();
    const custom = features.find(f => f.title === 'API v2');
    const votes = FB.getVotes();
    expect(votes[custom.id]).toBe(true);
  });

  test('submitted suggestion persists in localStorage', () => {
    document.getElementById('fbSuggestBtn').click();
    document.getElementById('fbFormTitle').value = 'SSO Login';
    document.getElementById('fbFormSubmit').click();

    const stored = JSON.parse(localStorage.getItem('agentbox_feature_custom'));
    expect(stored.length).toBe(1);
    expect(stored[0].title).toBe('SSO Login');
  });

  test('custom features load from localStorage on init', () => {
    const customs = [{ id: 'custom-999', title: 'Test Feature', description: '', category: 'ux', status: 'new', votes: 5, createdAt: '2026-04-01' }];
    localStorage.setItem('agentbox_feature_custom', JSON.stringify(customs));
    document.body.innerHTML = '';
    buildDOM();
    FB = loadModule();
    FB.init();

    const features = FB.getFeatures();
    expect(features.find(f => f.id === 'custom-999')).toBeDefined();
    expect(document.querySelectorAll('.fb-card').length).toBe(13);
  });

  test('empty title does not submit', () => {
    document.getElementById('fbSuggestBtn').click();
    document.getElementById('fbFormTitle').value = '   ';
    document.getElementById('fbFormSubmit').click();
    expect(FB.getFeatures().length).toBe(12); // unchanged
  });

  test('Enter key on title input submits', () => {
    document.getElementById('fbSuggestBtn').click();
    const titleInput = document.getElementById('fbFormTitle');
    titleInput.value = 'Keyboard shortcuts';
    titleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(FB.getFeatures().find(f => f.title === 'Keyboard shortcuts')).toBeDefined();
  });

  test('form is hidden after successful submission', () => {
    document.getElementById('fbSuggestBtn').click();
    document.getElementById('fbFormTitle').value = 'Widgets v2';
    document.getElementById('fbFormSubmit').click();
    expect(document.getElementById('fbSuggestForm').hidden).toBe(true);
  });

  test('toast shows after submission', () => {
    jest.useFakeTimers();
    document.getElementById('fbSuggestBtn').click();
    document.getElementById('fbFormTitle').value = 'Webhooks';
    document.getElementById('fbFormSubmit').click();
    const toast = document.getElementById('fbToast');
    expect(toast.hidden).toBe(false);
    expect(toast.textContent).toContain('Thanks');
    jest.advanceTimersByTime(4000);
    expect(toast.hidden).toBe(true);
    jest.useRealTimers();
  });

  // ─── XSS ──────────────────────────────────────────────────────
  test('feature titles are HTML-escaped in card body', () => {
    document.getElementById('fbSuggestBtn').click();
    document.getElementById('fbFormTitle').value = '<img onerror=alert(1)>';
    document.getElementById('fbFormSubmit').click();
    // The card title text content should show the raw string (not execute as HTML)
    const titleSpans = document.querySelectorAll('.fb-card-title');
    const customTitle = Array.from(titleSpans).find(s => s.textContent.includes('<img'));
    expect(customTitle).toBeDefined();
    // The innerHTML of the title span should have escaped entities
    expect(customTitle.innerHTML).toContain('&lt;img');
    expect(customTitle.innerHTML).not.toContain('<img onerror');
  });

  // ─── Edge cases ───────────────────────────────────────────────
  test('duplicate custom features are not added twice', () => {
    const customs = [{ id: 'calendar-sync', title: 'Dupe', description: '', category: 'feature', status: 'new', votes: 1, createdAt: '2026-04-01' }];
    localStorage.setItem('agentbox_feature_custom', JSON.stringify(customs));
    document.body.innerHTML = '';
    buildDOM();
    FB = loadModule();
    FB.init();
    // Should still be 12, not 13 (duplicate id skipped)
    expect(FB.getFeatures().length).toBe(12);
  });

  test('init does not throw when board list element is absent', () => {
    document.body.innerHTML = '<div></div>';
    const mod = loadModule();
    expect(() => mod.init()).not.toThrow();
  });

  test('malformed localStorage votes are safely handled', () => {
    localStorage.setItem('agentbox_feature_votes', 'not-json');
    document.body.innerHTML = '';
    buildDOM();
    FB = loadModule();
    expect(() => FB.init()).not.toThrow();
    expect(FB.getVotes()).toEqual({});
  });

  test('malformed localStorage custom features are safely handled', () => {
    localStorage.setItem('agentbox_feature_custom', '{"not":"array"}');
    document.body.innerHTML = '';
    buildDOM();
    FB = loadModule();
    expect(() => FB.init()).not.toThrow();
    expect(FB.getFeatures().length).toBe(12); // only seeds
  });
});
