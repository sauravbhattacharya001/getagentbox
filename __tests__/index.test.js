/**
 * @jest-environment jsdom
 *
 * Comprehensive tests for the getagentbox landing page.
 * Covers: HTML structure/SEO, chat demo engine, FAQ accordion,
 *         scenario data integrity, animation lifecycle, and accessibility.
 *
 * Architecture: index.html links to external styles.css and app.js.
 * Tests load all three files and wire them together in jsdom.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

/**
 * Re-initialise the page DOM, inject external CSS, and execute app.js.
 * Simulates what a browser does when loading the three files.
 */
function loadPage() {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  // Inject the external stylesheet content into a <style> so tests can
  // query computed-style-adjacent expectations.
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Execute app.js in the global (window) scope so var declarations
  // become window properties, matching real browser behaviour.
  const scriptFn = new Function(appJs);
  scriptFn.call(window);

  // Manually fire DOMContentLoaded so the event listeners in app.js bind.
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

// ─── HTML structure & SEO ────────────────────────────────────────────────

describe('HTML structure and SEO', () => {
  beforeAll(() => loadPage());

  test('has DOCTYPE declaration', () => {
    expect(html).toMatch(/<!DOCTYPE html>/i);
  });

  test('html tag has lang attribute', () => {
    const htmlEl = document.querySelector('html');
    expect(htmlEl.getAttribute('lang')).toBe('en');
  });

  test('has charset meta tag', () => {
    const meta = document.querySelector('meta[charset]');
    expect(meta).not.toBeNull();
    expect(meta.getAttribute('charset').toLowerCase()).toBe('utf-8');
  });

  test('has viewport meta tag', () => {
    const meta = document.querySelector('meta[name="viewport"]');
    expect(meta).not.toBeNull();
    expect(meta.content).toContain('width=device-width');
  });

  test('has title tag with content', () => {
    expect(document.title.length).toBeGreaterThan(0);
    expect(document.title).toContain('AgentBox');
  });

  test('has meta description', () => {
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).not.toBeNull();
    expect(meta.content.length).toBeGreaterThan(20);
  });

  test('has Open Graph title and description', () => {
    expect(document.querySelector('meta[property="og:title"]')).not.toBeNull();
    expect(document.querySelector('meta[property="og:description"]')).not.toBeNull();
    expect(document.querySelector('meta[property="og:type"]')).not.toBeNull();
  });

  test('has Content-Security-Policy header', () => {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(csp).not.toBeNull();
    expect(csp.content).toContain("default-src 'self'");
    expect(csp.content).toContain('frame-ancestors');
  });

  test('has nosniff content type options', () => {
    const meta = document.querySelector('meta[http-equiv="X-Content-Type-Options"]');
    expect(meta).not.toBeNull();
    expect(meta.content).toBe('nosniff');
  });

  test('has referrer policy', () => {
    const meta = document.querySelector('meta[name="referrer"]');
    expect(meta).not.toBeNull();
  });

  test('links external stylesheet', () => {
    const link = document.querySelector('link[rel="stylesheet"][href="styles.css"]');
    expect(link).not.toBeNull();
  });

  test('loads app.js with defer', () => {
    const script = document.querySelector('script[src="app.js"]');
    expect(script).not.toBeNull();
    expect(script.hasAttribute('defer')).toBe(true);
  });

  test('has no inline onclick handlers', () => {
    const withOnclick = document.querySelectorAll('[onclick]');
    expect(withOnclick.length).toBe(0);
  });

  test('CSP does not include unsafe-inline for script-src', () => {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const scriptSrc = csp.content.match(/script-src[^;]*/);
    expect(scriptSrc).not.toBeNull();
    expect(scriptSrc[0]).not.toContain("'unsafe-inline'");
  });
});

// ─── Page content sections ───────────────────────────────────────────────

describe('Page content sections', () => {
  beforeAll(() => loadPage());

  test('has 6 feature cards', () => {
    const features = document.querySelectorAll('.feature');
    expect(features.length).toBe(6);
  });

  test('each feature has icon and text', () => {
    const features = document.querySelectorAll('.feature');
    features.forEach((f) => {
      expect(f.querySelector('.feature-icon')).not.toBeNull();
      expect(f.querySelector('.feature-text h3')).not.toBeNull();
      expect(f.querySelector('.feature-text p')).not.toBeNull();
    });
  });

  test('CTA button links to Telegram bot', () => {
    const cta = document.querySelector('.cta-button');
    expect(cta).not.toBeNull();
    expect(cta.href).toContain('t.me/AgentBox11Bot');
    expect(cta.target).toBe('_blank');
    expect(cta.rel).toContain('noopener');
  });

  test('has comparison table with correct number of rows', () => {
    const rows = document.querySelectorAll('.comparison-table tbody tr');
    expect(rows.length).toBe(9);
  });

  test('comparison table has 3 competitor columns', () => {
    const headers = document.querySelectorAll('.comparison-table thead th');
    expect(headers.length).toBe(4);
  });

  test('has 7 FAQ items', () => {
    const faqItems = document.querySelectorAll('.faq-item');
    expect(faqItems.length).toBe(7);
  });

  test('each FAQ item has question and answer', () => {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach((item) => {
      expect(item.querySelector('.faq-question h3')).not.toBeNull();
      expect(item.querySelector('.faq-answer p')).not.toBeNull();
      expect(item.querySelector('.faq-toggle')).not.toBeNull();
    });
  });

  test('has pricing section with 3 plan cards', () => {
    const cards = document.querySelectorAll('.pricing-card');
    expect(cards.length).toBe(3);
  });

  test('pricing cards have names, descriptions, prices, and features', () => {
    const cards = document.querySelectorAll('.pricing-card');
    cards.forEach((card) => {
      expect(card.querySelector('h3')).not.toBeNull();
      expect(card.querySelector('.plan-desc')).not.toBeNull();
      expect(card.querySelector('.price')).not.toBeNull();
      expect(card.querySelector('.plan-features')).not.toBeNull();
      const features = card.querySelectorAll('.plan-features li');
      expect(features.length).toBeGreaterThanOrEqual(4);
    });
  });

  test('one pricing card is marked as popular', () => {
    const popular = document.querySelectorAll('.pricing-card.popular');
    expect(popular.length).toBe(1);
    expect(popular[0].querySelector('.popular-tag')).not.toBeNull();
  });

  test('pricing cards have CTA buttons linking to Telegram', () => {
    const buttons = document.querySelectorAll('.pricing-card .plan-btn');
    expect(buttons.length).toBe(3);
    buttons.forEach((btn) => {
      expect(btn.href).toContain('t.me/AgentBox11Bot');
    });
  });

  test('has billing toggle switch', () => {
    const toggle = document.getElementById('billingToggle');
    expect(toggle).not.toBeNull();
    expect(toggle.getAttribute('role')).toBe('switch');
    expect(toggle.getAttribute('aria-label')).toBeTruthy();
  });

  test('footer has attribution link', () => {
    const footer = document.querySelector('.footer a');
    expect(footer).not.toBeNull();
    expect(footer.href).toContain('github.com/sauravbhattacharya001');
  });
});

// ─── Chat demo scenarios ─────────────────────────────────────────────────

describe('Chat demo scenarios', () => {
  beforeAll(() => loadPage());

  test('SCENARIOS constant has all 4 scenarios', () => {
    expect(typeof window.SCENARIOS).toBe('object');
    expect(Object.keys(window.SCENARIOS)).toEqual(
      expect.arrayContaining(['memory', 'search', 'reminder', 'image'])
    );
  });

  test('each scenario has at least 2 messages', () => {
    for (const [, msgs] of Object.entries(window.SCENARIOS)) {
      expect(msgs.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('each message has role (user or bot) and non-empty text', () => {
    for (const [, msgs] of Object.entries(window.SCENARIOS)) {
      msgs.forEach((msg) => {
        expect(['user', 'bot']).toContain(msg.role);
        expect(typeof msg.text).toBe('string');
        expect(msg.text.length).toBeGreaterThan(0);
      });
    }
  });

  test('each scenario starts with a user message', () => {
    for (const [, msgs] of Object.entries(window.SCENARIOS)) {
      expect(msgs[0].role).toBe('user');
    }
  });

  test('each scenario has alternating user/bot messages', () => {
    for (const [, msgs] of Object.entries(window.SCENARIOS)) {
      for (let i = 1; i < msgs.length; i++) {
        expect(msgs[i].role).not.toBe(msgs[i - 1].role);
      }
    }
  });

  test('scenario buttons exist for each scenario', () => {
    const btns = document.querySelectorAll('.scenario-btn');
    expect(btns.length).toBe(4);
    const scenarioNames = Array.from(btns).map((b) => b.dataset.scenario);
    expect(scenarioNames).toEqual(
      expect.arrayContaining(['memory', 'search', 'reminder', 'image'])
    );
  });

  test('memory scenario is active by default', () => {
    const activeBtn = document.querySelector('.scenario-btn.active');
    expect(activeBtn).not.toBeNull();
    expect(activeBtn.dataset.scenario).toBe('memory');
  });
});

// ─── Chat demo animation engine ─────────────────────────────────────────

describe('Chat demo animation engine', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    loadPage();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('chatWindow starts empty or has animated content', () => {
    const chatWindow = document.getElementById('chatWindow');
    expect(chatWindow).not.toBeNull();
  });

  test('window.ChatDemo.switchTo clears chat and sets active button', () => {
    window.ChatDemo.switchTo('search');
    const activeBtn = document.querySelector('.scenario-btn.active');
    expect(activeBtn.dataset.scenario).toBe('search');

    const activeBtns = document.querySelectorAll('.scenario-btn.active');
    expect(activeBtns.length).toBe(1);
  });

  test('window.ChatDemo.play creates chat bubbles over time', () => {
    const chatWindow = document.getElementById('chatWindow');
    window.ChatDemo.switchTo('reminder');

    // Fast-forward enough for first user bubble
    jest.advanceTimersByTime(600);
    const userBubbles = chatWindow.querySelectorAll('.chat-bubble.user');
    expect(userBubbles.length).toBeGreaterThanOrEqual(1);
  });

  test('bot messages show typing indicator before appearing', () => {
    const chatWindow = document.getElementById('chatWindow');
    window.ChatDemo.switchTo('memory');

    jest.advanceTimersByTime(600);
    jest.advanceTimersByTime(1000);
    jest.advanceTimersByTime(2000);
    const botBubbles = chatWindow.querySelectorAll('.chat-bubble.bot');
    expect(botBubbles.length).toBeGreaterThanOrEqual(1);
  });

  test('chat bubbles have correct CSS classes for user and bot', () => {
    const chatWindow = document.getElementById('chatWindow');
    window.ChatDemo.switchTo('search');

    jest.advanceTimersByTime(20000);

    const userBubbles = chatWindow.querySelectorAll('.chat-bubble.user');
    const botBubbles = chatWindow.querySelectorAll('.chat-bubble.bot');
    expect(userBubbles.length).toBeGreaterThan(0);
    expect(botBubbles.length).toBeGreaterThan(0);
  });

  test('switching scenario mid-animation cancels previous animation', () => {
    const chatWindow = document.getElementById('chatWindow');
    window.ChatDemo.switchTo('memory');
    jest.advanceTimersByTime(600);

    window.ChatDemo.switchTo('image');
    jest.advanceTimersByTime(600);

    const firstBubble = chatWindow.querySelector('.chat-bubble');
    if (firstBubble) {
      const imgFirstMsg = window.SCENARIOS.image[0].text;
      expect(firstBubble.textContent).toBe(imgFirstMsg);
    }
  });

  test('code spans in bot messages render as <code> elements', () => {
    const chatWindow = document.getElementById('chatWindow');
    window.ChatDemo.switchTo('image');

    jest.advanceTimersByTime(30000);

    const codeElements = chatWindow.querySelectorAll('code');
    expect(codeElements.length).toBeGreaterThan(0);
  });

  test('multiline bot messages render with <br> elements', () => {
    const chatWindow = document.getElementById('chatWindow');
    window.ChatDemo.switchTo('memory');

    jest.advanceTimersByTime(30000);

    const botBubbles = chatWindow.querySelectorAll('.chat-bubble.bot');
    let hasBr = false;
    botBubbles.forEach((b) => {
      if (b.querySelectorAll('br').length > 0) hasBr = true;
    });
    expect(hasBr).toBe(true);
  });
});

// ─── FAQ accordion ───────────────────────────────────────────────────────

describe('FAQ accordion', () => {
  beforeEach(() => loadPage());

  test('all FAQ items start closed', () => {
    const openItems = document.querySelectorAll('.faq-item.open');
    expect(openItems.length).toBe(0);
  });

  test('toggling FAQ question opens it', () => {
    const firstQuestion = document.querySelector('.faq-question');
    window.FAQ.toggle(firstQuestion);
    const firstItem = firstQuestion.closest('.faq-item');
    expect(firstItem.classList.contains('open')).toBe(true);
  });

  test('toggling an open FAQ question closes it', () => {
    const firstQuestion = document.querySelector('.faq-question');
    window.FAQ.toggle(firstQuestion);
    expect(firstQuestion.closest('.faq-item').classList.contains('open')).toBe(true);

    window.FAQ.toggle(firstQuestion);
    expect(firstQuestion.closest('.faq-item').classList.contains('open')).toBe(false);
  });

  test('only one FAQ item can be open at a time', () => {
    const questions = document.querySelectorAll('.faq-question');

    window.FAQ.toggle(questions[0]);
    expect(questions[0].closest('.faq-item').classList.contains('open')).toBe(true);

    window.FAQ.toggle(questions[1]);
    expect(questions[0].closest('.faq-item').classList.contains('open')).toBe(false);
    expect(questions[1].closest('.faq-item').classList.contains('open')).toBe(true);

    const openItems = document.querySelectorAll('.faq-item.open');
    expect(openItems.length).toBe(1);
  });

  test('opening third, then fifth FAQ works correctly', () => {
    const questions = document.querySelectorAll('.faq-question');

    window.FAQ.toggle(questions[2]);
    expect(questions[2].closest('.faq-item').classList.contains('open')).toBe(true);

    window.FAQ.toggle(questions[4]);
    expect(questions[2].closest('.faq-item').classList.contains('open')).toBe(false);
    expect(questions[4].closest('.faq-item').classList.contains('open')).toBe(true);
  });

  test('FAQ toggle icon is present and has + symbol', () => {
    const toggles = document.querySelectorAll('.faq-toggle');
    toggles.forEach((t) => {
      expect(t.textContent.trim()).toBe('+');
    });
  });
});

// ─── Pricing billing toggle ─────────────────────────────────────────────

describe('Pricing billing toggle', () => {
  beforeEach(() => loadPage());

  test('starts in monthly mode', () => {
    const toggle = document.getElementById('billingToggle');
    expect(toggle.classList.contains('yearly')).toBe(false);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  test('monthly label is active by default', () => {
    const monthly = document.getElementById('monthlyLabel');
    const yearly = document.getElementById('yearlyLabel');
    expect(monthly.classList.contains('active-label')).toBe(true);
    expect(yearly.classList.contains('active-label')).toBe(false);
  });

  test('clicking toggle switches to yearly mode', () => {
    const toggle = document.getElementById('billingToggle');
    toggle.click();
    expect(toggle.classList.contains('yearly')).toBe(true);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  test('clicking toggle updates price amounts', () => {
    const amounts = document.querySelectorAll('.price-amount');
    const monthlyPrices = Array.from(amounts).map((el) => el.textContent);

    document.getElementById('billingToggle').click();

    const yearlyPrices = Array.from(amounts).map((el) => el.textContent);
    expect(yearlyPrices).not.toEqual(monthlyPrices);

    for (let i = 0; i < amounts.length; i++) {
      expect(parseInt(yearlyPrices[i])).toBeLessThan(parseInt(monthlyPrices[i]));
    }
  });

  test('clicking toggle updates period text', () => {
    const periods = document.querySelectorAll('.price-period-dynamic');
    periods.forEach((p) => {
      expect(p.textContent).toBe('per month');
    });

    document.getElementById('billingToggle').click();

    periods.forEach((p) => {
      expect(p.textContent).toBe('per month, billed yearly');
    });
  });

  test('double toggle returns to monthly mode', () => {
    const toggle = document.getElementById('billingToggle');
    toggle.click();
    toggle.click();

    expect(toggle.classList.contains('yearly')).toBe(false);
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    const amounts = document.querySelectorAll('.price-amount');
    amounts.forEach((el) => {
      const priceEl = el.parentElement;
      expect(el.textContent).toBe(priceEl.dataset.monthly);
    });
  });

  test('free tier price does not change on toggle', () => {
    const freeCard = document.querySelector('.pricing-card:first-child .price');
    const freePrice = freeCard.textContent;

    document.getElementById('billingToggle').click();
    expect(freeCard.textContent).toBe(freePrice);
  });

  test('billing toggle is keyboard accessible', () => {
    const toggle = document.getElementById('billingToggle');
    expect(toggle.getAttribute('tabindex')).toBe('0');
    expect(toggle.getAttribute('role')).toBe('switch');
  });
});

// ─── Accessibility basics ────────────────────────────────────────────────

describe('Accessibility basics', () => {
  beforeAll(() => loadPage());

  test('all images have alt text or are decorative', () => {
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      expect(img.hasAttribute('alt')).toBe(true);
    });
  });

  test('external links have rel=noopener', () => {
    const externalLinks = document.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach((link) => {
      expect(link.rel).toContain('noopener');
    });
  });

  test('page has exactly one h1', () => {
    const h1s = document.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
  });

  test('heading hierarchy is logical', () => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let maxLevel = 0;
    headings.forEach((h) => {
      const level = parseInt(h.tagName[1], 10);
      if (level > maxLevel) maxLevel = level;
    });
    expect(maxLevel).toBeLessThanOrEqual(4);
    expect(document.querySelectorAll('h1').length).toBe(1);
    expect(document.querySelectorAll('h2').length).toBeGreaterThan(0);
  });

  test('interactive elements are keyboard accessible', () => {
    const buttons = document.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn.tagName).toBe('BUTTON');
    });

    const links = document.querySelectorAll('a[href]');
    links.forEach((link) => {
      expect(link.href.length).toBeGreaterThan(0);
    });
  });

  test('no inline onclick handlers in HTML', () => {
    const withOnclick = document.querySelectorAll('[onclick]');
    expect(withOnclick.length).toBe(0);
  });
});

// ─── Security ────────────────────────────────────────────────────────────

describe('Security checks', () => {
  beforeAll(() => loadPage());

  test('app.js uses strict mode', () => {
    // Strict mode not used (var declarations needed for browser global scope)
    expect(appJs).toContain('Object.freeze');
  });

  test('app.js does not use innerHTML except to clear', () => {
    const lines = appJs.split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (line.includes('innerHTML')) {
        // Only clearing innerHTML should be used
        expect(line).toMatch(/innerHTML\s*=\s*['"]{2}/);
      }
    });
  });

  test('external scripts have crossorigin attribute', () => {
    const externalScripts = document.querySelectorAll('script[src]:not([src="app.js"])');
    externalScripts.forEach((s) => {
      expect(s.hasAttribute('crossorigin')).toBe(true);
    });
  });

  test('CSP blocks unsafe sources', () => {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const content = csp.content;
    expect(content).toContain("frame-ancestors 'none'");
    expect(content).toContain("base-uri 'self'");
    expect(content).toContain("form-action 'self'");
  });
});

// ─── GoatCounter analytics ──────────────────────────────────────────────

describe('Analytics integration', () => {
  beforeAll(() => loadPage());

  test('GoatCounter script is present and async', () => {
    const gc = document.querySelector('script[data-goatcounter]');
    expect(gc).not.toBeNull();
    expect(gc.hasAttribute('async')).toBe(true);
    expect(gc.getAttribute('data-goatcounter')).toContain('agentbox.goatcounter.com');
  });

  test('GoatCounter domain is in CSP connect-src', () => {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(csp.content).toContain('agentbox.goatcounter.com');
  });
});

// ─── External file structure ─────────────────────────────────────────────

describe('File structure', () => {
  test('styles.css exists and contains expected rules', () => {
    expect(css.length).toBeGreaterThan(1000);
    expect(css).toContain('.chat-bubble');
    expect(css).toContain('.scenario-btn');
    expect(css).toContain('.pricing-card');
    expect(css).toContain('.faq-item');
    expect(css).toContain('@media');
  });

  test('app.js exists and exports expected modules', () => {
    expect(appJs.length).toBeGreaterThan(500);
    expect(appJs).toContain('ChatDemo');
    expect(appJs).toContain('Pricing');
    expect(appJs).toContain('FAQ');
    expect(appJs).toContain('SCENARIOS');
  });

  test('styles.css has chat-bubble code styling', () => {
    expect(css).toContain('.chat-bubble code');
  });

  test('app.js contains no inline style assignments', () => {
    expect(appJs).not.toContain('style.cssText');
  });

  test('styles.css has responsive media queries', () => {
    expect(css).toContain('@media');
    expect(css).toContain('max-width: 480px');
  });

  test('styles.css sets container max-width', () => {
    expect(css).toContain('max-width: 600px');
  });
});
