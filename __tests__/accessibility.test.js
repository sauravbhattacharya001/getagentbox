/**
 * @jest-environment jsdom
 */
const fs = require('fs');
const path = require('path');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function setup() {
  document.documentElement.className = '';
  document.body.innerHTML = '';
  localStorage.clear();
  document.body.innerHTML = '<button class="a11y-trigger" id="a11yTrigger" aria-label="Accessibility preferences"><span class="a11y-trigger-icon">\u267F</span></button>';
  eval(appJs);
  window.AccessibilityPanel.init();
  return window.AccessibilityPanel;
}

describe('AccessibilityPanel', () => {
  let AP;
  beforeEach(() => { AP = setup(); });
  afterEach(() => { if (AP && AP.destroy) AP.destroy(); });

  test('module is defined', () => { expect(AP).toBeDefined(); ['init','open','close','toggle','destroy','getPrefs','isOpen'].forEach(m => expect(typeof AP[m]).toBe('function')); });
  test('DEFAULTS exposed', () => { expect(AP.DEFAULTS).toEqual({ fontSize:'medium', highContrast:false, reduceMotion:false, dyslexiaFont:false, focusIndicators:false, lineSpacing:'normal' }); });
  test('STORAGE_KEY exposed', () => { expect(AP.STORAGE_KEY).toBe('agentbox-a11y-prefs'); });
  test('starts closed', () => { expect(AP.isOpen()).toBe(false); });
  test('default prefs match DEFAULTS', () => { expect(AP.getPrefs()).toEqual(AP.DEFAULTS); });
  test('trigger aria-expanded=false', () => { expect(document.getElementById('a11yTrigger').getAttribute('aria-expanded')).toBe('false'); });
  test('trigger aria-controls', () => { expect(document.getElementById('a11yTrigger').getAttribute('aria-controls')).toBe('a11yPanel'); });

  test('toggle opens panel', () => { AP.toggle(); expect(AP.isOpen()).toBe(true); const p = document.getElementById('a11yPanel'); expect(p).not.toBeNull(); expect(p.classList.contains('a11y-panel-open')).toBe(true); });
  test('toggle twice closes', () => { AP.toggle(); AP.toggle(); expect(AP.isOpen()).toBe(false); });
  test('open sets aria-expanded=true', () => { AP.open(); expect(document.getElementById('a11yTrigger').getAttribute('aria-expanded')).toBe('true'); });
  test('close sets aria-expanded=false', () => { AP.open(); AP.close(); expect(document.getElementById('a11yTrigger').getAttribute('aria-expanded')).toBe('false'); });
  test('trigger click toggles', () => { const t = document.getElementById('a11yTrigger'); t.click(); expect(AP.isOpen()).toBe(true); t.click(); expect(AP.isOpen()).toBe(false); });
  test('panel has role=dialog', () => { AP.open(); expect(document.getElementById('a11yPanel').getAttribute('role')).toBe('dialog'); });
  test('close button works', () => { AP.open(); document.getElementById('a11yClose').click(); expect(AP.isOpen()).toBe(false); });
  test('click outside closes', () => { AP.open(); document.body.dispatchEvent(new MouseEvent('click', {bubbles:true})); expect(AP.isOpen()).toBe(false); });

  test('font size large', () => { AP.open(); document.querySelectorAll('#a11yFontSize .a11y-seg-btn')[2].click(); expect(AP.getPrefs().fontSize).toBe('large'); expect(document.documentElement.classList.contains('a11y-font-large')).toBe(true); });
  test('font size xlarge', () => { AP.open(); document.querySelectorAll('#a11yFontSize .a11y-seg-btn')[3].click(); expect(AP.getPrefs().fontSize).toBe('xlarge'); expect(document.documentElement.classList.contains('a11y-font-xlarge')).toBe(true); expect(document.documentElement.classList.contains('a11y-font-large')).toBe(false); });
  test('font size medium removes classes', () => { AP.open(); const b = document.querySelectorAll('#a11yFontSize .a11y-seg-btn'); b[2].click(); b[1].click(); expect(document.documentElement.classList.contains('a11y-font-large')).toBe(false); });
  test('font size aria-checked', () => { AP.open(); const b = document.querySelectorAll('#a11yFontSize .a11y-seg-btn'); b[2].click(); expect(b[2].getAttribute('aria-checked')).toBe('true'); expect(b[1].getAttribute('aria-checked')).toBe('false'); });

  test('high contrast on', () => { AP.open(); const t = document.getElementById('a11yContrast'); t.click(); expect(AP.getPrefs().highContrast).toBe(true); expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(true); expect(t.getAttribute('aria-checked')).toBe('true'); });
  test('high contrast off', () => { AP.open(); const t = document.getElementById('a11yContrast'); t.click(); t.click(); expect(AP.getPrefs().highContrast).toBe(false); expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(false); });
  test('reduce motion', () => { AP.open(); document.getElementById('a11yMotion').click(); expect(AP.getPrefs().reduceMotion).toBe(true); expect(document.documentElement.classList.contains('a11y-reduce-motion')).toBe(true); });
  test('dyslexia font', () => { AP.open(); document.getElementById('a11yDyslexia').click(); expect(AP.getPrefs().dyslexiaFont).toBe(true); expect(document.documentElement.classList.contains('a11y-dyslexia-font')).toBe(true); });
  test('focus indicators', () => { AP.open(); document.getElementById('a11yFocus').click(); expect(AP.getPrefs().focusIndicators).toBe(true); expect(document.documentElement.classList.contains('a11y-focus-indicators')).toBe(true); });

  test('line spacing wide', () => { AP.open(); document.querySelectorAll('#a11ySpacing .a11y-seg-btn')[1].click(); expect(AP.getPrefs().lineSpacing).toBe('wide'); expect(document.documentElement.classList.contains('a11y-spacing-wide')).toBe(true); });
  test('line spacing extra', () => { AP.open(); document.querySelectorAll('#a11ySpacing .a11y-seg-btn')[2].click(); expect(AP.getPrefs().lineSpacing).toBe('extra'); expect(document.documentElement.classList.contains('a11y-spacing-extra')).toBe(true); expect(document.documentElement.classList.contains('a11y-spacing-wide')).toBe(false); });
  test('line spacing normal removes', () => { AP.open(); const b = document.querySelectorAll('#a11ySpacing .a11y-seg-btn'); b[2].click(); b[0].click(); expect(document.documentElement.classList.contains('a11y-spacing-extra')).toBe(false); });

  test('saved to localStorage', () => { AP.open(); document.getElementById('a11yContrast').click(); expect(JSON.parse(localStorage.getItem('agentbox-a11y-prefs')).highContrast).toBe(true); });

  test('loaded from localStorage', () => {
    AP.destroy();
    document.documentElement.className = '';
    document.body.innerHTML = '<button class="a11y-trigger" id="a11yTrigger"><span>\u267F</span></button>';
    localStorage.setItem('agentbox-a11y-prefs', JSON.stringify({ fontSize:'large', highContrast:true, reduceMotion:false, dyslexiaFont:false, focusIndicators:false, lineSpacing:'wide' }));
    eval(appJs); window.AccessibilityPanel.init(); AP = window.AccessibilityPanel;
    expect(AP.getPrefs().fontSize).toBe('large');
    expect(AP.getPrefs().highContrast).toBe(true);
    expect(document.documentElement.classList.contains('a11y-font-large')).toBe(true);
  });

  test('reset restores defaults', () => {
    AP.open(); document.getElementById('a11yContrast').click(); document.getElementById('a11yDyslexia').click(); document.querySelectorAll('#a11yFontSize .a11y-seg-btn')[3].click();
    document.getElementById('a11yReset').click();
    expect(AP.getPrefs()).toEqual(AP.DEFAULTS);
    expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(false);
  });

  test('reset saves to localStorage', () => { AP.open(); document.getElementById('a11yContrast').click(); document.getElementById('a11yReset').click(); expect(JSON.parse(localStorage.getItem('agentbox-a11y-prefs')).highContrast).toBe(false); });

  test('trigger active class', () => { AP.open(); const t = document.getElementById('a11yTrigger'); expect(t.classList.contains('a11y-active')).toBe(false); document.getElementById('a11yContrast').click(); expect(t.classList.contains('a11y-active')).toBe(true); });
  test('trigger loses active after reset', () => { AP.open(); document.getElementById('a11yContrast').click(); document.getElementById('a11yReset').click(); expect(document.getElementById('a11yTrigger').classList.contains('a11y-active')).toBe(false); });

  test('destroy cleans up', () => { AP.open(); document.getElementById('a11yContrast').click(); AP.destroy(); expect(document.getElementById('a11yPanel')).toBeNull(); expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(false); expect(AP.isOpen()).toBe(false); });

  test('Escape closes', () => { AP.open(); document.getElementById('a11yPanel').dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})); expect(AP.isOpen()).toBe(false); });

  test('corrupted localStorage', () => { AP.destroy(); localStorage.setItem('agentbox-a11y-prefs', 'bad'); AP = setup(); expect(AP.getPrefs()).toEqual(AP.DEFAULTS); });

  test('partial localStorage', () => {
    AP.destroy();
    document.documentElement.className = '';
    document.body.innerHTML = '<button class="a11y-trigger" id="a11yTrigger"><span>\u267F</span></button>';
    localStorage.setItem('agentbox-a11y-prefs', JSON.stringify({ fontSize:'xlarge' }));
    eval(appJs); window.AccessibilityPanel.init(); AP = window.AccessibilityPanel;
    expect(AP.getPrefs().fontSize).toBe('xlarge');
    expect(AP.getPrefs().highContrast).toBe(false);
  });

  test('rapid toggles', () => { AP.open(); const t = document.getElementById('a11yContrast'); t.click();t.click();t.click();t.click();t.click(); expect(AP.getPrefs().highContrast).toBe(true); });
  test('panel created once', () => { AP.open(); AP.close(); AP.open(); expect(document.querySelectorAll('#a11yPanel').length).toBe(1); });

  test('HTML has trigger', () => { expect(indexHtml).toContain('id="a11yTrigger"'); });
  test('HTML has ARIA', () => { expect(indexHtml).toContain('aria-label="Accessibility preferences"'); });
});
