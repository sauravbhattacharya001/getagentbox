/**
 * @jest-environment jsdom
 */

/* ── Section Mini-Map Tests ── */

function setupDOM() {
  document.body.innerHTML = `
    <div id="sectionMinimap" class="minimap">
      <div id="minimapTrack" class="minimap-track"></div>
      <div id="minimapTooltip" class="minimap-tooltip"></div>
    </div>
    <div id="featuresSection" style="height:500px">Features</div>
    <div id="howItWorks" style="height:500px">How</div>
    <div id="pricingSection" style="height:500px">Pricing</div>
    <div id="faqSection" style="height:500px">FAQ</div>
  `;
}

beforeEach(() => {
  jest.resetModules();
  setupDOM();
  // Minimal stubs
  window.requestAnimationFrame = (cb) => cb();
  window.pageYOffset = 0;
});

function loadModule() {
  // Re-evaluate app.js to get SectionMinimap
  require('../app.js');
  return window.SectionMinimap;
}

describe('SectionMinimap', () => {
  test('init creates dots for existing sections', () => {
    const mm = loadModule();
    mm.init();
    const dots = document.querySelectorAll('.minimap-dot');
    // Should create dots for the 4 sections present in DOM
    expect(dots.length).toBe(4);
  });

  test('dots have aria-labels', () => {
    const mm = loadModule();
    mm.init();
    const dots = document.querySelectorAll('.minimap-dot');
    expect(dots[0].getAttribute('aria-label')).toBe('Go to Features');
    expect(dots[2].getAttribute('aria-label')).toBe('Go to Pricing');
  });

  test('clicking a dot calls scrollIntoView', () => {
    const mm = loadModule();
    mm.init();
    const section = document.getElementById('pricingSection');
    section.scrollIntoView = jest.fn();
    const dots = document.querySelectorAll('.minimap-dot');
    dots[2].click();
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  test('minimap becomes visible after scroll > 300', () => {
    const mm = loadModule();
    mm.init();
    const nav = document.getElementById('sectionMinimap');
    expect(nav.classList.contains('visible')).toBe(false);

    window.pageYOffset = 400;
    window.dispatchEvent(new Event('scroll'));
    expect(nav.classList.contains('visible')).toBe(true);
  });

  test('minimap hides when scroll < 300', () => {
    const mm = loadModule();
    mm.init();
    const nav = document.getElementById('sectionMinimap');

    window.pageYOffset = 400;
    window.dispatchEvent(new Event('scroll'));
    expect(nav.classList.contains('visible')).toBe(true);

    window.pageYOffset = 100;
    window.dispatchEvent(new Event('scroll'));
    expect(nav.classList.contains('visible')).toBe(false);
  });

  test('hover shows tooltip', () => {
    const mm = loadModule();
    mm.init();
    const dots = document.querySelectorAll('.minimap-dot');
    const tooltip = document.getElementById('minimapTooltip');

    dots[0].getBoundingClientRect = () => ({ top: 200, height: 8 });
    const event = new MouseEvent('mouseover', { bubbles: true });
    dots[0].dispatchEvent(event);
    expect(tooltip.textContent).toBe('Features');
    expect(tooltip.classList.contains('show')).toBe(true);
  });

  test('mouseout hides tooltip', () => {
    const mm = loadModule();
    mm.init();
    const dots = document.querySelectorAll('.minimap-dot');
    const tooltip = document.getElementById('minimapTooltip');

    dots[0].getBoundingClientRect = () => ({ top: 200, height: 8 });
    dots[0].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(tooltip.classList.contains('show')).toBe(true);

    dots[0].dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    expect(tooltip.classList.contains('show')).toBe(false);
  });

  test('init with no sections creates no dots', () => {
    document.body.innerHTML = `
      <div id="sectionMinimap" class="minimap">
        <div id="minimapTrack" class="minimap-track"></div>
      </div>
    `;
    const mm = loadModule();
    mm.init();
    expect(document.querySelectorAll('.minimap-dot').length).toBe(0);
  });

  test('init with missing container is a no-op', () => {
    document.body.innerHTML = '';
    const mm = loadModule();
    expect(() => mm.init()).not.toThrow();
  });

  test('active dot updates on scroll', () => {
    const mm = loadModule();
    mm.init();
    const dots = document.querySelectorAll('.minimap-dot');

    // Simulate sections at different positions
    const sections = ['featuresSection', 'howItWorks', 'pricingSection', 'faqSection'];
    sections.forEach((id, i) => {
      const el = document.getElementById(id);
      el.getBoundingClientRect = () => ({ top: i * 500 - window.pageYOffset });
    });

    window.pageYOffset = 400;
    window.innerHeight = 800;
    window.dispatchEvent(new Event('scroll'));

    // At least one dot should be active
    const activeDots = document.querySelectorAll('.minimap-dot.active');
    expect(activeDots.length).toBe(1);
  });
});
