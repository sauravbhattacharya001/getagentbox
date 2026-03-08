/**
 * @jest-environment jsdom
 *
 * Tests for CommandPalette and ShareFab modules.
 * Covers: open/close lifecycle, keyboard shortcuts, filtering,
 * section navigation, share menu toggle, and social sharing.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function loadPage() {
  const callerOwnsFakeTimers = typeof setTimeout.clock !== 'undefined';
  if (!callerOwnsFakeTimers) jest.useFakeTimers();

  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  Element.prototype.scrollIntoView = jest.fn();
  window.matchMedia = window.matchMedia || function () {
    return { matches: false, addEventListener: function () {} };
  };
  window.requestAnimationFrame = window.requestAnimationFrame || function (cb) { return setTimeout(cb, 0); };
  window.cancelAnimationFrame = window.cancelAnimationFrame || function (id) { clearTimeout(id); };

  const scriptFn = new Function(appJs);
  scriptFn.call(window);
  document.dispatchEvent(new Event('DOMContentLoaded'));

  if (!callerOwnsFakeTimers) jest.useRealTimers();
}

beforeAll(() => loadPage());

afterAll(() => {
  try { if (window.CommandPalette) window.CommandPalette.destroy(); } catch (_) {}
});

// -------------------------------------------------------------------------
// CommandPalette Tests
// -------------------------------------------------------------------------
describe('CommandPalette', () => {
  afterEach(() => {
    window.CommandPalette.close();
  });

  test('overlay element exists and is hidden by default', () => {
    const overlay = document.getElementById('cmdPaletteOverlay');
    expect(overlay).toBeTruthy();
    expect(overlay.hidden).toBe(true);
  });

  test('open() shows overlay, close() hides it', () => {
    const overlay = document.getElementById('cmdPaletteOverlay');
    window.CommandPalette.open();
    expect(overlay.hidden).toBe(false);
    window.CommandPalette.close();
    expect(overlay.hidden).toBe(true);
  });

  test('Escape key closes the palette when open', () => {
    window.CommandPalette.open();
    const overlay = document.getElementById('cmdPaletteOverlay');
    expect(overlay.hidden).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true
    }));
    expect(overlay.hidden).toBe(true);
  });

  test('clicking overlay backdrop closes palette', () => {
    const overlay = document.getElementById('cmdPaletteOverlay');
    window.CommandPalette.open();
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(overlay.hidden).toBe(true);
  });

  test('palette results list has items when opened', () => {
    window.CommandPalette.open();
    const results = document.getElementById('cmdPaletteResults');
    const visible = Array.from(results.children).filter(li => !li.hidden);
    // At least 19 sections should be visible
    expect(visible.length).toBeGreaterThanOrEqual(19);
  });

  test('filtering by label text reduces visible results', () => {
    window.CommandPalette.open();
    const input = document.getElementById('cmdPaletteInput');
    const results = document.getElementById('cmdPaletteResults');

    // Get initial count
    const allVisible = Array.from(results.children).filter(li => !li.hidden).length;

    input.value = 'pricing';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const filtered = Array.from(results.children).filter(li => !li.hidden);
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.length).toBeLessThan(allVisible);
    expect(filtered.some(li => li.textContent.includes('Pricing'))).toBe(true);
  });

  test('filtering by hint text shows matching sections', () => {
    window.CommandPalette.open();
    const input = document.getElementById('cmdPaletteInput');
    input.value = 'security';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const results = document.getElementById('cmdPaletteResults');
    const visible = Array.from(results.children).filter(li => !li.hidden);
    expect(visible.length).toBeGreaterThanOrEqual(1);
    // "Trust & Privacy" has hint "Security details"
    expect(visible.some(li => li.textContent.includes('Trust'))).toBe(true);
  });

  test('Enter key navigates to selected section and closes', () => {
    window.CommandPalette.open();
    const input = document.getElementById('cmdPaletteInput');
    const overlay = document.getElementById('cmdPaletteOverlay');
    Element.prototype.scrollIntoView.mockClear();

    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true
    }));

    expect(overlay.hidden).toBe(true);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  test('clicking a result item navigates and closes', () => {
    window.CommandPalette.open();
    const results = document.getElementById('cmdPaletteResults');
    const overlay = document.getElementById('cmdPaletteOverlay');
    Element.prototype.scrollIntoView.mockClear();

    const firstVisible = Array.from(results.children).find(li => !li.hidden);
    firstVisible.click();

    expect(overlay.hidden).toBe(true);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  test('input element gets focus when palette opens', () => {
    window.CommandPalette.open();
    const input = document.getElementById('cmdPaletteInput');
    expect(document.activeElement).toBe(input);
  });

  test('opening palette resets input value', () => {
    window.CommandPalette.open();
    const input = document.getElementById('cmdPaletteInput');
    input.value = 'test';
    window.CommandPalette.close();
    window.CommandPalette.open();
    expect(input.value).toBe('');
  });
});

// -------------------------------------------------------------------------
// ShareFab Tests
// -------------------------------------------------------------------------
describe('ShareFab', () => {
  test('share menu element exists and is hidden by default', () => {
    const menu = document.getElementById('shareFabMenu');
    expect(menu).toBeTruthy();
    expect(menu.hidden).toBe(true);
  });

  test('clicking share button toggles menu open and closed', () => {
    const btn = document.getElementById('shareFabBtn');
    const menu = document.getElementById('shareFabMenu');

    btn.click();
    expect(menu.hidden).toBe(false);
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    btn.click();
    expect(menu.hidden).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  test('Escape key closes share menu when open', () => {
    const btn = document.getElementById('shareFabBtn');
    const menu = document.getElementById('shareFabMenu');

    btn.click();
    expect(menu.hidden).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true
    }));
    expect(menu.hidden).toBe(true);
  });

  test('share menu has twitter, linkedin, and copy options', () => {
    expect(document.querySelector('[data-share="twitter"]')).toBeTruthy();
    expect(document.querySelector('[data-share="linkedin"]')).toBeTruthy();
    expect(document.querySelector('[data-share="copy"]')).toBeTruthy();
  });

  test('twitter share opens intent URL in new window', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const btn = document.getElementById('shareFabBtn');

    btn.click();
    document.querySelector('[data-share="twitter"]').click();

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
      '_blank',
      expect.any(String)
    );
    openSpy.mockRestore();
  });

  test('linkedin share opens sharing URL in new window', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const btn = document.getElementById('shareFabBtn');

    btn.click();
    document.querySelector('[data-share="linkedin"]').click();

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('linkedin.com/sharing'),
      '_blank',
      expect.any(String)
    );
    openSpy.mockRestore();
  });

  test('share URLs contain the page URL', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const btn = document.getElementById('shareFabBtn');

    btn.click();
    document.querySelector('[data-share="twitter"]').click();

    const url = openSpy.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent('getagentbox.com'));
    openSpy.mockRestore();
  });

  test('menu closes after selecting a share option', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const btn = document.getElementById('shareFabBtn');
    const menu = document.getElementById('shareFabMenu');

    btn.click();
    expect(menu.hidden).toBe(false);

    document.querySelector('[data-share="twitter"]').click();
    expect(menu.hidden).toBe(true);
    openSpy.mockRestore();
  });
});
