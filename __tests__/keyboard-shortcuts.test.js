/**
 * @jest-environment jsdom
 */
'use strict';

var fs = require('fs');
var path = require('path');

function loadModule() {
  var modPath = path.resolve(__dirname, '..', 'keyboard-shortcuts.js');
  var src = fs.readFileSync(modPath, 'utf-8');
  // Execute and return the module; the file declares var KeyboardShortcuts = (function(){...})()
  var fn = new Function(src + '\nreturn KeyboardShortcuts;');
  return fn();
}

describe('KeyboardShortcuts', function () {
  var KS;

  beforeEach(function () {
    document.body.innerHTML = '<div id="app"></div>';
    KS = loadModule();
  });

  afterEach(function () {
    if (KS && KS.isOpen()) KS.close();
    document.body.innerHTML = '';
  });

  // ── Initialization ──────────────────────────────────────────

  test('init creates trigger button', function () {
    KS.init();
    var btn = document.getElementById('shortcutsTrigger');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toContain('Keyboard shortcuts');
  });

  test('init adds global keydown listener for ?', function () {
    KS.init();
    var event = new KeyboardEvent('keydown', { key: '?', bubbles: true });
    document.dispatchEvent(event);
    expect(KS.isOpen()).toBe(true);
  });

  // ── Open / Close / Toggle ──────────────────────────────────

  test('open creates and shows the panel', function () {
    KS.open();
    var panel = document.getElementById('keyboardShortcutsPanel');
    expect(panel).not.toBeNull();
    expect(panel.classList.contains('open')).toBe(true);
    expect(KS.isOpen()).toBe(true);
  });

  test('close hides the panel', function () {
    KS.open();
    KS.close();
    var panel = document.getElementById('keyboardShortcutsPanel');
    expect(panel.classList.contains('open')).toBe(false);
    expect(KS.isOpen()).toBe(false);
  });

  test('toggle opens when closed and closes when open', function () {
    expect(KS.isOpen()).toBe(false);
    KS.toggle();
    expect(KS.isOpen()).toBe(true);
    KS.toggle();
    expect(KS.isOpen()).toBe(false);
  });

  test('close restores body overflow', function () {
    KS.open();
    expect(document.body.style.overflow).toBe('hidden');
    KS.close();
    expect(document.body.style.overflow).toBe('');
  });

  // ── Panel Content ──────────────────────────────────────────

  test('panel displays all shortcut groups', function () {
    KS.open();
    var groups = document.querySelectorAll('.shortcut-group');
    expect(groups.length).toBeGreaterThanOrEqual(8);
  });

  test('panel displays shortcut keys in kbd elements', function () {
    KS.open();
    var kbds = document.querySelectorAll('.shortcut-key');
    expect(kbds.length).toBeGreaterThan(0);
    var texts = Array.from(kbds).map(function (k) { return k.textContent; });
    expect(texts).toEqual(expect.arrayContaining(['Escape']));
  });

  test('panel shows shortcut count', function () {
    KS.open();
    var count = document.querySelector('.shortcut-count');
    expect(count).not.toBeNull();
    expect(count.textContent).toMatch(/\d+ shortcuts? across \d+ modules?/);
  });

  test('panel has close button that works', function () {
    KS.open();
    var closeBtn = document.querySelector('.shortcuts-close');
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    expect(KS.isOpen()).toBe(false);
  });

  test('panel has search input', function () {
    KS.open();
    var input = document.querySelector('.shortcuts-search-input');
    expect(input).not.toBeNull();
    expect(input.getAttribute('aria-label')).toContain('Search');
  });

  test('panel has footer with hint', function () {
    KS.open();
    var footer = document.querySelector('.shortcuts-footer');
    expect(footer).not.toBeNull();
    expect(footer.textContent).toContain('?');
  });

  // ── Search Functionality ───────────────────────────────────

  test('search filters shortcuts by module name', function () {
    KS.open();
    var input = document.querySelector('.shortcuts-search-input');
    input.value = 'tour';
    input.dispatchEvent(new Event('input'));
    var groups = document.querySelectorAll('.shortcut-group');
    var titles = Array.from(groups).map(function (g) {
      return g.querySelector('.shortcut-group-title').textContent.trim();
    });
    expect(titles.some(function (t) { return t.indexOf('Feature Tour') >= 0; })).toBe(true);
  });

  test('search filters by key name', function () {
    KS.open();
    var input = document.querySelector('.shortcuts-search-input');
    input.value = 'escape';
    input.dispatchEvent(new Event('input'));
    var rows = document.querySelectorAll('.shortcut-row');
    expect(rows.length).toBeGreaterThan(0);
  });

  test('search shows empty state when no matches', function () {
    KS.open();
    var input = document.querySelector('.shortcuts-search-input');
    input.value = 'zzzznonexistent';
    input.dispatchEvent(new Event('input'));
    var empty = document.querySelector('.shortcut-empty');
    expect(empty).not.toBeNull();
    expect(empty.textContent).toContain('No shortcuts match');
  });

  test('search is case-insensitive', function () {
    KS.open();
    var input = document.querySelector('.shortcuts-search-input');
    input.value = 'SKILL TREE';
    input.dispatchEvent(new Event('input'));
    var groups = document.querySelectorAll('.shortcut-group');
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });

  test('clearing search shows all groups again', function () {
    KS.open();
    var input = document.querySelector('.shortcuts-search-input');
    input.value = 'tour';
    input.dispatchEvent(new Event('input'));
    var filtered = document.querySelectorAll('.shortcut-group').length;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    var all = document.querySelectorAll('.shortcut-group').length;
    expect(all).toBeGreaterThan(filtered);
  });

  // ── Keyboard Interaction ───────────────────────────────────

  test('? in input field does NOT toggle panel', function () {
    KS.init();
    var input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    var event = new KeyboardEvent('keydown', { key: '?', bubbles: true });
    input.dispatchEvent(event);
    expect(KS.isOpen()).toBe(false);
  });

  test('? in textarea does NOT toggle panel', function () {
    KS.init();
    var textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();
    var event = new KeyboardEvent('keydown', { key: '?', bubbles: true });
    textarea.dispatchEvent(event);
    expect(KS.isOpen()).toBe(false);
  });

  test('Escape closes the panel via keydown', function () {
    KS.open();
    expect(KS.isOpen()).toBe(true);
    var panel = document.getElementById('keyboardShortcutsPanel');
    var event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    panel.dispatchEvent(event);
    expect(KS.isOpen()).toBe(false);
  });

  test('clicking backdrop closes the panel', function () {
    KS.open();
    var panel = document.getElementById('keyboardShortcutsPanel');
    panel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(KS.isOpen()).toBe(false);
  });

  // ── Accessibility ──────────────────────────────────────────

  test('panel has dialog role and aria attributes', function () {
    KS.open();
    var panel = document.getElementById('keyboardShortcutsPanel');
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-label')).toBe('Keyboard Shortcuts');
    expect(panel.getAttribute('aria-modal')).toBe('true');
  });

  test('shortcut rows have listitem role', function () {
    KS.open();
    var rows = document.querySelectorAll('.shortcut-row');
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach(function (row) {
      expect(row.getAttribute('role')).toBe('listitem');
    });
  });

  // ── Data Integrity ─────────────────────────────────────────

  test('getGroups returns all shortcut groups', function () {
    var groups = KS.getGroups();
    expect(groups.length).toBeGreaterThanOrEqual(8);
  });

  test('every group has module, icon, and shortcuts', function () {
    var groups = KS.getGroups();
    groups.forEach(function (g) {
      expect(g.module).toBeTruthy();
      expect(g.icon).toBeTruthy();
      expect(Array.isArray(g.shortcuts)).toBe(true);
      expect(g.shortcuts.length).toBeGreaterThan(0);
    });
  });

  test('every shortcut has keys array and description', function () {
    var groups = KS.getGroups();
    groups.forEach(function (g) {
      g.shortcuts.forEach(function (s) {
        expect(Array.isArray(s.keys)).toBe(true);
        expect(s.keys.length).toBeGreaterThan(0);
        expect(typeof s.desc).toBe('string');
        expect(s.desc.length).toBeGreaterThan(0);
      });
    });
  });

  test('getGroups returns a copy', function () {
    var a = KS.getGroups();
    var b = KS.getGroups();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  // ── Trigger Button ─────────────────────────────────────────

  test('trigger button opens the panel on click', function () {
    KS.init();
    var btn = document.getElementById('shortcutsTrigger');
    btn.click();
    expect(KS.isOpen()).toBe(true);
  });

  // ── XSS Protection ────────────────────────────────────────

  test('HTML in search query is escaped', function () {
    KS.open();
    var input = document.querySelector('.shortcuts-search-input');
    input.value = '<img src=x>';
    input.dispatchEvent(new Event('input'));
    var body = document.getElementById('shortcutsBody');
    expect(body.innerHTML).not.toContain('<img');
  });

  // ── Multiple cycles ────────────────────────────────────────

  test('panel survives multiple open/close cycles', function () {
    for (var i = 0; i < 5; i++) {
      KS.open();
      expect(KS.isOpen()).toBe(true);
      KS.close();
      expect(KS.isOpen()).toBe(false);
    }
    expect(document.getElementById('keyboardShortcutsPanel')).not.toBeNull();
  });
});
