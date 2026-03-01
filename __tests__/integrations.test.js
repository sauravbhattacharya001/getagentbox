/**
 * @jest-environment jsdom
 */

/* global document, window */

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const appJs = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');

function setupDOM() {
  document.documentElement.innerHTML = html;
  // Mock matchMedia
  window.matchMedia = window.matchMedia || function () {
    return { matches: false, addEventListener: function () {} };
  };
  eval(appJs);
}

describe('Integrations', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('section exists in DOM', () => {
    const section = document.getElementById('integrationsSection');
    expect(section).not.toBeNull();
  });

  test('has heading', () => {
    const section = document.getElementById('integrationsSection');
    const h2 = section.querySelector('h2');
    expect(h2.textContent).toBe('Connects with your tools');
  });

  test('has subtitle', () => {
    const sub = document.querySelector('.integrations-subtitle');
    expect(sub).not.toBeNull();
    expect(sub.textContent).toContain('apps you already use');
  });

  test('has filter buttons', () => {
    const btns = document.querySelectorAll('.integration-filter-btn');
    expect(btns.length).toBe(4);
  });

  test('All filter is active by default', () => {
    const allBtn = document.querySelector('[data-category="all"]');
    expect(allBtn.classList.contains('active')).toBe(true);
  });

  test('has 9 integration cards', () => {
    const cards = document.querySelectorAll('.integration-card');
    expect(cards.length).toBe(9);
  });

  test('getCategories returns all categories', () => {
    const cats = window.Integrations.getCategories();
    expect(cats).toEqual(['all', 'messaging', 'productivity', 'developer']);
  });

  test('getCurrent returns all by default', () => {
    expect(window.Integrations.getCurrent()).toBe('all');
  });

  test('filterBy messaging shows only messaging cards', () => {
    const count = window.Integrations.filterBy('messaging');
    expect(count).toBe(2);
    expect(window.Integrations.getCurrent()).toBe('messaging');
    const hidden = document.querySelectorAll('.integration-card.hidden');
    expect(hidden.length).toBe(7);
  });

  test('filterBy productivity shows correct count', () => {
    const count = window.Integrations.filterBy('productivity');
    expect(count).toBe(4);
  });

  test('filterBy developer shows correct count', () => {
    const count = window.Integrations.filterBy('developer');
    expect(count).toBe(3);
  });

  test('filterBy all shows everything', () => {
    window.Integrations.filterBy('messaging');
    const count = window.Integrations.filterBy('all');
    expect(count).toBe(9);
    const hidden = document.querySelectorAll('.integration-card.hidden');
    expect(hidden.length).toBe(0);
  });

  test('filter buttons update active state', () => {
    window.Integrations.filterBy('developer');
    const devBtn = document.querySelector('[data-category="developer"]');
    const allBtn = document.querySelector('[data-category="all"]');
    expect(devBtn.classList.contains('active')).toBe(true);
    expect(allBtn.classList.contains('active')).toBe(false);
  });

  test('filter buttons update aria-selected', () => {
    window.Integrations.filterBy('messaging');
    const msgBtn = document.querySelector('[data-category="messaging"]');
    expect(msgBtn.getAttribute('aria-selected')).toBe('true');
    const allBtn = document.querySelector('[data-category="all"]');
    expect(allBtn.getAttribute('aria-selected')).toBe('false');
  });

  test('getIntegrations returns all integrations', () => {
    const all = window.Integrations.getIntegrations();
    expect(all.length).toBe(9);
    expect(all[0].name).toBe('Telegram');
    expect(all[0].category).toBe('messaging');
    expect(all[0].status).toBe('live');
  });

  test('getIntegrations filters by category', () => {
    const devs = window.Integrations.getIntegrations('developer');
    expect(devs.length).toBe(3);
    devs.forEach(d => expect(d.category).toBe('developer'));
  });

  test('getStatusCounts returns correct counts', () => {
    const counts = window.Integrations.getStatusCounts();
    expect(counts.live).toBe(6);
    expect(counts.coming).toBe(3);
  });

  test('cards have badges', () => {
    const liveBadges = document.querySelectorAll('.integration-badge.live');
    const comingBadges = document.querySelectorAll('.integration-badge.coming');
    expect(liveBadges.length).toBe(6);
    expect(comingBadges.length).toBe(3);
  });

  test('each card has icon, heading, and description', () => {
    const cards = document.querySelectorAll('.integration-card');
    cards.forEach(card => {
      expect(card.querySelector('.integration-icon')).not.toBeNull();
      expect(card.querySelector('h3')).not.toBeNull();
      expect(card.querySelector('p')).not.toBeNull();
      expect(card.querySelector('h3').textContent.length).toBeGreaterThan(0);
      expect(card.querySelector('p').textContent.length).toBeGreaterThan(0);
    });
  });

  test('filterBy null does nothing', () => {
    window.Integrations.filterBy('messaging');
    window.Integrations.filterBy(null);
    expect(window.Integrations.getCurrent()).toBe('messaging');
  });

  test('click on filter button filters cards', () => {
    // Re-init to attach click handlers (DOMContentLoaded already fired in jsdom)
    window.Integrations.init();
    const msgBtn = document.querySelector('[data-category="messaging"]');
    msgBtn.click();
    expect(window.Integrations.getCurrent()).toBe('messaging');
  });

  test('integration grid has correct aria role on filter', () => {
    const filter = document.querySelector('.integrations-filter');
    expect(filter.getAttribute('role')).toBe('tablist');
  });

  test('Integrations module is exposed on window', () => {
    expect(window.Integrations).toBeDefined();
    expect(typeof window.Integrations.filterBy).toBe('function');
    expect(typeof window.Integrations.getCurrent).toBe('function');
    expect(typeof window.Integrations.getCategories).toBe('function');
    expect(typeof window.Integrations.getIntegrations).toBe('function');
    expect(typeof window.Integrations.getStatusCounts).toBe('function');
    expect(typeof window.Integrations.init).toBe('function');
  });

  test('known integration names are present', () => {
    const names = window.Integrations.getIntegrations().map(i => i.name);
    expect(names).toContain('Telegram');
    expect(names).toContain('WhatsApp');
    expect(names).toContain('Google Calendar');
    expect(names).toContain('Gmail');
    expect(names).toContain('GitHub');
    expect(names).toContain('Web Search');
    expect(names).toContain('Slack');
    expect(names).toContain('Notion');
    expect(names).toContain('Webhooks');
  });

  test('live integrations are messaging+productivity+developer mix', () => {
    const live = window.Integrations.getIntegrations().filter(i => i.status === 'live');
    const categories = [...new Set(live.map(i => i.category))];
    expect(categories).toContain('messaging');
    expect(categories).toContain('productivity');
    expect(categories).toContain('developer');
  });

  test('coming soon integrations have correct names', () => {
    const coming = window.Integrations.getIntegrations().filter(i => i.status === 'coming');
    const names = coming.map(i => i.name);
    expect(names).toContain('Slack');
    expect(names).toContain('Notion');
    expect(names).toContain('Webhooks');
  });

  test('sequential filtering updates correctly', () => {
    window.Integrations.filterBy('messaging');
    expect(window.Integrations.getCurrent()).toBe('messaging');
    window.Integrations.filterBy('developer');
    expect(window.Integrations.getCurrent()).toBe('developer');
    window.Integrations.filterBy('all');
    expect(window.Integrations.getCurrent()).toBe('all');
    const hidden = document.querySelectorAll('.integration-card.hidden');
    expect(hidden.length).toBe(0);
  });
});
