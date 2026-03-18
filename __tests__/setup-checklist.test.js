/**
 * @jest-environment jsdom
 */

describe('SetupChecklist', () => {
  let SetupChecklist;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="setupChecklistRoot"></div>';
    jest.resetModules();
    SetupChecklist = require('../src/modules/setup-checklist');
  });

  test('exports init and STEPS', () => {
    expect(typeof SetupChecklist.init).toBe('function');
    expect(Array.isArray(SetupChecklist.STEPS)).toBe(true);
    expect(SetupChecklist.STEPS.length).toBeGreaterThan(0);
  });

  test('renders all steps', () => {
    SetupChecklist.init('setupChecklistRoot');
    const items = document.querySelectorAll('.setup-step-item');
    expect(items.length).toBe(SetupChecklist.STEPS.length);
  });

  test('renders progress bar and label', () => {
    SetupChecklist.init('setupChecklistRoot');
    expect(document.querySelector('.setup-progress-bar')).not.toBeNull();
    expect(document.querySelector('.setup-progress-label').textContent).toContain('0 of');
  });

  test('clicking checkbox toggles completion', () => {
    SetupChecklist.init('setupChecklistRoot');
    const cb = document.querySelector('.setup-checkbox');
    cb.click();
    const item = cb.closest('.setup-step-item');
    expect(item.classList.contains('completed')).toBe(true);
    expect(cb.getAttribute('aria-checked')).toBe('true');
    expect(document.querySelector('.setup-progress-label').textContent).toContain('1 of');
  });

  test('clicking checkbox again unchecks', () => {
    SetupChecklist.init('setupChecklistRoot');
    const cb = document.querySelector('.setup-checkbox');
    cb.click();
    cb.click();
    const item = cb.closest('.setup-step-item');
    expect(item.classList.contains('completed')).toBe(false);
    expect(cb.getAttribute('aria-checked')).toBe('false');
  });

  test('clicking header expands detail', () => {
    SetupChecklist.init('setupChecklistRoot');
    const header = document.querySelector('.setup-step-header');
    const title = header.querySelector('.setup-step-title');
    title.click();
    const detail = header.closest('.setup-step-item').querySelector('.setup-step-detail');
    expect(detail.hidden).toBe(false);
  });

  test('persists state in localStorage', () => {
    SetupChecklist.init('setupChecklistRoot');
    document.querySelector('.setup-checkbox').click();
    const stored = JSON.parse(localStorage.getItem('agentbox_setup_checklist'));
    expect(stored.install_telegram).toBe(true);
  });

  test('restores state from localStorage', () => {
    localStorage.setItem('agentbox_setup_checklist', JSON.stringify({ install_telegram: true }));
    SetupChecklist.init('setupChecklistRoot');
    const first = document.querySelector('.setup-step-item');
    expect(first.classList.contains('completed')).toBe(true);
  });

  test('reset button clears all', () => {
    SetupChecklist.init('setupChecklistRoot');
    document.querySelector('.setup-checkbox').click();
    document.querySelector('.setup-reset-btn').click();
    const items = document.querySelectorAll('.setup-step-item.completed');
    expect(items.length).toBe(0);
  });

  test('congrats shown when all complete', () => {
    SetupChecklist.init('setupChecklistRoot');
    const cbs = document.querySelectorAll('.setup-checkbox');
    cbs.forEach(cb => cb.click());
    const congrats = document.querySelector('.setup-congrats');
    expect(congrats.hidden).toBe(false);
  });

  test('keyboard Enter toggles checkbox', () => {
    SetupChecklist.init('setupChecklistRoot');
    const cb = document.querySelector('.setup-checkbox');
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    cb.dispatchEvent(event);
    expect(cb.getAttribute('aria-checked')).toBe('true');
  });

  test('no-op when container missing', () => {
    document.body.innerHTML = '';
    expect(() => SetupChecklist.init('nonexistent')).not.toThrow();
  });
});
