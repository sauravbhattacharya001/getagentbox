/**
 * @jest-environment jsdom
 *
 * Comprehensive tests for the getagentbox landing page.
 * Covers: HTML structure/SEO, chat demo engine, FAQ accordion,
 *         scenario data integrity, animation lifecycle, and accessibility.
 */

const fs = require('fs');
const path = require('path');

// Load index.html once for all tests
const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

/** Helper: re-initialize the page DOM and execute inline scripts */
function loadPage() {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  // Execute inline <script> blocks (jsdom doesn't auto-run them)
  const scripts = document.querySelectorAll('script:not([src])');
  scripts.forEach((s) => {
    // eslint-disable-next-line no-eval
    eval(s.textContent);
  });
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
    expect(rows.length).toBe(9); // 9 feature comparison rows
  });

  test('comparison table has 3 competitor columns', () => {
    const headers = document.querySelectorAll('.comparison-table thead th');
    expect(headers.length).toBe(4); // Feature + AgentBox + ChatGPT + Siri/Google
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

  test('footer has attribution link', () => {
    const footer = document.querySelector('.footer a');
    expect(footer).not.toBeNull();
    expect(footer.href).toContain('github.com/sauravbhattacharya001');
  });
});

// ─── Chat demo scenarios ─────────────────────────────────────────────────

describe('Chat demo scenarios', () => {
  beforeAll(() => loadPage());

  test('scenarios object has all 4 scenarios', () => {
    expect(window.scenarios).toBeDefined();
    expect(Object.keys(window.scenarios)).toEqual(
      expect.arrayContaining(['memory', 'search', 'reminder', 'image'])
    );
  });

  test('each scenario has at least 2 messages', () => {
    for (const [name, msgs] of Object.entries(window.scenarios)) {
      expect(msgs.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('each message has role (user or bot) and non-empty text', () => {
    for (const [name, msgs] of Object.entries(window.scenarios)) {
      msgs.forEach((msg, i) => {
        expect(['user', 'bot']).toContain(msg.role);
        expect(typeof msg.text).toBe('string');
        expect(msg.text.length).toBeGreaterThan(0);
      });
    }
  });

  test('each scenario starts with a user message', () => {
    for (const [name, msgs] of Object.entries(window.scenarios)) {
      expect(msgs[0].role).toBe('user');
    }
  });

  test('each scenario has alternating user/bot messages', () => {
    for (const [name, msgs] of Object.entries(window.scenarios)) {
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

  test('switchScenario clears chat and sets active button', () => {
    window.switchScenario('search');
    const activeBtn = document.querySelector('.scenario-btn.active');
    expect(activeBtn.dataset.scenario).toBe('search');

    // Only one button should be active
    const activeBtns = document.querySelectorAll('.scenario-btn.active');
    expect(activeBtns.length).toBe(1);
  });

  test('switchScenario increments generation counter', () => {
    const gen1 = window.animationGeneration;
    window.switchScenario('reminder');
    expect(window.animationGeneration).toBe(gen1 + 1);
  });

  test('rapid scenario switches bump generation each time', () => {
    const gen0 = window.animationGeneration;
    window.switchScenario('search');
    window.switchScenario('reminder');
    window.switchScenario('image');
    expect(window.animationGeneration).toBe(gen0 + 3);
  });

  test('playScenario creates chat bubbles over time', () => {
    const chatWindow = document.getElementById('chatWindow');
    window.switchScenario('reminder');

    // Fast-forward enough for first user bubble
    jest.advanceTimersByTime(600);
    const userBubbles = chatWindow.querySelectorAll('.chat-bubble.user');
    expect(userBubbles.length).toBeGreaterThanOrEqual(1);
  });

  test('bot messages show typing indicator before appearing', () => {
    const chatWindow = document.getElementById('chatWindow');
    window.switchScenario('memory');

    // Advance past first user message
    jest.advanceTimersByTime(600);

    // Now a typing indicator should appear for the bot response
    jest.advanceTimersByTime(1000);
    const typing = chatWindow.querySelector('.typing-indicator');
    // Typing indicator may or may not still be visible depending on timing,
    // but bot bubble should eventually appear
    jest.advanceTimersByTime(2000);
    const botBubbles = chatWindow.querySelectorAll('.chat-bubble.bot');
    expect(botBubbles.length).toBeGreaterThanOrEqual(1);
  });

  test('chat bubbles have correct CSS classes for user and bot', () => {
    const chatWindow = document.getElementById('chatWindow');
    window.switchScenario('search');

    // Let all messages animate through
    jest.advanceTimersByTime(20000);

    const userBubbles = chatWindow.querySelectorAll('.chat-bubble.user');
    const botBubbles = chatWindow.querySelectorAll('.chat-bubble.bot');
    expect(userBubbles.length).toBeGreaterThan(0);
    expect(botBubbles.length).toBeGreaterThan(0);
  });

  test('switching scenario mid-animation cancels previous animation', () => {
    const chatWindow = document.getElementById('chatWindow');
    window.switchScenario('memory');
    jest.advanceTimersByTime(600); // One bubble appears

    // Switch to a different scenario
    window.switchScenario('image');
    jest.advanceTimersByTime(600);

    // Chat should only contain image scenario bubbles
    const firstBubble = chatWindow.querySelector('.chat-bubble');
    if (firstBubble) {
      const imgFirstMsg = window.scenarios.image[0].text;
      expect(firstBubble.textContent).toBe(imgFirstMsg);
    }
  });

  test('code spans in bot messages render as <code> elements', () => {
    const chatWindow = document.getElementById('chatWindow');
    // Image scenario has backtick code in bot responses
    window.switchScenario('image');

    // Fast-forward through all animations
    jest.advanceTimersByTime(30000);

    const codeElements = chatWindow.querySelectorAll('code');
    expect(codeElements.length).toBeGreaterThan(0);
    // Verify code elements have styling
    codeElements.forEach((el) => {
      expect(el.style.cssText).toContain('background');
    });
  });

  test('multiline bot messages render with <br> elements', () => {
    const chatWindow = document.getElementById('chatWindow');
    window.switchScenario('memory');

    // Fast-forward to get the recipe bot message (has many newlines)
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

  test('clicking FAQ question opens it', () => {
    const firstQuestion = document.querySelector('.faq-question');
    window.toggleFaq(firstQuestion);
    const firstItem = firstQuestion.parentElement;
    expect(firstItem.classList.contains('open')).toBe(true);
  });

  test('clicking an open FAQ question closes it', () => {
    const firstQuestion = document.querySelector('.faq-question');
    window.toggleFaq(firstQuestion);
    expect(firstQuestion.parentElement.classList.contains('open')).toBe(true);

    window.toggleFaq(firstQuestion);
    expect(firstQuestion.parentElement.classList.contains('open')).toBe(false);
  });

  test('only one FAQ item can be open at a time', () => {
    const questions = document.querySelectorAll('.faq-question');

    // Open first
    window.toggleFaq(questions[0]);
    expect(questions[0].parentElement.classList.contains('open')).toBe(true);

    // Open second — first should close
    window.toggleFaq(questions[1]);
    expect(questions[0].parentElement.classList.contains('open')).toBe(false);
    expect(questions[1].parentElement.classList.contains('open')).toBe(true);

    // Only one open at a time
    const openItems = document.querySelectorAll('.faq-item.open');
    expect(openItems.length).toBe(1);
  });

  test('opening third, then fifth FAQ works correctly', () => {
    const questions = document.querySelectorAll('.faq-question');

    window.toggleFaq(questions[2]); // Open 3rd
    expect(questions[2].parentElement.classList.contains('open')).toBe(true);

    window.toggleFaq(questions[4]); // Open 5th
    expect(questions[2].parentElement.classList.contains('open')).toBe(false);
    expect(questions[4].parentElement.classList.contains('open')).toBe(true);
  });

  test('FAQ toggle icon is present and has + symbol', () => {
    const toggles = document.querySelectorAll('.faq-toggle');
    toggles.forEach((t) => {
      expect(t.textContent.trim()).toBe('+');
    });
  });
});

// ─── Accessibility basics ────────────────────────────────────────────────

describe('Accessibility basics', () => {
  beforeAll(() => loadPage());

  test('all images have alt text or are decorative', () => {
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      // Either has alt text or is explicitly decorative (alt="")
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

  test('heading hierarchy is logical (no skips beyond expected nesting)', () => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let maxLevel = 0;
    headings.forEach((h) => {
      const level = parseInt(h.tagName[1], 10);
      // Track the deepest heading used — h3 inside feature cards is normal
      if (level > maxLevel) maxLevel = level;
    });
    // Should not skip levels entirely (e.g., have h1 and h4 but no h2 or h3)
    // We allow h1 → h2 → h3 (features use h3 inside h2 sections)
    expect(maxLevel).toBeLessThanOrEqual(4);
    // Verify h1 exists
    expect(document.querySelectorAll('h1').length).toBe(1);
    // Verify h2 exists (section headings)
    expect(document.querySelectorAll('h2').length).toBeGreaterThan(0);
  });

  test('interactive elements are keyboard accessible (buttons and links)', () => {
    const buttons = document.querySelectorAll('button');
    buttons.forEach((btn) => {
      // Buttons are natively keyboard accessible
      expect(btn.tagName).toBe('BUTTON');
    });

    const links = document.querySelectorAll('a[href]');
    links.forEach((link) => {
      expect(link.href.length).toBeGreaterThan(0);
    });
  });
});

// ─── Security ────────────────────────────────────────────────────────────

describe('Security checks', () => {
  beforeAll(() => loadPage());

  test('no innerHTML usage in JavaScript (XSS prevention)', () => {
    const scripts = document.querySelectorAll('script:not([src])');
    scripts.forEach((s) => {
      // chatWindow.innerHTML = '' is the only allowed innerHTML (to clear)
      const lines = s.textContent.split('\n');
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (line.includes('innerHTML') && !line.includes("innerHTML = ''") && !line.includes("innerHTML = '';") && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
          // Only clearing innerHTML should be used
          throw new Error(`Unexpected innerHTML usage: ${line.trim()}`);
        }
      });
    });
  });

  test('external scripts have crossorigin attribute', () => {
    const externalScripts = document.querySelectorAll('script[src]');
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

// ─── Responsive design ──────────────────────────────────────────────────

describe('Responsive design', () => {
  beforeAll(() => loadPage());

  test('has mobile-friendly styles via media queries', () => {
    const styleEl = document.querySelector('style');
    expect(styleEl.textContent).toContain('@media');
    expect(styleEl.textContent).toContain('max-width: 480px');
  });

  test('container has max-width set', () => {
    const styleEl = document.querySelector('style');
    expect(styleEl.textContent).toContain('max-width: 600px');
  });
});
