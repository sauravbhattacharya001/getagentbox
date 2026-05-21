/**
 * @jest-environment jsdom
 *
 * Behavioural tests for ShareFab covering the happy paths that the existing
 * regression file (`share-fab-no-toast.test.js`) intentionally leaves out:
 *   - twitter / linkedin share URL composition + popup geometry
 *   - copy-link clipboard fallback when navigator.clipboard is unavailable
 *   - click-outside + Escape key dismissal
 *   - menu toggle aria-expanded contract
 *   - toast auto-hide timer cancellation when the user clicks copy twice
 *
 * ShareFab is a global IIFE; loading via require() doesn't work in jsdom
 * because the module isn't a CommonJS export. We follow the project
 * convention of `fs.readFileSync` + `eval` (see __tests__/share-fab-no-toast.test.js).
 */

const fs = require('fs');
const path = require('path');

function loadShareFab() {
  global.prefersReducedMotion = false;
  const code = fs.readFileSync(
    path.resolve(__dirname, '../src/modules/share-fab.js'),
    'utf8'
  );
  // eslint-disable-next-line no-eval
  eval(code);
  return ShareFab; // eslint-disable-line no-undef
}

function markup() {
  document.body.innerHTML = `
    <div class="share-fab">
      <button id="shareFabBtn" aria-expanded="false">Share</button>
      <div id="shareFabMenu" hidden>
        <button class="share-option" data-share="twitter">Twitter</button>
        <button class="share-option" data-share="linkedin">LinkedIn</button>
        <button class="share-option" data-share="copy">Copy link</button>
      </div>
      <div id="shareToast" hidden>Copied!</div>
    </div>
    <div id="outside-region">outside</div>
  `;
}

describe('ShareFab — behaviour', () => {
  let SF;
  let openSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    markup();
    openSpy = jest.fn();
    window.open = openSpy;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    SF = loadShareFab();
    SF.init();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('menu toggle', () => {
    test('clicking the FAB toggles aria-expanded and menu visibility', () => {
      const btn = document.getElementById('shareFabBtn');
      const menu = document.getElementById('shareFabMenu');

      expect(btn.getAttribute('aria-expanded')).toBe('false');
      expect(menu.hidden).toBe(true);

      btn.click();
      expect(btn.getAttribute('aria-expanded')).toBe('true');
      expect(menu.hidden).toBe(false);

      btn.click();
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      expect(menu.hidden).toBe(true);
    });

    test('opening the menu resets the toast to hidden', () => {
      const toast = document.getElementById('shareToast');
      toast.hidden = false; // simulate leftover state from a prior open
      document.getElementById('shareFabBtn').click();
      expect(toast.hidden).toBe(true);
    });

  });


  describe('dismissal', () => {
    test('clicking outside the .share-fab container closes the menu', () => {
      const btn = document.getElementById('shareFabBtn');
      const menu = document.getElementById('shareFabMenu');
      btn.click(); // open
      expect(menu.hidden).toBe(false);

      document.getElementById('outside-region').click();
      expect(menu.hidden).toBe(true);
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    });

    test('clicking inside the .share-fab container does NOT close the menu', () => {
      const btn = document.getElementById('shareFabBtn');
      const menu = document.getElementById('shareFabMenu');
      btn.click(); // open
      // A click on the FAB container itself (not on a share option) shouldn't close.
      // Simulate a click on the wrapper div by dispatching from the menu element.
      const containerClick = new MouseEvent('click', { bubbles: true });
      menu.dispatchEvent(containerClick);
      expect(menu.hidden).toBe(false);
    });

    test('pressing Escape closes the menu', () => {
      const btn = document.getElementById('shareFabBtn');
      const menu = document.getElementById('shareFabMenu');
      btn.click();
      expect(menu.hidden).toBe(false);

      const esc = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(esc);
      expect(menu.hidden).toBe(true);
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    });

    test('non-Escape keys do not close the menu', () => {
      const btn = document.getElementById('shareFabBtn');
      const menu = document.getElementById('shareFabMenu');
      btn.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(menu.hidden).toBe(false);
    });
  });

  describe('share targets', () => {
    test('twitter option opens a tweet intent with title, description, and URL', () => {
      document.getElementById('shareFabBtn').click();
      document.querySelector('[data-share="twitter"]').click();

      expect(openSpy).toHaveBeenCalledTimes(1);
      const [url, target, features] = openSpy.mock.calls[0];
      expect(url).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?text=/);
      // Title and URL are encoded into the intent string.
      expect(url).toContain(encodeURIComponent('AgentBox - Your Personal AI Agent on Telegram'));
      expect(url).toContain('url=' + encodeURIComponent('https://getagentbox.com'));
      expect(target).toBe('_blank');
      expect(features).toContain('noopener');
      expect(features).toContain('width=550');
      // Menu closes after picking a share target.
      expect(document.getElementById('shareFabMenu').hidden).toBe(true);
    });

    test('linkedin option opens the LinkedIn share-offsite URL', () => {
      document.getElementById('shareFabBtn').click();
      document.querySelector('[data-share="linkedin"]').click();

      expect(openSpy).toHaveBeenCalledTimes(1);
      const [url, target] = openSpy.mock.calls[0];
      expect(url).toBe(
        'https://www.linkedin.com/sharing/share-offsite/?url=' +
          encodeURIComponent('https://getagentbox.com')
      );
      expect(target).toBe('_blank');
    });

    test('copy option uses navigator.clipboard when available and shows the toast', async () => {
      document.getElementById('shareFabBtn').click();
      document.querySelector('[data-share="copy"]').click();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://getagentbox.com');
      expect(openSpy).not.toHaveBeenCalled();

      // Flush the resolved promise so showToast runs.
      await Promise.resolve();
      const toast = document.getElementById('shareToast');
      expect(toast.hidden).toBe(false);

      // Auto-hides after 2 seconds.
      jest.advanceTimersByTime(2000);
      expect(toast.hidden).toBe(true);
    });

    test('rapid copy clicks reset the auto-hide timer instead of stacking', async () => {
      document.getElementById('shareFabBtn').click();
      const copyBtn = document.querySelector('[data-share="copy"]');
      copyBtn.click();
      await Promise.resolve();
      // Re-open menu and click copy again before the first timer fires.
      document.getElementById('shareFabBtn').click();
      jest.advanceTimersByTime(1500); // < 2000ms
      document.querySelector('[data-share="copy"]').click();
      await Promise.resolve();

      const toast = document.getElementById('shareToast');
      // After the second click the toast is visible and the OLD 500ms-left
      // timer would have hidden it if we didn't reset — assert we still have it.
      jest.advanceTimersByTime(600);
      expect(toast.hidden).toBe(false);
      // Now the fresh 2000ms timer should still complete.
      jest.advanceTimersByTime(1500);
      expect(toast.hidden).toBe(true);
    });

    test('copy falls back to document.execCommand when navigator.clipboard is unavailable', () => {
      // Re-init with no clipboard support.
      delete navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });
      markup();
      SF.init();
      // Force document.execCommand to be a spy that returns true and records selection content.
      const execSpy = jest.fn().mockReturnValue(true);
      document.execCommand = execSpy;

      document.getElementById('shareFabBtn').click();
      document.querySelector('[data-share="copy"]').click();

      expect(execSpy).toHaveBeenCalledWith('copy');
      // textarea is removed after the copy.
      expect(document.querySelectorAll('textarea').length).toBe(0);
      // Toast becomes visible synchronously in the fallback path.
      expect(document.getElementById('shareToast').hidden).toBe(false);
    });
  });
});
