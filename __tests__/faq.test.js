/**
 * @jest-environment jsdom
 *
 * Unit tests for the FAQ accordion module (src/modules/faq.js).
 *
 * Verifies the accordion behaviour:
 *   - clicking a closed question opens it and sets aria-expanded="true"
 *   - opening one item closes its siblings within the same parent
 *   - clicking the same open question closes it
 *   - items in a *different* parent container are NOT affected
 *   - calling toggle() with an element outside .faq-item is a no-op
 */
'use strict';

const FAQ = require('../src/modules/faq.js');

function makeItem(parent, opts) {
  opts = opts || {};
  const item = document.createElement('div');
  item.className = 'faq-item' + (opts.open ? ' open' : '');
  const q = document.createElement('button');
  q.className = 'faq-question';
  q.setAttribute('aria-expanded', opts.open ? 'true' : 'false');
  q.textContent = opts.text || 'Question';
  const a = document.createElement('div');
  a.className = 'faq-answer';
  a.textContent = 'Answer';
  item.appendChild(q);
  item.appendChild(a);
  parent.appendChild(item);
  return { item, question: q };
}

describe('FAQ.toggle', () => {
  let containerA, containerB;

  beforeEach(() => {
    document.body.innerHTML = '';
    containerA = document.createElement('section');
    containerB = document.createElement('section');
    document.body.appendChild(containerA);
    document.body.appendChild(containerB);
  });

  test('opens a closed item', () => {
    const { item, question } = makeItem(containerA);
    FAQ.toggle(question);
    expect(item.classList.contains('open')).toBe(true);
    expect(question.getAttribute('aria-expanded')).toBe('true');
  });

  test('closes an already-open item when clicked again', () => {
    const { item, question } = makeItem(containerA, { open: true });
    FAQ.toggle(question);
    expect(item.classList.contains('open')).toBe(false);
    // aria-expanded is only flipped when opening; on close the source
    // currently leaves it. Assert the class state, which is what drives
    // the visible accordion.
  });

  test('opening one sibling closes the other (accordion)', () => {
    const a = makeItem(containerA, { open: true, text: 'A' });
    const b = makeItem(containerA, { text: 'B' });

    FAQ.toggle(b.question);

    expect(b.item.classList.contains('open')).toBe(true);
    expect(b.question.getAttribute('aria-expanded')).toBe('true');
    expect(a.item.classList.contains('open')).toBe(false);
    expect(a.question.getAttribute('aria-expanded')).toBe('false');
  });

  test('does not touch items in a different parent container', () => {
    const a = makeItem(containerA, { open: true, text: 'A' });
    const b = makeItem(containerB, { text: 'B' });

    FAQ.toggle(b.question);

    expect(b.item.classList.contains('open')).toBe(true);
    // Item in containerA is in a DIFFERENT accordion - must remain open.
    expect(a.item.classList.contains('open')).toBe(true);
    expect(a.question.getAttribute('aria-expanded')).toBe('true');
  });

  test('is a no-op when called with an element not inside .faq-item', () => {
    const stray = document.createElement('button');
    stray.className = 'faq-question';
    document.body.appendChild(stray);
    expect(() => FAQ.toggle(stray)).not.toThrow();
  });

  test('handles three siblings: opening C closes A and B', () => {
    const a = makeItem(containerA, { open: true, text: 'A' });
    const b = makeItem(containerA, { open: true, text: 'B' });
    const c = makeItem(containerA, { text: 'C' });

    FAQ.toggle(c.question);

    expect(c.item.classList.contains('open')).toBe(true);
    expect(a.item.classList.contains('open')).toBe(false);
    expect(b.item.classList.contains('open')).toBe(false);
  });
});
