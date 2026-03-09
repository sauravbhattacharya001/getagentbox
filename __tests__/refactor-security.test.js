/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Polyfills
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = function (cb) { return setTimeout(cb, 0); };
}
if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = function (id) { clearTimeout(id); };
}
if (!window.IntersectionObserver) {
  window.IntersectionObserver = function () {
    return { observe: function () {}, disconnect: function () {} };
  };
}
if (!window.matchMedia) {
  window.matchMedia = function () {
    return { matches: false, addEventListener: function () {} };
  };
}

function loadApp() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
  document.documentElement.innerHTML = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
  // Use indirect eval to execute in global scope so var declarations land on window
  (0, eval)(src);
  // Manually trigger init since DOMContentLoaded already fired
  if (window.Playground) window.Playground.init();
}

describe('Shared typing indicator template', () => {
  beforeEach(() => { loadApp(); });

  test('_typingIndicatorTemplate exists globally', () => {
    expect(window._typingIndicatorTemplate).toBeDefined();
  });

  test('is a div with typing-indicator class', () => {
    const tmpl = window._typingIndicatorTemplate;
    expect(tmpl.tagName).toBe('DIV');
    expect(tmpl.className).toBe('typing-indicator');
  });

  test('has exactly 3 span children', () => {
    const tmpl = window._typingIndicatorTemplate;
    expect(tmpl.children.length).toBe(3);
    for (let i = 0; i < 3; i++) {
      expect(tmpl.children[i].tagName).toBe('SPAN');
    }
  });

  test('cloneNode produces independent copy', () => {
    const tmpl = window._typingIndicatorTemplate;
    const clone = tmpl.cloneNode(true);
    expect(clone).not.toBe(tmpl);
    expect(clone.className).toBe('typing-indicator');
    expect(clone.children.length).toBe(3);
    clone.id = 'test-clone';
    expect(tmpl.id).not.toBe('test-clone');
  });
});

describe('Playground security limits', () => {
  let messagesEl, inputEl, formEl;

  beforeEach(() => {
    loadApp();
    messagesEl = document.getElementById('playgroundMessages');
    inputEl = document.getElementById('playgroundInput');
    formEl = document.getElementById('playgroundForm');
  });

  test('input has maxlength=500', () => {
    expect(inputEl.getAttribute('maxlength')).toBe('500');
  });

  test('long input is truncated in submitted user bubble', () => {
    inputEl.value = 'a'.repeat(800);
    formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const bubbles = messagesEl.querySelectorAll('.chat-bubble.user');
    expect(bubbles.length).toBeGreaterThanOrEqual(1);
    expect(bubbles[bubbles.length - 1].textContent.length).toBeLessThanOrEqual(500);
  });

  test('normal length input is not truncated', () => {
    inputEl.value = 'hello world';
    formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const bubbles = messagesEl.querySelectorAll('.chat-bubble.user');
    expect(bubbles[bubbles.length - 1].textContent).toBe('hello world');
  });

  test('exactly 500 chars is accepted without truncation', () => {
    inputEl.value = 'q'.repeat(500);
    formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const bubbles = messagesEl.querySelectorAll('.chat-bubble.user');
    expect(bubbles[bubbles.length - 1].textContent.length).toBe(500);
  });

  test('501 chars is truncated to 500', () => {
    inputEl.value = 'z'.repeat(501);
    formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const bubbles = messagesEl.querySelectorAll('.chat-bubble.user');
    expect(bubbles[bubbles.length - 1].textContent.length).toBe(500);
  });

  test('empty input does not create bubble', () => {
    const before = messagesEl.children.length;
    inputEl.value = '   ';
    formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(messagesEl.children.length).toBe(before);
  });

  test('old messages evicted when exceeding limit', () => {
    // Fill 50 messages (at limit)
    while (messagesEl.children.length < 50) {
      const b = document.createElement('div');
      b.className = 'chat-bubble user';
      b.textContent = 'fill';
      messagesEl.appendChild(b);
    }

    // Submit one more
    inputEl.value = 'trigger eviction';
    formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // Should be <= 50 + 1 typing indicator
    expect(messagesEl.children.length).toBeLessThanOrEqual(51);
  });

  test('eviction removes oldest child first', () => {
    // Clear and add sentinel messages
    messagesEl.innerHTML = '';
    for (let i = 0; i < 50; i++) {
      const b = document.createElement('div');
      b.className = 'chat-bubble user';
      b.textContent = 'sentinel-' + i;
      b.setAttribute('data-idx', String(i));
      messagesEl.appendChild(b);
    }

    // Submit to trigger eviction
    inputEl.value = 'new one';
    formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // sentinel-0 should be evicted
    expect(messagesEl.querySelector('[data-idx="0"]')).toBeNull();
    // sentinel-1 should remain
    expect(messagesEl.querySelector('[data-idx="1"]')).not.toBeNull();
  });

  test('rapid submissions stay bounded', () => {
    messagesEl.innerHTML = '';
    for (let i = 0; i < 80; i++) {
      inputEl.value = 'rapid-' + i;
      formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
    expect(messagesEl.children.length).toBeLessThanOrEqual(51);
  });
});

describe('Single DOMContentLoaded block', () => {
  test('only one DOMContentLoaded addEventListener call', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
    const matches = src.match(/addEventListener\(\s*['"]DOMContentLoaded['"]/g);
    expect(matches.length).toBe(1);
  });

  test('no duplicate typingTemplate definitions', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
    expect(src.match(/var\s+typingTemplate\s*=/g)).toBeNull();
  });

  test('_typingIndicatorTemplate defined exactly once', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
    expect(src.match(/(?:var|let|const)\s+_typingIndicatorTemplate\s*=/g).length).toBe(1);
  });

  test('MAX_INPUT_LENGTH constant exists', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
    expect(src).toContain('const MAX_INPUT_LENGTH = 500;');
  });

  test('MAX_MESSAGES constant exists', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
    expect(src).toContain('const MAX_MESSAGES = 50;');
  });

  test('input truncation guard exists', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
    expect(src).toContain('text.slice(0, MAX_INPUT_LENGTH)');
  });

  test('message eviction guard exists', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
    expect(src).toContain('messagesEl.children.length >= MAX_MESSAGES');
  });
});

