/**
 * @jest-environment jsdom
 *
 * Unit tests for the ThemeToggle module (src/modules/theme-toggle.js).
 *
 * The module reads/writes a theme preference via the global `StorageUtil`
 * helper that jest.setup.js preloads, and toggles the `light-mode` class on
 * <body>. These tests exercise the full init + click flow and verify the
 * persisted value round-trips on the next init().
 */
'use strict';

describe('ThemeToggle', () => {
  let ThemeToggle;

  function setupDom() {
    document.body.className = '';
    document.body.innerHTML = `
      <button id="themeToggle"><span id="themeIcon">A</span></button>
    `;
  }

  beforeEach(() => {
    // Fresh module state per test - ThemeToggle is an IIFE module with
    // a single shared `btn`/`icon` reference, so we have to reset Jest's
    // module cache to truly re-init.
    jest.resetModules();
    // Re-seed the StorageUtil global the way jest.setup.js does.
    require('../src/modules/storage.js');
    localStorage.clear();
    setupDom();
    ThemeToggle = require('../src/modules/theme-toggle.js');
  });

  test('exports init and toggle', () => {
    expect(typeof ThemeToggle.init).toBe('function');
    expect(typeof ThemeToggle.toggle).toBe('function');
    expect(typeof ThemeToggle._storageKey).toBe('string');
  });

  test('init is a no-op when the button is missing', () => {
    document.body.innerHTML = '';
    expect(() => ThemeToggle.init()).not.toThrow();
    expect(document.body.classList.contains('light-mode')).toBe(false);
  });

  test('init does not add light-mode when no preference is stored', () => {
    ThemeToggle.init();
    expect(document.body.classList.contains('light-mode')).toBe(false);
  });

  test('init restores light mode from storage', () => {
    StorageUtil.set(ThemeToggle._storageKey, 'light');
    ThemeToggle.init();
    expect(document.body.classList.contains('light-mode')).toBe(true);
  });

  test('init does not restore light mode when stored value is "dark"', () => {
    StorageUtil.set(ThemeToggle._storageKey, 'dark');
    ThemeToggle.init();
    expect(document.body.classList.contains('light-mode')).toBe(false);
  });

  test('clicking the button toggles light-mode on/off', () => {
    ThemeToggle.init();
    const btn = document.getElementById('themeToggle');

    btn.click();
    expect(document.body.classList.contains('light-mode')).toBe(true);
    expect(StorageUtil.get(ThemeToggle._storageKey, null)).toBe('light');

    btn.click();
    expect(document.body.classList.contains('light-mode')).toBe(false);
    expect(StorageUtil.get(ThemeToggle._storageKey, null)).toBe('dark');
  });

  test('persisted preference survives a re-init', () => {
    ThemeToggle.init();
    document.getElementById('themeToggle').click();
    expect(document.body.classList.contains('light-mode')).toBe(true);

    // Simulate a page reload: drop the body class and re-init from a
    // fresh module instance.
    document.body.classList.remove('light-mode');
    jest.resetModules();
    require('../src/modules/storage.js');
    setupDom();
    const Reloaded = require('../src/modules/theme-toggle.js');
    Reloaded.init();
    expect(document.body.classList.contains('light-mode')).toBe(true);
  });

  test('toggle() updates the icon when one is present', () => {
    ThemeToggle.init();
    const icon = document.getElementById('themeIcon');
    const before = icon.textContent;
    document.getElementById('themeToggle').click();
    // Icon content is theme-dependent (sun vs moon glyph). We don't
    // assert the exact character because the source uses emoji placeholders,
    // but it must visibly change to signal the new state.
    expect(icon.textContent).not.toBe(before);
  });
});
