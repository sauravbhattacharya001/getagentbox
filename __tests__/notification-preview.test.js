/**
 * @jest-environment jsdom
 *
 * Tests for the Notification Preview section: HTML structure, scenario cycling,
 * compact/detailed toggle, keyboard accessibility, animation, and dark mode.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function setup() {
  document.documentElement.innerHTML = html;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Reset globals that app.js defines
  delete global.NotificationPreview;
  delete global.prefersReducedMotion;
  global.prefersReducedMotion = false;

  // Mock IntersectionObserver (used by other modules during init)
  global.IntersectionObserver = class {
    constructor(cb) { this._cb = cb; }
    observe() { this._cb([{ isIntersecting: true }]); }
    unobserve() {}
    disconnect() {}
  };

  // Indirect eval runs in global scope so `var` declarations become globals
  (0, eval)(appJs);
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

// ── HTML Structure ──────────────────────────────────────────────────

describe('Notification Preview — HTML structure', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    setup();
  });
  afterAll(() => {
    try { if (global.Testimonials) Testimonials.stopAutoPlay(); } catch (_) {}
    try { if (global.SiteNav) SiteNav.destroy(); } catch (_) {}
    jest.useRealTimers();
  });

  test('section exists with correct id', () => {
    const section = document.getElementById('notificationSection');
    expect(section).toBeTruthy();
    expect(section.classList.contains('notification-section')).toBe(true);
  });

  test('has heading and subtitle', () => {
    const section = document.getElementById('notificationSection');
    const h2 = section.querySelector('h2');
    expect(h2).toBeTruthy();
    expect(h2.textContent).toMatch(/See It In Action/i);
    const subtitle = section.querySelector('.notification-subtitle');
    expect(subtitle).toBeTruthy();
    expect(subtitle.textContent).toMatch(/preview/i);
  });

  test('has phone mockup with status bar', () => {
    const phone = document.querySelector('.notification-phone');
    expect(phone).toBeTruthy();
    const statusBar = phone.querySelector('.phone-status-bar');
    expect(statusBar).toBeTruthy();
    expect(statusBar.querySelector('.phone-time')).toBeTruthy();
    expect(statusBar.querySelector('.phone-battery')).toBeTruthy();
  });

  test('has notification element with required parts', () => {
    const notif = document.querySelector('.phone-notification');
    expect(notif).toBeTruthy();
    expect(notif.querySelector('.phone-notif-icon')).toBeTruthy();
    expect(notif.querySelector('.phone-notif-app')).toBeTruthy();
    expect(notif.querySelector('.phone-notif-title')).toBeTruthy();
    expect(notif.querySelector('.phone-notif-body')).toBeTruthy();
    expect(notif.querySelector('.phone-notif-time')).toBeTruthy();
  });

  test('has 5 scenario buttons', () => {
    const btns = document.querySelectorAll('.notif-scenario-btn');
    expect(btns.length).toBe(5);
  });

  test('has compact/detailed toggle buttons', () => {
    const btns = document.querySelectorAll('.notif-view-btn');
    expect(btns.length).toBe(2);
    expect(btns[0].dataset.view).toBe('compact');
    expect(btns[1].dataset.view).toBe('detailed');
  });

  test('nav contains Preview link', () => {
    const link = document.querySelector('a[href="#notificationSection"]');
    expect(link).toBeTruthy();
    expect(link.textContent).toBe('Preview');
  });

  test('section appears before trustSection in DOM', () => {
    const notif = document.getElementById('notificationSection');
    const trust = document.getElementById('trustSection');
    expect(notif).toBeTruthy();
    expect(trust).toBeTruthy();
    // compareDocumentPosition bit 4 = DOCUMENT_POSITION_FOLLOWING
    expect(notif.compareDocumentPosition(trust) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// ── Scenario Cycling ────────────────────────────────────────────────

describe('Notification Preview — scenario cycling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setup();
  });
  afterEach(() => {
    try { if (global.Testimonials) Testimonials.stopAutoPlay(); } catch (_) {}
    try { if (global.SiteNav) SiteNav.destroy(); } catch (_) {}
    jest.useRealTimers();
  });

  test('first scenario is rendered on init', () => {
    const title = document.querySelector('.phone-notif-title');
    expect(title.textContent).toBe('Reminder');
  });

  test('switchScenario changes notification content', () => {
    NotificationPreview.switchScenario(3);
    const title = document.querySelector('.phone-notif-title');
    const body = document.querySelector('.phone-notif-body');
    expect(title.textContent).toBe('Smart Alert');
    expect(body.textContent).toMatch(/Amazon package/);
    expect(NotificationPreview.getCurrent()).toBe(3);
  });

  test('clicking scenario button updates content', () => {
    const btns = document.querySelectorAll('.notif-scenario-btn');
    btns[2].click();
    expect(NotificationPreview.getCurrent()).toBe(2);
    const title = document.querySelector('.phone-notif-title');
    expect(title.textContent).toBe('Daily Digest');
  });

  test('scenario buttons update active states', () => {
    NotificationPreview.switchScenario(4);
    const btns = document.querySelectorAll('.notif-scenario-btn');
    expect(btns[4].classList.contains('active')).toBe(true);
    expect(btns[4].getAttribute('aria-selected')).toBe('true');
    expect(btns[0].classList.contains('active')).toBe(false);
    expect(btns[0].getAttribute('aria-selected')).toBe('false');
  });

  test('invalid scenario index is ignored', () => {
    NotificationPreview.switchScenario(0);
    NotificationPreview.switchScenario(99);
    expect(NotificationPreview.getCurrent()).toBe(0);
    NotificationPreview.switchScenario(-1);
    expect(NotificationPreview.getCurrent()).toBe(0);
  });

  test('getScenarios returns all 5 scenarios', () => {
    const scenarios = NotificationPreview.getScenarios();
    expect(scenarios.length).toBe(5);
    expect(scenarios[0].title).toBe('Reminder');
    expect(scenarios[4].title).toBe('Scheduled Message');
  });
});

// ── Compact / Detailed Toggle ───────────────────────────────────────

describe('Notification Preview — compact/detailed toggle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setup();
  });
  afterEach(() => {
    try { if (global.Testimonials) Testimonials.stopAutoPlay(); } catch (_) {}
    try { if (global.SiteNav) SiteNav.destroy(); } catch (_) {}
    jest.useRealTimers();
  });

  test('defaults to compact view with detail hidden', () => {
    expect(NotificationPreview.getView()).toBe('compact');
    const detail = document.querySelector('.phone-notif-detail');
    expect(detail.hidden).toBe(true);
  });

  test('setView("detailed") shows detail panel', () => {
    NotificationPreview.setView('detailed');
    expect(NotificationPreview.getView()).toBe('detailed');
    const detail = document.querySelector('.phone-notif-detail');
    expect(detail.hidden).toBe(false);
    expect(detail.textContent.length).toBeGreaterThan(0);
  });

  test('clicking detailed button toggles view', () => {
    const btns = document.querySelectorAll('.notif-view-btn');
    btns[1].click(); // "Detailed"
    expect(NotificationPreview.getView()).toBe('detailed');
    expect(btns[1].classList.contains('active')).toBe(true);
    expect(btns[1].getAttribute('aria-pressed')).toBe('true');
    expect(btns[0].classList.contains('active')).toBe(false);
    expect(btns[0].getAttribute('aria-pressed')).toBe('false');
  });

  test('switching back to compact hides detail', () => {
    NotificationPreview.setView('detailed');
    NotificationPreview.setView('compact');
    const detail = document.querySelector('.phone-notif-detail');
    expect(detail.hidden).toBe(true);
  });

  test('invalid view mode is ignored', () => {
    NotificationPreview.setView('invalid');
    expect(NotificationPreview.getView()).toBe('compact');
  });
});

// ── Keyboard Accessibility ──────────────────────────────────────────

describe('Notification Preview — keyboard accessibility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setup();
  });
  afterEach(() => {
    try { if (global.Testimonials) Testimonials.stopAutoPlay(); } catch (_) {}
    try { if (global.SiteNav) SiteNav.destroy(); } catch (_) {}
    jest.useRealTimers();
  });

  test('scenario buttons have role="tab" and tablist', () => {
    const tablist = document.querySelector('.notification-scenarios[role="tablist"]');
    expect(tablist).toBeTruthy();
    const tabs = tablist.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(5);
  });

  test('arrow key navigation cycles scenarios', () => {
    const btns = document.querySelectorAll('.notif-scenario-btn');
    btns[0].focus();
    btns[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    // arrowKeyNav focuses the next button and calls switchScenario
    expect(NotificationPreview.getCurrent()).toBe(1);
  });

  test('notification area has aria-live for screen readers', () => {
    const notif = document.querySelector('.phone-notification');
    expect(notif.getAttribute('aria-live')).toBe('polite');
    expect(notif.getAttribute('role')).toBe('status');
  });

  test('phone mockup has aria-label', () => {
    const phone = document.querySelector('.notification-phone');
    expect(phone.getAttribute('aria-label')).toBeTruthy();
  });
});

// ── Animation ───────────────────────────────────────────────────────

describe('Notification Preview — animation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setup();
  });
  afterEach(() => {
    try { if (global.Testimonials) Testimonials.stopAutoPlay(); } catch (_) {}
    try { if (global.SiteNav) SiteNav.destroy(); } catch (_) {}
    jest.useRealTimers();
  });

  test('slide-in class is applied on scenario switch', () => {
    global.prefersReducedMotion = false;
    NotificationPreview.switchScenario(2);
    const notif = document.querySelector('.phone-notification');
    expect(notif.classList.contains('notif-slide-in')).toBe(true);
  });

  test('slide-in class is NOT applied when reduced motion preferred', () => {
    global.prefersReducedMotion = true;
    NotificationPreview.switchScenario(1);
    const notif = document.querySelector('.phone-notification');
    expect(notif.classList.contains('notif-slide-in')).toBe(false);
  });
});

// ── CSS / Dark Mode ─────────────────────────────────────────────────

describe('Notification Preview — CSS & dark mode', () => {
  test('CSS includes notification section styles', () => {
    expect(css).toContain('.notification-section');
    expect(css).toContain('.notification-phone');
    expect(css).toContain('.phone-notification');
    expect(css).toContain('.notif-scenario-btn');
    expect(css).toContain('.notif-slide-in');
  });

  test('CSS includes light theme overrides', () => {
    expect(css).toContain('[data-theme="light"] .notification-section');
    expect(css).toContain('[data-theme="light"] .notification-phone');
    expect(css).toContain('[data-theme="light"] .phone-notification');
    expect(css).toContain('[data-theme="light"] .notif-scenario-btn');
    expect(css).toContain('[data-theme="light"] .notif-view-btn');
  });

  test('CSS includes slide-in animation keyframes', () => {
    expect(css).toContain('@keyframes notifSlideIn');
  });

  test('CSS includes responsive styles', () => {
    expect(css).toMatch(/@media.*480px[\s\S]*\.notification-phone/);
  });
});
