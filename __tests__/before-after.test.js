/**
 * @jest-environment jsdom
 */
'use strict';

describe('BeforeAfter', function () {
  var BeforeAfter;

  function buildDOM() {
    document.body.innerHTML = `
      <div class="before-after-toggle" role="tablist">
        <button class="ba-tab active" id="baTabBefore" role="tab" aria-selected="true" aria-controls="baPanelBefore">Without</button>
        <button class="ba-tab" id="baTabAfter" role="tab" aria-selected="false" aria-controls="baPanelAfter">With</button>
      </div>
      <div class="ba-panel active" id="baPanelBefore" role="tabpanel">Before content</div>
      <div class="ba-panel" id="baPanelAfter" role="tabpanel" hidden>After content</div>
    `;
  }

  beforeEach(function () {
    buildDOM();
    jest.resetModules();
    // Load the module which auto-inits on DOMContentLoaded, but since DOM is already loaded we call init manually
    require('../app.js');
    BeforeAfter = window.BeforeAfter;
    BeforeAfter.init();
  });

  afterEach(function () {
    document.body.innerHTML = '';
  });

  test('initial state shows before panel', function () {
    var before = document.getElementById('baPanelBefore');
    var after = document.getElementById('baPanelAfter');
    expect(before.classList.contains('active')).toBe(true);
    expect(after.classList.contains('active')).toBe(false);
    expect(after.hidden).toBe(true);
  });

  test('clicking after tab switches panels', function () {
    var tabAfter = document.getElementById('baTabAfter');
    tabAfter.click();
    var before = document.getElementById('baPanelBefore');
    var after = document.getElementById('baPanelAfter');
    expect(before.classList.contains('active')).toBe(false);
    expect(before.hidden).toBe(true);
    expect(after.classList.contains('active')).toBe(true);
    expect(after.hidden).toBe(false);
    expect(tabAfter.getAttribute('aria-selected')).toBe('true');
  });

  test('clicking before tab switches back', function () {
    var tabAfter = document.getElementById('baTabAfter');
    var tabBefore = document.getElementById('baTabBefore');
    tabAfter.click();
    tabBefore.click();
    var before = document.getElementById('baPanelBefore');
    expect(before.classList.contains('active')).toBe(true);
    expect(before.hidden).toBe(false);
    expect(tabBefore.getAttribute('aria-selected')).toBe('true');
  });

  test('arrow keys navigate between tabs', function () {
    var tabBefore = document.getElementById('baTabBefore');
    var tabAfter = document.getElementById('baTabAfter');
    // Focus mock
    tabAfter.focus = jest.fn();
    tabBefore.focus = jest.fn();

    tabBefore.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tabAfter.focus).toHaveBeenCalled();
    var after = document.getElementById('baPanelAfter');
    expect(after.classList.contains('active')).toBe(true);

    tabAfter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(tabBefore.focus).toHaveBeenCalled();
    var before = document.getElementById('baPanelBefore');
    expect(before.classList.contains('active')).toBe(true);
  });

  test('aria-selected updates correctly', function () {
    var tabBefore = document.getElementById('baTabBefore');
    var tabAfter = document.getElementById('baTabAfter');
    tabAfter.click();
    expect(tabBefore.getAttribute('aria-selected')).toBe('false');
    expect(tabAfter.getAttribute('aria-selected')).toBe('true');
    tabBefore.click();
    expect(tabBefore.getAttribute('aria-selected')).toBe('true');
    expect(tabAfter.getAttribute('aria-selected')).toBe('false');
  });

  test('no errors when elements are missing', function () {
    document.body.innerHTML = '';
    expect(function () { BeforeAfter.init(); }).not.toThrow();
  });
});
