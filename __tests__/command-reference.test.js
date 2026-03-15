/**
 * @jest-environment jsdom
 */

/* global CommandReference */

beforeEach(() => {
  document.body.innerHTML = '<div id="commandRefContent"></div>';
  jest.resetModules();
});

function loadModule() {
  return require('../src/command-reference.js');
}

describe('CommandReference', () => {
  test('exports COMMANDS and CATEGORIES', () => {
    const CR = loadModule();
    expect(Array.isArray(CR.COMMANDS)).toBe(true);
    expect(CR.COMMANDS.length).toBeGreaterThan(10);
    expect(Array.isArray(CR.CATEGORIES)).toBe(true);
    expect(CR.CATEGORIES.length).toBeGreaterThanOrEqual(5);
  });

  test('every command has required fields', () => {
    const CR = loadModule();
    CR.COMMANDS.forEach(cmd => {
      expect(cmd.command).toBeTruthy();
      expect(cmd.syntax).toBeTruthy();
      expect(cmd.category).toBeTruthy();
      expect(cmd.description).toBeTruthy();
      expect(Array.isArray(cmd.examples)).toBe(true);
      expect(cmd.examples.length).toBeGreaterThan(0);
    });
  });

  test('every command category is valid', () => {
    const CR = loadModule();
    const catIds = CR.CATEGORIES.map(c => c.id);
    CR.COMMANDS.forEach(cmd => {
      expect(catIds).toContain(cmd.category);
    });
  });

  test('init renders content into container', () => {
    const CR = loadModule();
    CR.init();
    const container = document.getElementById('commandRefContent');
    expect(container.innerHTML).toContain('cmdref-search');
    expect(container.innerHTML).toContain('cmdref-card');
    expect(container.innerHTML).toContain('cmdref-cat-btn');
  });

  test('all commands rendered by default', () => {
    const CR = loadModule();
    CR.init();
    const cards = document.querySelectorAll('.cmdref-card');
    expect(cards.length).toBe(CR.COMMANDS.length);
  });

  test('search filters commands', () => {
    const CR = loadModule();
    CR.init();
    CR._state.searchQuery = 'remind';
    CR._state.activeCategory = 'all';
    const filtered = CR.filterCommands();
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach(cmd => {
      const match = cmd.command.includes('remind') || cmd.description.toLowerCase().includes('remind') ||
        cmd.syntax.toLowerCase().includes('remind') || cmd.examples.some(e => e.toLowerCase().includes('remind'));
      expect(match).toBe(true);
    });
  });

  test('category filter works', () => {
    const CR = loadModule();
    CR._state.activeCategory = 'memory';
    CR._state.searchQuery = '';
    const filtered = CR.filterCommands();
    expect(filtered.length).toBeGreaterThan(0);
    filtered.forEach(cmd => {
      expect(cmd.category).toBe('memory');
    });
  });

  test('combined search + category filter', () => {
    const CR = loadModule();
    CR._state.activeCategory = 'productivity';
    CR._state.searchQuery = 'remind';
    const filtered = CR.filterCommands();
    filtered.forEach(cmd => {
      expect(cmd.category).toBe('productivity');
    });
  });

  test('empty search returns no results message', () => {
    const CR = loadModule();
    CR.init();
    CR._state.searchQuery = 'xyznonexistent12345';
    CR._state.activeCategory = 'all';
    const filtered = CR.filterCommands();
    expect(filtered.length).toBe(0);
  });

  test('category badges have colors', () => {
    const CR = loadModule();
    CR.CATEGORIES.forEach(cat => {
      expect(cat.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(cat.icon).toBeTruthy();
      expect(cat.label).toBeTruthy();
    });
  });

  test('expand toggle works via click', () => {
    const CR = loadModule();
    CR.init();
    const card = document.querySelector('.cmdref-card');
    const header = card.querySelector('.cmdref-card-header');
    header.click();
    // After click, the state should be set to that command
    expect(CR._state.expandedCommand).toBe(card.getAttribute('data-cmd'));
  });

  test('copy button exists in expanded card', () => {
    const CR = loadModule();
    CR._state.expandedCommand = CR.COMMANDS[0].command;
    CR.init();
    const copyBtns = document.querySelectorAll('.cmdref-copy-btn');
    expect(copyBtns.length).toBeGreaterThan(0);
  });

  test('tips shown in expanded card', () => {
    const CR = loadModule();
    CR._state.expandedCommand = CR.COMMANDS[0].command;
    CR.init();
    const tips = document.querySelector('.cmdref-tips');
    expect(tips).not.toBeNull();
    expect(tips.textContent).toContain('Tip');
  });

  test('count display is accurate', () => {
    const CR = loadModule();
    CR.init();
    const count = document.querySelector('.cmdref-count');
    expect(count.textContent).toContain(String(CR.COMMANDS.length));
  });

  test('init does nothing without container', () => {
    document.body.innerHTML = '';
    const CR = loadModule();
    // Should not throw
    expect(() => CR.init()).not.toThrow();
  });

  test('no duplicate command ids', () => {
    const CR = loadModule();
    const ids = CR.COMMANDS.map(c => c.command);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
