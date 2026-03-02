/**
 * @jest-environment jsdom
 */

/* global Roadmap */

const fs = require('fs');
const path = require('path');

beforeEach(() => {
  localStorage.clear();
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  document.documentElement.innerHTML = html;

  const script = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');
  eval(script);

  // DOMContentLoaded doesn't re-fire in jsdom after innerHTML assignment,
  // so we must explicitly init the module for event-listener tests.
  Roadmap.init();
});

describe('Roadmap', () => {
  test('Roadmap object exists with expected API', () => {
    expect(Roadmap).toBeDefined();
    expect(typeof Roadmap.filterBy).toBe('function');
    expect(typeof Roadmap.getCurrent).toBe('function');
    expect(typeof Roadmap.getStatuses).toBe('function');
    expect(typeof Roadmap.getStatusCounts).toBe('function');
    expect(typeof Roadmap.getCards).toBe('function');
    expect(typeof Roadmap.getVisibleCards).toBe('function');
    expect(typeof Roadmap.getVotes).toBe('function');
    expect(typeof Roadmap.init).toBe('function');
  });

  test('init does not throw', () => {
    expect(() => Roadmap.init()).not.toThrow();
  });

  test('default filter is "all"', () => {
    expect(Roadmap.getCurrent()).toBe('all');
  });

  test('all cards visible by default', () => {
    var all = Roadmap.getCards();
    var visible = Roadmap.getVisibleCards();
    expect(all.length).toBeGreaterThan(0);
    expect(visible.length).toBe(all.length);
  });

  test('getStatuses returns expected values', () => {
    expect(Roadmap.getStatuses()).toEqual(['all', 'shipped', 'progress', 'planned']);
  });

  test('cards have required data attributes', () => {
    Roadmap.getCards().forEach(function (card) {
      expect(card.getAttribute('data-status')).toBeTruthy();
      expect(card.getAttribute('data-category')).toBeTruthy();
    });
  });

  test('each card has a title, description, and vote button', () => {
    Roadmap.getCards().forEach(function (card) {
      expect(card.querySelector('h3')).not.toBeNull();
      expect(card.querySelector('p')).not.toBeNull();
      expect(card.querySelector('.roadmap-vote-btn')).not.toBeNull();
      expect(card.querySelector('.roadmap-vote-count')).not.toBeNull();
    });
  });

  test('each card has a status badge with matching class', () => {
    Roadmap.getCards().forEach(function (card) {
      var badge = card.querySelector('.roadmap-status-badge');
      expect(badge).not.toBeNull();
      var status = card.getAttribute('data-status');
      expect(badge.classList.contains(status)).toBe(true);
    });
  });

  test('each card has a category label', () => {
    Roadmap.getCards().forEach(function (card) {
      expect(card.querySelector('.roadmap-category')).not.toBeNull();
    });
  });

  test('status counts are consistent with cards', () => {
    var counts = Roadmap.getStatusCounts();
    expect(counts.shipped).toBeGreaterThan(0);
    expect(counts.progress).toBeGreaterThan(0);
    expect(counts.planned).toBeGreaterThan(0);
    expect(counts.shipped + counts.progress + counts.planned).toBe(Roadmap.getCards().length);
  });

  test('filterBy("shipped") shows only shipped cards', () => {
    Roadmap.filterBy('shipped');
    expect(Roadmap.getCurrent()).toBe('shipped');
    var visible = Roadmap.getVisibleCards();
    visible.forEach(function (card) {
      expect(card.getAttribute('data-status')).toBe('shipped');
    });
    expect(visible.length).toBe(Roadmap.getStatusCounts().shipped);
  });

  test('filterBy("progress") shows only in-progress cards', () => {
    Roadmap.filterBy('progress');
    expect(Roadmap.getCurrent()).toBe('progress');
    var visible = Roadmap.getVisibleCards();
    visible.forEach(function (card) {
      expect(card.getAttribute('data-status')).toBe('progress');
    });
    expect(visible.length).toBe(Roadmap.getStatusCounts().progress);
  });

  test('filterBy("planned") shows only planned cards', () => {
    Roadmap.filterBy('planned');
    expect(Roadmap.getCurrent()).toBe('planned');
    var visible = Roadmap.getVisibleCards();
    visible.forEach(function (card) {
      expect(card.getAttribute('data-status')).toBe('planned');
    });
    expect(visible.length).toBe(Roadmap.getStatusCounts().planned);
  });

  test('filterBy("all") shows all cards', () => {
    Roadmap.filterBy('shipped');
    Roadmap.filterBy('all');
    expect(Roadmap.getCurrent()).toBe('all');
    expect(Roadmap.getVisibleCards().length).toBe(Roadmap.getCards().length);
  });

  test('filter hides non-matching cards', () => {
    Roadmap.filterBy('shipped');
    Roadmap.getCards().forEach(function (card) {
      if (card.getAttribute('data-status') !== 'shipped') {
        expect(card.getAttribute('data-hidden')).toBe('true');
      }
    });
  });

  test('active filter button has active class and aria-selected', () => {
    Roadmap.filterBy('progress');
    var section = document.getElementById('roadmapSection');
    var btns = section.querySelectorAll('.roadmap-filter-btn');
    btns.forEach(function (btn) {
      if (btn.getAttribute('data-status') === 'progress') {
        expect(btn.classList.contains('active')).toBe(true);
        expect(btn.getAttribute('aria-selected')).toBe('true');
      } else {
        expect(btn.classList.contains('active')).toBe(false);
        expect(btn.getAttribute('aria-selected')).toBe('false');
      }
    });
  });

  test('clicking filter button updates filter', () => {
    var section = document.getElementById('roadmapSection');
    var btn = section.querySelector('.roadmap-filter-btn[data-status="planned"]');
    btn.click();
    expect(Roadmap.getCurrent()).toBe('planned');
  });

  test('summary items opacity reflects active filter', () => {
    Roadmap.filterBy('shipped');
    var items = document.querySelectorAll('.roadmap-summary-item');
    items.forEach(function (item) {
      if (item.getAttribute('data-status') === 'shipped') {
        expect(item.style.opacity).toBe('1');
      } else {
        expect(item.style.opacity).toBe('0.4');
      }
    });
  });

  test('all summary items full opacity for "all" filter', () => {
    Roadmap.filterBy('all');
    var items = document.querySelectorAll('.roadmap-summary-item');
    items.forEach(function (item) {
      expect(item.style.opacity).toBe('1');
    });
  });

  test('clicking vote button increments count', () => {
    var card = Roadmap.getCards()[0];
    var btn = card.querySelector('.roadmap-vote-btn');
    var countEl = card.querySelector('.roadmap-vote-count');
    var before = parseInt(countEl.textContent, 10);
    btn.click();
    expect(parseInt(countEl.textContent, 10)).toBe(before + 1);
  });

  test('clicking vote button again decrements count', () => {
    var card = Roadmap.getCards()[0];
    var btn = card.querySelector('.roadmap-vote-btn');
    var countEl = card.querySelector('.roadmap-vote-count');
    var before = parseInt(countEl.textContent, 10);
    btn.click();
    btn.click();
    expect(parseInt(countEl.textContent, 10)).toBe(before);
  });

  test('voted button gets voted class', () => {
    var card = Roadmap.getCards()[0];
    var btn = card.querySelector('.roadmap-vote-btn');
    expect(btn.classList.contains('voted')).toBe(false);
    btn.click();
    expect(btn.classList.contains('voted')).toBe(true);
  });

  test('voted button gets aria-pressed true', () => {
    var card = Roadmap.getCards()[0];
    var btn = card.querySelector('.roadmap-vote-btn');
    btn.click();
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  test('unvoting removes voted class and aria-pressed', () => {
    var card = Roadmap.getCards()[0];
    var btn = card.querySelector('.roadmap-vote-btn');
    btn.click();
    btn.click();
    expect(btn.classList.contains('voted')).toBe(false);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  test('vote count does not go below zero', () => {
    var card = Roadmap.getCards()[0];
    var countEl = card.querySelector('.roadmap-vote-count');
    countEl.textContent = '0';
    var btn = card.querySelector('.roadmap-vote-btn');
    btn.classList.add('voted');
    btn.click();
    expect(parseInt(countEl.textContent, 10)).toBe(0);
  });

  test('getVotes returns object with card titles', () => {
    var votes = Roadmap.getVotes();
    expect(typeof votes).toBe('object');
    Roadmap.getCards().forEach(function (c) {
      var t = c.querySelector('h3').textContent;
      expect(votes).toHaveProperty(t);
      expect(typeof votes[t]).toBe('number');
    });
  });

  test('votes persist to localStorage', () => {
    var card = Roadmap.getCards()[0];
    var btn = card.querySelector('.roadmap-vote-btn');
    btn.click();
    var raw = localStorage.getItem('agentbox_roadmap_votes');
    expect(raw).not.toBeNull();
    var data = JSON.parse(raw);
    var title = card.querySelector('h3').textContent;
    expect(data[title]).toBeDefined();
    expect(data[title].voted).toBe(true);
  });

  test('votes restored on reinit', () => {
    var card = Roadmap.getCards()[0];
    var btn = card.querySelector('.roadmap-vote-btn');
    var countEl = card.querySelector('.roadmap-vote-count');
    btn.click();
    var newCount = parseInt(countEl.textContent, 10);

    var html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    document.documentElement.innerHTML = html;
    var script = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');
    eval(script);
    Roadmap.init();

    var restoredCard = Roadmap.getCards()[0];
    var restoredCount = parseInt(
      restoredCard.querySelector('.roadmap-vote-count').textContent,
      10
    );
    expect(restoredCount).toBe(newCount);
    expect(
      restoredCard.querySelector('.roadmap-vote-btn').classList.contains('voted')
    ).toBe(true);
  });

  test('ArrowRight moves to next filter', () => {
    var section = document.getElementById('roadmapSection');
    var btns = section.querySelectorAll('.roadmap-filter-btn');
    btns[0].focus();
    btns[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    );
    expect(Roadmap.getCurrent()).toBe('shipped');
  });

  test('ArrowLeft wraps to last filter', () => {
    var section = document.getElementById('roadmapSection');
    var btns = section.querySelectorAll('.roadmap-filter-btn');
    btns[0].focus();
    btns[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    );
    expect(Roadmap.getCurrent()).toBe('planned');
  });

  test('Home key goes to first filter', () => {
    Roadmap.filterBy('planned');
    var section = document.getElementById('roadmapSection');
    var btns = section.querySelectorAll('.roadmap-filter-btn');
    btns[3].focus();
    btns[3].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true })
    );
    expect(Roadmap.getCurrent()).toBe('all');
  });

  test('End key goes to last filter', () => {
    var section = document.getElementById('roadmapSection');
    var btns = section.querySelectorAll('.roadmap-filter-btn');
    btns[0].focus();
    btns[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true })
    );
    expect(Roadmap.getCurrent()).toBe('planned');
  });

  test('filter container has role tablist', () => {
    var section = document.getElementById('roadmapSection');
    var filter = section.querySelector('.roadmap-filter');
    expect(filter.getAttribute('role')).toBe('tablist');
  });

  test('filter buttons have role tab', () => {
    var section = document.getElementById('roadmapSection');
    var btns = section.querySelectorAll('.roadmap-filter-btn');
    btns.forEach(function (btn) {
      expect(btn.getAttribute('role')).toBe('tab');
    });
  });

  test('vote buttons have aria-label', () => {
    Roadmap.getCards().forEach(function (card) {
      var btn = card.querySelector('.roadmap-vote-btn');
      expect(btn.getAttribute('aria-label')).toBeTruthy();
    });
  });

  test('roadmap section exists', () => {
    expect(document.getElementById('roadmapSection')).not.toBeNull();
  });

  test('roadmap has title and subtitle', () => {
    var section = document.getElementById('roadmapSection');
    expect(section.querySelector('h2').textContent).toContain('roadmap');
    expect(section.querySelector('.roadmap-subtitle')).not.toBeNull();
  });

  test('roadmap has summary with three status items', () => {
    var items = document.querySelectorAll('.roadmap-summary-item');
    expect(items.length).toBe(3);
  });

  test('nav has Roadmap link', () => {
    var nav = document.querySelector('.nav-links');
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    var roadmapLink = links.find(function (a) {
      return a.getAttribute('href') === '#roadmapSection';
    });
    expect(roadmapLink).toBeDefined();
    expect(roadmapLink.textContent).toBe('Roadmap');
  });

  test('multiple rapid filter switches work correctly', () => {
    Roadmap.filterBy('shipped');
    Roadmap.filterBy('planned');
    Roadmap.filterBy('progress');
    Roadmap.filterBy('all');
    expect(Roadmap.getCurrent()).toBe('all');
    expect(Roadmap.getVisibleCards().length).toBe(Roadmap.getCards().length);
  });

  test('filterBy with null falls back to all', () => {
    Roadmap.filterBy(null);
    expect(Roadmap.getCurrent()).toBe('all');
  });
});
