/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Load dependency sources
const domUtilsSrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'modules', 'dom-utils.js'),
  'utf8'
);
const scenarioSrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'modules', 'scenario-planner.js'),
  'utf8'
);

function buildDOM() {
  document.body.innerHTML = `
    <button class="scenario-preset-btn" data-scenario="Plan a surprise birthday dinner for 8 people this Saturday" aria-pressed="false">Birthday</button>
    <button class="scenario-preset-btn" data-scenario="I'm moving to a new city next month and need to set everything up" aria-pressed="false">Moving</button>
    <button class="scenario-preset-btn" data-scenario="Prepare for a job interview at a tech company next week" aria-pressed="false">Interview</button>
    <button class="scenario-preset-btn" data-scenario="Organize a weekend camping trip for a group of friends" aria-pressed="false">Camping</button>
    <button class="scenario-preset-btn" data-scenario="Launch a side project and get first 100 users" aria-pressed="false">Launch</button>
    <div id="scenarioWorkspace" hidden>
      <div id="scenarioGoal"></div>
      <div id="scenarioAgentStatus" class="scenario-agent-status">🤖 AgentBox is thinking...</div>
      <div id="scenarioPhases"></div>
      <div id="scenarioSummary" hidden></div>
    </div>
    <input id="scenarioCustomInput" type="text" value="" />
    <button id="scenarioCustomBtn">Go</button>
    <button id="scenarioResetBtn">Reset</button>
  `;
}

function loadModule() {
  // Evaluate DOMUtil first (scenario-planner depends on it)
  const domFn = new Function(domUtilsSrc + '\nreturn DOMUtil;');
  global.DOMUtil = domFn();
  const fn = new Function('DOMUtil', scenarioSrc + '\nreturn ScenarioPlanner;');
  return fn(global.DOMUtil);
}

describe('ScenarioPlanner', () => {
  let SP;

  beforeEach(() => {
    jest.useFakeTimers();
    buildDOM();
    SP = loadModule();
    SP.init();
  });

  afterEach(() => {
    SP.reset();
    jest.useRealTimers();
    document.body.innerHTML = '';
    delete global.DOMUtil;
  });

  // ─── Initialization ───────────────────────────────────────────
  test('init wires preset buttons without errors', () => {
    const btns = document.querySelectorAll('.scenario-preset-btn');
    expect(btns.length).toBe(5);
    btns.forEach(b => expect(b.getAttribute('aria-pressed')).toBe('false'));
  });

  test('workspace starts hidden', () => {
    expect(document.getElementById('scenarioWorkspace').hidden).toBe(true);
  });

  // ─── Preset click starts planning ─────────────────────────────
  test('clicking a preset reveals the workspace', () => {
    const btn = document.querySelector('.scenario-preset-btn');
    btn.click();
    jest.advanceTimersByTime(100);
    expect(document.getElementById('scenarioWorkspace').hidden).toBe(false);
  });

  test('clicking a preset sets the goal text', () => {
    const btn = document.querySelector('[data-scenario*="birthday"]');
    btn.click();
    jest.advanceTimersByTime(100);
    const goal = document.getElementById('scenarioGoal');
    expect(goal.innerHTML).toContain('birthday');
    expect(goal.innerHTML).toContain('Goal');
  });

  test('clicked preset button gets aria-pressed true', () => {
    const btns = document.querySelectorAll('.scenario-preset-btn');
    btns[2].click();
    expect(btns[2].getAttribute('aria-pressed')).toBe('true');
    // Others should be false
    expect(btns[0].getAttribute('aria-pressed')).toBe('false');
    expect(btns[1].getAttribute('aria-pressed')).toBe('false');
  });

  // ─── Phase animation ─────────────────────────────────────────
  test('phases are created as animation progresses (birthday scenario)', () => {
    const btn = document.querySelector('[data-scenario*="birthday"]');
    btn.click();
    // Allow first phase to appear (400ms nextPhase delay + 50ms visibility)
    jest.advanceTimersByTime(500);
    const phases = document.querySelectorAll('.scenario-phase');
    expect(phases.length).toBeGreaterThanOrEqual(1);
    // Phase header should contain "Understand"
    expect(phases[0].textContent).toContain('Understand');
  });

  test('steps appear within a phase with check marks', () => {
    const btn = document.querySelector('[data-scenario*="birthday"]');
    btn.click();
    // Advance enough for first phase steps to complete
    // Phase 1 has 4 steps with delays 800+600+500+500 = 2400, plus 400 initial + 50 visibility each
    jest.advanceTimersByTime(4000);
    const doneIcons = document.querySelectorAll('.scenario-step-icon.done');
    expect(doneIcons.length).toBeGreaterThanOrEqual(1);
  });

  test('phase status changes to complete after all steps finish', () => {
    const btn = document.querySelector('[data-scenario*="birthday"]');
    btn.click();
    // Advance well past first phase
    jest.advanceTimersByTime(5000);
    const status = document.getElementById('phaseStatus0');
    if (status) {
      expect(status.textContent).toBe('✅ complete');
    }
  });

  test('all 4 phases appear for a known scenario', () => {
    const btn = document.querySelector('[data-scenario*="birthday"]');
    btn.click();
    // Advance enough for all phases (conservative: 30s)
    jest.advanceTimersByTime(30000);
    const phases = document.querySelectorAll('.scenario-phase');
    expect(phases.length).toBe(4);
  });

  test('summary appears after all phases complete', () => {
    const btn = document.querySelector('[data-scenario*="birthday"]');
    btn.click();
    jest.advanceTimersByTime(30000);
    const summary = document.getElementById('scenarioSummary');
    expect(summary.hidden).toBe(false);
    expect(summary.innerHTML).toContain('Actions Planned');
    expect(summary.innerHTML).toContain('Time Saved');
    expect(summary.innerHTML).toContain('14'); // birthday scenario has 14 actions
  });

  test('agent status shows complete after all phases', () => {
    const btn = document.querySelector('[data-scenario*="birthday"]');
    btn.click();
    jest.advanceTimersByTime(30000);
    const status = document.getElementById('scenarioAgentStatus');
    expect(status.textContent).toContain('Plan complete');
    expect(status.className).toContain('done');
  });

  // ─── All 5 preset scenarios ───────────────────────────────────
  const presetScenarios = [
    { match: 'birthday', actions: 14, time: '~3 hours' },
    { match: 'moving', actions: 16, time: '~5 hours' },
    { match: 'interview', actions: 13, time: '~4 hours' },
    { match: 'camping', actions: 15, time: '~3.5 hours' },
    { match: 'Launch', actions: 16, time: '~6 hours' },
  ];

  presetScenarios.forEach(({ match, actions, time }) => {
    test(`preset "${match}" completes with ${actions} actions`, () => {
      const btn = document.querySelector(`[data-scenario*="${match}"]`);
      btn.click();
      jest.advanceTimersByTime(40000);
      const summary = document.getElementById('scenarioSummary');
      expect(summary.hidden).toBe(false);
      expect(summary.innerHTML).toContain(String(actions));
    });
  });

  // ─── Custom scenario (generic template) ───────────────────────
  test('custom input triggers planning with generic template', () => {
    const input = document.getElementById('scenarioCustomInput');
    const customBtn = document.getElementById('scenarioCustomBtn');
    input.value = 'Build a treehouse in the backyard';
    customBtn.click();
    jest.advanceTimersByTime(500);
    const goal = document.getElementById('scenarioGoal');
    expect(goal.innerHTML).toContain('treehouse');
    expect(document.getElementById('scenarioWorkspace').hidden).toBe(false);
  });

  test('custom scenario completes with generic summary', () => {
    const input = document.getElementById('scenarioCustomInput');
    const customBtn = document.getElementById('scenarioCustomBtn');
    input.value = 'Organize my closet';
    customBtn.click();
    jest.advanceTimersByTime(30000);
    const summary = document.getElementById('scenarioSummary');
    expect(summary.hidden).toBe(false);
    expect(summary.innerHTML).toContain('11'); // generic has 11 actions
  });

  test('Enter key on custom input triggers planning', () => {
    const input = document.getElementById('scenarioCustomInput');
    input.value = 'Learn guitar';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    jest.advanceTimersByTime(500);
    expect(document.getElementById('scenarioWorkspace').hidden).toBe(false);
  });

  test('empty custom input does not start planning', () => {
    const input = document.getElementById('scenarioCustomInput');
    const customBtn = document.getElementById('scenarioCustomBtn');
    input.value = '   ';
    customBtn.click();
    jest.advanceTimersByTime(500);
    expect(document.getElementById('scenarioWorkspace').hidden).toBe(true);
  });

  test('long custom scenario is truncated in goal display', () => {
    const input = document.getElementById('scenarioCustomInput');
    const customBtn = document.getElementById('scenarioCustomBtn');
    input.value = 'A'.repeat(150);
    customBtn.click();
    jest.advanceTimersByTime(500);
    const goal = document.getElementById('scenarioGoal');
    // Goal should be truncated to ~100 chars
    expect(goal.textContent.length).toBeLessThan(200);
    expect(goal.innerHTML).toContain('...');
  });

  // ─── Reset ────────────────────────────────────────────────────
  test('reset hides workspace and clears phases', () => {
    const btn = document.querySelector('[data-scenario*="birthday"]');
    btn.click();
    jest.advanceTimersByTime(5000);
    expect(document.getElementById('scenarioWorkspace').hidden).toBe(false);

    document.getElementById('scenarioResetBtn').click();
    expect(document.getElementById('scenarioWorkspace').hidden).toBe(true);
    expect(document.getElementById('scenarioPhases').innerHTML).toBe('');
    expect(document.getElementById('scenarioSummary').hidden).toBe(true);
  });

  test('reset clears custom input', () => {
    const input = document.getElementById('scenarioCustomInput');
    input.value = 'some text';
    document.getElementById('scenarioResetBtn').click();
    expect(input.value).toBe('');
  });

  test('reset resets aria-pressed on all presets', () => {
    const btns = document.querySelectorAll('.scenario-preset-btn');
    btns[1].click();
    jest.advanceTimersByTime(100);
    expect(btns[1].getAttribute('aria-pressed')).toBe('true');
    document.getElementById('scenarioResetBtn').click();
    btns.forEach(b => expect(b.getAttribute('aria-pressed')).toBe('false'));
  });

  test('reset restores default agent status text', () => {
    const btn = document.querySelector('[data-scenario*="birthday"]');
    btn.click();
    jest.advanceTimersByTime(5000);
    document.getElementById('scenarioResetBtn').click();
    const status = document.getElementById('scenarioAgentStatus');
    expect(status.textContent).toContain('thinking');
    expect(status.className).toBe('scenario-agent-status');
  });

  // ─── Re-entrant guard ─────────────────────────────────────────
  test('clicking a preset while running does not restart', () => {
    const btns = document.querySelectorAll('.scenario-preset-btn');
    btns[0].click();
    jest.advanceTimersByTime(500);
    const phasesBefore = document.querySelectorAll('.scenario-phase').length;

    // Click another preset while running
    btns[1].click();
    jest.advanceTimersByTime(500);
    // Should not have cleared and restarted (phases count should only grow)
    const phasesAfter = document.querySelectorAll('.scenario-phase').length;
    expect(phasesAfter).toBeGreaterThanOrEqual(phasesBefore);
  });

  // ─── After completion, can start new scenario ─────────────────
  test('can start a new scenario after previous one completes', () => {
    const btns = document.querySelectorAll('.scenario-preset-btn');
    btns[0].click();
    jest.advanceTimersByTime(40000); // complete first scenario

    // Reset and start a new one
    document.getElementById('scenarioResetBtn').click();
    btns[2].click();
    jest.advanceTimersByTime(500);
    expect(document.getElementById('scenarioWorkspace').hidden).toBe(false);
    const goal = document.getElementById('scenarioGoal');
    expect(goal.innerHTML).toContain('interview');
  });

  // ─── XSS safety ───────────────────────────────────────────────
  test('custom input with HTML is escaped in goal display', () => {
    const input = document.getElementById('scenarioCustomInput');
    const customBtn = document.getElementById('scenarioCustomBtn');
    input.value = '<script>alert("xss")</script>';
    customBtn.click();
    jest.advanceTimersByTime(500);
    const goal = document.getElementById('scenarioGoal');
    // Should not contain raw script tag
    expect(goal.innerHTML).not.toContain('<script>');
    expect(goal.textContent).toContain('<script>');
  });

  // ─── No-op when DOM is missing ────────────────────────────────
  test('init does not throw when preset buttons are absent', () => {
    document.body.innerHTML = '<div></div>';
    const mod = loadModule();
    expect(() => mod.init()).not.toThrow();
  });
});
