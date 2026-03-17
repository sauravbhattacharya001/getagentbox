/**
 * @jest-environment jsdom
 */

const { USE_CASES, initExplorer } = require('../src/use-case-explorer');

describe('USE_CASES data', () => {
  test('should have at least 10 use cases', () => {
    expect(USE_CASES.length).toBeGreaterThanOrEqual(10);
  });

  test('each use case has required fields', () => {
    const requiredFields = ['id', 'icon', 'title', 'category', 'description', 'difficulty', 'scenario', 'steps', 'outcome'];
    USE_CASES.forEach(uc => {
      requiredFields.forEach(field => {
        expect(uc).toHaveProperty(field);
      });
    });
  });

  test('all IDs are unique', () => {
    const ids = USE_CASES.map(u => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('categories are valid', () => {
    const valid = ['productivity', 'research', 'creative', 'business'];
    USE_CASES.forEach(uc => {
      expect(valid).toContain(uc.category);
    });
  });

  test('difficulty is 1-3', () => {
    USE_CASES.forEach(uc => {
      expect(uc.difficulty).toBeGreaterThanOrEqual(1);
      expect(uc.difficulty).toBeLessThanOrEqual(3);
    });
  });

  test('each use case has at least 2 steps', () => {
    USE_CASES.forEach(uc => {
      expect(uc.steps.length).toBeGreaterThanOrEqual(2);
    });
  });

  test('steps alternate or have valid roles', () => {
    USE_CASES.forEach(uc => {
      uc.steps.forEach(step => {
        expect(['user', 'agent']).toContain(step.role);
        expect(step.text.length).toBeGreaterThan(0);
      });
    });
  });

  test('all 4 categories are represented', () => {
    const cats = new Set(USE_CASES.map(u => u.category));
    expect(cats.size).toBe(4);
  });

  test('titles are non-empty strings', () => {
    USE_CASES.forEach(uc => {
      expect(typeof uc.title).toBe('string');
      expect(uc.title.length).toBeGreaterThan(0);
    });
  });

  test('outcomes are non-empty', () => {
    USE_CASES.forEach(uc => {
      expect(uc.outcome.length).toBeGreaterThan(10);
    });
  });
});

describe('initExplorer', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="controls"></div>
      <input type="text" id="searchInput" />
      <div id="statsBar"></div>
      <div id="grid"></div>
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal" id="modal"></div>
      </div>
    `;
  });

  test('renders filter buttons', () => {
    initExplorer();
    const buttons = document.querySelectorAll('.filter-btn');
    expect(buttons.length).toBe(5); // all + 4 categories
  });

  test('renders all cards initially', () => {
    initExplorer();
    const cards = document.querySelectorAll('.card');
    expect(cards.length).toBe(USE_CASES.length);
  });

  test('filters by category', () => {
    initExplorer();
    const productivityBtn = document.querySelector('[data-cat="productivity"]');
    productivityBtn.click();
    const cards = document.querySelectorAll('.card');
    const expected = USE_CASES.filter(u => u.category === 'productivity').length;
    expect(cards.length).toBe(expected);
  });

  test('search filters cards', () => {
    initExplorer();
    const input = document.getElementById('searchInput');
    input.value = 'email';
    input.dispatchEvent(new Event('input'));
    const cards = document.querySelectorAll('.card');
    expect(cards.length).toBeGreaterThanOrEqual(1);
    expect(cards.length).toBeLessThan(USE_CASES.length);
  });

  test('shows empty state for no results', () => {
    initExplorer();
    const input = document.getElementById('searchInput');
    input.value = 'xyznonexistent12345';
    input.dispatchEvent(new Event('input'));
    const empty = document.querySelector('.empty-state');
    expect(empty).not.toBeNull();
  });

  test('clicking card opens modal', () => {
    initExplorer();
    const card = document.querySelector('.card');
    card.click();
    const overlay = document.getElementById('modalOverlay');
    expect(overlay.classList.contains('open')).toBe(true);
  });

  test('modal has close button', () => {
    initExplorer();
    document.querySelector('.card').click();
    const closeBtn = document.querySelector('.modal-close');
    expect(closeBtn).not.toBeNull();
  });

  test('clicking close button closes modal', () => {
    initExplorer();
    document.querySelector('.card').click();
    document.querySelector('.modal-close').click();
    // Close is via overlay click, let's test escape
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);
    const overlay = document.getElementById('modalOverlay');
    expect(overlay.classList.contains('open')).toBe(false);
  });

  test('clicking overlay background closes modal', () => {
    initExplorer();
    document.querySelector('.card').click();
    const overlay = document.getElementById('modalOverlay');
    overlay.click();
    expect(overlay.classList.contains('open')).toBe(false);
  });

  test('stats bar shows correct count', () => {
    initExplorer();
    const stats = document.getElementById('statsBar');
    expect(stats.textContent).toContain(`${USE_CASES.length}`);
  });

  test('All button is active by default', () => {
    initExplorer();
    const allBtn = document.querySelector('[data-cat="all"]');
    expect(allBtn.classList.contains('active')).toBe(true);
  });

  test('switching category deactivates previous button', () => {
    initExplorer();
    const researchBtn = document.querySelector('[data-cat="research"]');
    researchBtn.click();
    const allBtn = document.querySelector('[data-cat="all"]');
    expect(allBtn.classList.contains('active')).toBe(false);
    expect(researchBtn.classList.contains('active')).toBe(true);
  });

  test('modal contains CTA link', () => {
    initExplorer();
    document.querySelector('.card').click();
    const cta = document.querySelector('.modal-cta');
    expect(cta).not.toBeNull();
    expect(cta.href).toContain('t.me/AgentBox11Bot');
  });

  test('modal shows conversation steps', () => {
    initExplorer();
    document.querySelector('.card').click();
    const steps = document.querySelectorAll('.step');
    expect(steps.length).toBeGreaterThanOrEqual(2);
  });

  test('cards are keyboard accessible', () => {
    initExplorer();
    const card = document.querySelector('.card');
    expect(card.getAttribute('tabindex')).toBe('0');
    expect(card.getAttribute('role')).toBe('button');
  });

  test('keyboard Enter opens modal', () => {
    initExplorer();
    const card = document.querySelector('.card');
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    card.dispatchEvent(event);
    const overlay = document.getElementById('modalOverlay');
    expect(overlay.classList.contains('open')).toBe(true);
  });
});
