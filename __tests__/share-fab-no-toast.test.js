/**
 * @jest-environment jsdom
 *
 * Regression tests for ShareFab when the optional toast element is missing.
 *
 * Bug: openMenu() and showToast() unconditionally touched `toast.hidden`.
 * Pages that render the share FAB without a paired #shareToast element
 * (any page that opts out of the copy-confirmation UI) hit a TypeError
 * the moment the user opened the menu or clicked "Copy link", which
 * killed the entire click handler and made the FAB feel broken.
 */

const fs = require('fs');
const path = require('path');

function loadShareFab() {
  // ShareFab depends on a global `prefersReducedMotion` flag from globals.js;
  // we don't need it here but stub anything that might be referenced.
  global.prefersReducedMotion = false;

  const code = fs.readFileSync(
    path.resolve(__dirname, '../src/modules/share-fab.js'),
    'utf8'
  );
  // Evaluate in the current scope so `ShareFab` becomes available.
  // eslint-disable-next-line no-eval
  eval(code);
  return ShareFab; // eslint-disable-line no-undef
}

function buildMarkup({ withToast }) {
  document.body.innerHTML = `
    <div class="share-fab">
      <button id="shareFabBtn" aria-expanded="false">Share</button>
      <div id="shareFabMenu" hidden>
        <button class="share-option" data-share="twitter">Twitter</button>
        <button class="share-option" data-share="linkedin">LinkedIn</button>
        <button class="share-option" data-share="copy">Copy link</button>
      </div>
      ${withToast ? '<div id="shareToast" hidden>Copied!</div>' : ''}
    </div>
  `;
}

describe('ShareFab — optional toast element', () => {
  let SF;

  beforeEach(() => {
    jest.useFakeTimers();
    // Stub clipboard so the "copy" path is deterministic.
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
    // Stub window.open to swallow popup calls.
    window.open = jest.fn();
    SF = loadShareFab();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('opening the menu does not throw when #shareToast is absent', () => {
    buildMarkup({ withToast: false });
    SF.init();

    const btn = document.getElementById('shareFabBtn');
    const menu = document.getElementById('shareFabMenu');

    expect(() => btn.click()).not.toThrow();
    expect(menu.hidden).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  test('copy share option does not throw when #shareToast is absent', async () => {
    buildMarkup({ withToast: false });
    SF.init();

    document.getElementById('shareFabBtn').click(); // open menu
    const copyBtn = document.querySelector('[data-share="copy"]');

    expect(() => copyBtn.click()).not.toThrow();
    // Clipboard call still happens — the missing toast must not break copy.
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://getagentbox.com'
    );
  });

  test('toast still works normally when the element IS present', () => {
    buildMarkup({ withToast: true });
    SF.init();

    document.getElementById('shareFabBtn').click(); // open menu
    const toast = document.getElementById('shareToast');
    expect(toast.hidden).toBe(true); // openMenu hides toast

    const copyBtn = document.querySelector('[data-share="copy"]');
    copyBtn.click();

    // writeText is async; flush microtasks then the showToast call.
    return Promise.resolve().then(() => {
      expect(toast.hidden).toBe(false);
      // The 2-second auto-hide timer should also fire cleanly.
      jest.advanceTimersByTime(2100);
      expect(toast.hidden).toBe(true);
    });
  });
});
