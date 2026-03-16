/**
 * @jest-environment jsdom
 */

/* eslint-disable no-undef */

const fs = require('fs');
const path = require('path');

beforeEach(() => {
  document.body.innerHTML = '<div id="workflowBuilderRoot"></div>';
  // Reset module to get fresh state
  delete require.cache[require.resolve('../src/workflow-builder')];
  global.WorkflowBuilder = require('../src/workflow-builder');
  WorkflowBuilder.clearWorkflow();
});

afterEach(() => {
  delete global.WorkflowBuilder;
});

describe('WorkflowBuilder', () => {
  test('exports expected public API', () => {
    expect(typeof WorkflowBuilder.init).toBe('function');
    expect(typeof WorkflowBuilder.addStep).toBe('function');
    expect(typeof WorkflowBuilder.removeStep).toBe('function');
    expect(typeof WorkflowBuilder.moveStep).toBe('function');
    expect(typeof WorkflowBuilder.clearWorkflow).toBe('function');
    expect(typeof WorkflowBuilder.loadPreset).toBe('function');
    expect(typeof WorkflowBuilder.exportAsCommands).toBe('function');
    expect(typeof WorkflowBuilder.exportAsJSON).toBe('function');
    expect(typeof WorkflowBuilder.importFromJSON).toBe('function');
    expect(typeof WorkflowBuilder.getSteps).toBe('function');
    expect(Array.isArray(WorkflowBuilder.ACTION_TYPES)).toBe(true);
    expect(Array.isArray(WorkflowBuilder.PRESETS)).toBe(true);
  });

  test('ACTION_TYPES has required fields', () => {
    WorkflowBuilder.ACTION_TYPES.forEach(function (at) {
      expect(at.id).toBeTruthy();
      expect(at.label).toBeTruthy();
      expect(at.icon).toBeTruthy();
      expect(at.color).toBeTruthy();
      expect(at.description).toBeTruthy();
      expect(Array.isArray(at.fields)).toBe(true);
    });
  });

  test('init renders empty state', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    var root = document.getElementById('workflowBuilderRoot');
    expect(root.innerHTML).toContain('wb-empty');
    expect(root.innerHTML).toContain('Click an action');
  });

  test('addStep creates a step and renders it', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    var step = WorkflowBuilder.addStep('search');
    expect(step).not.toBeNull();
    expect(step.actionId).toBe('search');
    expect(WorkflowBuilder.getSteps().length).toBe(1);
    var root = document.getElementById('workflowBuilderRoot');
    expect(root.innerHTML).toContain('Web Search');
  });

  test('addStep with invalid action returns null', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    expect(WorkflowBuilder.addStep('nonexistent')).toBeNull();
    expect(WorkflowBuilder.getSteps().length).toBe(0);
  });

  test('addStep with config stores config', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    var step = WorkflowBuilder.addStep('search', { query: 'test query', count: '5' });
    expect(step.config.query).toBe('test query');
    expect(step.config.count).toBe('5');
  });

  test('removeStep removes the correct step', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('trigger');
    WorkflowBuilder.addStep('search');
    WorkflowBuilder.addStep('summarize');
    expect(WorkflowBuilder.getSteps().length).toBe(3);
    WorkflowBuilder.removeStep(1);
    var steps = WorkflowBuilder.getSteps();
    expect(steps.length).toBe(2);
    expect(steps[0].actionId).toBe('trigger');
    expect(steps[1].actionId).toBe('summarize');
  });

  test('removeStep with invalid index does nothing', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('search');
    WorkflowBuilder.removeStep(-1);
    WorkflowBuilder.removeStep(99);
    expect(WorkflowBuilder.getSteps().length).toBe(1);
  });

  test('moveStep reorders steps', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('trigger');
    WorkflowBuilder.addStep('search');
    WorkflowBuilder.addStep('summarize');
    WorkflowBuilder.moveStep(2, 0);
    var steps = WorkflowBuilder.getSteps();
    expect(steps[0].actionId).toBe('summarize');
    expect(steps[1].actionId).toBe('trigger');
    expect(steps[2].actionId).toBe('search');
  });

  test('moveStep with invalid indices does nothing', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('search');
    WorkflowBuilder.moveStep(-1, 0);
    WorkflowBuilder.moveStep(0, 5);
    expect(WorkflowBuilder.getSteps().length).toBe(1);
  });

  test('clearWorkflow removes all steps', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('trigger');
    WorkflowBuilder.addStep('search');
    WorkflowBuilder.clearWorkflow();
    expect(WorkflowBuilder.getSteps().length).toBe(0);
    var root = document.getElementById('workflowBuilderRoot');
    expect(root.innerHTML).toContain('wb-empty');
  });

  test('loadPreset populates steps from template', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.loadPreset(0); // Morning Briefing
    var steps = WorkflowBuilder.getSteps();
    expect(steps.length).toBe(5);
    expect(steps[0].actionId).toBe('trigger');
    expect(steps[0].config.value).toBe('every day 8am');
  });

  test('loadPreset with invalid index does nothing', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.loadPreset(99);
    expect(WorkflowBuilder.getSteps().length).toBe(0);
  });

  test('all presets load successfully', () => {
    WorkflowBuilder.PRESETS.forEach(function (_, i) {
      WorkflowBuilder.clearWorkflow();
      WorkflowBuilder.loadPreset(i);
      expect(WorkflowBuilder.getSteps().length).toBeGreaterThan(0);
    });
  });

  test('exportAsCommands returns formatted output', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('trigger', { type: 'Manual', value: '' });
    WorkflowBuilder.addStep('search', { query: 'AI news', count: '5' });
    var output = WorkflowBuilder.exportAsCommands();
    expect(output).toContain('Step 1');
    expect(output).toContain('Step 2');
    expect(output).toContain('AI news');
    expect(output).toContain('Quick command');
  });

  test('exportAsCommands with no steps returns message', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    expect(WorkflowBuilder.exportAsCommands()).toContain('No steps');
  });

  test('exportAsJSON returns valid JSON', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('search', { query: 'test' });
    WorkflowBuilder.addStep('summarize', { style: 'Brief (1-2 lines)' });
    var json = WorkflowBuilder.exportAsJSON();
    var parsed = JSON.parse(json);
    expect(parsed.name).toBe('My Workflow');
    expect(parsed.steps.length).toBe(2);
    expect(parsed.steps[0].action).toBe('search');
    expect(parsed.steps[0].config.query).toBe('test');
    expect(parsed.created).toBeTruthy();
  });

  test('importFromJSON restores workflow', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('trigger', { type: 'Manual' });
    WorkflowBuilder.addStep('search', { query: 'hello' });
    var json = WorkflowBuilder.exportAsJSON();
    WorkflowBuilder.clearWorkflow();
    expect(WorkflowBuilder.getSteps().length).toBe(0);
    var ok = WorkflowBuilder.importFromJSON(json);
    expect(ok).toBe(true);
    var steps = WorkflowBuilder.getSteps();
    expect(steps.length).toBe(2);
    expect(steps[1].config.query).toBe('hello');
  });

  test('importFromJSON rejects invalid JSON', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    expect(WorkflowBuilder.importFromJSON('not json')).toBe(false);
    expect(WorkflowBuilder.importFromJSON('{"steps":"bad"}')).toBe(false);
  });

  test('importFromJSON skips unknown action types', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    var json = JSON.stringify({
      steps: [
        { action: 'search', config: { query: 'ok' } },
        { action: 'faketype', config: {} },
        { action: 'summarize', config: {} }
      ]
    });
    WorkflowBuilder.importFromJSON(json);
    var steps = WorkflowBuilder.getSteps();
    expect(steps.length).toBe(2);
    expect(steps[0].actionId).toBe('search');
    expect(steps[1].actionId).toBe('summarize');
  });

  test('rendered nodes show config summary', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('search', { query: 'my search query', count: '5' });
    var root = document.getElementById('workflowBuilderRoot');
    expect(root.innerHTML).toContain('my search query');
    expect(root.innerHTML).toContain('5');
  });

  test('long config values are truncated in summary', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    var longVal = 'a'.repeat(50);
    WorkflowBuilder.addStep('search', { query: longVal });
    var root = document.getElementById('workflowBuilderRoot');
    expect(root.innerHTML).toContain('...');
  });

  test('connector arrows appear between steps', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('trigger');
    WorkflowBuilder.addStep('search');
    var root = document.getElementById('workflowBuilderRoot');
    expect(root.querySelectorAll('.wb-connector').length).toBe(1);
  });

  test('toolbar shows step count', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('search');
    WorkflowBuilder.addStep('summarize');
    var root = document.getElementById('workflowBuilderRoot');
    expect(root.querySelector('.wb-step-count').textContent).toBe('2 steps');
  });

  test('single step shows singular count', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('search');
    var root = document.getElementById('workflowBuilderRoot');
    expect(root.querySelector('.wb-step-count').textContent).toBe('1 step');
  });

  test('getSteps returns a copy', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('search');
    var steps = WorkflowBuilder.getSteps();
    steps.push({ fake: true });
    expect(WorkflowBuilder.getSteps().length).toBe(1);
  });

  test('preset configs are independent copies', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.loadPreset(0);
    var steps = WorkflowBuilder.getSteps();
    steps[0].config.value = 'modified';
    WorkflowBuilder.loadPreset(0);
    expect(WorkflowBuilder.getSteps()[0].config.value).toBe('every day 8am');
  });

  test('config panel renders fields for selected step', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('search', { query: 'test', count: '5' });
    var root = document.getElementById('workflowBuilderRoot');
    var inputs = root.querySelectorAll('.wb-field-input');
    expect(inputs.length).toBe(2);
  });

  test('clicking action buttons in palette adds steps', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    var root = document.getElementById('workflowBuilderRoot');
    var btn = root.querySelector('.wb-action-btn[data-action="remind"]');
    btn.click();
    expect(WorkflowBuilder.getSteps().length).toBe(1);
    expect(WorkflowBuilder.getSteps()[0].actionId).toBe('remind');
  });

  test('clicking remove button removes step', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('search');
    WorkflowBuilder.addStep('summarize');
    var root = document.getElementById('workflowBuilderRoot');
    var removeBtn = root.querySelector('.wb-node-remove[data-remove="0"]');
    removeBtn.click();
    expect(WorkflowBuilder.getSteps().length).toBe(1);
    expect(WorkflowBuilder.getSteps()[0].actionId).toBe('summarize');
  });

  test('clear button empties workflow', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    WorkflowBuilder.addStep('search');
    var root = document.getElementById('workflowBuilderRoot');
    root.querySelector('.wb-clear').click();
    expect(WorkflowBuilder.getSteps().length).toBe(0);
  });

  test('preset button loads preset', () => {
    WorkflowBuilder.init('workflowBuilderRoot');
    var root = document.getElementById('workflowBuilderRoot');
    root.querySelector('.wb-preset-btn[data-preset="1"]').click();
    expect(WorkflowBuilder.getSteps().length).toBeGreaterThan(0);
    expect(WorkflowBuilder.getSteps()[0].actionId).toBe('trigger');
  });
});
