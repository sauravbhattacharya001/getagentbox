/**
 * @jest-environment jsdom
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');

function buildDOM() {
  const html = `<!DOCTYPE html><html><body>
    <div id="featuresSection">Features</div>
    <div id="demoSection">Demo</div>
    <div id="playgroundSection">Playground</div>
    <div id="pricingSection">Pricing</div>
    <div id="comparisonSection">Comparison</div>
  </body></html>`;
  const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'dangerously' });
  dom.window.eval(appCode);
  return dom;
}

describe('FeatureTour', () => {
  let dom, window, document;

  beforeEach(() => {
    dom = buildDOM();
    window = dom.window;
    document = window.document;
    // Clear localStorage
    try { window.localStorage.removeItem('ab-tour-completed'); } catch {}
  });

  afterEach(() => {
    dom.window.close();
  });

  test('FeatureTour is defined on window', () => {
    expect(window.FeatureTour).toBeDefined();
    expect(typeof window.FeatureTour.init).toBe('function');
    expect(typeof window.FeatureTour.start).toBe('function');
    expect(typeof window.FeatureTour.end).toBe('function');
    expect(typeof window.FeatureTour.reset).toBe('function');
  });

  test('STEPS array has entries', () => {
    expect(Array.isArray(window.FeatureTour.STEPS)).toBe(true);
    expect(window.FeatureTour.STEPS.length).toBeGreaterThanOrEqual(3);
  });

  test('each step has required fields', () => {
    for (const step of window.FeatureTour.STEPS) {
      expect(step.target).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.text).toBeTruthy();
      expect(['top', 'bottom']).toContain(step.position);
    }
  });

  test('init creates the tour start button', () => {
    window.FeatureTour.init();
    const btn = document.getElementById('tourStartBtn');
    expect(btn).not.toBeNull();
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('aria-label')).toBe('Start feature tour');
  });

  test('start creates overlay, spotlight, and tooltip', () => {
    window.FeatureTour.start();
    expect(document.getElementById('tourOverlay')).not.toBeNull();
    expect(document.getElementById('tourSpotlight')).not.toBeNull();
    expect(document.getElementById('tourTooltip')).not.toBeNull();
  });

  test('start does not create duplicate overlay', () => {
    window.FeatureTour.start();
    window.FeatureTour.start();
    const overlays = document.querySelectorAll('#tourOverlay');
    expect(overlays.length).toBe(1);
  });

  test('end removes overlay elements after transition', () => {
    jest.useFakeTimers();
    window.FeatureTour.start();
    expect(document.getElementById('tourOverlay')).not.toBeNull();

    window.FeatureTour.end();
    jest.advanceTimersByTime(500);

    expect(document.getElementById('tourOverlay')).toBeNull();
    expect(document.getElementById('tourSpotlight')).toBeNull();
    expect(document.getElementById('tourTooltip')).toBeNull();
    jest.useRealTimers();
  });

  test('end marks tour as completed in localStorage', () => {
    window.FeatureTour.start();
    window.FeatureTour.end();
    expect(window.localStorage.getItem('ab-tour-completed')).toBe('true');
  });

  test('reset clears completion state', () => {
    window.localStorage.setItem('ab-tour-completed', 'true');
    window.FeatureTour.reset();
    expect(window.localStorage.getItem('ab-tour-completed')).toBeNull();
  });

  test('init auto-starts tour on first visit', () => {
    jest.useFakeTimers();
    window.FeatureTour.init();
    jest.advanceTimersByTime(3000);
    expect(document.getElementById('tourOverlay')).not.toBeNull();
    jest.useRealTimers();
  });

  test('init does not auto-start if already completed', () => {
    jest.useFakeTimers();
    window.localStorage.setItem('ab-tour-completed', 'true');
    window.FeatureTour.init();
    jest.advanceTimersByTime(3000);
    expect(document.getElementById('tourOverlay')).toBeNull();
    jest.useRealTimers();
  });

  test('tooltip shows step content', () => {
    jest.useFakeTimers();
    window.FeatureTour.start();
    jest.advanceTimersByTime(500);

    const tooltip = document.getElementById('tourTooltip');
    expect(tooltip.innerHTML).toContain('1 / ');
    expect(tooltip.innerHTML).toContain(window.FeatureTour.STEPS[0].title);
    jest.useRealTimers();
  });

  test('tooltip has close button', () => {
    jest.useFakeTimers();
    window.FeatureTour.start();
    jest.advanceTimersByTime(500);

    const closeBtn = document.querySelector('.tour-close');
    expect(closeBtn).not.toBeNull();
    expect(closeBtn.getAttribute('aria-label')).toBe('End tour');
    jest.useRealTimers();
  });

  test('tooltip has navigation dots matching step count', () => {
    jest.useFakeTimers();
    window.FeatureTour.start();
    jest.advanceTimersByTime(500);

    const dots = document.querySelectorAll('.tour-dot');
    expect(dots.length).toBe(window.FeatureTour.STEPS.length);
    expect(dots[0].classList.contains('active')).toBe(true);
    jest.useRealTimers();
  });

  test('first step has no back button', () => {
    jest.useFakeTimers();
    window.FeatureTour.start();
    jest.advanceTimersByTime(500);

    const backBtn = document.querySelector('.tour-btn-back');
    expect(backBtn).toBeNull();
    jest.useRealTimers();
  });

  test('tooltip has accessible dialog role', () => {
    window.FeatureTour.start();
    const tooltip = document.getElementById('tourTooltip');
    expect(tooltip.getAttribute('role')).toBe('dialog');
    expect(tooltip.getAttribute('aria-label')).toBe('Feature tour');
  });

  test('overlay has aria-hidden', () => {
    window.FeatureTour.start();
    const overlay = document.getElementById('tourOverlay');
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });

  test('start button has correct class and id', () => {
    window.FeatureTour.init();
    const btn = document.getElementById('tourStartBtn');
    expect(btn.classList.contains('tour-start-btn')).toBe(true);
  });
});
