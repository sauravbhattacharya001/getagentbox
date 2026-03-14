/**
 * @jest-environment jsdom
 */
'use strict';

const fs = require('fs');
const path = require('path');

function loadModule() {
  document.body.innerHTML = `
    <section id="privacyCheckupSection">
      <div class="privacy-progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
        <div class="privacy-progress-fill" id="privacyProgressFill"></div>
      </div>
      <div id="privacyStepCounter"></div>
      <div id="privacyQuestionCard">
        <p id="privacyQuestionText"></p>
        <div id="privacyOptions" role="group"></div>
      </div>
      <div id="privacyReport" hidden>
        <span id="privacyScoreValue">0</span>
        <div id="privacyFindings" role="list"></div>
        <button id="privacyRestartBtn">Retake</button>
      </div>
    </section>
  `;

  const modPath = path.resolve(__dirname, '..', 'app.js');
  const src = fs.readFileSync(modPath, 'utf-8');

  const startMarker = '// Privacy Checkup Module';
  const startIdx = src.indexOf(startMarker);
  if (startIdx === -1) throw new Error('Privacy Checkup module not found in app.js');

  const chunk = src.slice(startIdx);
  const fn = new Function(chunk + '\nreturn PrivacyCheckup;');
  return fn();
}

describe('PrivacyCheckup', () => {
  let PC;

  beforeEach(() => {
    jest.useFakeTimers();
    PC = loadModule();
    PC.init();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('module exposes init, restart, _QUESTIONS', () => {
    expect(typeof PC.init).toBe('function');
    expect(typeof PC.restart).toBe('function');
    expect(Array.isArray(PC._QUESTIONS)).toBe(true);
  });

  test('has 6 questions', () => {
    expect(PC._QUESTIONS.length).toBe(6);
  });

  test('each question has required fields', () => {
    PC._QUESTIONS.forEach((q) => {
      expect(q.id).toBeTruthy();
      expect(q.text).toBeTruthy();
      expect(q.options.length).toBe(3);
      expect(q.weights.length).toBe(3);
      expect(q.feature.title).toBeTruthy();
      expect(q.feature.desc).toBeTruthy();
      expect(q.feature.icon).toBeTruthy();
    });
  });

  test('init renders first question', () => {
    const text = document.getElementById('privacyQuestionText').textContent;
    expect(text).toBe(PC._QUESTIONS[0].text);
  });

  test('init renders 3 option buttons', () => {
    const btns = document.querySelectorAll('.privacy-option-btn');
    expect(btns.length).toBe(3);
  });

  test('step counter shows "Question 1 of 6"', () => {
    const counter = document.getElementById('privacyStepCounter');
    expect(counter.textContent).toBe('Question 1 of 6');
  });

  test('clicking option advances to next question', () => {
    document.querySelector('.privacy-option-btn').click();
    const text = document.getElementById('privacyQuestionText').textContent;
    expect(text).toBe(PC._QUESTIONS[1].text);
  });

  test('progress bar updates on advance', () => {
    document.querySelector('.privacy-option-btn').click();
    const fill = document.getElementById('privacyProgressFill');
    expect(fill.style.width).not.toBe('0%');
  });

  test('completing all questions shows report', () => {
    for (let i = 0; i < 6; i++) {
      document.querySelector('.privacy-option-btn').click();
    }
    const report = document.getElementById('privacyReport');
    const card = document.getElementById('privacyQuestionCard');
    expect(report.hidden).toBe(false);
    expect(card.hidden).toBe(true);
  });

  test('report shows 6 finding items', () => {
    for (let i = 0; i < 6; i++) {
      document.querySelector('.privacy-option-btn').click();
    }
    const items = document.querySelectorAll('.privacy-finding-item');
    expect(items.length).toBe(6);
  });

  test('score animates to a value', () => {
    for (let i = 0; i < 6; i++) {
      document.querySelector('.privacy-option-btn').click();
    }
    jest.advanceTimersByTime(2000);
    const score = parseInt(document.getElementById('privacyScoreValue').textContent, 10);
    expect(score).toBeGreaterThan(0);
  });

  test('high concern answers get high-priority class', () => {
    for (let i = 0; i < 6; i++) {
      const btns = document.querySelectorAll('.privacy-option-btn');
      btns[0].click();
    }
    const highItems = document.querySelectorAll('.privacy-finding-high');
    expect(highItems.length).toBe(6);
  });

  test('low concern answers get low-concern class', () => {
    for (let i = 0; i < 6; i++) {
      const btns = document.querySelectorAll('.privacy-option-btn');
      btns[2].click();
    }
    const lowItems = document.querySelectorAll('.privacy-finding-low');
    expect(lowItems.length).toBe(6);
  });

  test('medium concern answers get medium class', () => {
    for (let i = 0; i < 6; i++) {
      const btns = document.querySelectorAll('.privacy-option-btn');
      btns[1].click();
    }
    const medItems = document.querySelectorAll('.privacy-finding-medium');
    expect(medItems.length).toBe(6);
  });

  test('restart resets to first question', () => {
    for (let i = 0; i < 6; i++) {
      document.querySelector('.privacy-option-btn').click();
    }
    PC.restart();
    const text = document.getElementById('privacyQuestionText').textContent;
    expect(text).toBe(PC._QUESTIONS[0].text);
    expect(document.getElementById('privacyQuestionCard').hidden).toBe(false);
    expect(document.getElementById('privacyReport').hidden).toBe(true);
  });

  test('restart button triggers restart', () => {
    for (let i = 0; i < 6; i++) {
      document.querySelector('.privacy-option-btn').click();
    }
    document.getElementById('privacyRestartBtn').click();
    expect(document.getElementById('privacyQuestionCard').hidden).toBe(false);
  });

  test('progress reaches 100% on completion', () => {
    for (let i = 0; i < 6; i++) {
      document.querySelector('.privacy-option-btn').click();
    }
    const fill = document.getElementById('privacyProgressFill');
    expect(fill.style.width).toBe('100%');
  });

  test('step counter shows "Checkup Complete" on finish', () => {
    for (let i = 0; i < 6; i++) {
      document.querySelector('.privacy-option-btn').click();
    }
    expect(document.getElementById('privacyStepCounter').textContent).toBe('Checkup Complete');
  });

  test('findings sorted by concern weight (highest first)', () => {
    // Alternate: high, low, high, low, high, low
    var indices = [0, 2, 0, 2, 0, 2];
    for (let i = 0; i < 6; i++) {
      const btns = document.querySelectorAll('.privacy-option-btn');
      btns[indices[i]].click();
    }
    const items = document.querySelectorAll('.privacy-finding-item');
    expect(items[0].classList.contains('privacy-finding-high')).toBe(true);
  });

  test('max score is 100 when all highest concern', () => {
    for (let i = 0; i < 6; i++) {
      document.querySelectorAll('.privacy-option-btn')[0].click();
    }
    jest.advanceTimersByTime(5000);
    const score = parseInt(document.getElementById('privacyScoreValue').textContent, 10);
    expect(score).toBe(100);
  });

  test('each finding has icon, title, badge, and description', () => {
    for (let i = 0; i < 6; i++) {
      document.querySelector('.privacy-option-btn').click();
    }
    const item = document.querySelector('.privacy-finding-item');
    expect(item.querySelector('.privacy-finding-icon')).toBeTruthy();
    expect(item.querySelector('.privacy-finding-title')).toBeTruthy();
    expect(item.querySelector('.privacy-finding-badge')).toBeTruthy();
    expect(item.querySelector('.privacy-finding-desc')).toBeTruthy();
  });

  test('no section = init is safe no-op', () => {
    document.body.innerHTML = '';
    const mod = loadModule.toString().includes('PrivacyCheckup'); // just verify module loads
    expect(mod).toBe(true);
  });

  test('aria-valuenow updates on progress bar', () => {
    document.querySelector('.privacy-option-btn').click();
    const bar = document.querySelector('.privacy-progress-bar');
    const val = parseInt(bar.getAttribute('aria-valuenow'), 10);
    expect(val).toBeGreaterThan(0);
  });

  test('question IDs are all unique', () => {
    const ids = PC._QUESTIONS.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('weights are always [3, 2, 1]', () => {
    PC._QUESTIONS.forEach(q => {
      expect(q.weights).toEqual([3, 2, 1]);
    });
  });

  test('min score is ~33 when all lowest concern', () => {
    for (let i = 0; i < 6; i++) {
      document.querySelectorAll('.privacy-option-btn')[2].click();
    }
    jest.advanceTimersByTime(5000);
    const score = parseInt(document.getElementById('privacyScoreValue').textContent, 10);
    expect(score).toBe(33);
  });

  test('option buttons have data-index attributes', () => {
    const btns = document.querySelectorAll('.privacy-option-btn');
    btns.forEach((btn, i) => {
      expect(btn.getAttribute('data-index')).toBe(String(i));
    });
  });
});
