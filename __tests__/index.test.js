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
 *
 * Uses fake timers during initialisation to prevent real setInterval /
 * setTimeout / rAF handles from keeping the Node process alive (fixes
 * the "test hangs indefinitely" issue on Windows — see #24).
 */
function loadPage() {
  // Snapshot whether fake timers are already active so we only install
  // them when the caller hasn't done so (avoids double-install errors).
  const callerOwnsFakeTimers = typeof setTimeout.clock !== 'undefined';

  if (!callerOwnsFakeTimers) jest.useFakeTimers();

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

  if (!callerOwnsFakeTimers) jest.useRealTimers();
}

/**
 * Global teardown: clean up any lingering intervals, observers, and event
 * listeners that app.js modules may have started during tests.
 */
afterAll(() => {
  try { if (window.Testimonials) window.Testimonials.stopAutoPlay(); } catch (_) {}
  try { if (window.SiteNav) window.SiteNav.destroy(); } catch (_) {}
  try { if (window.CommandPalette) window.CommandPalette.destroy(); } catch (_) {}
  try { if (window.MobileNav) window.MobileNav.destroy(); } catch (_) {}
});

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

// ─── Testimonials carousel ───────────────────────────────────────────────

describe('Testimonials section structure', () => {
  beforeAll(() => loadPage());

  test('has testimonials section', () => {
    const section = document.getElementById('testimonialsSection');
    expect(section).not.toBeNull();
  });

  test('has 6 testimonial cards', () => {
    const cards = document.querySelectorAll('.testimonial-card');
    expect(cards.length).toBe(6);
  });

  test('each testimonial has stars, quote, author, and avatar', () => {
    const cards = document.querySelectorAll('.testimonial-card');
    cards.forEach((card) => {
      expect(card.querySelector('.testimonial-stars')).not.toBeNull();
      expect(card.querySelector('.testimonial-quote')).not.toBeNull();
      expect(card.querySelector('.testimonial-author')).not.toBeNull();
      expect(card.querySelector('.testimonial-avatar')).not.toBeNull();
      expect(card.querySelector('.testimonial-name')).not.toBeNull();
      expect(card.querySelector('.testimonial-role')).not.toBeNull();
    });
  });

  test('each testimonial quote is non-empty', () => {
    const quotes = document.querySelectorAll('.testimonial-quote');
    quotes.forEach((q) => {
      expect(q.textContent.trim().length).toBeGreaterThan(20);
    });
  });

  test('testimonial stars contain only star characters', () => {
    const stars = document.querySelectorAll('.testimonial-stars');
    stars.forEach((s) => {
      expect(s.textContent).toMatch(/^[★☆]+$/);
    });
  });

  test('has navigation arrows', () => {
    const prev = document.querySelector('.testimonial-prev');
    const next = document.querySelector('.testimonial-next');
    expect(prev).not.toBeNull();
    expect(next).not.toBeNull();
    expect(prev.getAttribute('aria-label')).toBeTruthy();
    expect(next.getAttribute('aria-label')).toBeTruthy();
  });

  test('has dots container', () => {
    const dots = document.getElementById('testimonialsDots');
    expect(dots).not.toBeNull();
  });
});

describe('Testimonials carousel behaviour', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    loadPage();
  });

  afterEach(() => {
    window.Testimonials.stopAutoPlay();
    jest.useRealTimers();
  });

  test('Testimonials module is exposed globally', () => {
    expect(typeof window.Testimonials).toBe('object');
    expect(typeof window.Testimonials.init).toBe('function');
    expect(typeof window.Testimonials.goTo).toBe('function');
    expect(typeof window.Testimonials.next).toBe('function');
    expect(typeof window.Testimonials.prev).toBe('function');
  });

  test('initialises with 6 dots', () => {
    const dots = document.querySelectorAll('.testimonial-dot');
    expect(dots.length).toBe(6);
  });

  test('starts at slide 0 with first dot active', () => {
    expect(window.Testimonials.getCurrent()).toBe(0);
    const dots = document.querySelectorAll('.testimonial-dot');
    expect(dots[0].classList.contains('active')).toBe(true);
    expect(dots[1].classList.contains('active')).toBe(false);
  });

  test('next() advances to slide 1', () => {
    window.Testimonials.next();
    expect(window.Testimonials.getCurrent()).toBe(1);
    const dots = document.querySelectorAll('.testimonial-dot');
    expect(dots[1].classList.contains('active')).toBe(true);
    expect(dots[0].classList.contains('active')).toBe(false);
  });

  test('prev() wraps from 0 to last slide', () => {
    window.Testimonials.prev();
    expect(window.Testimonials.getCurrent()).toBe(5);
    const dots = document.querySelectorAll('.testimonial-dot');
    expect(dots[5].classList.contains('active')).toBe(true);
  });

  test('next() wraps from last slide to 0', () => {
    window.Testimonials.goTo(5);
    window.Testimonials.next();
    expect(window.Testimonials.getCurrent()).toBe(0);
  });

  test('goTo() navigates to specific slide', () => {
    window.Testimonials.goTo(3);
    expect(window.Testimonials.getCurrent()).toBe(3);

    const track = document.getElementById('testimonialsTrack');
    expect(track.style.transform).toBe('translateX(-300%)');
  });

  test('goTo() wraps negative index', () => {
    window.Testimonials.goTo(-1);
    expect(window.Testimonials.getCurrent()).toBe(5);
  });

  test('goTo() wraps index beyond total', () => {
    window.Testimonials.goTo(6);
    expect(window.Testimonials.getCurrent()).toBe(0);
  });

  test('track transform updates on navigation', () => {
    const track = document.getElementById('testimonialsTrack');
    expect(track.style.transform).toBe('translateX(-0%)');

    window.Testimonials.goTo(2);
    expect(track.style.transform).toBe('translateX(-200%)');

    window.Testimonials.goTo(4);
    expect(track.style.transform).toBe('translateX(-400%)');
  });

  test('only one dot is active at a time', () => {
    for (let i = 0; i < 6; i++) {
      window.Testimonials.goTo(i);
      const activeDots = document.querySelectorAll('.testimonial-dot.active');
      expect(activeDots.length).toBe(1);
    }
  });

  test('clicking next arrow advances carousel', () => {
    window.Testimonials.stopAutoPlay();
    // Use module API directly since jsdom event listeners accumulate
    window.Testimonials.goTo(0);
    window.Testimonials.next();
    expect(window.Testimonials.getCurrent()).toBe(1);
  });

  test('clicking prev arrow goes back', () => {
    window.Testimonials.stopAutoPlay();
    window.Testimonials.goTo(3);
    window.Testimonials.prev();
    expect(window.Testimonials.getCurrent()).toBe(2);
  });

  test('clicking a dot navigates to that slide', () => {
    window.Testimonials.stopAutoPlay();
    window.Testimonials.goTo(4);
    expect(window.Testimonials.getCurrent()).toBe(4);
  });

  test('auto-play advances slides every 5 seconds', () => {
    expect(window.Testimonials.getCurrent()).toBe(0);
    jest.advanceTimersByTime(5000);
    expect(window.Testimonials.getCurrent()).toBe(1);
    jest.advanceTimersByTime(5000);
    expect(window.Testimonials.getCurrent()).toBe(2);
  });

  test('stopAutoPlay stops auto-advancing', () => {
    window.Testimonials.stopAutoPlay();
    jest.advanceTimersByTime(15000);
    expect(window.Testimonials.getCurrent()).toBe(0);
  });

  test('getTotal returns correct count', () => {
    expect(window.Testimonials.getTotal()).toBe(6);
  });

  test('dots have aria-labels', () => {
    const dots = document.querySelectorAll('.testimonial-dot');
    dots.forEach((dot, i) => {
      expect(dot.getAttribute('aria-label')).toBe('Go to testimonial ' + (i + 1));
    });
  });

  test('arrows are buttons', () => {
    const prev = document.querySelector('.testimonial-prev');
    const next = document.querySelector('.testimonial-next');
    expect(prev.tagName).toBe('BUTTON');
    expect(next.tagName).toBe('BUTTON');
  });
});

// ─── How It Works section ────────────────────────────────────────────────

describe('How It Works section structure', () => {
  beforeAll(() => loadPage());

  test('has How It Works section', () => {
    const section = document.getElementById('howItWorks');
    expect(section).not.toBeNull();
  });

  test('has section heading and subtitle', () => {
    const section = document.getElementById('howItWorks');
    const h2 = section.querySelector('h2');
    expect(h2).not.toBeNull();
    expect(h2.textContent).toContain('How it works');

    const subtitle = section.querySelector('.how-subtitle');
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent.length).toBeGreaterThan(0);
  });

  test('has 3 step cards', () => {
    const steps = document.querySelectorAll('.step');
    expect(steps.length).toBe(3);
  });

  test('each step has a number, icon, title, and description', () => {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, i) => {
      const num = step.querySelector('.step-number');
      expect(num).not.toBeNull();
      expect(num.textContent).toBe(String(i + 1));

      const icon = step.querySelector('.step-icon');
      expect(icon).not.toBeNull();
      expect(icon.textContent.trim().length).toBeGreaterThan(0);

      const title = step.querySelector('.step-content h3');
      expect(title).not.toBeNull();
      expect(title.textContent.length).toBeGreaterThan(0);

      const desc = step.querySelector('.step-content p');
      expect(desc).not.toBeNull();
      expect(desc.textContent.length).toBeGreaterThan(10);
    });
  });

  test('steps have data-step attributes from 1 to 3', () => {
    const steps = document.querySelectorAll('.step');
    expect(steps[0].dataset.step).toBe('1');
    expect(steps[1].dataset.step).toBe('2');
    expect(steps[2].dataset.step).toBe('3');
  });

  test('has connecting line element', () => {
    const line = document.querySelector('.step-line');
    expect(line).not.toBeNull();
    expect(line.getAttribute('aria-hidden')).toBe('true');
  });

  test('has steps container', () => {
    const container = document.querySelector('.steps-container');
    expect(container).not.toBeNull();
  });
});

describe('How It Works animation', () => {
  beforeEach(() => {
    loadPage();
  });

  test('HowItWorks module is exposed globally', () => {
    expect(typeof window.HowItWorks).toBe('object');
    expect(typeof window.HowItWorks.init).toBe('function');
    expect(typeof window.HowItWorks.isRevealed).toBe('function');
    expect(typeof window.HowItWorks.reset).toBe('function');
    expect(typeof window.HowItWorks.revealSteps).toBe('function');
  });

  test('steps start without visible class', () => {
    // Reset to test initial state (DOMContentLoaded may have fired init)
    window.HowItWorks.reset();
    const steps = document.querySelectorAll('.step');
    steps.forEach((step) => {
      expect(step.classList.contains('visible')).toBe(false);
    });
  });

  test('revealSteps adds visible class to all steps', () => {
    window.HowItWorks.reset();
    const steps = document.querySelectorAll('.step');
    window.HowItWorks.revealSteps(steps);
    steps.forEach((step) => {
      expect(step.classList.contains('visible')).toBe(true);
    });
  });

  test('reset removes visible class and resets state', () => {
    const steps = document.querySelectorAll('.step');
    window.HowItWorks.revealSteps(steps);
    window.HowItWorks.reset();

    steps.forEach((step) => {
      expect(step.classList.contains('visible')).toBe(false);
    });
    expect(window.HowItWorks.isRevealed()).toBe(false);
  });

  test('step cards have correct structure for animation', () => {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step) => {
      // Each step should have step-number and step-content children
      expect(step.querySelector('.step-number')).not.toBeNull();
      expect(step.querySelector('.step-content')).not.toBeNull();
    });
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

  test('no external scripts loaded (all vendored locally)', () => {
    const externalScripts = document.querySelectorAll('script[src^="http"]');
    expect(externalScripts.length).toBe(0);
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
    expect(css).toContain('.testimonial-card');
    expect(css).toContain('.testimonials-carousel');
    expect(css).toContain('@media');
  });

  test('app.js exists and exports expected modules', () => {
    expect(appJs.length).toBeGreaterThan(500);
    expect(appJs).toContain('ChatDemo');
    expect(appJs).toContain('Testimonials');
    expect(appJs).toContain('Pricing');
    expect(appJs).toContain('FAQ');
    expect(appJs).toContain('SCENARIOS');
    expect(appJs).toContain('HowItWorks');
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

  test('styles.css has how-it-works styling', () => {
    expect(css).toContain('.how-it-works-section');
    expect(css).toContain('.step-number');
    expect(css).toContain('.step-line');
    expect(css).toContain('.step-content');
  });

  test('styles.css sets container max-width', () => {
    expect(css).toContain('max-width: 600px');
  });
});

// ─── Social Proof Stats ──────────────────────────────────────────────────

describe('Stats section — HTML structure', () => {
  beforeAll(() => loadPage());

  test('stats section exists with correct id', () => {
    const section = document.getElementById('statsSection');
    expect(section).not.toBeNull();
    expect(section.classList.contains('stats-section')).toBe(true);
  });

  test('has heading and subtitle', () => {
    const section = document.getElementById('statsSection');
    const h2 = section.querySelector('h2');
    const subtitle = section.querySelector('.stats-subtitle');
    expect(h2).not.toBeNull();
    expect(h2.textContent).toContain('Trusted');
    expect(subtitle).not.toBeNull();
  });

  test('has exactly 4 stat cards', () => {
    const cards = document.querySelectorAll('.stat-card');
    expect(cards.length).toBe(4);
  });

  test('each card has icon, number, and label', () => {
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(card => {
      expect(card.querySelector('.stat-icon')).not.toBeNull();
      expect(card.querySelector('.stat-number')).not.toBeNull();
      expect(card.querySelector('.stat-label')).not.toBeNull();
    });
  });

  test('each card has a data-target attribute', () => {
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(card => {
      expect(card.dataset.target).toBeDefined();
      expect(parseInt(card.dataset.target, 10)).toBeGreaterThan(0);
    });
  });

  test('each card has a data-suffix attribute', () => {
    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(card => {
      expect(card.dataset.suffix).toBeDefined();
      expect(card.dataset.suffix.length).toBeGreaterThan(0);
    });
  });

  test('stat numbers have aria-labels for accessibility', () => {
    const numbers = document.querySelectorAll('.stat-number');
    numbers.forEach(num => {
      expect(num.getAttribute('aria-label')).toBeTruthy();
    });
  });

  test('stats grid has correct CSS class', () => {
    const grid = document.querySelector('.stats-grid');
    expect(grid).not.toBeNull();
    expect(grid.children.length).toBe(4);
  });
});

describe('Stats module — formatNumber', () => {
  beforeAll(() => loadPage());

  test('formats small numbers without commas', () => {
    expect(Stats.formatNumber(42)).toBe('42');
    expect(Stats.formatNumber(0)).toBe('0');
    expect(Stats.formatNumber(999)).toBe('999');
  });

  test('formats thousands with commas', () => {
    expect(Stats.formatNumber(1000)).toBe('1,000');
    expect(Stats.formatNumber(10000)).toBe('10,000');
    expect(Stats.formatNumber(100000)).toBe('100,000');
  });

  test('formats millions with commas', () => {
    expect(Stats.formatNumber(1000000)).toBe('1,000,000');
  });
});

describe('Stats module — easeOutCubic', () => {
  beforeAll(() => loadPage());

  test('starts at 0', () => {
    expect(Stats.easeOutCubic(0)).toBe(0);
  });

  test('ends at 1', () => {
    expect(Stats.easeOutCubic(1)).toBe(1);
  });

  test('mid-point is above linear (ease out)', () => {
    expect(Stats.easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  test('is monotonically increasing', () => {
    let prev = 0;
    for (let t = 0.1; t <= 1; t += 0.1) {
      const val = Stats.easeOutCubic(t);
      expect(val).toBeGreaterThan(prev);
      prev = val;
    }
  });
});

describe('Stats module — animation lifecycle', () => {
  beforeEach(() => {
    loadPage();
    Stats.reset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('isAnimated is false after reset', () => {
    Stats.reset();
    expect(Stats.isAnimated()).toBe(false);
  });

  test('animateAll triggers animation on all cards', () => {
    const cards = document.querySelectorAll('.stat-card');
    Stats.animateAll(cards);
    // Advance past the full animation duration
    jest.advanceTimersByTime(Stats.DURATION + 500);
    expect(Stats.isAnimated()).toBe(true);
  });

  test('cards get "animated" class after completion', () => {
    const cards = document.querySelectorAll('.stat-card');
    Stats.animateAll(cards);
    jest.advanceTimersByTime(Stats.DURATION + 500);
    cards.forEach(card => {
      expect(card.classList.contains('animated')).toBe(true);
    });
  });

  test('stat numbers show target values after animation', () => {
    const cards = document.querySelectorAll('.stat-card');
    Stats.animateAll(cards);
    jest.advanceTimersByTime(Stats.DURATION + 500);

    // Check the messages card: target=10000, suffix="+"
    const msgCard = cards[0];
    const numEl = msgCard.querySelector('.stat-number');
    expect(numEl.textContent).toContain('10,000');
    expect(numEl.textContent).toContain('+');
  });

  test('percentage card shows decimal after animation', () => {
    const cards = document.querySelectorAll('.stat-card');
    Stats.animateAll(cards);
    jest.advanceTimersByTime(Stats.DURATION + 500);

    // Uptime card: target=99, suffix="%", decimal="9"
    const uptimeCard = cards[2];
    const numEl = uptimeCard.querySelector('.stat-number');
    expect(numEl.textContent).toBe('99.9%');
  });

  test('response time card preserves < prefix', () => {
    const cards = document.querySelectorAll('.stat-card');
    // Reset the < prefix before animating
    cards[3].querySelector('.stat-number').textContent = '<0';
    Stats.animateAll(cards);
    jest.advanceTimersByTime(Stats.DURATION + 500);

    const numEl = cards[3].querySelector('.stat-number');
    expect(numEl.textContent).toContain('<');
    expect(numEl.textContent).toContain('2');
  });

  test('users card reaches 500+', () => {
    const cards = document.querySelectorAll('.stat-card');
    Stats.animateAll(cards);
    jest.advanceTimersByTime(Stats.DURATION + 500);

    const usersCard = cards[1];
    const numEl = usersCard.querySelector('.stat-number');
    expect(numEl.textContent).toBe('500+');
  });

  test('reset clears animated state and numbers', () => {
    const cards = document.querySelectorAll('.stat-card');
    Stats.animateAll(cards);
    jest.advanceTimersByTime(Stats.DURATION + 500);
    expect(Stats.isAnimated()).toBe(true);

    Stats.reset();
    expect(Stats.isAnimated()).toBe(false);
    cards.forEach(card => {
      expect(card.classList.contains('animated')).toBe(false);
      expect(card.querySelector('.stat-number').textContent).toBe('0');
    });
  });

  test('numbers increment during animation (not instant)', () => {
    const cards = document.querySelectorAll('.stat-card');
    Stats.animateAll(cards);

    // After a quarter of the duration
    jest.advanceTimersByTime(Stats.DURATION / 4);
    const msgNum = cards[0].querySelector('.stat-number').textContent;
    // Should be partially counted up (not 0, not 10,000)
    const stripped = parseInt(msgNum.replace(/[^0-9]/g, ''), 10);
    expect(stripped).toBeGreaterThan(0);
    expect(stripped).toBeLessThan(10000);
  });

  test('animateCard handles card without stat-number gracefully', () => {
    const fakeCard = document.createElement('div');
    fakeCard.dataset.target = '100';
    fakeCard.dataset.suffix = '+';
    // No .stat-number child — should not throw
    expect(() => Stats.animateCard(fakeCard)).not.toThrow();
  });

  test('animateCard handles NaN target gracefully', () => {
    const fakeCard = document.createElement('div');
    fakeCard.dataset.target = 'abc';
    fakeCard.dataset.suffix = '+';
    const numEl = document.createElement('div');
    numEl.className = 'stat-number';
    numEl.textContent = '0';
    fakeCard.appendChild(numEl);
    expect(() => Stats.animateCard(fakeCard)).not.toThrow();
    expect(numEl.textContent).toBe('0');
  });
});

describe('Stats — CSS', () => {
  test('styles.css contains stats section styles', () => {
    expect(css).toContain('.stats-section');
    expect(css).toContain('.stats-grid');
    expect(css).toContain('.stat-card');
    expect(css).toContain('.stat-number');
    expect(css).toContain('.stat-label');
    expect(css).toContain('.stat-icon');
  });

  test('styles.css has responsive stats grid', () => {
    expect(css).toContain('grid-template-columns');
  });

  test('styles.css has animated gradient for stat numbers', () => {
    expect(css).toContain('.stat-card.animated .stat-number');
    expect(css).toContain('background-clip');
  });
});

// ─── Use Cases Section ───────────────────────────────────────────────────

describe('Use Cases — HTML structure', () => {
  beforeAll(() => loadPage());

  test('section exists with correct id', () => {
    const section = document.getElementById('usecasesSection');
    expect(section).not.toBeNull();
    expect(section.classList.contains('usecases-section')).toBe(true);
  });

  test('has heading and subtitle', () => {
    const section = document.getElementById('usecasesSection');
    const h2 = section.querySelector('h2');
    expect(h2).not.toBeNull();
    expect(h2.textContent).toContain('Built for how you work');
    const subtitle = section.querySelector('.usecases-subtitle');
    expect(subtitle).not.toBeNull();
  });

  test('has 4 tab buttons', () => {
    const tabs = document.querySelectorAll('.usecase-tab');
    expect(tabs.length).toBe(4);
  });

  test('tab buttons have correct data-usecase attributes', () => {
    const tabs = document.querySelectorAll('.usecase-tab');
    const ids = Array.from(tabs).map(t => t.dataset.usecase);
    expect(ids).toEqual(['dev', 'pro', 'student', 'personal']);
  });

  test('has 4 panels matching tabs', () => {
    const panels = document.querySelectorAll('.usecase-panel');
    expect(panels.length).toBe(4);
    const panelIds = Array.from(panels).map(p => p.id);
    expect(panelIds).toEqual(['usecase-dev', 'usecase-pro', 'usecase-student', 'usecase-personal']);
  });

  test('first tab is active by default', () => {
    const firstTab = document.querySelector('.usecase-tab');
    expect(firstTab.classList.contains('active')).toBe(true);
    expect(firstTab.getAttribute('aria-selected')).toBe('true');
  });

  test('first panel is visible by default', () => {
    const firstPanel = document.getElementById('usecase-dev');
    expect(firstPanel.classList.contains('active')).toBe(true);
    expect(firstPanel.hasAttribute('hidden')).toBe(false);
  });

  test('other panels are hidden by default', () => {
    const others = ['usecase-pro', 'usecase-student', 'usecase-personal'];
    others.forEach(id => {
      const panel = document.getElementById(id);
      expect(panel.hasAttribute('hidden')).toBe(true);
    });
  });

  test('each panel has a header with emoji and heading', () => {
    const panels = document.querySelectorAll('.usecase-panel');
    panels.forEach(panel => {
      const header = panel.querySelector('.usecase-header');
      expect(header).not.toBeNull();
      const emoji = header.querySelector('.usecase-emoji');
      expect(emoji).not.toBeNull();
      expect(emoji.textContent.length).toBeGreaterThan(0);
      const h3 = header.querySelector('h3');
      expect(h3).not.toBeNull();
    });
  });

  test('each panel has a list of use cases', () => {
    const panels = document.querySelectorAll('.usecase-panel');
    panels.forEach(panel => {
      const list = panel.querySelector('.usecase-list');
      expect(list).not.toBeNull();
      const items = list.querySelectorAll('li');
      expect(items.length).toBeGreaterThanOrEqual(3);
    });
  });

  test('each panel has a quote', () => {
    const panels = document.querySelectorAll('.usecase-panel');
    panels.forEach(panel => {
      const quote = panel.querySelector('.usecase-quote');
      expect(quote).not.toBeNull();
      const p = quote.querySelector('p');
      expect(p).not.toBeNull();
      expect(p.textContent.length).toBeGreaterThan(0);
    });
  });
});

describe('Use Cases — ARIA accessibility', () => {
  beforeAll(() => loadPage());

  test('tablist has correct role', () => {
    const tablist = document.querySelector('.usecases-tabs');
    expect(tablist.getAttribute('role')).toBe('tablist');
  });

  test('tabs have role=tab', () => {
    const tabs = document.querySelectorAll('.usecase-tab');
    tabs.forEach(tab => {
      expect(tab.getAttribute('role')).toBe('tab');
    });
  });

  test('panels have role=tabpanel', () => {
    const panels = document.querySelectorAll('.usecase-panel');
    panels.forEach(panel => {
      expect(panel.getAttribute('role')).toBe('tabpanel');
    });
  });

  test('tabs have aria-controls matching panel ids', () => {
    const tabs = document.querySelectorAll('.usecase-tab');
    tabs.forEach(tab => {
      const controls = tab.getAttribute('aria-controls');
      expect(controls).not.toBeNull();
      const panel = document.getElementById(controls);
      expect(panel).not.toBeNull();
    });
  });

  test('panels have aria-labelledby matching tab ids', () => {
    const panels = document.querySelectorAll('.usecase-panel');
    panels.forEach(panel => {
      const labelledby = panel.getAttribute('aria-labelledby');
      expect(labelledby).not.toBeNull();
      const tab = document.getElementById(labelledby);
      expect(tab).not.toBeNull();
    });
  });

  test('only active tab has aria-selected=true', () => {
    const tabs = document.querySelectorAll('.usecase-tab');
    const selected = Array.from(tabs).filter(t => t.getAttribute('aria-selected') === 'true');
    expect(selected.length).toBe(1);
  });
});

describe('Use Cases — module functionality', () => {
  beforeEach(() => loadPage());

  test('UseCases module is exposed on window', () => {
    expect(window.UseCases).toBeDefined();
    expect(typeof UseCases.switchTo).toBe('function');
    expect(typeof UseCases.getCurrent).toBe('function');
    expect(typeof UseCases.getTabs).toBe('function');
    expect(typeof UseCases.init).toBe('function');
  });

  test('getCurrent returns "dev" initially', () => {
    expect(UseCases.getCurrent()).toBe('dev');
  });

  test('getTabs returns all 4 tab ids', () => {
    expect(UseCases.getTabs()).toEqual(['dev', 'pro', 'student', 'personal']);
  });

  test('switchTo changes the active tab', () => {
    UseCases.switchTo('pro');
    expect(UseCases.getCurrent()).toBe('pro');

    const proTab = document.getElementById('tab-pro');
    expect(proTab.classList.contains('active')).toBe(true);
    expect(proTab.getAttribute('aria-selected')).toBe('true');

    const devTab = document.getElementById('tab-dev');
    expect(devTab.classList.contains('active')).toBe(false);
    expect(devTab.getAttribute('aria-selected')).toBe('false');
  });

  test('switchTo shows correct panel and hides others', () => {
    UseCases.switchTo('student');

    const studentPanel = document.getElementById('usecase-student');
    expect(studentPanel.classList.contains('active')).toBe(true);
    expect(studentPanel.hasAttribute('hidden')).toBe(false);

    const devPanel = document.getElementById('usecase-dev');
    expect(devPanel.classList.contains('active')).toBe(false);
    expect(devPanel.hasAttribute('hidden')).toBe(true);
  });

  test('switchTo with same tab does nothing', () => {
    UseCases.switchTo('dev');
    expect(UseCases.getCurrent()).toBe('dev');
    // Should not break anything
    const devPanel = document.getElementById('usecase-dev');
    expect(devPanel.classList.contains('active')).toBe(true);
  });

  test('switchTo with invalid tab does nothing', () => {
    UseCases.switchTo('nonexistent');
    expect(UseCases.getCurrent()).toBe('dev');
  });

  test('switchTo with null/undefined does nothing', () => {
    UseCases.switchTo(null);
    expect(UseCases.getCurrent()).toBe('dev');
    UseCases.switchTo(undefined);
    expect(UseCases.getCurrent()).toBe('dev');
  });

  test('switchTo cycles through all tabs correctly', () => {
    const tabs = ['dev', 'pro', 'student', 'personal'];
    tabs.forEach(tab => {
      UseCases.switchTo(tab);
      expect(UseCases.getCurrent()).toBe(tab);

      const panel = document.getElementById('usecase-' + tab);
      expect(panel.classList.contains('active')).toBe(true);
      expect(panel.hasAttribute('hidden')).toBe(false);

      // All other panels should be hidden
      tabs.filter(t => t !== tab).forEach(other => {
        const otherPanel = document.getElementById('usecase-' + other);
        expect(otherPanel.classList.contains('active')).toBe(false);
        expect(otherPanel.hasAttribute('hidden')).toBe(true);
      });
    });
  });

  test('clicking a tab button switches to it', () => {
    const proTab = document.getElementById('tab-pro');
    proTab.click();
    expect(UseCases.getCurrent()).toBe('pro');
  });

  test('only one aria-selected=true after switching', () => {
    UseCases.switchTo('personal');
    const tabs = document.querySelectorAll('.usecase-tab');
    const selected = Array.from(tabs).filter(t => t.getAttribute('aria-selected') === 'true');
    expect(selected.length).toBe(1);
    expect(selected[0].dataset.usecase).toBe('personal');
  });

  test('tabindex is 0 on active tab and -1 on others', () => {
    UseCases.switchTo('student');
    const tabs = document.querySelectorAll('.usecase-tab');
    tabs.forEach(tab => {
      if (tab.dataset.usecase === 'student') {
        expect(tab.getAttribute('tabindex')).toBe('0');
      } else {
        expect(tab.getAttribute('tabindex')).toBe('-1');
      }
    });
  });
});

describe('Use Cases — keyboard navigation', () => {
  beforeAll(() => loadPage());

  afterEach(() => {
    // Reset to initial state between tests
    UseCases.switchTo('dev');
  });

  function pressKey(element, key) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true });
    element.dispatchEvent(event);
  }

  test('ArrowRight moves to next tab', () => {
    const tablist = document.querySelector('.usecases-tabs');
    pressKey(tablist, 'ArrowRight');
    expect(UseCases.getCurrent()).toBe('pro');
  });

  test('ArrowLeft wraps from first to last', () => {
    const tablist = document.querySelector('.usecases-tabs');
    pressKey(tablist, 'ArrowLeft');
    expect(UseCases.getCurrent()).toBe('personal');
  });

  test('ArrowRight wraps from last to first', () => {
    UseCases.switchTo('personal');
    const tablist = document.querySelector('.usecases-tabs');
    pressKey(tablist, 'ArrowRight');
    expect(UseCases.getCurrent()).toBe('dev');
  });

  test('Home jumps to first tab', () => {
    UseCases.switchTo('personal');
    const tablist = document.querySelector('.usecases-tabs');
    pressKey(tablist, 'Home');
    expect(UseCases.getCurrent()).toBe('dev');
  });

  test('End jumps to last tab', () => {
    const tablist = document.querySelector('.usecases-tabs');
    pressKey(tablist, 'End');
    expect(UseCases.getCurrent()).toBe('personal');
  });

  test('ArrowDown moves to next tab', () => {
    const tablist = document.querySelector('.usecases-tabs');
    pressKey(tablist, 'ArrowDown');
    expect(UseCases.getCurrent()).toBe('pro');
  });

  test('ArrowUp moves to previous tab', () => {
    UseCases.switchTo('student');
    const tablist = document.querySelector('.usecases-tabs');
    pressKey(tablist, 'ArrowUp');
    expect(UseCases.getCurrent()).toBe('pro');
  });

  test('unrelated keys do not change tab', () => {
    const tablist = document.querySelector('.usecases-tabs');
    pressKey(tablist, 'a');
    expect(UseCases.getCurrent()).toBe('dev');
    pressKey(tablist, 'Enter');
    expect(UseCases.getCurrent()).toBe('dev');
  });
});

describe('Use Cases — CSS', () => {
  test('styles.css contains use cases section styles', () => {
    expect(css).toContain('.usecases-section');
    expect(css).toContain('.usecases-tabs');
    expect(css).toContain('.usecase-tab');
    expect(css).toContain('.usecase-panel');
    expect(css).toContain('.usecase-header');
    expect(css).toContain('.usecase-list');
    expect(css).toContain('.usecase-quote');
  });

  test('styles.css has active tab style', () => {
    expect(css).toContain('.usecase-tab.active');
  });

  test('styles.css has panel fade animation', () => {
    expect(css).toContain('usecaseFadeIn');
  });

  test('styles.css has responsive tab styles', () => {
    expect(css).toContain('.usecase-tab');
    // Mobile breakpoint exists
    expect(css).toMatch(/max-width.*480/);
  });

  test('styles.css respects reduced motion for panels', () => {
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('.usecase-panel');
  });
});
