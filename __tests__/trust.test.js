/**
 * @jest-environment jsdom
 *
 * Tests for the Trust & Privacy section: HTML structure, CSS styling,
 * and content quality.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

function loadPage() {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

// ── HTML Structure ──────────────────────────────────────────────────

describe('Trust section — HTML structure', () => {
  beforeAll(() => loadPage());

  test('section exists with correct id', () => {
    const section = document.getElementById('trustSection');
    expect(section).toBeTruthy();
    expect(section.classList.contains('trust-section')).toBe(true);
  });

  test('has a heading mentioning privacy', () => {
    const section = document.getElementById('trustSection');
    const h2 = section.querySelector('h2');
    expect(h2).toBeTruthy();
    expect(h2.textContent).toMatch(/privacy/i);
  });

  test('has a subtitle', () => {
    const section = document.getElementById('trustSection');
    const subtitle = section.querySelector('.trust-subtitle');
    expect(subtitle).toBeTruthy();
    expect(subtitle.textContent.length).toBeGreaterThan(10);
  });

  test('has exactly 6 trust cards', () => {
    const cards = document.querySelectorAll('.trust-card');
    expect(cards.length).toBe(6);
  });

  test('each card has icon, title, and description', () => {
    const cards = document.querySelectorAll('.trust-card');
    cards.forEach(card => {
      expect(card.querySelector('.trust-icon')).toBeTruthy();
      expect(card.querySelector('h3')).toBeTruthy();
      expect(card.querySelector('p')).toBeTruthy();
    });
  });

  test('each card has a detail panel', () => {
    const cards = document.querySelectorAll('.trust-card');
    cards.forEach(card => {
      expect(card.querySelector('.trust-detail')).toBeTruthy();
    });
  });

  test('all 6 data-trust attribute values are present', () => {
    const cards = document.querySelectorAll('.trust-card');
    const attributes = Array.from(cards).map(c => c.dataset.trust);
    expect(attributes).toContain('isolation');
    expect(attributes).toContain('encryption');
    expect(attributes).toContain('notraining');
    expect(attributes).toContain('control');
    expect(attributes).toContain('opensource');
    expect(attributes).toContain('minimal');
  });

  test('detail panels have hidden attribute initially', () => {
    const details = document.querySelectorAll('.trust-detail');
    details.forEach(detail => {
      expect(detail.hidden).toBe(true);
    });
  });

  test('each detail panel has exactly 3 checkmark rows', () => {
    const cards = document.querySelectorAll('.trust-card');
    cards.forEach(card => {
      const rows = card.querySelectorAll('.trust-detail-row');
      expect(rows.length).toBe(3);
      rows.forEach(row => {
        expect(row.querySelector('.trust-check')).toBeTruthy();
      });
    });
  });

  test('has 4 trust badges', () => {
    const badges = document.querySelectorAll('.trust-badge');
    expect(badges.length).toBe(4);
  });

  test('each badge has icon and text elements', () => {
    const badges = document.querySelectorAll('.trust-badge');
    badges.forEach(badge => {
      expect(badge.querySelector('.badge-icon')).toBeTruthy();
      expect(badge.querySelector('.badge-text')).toBeTruthy();
    });
  });

  test('trust-grid wraps all cards', () => {
    const grid = document.querySelector('.trust-grid');
    expect(grid).toBeTruthy();
    expect(grid.querySelectorAll('.trust-card').length).toBe(6);
  });

  test('trust-badges container exists', () => {
    expect(document.querySelector('.trust-badges')).toBeTruthy();
  });

  test('pulse animation elements exist for each card', () => {
    const pulses = document.querySelectorAll('.trust-pulse');
    expect(pulses.length).toBe(6);
  });

  test('pulse elements have aria-hidden for accessibility', () => {
    const pulses = document.querySelectorAll('.trust-pulse');
    pulses.forEach(p => {
      expect(p.getAttribute('aria-hidden')).toBe('true');
    });
  });
});

// ── Navigation ──────────────────────────────────────────────────────

describe('Trust section — Navigation', () => {
  beforeAll(() => loadPage());

  test('nav link to trust section exists', () => {
    const navLinks = document.querySelectorAll('.nav-links a');
    const trustLink = Array.from(navLinks).find(a =>
      a.getAttribute('href') === '#trustSection'
    );
    expect(trustLink).toBeTruthy();
    expect(trustLink.textContent).toMatch(/trust/i);
  });

  test('nav link is a menuitem', () => {
    const navLinks = document.querySelectorAll('.nav-links a');
    const trustLink = Array.from(navLinks).find(a =>
      a.getAttribute('href') === '#trustSection'
    );
    expect(trustLink.getAttribute('role')).toBe('menuitem');
  });
});

// ── CSS ─────────────────────────────────────────────────────────────

describe('Trust section — CSS', () => {
  test('styles.css defines trust-section', () => {
    expect(css).toMatch(/\.trust-section\s*\{/);
  });

  test('styles.css defines trust-card', () => {
    expect(css).toMatch(/\.trust-card\s*\{/);
  });

  test('styles.css defines trust-grid', () => {
    expect(css).toMatch(/\.trust-grid\s*\{/);
  });

  test('styles.css defines trust-badge', () => {
    expect(css).toMatch(/\.trust-badge\s*\{/);
  });

  test('styles.css has trust-pulse animation', () => {
    expect(css).toMatch(/@keyframes\s+trust-pulse/);
  });

  test('styles.css has expanded card style', () => {
    expect(css).toMatch(/\.trust-card\.expanded/);
  });

  test('styles.css has hover effect on cards', () => {
    expect(css).toMatch(/\.trust-card:hover/);
  });

  test('styles.css has mobile responsive breakpoint', () => {
    // Should have grid-template-columns: 1fr for mobile
    expect(css).toMatch(/@media.*max-width.*768px/s);
  });

  test('styles.css has tablet responsive breakpoint', () => {
    expect(css).toMatch(/@media.*1024px/s);
  });

  test('styles.css has trust-detail hidden rule', () => {
    expect(css).toMatch(/\.trust-detail\[hidden\]/);
  });
});

// ── Content Quality ─────────────────────────────────────────────────

describe('Trust section — Content quality', () => {
  beforeAll(() => loadPage());

  test('cards cover isolation topic', () => {
    const headings = Array.from(document.querySelectorAll('.trust-card h3'))
      .map(h => h.textContent.toLowerCase());
    expect(headings.some(h => h.includes('isolat'))).toBe(true);
  });

  test('cards cover encryption topic', () => {
    const headings = Array.from(document.querySelectorAll('.trust-card h3'))
      .map(h => h.textContent.toLowerCase());
    expect(headings.some(h => h.includes('encrypt'))).toBe(true);
  });

  test('cards cover no-training guarantee', () => {
    const headings = Array.from(document.querySelectorAll('.trust-card h3'))
      .map(h => h.textContent.toLowerCase());
    expect(headings.some(h => h.includes('training'))).toBe(true);
  });

  test('cards cover user control', () => {
    const headings = Array.from(document.querySelectorAll('.trust-card h3'))
      .map(h => h.textContent.toLowerCase());
    expect(headings.some(h => h.includes('control'))).toBe(true);
  });

  test('badges mention TLS encryption', () => {
    const texts = Array.from(document.querySelectorAll('.trust-badge .badge-text'))
      .map(b => b.textContent);
    expect(texts.some(t => t.includes('Encrypt'))).toBe(true);
  });

  test('badges mention GDPR', () => {
    const texts = Array.from(document.querySelectorAll('.trust-badge .badge-text'))
      .map(b => b.textContent);
    expect(texts.some(t => t.includes('GDPR'))).toBe(true);
  });

  test('badges mention Open Source', () => {
    const texts = Array.from(document.querySelectorAll('.trust-badge .badge-text'))
      .map(b => b.textContent);
    expect(texts.some(t => t.includes('Open Source'))).toBe(true);
  });

  test('no placeholder text in cards', () => {
    const cards = document.querySelectorAll('.trust-card');
    cards.forEach(card => {
      expect(card.textContent).not.toMatch(/lorem|ipsum|TODO|FIXME/i);
    });
  });

  test('card descriptions are substantive (>30 chars)', () => {
    const cards = document.querySelectorAll('.trust-card');
    cards.forEach(card => {
      const desc = card.querySelector('p').textContent;
      expect(desc.length).toBeGreaterThan(30);
    });
  });
});
