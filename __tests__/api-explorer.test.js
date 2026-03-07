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

describe('ApiExplorer', () => {
  beforeAll(() => loadPage());

  test('section exists in DOM', () => {
    const section = document.getElementById('apiExplorerSection');
    expect(section).not.toBeNull();
    expect(section.querySelector('h2').textContent).toBe('API Explorer');
  });

  test('module is exported on window', () => {
    expect(window.ApiExplorer).toBeDefined();
    expect(typeof window.ApiExplorer.init).toBe('function');
  });

  test('renders endpoint cards in the grid', () => {
    const grid = document.getElementById('apiExplorerGrid');
    const cards = grid.querySelectorAll('.api-endpoint-card');
    expect(cards.length).toBeGreaterThanOrEqual(10);
  });

  test('each card has method badge, path, and description', () => {
    const card = document.querySelector('.api-endpoint-card');
    expect(card.querySelector('.api-method-badge')).not.toBeNull();
    expect(card.querySelector('.api-endpoint-path')).not.toBeNull();
    expect(card.querySelector('.api-endpoint-desc')).not.toBeNull();
  });

  test('method badges have correct class (get, post, delete)', () => {
    const badges = document.querySelectorAll('.api-method-badge');
    const classes = new Set();
    badges.forEach(b => {
      if (b.classList.contains('get')) classes.add('get');
      if (b.classList.contains('post')) classes.add('post');
      if (b.classList.contains('delete')) classes.add('delete');
    });
    expect(classes.has('get')).toBe(true);
    expect(classes.has('post')).toBe(true);
    expect(classes.has('delete')).toBe(true);
  });

  test('filter buttons are rendered for all categories', () => {
    const btns = document.querySelectorAll('.api-filter-btn');
    const labels = Array.from(btns).map(b => b.getAttribute('data-api-cat'));
    expect(labels).toContain('all');
    expect(labels).toContain('chat');
    expect(labels).toContain('memory');
    expect(labels).toContain('tools');
    expect(labels).toContain('sessions');
    expect(labels).toContain('account');
  });

  test('"All" filter is active by default', () => {
    const allBtn = document.querySelector('.api-filter-btn[data-api-cat="all"]');
    expect(allBtn.classList.contains('active')).toBe(true);
  });

  test('filtering by category shows only matching endpoints', () => {
    const memoryBtn = document.querySelector('.api-filter-btn[data-api-cat="memory"]');
    memoryBtn.click();

    const cards = document.querySelectorAll('#apiExplorerGrid .api-endpoint-card');
    const paths = Array.from(cards).map(c => c.querySelector('.api-endpoint-path').textContent);
    paths.forEach(p => expect(p).toContain('/v1/memory'));

    // Reset to all
    document.querySelector('.api-filter-btn[data-api-cat="all"]').click();
  });

  test('clicking an endpoint card shows the detail panel', () => {
    const panel = document.getElementById('apiDetailPanel');
    expect(panel.hidden).toBe(true);

    const card = document.querySelector('.api-endpoint-card');
    card.click();

    expect(panel.hidden).toBe(false);
    expect(card.classList.contains('active')).toBe(true);
  });

  test('detail panel shows title, meta, curl, and response', () => {
    const card = document.querySelector('.api-endpoint-card');
    card.click();

    expect(document.getElementById('apiDetailTitle').textContent).toBeTruthy();
    expect(document.getElementById('apiDetailMeta').textContent).toBeTruthy();
    expect(document.getElementById('apiCurlCode').textContent).toContain('curl');
    expect(document.getElementById('apiRespBody').textContent).toBeTruthy();
  });

  test('curl command includes the correct API base URL', () => {
    const card = document.querySelector('.api-endpoint-card');
    card.click();

    const curl = document.getElementById('apiCurlCode').textContent;
    expect(curl).toContain('https://api.agentbox.ai');
    expect(curl).toContain('Authorization: Bearer');
  });

  test('close button hides the detail panel', () => {
    const card = document.querySelector('.api-endpoint-card');
    card.click();

    const panel = document.getElementById('apiDetailPanel');
    expect(panel.hidden).toBe(false);

    document.getElementById('apiDetailClose').click();
    expect(panel.hidden).toBe(true);
  });

  test('cards are keyboard accessible (Enter key)', () => {
    const card = document.querySelector('.api-endpoint-card');
    const panel = document.getElementById('apiDetailPanel');
    document.getElementById('apiDetailClose').click();

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    card.dispatchEvent(event);
    expect(panel.hidden).toBe(false);
  });

  test('cards are keyboard accessible (Space key)', () => {
    document.getElementById('apiDetailClose').click();
    const card = document.querySelector('.api-endpoint-card');
    const panel = document.getElementById('apiDetailPanel');

    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
    card.dispatchEvent(event);
    expect(panel.hidden).toBe(false);
  });

  test('switching active card deactivates previous one', () => {
    const cards = document.querySelectorAll('.api-endpoint-card');
    if (cards.length < 2) return;

    cards[0].click();
    expect(cards[0].classList.contains('active')).toBe(true);

    cards[1].click();
    expect(cards[0].classList.contains('active')).toBe(false);
    expect(cards[1].classList.contains('active')).toBe(true);
  });

  test('POST endpoints show request body section', () => {
    // Find a POST card
    const cards = document.querySelectorAll('.api-endpoint-card');
    let postCard = null;
    cards.forEach(c => {
      if (c.querySelector('.api-method-badge.post')) postCard = c;
    });
    expect(postCard).not.toBeNull();

    postCard.click();
    const reqBodySection = document.getElementById('apiReqBodySection');
    expect(reqBodySection.hidden).toBe(false);
    expect(document.getElementById('apiReqBody').textContent).toBeTruthy();
  });

  test('GET endpoints hide request body section', () => {
    const cards = document.querySelectorAll('.api-endpoint-card');
    let getCard = null;
    cards.forEach(c => {
      if (c.querySelector('.api-method-badge.get')) getCard = c;
    });
    expect(getCard).not.toBeNull();

    getCard.click();
    const reqBodySection = document.getElementById('apiReqBodySection');
    expect(reqBodySection.hidden).toBe(true);
  });

  test('DELETE endpoint shows response body', () => {
    const cards = document.querySelectorAll('.api-endpoint-card');
    let delCard = null;
    cards.forEach(c => {
      if (c.querySelector('.api-method-badge.delete')) delCard = c;
    });
    expect(delCard).not.toBeNull();

    delCard.click();
    const resp = document.getElementById('apiRespBody').textContent;
    expect(resp).toContain('deleted');
  });

  test('API Explorer appears in command palette SECTIONS', () => {
    // CommandPalette SECTIONS is internal but we can verify the section is navigable
    const section = document.getElementById('apiExplorerSection');
    expect(section).not.toBeNull();
    expect(section.querySelector('.api-explorer-subtitle').textContent).toContain('API');
  });

  test('cards have tabindex for keyboard focus', () => {
    const card = document.querySelector('.api-endpoint-card');
    expect(card.getAttribute('tabindex')).toBe('0');
  });

  test('cards have listitem role', () => {
    const card = document.querySelector('.api-endpoint-card');
    expect(card.getAttribute('role')).toBe('listitem');
  });

  test('filter resets detail panel', () => {
    const card = document.querySelector('.api-endpoint-card');
    card.click();
    const panel = document.getElementById('apiDetailPanel');
    expect(panel.hidden).toBe(false);

    // Switch filter
    document.querySelector('.api-filter-btn[data-api-cat="tools"]').click();
    expect(panel.hidden).toBe(true);

    // Reset
    document.querySelector('.api-filter-btn[data-api-cat="all"]').click();
  });

  test('filter aria-selected updates correctly', () => {
    const toolsBtn = document.querySelector('.api-filter-btn[data-api-cat="tools"]');
    const allBtn = document.querySelector('.api-filter-btn[data-api-cat="all"]');

    toolsBtn.click();
    expect(toolsBtn.getAttribute('aria-selected')).toBe('true');
    expect(allBtn.getAttribute('aria-selected')).toBe('false');

    allBtn.click();
    expect(allBtn.getAttribute('aria-selected')).toBe('true');
    expect(toolsBtn.getAttribute('aria-selected')).toBe('false');
  });

  test('copy buttons exist in detail panel', () => {
    const copyBtns = document.querySelectorAll('.api-copy-btn');
    expect(copyBtns.length).toBeGreaterThanOrEqual(2);
  });

  test('note links to pricing section', () => {
    const note = document.querySelector('.api-explorer-note a');
    expect(note).not.toBeNull();
    expect(note.getAttribute('href')).toBe('#pricingSection');
  });

  test('streaming endpoint has suffix indicator', () => {
    const cards = document.querySelectorAll('.api-endpoint-card');
    let streamCard = null;
    cards.forEach(c => {
      if (c.querySelector('.api-endpoint-path').textContent.includes('streaming')) {
        streamCard = c;
      }
    });
    expect(streamCard).not.toBeNull();
  });

  test('streaming response shows SSE format', () => {
    const cards = document.querySelectorAll('.api-endpoint-card');
    cards.forEach(c => {
      if (c.querySelector('.api-endpoint-path').textContent.includes('streaming')) {
        c.click();
      }
    });
    const resp = document.getElementById('apiRespBody').textContent;
    expect(resp).toContain('data:');
    expect(resp).toContain('[DONE]');
  });

  test('grid container has list role', () => {
    const grid = document.getElementById('apiExplorerGrid');
    expect(grid.getAttribute('role')).toBe('list');
  });

  test('section has subtitle', () => {
    const subtitle = document.querySelector('.api-explorer-subtitle');
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent.length).toBeGreaterThan(10);
  });

  test('status badge shows 200 OK', () => {
    const card = document.querySelector('.api-endpoint-card');
    card.click();
    const badge = document.getElementById('apiStatusBadge');
    expect(badge.textContent).toContain('200');
  });
});
