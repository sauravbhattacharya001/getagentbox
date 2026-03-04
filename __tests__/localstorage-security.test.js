/**
 * @jest-environment jsdom
 */

/* global Newsletter, Roadmap */

const fs = require('fs');
const path = require('path');

beforeEach(() => {
  localStorage.clear();
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  document.documentElement.innerHTML = html;

  const script = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');
  eval(script);

  Roadmap.init();
});

describe('localStorage deserialization security', () => {
  describe('Newsletter.getSubscribers', () => {
    test('returns empty array when localStorage is empty', () => {
      expect(Newsletter.getSubscribers()).toEqual([]);
    });

    test('returns valid email array from well-formed data', () => {
      localStorage.setItem('agentbox_newsletter', JSON.stringify(['a@b.com', 'c@d.com']));
      expect(Newsletter.getSubscribers()).toEqual(['a@b.com', 'c@d.com']);
    });

    test('rejects non-array stored values (object)', () => {
      localStorage.setItem('agentbox_newsletter', JSON.stringify({ email: 'a@b.com' }));
      expect(Newsletter.getSubscribers()).toEqual([]);
    });

    test('rejects non-array stored values (string)', () => {
      localStorage.setItem('agentbox_newsletter', JSON.stringify('a@b.com'));
      expect(Newsletter.getSubscribers()).toEqual([]);
    });

    test('rejects non-array stored values (number)', () => {
      localStorage.setItem('agentbox_newsletter', JSON.stringify(42));
      expect(Newsletter.getSubscribers()).toEqual([]);
    });

    test('filters out non-string elements from array', () => {
      localStorage.setItem('agentbox_newsletter', JSON.stringify(['a@b.com', 42, null, true, 'c@d.com']));
      expect(Newsletter.getSubscribers()).toEqual(['a@b.com', 'c@d.com']);
    });

    test('handles corrupted JSON gracefully', () => {
      localStorage.setItem('agentbox_newsletter', '{not valid json');
      expect(Newsletter.getSubscribers()).toEqual([]);
    });

    test('rejects prototype pollution payload in array', () => {
      localStorage.setItem('agentbox_newsletter', JSON.stringify({ __proto__: { polluted: true } }));
      const result = Newsletter.getSubscribers();
      expect(result).toEqual([]);
      expect({}.polluted).toBeUndefined();
    });
  });

  describe('Roadmap vote restore security', () => {
    function getVoteCount(title) {
      const cards = document.querySelectorAll('.roadmap-card');
      for (const card of cards) {
        const h3 = card.querySelector('h3');
        if (h3 && h3.textContent === title) {
          const countEl = card.querySelector('.roadmap-vote-count');
          return countEl ? parseInt(countEl.textContent, 10) : null;
        }
      }
      return null;
    }

    test('restores valid vote data correctly', () => {
      const cards = document.querySelectorAll('.roadmap-card');
      if (cards.length === 0) return; // skip if no cards in HTML
      const h3 = cards[0].querySelector('h3');
      if (!h3) return;
      const title = h3.textContent;

      const data = {};
      data[title] = { count: 5, voted: true };
      localStorage.setItem('agentbox_roadmap_votes', JSON.stringify(data));

      Roadmap.init(); // re-init to trigger restoreVotes
      expect(getVoteCount(title)).toBe(5);
    });

    test('rejects non-object stored values (array)', () => {
      localStorage.setItem('agentbox_roadmap_votes', JSON.stringify([1, 2, 3]));
      // Should not throw
      expect(() => Roadmap.init()).not.toThrow();
    });

    test('rejects non-object stored values (string)', () => {
      localStorage.setItem('agentbox_roadmap_votes', JSON.stringify('hello'));
      expect(() => Roadmap.init()).not.toThrow();
    });

    test('rejects corrupted JSON gracefully', () => {
      localStorage.setItem('agentbox_roadmap_votes', 'not json{{{');
      expect(() => Roadmap.init()).not.toThrow();
    });

    test('validates count is a safe non-negative integer', () => {
      const cards = document.querySelectorAll('.roadmap-card');
      if (cards.length === 0) return;
      const h3 = cards[0].querySelector('h3');
      if (!h3) return;
      const title = h3.textContent;
      const originalCount = getVoteCount(title);

      const data = {};
      data[title] = { count: -999, voted: false };
      localStorage.setItem('agentbox_roadmap_votes', JSON.stringify(data));

      Roadmap.init();
      // Negative count should not be applied
      expect(getVoteCount(title)).toBe(originalCount);
    });

    test('rejects extremely large count values', () => {
      const cards = document.querySelectorAll('.roadmap-card');
      if (cards.length === 0) return;
      const h3 = cards[0].querySelector('h3');
      if (!h3) return;
      const title = h3.textContent;
      const originalCount = getVoteCount(title);

      const data = {};
      data[title] = { count: 99999999, voted: false };
      localStorage.setItem('agentbox_roadmap_votes', JSON.stringify(data));

      Roadmap.init();
      // Extremely large count should not be applied
      expect(getVoteCount(title)).toBe(originalCount);
    });

    test('voted must be strictly boolean true', () => {
      const cards = document.querySelectorAll('.roadmap-card');
      if (cards.length === 0) return;
      const h3 = cards[0].querySelector('h3');
      if (!h3) return;
      const btn = cards[0].querySelector('.roadmap-vote-btn');
      if (!btn) return;
      const title = h3.textContent;

      // voted as truthy string should not apply
      const data = {};
      data[title] = { count: 0, voted: 'yes' };
      localStorage.setItem('agentbox_roadmap_votes', JSON.stringify(data));

      Roadmap.init();
      expect(btn.classList.contains('voted')).toBe(false);
    });

    test('ignores entries where value is not an object', () => {
      const data = { 'Feature A': 'not an object', 'Feature B': 42 };
      localStorage.setItem('agentbox_roadmap_votes', JSON.stringify(data));
      expect(() => Roadmap.init()).not.toThrow();
    });

    test('prototype pollution via __proto__ key is blocked', () => {
      const payload = '{"__proto__": {"polluted": true}}';
      localStorage.setItem('agentbox_roadmap_votes', payload);
      Roadmap.init();
      expect({}.polluted).toBeUndefined();
    });

    test('prototype pollution via constructor key is blocked', () => {
      const payload = '{"constructor": {"prototype": {"polluted": true}}}';
      localStorage.setItem('agentbox_roadmap_votes', payload);
      Roadmap.init();
      expect({}.polluted).toBeUndefined();
    });
  });

  describe('Roadmap saveVotes uses prototype-safe maps', () => {
    test('getVotes returns prototype-safe object', () => {
      const votes = Roadmap.getVotes();
      // Should not have Object.prototype methods as own properties
      expect(Object.prototype.hasOwnProperty.call(votes, 'toString')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(votes, 'constructor')).toBe(false);
    });
  });
});
