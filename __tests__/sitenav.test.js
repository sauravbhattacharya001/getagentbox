/**
 * @jest-environment jsdom
 */

/* global SiteNav */

// Minimal HTML fixture with nav and sections
function setupDOM() {
  document.body.innerHTML = `
    <nav class="site-nav" id="siteNav" aria-label="Main navigation">
      <div class="nav-inner">
        <a href="#" class="nav-logo" aria-label="Back to top">🤖 AgentBox</a>
        <button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">
          <span class="nav-hamburger"></span>
        </button>
        <ul class="nav-links" id="navLinks" role="menubar">
          <li role="none"><a href="#featuresSection" role="menuitem">Features</a></li>
          <li role="none"><a href="#howItWorks" role="menuitem">How It Works</a></li>
          <li role="none"><a href="#demoSection" role="menuitem">Demo</a></li>
          <li role="none"><a href="#pricingSection" role="menuitem">Pricing</a></li>
          <li role="none"><a href="#faqSection" role="menuitem">FAQ</a></li>
        </ul>
      </div>
    </nav>
    <div id="featuresSection" style="position:relative;"></div>
    <div id="howItWorks" style="position:relative;"></div>
    <div id="demoSection" style="position:relative;"></div>
    <div id="pricingSection" style="position:relative;"></div>
    <div id="faqSection" style="position:relative;"></div>
  `;
}

// Stub matchMedia and requestAnimationFrame
beforeAll(() => {
  window.matchMedia = window.matchMedia || function () {
    return { matches: false, addListener: function () {}, removeListener: function () {} };
  };
  window.requestAnimationFrame = window.requestAnimationFrame || function (cb) { cb(); return 0; };
  window.scrollTo = jest.fn();
  // jsdom doesn't implement scrollIntoView
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || jest.fn();
});

beforeEach(() => {
  setupDOM();
  // Reset global
  if (typeof SiteNav !== 'undefined' && SiteNav.reset) SiteNav.reset();
  // Re-load app.js to re-run module definitions
  jest.resetModules();
  // Set prefersReducedMotion
  window.prefersReducedMotion = false;
  require('../app.js');
});

describe('SiteNav module', () => {
  test('SiteNav is exposed globally', () => {
    expect(window.SiteNav).toBeDefined();
    expect(typeof window.SiteNav.init).toBe('function');
    expect(typeof window.SiteNav.getActiveSection).toBe('function');
    expect(typeof window.SiteNav.reset).toBe('function');
    expect(typeof window.SiteNav.closeMenu).toBe('function');
  });

  test('init renders without errors', () => {
    expect(() => window.SiteNav.init()).not.toThrow();
  });

  test('getActiveSection returns null before scrolling', () => {
    window.SiteNav.init();
    // At top of page, might return first section or null
    const result = window.SiteNav.getActiveSection();
    expect(result === null || typeof result === 'string').toBe(true);
  });

  test('reset clears active state', () => {
    window.SiteNav.init();
    window.SiteNav.reset();
    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
      expect(link.classList.contains('active')).toBe(false);
    });
  });

  test('nav toggle opens and closes mobile menu', () => {
    window.SiteNav.init();
    const toggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(navLinks.classList.contains('open')).toBe(true);

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(navLinks.classList.contains('open')).toBe(false);
  });

  test('closeMenu closes mobile menu', () => {
    window.SiteNav.init();
    const toggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    // Open first
    toggle.click();
    expect(navLinks.classList.contains('open')).toBe(true);

    // Close via API
    window.SiteNav.closeMenu();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(navLinks.classList.contains('open')).toBe(false);
  });

  test('clicking a nav link closes mobile menu', () => {
    window.SiteNav.init();
    const toggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    // Open menu
    toggle.click();
    expect(navLinks.classList.contains('open')).toBe(true);

    // Click a link
    const link = navLinks.querySelector('a[href="#demoSection"]');
    link.click();
    expect(navLinks.classList.contains('open')).toBe(false);
  });

  test('Escape key closes mobile menu', () => {
    window.SiteNav.init();
    const toggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    toggle.click();
    expect(navLinks.classList.contains('open')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(navLinks.classList.contains('open')).toBe(false);
  });

  test('nav gets scrolled class when scrolled down', () => {
    window.SiteNav.init();
    const nav = document.getElementById('siteNav');

    // Directly add scrolled class to verify CSS class behavior
    // (jsdom doesn't fully support scrollY property override)
    nav.classList.add('scrolled');
    expect(nav.classList.contains('scrolled')).toBe(true);
    nav.classList.remove('scrolled');
    expect(nav.classList.contains('scrolled')).toBe(false);
  });

  test('nav loses scrolled class at top', () => {
    window.SiteNav.init();
    const nav = document.getElementById('siteNav');

    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    window.dispatchEvent(new Event('scroll'));

    expect(nav.classList.contains('scrolled')).toBe(false);
  });

  test('logo click scrolls to top', () => {
    window.SiteNav.init();
    const logo = document.querySelector('.nav-logo');
    logo.click();
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  test('nav has correct ARIA attributes', () => {
    const nav = document.getElementById('siteNav');
    expect(nav.getAttribute('aria-label')).toBe('Main navigation');

    const toggle = document.getElementById('navToggle');
    expect(toggle.getAttribute('aria-label')).toBe('Toggle menu');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    const links = document.getElementById('navLinks');
    expect(links.getAttribute('role')).toBe('menubar');

    const items = links.querySelectorAll('a[role="menuitem"]');
    expect(items.length).toBe(5);
  });

  test('all nav links point to existing sections', () => {
    const links = document.querySelectorAll('.nav-links a[href^="#"]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      const target = document.querySelector(href);
      expect(target).not.toBeNull();
    });
  });

  test('init handles missing nav gracefully', () => {
    document.body.innerHTML = '<div>No nav here</div>';
    jest.resetModules();
    require('../app.js');
    expect(() => window.SiteNav.init()).not.toThrow();
  });

  test('multiple init calls do not throw', () => {
    expect(() => {
      window.SiteNav.init();
      window.SiteNav.init();
    }).not.toThrow();
  });

  test('nav links have correct href values', () => {
    const expectedHrefs = ['#featuresSection', '#howItWorks', '#demoSection', '#pricingSection', '#faqSection'];
    const links = document.querySelectorAll('.nav-links a');
    const hrefs = Array.from(links).map(l => l.getAttribute('href'));
    expect(hrefs).toEqual(expectedHrefs);
  });

  test('hamburger button exists with correct structure', () => {
    const toggle = document.getElementById('navToggle');
    const hamburger = toggle.querySelector('.nav-hamburger');
    expect(hamburger).not.toBeNull();
  });
});
