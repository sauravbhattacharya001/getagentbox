/**
 * @jest-environment jsdom
 */

/* 🔗 Integration Pipeline Builder tests ─────────────── */

beforeEach(() => {
  document.body.innerHTML = `
    <section id="pipelineSection">
      <div class="pipeline-counter"></div>
      <div class="pipeline-tool-grid" role="group"></div>
      <div class="pipeline-visualization" aria-live="polite"></div>
      <div class="pipeline-description" aria-live="polite"></div>
    </section>
  `;
  jest.resetModules();
  require('../app.js');
  if (!document.querySelector('.pipeline-tool-btn')) {
    window.PipelineBuilder.init();
  }
});

/* 🧱 Rendering ─────────────── */

test('renders all integration tool buttons', () => {
  const btns = document.querySelectorAll('.pipeline-tool-btn');
  expect(btns.length).toBe(window.PipelineBuilder.getIntegrations().length);
  expect(btns.length).toBeGreaterThanOrEqual(12);
});

test('each button has icon, name, and aria attributes', () => {
  const btns = document.querySelectorAll('.pipeline-tool-btn');
  btns.forEach(btn => {
    expect(btn.querySelector('.pipeline-tool-icon')).toBeTruthy();
    expect(btn.querySelector('.pipeline-tool-name')).toBeTruthy();
    expect(btn.getAttribute('role')).toBe('switch');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.getAttribute('aria-label')).toBeTruthy();
  });
});

test('initial state shows empty pipeline message', () => {
  const viz = document.querySelector('.pipeline-visualization');
  expect(viz.textContent).toContain('Select tools');
});

test('counter shows 0 / 5 initially', () => {
  const counter = document.querySelector('.pipeline-counter');
  expect(counter.textContent).toContain('0 / 5');
});

/* 🔘 Selection ─────────────── */

test('clicking a tool selects it', () => {
  const btn = document.querySelector('[data-tool="gmail"]');
  btn.click();
  expect(btn.classList.contains('selected')).toBe(true);
  expect(btn.getAttribute('aria-pressed')).toBe('true');
  expect(window.PipelineBuilder.getSelected()).toContain('gmail');
});

test('clicking a selected tool deselects it', () => {
  const btn = document.querySelector('[data-tool="gmail"]');
  btn.click(); // select
  btn.click(); // deselect
  expect(btn.classList.contains('selected')).toBe(false);
  expect(btn.getAttribute('aria-pressed')).toBe('false');
  expect(window.PipelineBuilder.getSelected()).not.toContain('gmail');
});

test('selecting updates counter', () => {
  document.querySelector('[data-tool="gmail"]').click();
  document.querySelector('[data-tool="slack"]').click();
  const counter = document.querySelector('.pipeline-counter');
  expect(counter.textContent).toContain('2 / 5');
});

test('max 5 tools enforced', () => {
  const tools = ['gmail', 'slack', 'calendar', 'notion', 'github'];
  tools.forEach(id => {
    document.querySelector('[data-tool="' + id + '"]').click();
  });
  expect(window.PipelineBuilder.getSelected().length).toBe(5);

  // 6th should not be added
  document.querySelector('[data-tool="jira"]').click();
  expect(window.PipelineBuilder.getSelected().length).toBe(5);
  expect(window.PipelineBuilder.getSelected()).not.toContain('jira');
});

/* 🔗 Pipeline Visualization ─────────────── */

test('selecting tools shows pipeline nodes', () => {
  document.querySelector('[data-tool="gmail"]').click();
  document.querySelector('[data-tool="calendar"]').click();
  const nodes = document.querySelectorAll('.pipeline-node');
  expect(nodes.length).toBe(2);
});

test('pipeline shows arrows between nodes', () => {
  document.querySelector('[data-tool="gmail"]').click();
  document.querySelector('[data-tool="slack"]').click();
  const arrows = document.querySelectorAll('.pipeline-arrow');
  expect(arrows.length).toBe(1); // 1 arrow between 2 nodes
});

test('pipeline shows AgentBox hub', () => {
  document.querySelector('[data-tool="gmail"]').click();
  const hub = document.querySelector('.pipeline-hub');
  expect(hub).toBeTruthy();
  expect(hub.textContent).toContain('AgentBox');
});

test('three nodes show two arrows', () => {
  document.querySelector('[data-tool="gmail"]').click();
  document.querySelector('[data-tool="slack"]').click();
  document.querySelector('[data-tool="calendar"]').click();
  const arrows = document.querySelectorAll('.pipeline-arrow');
  expect(arrows.length).toBe(2);
});

/* 🔎 Pipeline Matching ─────────────── */

test('gmail + calendar shows Email → Meeting pipeline', () => {
  document.querySelector('[data-tool="gmail"]').click();
  document.querySelector('[data-tool="calendar"]').click();
  const desc = document.querySelector('.pipeline-description');
  expect(desc.textContent).toContain('Email → Meeting');
  expect(desc.textContent).toContain('calendar events');
});

test('github + slack shows Code → Notify pipeline', () => {
  document.querySelector('[data-tool="github"]').click();
  document.querySelector('[data-tool="slack"]').click();
  const desc = document.querySelector('.pipeline-description');
  expect(desc.textContent).toContain('Code → Notify');
});

test('multiple matching pipelines shown', () => {
  document.querySelector('[data-tool="gmail"]').click();
  document.querySelector('[data-tool="slack"]').click();
  document.querySelector('[data-tool="calendar"]').click();
  const cards = document.querySelectorAll('.pipeline-result-card');
  // gmail+slack, gmail+calendar, calendar+slack all match
  expect(cards.length).toBeGreaterThanOrEqual(3);
});

test('unmatched combo shows generic message', () => {
  document.querySelector('[data-tool="twitter"]').click();
  document.querySelector('[data-tool="linear"]').click();
  const desc = document.querySelector('.pipeline-description');
  expect(desc.textContent).toContain('connect these tools');
});

test('results title shows automation count', () => {
  document.querySelector('[data-tool="gmail"]').click();
  document.querySelector('[data-tool="calendar"]').click();
  const title = document.querySelector('.pipeline-results-title');
  expect(title).toBeTruthy();
  expect(title.textContent).toContain('automation');
});

/* 🧹 Clear ─────────────── */

test('clear removes all selections', () => {
  document.querySelector('[data-tool="gmail"]').click();
  document.querySelector('[data-tool="slack"]').click();
  window.PipelineBuilder.clear();
  expect(window.PipelineBuilder.getSelected().length).toBe(0);
  const selected = document.querySelectorAll('.pipeline-tool-btn.selected');
  expect(selected.length).toBe(0);
});

test('clear resets visualization', () => {
  document.querySelector('[data-tool="gmail"]').click();
  window.PipelineBuilder.clear();
  const viz = document.querySelector('.pipeline-visualization');
  expect(viz.textContent).toContain('Select tools');
});

test('clear resets counter', () => {
  document.querySelector('[data-tool="gmail"]').click();
  window.PipelineBuilder.clear();
  const counter = document.querySelector('.pipeline-counter');
  expect(counter.textContent).toContain('0 / 5');
});

/* 📋 Data Access ─────────────── */

test('getIntegrations returns all tools', () => {
  const tools = window.PipelineBuilder.getIntegrations();
  expect(tools.length).toBeGreaterThanOrEqual(12);
  expect(tools[0]).toHaveProperty('id');
  expect(tools[0]).toHaveProperty('name');
  expect(tools[0]).toHaveProperty('icon');
  expect(tools[0]).toHaveProperty('category');
});

test('getPipelines returns pipeline definitions', () => {
  const pipelines = window.PipelineBuilder.getPipelines();
  expect(Object.keys(pipelines).length).toBeGreaterThanOrEqual(15);
  expect(pipelines['gmail+calendar']).toHaveProperty('name');
  expect(pipelines['gmail+calendar']).toHaveProperty('flow');
});

test('getSelected returns defensive copy', () => {
  document.querySelector('[data-tool="gmail"]').click();
  const sel1 = window.PipelineBuilder.getSelected();
  const sel2 = window.PipelineBuilder.getSelected();
  expect(sel1).toEqual(sel2);
  expect(sel1).not.toBe(sel2); // different array instances
});

/* ♿ Accessibility ─────────────── */

test('tool grid has group role', () => {
  const grid = document.querySelector('.pipeline-tool-grid');
  expect(grid.getAttribute('role')).toBe('group');
});

test('visualization area has aria-live', () => {
  const viz = document.querySelector('.pipeline-visualization');
  expect(viz.getAttribute('aria-live')).toBe('polite');
});

test('description area has aria-live', () => {
  const desc = document.querySelector('.pipeline-description');
  expect(desc.getAttribute('aria-live')).toBe('polite');
});

test('pipeline arrows are aria-hidden', () => {
  document.querySelector('[data-tool="gmail"]').click();
  document.querySelector('[data-tool="slack"]').click();
  const arrows = document.querySelectorAll('.pipeline-arrow');
  arrows.forEach(arrow => {
    expect(arrow.getAttribute('aria-hidden')).toBe('true');
  });
});
