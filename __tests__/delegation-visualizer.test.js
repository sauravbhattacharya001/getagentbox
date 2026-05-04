/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

const domUtilsSrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'modules', 'dom-utils.js'),
  'utf8'
);
const delegationSrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'src', 'modules', 'delegation-visualizer.js'),
  'utf8'
);

function buildDOM() {
  document.body.innerHTML = `
    <button class="delegation-preset-btn" data-task="Research competitor landscape and write a strategy report" aria-pressed="false">Research</button>
    <button class="delegation-preset-btn" data-task="Plan and launch a Product Hunt campaign" aria-pressed="false">Launch</button>
    <button class="delegation-preset-btn" data-task="Audit codebase security and fix critical vulnerabilities" aria-pressed="false">Security</button>
    <button class="delegation-preset-btn" data-task="Organize a team offsite for 20 people" aria-pressed="false">Offsite</button>
    <button class="delegation-preset-btn" data-task="Build and deploy a landing page from a sketch" aria-pressed="false">Landing</button>
    <div id="delegationWorkspace" hidden>
      <div id="delegationTaskLabel"></div>
      <div id="delegationStatus" class="delegation-status">🤖 AgentBox is orchestrating...</div>
      <div id="delegationTreeRoot" role="tree"></div>
      <div id="delegationLog" role="log"></div>
      <div id="delegationSummary" hidden></div>
    </div>
    <button id="delegationResetBtn">Reset</button>
  `;
}

function loadModule() {
  const domFn = new Function(domUtilsSrc + '\nreturn DOMUtil;');
  global.DOMUtil = domFn();
  const fn = new Function('DOMUtil', delegationSrc + '\nreturn DelegationVisualizer;');
  return fn(global.DOMUtil);
}

describe('DelegationVisualizer', () => {
  let DV;

  beforeEach(() => {
    jest.useFakeTimers();
    buildDOM();
    DV = loadModule();
    DV.init();
  });

  afterEach(() => {
    DV.reset();
    jest.useRealTimers();
    document.body.innerHTML = '';
    delete global.DOMUtil;
  });

  // ── Initialization ──
  test('init attaches click handlers to preset buttons', () => {
    const btns = document.querySelectorAll('.delegation-preset-btn');
    expect(btns.length).toBe(5);
  });

  test('workspace starts hidden', () => {
    expect(document.getElementById('delegationWorkspace').hidden).toBe(true);
  });

  test('summary starts hidden', () => {
    expect(document.getElementById('delegationSummary').hidden).toBe(true);
  });

  test('tree starts empty', () => {
    expect(document.getElementById('delegationTreeRoot').children.length).toBe(0);
  });

  test('log starts empty', () => {
    expect(document.getElementById('delegationLog').children.length).toBe(0);
  });

  // ── Preset activation ──
  test('clicking a preset sets aria-pressed to true', () => {
    const btn = document.querySelectorAll('.delegation-preset-btn')[0];
    btn.click();
    jest.advanceTimersByTime(100);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  test('clicking a preset unsets other presets', () => {
    const btns = document.querySelectorAll('.delegation-preset-btn');
    btns[0].click();
    jest.advanceTimersByTime(100);
    // Complete the first task so running=false
    jest.advanceTimersByTime(30000);
    btns[1].click();
    jest.advanceTimersByTime(100);
    expect(btns[0].getAttribute('aria-pressed')).toBe('false');
    expect(btns[1].getAttribute('aria-pressed')).toBe('true');
  });

  test('clicking a preset unhides workspace', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(200);
    expect(document.getElementById('delegationWorkspace').hidden).toBe(false);
  });

  test('clicking a preset sets task label', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(200);
    expect(document.getElementById('delegationTaskLabel').textContent).toContain('competitor');
  });

  // ── Tree rendering ──
  test('tree gets populated with nodes after preset click', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(1000);
    const tree = document.getElementById('delegationTreeRoot');
    expect(tree.querySelectorAll('.delegation-node').length).toBeGreaterThan(0);
  });

  test('root node is depth-0', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(1000);
    const root = document.getElementById('delegationTreeRoot').querySelector('.delegation-node');
    expect(root.classList.contains('depth-0')).toBe(true);
  });

  test('child nodes have higher depth classes', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(2000);
    const depth1 = document.querySelectorAll('.delegation-node.depth-1');
    expect(depth1.length).toBeGreaterThan(0);
  });

  test('nodes have role=treeitem', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(1000);
    const nodes = document.querySelectorAll('.delegation-node');
    nodes.forEach(n => expect(n.getAttribute('role')).toBe('treeitem'));
  });

  test('nodes have aria-label with agent name', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(1000);
    const node = document.querySelector('.delegation-node');
    expect(node.getAttribute('aria-label')).toContain('Orchestrator');
  });

  test('node cards start in pending state', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(100);
    const tree = document.getElementById('delegationTreeRoot');
    // Some cards should still be pending
    const cards = tree.querySelectorAll('.delegation-node-card');
    const pendingCards = Array.from(cards).filter(c => c.getAttribute('data-state') === 'pending');
    expect(pendingCards.length).toBeGreaterThan(0);
  });

  test('active nodes have active data-state', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(500);
    const activeCards = document.querySelectorAll('.delegation-node-card[data-state="active"]');
    expect(activeCards.length).toBeGreaterThan(0);
  });

  // ── Animation progress ──
  test('nodes become visible as animation progresses', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(2000);
    const visible = document.querySelectorAll('.delegation-node.visible');
    expect(visible.length).toBeGreaterThan(0);
  });

  test('completed nodes get done data-state', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(20000);
    const doneCards = document.querySelectorAll('.delegation-node-card[data-state="done"]');
    expect(doneCards.length).toBeGreaterThan(0);
  });

  test('completed nodes show result text', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(20000);
    const results = document.querySelectorAll('.delegation-node-result:not([hidden])');
    expect(results.length).toBeGreaterThan(0);
  });

  // ── Log panel ──
  test('log entries are added during animation', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(2000);
    const log = document.getElementById('delegationLog');
    expect(log.children.length).toBeGreaterThan(0);
  });

  test('log entries contain timestamps', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(2000);
    const firstEntry = document.querySelector('.delegation-log-entry');
    expect(firstEntry.textContent).toMatch(/^\[\d+\.\d+s\]/);
  });

  test('log entries have delegation-log-entry class', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(2000);
    const entries = document.querySelectorAll('.delegation-log-entry');
    entries.forEach(e => expect(e.className).toBe('delegation-log-entry'));
  });

  test('first log entry mentions Orchestrator', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(1000);
    const firstEntry = document.querySelector('.delegation-log-entry');
    expect(firstEntry.textContent).toContain('Orchestrator');
  });

  // ── Summary ──
  test('summary appears after all agents finish', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(30000);
    expect(document.getElementById('delegationSummary').hidden).toBe(false);
  });

  test('summary shows agent count', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(30000);
    const summary = document.getElementById('delegationSummary');
    expect(summary.textContent).toContain('Agents Used');
  });

  test('summary shows delegation depth', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(30000);
    const summary = document.getElementById('delegationSummary');
    expect(summary.textContent).toContain('Delegation Depth');
  });

  test('summary shows actions logged count', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(30000);
    expect(document.getElementById('delegationSummary').textContent).toContain('Actions Logged');
  });

  test('summary has insight text', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(30000);
    const insight = document.querySelector('.delegation-summary-insight');
    expect(insight).not.toBeNull();
    expect(insight.textContent).toContain('coordinated');
  });

  test('status shows done after completion', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(30000);
    const status = document.getElementById('delegationStatus');
    expect(status.textContent).toContain('finished');
    expect(status.classList.contains('done')).toBe(true);
  });

  // ── Reset ──
  test('reset hides workspace', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(5000);
    DV.reset();
    expect(document.getElementById('delegationWorkspace').hidden).toBe(true);
  });

  test('reset clears tree', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(5000);
    DV.reset();
    expect(document.getElementById('delegationTreeRoot').children.length).toBe(0);
  });

  test('reset clears log', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(5000);
    DV.reset();
    expect(document.getElementById('delegationLog').children.length).toBe(0);
  });

  test('reset hides summary', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(30000);
    DV.reset();
    expect(document.getElementById('delegationSummary').hidden).toBe(true);
  });

  test('reset restores status text', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(30000);
    DV.reset();
    expect(document.getElementById('delegationStatus').textContent).toContain('orchestrating');
  });

  test('reset unsets all preset aria-pressed', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(100);
    DV.reset();
    const btns = document.querySelectorAll('.delegation-preset-btn');
    btns.forEach(b => expect(b.getAttribute('aria-pressed')).toBe('false'));
  });

  test('reset button triggers reset', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(5000);
    document.getElementById('delegationResetBtn').click();
    expect(document.getElementById('delegationWorkspace').hidden).toBe(true);
  });

  test('can start new task after reset', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(5000);
    DV.reset();
    document.querySelectorAll('.delegation-preset-btn')[1].click();
    jest.advanceTimersByTime(200);
    expect(document.getElementById('delegationWorkspace').hidden).toBe(false);
  });

  // ── All presets ──
  test('preset 1 (research) works', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(30000);
    expect(document.getElementById('delegationSummary').hidden).toBe(false);
  });

  test('preset 2 (launch) works', () => {
    document.querySelectorAll('.delegation-preset-btn')[1].click();
    jest.advanceTimersByTime(30000);
    expect(document.getElementById('delegationSummary').hidden).toBe(false);
  });

  test('preset 3 (security) works', () => {
    document.querySelectorAll('.delegation-preset-btn')[2].click();
    jest.advanceTimersByTime(30000);
    expect(document.getElementById('delegationSummary').hidden).toBe(false);
  });

  test('preset 4 (offsite) works', () => {
    document.querySelectorAll('.delegation-preset-btn')[3].click();
    jest.advanceTimersByTime(30000);
    expect(document.getElementById('delegationSummary').hidden).toBe(false);
  });

  test('preset 5 (landing) works', () => {
    document.querySelectorAll('.delegation-preset-btn')[4].click();
    jest.advanceTimersByTime(30000);
    expect(document.getElementById('delegationSummary').hidden).toBe(false);
  });

  // ── Data structure ──
  test('_TASKS has 5 task presets', () => {
    expect(Object.keys(DV._TASKS).length).toBe(5);
  });

  test('_PRESET_LABELS has 5 entries', () => {
    expect(Object.keys(DV._PRESET_LABELS).length).toBe(5);
  });

  test('each task has subtasks array', () => {
    Object.values(DV._TASKS).forEach(task => {
      expect(Array.isArray(task.subtasks)).toBe(true);
      expect(task.subtasks.length).toBeGreaterThan(0);
    });
  });

  test('each task has agent and icon', () => {
    Object.values(DV._TASKS).forEach(task => {
      expect(task.agent).toBeDefined();
      expect(task.icon).toBeDefined();
    });
  });

  test('subtasks have required fields', () => {
    Object.values(DV._TASKS).forEach(task => {
      task.subtasks.forEach(sub => {
        expect(sub.agent).toBeDefined();
        expect(sub.icon).toBeDefined();
        expect(sub.task).toBeDefined();
        expect(typeof sub.duration).toBe('number');
      });
    });
  });

  // ── Children container ──
  test('delegation-children containers are created for nodes with subtasks', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(1000);
    const children = document.querySelectorAll('.delegation-children');
    expect(children.length).toBeGreaterThan(0);
  });

  test('children containers have role=group', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(1000);
    document.querySelectorAll('.delegation-children').forEach(c => {
      expect(c.getAttribute('role')).toBe('group');
    });
  });

  // ── Edge cases ──
  test('running an invalid task key does nothing', () => {
    DV.run('nonexistent task');
    jest.advanceTimersByTime(5000);
    // Should not crash
    expect(document.getElementById('delegationTreeRoot').children.length).toBe(0);
  });

  test('double-clicking preset does not break animation', () => {
    const btn = document.querySelectorAll('.delegation-preset-btn')[0];
    btn.click();
    jest.advanceTimersByTime(100);
    btn.click(); // should be ignored since running
    jest.advanceTimersByTime(30000);
    // Should still complete normally
    const tree = document.getElementById('delegationTreeRoot');
    expect(tree.querySelectorAll('.delegation-node').length).toBeGreaterThan(0);
  });

  test('reset during animation does not crash', () => {
    document.querySelectorAll('.delegation-preset-btn')[0].click();
    jest.advanceTimersByTime(1000);
    DV.reset();
    jest.advanceTimersByTime(30000);
    expect(document.getElementById('delegationTreeRoot').children.length).toBe(0);
  });

  // ── Module API ──
  test('module exposes init function', () => {
    expect(typeof DV.init).toBe('function');
  });

  test('module exposes reset function', () => {
    expect(typeof DV.reset).toBe('function');
  });

  test('module exposes run function', () => {
    expect(typeof DV.run).toBe('function');
  });
});
