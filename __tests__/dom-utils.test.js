/**
 * @jest-environment jsdom
 */

// Tests for DOMUtil — shared DOM helper utilities.

const fs = require('fs');
const path = require('path');

function loadDOMUtil() {
  const code = fs.readFileSync(
    path.resolve(__dirname, '../src/modules/dom-utils.js'), 'utf8'
  );
  eval(code);
  return DOMUtil;
}

describe('DOMUtil', () => {
  let DU;

  beforeEach(() => {
    DU = loadDOMUtil();
  });

  test('escapeHtml escapes angle brackets', () => {
    expect(DU.escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert("xss")&lt;/script&gt;'
    );
  });

  test('escapeHtml escapes ampersands', () => {
    expect(DU.escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('escapeHtml escapes quotes inside HTML context', () => {
    const result = DU.escapeHtml('"hello" & \'world\'');
    expect(result).toContain('&amp;');
  });

  test('escapeHtml returns empty string for empty input', () => {
    expect(DU.escapeHtml('')).toBe('');
  });

  test('escapeHtml handles plain text unchanged', () => {
    expect(DU.escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  test('escapeHtml handles unicode correctly', () => {
    expect(DU.escapeHtml('日本語 🎉')).toBe('日本語 🎉');
  });

  test('escapeHtml handles nested HTML tags', () => {
    const input = '<div><img src=x onerror=alert(1)></div>';
    const result = DU.escapeHtml(input);
    expect(result).not.toContain('<div>');
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;');
  });

  test('escapeHtml handles multiple calls (reuses element)', () => {
    const r1 = DU.escapeHtml('<a>');
    const r2 = DU.escapeHtml('<b>');
    expect(r1).toBe('&lt;a&gt;');
    expect(r2).toBe('&lt;b&gt;');
  });

  test('escapeHtml handles numeric-like strings', () => {
    expect(DU.escapeHtml('0')).toBe('0');
    expect(DU.escapeHtml('3.14')).toBe('3.14');
  });

  test('escapeHtml handles strings with only special chars', () => {
    expect(DU.escapeHtml('<<<>>>&&&')).toBe('&lt;&lt;&lt;&gt;&gt;&gt;&amp;&amp;&amp;');
  });
});
