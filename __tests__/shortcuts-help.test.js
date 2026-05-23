/**
 * @jest-environment jsdom
 *
 * Unit tests for the ShortcutsHelp module (src/modules/shortcuts-help.js).
 *
 * The module exposes only init(); behaviour is driven entirely through
 * DOM events on document. Because init() attaches a keydown listener to
 * `document` (which jsdom preserves across tests) and has no destroy(),
 * we load and init the module exactly once in beforeAll and reset the
 * overlay's `hidden` state between tests.
 */
'use strict';

let ShortcutsHelp;
let overlay, closeBtn, themeBtn;

function press(key, target, extra) {
  target = target || document.body;
  const init = Object.assign({ key, bubbles: true, cancelable: true }, extra || {});
  target.dispatchEvent(new KeyboardEvent('keydown', init));
}

describe('ShortcutsHelp - no-op init paths', () => {
  test('init() does not throw when the overlay element is missing', () => {
    jest.isolateModules(() => {
      document.body.innerHTML = '';
      const M = require('../src/modules/shortcuts-help.js');
      expect(() => M.init()).not.toThrow();
    });
  });

  test('init() does not throw when the close button is missing', () => {
    jest.isolateModules(() => {
      document.body.innerHTML = '<div id="shortcutsOverlay" hidden></div>';
      const M = require('../src/modules/shortcuts-help.js');
      expect(() => M.init()).not.toThrow();
    });
  });
});

describe('ShortcutsHelp - active behaviour', () => {
  beforeAll(() => {
    document.body.innerHTML = `
      <button id="themeToggle"></button>
      <div id="shortcutsOverlay" hidden>
        <div id="shortcutsDialog">
          <button id="shortcutsClose">Close</button>
        </div>
      </div>
      <input id="typingInput" />
      <textarea id="typingArea"></textarea>
      <div id="editable" contenteditable="true"></div>
    `;
    overlay = document.getElementById('shortcutsOverlay');
    closeBtn = document.getElementById('shortcutsClose');
    themeBtn = document.getElementById('themeToggle');

    jest.isolateModules(() => {
      ShortcutsHelp = require('../src/modules/shortcuts-help.js');
      ShortcutsHelp.init();
    });
  });

  beforeEach(() => {
    // Reset overlay to hidden between tests so each test sees a known state.
    overlay.hidden = true;
  });

  test('"?" key opens the overlay and toggles it closed on re-press', () => {
    press('?');
    expect(overlay.hidden).toBe(false);

    press('?');
    expect(overlay.hidden).toBe(true);
  });

  test('Escape closes an open overlay', () => {
    press('?');
    expect(overlay.hidden).toBe(false);
    press('Escape');
    expect(overlay.hidden).toBe(true);
  });

  test('Escape on a hidden overlay does not crash', () => {
    expect(() => press('Escape')).not.toThrow();
    expect(overlay.hidden).toBe(true);
  });

  test('close button closes the overlay', () => {
    press('?');
    closeBtn.click();
    expect(overlay.hidden).toBe(true);
  });

  test('clicking the overlay backdrop closes it; clicking the dialog does not', () => {
    press('?');
    document.getElementById('shortcutsDialog').click();
    expect(overlay.hidden).toBe(false);

    overlay.click();
    expect(overlay.hidden).toBe(true);
  });

  test('"?" is ignored when typing in an input', () => {
    press('?', document.getElementById('typingInput'));
    expect(overlay.hidden).toBe(true);
  });

  test('"?" is ignored when typing in a textarea', () => {
    press('?', document.getElementById('typingArea'));
    expect(overlay.hidden).toBe(true);
  });

  // Note: jsdom does not reliably implement `Element.isContentEditable`,
  // so we don't assert that branch here. The INPUT/TEXTAREA tests above
  // exercise the same is-user-typing guard.

  test('"?" with Ctrl/Meta/Alt modifier is ignored', () => {
    press('?', document.body, { ctrlKey: true });
    expect(overlay.hidden).toBe(true);
    press('?', document.body, { metaKey: true });
    expect(overlay.hidden).toBe(true);
    press('?', document.body, { altKey: true });
    expect(overlay.hidden).toBe(true);
  });

  test('"t" forwards a click to #themeToggle when overlay is hidden', () => {
    const spy = jest.fn();
    themeBtn.addEventListener('click', spy);
    try {
      press('t');
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      themeBtn.removeEventListener('click', spy);
    }
  });

  test('"t" does NOT trigger themeToggle while overlay is open', () => {
    press('?'); // open
    expect(overlay.hidden).toBe(false);

    const spy = jest.fn();
    themeBtn.addEventListener('click', spy);
    try {
      press('t');
      expect(spy).not.toHaveBeenCalled();
    } finally {
      themeBtn.removeEventListener('click', spy);
    }
  });
});
