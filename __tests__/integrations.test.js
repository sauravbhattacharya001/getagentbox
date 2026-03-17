/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Integration Directory', () => {
  let html;

  beforeEach(() => {
    html = fs.readFileSync(path.join(__dirname, '..', 'integrations.html'), 'utf8');
    document.documentElement.innerHTML = html;
    // Execute scripts
    const scripts = document.querySelectorAll('script');
    scripts.forEach(s => {
      if (s.textContent) eval(s.textContent);
    });
  });

  test('page renders with title', () => {
    expect(document.querySelector('.hero h1').textContent).toContain('Integration Directory');
  });

  test('renders all integration cards', () => {
    const cards = document.querySelectorAll('.card');
    expect(cards.length).toBe(24);
  });

  test('stats show correct total count', () => {
    expect(document.getElementById('total-count').textContent).toBe('24');
  });

  test('stats show correct GA count', () => {
    const gaCount = parseInt(document.getElementById('ga-count').textContent);
    expect(gaCount).toBeGreaterThan(0);
    expect(gaCount).toBeLessThanOrEqual(24);
  });

  test('filter buttons render for all categories plus All', () => {
    const buttons = document.querySelectorAll('.filter-btn');
    expect(buttons.length).toBe(7); // All + 6 categories
  });

  test('All filter is active by default', () => {
    const active = document.querySelector('.filter-btn.active');
    expect(active.dataset.cat).toBe('All');
  });

  test('clicking category filter shows only that category', () => {
    const aiBtn = [...document.querySelectorAll('.filter-btn')].find(b => b.textContent.includes('AI Models'));
    aiBtn.click();
    const cards = document.querySelectorAll('.card');
    expect(cards.length).toBe(4);
  });

  test('search filters cards by name', () => {
    const search = document.getElementById('search');
    search.value = 'openai';
    search.dispatchEvent(new Event('input'));
    const cards = document.querySelectorAll('.card');
    expect(cards.length).toBe(1);
  });

  test('search filters cards by description', () => {
    const search = document.getElementById('search');
    search.value = 'spreadsheet';
    search.dispatchEvent(new Event('input'));
    const cards = document.querySelectorAll('.card');
    expect(cards.length).toBe(1);
  });

  test('no results message shows for empty search', () => {
    const search = document.getElementById('search');
    search.value = 'xyznonexistent';
    search.dispatchEvent(new Event('input'));
    expect(document.getElementById('no-results').style.display).toBe('block');
  });

  test('clicking a card opens modal', () => {
    const card = document.querySelector('.card');
    card.click();
    expect(document.getElementById('modal-overlay').classList.contains('open')).toBe(true);
  });

  test('modal shows integration details', () => {
    const card = document.querySelector('.card');
    card.click();
    const content = document.getElementById('modal-content').textContent;
    expect(content.length).toBeGreaterThan(0);
  });

  test('modal close button works', () => {
    const card = document.querySelector('.card');
    card.click();
    document.getElementById('modal-close').click();
    expect(document.getElementById('modal-overlay').classList.contains('open')).toBe(false);
  });

  test('escape key closes modal', () => {
    const card = document.querySelector('.card');
    card.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('modal-overlay').classList.contains('open')).toBe(false);
  });

  test('clicking overlay closes modal', () => {
    const card = document.querySelector('.card');
    card.click();
    const overlay = document.getElementById('modal-overlay');
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(overlay.classList.contains('open')).toBe(false);
  });

  test('each card has status indicator', () => {
    const dots = document.querySelectorAll('.status-dot');
    expect(dots.length).toBe(24);
  });

  test('each card has popularity bars', () => {
    const pops = document.querySelectorAll('.popularity');
    expect(pops.length).toBe(24);
  });

  test('popularity bars have correct count', () => {
    const bars = document.querySelector('.popularity').querySelectorAll('.bar');
    expect(bars.length).toBe(5);
  });

  test('modal has documentation link', () => {
    const card = document.querySelector('.card');
    card.click();
    const link = document.querySelector('.modal .link-btn');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toMatch(/^https?:\/\//);
  });

  test('modal has features list', () => {
    const card = document.querySelector('.card');
    card.click();
    const features = document.querySelectorAll('.modal .features-list li');
    expect(features.length).toBeGreaterThan(0);
  });

  test('search is case insensitive', () => {
    const search = document.getElementById('search');
    search.value = 'SLACK';
    search.dispatchEvent(new Event('input'));
    const cards = document.querySelectorAll('.card');
    expect(cards.length).toBe(1);
  });

  test('category filter and search work together', () => {
    // Set category to Communication
    const commBtn = [...document.querySelectorAll('.filter-btn')].find(b => b.textContent.includes('Communication'));
    commBtn.click();
    // Then search
    const search = document.getElementById('search');
    search.value = 'slack';
    search.dispatchEvent(new Event('input'));
    const cards = document.querySelectorAll('.card');
    expect(cards.length).toBe(1);
  });

  test('count label updates on filter', () => {
    const search = document.getElementById('search');
    search.value = 'redis';
    search.dispatchEvent(new Event('input'));
    const label = document.getElementById('count-label').textContent;
    expect(label).toContain('1');
  });

  test('switching back to All shows all cards', () => {
    const aiBtn = [...document.querySelectorAll('.filter-btn')].find(b => b.textContent.includes('AI Models'));
    aiBtn.click();
    expect(document.querySelectorAll('.card').length).toBe(4);
    const allBtn = document.querySelector('.filter-btn[data-cat="All"]');
    allBtn.click();
    expect(document.querySelectorAll('.card').length).toBe(24);
  });
});
