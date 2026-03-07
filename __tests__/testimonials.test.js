/**
 * @jest-environment jsdom
 */

'use strict';

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const appJs = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');

function setup() {
  document.documentElement.innerHTML = html;
  delete global.Testimonials;
  delete global.prefersReducedMotion;
  global.prefersReducedMotion = false;

  global.IntersectionObserver = class {
    constructor(cb) { this._cb = cb; }
    observe() { this._cb([{ isIntersecting: true }]); }
    unobserve() {}
    disconnect() {}
  };

  eval(appJs);
}

beforeEach(() => {
  jest.useFakeTimers();
  setup();
});

afterEach(() => {
  if (global.Testimonials) {
    Testimonials.stopAutoPlay();
  }
  jest.useRealTimers();
});

describe('Testimonials', () => {
  test('init creates navigation dots', () => {
    Testimonials.init();
    const dots = document.querySelectorAll('.testimonial-dot');
    expect(dots.length).toBeGreaterThan(0);
    expect(dots.length).toBe(Testimonials.getTotal());
  });

  test('getCurrent starts at 0 after init', () => {
    Testimonials.init();
    expect(Testimonials.getCurrent()).toBe(0);
  });

  test('getTotal returns number of slides', () => {
    Testimonials.init();
    expect(Testimonials.getTotal()).toBeGreaterThan(0);
  });

  test('goTo navigates to specific slide', () => {
    Testimonials.init();
    const total = Testimonials.getTotal();
    if (total < 2) return;

    Testimonials.goTo(1);
    expect(Testimonials.getCurrent()).toBe(1);

    const track = document.getElementById('testimonialsTrack');
    expect(track.style.transform).toBe('translateX(-100%)');
  });

  test('goTo wraps around at end', () => {
    Testimonials.init();
    const total = Testimonials.getTotal();
    Testimonials.goTo(total);
    expect(Testimonials.getCurrent()).toBe(0);
  });

  test('goTo wraps negative to last slide', () => {
    Testimonials.init();
    const total = Testimonials.getTotal();
    Testimonials.goTo(-1);
    expect(Testimonials.getCurrent()).toBe(total - 1);
  });

  test('next advances by one', () => {
    Testimonials.init();
    Testimonials.goTo(0);
    Testimonials.next();
    expect(Testimonials.getCurrent()).toBe(1);
  });

  test('prev goes back by one', () => {
    Testimonials.init();
    Testimonials.goTo(2);
    Testimonials.prev();
    expect(Testimonials.getCurrent()).toBe(1);
  });

  test('prev from 0 wraps to last', () => {
    Testimonials.init();
    const total = Testimonials.getTotal();
    Testimonials.goTo(0);
    Testimonials.prev();
    expect(Testimonials.getCurrent()).toBe(total - 1);
  });

  test('dots get active class matching current slide', () => {
    Testimonials.init();
    const dots = document.querySelectorAll('.testimonial-dot');
    if (dots.length < 2) return;

    expect(dots[0].classList.contains('active')).toBe(true);
    expect(dots[1].classList.contains('active')).toBe(false);

    Testimonials.goTo(1);
    expect(dots[0].classList.contains('active')).toBe(false);
    expect(dots[1].classList.contains('active')).toBe(true);
  });

  test('stopAutoPlay clears the interval', () => {
    Testimonials.init();
    Testimonials.startAutoPlay();
    Testimonials.stopAutoPlay();

    const current = Testimonials.getCurrent();
    jest.advanceTimersByTime(10000);
    expect(Testimonials.getCurrent()).toBe(current);
  });

  test('startAutoPlay auto-advances slides', () => {
    Testimonials.init();
    Testimonials.goTo(0);
    Testimonials.startAutoPlay();

    jest.advanceTimersByTime(5000);
    expect(Testimonials.getCurrent()).toBe(1);

    jest.advanceTimersByTime(5000);
    expect(Testimonials.getCurrent()).toBe(2);
  });

  test('_onMotionChange stops autoplay when reduced motion enabled', () => {
    Testimonials.init();
    Testimonials.startAutoPlay();
    Testimonials._onMotionChange(true);

    const current = Testimonials.getCurrent();
    jest.advanceTimersByTime(10000);
    expect(Testimonials.getCurrent()).toBe(current);
  });

  test('_onMotionChange restarts autoplay when reduced motion disabled', () => {
    Testimonials.init();
    Testimonials.goTo(0);
    Testimonials._onMotionChange(false);

    jest.advanceTimersByTime(5000);
    expect(Testimonials.getCurrent()).toBe(1);
  });

  test('goTo does not crash on empty carousel', () => {
    document.getElementById('testimonialsTrack').innerHTML = '';
    Testimonials.init();
    expect(Testimonials.getTotal()).toBe(0);
    expect(() => Testimonials.goTo(0)).not.toThrow();
  });

  test('dots have correct aria-label', () => {
    Testimonials.init();
    const dots = document.querySelectorAll('.testimonial-dot');
    if (dots.length > 0) {
      expect(dots[0].getAttribute('aria-label')).toBe('Go to testimonial 1');
      expect(dots[dots.length - 1].getAttribute('aria-label')).toContain('Go to testimonial');
    }
  });
});
