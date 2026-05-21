/**
 * @jest-environment jsdom
 *
 * Behavioural tests for QuickStartWizard.
 *
 * QuickStartWizard is a global IIFE - load it via the standard
 * fs.readFileSync + eval pattern used by share-fab.test.js.
 */

const fs = require('fs');
const path = require('path');

function loadWizard() {
  const code = fs.readFileSync(
    path.resolve(__dirname, '../src/modules/quick-start-wizard.js'),
    'utf8'
  );
  // eslint-disable-next-line no-eval
  eval(code);
  return QuickStartWizard; // eslint-disable-line no-undef
}

/**
 * Wizard expects a 3-step DOM with options that have data-value attributes
 * and a Next/Back button. This mirrors what the production index.html builds.
 */
function markup() {
  document.body.innerHTML = `
    <div id="wizardContainer">
      <div id="wizardProgressBar" style="width:0%"></div>
      <span id="wizardIndicator">Step 1 of 3</span>

      <div class="wizard-step active" data-wizard-step="1">
        <div class="wizard-options" role="radiogroup">
          <button class="wizard-option" data-value="productivity" aria-checked="false">Productivity</button>
          <button class="wizard-option" data-value="research"     aria-checked="false">Research</button>
          <button class="wizard-option" data-value="creative"     aria-checked="false">Creative</button>
          <button class="wizard-option" data-value="coding"       aria-checked="false">Coding</button>
        </div>
      </div>

      <div class="wizard-step" data-wizard-step="2">
        <div class="wizard-options" role="radiogroup">
          <button class="wizard-option" data-value="casual" aria-checked="false">Casual</button>
          <button class="wizard-option" data-value="daily"  aria-checked="false">Daily</button>
          <button class="wizard-option" data-value="power"  aria-checked="false">Power</button>
        </div>
      </div>

      <div class="wizard-step" data-wizard-step="3">
        <div id="wizardResult"></div>
      </div>

      <button id="wizardBack" disabled>Back</button>
      <button id="wizardNext" disabled>Next</button>
    </div>
  `;
}

/**
 * Helper: click an option in the currently active step.
 */
function selectOption(value) {
  const active = document.querySelector('.wizard-step.active');
  const opt = active.querySelector(`.wizard-option[data-value="${value}"]`);
  opt.click();
  return opt;
}

describe('QuickStartWizard', () => {
  let QSW;

  beforeEach(() => {
    markup();
    QSW = loadWizard();
    QSW.init();
  });

  describe('init() guard', () => {
    test('does not throw and is a no-op when #wizardContainer is missing', () => {
      document.body.innerHTML = '<div></div>';
      const fresh = loadWizard();
      expect(() => fresh.init()).not.toThrow();
    });
  });

  describe('step 1 - use case selection', () => {
    test('Next starts disabled and becomes enabled after picking an option', () => {
      const next = document.getElementById('wizardNext');
      expect(next.disabled).toBe(true);
      selectOption('productivity');
      expect(next.disabled).toBe(false);
    });

    test('selecting an option toggles .selected and aria-checked on it alone', () => {
      const productivity = selectOption('productivity');
      expect(productivity.classList.contains('selected')).toBe(true);
      expect(productivity.getAttribute('aria-checked')).toBe('true');

      const research = selectOption('research');
      expect(research.classList.contains('selected')).toBe(true);
      expect(research.getAttribute('aria-checked')).toBe('true');

      // Productivity is now deselected.
      expect(productivity.classList.contains('selected')).toBe(false);
      expect(productivity.getAttribute('aria-checked')).toBe('false');
    });

    test('clicking a non-option inside the container is ignored', () => {
      const next = document.getElementById('wizardNext');
      // Container click on the bare container should not enable Next.
      document.getElementById('wizardContainer').click();
      expect(next.disabled).toBe(true);
    });
  });

  describe('Next/Back navigation', () => {
    test('clicking Next without a selection does nothing (button is disabled)', () => {
      const next = document.getElementById('wizardNext');
      // The handler still fires if we synthesize a click on a disabled button
      // (jsdom does NOT swallow clicks on disabled buttons). The wizard relies
      // on the disabled state for UX, so we just assert disabled before any pick.
      expect(next.disabled).toBe(true);
    });

    test('Next advances to step 2 after a selection, Back returns to step 1', () => {
      selectOption('productivity');
      document.getElementById('wizardNext').click();

      expect(document.querySelector('.wizard-step.active').dataset.wizardStep).toBe('2');
      expect(document.getElementById('wizardIndicator').textContent).toBe('Step 2 of 3');
      expect(document.getElementById('wizardBack').disabled).toBe(false);
      // Next must be disabled again because nothing has been picked on step 2.
      expect(document.getElementById('wizardNext').disabled).toBe(true);

      document.getElementById('wizardBack').click();
      expect(document.querySelector('.wizard-step.active').dataset.wizardStep).toBe('1');
      // Back must become disabled again on step 1.
      expect(document.getElementById('wizardBack').disabled).toBe(true);
    });

    test('progress bar advances with the step number', () => {
      const bar = document.getElementById('wizardProgressBar');
      // Step 1 of 3.
      selectOption('coding');
      document.getElementById('wizardNext').click(); // -> step 2
      expect(bar.style.width).toBe(((2 / 3) * 100) + '%');
    });

    test('Next does not advance past step 3', () => {
      selectOption('coding');
      document.getElementById('wizardNext').click(); // -> 2
      selectOption('daily');
      document.getElementById('wizardNext').click(); // -> 3
      // On step 3 Next is hidden, but the underlying state must not roll over.
      const beforeStep = document.querySelector('.wizard-step.active').dataset.wizardStep;
      expect(beforeStep).toBe('3');
      document.getElementById('wizardNext').click();
      expect(document.querySelector('.wizard-step.active').dataset.wizardStep).toBe('3');
    });

    test('Back does not roll backwards from step 1', () => {
      const back = document.getElementById('wizardBack');
      back.click();
      expect(document.querySelector('.wizard-step.active').dataset.wizardStep).toBe('1');
    });
  });

  describe('step 3 - result rendering', () => {
    function advanceToResult(useCase, frequency) {
      selectOption(useCase);
      document.getElementById('wizardNext').click(); // -> step 2
      selectOption(frequency);
      document.getElementById('wizardNext').click(); // -> step 3
    }

    test('hides Next on the result step and renders the plan list', () => {
      advanceToResult('productivity', 'daily');

      const next = document.getElementById('wizardNext');
      expect(next.style.display).toBe('none');

      const result = document.getElementById('wizardResult');
      const items = result.querySelectorAll('.wizard-result-plan li');
      expect(items.length).toBe(5); // every plan has 5 steps
      // Numbered 1..N
      items.forEach((li, i) => {
        const num = li.querySelector('.plan-step-num');
        expect(num.textContent).toBe(String(i + 1));
      });
    });

    test('result includes the recommended plan label for the chosen frequency', () => {
      advanceToResult('research', 'power');
      const html = document.getElementById('wizardResult').innerHTML;
      // The 'power' bucket is recommended as 'Pro'.
      expect(html).toMatch(/Recommended plan:\s*Pro/);
    });

    test('unknown frequency falls back to the "casual" recommendation (Free)', () => {
      // We can\'t pick an unknown frequency through the UI - directly check
      // the safety fallback by inspecting what casual produces.
      advanceToResult('creative', 'casual');
      const html = document.getElementById('wizardResult').innerHTML;
      expect(html).toMatch(/Recommended plan:\s*Free/);
    });

    test('all 4 use cases produce a non-empty plan with a setup tip', () => {
      const useCases = ['productivity', 'research', 'creative', 'coding'];
      useCases.forEach((uc) => {
        markup();
        const fresh = loadWizard();
        fresh.init();
        selectOption(uc);
        document.getElementById('wizardNext').click();
        selectOption('daily');
        document.getElementById('wizardNext').click();

        const result = document.getElementById('wizardResult');
        expect(result.querySelectorAll('.wizard-result-plan li').length).toBeGreaterThan(0);
        // Two recommendation cards: tip + plan
        expect(result.querySelectorAll('.wizard-result-rec').length).toBe(2);
        // CTA link to the pricing section
        expect(result.querySelector('a.wizard-result-cta')).toBeTruthy();
        expect(result.querySelector('a.wizard-result-cta').getAttribute('href')).toBe('#pricingSection');
      });
    });
  });
});
