/**
 * @jest-environment jsdom
 */

/* Tests for Pricing and FAQ modules */

beforeEach(() => {
  // Reset module state between tests
  jest.resetModules();
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Pricing Module
// ---------------------------------------------------------------------------

describe('Pricing', () => {
  function setupPricingDOM() {
    document.body.innerHTML = `
      <div id="billingToggle" aria-checked="false">
        <span id="monthlyLabel" class="active-label">Monthly</span>
        <span id="yearlyLabel">Yearly</span>
      </div>
      <div class="pricing-card">
        <div data-monthly="$29" data-yearly="$24">
          <span class="price-amount">$29</span>
        </div>
        <span class="price-period-dynamic">per month</span>
      </div>
      <div class="pricing-card">
        <div data-monthly="$79" data-yearly="$66">
          <span class="price-amount">$79</span>
        </div>
        <span class="price-period-dynamic">per month</span>
      </div>
    `;
  }

  function loadApp() {
    // Load app.js which defines globals
    require('../app.js');
    return global.Pricing;
  }

  test('toggle switches from monthly to yearly pricing', () => {
    setupPricingDOM();
    const Pricing = loadApp();

    Pricing.toggle();

    const toggle = document.getElementById('billingToggle');
    expect(toggle.classList.contains('yearly')).toBe(true);
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    const amounts = document.querySelectorAll('.price-amount');
    expect(amounts[0].textContent).toBe('$24');
    expect(amounts[1].textContent).toBe('$66');

    const periods = document.querySelectorAll('.price-period-dynamic');
    expect(periods[0].textContent).toBe('per month, billed yearly');
    expect(periods[1].textContent).toBe('per month, billed yearly');
  });

  test('toggle switches back from yearly to monthly', () => {
    setupPricingDOM();
    const Pricing = loadApp();

    // Toggle to yearly
    Pricing.toggle();
    // Toggle back to monthly
    Pricing.toggle();

    const toggle = document.getElementById('billingToggle');
    expect(toggle.classList.contains('yearly')).toBe(false);
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    const amounts = document.querySelectorAll('.price-amount');
    expect(amounts[0].textContent).toBe('$29');
    expect(amounts[1].textContent).toBe('$79');

    const periods = document.querySelectorAll('.price-period-dynamic');
    expect(periods[0].textContent).toBe('per month');
  });

  test('monthly label has active-label class by default, yearly does not', () => {
    setupPricingDOM();
    const Pricing = loadApp();

    Pricing.toggle(); // switch to yearly

    const monthlyLabel = document.getElementById('monthlyLabel');
    const yearlyLabel = document.getElementById('yearlyLabel');

    expect(monthlyLabel.classList.contains('active-label')).toBe(false);
    expect(yearlyLabel.classList.contains('active-label')).toBe(true);
  });

  test('toggle with missing DOM elements does not throw', () => {
    document.body.innerHTML = ''; // empty DOM
    const Pricing = loadApp();

    expect(() => Pricing.toggle()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// FAQ Module
// ---------------------------------------------------------------------------

describe('FAQ', () => {
  function setupFAQDOM() {
    document.body.innerHTML = `
      <div class="faq-container">
        <div class="faq-item" id="faq1">
          <button class="faq-question" aria-expanded="false">Question 1</button>
          <div class="faq-answer">Answer 1</div>
        </div>
        <div class="faq-item" id="faq2">
          <button class="faq-question" aria-expanded="false">Question 2</button>
          <div class="faq-answer">Answer 2</div>
        </div>
        <div class="faq-item" id="faq3">
          <button class="faq-question" aria-expanded="false">Question 3</button>
          <div class="faq-answer">Answer 3</div>
        </div>
      </div>
    `;
  }

  function loadApp() {
    require('../app.js');
    return global.FAQ;
  }

  test('toggle opens a closed FAQ item', () => {
    setupFAQDOM();
    const FAQ = loadApp();

    const q1 = document.querySelector('#faq1 .faq-question');
    FAQ.toggle(q1);

    expect(document.getElementById('faq1').classList.contains('open')).toBe(true);
    expect(q1.getAttribute('aria-expanded')).toBe('true');
  });

  test('toggle closes an already-open FAQ item', () => {
    setupFAQDOM();
    const FAQ = loadApp();

    const q1 = document.querySelector('#faq1 .faq-question');
    FAQ.toggle(q1); // open
    FAQ.toggle(q1); // close

    expect(document.getElementById('faq1').classList.contains('open')).toBe(false);
  });

  test('opening one item closes other open items (accordion)', () => {
    setupFAQDOM();
    const FAQ = loadApp();

    const q1 = document.querySelector('#faq1 .faq-question');
    const q2 = document.querySelector('#faq2 .faq-question');

    FAQ.toggle(q1); // open item 1
    FAQ.toggle(q2); // open item 2 — should close item 1

    expect(document.getElementById('faq1').classList.contains('open')).toBe(false);
    expect(document.getElementById('faq2').classList.contains('open')).toBe(true);
    expect(q1.getAttribute('aria-expanded')).toBe('false');
    expect(q2.getAttribute('aria-expanded')).toBe('true');
  });

  test('toggle with element not inside faq-item does not throw', () => {
    document.body.innerHTML = '<button class="faq-question">Orphan</button>';
    const FAQ = loadApp();

    const orphan = document.querySelector('.faq-question');
    expect(() => FAQ.toggle(orphan)).not.toThrow();
  });

  test('only one item is open at a time across multiple toggles', () => {
    setupFAQDOM();
    const FAQ = loadApp();

    const q1 = document.querySelector('#faq1 .faq-question');
    const q2 = document.querySelector('#faq2 .faq-question');
    const q3 = document.querySelector('#faq3 .faq-question');

    FAQ.toggle(q1);
    FAQ.toggle(q2);
    FAQ.toggle(q3);

    const openItems = document.querySelectorAll('.faq-item.open');
    expect(openItems.length).toBe(1);
    expect(openItems[0].id).toBe('faq3');
  });
});
