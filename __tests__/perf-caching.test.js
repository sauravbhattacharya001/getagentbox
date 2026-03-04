/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');

describe('DOM caching performance optimizations', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = html;
    // Provide localStorage stub for init chain
    if (!window.localStorage) {
      window.localStorage = {
        _data: {},
        getItem: function(k) { return this._data[k] || null; },
        setItem: function(k, v) { this._data[k] = String(v); },
        removeItem: function(k) { delete this._data[k]; },
      };
    }
    // Stub IntersectionObserver
    if (!window.IntersectionObserver) {
      window.IntersectionObserver = function(cb) {
        return { observe: function() {}, unobserve: function() {}, disconnect: function() {} };
      };
    }
    // Stub matchMedia
    if (!window.matchMedia) {
      window.matchMedia = function() {
        return { matches: false, addEventListener: function() {} };
      };
    }
    eval(appJs);
  });

  describe('Testimonials cached references', () => {
    test('goTo does not call getElementById for track on each invocation', () => {
      window.Testimonials.init();

      const spy = jest.spyOn(document, 'getElementById');
      spy.mockClear();

      for (let i = 0; i < 10; i++) {
        window.Testimonials.goTo(i % Math.max(1, window.Testimonials.getTotal()));
      }

      const trackCalls = spy.mock.calls.filter(c => c[0] === 'testimonialsTrack');
      expect(trackCalls.length).toBe(0);
      spy.mockRestore();
    });

    test('goTo does not call querySelectorAll for dots', () => {
      window.Testimonials.init();

      const spy = jest.spyOn(document, 'querySelectorAll');
      spy.mockClear();

      for (let i = 0; i < 5; i++) {
        window.Testimonials.goTo(i);
      }

      const dotCalls = spy.mock.calls.filter(c =>
        typeof c[0] === 'string' && c[0].includes('testimonial-dot')
      );
      expect(dotCalls.length).toBe(0);
      spy.mockRestore();
    });

    test('carousel navigation wraps around correctly', () => {
      window.Testimonials.init();
      const total = window.Testimonials.getTotal();
      if (total < 2) return;

      window.Testimonials.goTo(1);
      expect(window.Testimonials.getCurrent()).toBe(1);

      window.Testimonials.goTo(total);
      expect(window.Testimonials.getCurrent()).toBe(0);

      window.Testimonials.goTo(-1);
      expect(window.Testimonials.getCurrent()).toBe(total - 1);
    });

    test('dot active state updates correctly with cached dots', () => {
      window.Testimonials.init();
      const total = window.Testimonials.getTotal();
      if (total < 2) return;

      window.Testimonials.goTo(0);
      let dots = document.querySelectorAll('.testimonial-dot');
      expect(dots[0].classList.contains('active')).toBe(true);
      expect(dots[1].classList.contains('active')).toBe(false);

      window.Testimonials.goTo(1);
      dots = document.querySelectorAll('.testimonial-dot');
      expect(dots[0].classList.contains('active')).toBe(false);
      expect(dots[1].classList.contains('active')).toBe(true);
    });
  });

  describe('FAQ scoped queries', () => {
    test('accordion closes siblings when opening new item', () => {
      const faqItems = document.querySelectorAll('.faq-item');
      if (faqItems.length < 2) return;

      const q1 = faqItems[0].querySelector('.faq-question');
      const q2 = faqItems[1].querySelector('.faq-question');
      if (!q1 || !q2) return;

      window.FAQ.toggle(q1);
      expect(faqItems[0].classList.contains('open')).toBe(true);

      window.FAQ.toggle(q2);
      expect(faqItems[0].classList.contains('open')).toBe(false);
      expect(faqItems[1].classList.contains('open')).toBe(true);
    });

    test('toggle does not scan full document for .faq-item', () => {
      const faqItems = document.querySelectorAll('.faq-item');
      if (faqItems.length < 1) return;

      const q1 = faqItems[0].querySelector('.faq-question');
      if (!q1) return;

      window.FAQ.toggle(q1);

      const spy = jest.spyOn(document, 'querySelectorAll');
      spy.mockClear();

      window.FAQ.toggle(q1);

      const docCalls = spy.mock.calls.filter(c =>
        typeof c[0] === 'string' && c[0].includes('faq-item')
      );
      expect(docCalls.length).toBe(0);
      spy.mockRestore();
    });
  });

  describe('Trust scoped queries', () => {
    test('source code uses parent-scoped querySelectorAll', () => {
      // Static analysis: verify Trust.toggle uses parentElement instead of document
      const src = appJs;
      const trustMatch = src.match(/var Trust[\s\S]*?return \{ toggle: toggle \};/);
      expect(trustMatch).toBeTruthy();
      const trustSrc = trustMatch[0];
      expect(trustSrc).not.toContain('document.querySelectorAll');
      expect(trustSrc).toContain('card.parentElement');
    });
  });

  describe('Pricing cached references', () => {
    test('toggle resolves billing elements only once', () => {
      window.Pricing.toggle();

      const spy = jest.spyOn(document, 'getElementById');
      spy.mockClear();

      window.Pricing.toggle();
      window.Pricing.toggle();

      const billingCalls = spy.mock.calls.filter(c =>
        ['billingToggle', 'monthlyLabel', 'yearlyLabel'].includes(c[0])
      );
      expect(billingCalls.length).toBe(0);
      spy.mockRestore();
    });

    test('toggle caches price NodeLists', () => {
      window.Pricing.toggle();

      const spy = jest.spyOn(document, 'querySelectorAll');
      spy.mockClear();

      window.Pricing.toggle();

      const priceCalls = spy.mock.calls.filter(c =>
        typeof c[0] === 'string' && (c[0].includes('price-amount') || c[0].includes('price-period'))
      );
      expect(priceCalls.length).toBe(0);
      spy.mockRestore();
    });

    test('source code uses cached variables', () => {
      const src = appJs;
      const pricingMatch = src.match(/var Pricing[\s\S]*?return \{ toggle: toggle \};/);
      expect(pricingMatch).toBeTruthy();
      const pricingSrc = pricingMatch[0];
      expect(pricingSrc).toContain('_resolved');
      expect(pricingSrc).toContain('_priceAmounts');
      expect(pricingSrc).toContain('_pricePeriods');
    });
  });
});
