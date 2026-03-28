/**
 * @jest-environment jsdom
 */

// Tests for ScrollProgress and ShortcutsHelp modules from app.js
// These two globally-essential modules had zero test coverage.

let scrollListeners, rafCallbacks;

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = '';
  scrollListeners = [];
  rafCallbacks = [];

  global.requestAnimationFrame = jest.fn((cb) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  global.cancelAnimationFrame = jest.fn();

  const origAdd = window.addEventListener.bind(window);
  const origRemove = window.removeEventListener.bind(window);
  jest.spyOn(window, 'addEventListener').mockImplementation((type, fn, opts) => {
    if (type === 'scroll') scrollListeners.push(fn);
    return origAdd(type, fn, opts);
  });
  jest.spyOn(window, 'removeEventListener').mockImplementation((type, fn, opts) => {
    if (type === 'scroll') {
      scrollListeners = scrollListeners.filter(l => l !== fn);
    }
    return origRemove(type, fn, opts);
  });

  window.scrollTo = jest.fn();

  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.requestAnimationFrame;
  delete global.cancelAnimationFrame;
});

function buildScrollDOM() {
  const bar = document.createElement('div');
  bar.id = 'scrollProgressBar';
  bar.style.width = '0%';
  document.body.appendChild(bar);

  const btn = document.createElement('button');
  btn.id = 'backToTop';
  document.body.appendChild(btn);

  return { bar, btn };
}

function buildShortcutsDOM() {
  const overlay = document.createElement('div');
  overlay.id = 'shortcutsOverlay';
  overlay.hidden = true;

  const closeBtn = document.createElement('button');
  closeBtn.id = 'shortcutsClose';
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);
  return { overlay, closeBtn };
}

function loadApp() {
  require('../app.js');
}

// ── ScrollProgress Tests ──────────────────────────────────────

describe('ScrollProgress', () => {
  test('module is defined after loading app.js', () => {
    buildScrollDOM();
    buildShortcutsDOM();
    loadApp();
    expect(typeof ScrollProgress).not.toBe('undefined');
    expect(typeof ScrollProgress.init).toBe('function');
    expect(typeof ScrollProgress.destroy).toBe('function');
  });

  test('init sets bar width to 0 initially', () => {
    const { bar } = buildScrollDOM();
    buildShortcutsDOM();
    loadApp();
    ScrollProgress.init();
    expect(bar.style.width).toBe('0%');
  });

  test('destroy is safe to call multiple times', () => {
    buildScrollDOM();
    buildShortcutsDOM();
    loadApp();
    expect(() => {
      ScrollProgress.destroy();
      ScrollProgress.destroy();
      ScrollProgress.destroy();
    }).not.toThrow();
  });

  test('init without DOM elements does not throw', () => {
    buildShortcutsDOM();
    loadApp();
    expect(() => ScrollProgress.init()).not.toThrow();
  });

  test('scroll listener triggers rAF-debounced update', () => {
    buildScrollDOM();
    buildShortcutsDOM();
    loadApp();
    ScrollProgress.init();

    // Verify scroll listener was registered and calls rAF
    const rafCountBefore = rafCallbacks.length;
    scrollListeners.forEach(fn => fn());
    expect(rafCallbacks.length).toBeGreaterThan(rafCountBefore);
  });

  test('clicking back-to-top calls scrollTo', () => {
    const { btn } = buildScrollDOM();
    buildShortcutsDOM();
    loadApp();
    ScrollProgress.init();

    btn.click();
    expect(window.scrollTo).toHaveBeenCalled();
  });

  test('re-init destroys previous instance first (no duplicate listeners)', () => {
    buildScrollDOM();
    buildShortcutsDOM();
    loadApp();
    ScrollProgress.init();
    const countBefore = scrollListeners.length;
    ScrollProgress.init();
    expect(scrollListeners.length).toBeLessThanOrEqual(countBefore);
  });
});

// ── ShortcutsHelp Tests ───────────────────────────────────────

describe('ShortcutsHelp', () => {
  test('init without DOM elements does not throw', () => {
    buildScrollDOM();
    loadApp();
    expect(() => ShortcutsHelp.init()).not.toThrow();
  });

  test('? key toggles overlay visibility', () => {
    buildScrollDOM();
    const { overlay } = buildShortcutsDOM();
    loadApp();
    ShortcutsHelp.init();

    expect(overlay.hidden).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(overlay.hidden).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(overlay.hidden).toBe(true);
  });

  test('Escape key closes overlay', () => {
    buildScrollDOM();
    const { overlay } = buildShortcutsDOM();
    loadApp();
    ShortcutsHelp.init();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(overlay.hidden).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(overlay.hidden).toBe(true);
  });

  test('close button closes overlay', () => {
    buildScrollDOM();
    const { overlay, closeBtn } = buildShortcutsDOM();
    loadApp();
    ShortcutsHelp.init();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(overlay.hidden).toBe(false);

    closeBtn.click();
    expect(overlay.hidden).toBe(true);
  });

  test('clicking overlay backdrop closes it', () => {
    buildScrollDOM();
    const { overlay } = buildShortcutsDOM();
    loadApp();
    ShortcutsHelp.init();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(overlay.hidden).toBe(false);

    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(overlay.hidden).toBe(true);
  });

  test('? key is ignored when typing in input', () => {
    buildScrollDOM();
    const { overlay } = buildShortcutsDOM();
    const input = document.createElement('input');
    document.body.appendChild(input);
    loadApp();
    ShortcutsHelp.init();

    const event = new KeyboardEvent('keydown', { key: '?', bubbles: true });
    Object.defineProperty(event, 'target', { value: input });
    document.dispatchEvent(event);

    expect(overlay.hidden).toBe(true);
  });

  test('? key is ignored when typing in textarea', () => {
    buildScrollDOM();
    const { overlay } = buildShortcutsDOM();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    loadApp();
    ShortcutsHelp.init();

    const event = new KeyboardEvent('keydown', { key: '?', bubbles: true });
    Object.defineProperty(event, 'target', { value: textarea });
    document.dispatchEvent(event);

    expect(overlay.hidden).toBe(true);
  });

  test('? with ctrl modifier is ignored', () => {
    buildScrollDOM();
    const { overlay } = buildShortcutsDOM();
    loadApp();
    ShortcutsHelp.init();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', ctrlKey: true, bubbles: true }));
    expect(overlay.hidden).toBe(true);
  });

  test('? with meta modifier is ignored', () => {
    buildScrollDOM();
    const { overlay } = buildShortcutsDOM();
    loadApp();
    ShortcutsHelp.init();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', metaKey: true, bubbles: true }));
    expect(overlay.hidden).toBe(true);
  });

  test('? with alt modifier is ignored', () => {
    buildScrollDOM();
    const { overlay } = buildShortcutsDOM();
    loadApp();
    ShortcutsHelp.init();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', altKey: true, bubbles: true }));
    expect(overlay.hidden).toBe(true);
  });

  test('Escape does nothing when overlay is already closed', () => {
    buildScrollDOM();
    const { overlay } = buildShortcutsDOM();
    loadApp();
    ShortcutsHelp.init();

    expect(overlay.hidden).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(overlay.hidden).toBe(true);
  });
});
